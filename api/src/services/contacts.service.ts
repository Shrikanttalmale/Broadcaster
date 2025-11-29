import { v4 as uuidv4 } from 'uuid';
import { parsePhoneNumberFromString, isValidPhoneNumber } from 'libphonenumber-js';
import { getDatabase } from './database.service';
import { logger } from '../utils/logger';

interface Contact {
  id: string;
  userId: string;
  name: string;
  phoneNumber: string;
  email?: string;
  category?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

interface ContactInput {
  name: string;
  phoneNumber: string;
  email?: string;
  category?: string;
  tags?: string[];
}

interface ImportOptions {
  skipDuplicates?: boolean;
  updateIfExists?: boolean;
  defaultCountry?: string;
}

interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
  errors: Array<{ row: number; error: string; data?: any }>;
  duplicates: number;
}

interface SearchQuery {
  search?: string;
  category?: string;
  tags?: string[];
  page?: number;
  limit?: number;
}

class ContactsService {
  /**
   * Validate and normalize phone number
   */
  validatePhoneNumber(phoneNumber: string, defaultCountry: string = 'IN'): {
    valid: boolean;
    normalized?: string;
    error?: string;
  } {
    try {
      // Basic validation - phone number should have at least 5 digits
      const digitsOnly = phoneNumber.replace(/\D/g, '');

      if (digitsOnly.length < 5) {
        return {
          valid: false,
          error: 'Phone number too short',
        };
      }

      // Try to parse international format
      if (phoneNumber.startsWith('+')) {
        if (!isValidPhoneNumber(phoneNumber)) {
          return {
            valid: false,
            error: 'Invalid international phone number format',
          };
        }
        const parsed = parsePhoneNumberFromString(phoneNumber);
        return {
          valid: true,
          normalized: parsed?.format('E.164') || phoneNumber,
        };
      }

      // Try with default country code
      if (!phoneNumber.startsWith('+')) {
        const withCountryCode = `+${phoneNumber}`;
        const parsed = parsePhoneNumberFromString(withCountryCode, defaultCountry as any);

        if (parsed && isValidPhoneNumber(parsed.number as any, parsed.country as any)) {
          return {
            valid: true,
            normalized: parsed.format('E.164'),
          };
        }

        // Try standard Indian format
        if (/^\d{10}$/.test(digitsOnly)) {
          return {
            valid: true,
            normalized: `+91${digitsOnly}`,
          };
        }
      }

      return {
        valid: false,
        error: 'Could not parse phone number',
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  /**
   * Validate email address
   */
  validateEmail(email: string): boolean {
    if (!email) return true; // Email is optional
    // Basic email validation - just check for @ and a dot
    const emailRegex = /^[^\s@]+@[^\s@.]+\.[^\s@]+$|^[^\s@]+@[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate name
   */
  validateName(name: string): { valid: boolean; error?: string } {
    if (!name || name.trim().length < 2) {
      return {
        valid: false,
        error: 'Name must be at least 2 characters',
      };
    }

    // Allow letters, numbers, spaces, hyphens, and apostrophes
    if (!/^[a-zA-Z0-9\s'-]+$/.test(name)) {
      return {
        valid: false,
        error: 'Name contains invalid characters',
      };
    }

    return { valid: true };
  }

  /**
   * Create a new contact
   */
  async createContact(userId: string, data: ContactInput): Promise<Contact> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    // Validate input
    const nameValidation = this.validateName(data.name);
    if (!nameValidation.valid) {
      throw new Error(nameValidation.error);
    }

    const phoneValidation = this.validatePhoneNumber(data.phoneNumber);
    if (!phoneValidation.valid) {
      throw new Error(`Phone: ${phoneValidation.error}`);
    }

    if (data.email && !this.validateEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    // Check for duplicate phone number
    const existing = await db.get(
      `SELECT id FROM contacts WHERE phoneNumber = ? AND userId = ?`,
      [phoneValidation.normalized, userId]
    );

    if (existing) {
      throw new Error('Contact with this phone number already exists');
    }

    const contactId = uuidv4();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO contacts (id, userId, name, phoneNumber, email, tags, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        contactId,
        userId,
        data.name.trim(),
        phoneValidation.normalized,
        data.email?.trim() || null,
        data.tags ? JSON.stringify(data.tags) : null,
        now,
        now,
      ]
    );

    logger.info(`Contact created: ${contactId} for user ${userId}`);

    return {
      id: contactId,
      userId,
      name: data.name.trim(),
      phoneNumber: phoneValidation.normalized!,
      email: data.email?.trim(),
      tags: data.tags || [],
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Update a contact
   */
  async updateContact(
    contactId: string,
    userId: string,
    data: Partial<ContactInput>
  ): Promise<Contact> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    // Get existing contact
    const existing = await db.get(
      `SELECT * FROM contacts WHERE id = ? AND userId = ?`,
      [contactId, userId]
    );

    if (!existing) {
      throw new Error('Contact not found');
    }

    // Validate updates if provided
    if (data.name) {
      const nameValidation = this.validateName(data.name);
      if (!nameValidation.valid) {
        throw new Error(nameValidation.error);
      }
    }

    if (data.phoneNumber) {
      const phoneValidation = this.validatePhoneNumber(data.phoneNumber);
      if (!phoneValidation.valid) {
        throw new Error(`Phone: ${phoneValidation.error}`);
      }

      // Check for duplicate if phone is being changed
      if (phoneValidation.normalized !== existing.phoneNumber) {
        const duplicate = await db.get(
          `SELECT id FROM contacts WHERE phoneNumber = ? AND userId = ? AND id != ?`,
          [phoneValidation.normalized, userId, contactId]
        );
        if (duplicate) {
          throw new Error('Another contact with this phone number exists');
        }
      }
    }

    if (data.email && !this.validateEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    const now = new Date().toISOString();
    const updates = {
      name: data.name?.trim() || existing.name,
      phoneNumber: data.phoneNumber
        ? this.validatePhoneNumber(data.phoneNumber).normalized
        : existing.phoneNumber,
      email: data.email !== undefined ? data.email?.trim() || null : existing.email,
      tags: data.tags !== undefined ? JSON.stringify(data.tags) : existing.tags,
      updatedAt: now,
    };

    await db.run(
      `UPDATE contacts SET name = ?, phoneNumber = ?, email = ?, tags = ?, updatedAt = ?
       WHERE id = ? AND userId = ?`,
      [
        updates.name,
        updates.phoneNumber,
        updates.email,
        updates.tags,
        updates.updatedAt,
        contactId,
        userId,
      ]
    );

    logger.info(`Contact updated: ${contactId}`);

    return {
      id: contactId,
      userId,
      name: updates.name,
      phoneNumber: updates.phoneNumber,
      email: updates.email || undefined,
      tags: updates.tags ? JSON.parse(updates.tags) : [],
      createdAt: existing.createdAt,
      updatedAt: updates.updatedAt,
    };
  }

  /**
   * Delete a contact
   */
  async deleteContact(contactId: string, userId: string): Promise<boolean> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    const result = await db.run(
      `DELETE FROM contacts WHERE id = ? AND userId = ?`,
      [contactId, userId]
    );

    if (result.changes === 0) {
      throw new Error('Contact not found');
    }

    logger.info(`Contact deleted: ${contactId}`);
    return true;
  }

  /**
   * Get single contact
   */
  async getContact(contactId: string, userId: string): Promise<Contact | null> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    const contact = await db.get(
      `SELECT * FROM contacts WHERE id = ? AND userId = ?`,
      [contactId, userId]
    );

    if (!contact) {
      return null;
    }

    return this.formatContact(contact);
  }

  /**
   * Search and filter contacts
   */
  async searchContacts(userId: string, query: SearchQuery): Promise<{
    contacts: Contact[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    let sql = `SELECT * FROM contacts WHERE userId = ?`;
    const params: any[] = [userId];

    // Search across name, phone, email
    if (query.search) {
      sql += ` AND (name LIKE ? OR phoneNumber LIKE ? OR email LIKE ?)`;
      const searchTerm = `%${query.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Filter by tags - if any tag matches
    if (query.tags && query.tags.length > 0) {
      const tagConditions = query.tags.map(() => `tags LIKE ?`).join(' OR ');
      sql += ` AND (${tagConditions})`;
      query.tags.forEach((tag) => {
        params.push(`%"${tag}"%`);
      });
    }

    // Get total count
    const countResult = await db.get(
      sql.replace('SELECT *', 'SELECT COUNT(*) as count'),
      params
    );
    const total = countResult?.count || 0;

    // Get paginated results
    const contacts = await db.all(sql + ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`, [
      ...params,
      limit,
      offset,
    ]);

    return {
      contacts: contacts.map((c: any) => this.formatContact(c)),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Bulk import contacts from array
   */
  async bulkImportContacts(
    userId: string,
    contacts: any[],
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    const result: ImportResult = {
      imported: 0,
      skipped: 0,
      failed: 0,
      errors: [],
      duplicates: 0,
    };

    const now = new Date().toISOString();
    const defaultCountry = options.defaultCountry || 'IN';
    const existingPhones = new Set<string>();

    // Get all existing phone numbers for this user
    const existing = await db.all(
      `SELECT phoneNumber FROM contacts WHERE userId = ?`,
      [userId]
    );
    existing.forEach((e: any) => {
      existingPhones.add(e.phoneNumber);
    });

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      const row = i + 2; // Account for header row

      try {
        // Validate required fields
        if (!contact.name || !contact.phoneNumber) {
          result.errors.push({
            row,
            error: 'Missing name or phone number',
            data: contact,
          });
          result.failed++;
          continue;
        }

        // Validate name
        const nameValidation = this.validateName(contact.name);
        if (!nameValidation.valid) {
          result.errors.push({
            row,
            error: `Name: ${nameValidation.error}`,
            data: contact,
          });
          result.failed++;
          continue;
        }

        // Validate and normalize phone number
        const phoneValidation = this.validatePhoneNumber(contact.phoneNumber, defaultCountry);
        if (!phoneValidation.valid) {
          result.errors.push({
            row,
            error: `Phone: ${phoneValidation.error}`,
            data: contact,
          });
          result.failed++;
          continue;
        }

        const normalizedPhone = phoneValidation.normalized!;

        // Check for duplicates
        if (existingPhones.has(normalizedPhone)) {
          if (options.skipDuplicates) {
            result.duplicates++;
            result.skipped++;
            continue;
          }

          if (options.updateIfExists) {
            // Update existing contact
            const existing = await db.get(
              `SELECT id FROM contacts WHERE phoneNumber = ? AND userId = ?`,
              [normalizedPhone, userId]
            );

            if (existing) {
              await db.run(
                `UPDATE contacts SET name = ?, email = ?, tags = ?, updatedAt = ?
                 WHERE id = ?`,
                [
                  contact.name.trim(),
                  contact.email?.trim() || null,
                  contact.tags ? JSON.stringify(contact.tags) : null,
                  now,
                  existing.id,
                ]
              );
              result.imported++;
              continue;
            }
          }

          result.duplicates++;
          result.skipped++;
          continue;
        }

        // Validate email if provided
        if (contact.email && !this.validateEmail(contact.email)) {
          result.errors.push({
            row,
            error: 'Invalid email format',
            data: contact,
          });
          result.failed++;
          continue;
        }

        // Insert new contact
        const contactId = uuidv4();
        await db.run(
          `INSERT INTO contacts (id, userId, name, phoneNumber, email, tags, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            contactId,
            userId,
            contact.name.trim(),
            normalizedPhone,
            contact.email?.trim() || null,
            contact.tags ? JSON.stringify(contact.tags) : null,
            now,
            now,
          ]
        );

        existingPhones.add(normalizedPhone);
        result.imported++;
      } catch (error: any) {
        result.errors.push({
          row,
          error: error.message,
          data: contact,
        });
        result.failed++;
      }
    }

    logger.info(
      `Bulk import completed for user ${userId}: ${result.imported} imported, ${result.skipped} skipped, ${result.failed} failed`
    );

    return result;
  }

  /**
   * Export contacts
   */
  async exportContacts(
    userId: string,
    filters?: { category?: string; search?: string }
  ): Promise<Contact[]> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    let sql = `SELECT * FROM contacts WHERE userId = ?`;
    const params: any[] = [userId];

    if (filters?.search) {
      sql += ` AND (name LIKE ? OR phoneNumber LIKE ? OR email LIKE ?)`;
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    const contacts = await db.all(sql + ` ORDER BY createdAt DESC`, params);

    return contacts.map((c: any) => this.formatContact(c));
  }

  /**
   * Get statistics
   */
  async getStatistics(userId: string): Promise<{
    totalContacts: number;
    byCategory: Record<string, number>;
    created: {
      today: number;
      thisWeek: number;
      thisMonth: number;
    };
  }> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    const total = await db.get(`SELECT COUNT(*) as count FROM contacts WHERE userId = ?`, [
      userId,
    ]);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const today = await db.get(
      `SELECT COUNT(*) as count FROM contacts WHERE userId = ? AND createdAt >= ?`,
      [userId, todayStart.toISOString()]
    );

    const thisWeek = await db.get(
      `SELECT COUNT(*) as count FROM contacts WHERE userId = ? AND createdAt >= ?`,
      [userId, weekStart.toISOString()]
    );

    const thisMonth = await db.get(
      `SELECT COUNT(*) as count FROM contacts WHERE userId = ? AND createdAt >= ?`,
      [userId, monthStart.toISOString()]
    );

    return {
      totalContacts: total?.count || 0,
      byCategory: {},
      created: {
        today: today?.count || 0,
        thisWeek: thisWeek?.count || 0,
        thisMonth: thisMonth?.count || 0,
      },
    };
  }

  /**
   * Helper: Format contact object
   */
  private formatContact(contact: any): Contact {
    return {
      id: contact.id,
      userId: contact.userId,
      name: contact.name,
      phoneNumber: contact.phoneNumber,
      email: contact.email || undefined,
      category: contact.category || undefined,
      tags: contact.tags ? JSON.parse(contact.tags) : [],
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    };
  }

  /**
   * Bulk delete contacts
   */
  async bulkDeleteContacts(contactIds: string[], userId: string): Promise<number> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    if (contactIds.length === 0) {
      throw new Error('No contact IDs provided');
    }

    const placeholders = contactIds.map(() => '?').join(',');
    const result = await db.run(
      `DELETE FROM contacts WHERE id IN (${placeholders}) AND userId = ?`,
      [...contactIds, userId]
    );

    logger.info(`Bulk deleted ${result.changes} contacts for user ${userId}`);
    return result.changes;
  }
}

export const contactsService = new ContactsService();

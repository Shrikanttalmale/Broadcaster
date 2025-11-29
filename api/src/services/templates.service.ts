import { getDatabase } from './database.service';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface Template {
  id: string;
  userId: string;
  name: string;
  subject?: string;
  body: string;
  variables: string[];
  category?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

class TemplatesService {
  /**
   * Validate template name
   */
  private validateName(name: string): { valid: boolean; error?: string } {
    if (!name || name.trim().length < 2) {
      return { valid: false, error: 'Template name must be at least 2 characters' };
    }
    if (name.length > 100) {
      return { valid: false, error: 'Template name must not exceed 100 characters' };
    }
    return { valid: true };
  }

  /**
   * Validate template body
   */
  private validateBody(body: string): { valid: boolean; error?: string } {
    if (!body || body.trim().length < 1) {
      return { valid: false, error: 'Template body is required' };
    }
    if (body.length > 5000) {
      return { valid: false, error: 'Template body must not exceed 5000 characters' };
    }
    return { valid: true };
  }

  /**
   * Extract variables from template body
   * Looks for {{variableName}} patterns
   */
  extractVariables(body: string): string[] {
    const variableRegex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = variableRegex.exec(body)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    return variables;
  }

  /**
   * Create a new template
   */
  async createTemplate(
    userId: string,
    name: string,
    body: string,
    subject?: string,
    category?: string
  ): Promise<Template> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    // Validate inputs
    const nameValidation = this.validateName(name);
    if (!nameValidation.valid) {
      throw new Error(nameValidation.error);
    }

    const bodyValidation = this.validateBody(body);
    if (!bodyValidation.valid) {
      throw new Error(bodyValidation.error);
    }

    try {
      const templateId = uuidv4();
      const now = new Date();
      const variables = this.extractVariables(body);

      await db.run(
        `INSERT INTO templates (id, userId, name, subject, body, variables, category, isActive, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          templateId,
          userId,
          name.trim(),
          subject || null,
          body,
          variables.length > 0 ? JSON.stringify(variables) : null,
          category || null,
          1,
          now.toISOString(),
          now.toISOString(),
        ]
      );

      logger.info(`Template created: ${templateId} for user ${userId}`);

      return {
        id: templateId,
        userId,
        name,
        subject,
        body,
        variables,
        category,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };
    } catch (error: any) {
      logger.error('Error creating template:', error);
      throw error;
    }
  }

  /**
   * Get template by ID
   */
  async getTemplate(userId: string, templateId: string): Promise<Template | null> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    try {
      const template = await db.get(
        `SELECT * FROM templates WHERE id = ? AND userId = ?`,
        [templateId, userId]
      );

      if (!template) {
        return null;
      }

      return {
        ...template,
        variables: template.variables ? JSON.parse(template.variables) : [],
        isActive: Boolean(template.isActive),
        createdAt: new Date(template.createdAt),
        updatedAt: new Date(template.updatedAt),
      };
    } catch (error: any) {
      logger.error('Error getting template:', error);
      throw error;
    }
  }

  /**
   * Get all templates for a user
   */
  async getTemplates(
    userId: string,
    search?: string,
    category?: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ templates: Template[]; total: number; pages: number }> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    try {
      const offset = (page - 1) * limit;
      let query = `SELECT * FROM templates WHERE userId = ? AND isActive = 1`;
      const params: any[] = [userId];

      if (search) {
        query += ` AND (name LIKE ? OR body LIKE ?)`;
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm);
      }

      if (category) {
        query += ` AND category = ?`;
        params.push(category);
      }

      // Get total count
      const countResult = await db.get(
        query.replace('SELECT *', 'SELECT COUNT(*) as count'),
        params
      );
      const total = countResult?.count || 0;

      // Get paginated results
      const templates = await db.all(
        query + ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return {
        templates: templates.map((t: any) => ({
          ...t,
          variables: t.variables ? JSON.parse(t.variables) : [],
          isActive: Boolean(t.isActive),
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt),
        })),
        total,
        pages: Math.ceil(total / limit),
      };
    } catch (error: any) {
      logger.error('Error getting templates:', error);
      throw error;
    }
  }

  /**
   * Update template
   */
  async updateTemplate(
    userId: string,
    templateId: string,
    name?: string,
    body?: string,
    subject?: string,
    category?: string
  ): Promise<Template> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    try {
      const template = await this.getTemplate(userId, templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      const newName = name || template.name;
      const newBody = body || template.body;
      const newSubject = subject !== undefined ? subject : template.subject;
      const newCategory = category !== undefined ? category : template.category;

      // Validate
      if (name) {
        const validation = this.validateName(name);
        if (!validation.valid) throw new Error(validation.error);
      }

      if (body) {
        const validation = this.validateBody(body);
        if (!validation.valid) throw new Error(validation.error);
      }

      const variables = this.extractVariables(newBody);
      const now = new Date();

      await db.run(
        `UPDATE templates SET name = ?, subject = ?, body = ?, variables = ?, category = ?, updatedAt = ?
         WHERE id = ? AND userId = ?`,
        [
          newName,
          newSubject || null,
          newBody,
          variables.length > 0 ? JSON.stringify(variables) : null,
          newCategory || null,
          now.toISOString(),
          templateId,
          userId,
        ]
      );

      logger.info(`Template updated: ${templateId}`);

      return {
        id: templateId,
        userId,
        name: newName,
        subject: newSubject,
        body: newBody,
        variables,
        category: newCategory,
        isActive: true,
        createdAt: template.createdAt,
        updatedAt: now,
      };
    } catch (error: any) {
      logger.error('Error updating template:', error);
      throw error;
    }
  }

  /**
   * Delete template (soft delete)
   */
  async deleteTemplate(userId: string, templateId: string): Promise<void> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    try {
      const result = await db.run(
        `UPDATE templates SET isActive = 0 WHERE id = ? AND userId = ?`,
        [templateId, userId]
      );

      if (result.changes === 0) {
        throw new Error('Template not found');
      }

      logger.info(`Template deleted: ${templateId}`);
    } catch (error: any) {
      logger.error('Error deleting template:', error);
      throw error;
    }
  }

  /**
   * Preview template with variables substituted
   */
  previewTemplate(body: string, variables?: Record<string, any>): string {
    let preview = body;

    if (variables) {
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        preview = preview.replace(regex, String(value));
      });
    }

    return preview;
  }

  /**
   * Render template for specific contact
   */
  renderTemplate(body: string, contactData: Record<string, any>): string {
    let rendered = body;

    // Replace all variables with contact data
    const variableRegex = /\{\{(\w+)\}\}/g;
    rendered = rendered.replace(variableRegex, (match, key) => {
      return String(contactData[key] || match);
    });

    return rendered;
  }

  /**
   * Duplicate template
   */
  async duplicateTemplate(userId: string, templateId: string, newName?: string): Promise<Template> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    try {
      const original = await this.getTemplate(userId, templateId);
      if (!original) {
        throw new Error('Template not found');
      }

      const name = newName || `${original.name} (Copy)`;
      return await this.createTemplate(userId, name, original.body, original.subject, original.category);
    } catch (error: any) {
      logger.error('Error duplicating template:', error);
      throw error;
    }
  }
}

export const templatesService = new TemplatesService();

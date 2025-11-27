#!/usr/bin/env node

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

interface CLILicense {
  id: string;
  licenseKey: string;
  licenseType: 'master' | 'distributor' | 'user';
  customerName?: string;
  validityDays: number;
  expiryDate: string;
  features: Record<string, boolean>;
  signature: string;
  createdAt: string;
}

class LicenseGenerator {
  private secretKey: string;
  private dbPath: string;

  constructor(secretKey?: string) {
    // Load secret key from environment or use default
    this.secretKey = secretKey || process.env.LICENSE_SECRET_KEY || this.loadOrCreateSecretKey();
    this.dbPath = path.join(process.cwd(), 'broadcaster.db');
  }

  /**
   * Load or create a secret key file
   */
  private loadOrCreateSecretKey(): string {
    const secretKeyPath = path.join(process.cwd(), '.license-secret');

    if (fs.existsSync(secretKeyPath)) {
      const key = fs.readFileSync(secretKeyPath, 'utf-8').trim();
      console.log('✓ Loaded secret key from', secretKeyPath);
      return key;
    }

    // Generate new secret key
    const newKey = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(secretKeyPath, newKey, 'utf-8');
    fs.chmodSync(secretKeyPath, 0o600); // Make it read-only for owner
    console.log('✓ Created new secret key at', secretKeyPath);
    console.log('⚠️  IMPORTANT: Keep this file safe! Back it up securely.');
    return newKey;
  }

  /**
   * Get default features for license type
   */
  private getDefaultFeatures(licenseType: 'master' | 'distributor' | 'user'): Record<string, boolean> {
    const featureMatrix = {
      master: {
        manage_users: true,
        manage_licenses: true,
        manage_plans: true,
        create_campaigns: true,
        run_campaigns: true,
        view_analytics: true,
        white_label: true,
        multi_account: true,
        templates: true,
        scheduling: true,
        anti_ban: true,
      },
      distributor: {
        create_campaigns: true,
        run_campaigns: true,
        view_analytics: true,
        white_label: true,
        multi_account: true,
        templates: true,
        scheduling: true,
        anti_ban: true,
      },
      user: {
        create_campaigns: true,
        run_campaigns: true,
        view_analytics: true,
        multi_account: true,
        templates: true,
        scheduling: true,
        anti_ban: true,
      },
    };

    return featureMatrix[licenseType];
  }

  /**
   * Generate license key
   */
  private generateLicenseKey(): string {
    const prefix = 'BRD';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(8).toString('hex').toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Generate cryptographic signature
   */
  private generateSignature(data: any): string {
    const hash = crypto.createHmac('sha256', this.secretKey);
    hash.update(JSON.stringify(data));
    return hash.digest('hex');
  }

  /**
   * Generate a single license
   */
  generateLicense(licenseType: 'master' | 'distributor' | 'user', validityDays: number, customerName?: string): CLILicense {
    const id = uuidv4();
    const licenseKey = this.generateLicenseKey();

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + validityDays);

    const features = this.getDefaultFeatures(licenseType);

    const signatureData = {
      id,
      licenseKey,
      licenseType,
      expiryDate: expiryDate.toISOString(),
      features,
    };

    const signature = this.generateSignature(signatureData);

    return {
      id,
      licenseKey,
      licenseType,
      customerName,
      validityDays,
      expiryDate: expiryDate.toISOString().split('T')[0],
      features,
      signature,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Generate multiple licenses
   */
  generateMultipleLicenses(count: number, licenseType: 'master' | 'distributor' | 'user', validityDays: number, customerName?: string): CLILicense[] {
    const licenses: CLILicense[] = [];
    for (let i = 0; i < count; i++) {
      licenses.push(this.generateLicense(licenseType, validityDays, customerName ? `${customerName}-${i + 1}` : undefined));
    }
    return licenses;
  }

  /**
   * Save licenses to database
   */
  async saveLicensesToDatabase(licenses: CLILicense[]): Promise<void> {
    try {
      const db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database,
      });

      for (const license of licenses) {
        await db.run(
          `
          INSERT INTO licenses (
            id, licenseKey, licenseType, isActive, validUntil, features, signature, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            license.id,
            license.licenseKey,
            license.licenseType,
            1, // isActive
            license.expiryDate,
            JSON.stringify(license.features),
            license.signature,
            license.createdAt,
          ]
        );
      }

      await db.close();
      console.log(`✓ Saved ${licenses.length} license(s) to database`);
    } catch (error: any) {
      console.error('✗ Error saving to database:', error.message);
      throw error;
    }
  }

  /**
   * Export licenses to JSON file
   */
  exportToJSON(licenses: CLILicense[], filename?: string): string {
    const exportPath = filename || `licenses-${Date.now()}.json`;
    const fullPath = path.join(process.cwd(), exportPath);

    fs.writeFileSync(fullPath, JSON.stringify(licenses, null, 2), 'utf-8');
    console.log(`✓ Exported licenses to ${fullPath}`);
    return fullPath;
  }

  /**
   * Export licenses to CSV
   */
  exportToCSV(licenses: CLILicense[], filename?: string): string {
    const exportPath = filename || `licenses-${Date.now()}.csv`;
    const fullPath = path.join(process.cwd(), exportPath);

    const headers = ['License Key', 'Type', 'Customer Name', 'Expiry Date', 'Features', 'Created At'];
    const rows = licenses.map((l) => [
      l.licenseKey,
      l.licenseType,
      l.customerName || 'N/A',
      l.expiryDate,
      Object.keys(l.features)
        .filter((k) => l.features[k])
        .join('; '),
      l.createdAt,
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    fs.writeFileSync(fullPath, csv, 'utf-8');
    console.log(`✓ Exported licenses to ${fullPath}`);
    return fullPath;
  }

  /**
   * Display licenses in console table
   */
  displayTable(licenses: CLILicense[]): void {
    console.log('\n');
    console.table(
      licenses.map((l) => ({
        'License Key': l.licenseKey,
        Type: l.licenseType.toUpperCase(),
        Customer: l.customerName || '-',
        'Expires': l.expiryDate,
        Features: Object.keys(l.features)
          .filter((k) => l.features[k])
          .length,
      }))
    );
    console.log('\n');
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): any {
  const args = process.argv.slice(2);
  const parsed: any = {
    type: 'user',
    count: 1,
    validity: 365,
    format: 'table',
    save: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--type' && args[i + 1]) {
      parsed.type = args[++i];
    } else if (arg === '--count' && args[i + 1]) {
      parsed.count = parseInt(args[++i]);
    } else if (arg === '--validity' && args[i + 1]) {
      parsed.validity = parseInt(args[++i]);
    } else if (arg === '--customer' && args[i + 1]) {
      parsed.customer = args[++i];
    } else if (arg === '--format' && args[i + 1]) {
      parsed.format = args[++i];
    } else if (arg === '--save') {
      parsed.save = true;
    } else if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    }
  }

  return parsed;
}

/**
 * Show help message
 */
function showHelp(): void {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║         BROADCASTER LICENSE GENERATOR CLI TOOL                ║
╚════════════════════════════════════════════════════════════════╝

USAGE:
  npm run generate-license [options]

OPTIONS:
  --type <type>           License type: master, distributor, user
                          Default: user

  --count <number>        Number of licenses to generate
                          Default: 1
                          Max: 1000

  --validity <days>       Validity in days
                          Default: 365

  --customer <name>       Customer name (added to license)
                          Optional

  --format <format>       Output format: table, json, csv
                          Default: table

  --save                  Save to database
                          Default: false (just display)

  --help, -h              Show this help message

EXAMPLES:

  # Generate 1 user license for 1 year
  npm run generate-license

  # Generate 50 user licenses for "ABC Company" for 6 months
  npm run generate-license --type user --count 50 --customer "ABC Company" --validity 180

  # Generate 1 distributor license and save to database
  npm run generate-license --type distributor --save

  # Generate 100 user licenses and export as CSV
  npm run generate-license --type user --count 100 --format csv

  # Generate master license for yourself
  npm run generate-license --type master --customer "My Company"

OUTPUT FORMATS:
  - table:  Display in console (default)
  - json:   Save to JSON file
  - csv:    Save to CSV file

DATABASE:
  Licenses are saved to: broadcaster.db

SECRET KEY:
  A secret key is automatically created at: .license-secret
  Keep this file safe! Do not commit it to git.

═══════════════════════════════════════════════════════════════════
  `);
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  try {
    const args = parseArgs();

    // Validate license type
    const validTypes = ['master', 'distributor', 'user'];
    if (!validTypes.includes(args.type)) {
      console.error(`✗ Invalid license type: ${args.type}`);
      console.error(`✓ Valid types: ${validTypes.join(', ')}`);
      process.exit(1);
    }

    // Validate count
    if (args.count < 1 || args.count > 1000) {
      console.error('✗ Count must be between 1 and 1000');
      process.exit(1);
    }

    // Validate validity
    if (args.validity < 1) {
      console.error('✗ Validity must be at least 1 day');
      process.exit(1);
    }

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║         BROADCASTER LICENSE GENERATOR                        ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const generator = new LicenseGenerator();

    // Generate licenses
    console.log(`📝 Generating ${args.count} ${args.type} license(s)...`);
    const licenses = generator.generateMultipleLicenses(args.count, args.type, args.validity, args.customer);

    // Display or export
    if (args.format === 'table') {
      generator.displayTable(licenses);
    } else if (args.format === 'json') {
      generator.exportToJSON(licenses);
    } else if (args.format === 'csv') {
      generator.exportToCSV(licenses);
    }

    // Save to database if requested
    if (args.save) {
      console.log('💾 Saving to database...');
      await generator.saveLicensesToDatabase(licenses);
    } else {
      console.log('💡 Tip: Use --save flag to save licenses to database');
    }

    // Print summary
    console.log('✓ Done!');
    console.log(`  Type: ${args.type}`);
    console.log(`  Count: ${args.count}`);
    console.log(`  Validity: ${args.validity} days`);
    console.log(`  Saved: ${args.save ? 'Yes' : 'No'}\n`);
  } catch (error: any) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { LicenseGenerator, CLILicense };

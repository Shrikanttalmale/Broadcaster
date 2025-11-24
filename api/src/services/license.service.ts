import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export interface License {
  id: string;
  licenseType: 'master' | 'distributor' | 'user';
  licenseKey: string;
  ownerId?: string;
  planId?: string;
  status: 'active' | 'inactive' | 'expired';
  features: Record<string, boolean>;
  expiryDate: Date;
  createdAt: Date;
  signature: string;
}

export interface LicenseGenerationOptions {
  licenseType: 'master' | 'distributor' | 'user';
  ownerId?: string;
  planId?: string;
  validityDays: number;
  features?: Record<string, boolean>;
}

export class LicenseService {
  private secretKey: string;

  constructor(secretKey?: string) {
    // In production, load from environment variable or config file
    this.secretKey = secretKey || process.env.LICENSE_SECRET_KEY || 'broadcaster-default-secret-key';
  }

  /**
   * Generate a new license key with signature
   */
  generateLicense(options: LicenseGenerationOptions): License {
    const id = uuidv4();
    const licenseKey = this.generateLicenseKey();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + options.validityDays);

    // Default features based on license type
    const defaultFeatures = this.getDefaultFeatures(options.licenseType);
    const features = { ...defaultFeatures, ...options.features };

    // Generate signature for license validation
    const signature = this.generateSignature({
      id,
      licenseKey,
      licenseType: options.licenseType,
      expiryDate: expiryDate.toISOString(),
      features,
    });

    const license: License = {
      id,
      licenseType: options.licenseType,
      licenseKey,
      ownerId: options.ownerId,
      planId: options.planId,
      status: 'active',
      features,
      expiryDate,
      createdAt: new Date(),
      signature,
    };

    return license;
  }

  /**
   * Validate a license key and verify its signature
   */
  validateLicense(license: License): { valid: boolean; reason?: string } {
    try {
      // Check status
      if (license.status !== 'active') {
        return { valid: false, reason: `License is ${license.status}` };
      }

      // Check expiry
      if (this.isExpired(license)) {
        return { valid: false, reason: 'License has expired' };
      }

      // Verify signature
      const expectedSignature = this.generateSignature({
        id: license.id,
        licenseKey: license.licenseKey,
        licenseType: license.licenseType,
        expiryDate: license.expiryDate.toISOString(),
        features: license.features,
      });

      if (license.signature !== expectedSignature) {
        return { valid: false, reason: 'License signature is invalid' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, reason: 'License validation error' };
    }
  }

  /**
   * Check if license has expired
   */
  isExpired(license: License): boolean {
    return new Date() > new Date(license.expiryDate);
  }

  /**
   * Check if license has a specific feature enabled
   */
  hasFeature(license: License, feature: string): boolean {
    const validation = this.validateLicense(license);
    if (!validation.valid) {
      return false;
    }

    return license.features[feature] === true;
  }

  /**
   * Enable a feature for a license
   */
  enableFeature(license: License, feature: string): License {
    license.features[feature] = true;
    // Regenerate signature after feature update
    license.signature = this.generateSignature({
      id: license.id,
      licenseKey: license.licenseKey,
      licenseType: license.licenseType,
      expiryDate: license.expiryDate.toISOString(),
      features: license.features,
    });
    return license;
  }

  /**
   * Disable a feature for a license
   */
  disableFeature(license: License, feature: string): License {
    license.features[feature] = false;
    // Regenerate signature
    license.signature = this.generateSignature({
      id: license.id,
      licenseKey: license.licenseKey,
      licenseType: license.licenseType,
      expiryDate: license.expiryDate.toISOString(),
      features: license.features,
    });
    return license;
  }

  /**
   * Deactivate a license
   */
  deactivateLicense(license: License): License {
    license.status = 'inactive';
    return license;
  }

  /**
   * Get license details with formatted info
   */
  getLicenseInfo(license: License): {
    id: string;
    licenseType: string;
    status: string;
    daysRemaining: number;
    isExpired: boolean;
    enabledFeatures: string[];
    licenseKey: string;
  } {
    const now = new Date();
    const expiryDate = new Date(license.expiryDate);
    const daysRemaining = Math.ceil(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    const enabledFeatures = Object.entries(license.features)
      .filter(([_, enabled]) => enabled)
      .map(([feature]) => feature);

    return {
      id: license.id,
      licenseType: license.licenseType,
      status: license.status,
      daysRemaining: Math.max(0, daysRemaining),
      isExpired: this.isExpired(license),
      enabledFeatures,
      licenseKey: license.licenseKey,
    };
  }

  /**
   * Check role hierarchy for license type
   */
  canUpgradeTo(currentLicenseType: string, targetLicenseType: string): boolean {
    const hierarchy: Record<string, number> = {
      user: 1,
      distributor: 2,
      master: 3,
    };

    return (hierarchy[targetLicenseType] || 0) <= (hierarchy[currentLicenseType] || 0);
  }

  /**
   * Get features that can be unlocked with specific plan
   */
  getFeaturesByPlan(planId: string): Record<string, boolean> {
    // This will be populated from database in real implementation
    const featuresByPlan: Record<string, Record<string, boolean>> = {
      starter: {
        multi_account: false,
        campaigns: true,
        templates: false,
        analytics: false,
        white_label: false,
      },
      professional: {
        multi_account: true,
        campaigns: true,
        templates: true,
        analytics: true,
        white_label: false,
      },
      enterprise: {
        multi_account: true,
        campaigns: true,
        templates: true,
        analytics: true,
        white_label: true,
      },
    };

    return featuresByPlan[planId] || {};
  }

  // Private helper methods

  /**
   * Generate a unique license key
   */
  private generateLicenseKey(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomPart = crypto.randomBytes(8).toString('hex').toUpperCase();
    const checksum = crypto
      .createHash('md5')
      .update(timestamp + randomPart)
      .digest('hex')
      .substring(0, 4)
      .toUpperCase();

    return `BR-${timestamp}-${randomPart}-${checksum}`;
  }

  /**
   * Generate HMAC signature for license
   */
  private generateSignature(data: Record<string, any>): string {
    const dataString = JSON.stringify(data);
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(dataString)
      .digest('hex');
  }

  /**
   * Get default features based on license type
   */
  private getDefaultFeatures(licenseType: string): Record<string, boolean> {
    const features: Record<string, Record<string, boolean>> = {
      master: {
        multi_account: true,
        campaigns: true,
        templates: true,
        analytics: true,
        white_label: true,
        admin_panel: true,
        distributor_management: true,
        user_management: true,
        license_management: true,
      },
      distributor: {
        multi_account: true,
        campaigns: true,
        templates: true,
        analytics: true,
        white_label: true,
        admin_panel: false,
        distributor_management: false,
        user_management: true,
        license_management: false,
      },
      user: {
        multi_account: false,
        campaigns: true,
        templates: false,
        analytics: false,
        white_label: false,
        admin_panel: false,
        distributor_management: false,
        user_management: false,
        license_management: false,
      },
    };

    return features[licenseType] || {};
  }
}

export default new LicenseService();

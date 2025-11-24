// User model interfaces
export interface IUser {
  id: string;
  username: string;
  passwordHash: string;
  email?: string;
  role: 'admin' | 'manager' | 'operator';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// License model interfaces
export interface ILicense {
  id: string;
  licenseKey: string;
  licenseType: 'master' | 'distributor' | 'user';
  planId?: string;
  distributor?: {
    id: string;
    name: string;
    brandingOverride: {
      appName: string;
      logo: string;
      primaryColor: string;
      supportEmail: string;
    };
  };
  isActive: boolean;
  validFrom: Date;
  validUntil: Date;
  maxInstallations: number;
  features: Record<string, any>;
  signature: string;
  createdAt: Date;
  updatedAt: Date;
}

// Plan model interfaces
export interface IPlan {
  id: string;
  name: string;
  description?: string;
  features: {
    maxAccounts: number;
    maxCampaigns: number;
    maxContacts: number;
    maxMessagesPerDay: number;
    multiLanguage: boolean;
    customBranding: boolean;
    advancedReports: boolean;
  };
  price?: number;
  currency?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Campaign model interfaces
export interface ICampaign {
  id: string;
  userId: string;
  name: string;
  description?: string;
  messageTemplate: string;
  contactListId: string;
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'failed';
  scheduledFor?: Date;
  startedAt?: Date;
  completedAt?: Date;
  delayMin: number;
  delayMax: number;
  throttlePerMinute: number;
  retryAttempts: number;
  createdAt: Date;
  updatedAt: Date;
}

// Message model interfaces
export interface IMessage {
  id: string;
  campaignId: string;
  phoneNumber: string;
  message: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  attemptCount: number;
  lastError?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// WhatsApp Account model interfaces
export interface IWhatsAppAccount {
  id: string;
  userId: string;
  phoneNumber: string;
  sessionData: Record<string, any>;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

# White-Labeling & Distributor System Guide

## Overview

This guide explains how to use Broadcaster's white-labeling system to create and manage distributor licenses, and how distributors can rebrand the application.

## License Hierarchy

```
Master License (Creator)
    ↓
Distributor License (Reseller with white-labeling)
    ├─ Can rebrand app name, logo, colors
    ├─ Can create custom plans
    └─ Can generate user licenses for customers
```

## For App Creators (You)

### Step 1: Generate Distributor License

```json
{
  "version": "1.0",
  "licenseId": "DIST-2024-001",
  "licenseType": "distributor",
  "distributor": {
    "id": "dist_123456",
    "name": "ABC Marketing Solutions",
    "brandingOverride": {
      "appName": "ABC Broadcaster",
      "logo": "base64_encoded_image",
      "primaryColor": "#FF6B35",
      "secondaryColor": "#004E89",
      "supportEmail": "support@abcmarketing.com",
      "supportPhone": "+91-9876543210",
      "websiteUrl": "https://abcmarketing.com"
    }
  },
  "plans": [
    {
      "id": "plan_basic",
      "name": "Starter",
      "features": {
        "maxAccounts": 1,
        "maxCampaigns": 3,
        "maxContacts": 5000,
        "maxMessagesPerDay": 500
      }
    }
  ],
  "validFrom": "2024-01-01",
  "validUntil": "2025-12-31",
  "maxInstallations": 100,
  "features": {
    "multiLanguage": true,
    "whiteLabeling": true,
    "advancedReports": true,
    "apiAccess": false
  },
  "signature": "encrypted_hash_for_validation"
}
```

### Step 2: Encrypt License Key

License keys should be encrypted with your private key (Phase 8 - Security).

### Step 3: Distribute to Reseller

Send the encrypted license file to the distributor securely.

## For Distributors

### Step 1: Configure Branding

Edit `/config/white-label.config.json`:

```json
{
  "branding": {
    "appName": "ABC Broadcaster",
    "companyName": "ABC Marketing Solutions",
    "logo": {
      "imageUrl": "file://./assets/your-logo.png",
      "width": 200,
      "height": 60
    },
    "theme": {
      "primaryColor": "#FF6B35",
      "secondaryColor": "#004E89",
      "accentColor": "#F77F00"
    },
    "contact": {
      "supportEmail": "support@abcmarketing.com",
      "supportPhone": "+91-9876543210",
      "websiteUrl": "https://abcmarketing.com"
    }
  }
}
```

### Step 2: Create Custom Plans

Edit `/config/plans.config.json` or use Admin UI (Phase 2):

```json
[
  {
    "id": "plan_starter",
    "name": "Starter - ₹500/month",
    "price": 500,
    "features": {
      "maxAccounts": 1,
      "maxCampaigns": 3,
      "maxContacts": 5000,
      "maxMessagesPerDay": 500
    }
  },
  {
    "id": "plan_professional",
    "name": "Professional - ₹2000/month",
    "price": 2000,
    "features": {
      "maxAccounts": 5,
      "maxCampaigns": 20,
      "maxContacts": 50000,
      "maxMessagesPerDay": 5000
    }
  }
]
```

### Step 3: Generate User Licenses

Use admin panel to generate user licenses with selected plan:

```json
{
  "version": "1.0",
  "licenseId": "USER-2024-001",
  "licenseType": "user",
  "planId": "plan_professional",
  "distributor": "dist_123456",
  "user": {
    "id": "customer_789",
    "companyName": "XYZ Marketing Pvt Ltd"
  },
  "validFrom": "2024-01-01",
  "validUntil": "2024-12-31",
  "maxInstallations": 1,
  "features": {
    "maxAccounts": 5,
    "maxCampaigns": 20,
    "maxContacts": 50000,
    "maxMessagesPerDay": 5000
  }
}
```

### Step 4: Package for Distribution

```bash
npm run build
npm run dist

# Creates installers with your branding:
# - ABC_Broadcaster_1.0.0.exe (Windows)
# - ABC_Broadcaster_1.0.0.dmg (Mac)
# - ABC_Broadcaster_1.0.0.AppImage (Linux)
```

## Revenue Model Example

### Scenario: ABC Marketing Solutions as Distributor

**Your Revenue:**
- Distributor License: $2,000/year

**Distributor's Revenue:**
- Customer A: Starter ($500/mo) = $6,000/year
- Customer B: Professional ($2,000/mo) = $24,000/year
- Customer C: Professional ($2,000/mo) = $24,000/year
- **Total Annual Revenue: $54,000**
- **Profit (after your $2,000): $52,000**
- **Distributor's Margin: 96%**

## Plan Feature Matrix

| Feature | Starter | Professional | Enterprise |
|---------|---------|--------------|-----------|
| Max Accounts | 1 | 5 | 50 |
| Max Campaigns | 3 | 20 | 200 |
| Max Contacts | 5,000 | 50,000 | 500,000 |
| Max Messages/Day | 500 | 5,000 | 50,000 |
| Multi-Language | ❌ | ✅ | ✅ |
| Custom Branding | ❌ | ✅ | ✅ |
| Advanced Reports | ❌ | ✅ | ✅ |
| Price (INR) | ₹500 | ₹2,000 | ₹5,000 |

## How License Validation Works

1. **App Starts**
   ```
   User launches Broadcaster
   ↓
   Check for license.key file
   ↓
   Decrypt and validate signature
   ↓
   Check expiry date
   ↓
   Load branding from license
   ↓
   Apply feature restrictions
   ↓
   All checks passed → App loads
   ```

2. **Feature Enforcement**
   ```
   User tries to create 6th WhatsApp account
   ↓
   Check: maxAccounts = 5
   ↓
   Block action
   ↓
   Show: "Upgrade to Professional plan"
   ```

3. **Daily Limit Check**
   ```
   Campaign sends 5,001st message
   ↓
   Check: maxMessagesPerDay = 5,000
   ↓
   Pause campaign
   ↓
   Show: "Daily limit reached. Resumes at 12:00 AM"
   ```

## Admin Panel Features (Phase 2)

### For Distributors
- ✅ Create unlimited custom plans
- ✅ Modify plan names, features, pricing
- ✅ Generate user licenses (bulk)
- ✅ View customer usage analytics
- ✅ Create promo codes (optional)

### For End Customers (Admin role)
- ✅ View their plan details
- ✅ See remaining quota (if applicable)
- ✅ Download usage reports
- ✅ Manage team members (Manager, Operator)

## Security Considerations

1. **License Encryption**
   - All license files encrypted with distributor private key
   - Signature validation on each load

2. **Hardware Fingerprinting** (Phase 8)
   - Tie license to specific machine
   - Prevent license copying

3. **Offline Validation**
   - No internet call required
   - All checks done locally

4. **Expiry Enforcement**
   - Automatically disable app when license expires
   - Show 30-day, 7-day, 1-day warnings

## Troubleshooting

### License File Not Found
```
Solution: Ensure license.key is in app root directory
Location: /broadcaster/license.key
```

### Invalid License Signature
```
Solution: License file may be corrupted
Action: Request new license from creator
```

### Features Not Enabled
```
Solution: Check plan ID in license matches plans.config.json
Action: Regenerate license with correct plan ID
```

---

**Next Phase:** Implement complete admin UI for plan management and license generation.

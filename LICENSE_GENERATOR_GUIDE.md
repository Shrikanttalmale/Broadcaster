# 🎯 License Generator CLI Tool

## Overview

The License Generator is a command-line tool that allows you (the owner) to generate licenses for your customers and distributors. It works completely offline and requires no server.

**Key Features:**
- ✅ Generate single or batch licenses
- ✅ Cryptographically signed (can't be faked)
- ✅ Save to database or export as JSON/CSV
- ✅ Three license types: Master, Distributor, User
- ✅ Customizable validity periods
- ✅ Automatic secret key management

---

## Installation

### Step 1: Install Dependencies

```bash
cd api
npm install
```

This installs `ts-node` which allows running TypeScript CLI commands.

### Step 2: Verify Installation

```bash
npm run generate-license --help
```

You should see the help message.

---

## Usage

### Basic Syntax

```bash
npm run generate-license [options]
```

### Options

| Option | Description | Default | Example |
|--------|-------------|---------|---------|
| `--type` | License type (master/distributor/user) | user | `--type user` |
| `--count` | Number of licenses | 1 | `--count 50` |
| `--validity` | Days until expiry | 365 | `--validity 180` |
| `--customer` | Customer name | Optional | `--customer "ABC Corp"` |
| `--format` | Output format (table/json/csv) | table | `--format csv` |
| `--save` | Save to database | false | `--save` |
| `--help` | Show help message | - | `--help` |

---

## Examples

### Example 1: Generate 1 User License (Display Only)

```bash
npm run generate-license
```

**Output:**
```
✓ Generating 1 user license(s)...

┌─────────────────────────────────────────────────────────────────┐
│ License Key         │ Type   │ Customer │ Expires     │ Features │
├─────────────────────────────────────────────────────────────────┤
│ BRD-A1B2C3-XXXXX    │ USER   │ -        │ 2025-11-26  │ 8        │
└─────────────────────────────────────────────────────────────────┘

✓ Done!
  Type: user
  Count: 1
  Validity: 365 days
  Saved: No

💡 Tip: Use --save flag to save licenses to database
```

---

### Example 2: Generate 50 User Licenses for a Customer (Save to DB)

```bash
npm run generate-license --type user --count 50 --customer "ABC Company" --save
```

**What this does:**
- Generates 50 licenses
- Customer name: "ABC Company"
- Validity: 365 days (1 year)
- Saves to database (broadcaster.db)

**Output:**
```
✓ Generating 50 user license(s)...

[Displays table with 50 licenses...]

💾 Saving to database...
✓ Saved 50 license(s) to database

✓ Done!
  Type: user
  Count: 50
  Validity: 365 days
  Saved: Yes
```

---

### Example 3: Generate 1 Distributor License

```bash
npm run generate-license --type distributor --customer "John Seller"
```

**What this does:**
- Generates 1 distributor license
- Customer name: "John Seller"
- Validity: 365 days
- Does NOT save to database (you can review first)

**Output:**
```
┌──────────────────────────────────────────────────────────────────┐
│ License Key          │ Type        │ Customer     │ Expires      │
├──────────────────────────────────────────────────────────────────┤
│ BRD-DIST-001-XXXXXX  │ DISTRIBUTOR │ John Seller  │ 2025-11-26   │
└──────────────────────────────────────────────────────────────────┘
```

---

### Example 4: Generate 6-Month Licenses and Export as CSV

```bash
npm run generate-license --type user --count 100 --validity 180 --format csv
```

**What this does:**
- Generates 100 licenses
- Valid for 180 days (6 months)
- Exports to CSV file: `licenses-TIMESTAMP.csv`
- Does NOT save to database

**Output:**
```
✓ Generating 100 user license(s)...
✓ Exported licenses to licenses-1700000000000.csv

You can now email this CSV to your customer!
```

**CSV Content:**
```
"License Key","Type","Customer Name","Expiry Date","Features","Created At"
"BRD-A1B2C3-XXXXX","user","N/A","2025-05-26","create_campaigns; run_campaigns; ...","2025-11-26T..."
"BRD-D4E5F6-YYYYY","user","N/A","2025-05-26","create_campaigns; run_campaigns; ...","2025-11-26T..."
...
```

---

### Example 5: Generate Master License for Yourself (One-time Setup)

```bash
npm run generate-license --type master --customer "My Company" --save
```

**Important:** Only do this ONCE during setup!

**What this does:**
- Generates 1 master license
- This is for YOU only
- Saves to database
- You install the app and use this license

---

### Example 6: Generate and Export as JSON

```bash
npm run generate-license --type user --count 10 --format json
```

**Output:**
```
✓ Generating 10 user license(s)...
✓ Exported licenses to licenses-1700000000000.json
```

**JSON Content:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "licenseKey": "BRD-A1B2C3-XXXXX",
    "licenseType": "user",
    "customerName": null,
    "validityDays": 365,
    "expiryDate": "2026-11-26",
    "features": {
      "create_campaigns": true,
      "run_campaigns": true,
      "multi_account": true,
      ...
    },
    "signature": "abc123def456...",
    "createdAt": "2025-11-26T10:30:00.000Z"
  },
  ...
]
```

---

## Secret Key Management

### What is the Secret Key?

The secret key is used to cryptographically sign licenses so they can't be faked or modified. It's stored in `.license-secret` file.

### First Run

On your first run, the CLI automatically creates a secret key:

```bash
npm run generate-license

✓ Created new secret key at /path/to/.license-secret
⚠️  IMPORTANT: Keep this file safe! Back it up securely.
```

### Important Security Notes

1. **Never commit `.license-secret` to Git** - Add it to `.gitignore`:
   ```
   echo ".license-secret" >> .gitignore
   ```

2. **Back it up securely** - If you lose this file, all licenses become invalid!
   ```bash
   cp .license-secret .license-secret.backup
   # Store backup.secret in a secure location (password manager, encrypted USB, etc)
   ```

3. **Use environment variable** (optional) - For production:
   ```bash
   export LICENSE_SECRET_KEY="your-secret-key-here"
   npm run generate-license
   ```

---

## Workflow: Selling to a Customer

### Step 1: Customer Contacts You

```
Customer: "I want to buy WhatsApp marketing software for 50 users"
You: "That's $5,000. Here's what you get..."
```

### Step 2: Generate Licenses

```bash
npm run generate-license \
  --type user \
  --count 50 \
  --customer "ABC Company" \
  --validity 365 \
  --format csv \
  --save
```

This:
- Generates 50 licenses
- Saves to database (for your records)
- Exports to CSV (to send to customer)

### Step 3: Send to Customer

```
Email to customer@abccompany.com:

Subject: Your Broadcaster Licenses

Hi ABC Company,

Thank you for purchasing Broadcaster! Your 50 licenses are attached.

Download our app: [link]
Installation guide: [link]

License details:
- Count: 50 licenses
- Validity: 1 year (expires 2026-11-26)
- Each license is in the attached CSV file

How to use:
1. Download and install the app
2. Open the app
3. Go to License → Activate
4. Paste one license key
5. Done! Start using WhatsApp marketing

Any questions? Contact us at support@broadcaster.com

Best regards,
Broadcaster Team
```

### Step 4: Customer Activates

Customer installs the app, enters one license key, and starts using it!

---

## Workflow: Recruiting a Distributor

### Step 1: Generate Distributor License

```bash
npm run generate-license \
  --type distributor \
  --customer "John Seller Inc" \
  --save
```

### Step 2: Send to Distributor

```
Email to john@seller.com:

Hi John,

Here's your Broadcaster Distributor License:
  License Key: BRD-DIST-001-XXXXXX
  
You can now use our app as a distributor.

When your customer wants licenses:
1. Customer tells you: "I need 100 user licenses"
2. You tell us: "Generate 100 user licenses for my customer XYZ"
3. We generate them in 5 minutes
4. You get them and pass to your customer
5. Your customer pays you
6. You pay us 50% commission

Ready to start selling?
```

### Step 3: Customer Needs Licenses

```
John emails: "Generate 100 user licenses for my customer XYZ Corp"

You run:
npm run generate-license --type user --count 100 --customer "XYZ Corp" --format csv

You send CSV to John
John sends it to XYZ Corp
XYZ Corp activates and starts using
```

---

## Troubleshooting

### Error: Command not found

Make sure you're in the `api` directory:
```bash
cd api
npm run generate-license --help
```

### Error: ts-node not found

Install dependencies:
```bash
npm install
```

### Error: License secret not found

This should auto-create on first run. If not, check file permissions:
```bash
ls -la .license-secret
```

### Want to use existing secret key?

Set environment variable:
```bash
export LICENSE_SECRET_KEY="your-existing-secret-key"
npm run generate-license
```

### All licenses disappeared?

The CLI saves to `broadcaster.db` file. Make sure:
1. Database file exists: `ls -la broadcaster.db`
2. You're in the correct directory
3. Database has correct permissions

### How to backup licenses?

```bash
# Export all licenses to JSON
npm run generate-license --type user --count 0 --format json

# Or directly copy database
cp broadcaster.db broadcaster.db.backup
```

---

## Best Practices

1. **Generate in batches** - Don't generate 1000 licenses at once
   ```bash
   # ✓ Good
   npm run generate-license --count 100
   
   # ✗ Bad
   npm run generate-license --count 10000
   ```

2. **Always review before saving** - Generate first, review, then save
   ```bash
   # Review first
   npm run generate-license --type user --count 50
   
   # Then save if looks good
   npm run generate-license --type user --count 50 --save
   ```

3. **Keep customer names** - Helps with tracking
   ```bash
   npm run generate-license --customer "Customer Name" --save
   ```

4. **Regular backups** - Back up both database and secret key
   ```bash
   cp broadcaster.db broadcaster.db.$(date +%Y%m%d).backup
   cp .license-secret .license-secret.$(date +%Y%m%d).backup
   ```

5. **Track your sales** - Keep a spreadsheet of:
   - Customer name
   - Date of sale
   - Number of licenses
   - Expiry date
   - Amount paid

---

## Support

For issues or questions about the License Generator, contact support@broadcaster.com

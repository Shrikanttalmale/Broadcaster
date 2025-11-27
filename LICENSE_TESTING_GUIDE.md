# 🧪 License Testing Guide - How to Verify Generated Licenses Work

**Date:** November 26, 2025  
**Status:** Step-by-step testing procedures for generated licenses

---

## 📋 What We're Testing

When you generate a license, the system creates:
1. **License Key** - Unique identifier (e.g., `BRD-MIFWEYMT-DE66060562EF161C`)
2. **Signature** - Cryptographic proof it's legitimate
3. **Expiry Date** - When it stops working
4. **Features** - What the customer can use

We need to verify:
- ✅ License is in the database
- ✅ Signature is valid
- ✅ Features are correct
- ✅ Not expired
- ✅ Can be used in the app

---

## 🧪 Quick Test 1: Check Database

### Step 1: See All Generated Licenses

```powershell
cd C:\broadcaster\api

# Run this command to see licenses in database
npx ts-node -e "
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('broadcaster.db');
db.all('SELECT licenseKey, licenseType, expiryDate FROM licenses LIMIT 5', (err, rows) => {
  if (err) console.error(err);
  console.table(rows);
  db.close();
});
"
```

**Expected Output:**
```
┌─────────┬──────────────────────────────────────┬──────────────┬────────────┐
│ (index) │ licenseKey                           │ licenseType  │ expiryDate │
├─────────┼──────────────────────────────────────┼──────────────┼────────────┤
│ 0       │ 'BRD-MIFWEYMT-DE66060562EF161C'    │ 'user'       │ 1769459200 │
│ 1       │ 'BRD-MIFWEYMV-3BDE300EDFDB6B09'    │ 'user'       │ 1769459200 │
│ 2       │ 'BRD-MIFWEYMV-697E8E70CDF3AEB3'    │ 'user'       │ 1769459200 │
└─────────┴──────────────────────────────────────┴──────────────┴────────────┘
```

✅ **If you see licenses** → They're in database!

---

## 🧪 Quick Test 2: Verify Signature

### Step 2: Check if Signature is Valid

Create a test file: `C:\broadcaster\api\test-license.js`

```javascript
const crypto = require('crypto');
const sqlite3 = require('sqlite3');
const fs = require('fs');
const path = require('path');

// Read the secret key
const secretKeyPath = path.join(process.cwd(), '.license-secret');
const secretKey = fs.readFileSync(secretKeyPath, 'utf-8').trim();

// Get a license from database
const db = new sqlite3.Database('broadcaster.db');

db.get(
  'SELECT licenseKey, licenseType, expiryDate, features, signature FROM licenses LIMIT 1',
  (err, license) => {
    if (err) {
      console.error('❌ Database error:', err);
      db.close();
      return;
    }

    if (!license) {
      console.error('❌ No licenses found in database');
      db.close();
      return;
    }

    console.log('📋 Testing License:');
    console.log('   License Key:', license.licenseKey);
    console.log('   Type:', license.licenseType);
    console.log('   Expiry Date:', new Date(license.expiryDate * 1000).toISOString());

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(license.licenseKey + license.licenseType + license.expiryDate)
      .digest('hex');

    const isValid = expectedSignature === license.signature;

    console.log('\n🔐 Signature Verification:');
    console.log('   Expected:', expectedSignature.substring(0, 16) + '...');
    console.log('   Actual:  ', license.signature.substring(0, 16) + '...');
    console.log('   Match:   ', isValid ? '✅ YES - Valid!' : '❌ NO - Invalid!');

    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    const isExpired = now > license.expiryDate;
    console.log('\n📅 Expiry Check:');
    console.log('   Is Expired:', isExpired ? '❌ YES - Expired' : '✅ NO - Active');

    console.log('\n✨ Result:', isValid && !isExpired ? '✅ LICENSE IS VALID!' : '❌ License has issues');

    db.close();
  }
);
```

### Run the test:

```powershell
node test-license.js
```

**Expected Output:**
```
📋 Testing License:
   License Key: BRD-MIFWEYMT-DE66060562EF161C
   Type: user
   Expiry Date: 2026-11-26T00:00:00.000Z

🔐 Signature Verification:
   Expected: a1b2c3d4e5f6g7h8...
   Actual:   a1b2c3d4e5f6g7h8...
   Match:    ✅ YES - Valid!

📅 Expiry Check:
   Is Expired: ✅ NO - Active

✨ Result: ✅ LICENSE IS VALID!
```

✅ **If you see all checks passing** → License works!

---

## 🧪 Quick Test 3: Test in Actual API

### Step 3: Create a License Validation Endpoint

Add this to `api/src/routes/license.routes.ts`:

```typescript
// Test endpoint to validate a license
router.post('/validate', async (req, res) => {
  try {
    const { licenseKey } = req.body;
    
    if (!licenseKey) {
      return res.status(400).json({ error: 'License key required' });
    }

    // Get license from database
    const db = new sqlite.Database('broadcaster.db');
    const license = await db.get(
      'SELECT * FROM licenses WHERE licenseKey = ?',
      [licenseKey]
    );

    if (!license) {
      return res.status(404).json({ valid: false, reason: 'License not found' });
    }

    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (now > license.expiryDate) {
      return res.status(200).json({ valid: false, reason: 'License expired' });
    }

    // Verify signature
    const secretKey = fs.readFileSync('.license-secret', 'utf-8').trim();
    const expectedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(license.licenseKey + license.licenseType + license.expiryDate)
      .digest('hex');

    const isValid = expectedSignature === license.signature;

    res.json({
      valid: isValid,
      licenseKey: license.licenseKey,
      type: license.licenseType,
      expiryDate: new Date(license.expiryDate * 1000),
      features: license.features,
    });
  } catch (error) {
    res.status(500).json({ error: 'Validation error' });
  }
});
```

### Test with curl:

```powershell
# Start the API first (in separate terminal)
npm run dev

# Then test a license
curl -X POST http://localhost:3001/api/licenses/validate `
  -H "Content-Type: application/json" `
  -d '{
    "licenseKey": "BRD-MIFWEYMT-DE66060562EF161C"
  }'
```

**Expected Response:**
```json
{
  "valid": true,
  "licenseKey": "BRD-MIFWEYMT-DE66060562EF161C",
  "type": "user",
  "expiryDate": "2026-11-26T00:00:00.000Z",
  "features": {
    "create_campaigns": true,
    "run_campaigns": true,
    "view_analytics": true
  }
}
```

---

## 📊 Sample License from CSV (Your Real Data)

Here's what was actually generated:

```
License Key:    BRD-MIFWEYMT-DE66060562EF161C
Type:           user
Expiry Date:    2026-11-26
Features:       create_campaigns; run_campaigns; view_analytics; multi_account; templates; scheduling; anti_ban
Created At:     2025-11-26T11:05:30.583Z
```

### This license can:
✅ Create campaigns  
✅ Run campaigns  
✅ View analytics  
✅ Support multiple accounts  
✅ Use templates  
✅ Use scheduling  
✅ Use anti-ban features  

### Validity:
✅ Valid for 365 days (expires Nov 26, 2026)  
✅ Digitally signed and verified  
✅ Stored in database permanently  
✅ Can be revoked by changing status in database  

---

## 🎯 Test Sequence (Do This Now!)

### Test 1: Verify in Database (30 seconds)
```bash
npx ts-node -e "const sqlite3 = require('sqlite3'); const db = new sqlite3.Database('broadcaster.db'); db.all('SELECT licenseKey, licenseType FROM licenses LIMIT 3', (e,r)=>{ console.table(r); db.close(); });"
```

### Test 2: Verify Signature (60 seconds)
```bash
node test-license.js
```

### Test 3: Test in App (2 minutes)
```bash
npm run dev
# Open http://localhost:3000
# Try logging in with a test license
```

---

## ✅ Success Criteria

Your licenses are working if:

| Test | Check | Result |
|------|-------|--------|
| Database | License appears in `SELECT` | ✅ Should show 3+ rows |
| Signature | `isValid` shows `true` | ✅ Should match expected |
| Expiry | Not expired (future date) | ✅ Should show 2026 date |
| Features | Has expected permissions | ✅ Should list 7 features |
| API | Validate endpoint works | ✅ Should return valid: true |

---

## 🚀 Use These for Real!

Once verified, the licenses in your CSV are ready for customers:

1. **Generate:** `generate-license.bat --type user --count 50 --customer "ABC Corp" --format csv --save`
2. **Export:** CSV file created with all license keys
3. **Send:** Email CSV to customer
4. **Collect:** Payment ($5,000)
5. **Customer Uses:** They enter license key in app → app validates → works!

---

## 📞 Troubleshooting

**License shows as invalid?**
- Check expiry date hasn't passed
- Verify signature matches
- Ensure `.license-secret` wasn't changed

**Database shows no licenses?**
- Regenerate with `--save` flag
- Check file permissions on `broadcaster.db`

**Can't read secret key?**
- Ensure `.license-secret` exists in `api/` folder
- Check file isn't corrupted

---

## 💡 Next Steps

1. ✅ Run Test 1 to see licenses in database
2. ✅ Run Test 2 to verify signatures
3. ✅ Run Test 3 to test in actual app
4. ✅ Generate your first customer's 50 licenses
5. ✅ Send CSV file to customer
6. ✅ Collect $5,000 payment! 💰


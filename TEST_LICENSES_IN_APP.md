# 🧪 HOW TO TEST LICENSES IN YOUR APP

**Goal:** Verify that a generated license actually works when you enter it in the app

---

## 🚀 Quick Test (5 minutes)

### Step 1: Start Your App
```bash
# Terminal 1 - Start API
cd c:\broadcaster\api
npm run dev

# Terminal 2 - Start UI (wait 3 seconds for API to start)
cd c:\broadcaster\ui
npm run dev
```

**Expected output:**
```
API listening on http://localhost:3001
UI running on http://localhost:5173
```

### Step 2: Open the App
```
http://localhost:5173
```

### Step 3: Use a Real Generated License
Copy one of these licenses from your database:
```
BRD-MIFWEYMT-DE66060562EF161C
BRD-MIFWEYMV-3BDE300EDFDB6B09
BRD-MIFWDXBB-284C8D399B8138D3
```

### Step 4: Test Login
1. Click "Login" button (if needed)
2. Enter license key: `BRD-MIFWEYMT-DE66060562EF161C`
3. System validates and unlocks features
4. ✅ Should show dashboard with all features

---

## ✅ What to Verify in the App

### Features Should Be Enabled:
- ✅ Create Campaigns
- ✅ Run Campaigns  
- ✅ View Analytics
- ✅ Multi Account
- ✅ Templates
- ✅ Scheduling
- ✅ Anti-Ban

### License Info Should Show:
- License Type: `user`
- Expiry Date: `2026-11-26`
- Status: `Active`
- Feature Count: `7 of 7 enabled`

---

## 🧪 Programmatic Test (If You Want to Verify APIs)

### Test 1: Validate License via API
```bash
curl -X POST http://localhost:3001/api/licenses/validate \
  -H "Content-Type: application/json" \
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
  "expiryDate": "2026-11-26",
  "features": {
    "create_campaigns": true,
    "run_campaigns": true,
    "view_analytics": true,
    "multi_account": true,
    "templates": true,
    "scheduling": true,
    "anti_ban": true
  }
}
```

### Test 2: Check License Status
```bash
curl -X GET "http://localhost:3001/api/licenses/BRD-MIFWEYMT-DE66060562EF161C" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 3: Generate More Licenses While Testing
```bash
# Terminal 3
cd api
generate-license.bat --type user --count 10 --format csv --save
```

---

## 🎯 Full End-to-End Test (10 minutes)

### Step 1: Clear Existing Data
```bash
# Delete old licenses (optional - starts fresh)
cd api
rm broadcaster.db
```

### Step 2: Generate Fresh Licenses
```bash
cd api
generate-license.bat --type user --count 5 --customer "Test Customer" --format csv --save
```

**Should show:**
```
Licenses Generated:
- BRD-XXXX-YYYYYYYYYYYYYY
- BRD-XXXX-YYYYYYYYYYYYYY
- ... (5 total)

✓ Exported licenses to licenses-TIMESTAMP.csv
✓ Saved 5 license(s) to database
```

### Step 3: View Generated Licenses
```bash
node test-licenses.js
```

**Should show:**
```
✅ Generated Licenses in Database:
1. License Key: BRD-XXXX-YYYYYYYYYYYYYY
   Type: user
   Expiry: 2026-11-26
   Features: ...
   Signature: xxxxx...
```

### Step 4: Start App
```bash
# Terminal A
npm run dev          # Starts API

# Terminal B (after API starts)
npm run dev          # Starts UI
```

### Step 5: Test in Browser
```
1. Open http://localhost:5173
2. Click Login
3. Enter license: BRD-XXXX-YYYYYYYYYYYYYY
4. ✅ Should see dashboard
5. Click "My Licenses"
6. ✅ Should see license details
7. Click "Features"
8. ✅ Should see all 7 features enabled
```

### Step 6: Export and Verify CSV
```bash
# View the CSV that was generated
Get-Content licenses-*.csv | head -5
```

**Should show:**
```csv
"License Key","Type","Customer Name","Expiry Date","Features","Created At"
"BRD-XXXX-YYYYYYYYYYYYYY","user","Test Customer","2026-11-26",...
```

---

## ✅ Validation Checklist

After each test, check these boxes:

- [ ] License generated successfully
- [ ] License stored in database
- [ ] CSV file created
- [ ] App starts without errors
- [ ] License validates in API
- [ ] Login works with license key
- [ ] Dashboard loads with features
- [ ] Features are all enabled
- [ ] Expiry date shows as 2026-11-26
- [ ] Can create campaign
- [ ] Can run campaign
- [ ] Analytics page loads
- [ ] Multi-account works
- [ ] Scheduling works
- [ ] Anti-ban is enabled

---

## 🐛 Troubleshooting

### License won't validate?
```bash
# Check database
node test-licenses.js

# Regenerate with save
generate-license.bat --type user --count 3 --save

# Try again
```

### App won't start?
```bash
# Check dependencies
cd api && npm install
cd ../ui && npm install

# Try again
npm run dev
```

### License shows as invalid in app?
```bash
# Clear database and regenerate
rm api/broadcaster.db
cd api
generate-license.bat --type user --count 5 --save

# Restart app
```

### CSV file missing?
```bash
# Generate with explicit save and csv format
generate-license.bat --type user --count 5 --format csv --save

# Check file was created
Get-ChildItem licenses-*.csv
```

---

## 🎯 Final Verification

When you've completed all steps, your system is verified working if:

1. ✅ Can generate 50 licenses in < 1 second
2. ✅ CSV file created successfully
3. ✅ Database stores all licenses
4. ✅ App loads without errors
5. ✅ License key validates
6. ✅ All features are enabled
7. ✅ License expires in 365 days

---

## 💰 Now You're Ready to Sell!

Once verified:
1. Generate 50 licenses for customer
2. Export to CSV
3. Send to customer
4. Collect $5,000 payment
5. Repeat! 🚀


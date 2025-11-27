# ⚡ QUICK START - 5 MINUTE SETUP

## Copy-Paste These Commands

```bash
# Step 1: Go to the API folder
cd c:\broadcaster\api

# Step 2: Install dependencies (first time only)
npm install

# Step 3: Generate your first 50 licenses
npm run generate-license --type user --count 50 --customer "My First Customer" --format csv --save

# Done! Check the output CSV file in c:\broadcaster\api\
```

## That's It!

You now have:
- ✅ 50 licenses generated
- ✅ Saved to database
- ✅ CSV file ready to email to customer

## Send to Customer

Email the CSV file that was created. Customer extracts the license keys and enters them in the app.

## Get Paid

Customer pays $5,000. You profit!

---

## Common Commands (Copy-Paste Ready)

### Generate and Display (No Save)
```bash
npm run generate-license
```

### Generate 50 Licenses (Save to DB + CSV)
```bash
npm run generate-license --type user --count 50 --customer "ABC Company" --format csv --save
```

### Generate 100 Licenses for 6 Months
```bash
npm run generate-license --type user --count 100 --validity 180 --format csv --save
```

### Generate Distributor License
```bash
npm run generate-license --type distributor --customer "John Seller" --save
```

### See All Options
```bash
npm run generate-license --help
```

---

## Files Created

```
After running generate-license, you'll find:

api/broadcaster.db
└─ Database with all your licenses

api/.license-secret
└─ Secret key (keep safe!)

api/licenses-TIMESTAMP.csv
└─ Export file (send to customer)
```

---

## What to Read Next

1. **VISUAL_SUMMARY.md** - See what you built (3 min)
2. **LICENSE_CLI_QUICK_REFERENCE.md** - Common commands (5 min)
3. **LICENSE_SYSTEM_SETUP.md** - Business model (10 min)

---

## You're Ready! 🚀

Start generating licenses and selling to customers!

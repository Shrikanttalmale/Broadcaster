# 🎯 Quick Reference Card - License CLI Commands

## Installation (One-time)

```bash
cd api
npm install
```

---

## Commands Cheat Sheet

### 1. Show Help
```bash
npm run generate-license --help
```

### 2. Generate 1 License (Display Only)
```bash
npm run generate-license
```

### 3. Generate 50 User Licenses for Customer
```bash
npm run generate-license --type user --count 50 --customer "ABC Corp"
```

### 4. Generate & Save to Database
```bash
npm run generate-license --type user --count 50 --customer "ABC Corp" --save
```

### 5. Generate & Export as CSV (Email to Customer)
```bash
npm run generate-license --type user --count 50 --customer "ABC Corp" --format csv
```

### 6. Generate & Save + Export as CSV
```bash
npm run generate-license --type user --count 50 --customer "ABC Corp" --format csv --save
```

### 7. Generate 6-Month Licenses
```bash
npm run generate-license --type user --count 50 --validity 180 --save
```

### 8. Generate Distributor License
```bash
npm run generate-license --type distributor --customer "John Seller" --save
```

### 9. Generate Your Master License (One-time)
```bash
npm run generate-license --type master --customer "Your Company" --save
```

### 10. Generate & Export as JSON
```bash
npm run generate-license --type user --count 50 --format json
```

---

## Business Scenarios

### Scenario 1: First Customer Contact

```bash
# Customer wants 50 licenses for $5,000

npm run generate-license \
  --type user \
  --count 50 \
  --customer "ABC Company" \
  --validity 365 \
  --format csv \
  --save
```

**Then email the CSV to customer.**

---

### Scenario 2: Recruiting a Distributor

```bash
# Generate distributor license

npm run generate-license \
  --type distributor \
  --customer "John Seller Inc" \
  --save
```

**Send license key to John via email.**

---

### Scenario 3: Distributor's First Customer

```bash
# John tells you: "I have a customer XYZ Corp that needs 100 licenses"

npm run generate-license \
  --type user \
  --count 100 \
  --customer "XYZ Corp (via John)" \
  --validity 365 \
  --format csv \
  --save
```

**Send CSV to John, he passes to his customer.**

---

### Scenario 4: Quarterly Bulk Sale

```bash
# Customer wants 500 licenses for 1 year

npm run generate-license \
  --type user \
  --count 500 \
  --customer "Large Corporation" \
  --validity 365 \
  --format csv \
  --save
```

---

### Scenario 5: Test/Demo Licenses

```bash
# You need 10 demo licenses to show potential customers

npm run generate-license \
  --type user \
  --count 10 \
  --customer "Demo" \
  --validity 30
  # Note: NOT saving to database, just for testing
```

---

## Options Reference

| Option | Values | Default | Example |
|--------|--------|---------|---------|
| `--type` | master, distributor, user | user | `--type distributor` |
| `--count` | 1-1000 | 1 | `--count 50` |
| `--validity` | 1-36500 (days) | 365 | `--validity 180` |
| `--customer` | Any text | Optional | `--customer "ABC Corp"` |
| `--format` | table, json, csv | table | `--format csv` |
| `--save` | flag only | false | `--save` |
| `--help` | flag only | - | `--help` |

---

## Output Files

| Format | Location | Use Case |
|--------|----------|----------|
| Table | Console | Review before saving |
| CSV | `licenses-TIMESTAMP.csv` | Email to customer |
| JSON | `licenses-TIMESTAMP.json` | Backup, import to system |

---

## Database

All licenses saved with `--save` go to: `api/broadcaster.db`

**Check database contents:**
```bash
# Using sqlite3 CLI
sqlite3 api/broadcaster.db "SELECT licenseKey, licenseType, validUntil FROM licenses LIMIT 10;"

# Or just look at exports you've created
```

---

## Secret Key

Stored in: `api/.license-secret`

**IMPORTANT:**
- ⚠️ Back it up!
- ⚠️ Don't commit to Git
- ⚠️ If lost, all licenses become invalid
- ✓ Auto-created on first run

**Backup:**
```bash
cp api/.license-secret api/.license-secret.backup
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Command not found | `cd api` first |
| ts-node not found | `npm install` |
| Permissions denied | Check file permissions |
| Database locked | Close other connections |
| No output | Check console for errors |

---

## Workflow Summary

```
Day 1: Customer contacts
  ↓
  npm run generate-license --type user --count 50 \
    --customer "Customer Name" --format csv --save
  ↓
Day 2: Email CSV to customer
  ↓
Day 3: Customer installs & enters license
  ↓
Day 4: Customer pays
  ↓
  Your profit: $5,000 ✓
```

---

## Pro Tips

1. **Always review before saving**
   ```bash
   # First: Generate and view
   npm run generate-license --count 50
   
   # Then: Save if looks good
   npm run generate-license --count 50 --save
   ```

2. **Keep customer names for tracking**
   ```bash
   npm run generate-license --customer "Customer Name" --save
   ```

3. **Regular backups**
   ```bash
   cp api/broadcaster.db api/broadcaster.db.backup
   cp api/.license-secret api/.license-secret.backup
   ```

4. **Track your sales in a spreadsheet**
   - Customer name
   - Date
   - # of licenses
   - Amount paid
   - Expiry date

5. **Set a cron job for monthly backups** (optional)

---

## Contact & Support

Need help? Check these files in order:
1. `LICENSE_GENERATOR_GUIDE.md` - Full documentation
2. `LICENSE_SYSTEM_SETUP.md` - Setup instructions
3. `LICENSE_SYSTEM_ARCHITECTURE.md` - Technical details

Run: `npm run generate-license --help` for in-app help

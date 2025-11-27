# ⚡ QUICK FIX - How to Use License Generator on Windows

## The Easy Way (Recommended)

### Using Batch File (Windows Command Prompt)

```bash
cd api

# Generate 50 licenses
generate-license.bat --type user --count 50 --customer "ABC Corp" --format csv --save

# Generate and display help
generate-license.bat --help
```

### Using PowerShell

```powershell
cd api

# Generate 50 licenses
./generate-license.ps1 -Type user -Count 50 -Customer "ABC Corp" -Format csv -Save

# Generate and display help
./generate-license.ps1 -Help
```

### Using Direct ts-node (Advanced)

```bash
cd api

# Generate 50 licenses
npx ts-node src/cli/license-generator.ts --type user --count 50 --customer "ABC Corp" --format csv --save
```

---

## Common Commands

### Generate 1 Test License
```bash
generate-license.bat
```

### Generate 50 Licenses for Customer
```bash
generate-license.bat --type user --count 50 --customer "ABC Company" --format csv --save
```

### Generate Distributor License
```bash
generate-license.bat --type distributor --customer "John Seller" --save
```

### Generate and Export as CSV
```bash
generate-license.bat --type user --count 100 --format csv --save
```

---

## Installation

The batch and PowerShell files are already created in `api/` folder. No additional setup needed!

```bash
cd api
generate-license.bat --help
```

---

## Files Available

```
api/generate-license.bat
└─ Windows batch file (use in Command Prompt)

api/generate-license.ps1
└─ PowerShell file (use in PowerShell)

api/src/cli/license-generator.ts
└─ Source code (run with npx ts-node)
```

---

## What Was Wrong Before?

The `npm run generate-license` command had issues with argument passing in PowerShell. This is now fixed with the batch and PowerShell wrapper files.

---

## Choose Your Method

| Method | Command | Best For |
|--------|---------|----------|
| **Batch (Easiest)** | `generate-license.bat` | Windows CMD |
| **PowerShell** | `./generate-license.ps1` | PowerShell users |
| **Direct** | `npx ts-node src/cli/...` | Advanced users |

---

## Test It Now

```bash
cd c:\broadcaster\api
generate-license.bat --type user --count 5
```

You should see 5 licenses generated instantly!

---

## Success!

If you see a table with license keys like:
```
BRD-XXXXXX-YYYYYY
BRD-XXXXXX-YYYYYY
...
```

You're all set! The license system is working! 🎉

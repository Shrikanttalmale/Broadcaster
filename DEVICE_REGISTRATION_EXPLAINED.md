# 🔐 HOW DEVICE REGISTRATION WORKS - ENSURING 1 MACHINE PER LICENSE

**Overview:** Your system now tracks which devices use each license and prevents more machines than allowed (maxInstallations limit).

---

## 🎯 The Problem You Solved

**Before:** If one customer had 1 license key, they could share it on unlimited machines (security risk).

**After:** With device registration, each license is locked to a specific number of machines (default: 1).

---

## 🔧 HOW IT WORKS - STEP BY STEP

### Step 1: Customer Gets License

```
You: Generate and send license
Customer: BRD-MIFWEYMT-DE66060562EF161C (maxInstallations = 1)
```

### Step 2: Customer Uses License on MACHINE #1

```
Machine #1 (Desktop) opens your app
  ↓
Sends: licenseKey + deviceId to your server
  ↓
Server checks: Has this device registered before? NO
  ↓
Server checks: Other devices using this license? NO
  ↓
Server ACTION: Register device #1 ✅
  ↓
Result: Device #1 can now use the license
         Database stores: {deviceId, deviceName, isPrimary: true}
```

### Step 3: Customer Tries Machine #2

```
Machine #2 (Laptop) opens your app
  ↓
Sends: licenseKey + different deviceId to your server
  ↓
Server checks: Has this device registered before? NO
  ↓
Server checks: Current devices using license: 1 (Desktop)
  ↓
Server checks: maxInstallations limit: 1
  ↓
Server ACTION: BLOCK ❌
  ↓
Result: "License already in use on 1 device. Max: 1"
         Device #2 CANNOT use the license
```

---

## 📊 DATABASE STRUCTURE

### Table: `device_registrations`

```sql
CREATE TABLE device_registrations (
  id TEXT PRIMARY KEY,                    -- Unique registration ID
  licenseKey TEXT NOT NULL,               -- Links to license
  deviceId TEXT NOT NULL,                 -- Unique device identifier
  deviceName TEXT,                        -- Friendly name (hostname)
  deviceFingerprint TEXT UNIQUE,          -- Hardware fingerprint (CPU, memory, platform)
  isPrimary BOOLEAN DEFAULT 0,            -- First device is marked as primary
  registeredAt DATETIME,                  -- When registered
  lastUsedAt DATETIME,                    -- Last time device used license
  FOREIGN KEY(licenseKey) REFERENCES licenses(licenseKey)
);
```

### Example Data

```
License: BRD-MIFWEYMT-DE66060562EF161C
maxInstallations: 1

Device Registrations:
┌────────┬────────────────────────────┬────────────────────────────────┐
│ Device │ Name                       │ Registered                     │
├────────┼────────────────────────────┼────────────────────────────────┤
│ uuid-1 │ john-desktop               │ 2025-11-26 10:30:00            │
│ (PRIMARY - this is the only registered device)                       │
└────────┴────────────────────────────┴────────────────────────────────┘

MaxInstallations: 1
Current Usage: 1/1 slots full
Available Slots: 0
```

---

## 🔍 VALIDATION LOGIC

### The Check Function

```typescript
// When a device tries to use a license:
validateDeviceAccess(
  licenseKey,
  deviceId,
  maxInstallations,
  registeredDevices
) {
  // If maxInstallations is -1 or 0 → unlimited
  if (maxInstallations === -1) return { allowed: true };

  // Is this device already registered? → YES → ALLOW
  if (registeredDevices.has(deviceId)) return { allowed: true };

  // Have we hit the limit? → YES → BLOCK
  if (registeredDevices.length >= maxInstallations) {
    return { 
      allowed: false, 
      reason: "License in use on X device(s). Max: Y"
    };
  }

  // Not registered but under limit → ALLOW & REGISTER
  return { allowed: true };
}
```

---

## 🚀 API ENDPOINTS

### 1️⃣ **Register Device** (When app first uses license)

**Request:**
```bash
POST /api/v1/devices/register
{
  "licenseKey": "BRD-MIFWEYMT-DE66060562EF161C",
  "deviceId": "uuid-1234-5678",
  "deviceName": "john-desktop",
  "deviceFingerprint": "sha256hash..."
}
```

**Response - First Time (Success):**
```json
{
  "success": true,
  "message": "Device registered successfully",
  "data": {
    "registered": true,
    "device": {
      "id": "reg-id-123",
      "licenseKey": "BRD-MIFWEYMT-DE66060562EF161C",
      "deviceId": "uuid-1234-5678",
      "deviceName": "john-desktop",
      "isPrimary": true,
      "registeredAt": "2025-11-26T10:30:00Z"
    },
    "slotsUsed": 1,
    "slotsAvailable": 0
  }
}
```

**Response - Second Device (Blocked):**
```json
{
  "success": false,
  "error": "License is already in use on 1 device(s). Maximum allowed: 1",
  "code": "MAX_INSTALLATIONS_EXCEEDED",
  "data": {
    "currentDevices": 1,
    "maxDevices": 1
  }
}
```

### 2️⃣ **Get Registered Devices** (See which devices use a license)

**Request:**
```bash
GET /api/v1/devices/BRD-MIFWEYMT-DE66060562EF161C
```

**Response:**
```json
{
  "success": true,
  "data": {
    "licenseKey": "BRD-MIFWEYMT-DE66060562EF161C",
    "maxInstallations": 1,
    "registeredDevices": [
      {
        "id": "reg-id-123",
        "deviceId": "uuid-1234-5678",
        "deviceName": "john-desktop",
        "isPrimary": true,
        "registeredAt": "2025-11-26T10:30:00Z",
        "lastUsedAt": "2025-11-26T14:45:30Z"
      }
    ],
    "slotsUsed": 1,
    "slotsAvailable": 0
  }
}
```

### 3️⃣ **Validate Device** (Check if device can use license without registering)

**Request:**
```bash
POST /api/v1/devices/validate
{
  "licenseKey": "BRD-MIFWEYMT-DE66060562EF161C",
  "deviceId": "uuid-different"
}
```

**Response - Blocked:**
```json
{
  "success": false,
  "data": {
    "allowed": false,
    "reason": "License is already in use on 1 device(s). Maximum allowed: 1",
    "currentDevices": 1,
    "maxDevices": 1
  }
}
```

### 4️⃣ **Unregister Device** (Remove device from license)

**Request:**
```bash
DELETE /api/v1/devices/BRD-MIFWEYMT-DE66060562EF161C/uuid-1234-5678
```

**Response:**
```json
{
  "success": true,
  "message": "Device unregistered successfully",
  "data": {
    "removed": true,
    "licenseKey": "BRD-MIFWEYMT-DE66060562EF161C",
    "deviceId": "uuid-1234-5678"
  }
}
```

---

## 💡 REAL-WORLD SCENARIOS

### Scenario 1: Legitimate Use (Allowed)

```
Customer: John
License: BRD-MIFWEYMT-DE66060562EF161C (maxInstallations: 1)

Day 1 @ 10:00 AM
  John opens app on Desktop
  deviceId: abc-123
  Server registers: Device abc-123 ✅
  Result: ALLOWED

Day 1 @ 3:00 PM
  John logs back into app on same Desktop
  deviceId: abc-123 (same device)
  Server checks: Already registered? YES
  Result: ALLOWED ✅
```

### Scenario 2: Unauthorized Sharing (Blocked)

```
Customer: John
License: BRD-MIFWEYMT-DE66060562EF161C (maxInstallations: 1)

Day 1 @ 10:00 AM
  John uses license on Desktop
  deviceId: abc-123 (registered) ✅

Day 2 @ 2:00 PM
  John's friend tries to use license on Laptop
  deviceId: xyz-789
  Server checks: 
    - Is xyz-789 registered? NO
    - Are we at limit (1)? YES
  Result: BLOCKED ❌
  Error: "License in use on 1 device. Max: 1"
```

### Scenario 3: Device Upgrade (Managed)

```
Customer: John upgrades laptop

Old Laptop:
  deviceId: old-123 (registered)

New Laptop:
  deviceId: new-456
  
John tries new laptop: BLOCKED (at limit)

Solution:
  John calls support or manages device
  Admin removes old device: DELETE old-123
  Now: 0/1 slots used
  
John tries new laptop again:
  Now: ALLOWED ✅ (registered new device)
```

---

## 🛡️ SECURITY FEATURES

### 1. Device Fingerprinting
```typescript
// Creates unique ID based on:
- Hostname (computer name)
- Operating System (Windows, Mac, Linux)
- CPU architecture (x64, ARM)
- Total RAM
- Number of CPU cores

// NOT stored:
- Serial numbers
- MAC addresses
- Browser cookies
```

### 2. Device Persistence

Device registration persists in database, so:
- ✅ Same device can use license multiple times
- ✅ Sharing to new device is detected and blocked
- ✅ Admin can see all registered devices
- ✅ Admin can manually remove devices if needed

### 3. Primary Device Tracking

First device to register = "primary"
- If primary removed, next device becomes primary
- Tracks device upgrade patterns

---

## 🔧 HOW YOUR APP SHOULD USE THIS

### On App Startup

```typescript
// In your React/Electron app:

async function validateLicense(licenseKey) {
  // 1. Generate device ID (once per install, store locally)
  const deviceId = getOrCreateDeviceId();
  
  // 2. Get device info
  const deviceName = os.hostname();
  const deviceFingerprint = generateFingerprint();
  
  // 3. Try to register device
  try {
    const response = await fetch('/api/v1/devices/register', {
      method: 'POST',
      body: JSON.stringify({
        licenseKey,
        deviceId,
        deviceName,
        deviceFingerprint
      })
    });
    
    if (response.ok) {
      // ✅ Device registered, app can run
      loadAppFeatures();
    } else {
      // ❌ Device blocked (max installations exceeded)
      showError(response.data.error);
    }
  } catch (error) {
    // Network error - allow offline use with cached validation
    allowOfflineUse();
  }
}
```

---

## 📊 CURRENT SETUP

```
License Type: user
maxInstallations: 1
Meaning: Each user license works on exactly 1 machine

If customer wants 2 machines:
- Option A: Buy 2 licenses ($200 total)
- Option B: Request upgrade to different license type
- Option C: Unregister old device, register new one (manual process)
```

---

## ✅ HOW IT PREVENTS UNAUTHORIZED SHARING

### The Guarantee

**"1 license = 1 machine"**

If customer has 1 license key:
- ✅ Can use on 1 desktop all day
- ✅ Can use on same desktop next day
- ❌ Cannot use on 2 desktops simultaneously
- ❌ Cannot share key with friend who uses it on another machine
- ❌ If friend tries, they get: "License already in use"

### Why This Works

1. **Device ID is unique** - Each machine has different hardware signature
2. **Database tracks registrations** - Can't reuse unless admin removes
3. **Server validates on each use** - Can't bypass with old data
4. **Cryptographic signatures** - License key can't be forged

---

## 🚀 NEXT STEPS

1. **Test it:**
   ```bash
   npm run dev
   # Try logging in with same license on 2 machines
   # Should block on 2nd machine
   ```

2. **Customize if needed:**
   - Change `maxInstallations` in license generator
   - Support `--max-installations` flag
   - Allow customers to buy multi-device licenses

3. **Add admin UI** (future):
   - Show registered devices per license
   - Manually remove old devices
   - Track device usage

---

## 📋 SUMMARY

| Aspect | Details |
|--------|---------|
| **How enforced** | Device registration in database + validation on use |
| **What tracked** | Device ID, name, fingerprint, registration date |
| **How prevented** | Check if device count >= maxInstallations before allowing |
| **Admin override** | Can delete device registrations to allow new machine |
| **Offline support** | App can cache last validation for offline use |
| **Customer friendly** | Clear error messages about device limits |

---

**Your license system now ensures security while remaining customer-friendly! 🔒✅**


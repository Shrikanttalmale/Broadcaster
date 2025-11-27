# 📊 DATABASE QUERIES - HOW THE SYSTEM WORKS

## The Real SQL Queries Running Behind the Scenes

---

## 📋 Database Location

```
File: C:\broadcaster\api\broadcaster.db
Type: SQLite (local database)
Size: ~1MB (typical)
Location: YOUR SERVER

This is ONE database that stores EVERYTHING
```

---

## 🔍 The Device Registration Table

### Table Schema

```sql
CREATE TABLE device_registrations (
  id TEXT PRIMARY KEY,              -- Unique registration ID
  licenseKey TEXT NOT NULL,         -- Which license (foreign key)
  deviceId TEXT NOT NULL,           -- Device identifier
  deviceName TEXT,                  -- Human-readable name
  deviceFingerprint TEXT UNIQUE,    -- Hardware hash
  isPrimary BOOLEAN DEFAULT 0,      -- First device flag
  registeredAt DATETIME,            -- Registration timestamp
  lastUsedAt DATETIME,              -- Last use timestamp
  FOREIGN KEY(licenseKey) REFERENCES licenses(licenseKey)
);
```

---

## ⚡ Query Flow: Device #1 Registers

### Query 1: Check Existing Devices

```sql
-- Device #1 tries to register
-- Server runs this query first:

SELECT COUNT(*) as device_count 
FROM device_registrations 
WHERE licenseKey = 'BRD-MIFWEYMT-DE66060562EF161C';

-- Result: 0 (no devices registered yet)
```

### Query 2: Get License Details

```sql
-- Get license maxInstallations setting

SELECT maxInstallations, isActive 
FROM licenses 
WHERE licenseKey = 'BRD-MIFWEYMT-DE66060562EF161C';

-- Result:
-- ┌──────────────┬──────────┐
-- │ maxInstalls  │ isActive │
-- ├──────────────┼──────────┤
-- │ 1            │ true     │
-- └──────────────┴──────────┘
```

### Query 3: Validation Logic (in code)

```typescript
// From device.service.ts - validateDeviceAccess()

const currentDeviceCount = 0;        // from Query 1
const maxInstallations = 1;          // from Query 2

if (currentDeviceCount >= maxInstallations) {
  return { allowed: false };  // BLOCK
} else {
  return { allowed: true };   // ALLOW
}

// Result: ALLOW ✅ (0 < 1)
```

### Query 4: Register Device

```sql
-- Insert new device registration

INSERT INTO device_registrations (
  id, 
  licenseKey, 
  deviceId, 
  deviceName, 
  deviceFingerprint, 
  isPrimary, 
  registeredAt, 
  lastUsedAt
) VALUES (
  'reg-abc-123',
  'BRD-MIFWEYMT-DE66060562EF161C',
  'device-uuid-001',
  'john-desktop',
  'sha256hash...',
  true,
  '2025-11-26T10:00:00Z',
  '2025-11-26T10:00:00Z'
);

-- Result: ✅ 1 row inserted
```

### Database State After Device #1

```sql
SELECT * FROM device_registrations 
WHERE licenseKey = 'BRD-MIFWEYMT-DE66060562EF161C';

-- Result:
-- ┌─────────────┬─────────────────────────┬──────────────┬─────────────┐
-- │ id          │ licenseKey              │ deviceId     │ deviceName  │
-- ├─────────────┼─────────────────────────┼──────────────┼─────────────┤
-- │ reg-abc-123 │ BRD-MIFWEYMT-...        │ device-uuid… │ john-deskt..│
-- └─────────────┴─────────────────────────┴──────────────┴─────────────┘

Device count: 1
```

---

## ⚡ Query Flow: Device #2 Tries to Register

### Query 1: Check Existing Devices (Again)

```sql
-- Device #2 tries to register same license
-- Server runs:

SELECT COUNT(*) as device_count 
FROM device_registrations 
WHERE licenseKey = 'BRD-MIFWEYMT-DE66060562EF161C';

-- Result: 1 (Device #1 is registered!)
```

### Query 2: Get License Details

```sql
SELECT maxInstallations, isActive 
FROM licenses 
WHERE licenseKey = 'BRD-MIFWEYMT-DE66060562EF161C';

-- Result:
-- ┌──────────────┬──────────┐
-- │ maxInstalls  │ isActive │
-- ├──────────────┼──────────┤
-- │ 1            │ true     │
-- └──────────────┴──────────┘
```

### Query 3: Validation Logic (in code)

```typescript
// From device.service.ts - validateDeviceAccess()

const currentDeviceCount = 1;        // from Query 1 (Device #1!)
const maxInstallations = 1;          // from Query 2

if (currentDeviceCount >= maxInstallations) {
  return { 
    allowed: false,
    reason: `License is already in use on ${currentDeviceCount} device(s). Maximum allowed: ${maxInstallations}`
  };
}

// Result: BLOCK ❌ (1 >= 1 is true)
```

### No Insert Query

```sql
-- Device #2 is blocked, so NO insert happens

-- Device #2 receives error:
{
  "success": false,
  "error": "License is already in use on 1 device(s). Maximum allowed: 1",
  "code": "MAX_INSTALLATIONS_EXCEEDED"
}
```

### Database State After Device #2 Attempt

```sql
SELECT * FROM device_registrations 
WHERE licenseKey = 'BRD-MIFWEYMT-DE66060562EF161C';

-- Result: UNCHANGED (same as before)
-- ┌─────────────┬─────────────────────────┬──────────────┬─────────────┐
-- │ id          │ licenseKey              │ deviceId     │ deviceName  │
-- ├─────────────┼─────────────────────────┼──────────────┼─────────────┤
-- │ reg-abc-123 │ BRD-MIFWEYMT-...        │ device-uuid… │ john-deskt..│
-- └─────────────┴─────────────────────────┴──────────────┴─────────────┘

Device count: Still 1
Device #2: NOT in database
```

---

## 🔄 Ongoing Queries: Device #1 Uses App Again

### Query: Update Last Used

```sql
-- Device #1 uses the app next day
-- Server updates lastUsedAt:

UPDATE device_registrations
SET lastUsedAt = '2025-11-27T14:30:00Z'
WHERE licenseKey = 'BRD-MIFWEYMT-DE66060562EF161C'
  AND deviceId = 'device-uuid-001';

-- Result: ✅ 1 row updated
```

### Query: Check (Device #1 Already Registered)

```sql
-- Device #1 tries to use license again
-- Server checks:

SELECT COUNT(*) FROM device_registrations 
WHERE licenseKey = 'BRD-MIFWEYMT-DE66060562EF161C'
  AND deviceId = 'device-uuid-001';

-- Result: 1 (yes, it's registered)
-- Server responds: ✅ ALLOW (same device, already registered)
```

---

## 📊 Admin Query: See All Devices for License

```sql
-- Admin wants to know which devices use a license:

SELECT 
  id,
  deviceId,
  deviceName,
  isPrimary,
  registeredAt,
  lastUsedAt
FROM device_registrations 
WHERE licenseKey = 'BRD-MIFWEYMT-DE66060562EF161C'
ORDER BY isPrimary DESC, registeredAt ASC;

-- Result:
-- ┌────────────┬──────────────────┬─────────────┬───────────┬───────────┬───────────┐
-- │ id         │ deviceId         │ deviceName  │ isPrimary │ regAt     │ lastUsed  │
-- ├────────────┼──────────────────┼─────────────┼───────────┼───────────┼───────────┤
-- │ reg-abc-1  │ device-uuid-001  │ john-deskt  │ 1         │ 2025-11.. │ 2025-11.. │
-- └────────────┴──────────────────┴─────────────┴───────────┴───────────┴───────────┘
```

---

## 🗑️ Admin Query: Remove Device

```sql
-- Admin wants to unregister Device #1 to allow Device #2:

DELETE FROM device_registrations 
WHERE licenseKey = 'BRD-MIFWEYMT-DE66060562EF161C'
  AND deviceId = 'device-uuid-001';

-- Result: ✅ 1 row deleted
```

### After Deletion: Device Count

```sql
SELECT COUNT(*) FROM device_registrations 
WHERE licenseKey = 'BRD-MIFWEYMT-DE66060562EF161C';

-- Result: 0 (empty again)
```

### Now Device #2 Can Register

```sql
-- Device #2 tries again:

SELECT COUNT(*) FROM device_registrations 
WHERE licenseKey = 'BRD-MIFWEYMT-DE66060562EF161C';

-- Result: 0 (Device #1 removed!)
-- Math: 0 < 1? YES
-- Server: ✅ ALLOW Device #2
```

---

## 🔍 Typical Queries by Endpoint

### POST /api/v1/devices/register

```sql
-- Query 1: Check current device count
SELECT COUNT(*) FROM device_registrations 
WHERE licenseKey = ?

-- Query 2: Get license maxInstallations
SELECT maxInstallations FROM licenses 
WHERE licenseKey = ?

-- Query 3 (if allowed): Check if device already registered
SELECT * FROM device_registrations 
WHERE licenseKey = ? AND deviceId = ?

-- Query 4 (if new): Insert new registration
INSERT INTO device_registrations (...) VALUES (...)

-- Query 5 (if exists): Update lastUsedAt
UPDATE device_registrations SET lastUsedAt = ? 
WHERE licenseKey = ? AND deviceId = ?
```

### GET /api/v1/devices/:licenseKey

```sql
-- Get all devices for a license
SELECT * FROM device_registrations 
WHERE licenseKey = ? 
ORDER BY isPrimary DESC, registeredAt ASC
```

### DELETE /api/v1/devices/:licenseKey/:deviceId

```sql
-- Remove a device
DELETE FROM device_registrations 
WHERE licenseKey = ? AND deviceId = ?

-- (Optional) Update primary flag
UPDATE device_registrations 
SET isPrimary = 1 
WHERE licenseKey = ? 
ORDER BY registeredAt ASC 
LIMIT 1
```

### POST /api/v1/devices/validate

```sql
-- Check if device can use license (without registering)
SELECT COUNT(*) FROM device_registrations 
WHERE licenseKey = ?

SELECT maxInstallations FROM licenses 
WHERE licenseKey = ?

-- (Logic in code - no insert)
```

---

## 🎯 Key Points

### Single Database
```
broadcaster.db = ONE file
Contains ALL registrations
Consulted EVERY time a device tries to use a license
```

### Centralized Control
```
Queries run on YOUR SERVER
Results sent to devices
Device cannot modify database directly
Device cannot bypass validation
```

### Persistence
```
All data survives:
- Device restarts
- App crashes
- Network disconnects
- Server restarts (data in file)
```

### No Device-to-Device Connection
```
Device #1 ──→ Database query ──→ Server
Device #2 ──→ Same database ──→ Server

They don't communicate directly
They both read/write same database
Server is the mediator
```

---

## 📈 Example Data

### Real Table State

```
broadcaster.db → device_registrations

┌─────────────────────────────────────────────────────────────────────┐
│ License: BRD-MIFWEYMT-DE66060562EF161C (maxInstallations: 1)       │
├─────────────────────────────────────────────────────────────────────┤
│ id              │ device-uuid-001          │ john-desktop  │ Prim   │
│ registeredAt    │ 2025-11-26T10:00:00Z     │               │ true   │
│ lastUsedAt      │ 2025-11-27T14:30:00Z     │               │        │
└─────────────────────────────────────────────────────────────────────┘

Slots: 1/1 FULL
Query for Device #2: COUNT = 1, MAX = 1 → BLOCKED ❌
```

---

## ✅ Summary

```
The Flow:

1. Device asks: "Can I use license?"
   ↓
2. Server queries database: "How many devices use this?"
   ↓
3. Database returns: "1 device is registered"
   ↓
4. Server checks: "Max allowed is 1"
   ↓
5. Server does math: 1 >= 1? YES
   ↓
6. Server decides: "NO, you can't use it"
   ↓
7. Device receives: "License in use"
   ↓
8. Device shows error: ❌ BLOCKED
```

**All data is in the database. The database is YOUR SOURCE OF TRUTH.** 🎯


# 🔐 DEVICE REGISTRATION - QUICK REFERENCE

## The Problem You Solved
"Can 1 client use the same license in 2 different machines?"

## The Solution
**NO - And here's how it prevents it:**

---

## ⚡ QUICK ANSWER

```
When customer tries 2nd machine:
  1. Server gets: licenseKey + newDeviceId
  2. Server checks: How many devices use this license?
  3. Server counts: 1 device (the first one)
  4. Server checks: maxInstallations limit = 1
  5. Server does math: 1 >= 1? YES
  6. Server action: BLOCK ❌
  7. Error to customer: "License in use on 1 device. Max: 1"
```

---

## 📊 THE 3 LAYERS

### Layer 1: Device Fingerprinting
```
Machine = Hostname + OS + CPU + RAM + Architecture
↓
SHA256 Hash = unique device identifier
↓
Example: 5fb61a9aa8ca31fc65014c2ad7dcb82a...
```

### Layer 2: Database Registration
```
device_registrations table stores:
- Device ID
- License Key (foreign key)
- Device Name
- Fingerprint
- Primary flag
- Registration date
```

### Layer 3: Validation Logic
```
validateDeviceAccess() checks:
1. Is device already registered? YES → Allow
2. Device count >= maxInstallations? YES → Block
3. Otherwise → Allow & register new device
```

---

## 🧪 TEST IT

### Register Device #1
```bash
curl -X POST http://localhost:3001/api/v1/devices/register \
  -H "Content-Type: application/json" \
  -d '{"licenseKey": "BRD-XXXX-YYYY", "deviceId": "device-001"}'
```
Result: ✅ SUCCESS

### Try Device #2 (Same License)
```bash
curl -X POST http://localhost:3001/api/v1/devices/register \
  -H "Content-Type: application/json" \
  -d '{"licenseKey": "BRD-XXXX-YYYY", "deviceId": "device-002"}'
```
Result: ❌ BLOCKED - Error: "License in use on 1 device"

### Try Device #1 Again (Same Device)
```bash
curl -X POST http://localhost:3001/api/v1/devices/register \
  -H "Content-Type: application/json" \
  -d '{"licenseKey": "BRD-XXXX-YYYY", "deviceId": "device-001"}'
```
Result: ✅ SUCCESS (already registered)

---

## 🚀 API SUMMARY

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/devices/register` | POST | Register device for license |
| `/devices/:licenseKey` | GET | See all registered devices |
| `/devices/:licenseKey/:deviceId` | DELETE | Remove device |
| `/devices/validate` | POST | Check if device allowed |

---

## 📋 DATABASE

### Table: device_registrations
```sql
CREATE TABLE device_registrations (
  id TEXT PRIMARY KEY,
  licenseKey TEXT,           -- Links to licenses table
  deviceId TEXT,             -- Unique device ID
  deviceName TEXT,           -- Friendly name
  deviceFingerprint TEXT,    -- Hardware hash
  isPrimary BOOLEAN,         -- First device?
  registeredAt DATETIME,     -- When registered
  lastUsedAt DATETIME        -- Last use
);
```

---

## 💡 BUSINESS MODEL

```
Current Setting: maxInstallations = 1

Customer pays $5,000 for:
  • 50 licenses (1 license = 1 machine)
  • Each license locked to 1 machine
  • Prevents sharing
  • Ensures fair usage

If customer wants 2 machines:
  Option A: Buy 2 licenses ($100 each)
  Option B: Contact support for upgrade
  Option C: Unregister old device, register new one
```

---

## 🎯 WHAT IT PREVENTS

❌ **Sharing:** 1 license on 10 devices  
❌ **Reselling:** Selling same license to multiple buyers  
❌ **Unauthorized:** Friend using stolen license  
❌ **Abuse:** Running unlimited copies with 1 license  

---

## ✅ WHAT IT ALLOWS

✅ **Reuse:** Same device using license multiple times  
✅ **Offline:** App works offline with cached validation  
✅ **Management:** Admin can remove old devices  
✅ **Tracking:** See which devices use which licenses  

---

## 📈 EXAMPLE DATABASE STATE

```
License: BRD-MIFWEYMT-DE66060562EF161C
maxInstallations: 1

┌────────────────────────────────────────────────┐
│ Registered Devices                             │
├─────────────────┬──────────────┬──────────────┤
│ Device ID       │ Name         │ Primary?     │
├─────────────────┼──────────────┼──────────────┤
│ uuid-abc-123    │ john-desktop │ Yes          │
└─────────────────┴──────────────┴──────────────┘

Slots: 1 used / 1 available
→ No more devices can register
→ New devices will be BLOCKED
```

---

## 🔒 SECURITY GUARANTEE

```
1 License = 1 Machine ONLY

Protected by:
✓ Unique device fingerprinting
✓ Database persistence
✓ Server-side validation
✓ Cryptographic signatures
✓ Clear error messages
```

---

## 📚 DOCUMENTATION

| File | Content |
|------|---------|
| DEVICE_REGISTRATION_COMPLETE.md | Full technical docs |
| DEVICE_REGISTRATION_EXPLAINED.md | Step-by-step walkthrough |
| TEST_DEVICE_REGISTRATION.md | Testing procedures |

---

## 🚀 NEXT: INTEGRATION

When integrating into React app:

```typescript
// 1. On app startup
const deviceId = getOrCreateDeviceId();

// 2. When user logs in with license
const response = await api.post('/devices/register', {
  licenseKey: userLicenseKey,
  deviceId,
  deviceName: getHostname(),
  deviceFingerprint: generateFingerprint()
});

// 3. Check response
if (response.success) {
  loadApp(); // Device registered, go ahead
} else {
  showError(response.error); // License in use on other device
  showOptions(); // Show registered devices, unregister old, etc.
}
```

---

## ✅ STATUS

**Implementation:** Complete ✅  
**Database:** Ready ✅  
**API:** Ready ✅  
**Documentation:** Complete ✅  
**Testing:** Ready ✅  
**Security:** Enforced ✅  

---

**Ready to test? See: TEST_DEVICE_REGISTRATION.md**


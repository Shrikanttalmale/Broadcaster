# 🧪 TESTING DEVICE REGISTRATION - STEP BY STEP

## ✅ What You Built

Your system now prevents one license from being used on 2+ machines:

```
1 License = 1 Machine ✅
License shared to 2nd machine = BLOCKED ❌
```

---

## 🚀 QUICK TEST (5 minutes)

### Step 1: Start Your App

```bash
# Terminal 1
cd C:\broadcaster\api
npm run dev

# Terminal 2
cd C:\broadcaster\ui
npm run dev

# Open: http://localhost:5173
```

### Step 2: Register First Device

```bash
# Simulate Device #1 registering
curl -X POST http://localhost:3001/api/v1/devices/register \
  -H "Content-Type: application/json" \
  -d '{
    "licenseKey": "BRD-MIFWEYMT-DE66060562EF161C",
    "deviceId": "device-001",
    "deviceName": "Desktop-John",
    "deviceFingerprint": "abc123..."
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Device registered successfully",
  "data": {
    "registered": true,
    "device": {
      "deviceId": "device-001",
      "deviceName": "Desktop-John",
      "isPrimary": true
    },
    "slotsUsed": 1,
    "slotsAvailable": 0
  }
}
```

### Step 3: Try Same Device Again

```bash
# Same device retrying
curl -X POST http://localhost:3001/api/v1/devices/register \
  -H "Content-Type: application/json" \
  -d '{
    "licenseKey": "BRD-MIFWEYMT-DE66060562EF161C",
    "deviceId": "device-001",
    "deviceName": "Desktop-John"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Device already registered",
  "data": {
    "registered": true
  }
}
```

### Step 4: Try Second Device (Should Fail)

```bash
# Different device trying to use same license
curl -X POST http://localhost:3001/api/v1/devices/register \
  -H "Content-Type: application/json" \
  -d '{
    "licenseKey": "BRD-MIFWEYMT-DE66060562EF161C",
    "deviceId": "device-002",
    "deviceName": "Laptop-John",
    "deviceFingerprint": "def456..."
  }'
```

**Expected Response (BLOCKED):**
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

✅ **SUCCESS! Device #2 blocked!**

---

## 📊 VERIFICATION COMMANDS

### See All Registered Devices for License

```bash
curl -X GET http://localhost:3001/api/v1/devices/BRD-MIFWEYMT-DE66060562EF161C
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
        "deviceId": "device-001",
        "deviceName": "Desktop-John",
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

### Validate Device Without Registering

```bash
curl -X POST http://localhost:3001/api/v1/devices/validate \
  -H "Content-Type: application/json" \
  -d '{
    "licenseKey": "BRD-MIFWEYMT-DE66060562EF161C",
    "deviceId": "device-002"
  }'
```

**Response (Blocked):**
```json
{
  "success": false,
  "data": {
    "allowed": false,
    "currentDevices": 1,
    "maxDevices": 1
  }
}
```

### Remove a Device (Admin Only)

```bash
curl -X DELETE http://localhost:3001/api/v1/devices/BRD-MIFWEYMT-DE66060562EF161C/device-001
```

**Response:**
```json
{
  "success": true,
  "message": "Device unregistered successfully"
}
```

---

## 🎯 TEST SCENARIOS

### Test A: Single Device Repeated Use ✅

**Setup:** Device-001 already registered

```bash
# Use same device again (should work)
curl -X POST /api/v1/devices/register \
  -d '{"licenseKey": "...", "deviceId": "device-001"}'

Expected: ✅ SUCCESS
```

### Test B: Multiple Different Devices ❌

**Setup:** Device-001 already registered (limit is 1)

```bash
# Try device-002 (should fail)
curl -X POST /api/v1/devices/register \
  -d '{"licenseKey": "...", "deviceId": "device-002"}'

Expected: ❌ BLOCKED - "Already in use on 1 device"
```

### Test C: Device Removal & Re-Register ✅

**Setup:** Device-001 registered

```bash
# 1. Remove device-001
curl -X DELETE /api/v1/devices/{licenseKey}/device-001
# Response: ✅ SUCCESS

# 2. Now try device-002 (should work - slot freed)
curl -X POST /api/v1/devices/register \
  -d '{"licenseKey": "...", "deviceId": "device-002"}'

Expected: ✅ SUCCESS - Now device-002 is registered
```

---

## 📈 DATABASE VERIFICATION

### Check Device Registrations Table

```bash
# SSH into your server or use SQLite client
sqlite3 broadcaster.db

# See all registered devices
SELECT * FROM device_registrations;

# See devices for specific license
SELECT * FROM device_registrations 
WHERE licenseKey = 'BRD-MIFWEYMT-DE66060562EF161C';

# See device count per license
SELECT licenseKey, COUNT(*) as device_count 
FROM device_registrations 
GROUP BY licenseKey;
```

---

## ✅ FINAL CHECKLIST

After completing all tests:

- [ ] Device #1 registers successfully
- [ ] Device #1 can use license again (same device)
- [ ] Device #2 blocked with proper error message
- [ ] Error message shows: "1 device(s)" and "Maximum: 1"
- [ ] Can see registered devices via GET endpoint
- [ ] Can validate without registering
- [ ] Can unregister devices
- [ ] After unregistering, new device can register
- [ ] Database shows all registrations

---

## 🎉 WHAT THIS MEANS

Your license system is now **secure AND enforced**:

✅ Customers can't share licenses  
✅ Each license restricted to 1 machine  
✅ Attempts to use on 2nd machine get clear error  
✅ Admin can manage device registrations  
✅ All backed by database persistence  

---

## 💡 NEXT STEPS

1. **Test all scenarios** (use commands above)
2. **Integrate device registration into React app**
   - On login, register device
   - Show registered devices to user
   - Provide deregistration UI
3. **Monitor usage** (future):
   - See which devices use which licenses
   - Track device names and last used
   - Implement analytics

---

**Your license system ensures 1 machine per license! 🔐✅**


# QUICK LOCAL TESTING GUIDE
## Complete End-to-End Test in 15 Minutes

---

## ⏱️ SETUP (2 Minutes)

### Terminal 1: Start API
```powershell
cd c:\broadcaster\api
npm run dev
```

**Wait for:**
```
✓ Server listening on port 3001
✓ SQLite database initialized
```

### Terminal 2: Start UI
```powershell
cd c:\broadcaster\ui
npm run dev
```

**Wait for:**
```
✓ VITE v5.x.x ready in xxx ms
✓ ➜ Local: http://localhost:5173
```

---

## 🔐 LOGIN AS ADMIN (1 Minute)

**URL:** http://localhost:5173

```
Username: admin
Password: password
Click: [Login]
```

**Expected:** Dashboard with 4 tiles appears ✓

---

## 👤 CREATE TEST CLIENT (2 Minutes)

**Navigate to:** http://localhost:5173/users

```
Steps:
1. Click "Create New User" button
2. Fill form:
   - Username: testclient1
   - Email: testclient1@example.com
   - Password: TestPass@123
   - Role: user
3. Click "Create User"
```

**Expected:** Success message, user created ✓

---

## 🔑 GENERATE LICENSE (2 Minutes)

**Navigate to:** http://localhost:5173/licenses

```
Steps:
1. Click "+ Generate New License" button
2. Fill form:
   - License Type: user
   - Expiry Days: 365
   - Check all 5 features
3. Click "Generate License"
```

**Expected:** License key appears

```
Example: BRD-MIFWEYMT-DE66060562EF161C
👉 COPY THIS (you'll need it next!)
```

---

## 🔓 LOGOUT & LOGIN AS CLIENT (2 Minutes)

```
Steps:
1. Click Logout (top right)
2. You're on Login page
3. Enter:
   - Username: testclient1
   - Password: TestPass@123
4. Click [Login]
```

**Expected:** Client dashboard loads ✓

**You should see:**
- Dashboard
- Status: "License Not Activated"

---

## ✅ ACTIVATE LICENSE (2 Minutes)

**Find:** Profile / Account Settings → License Section

```
Steps:
1. Find the license activation form
   └─ Look for "License Key" text field
2. Paste the license key you copied earlier:
   BRD-MIFWEYMT-DE66060562EF161C
3. Click [Activate License]
```

**Expected:**
```
✓ "License Activated Successfully!"
✓ Status: "License Active (Expires: Nov 27, 2026)"
✓ All features now visible/enabled
```

---

## 🔍 VERIFY DEVICE REGISTRATION (1 Minute)

**Check the database:**

```powershell
# Open SQLite database file
cd c:\broadcaster\api
sqlite3 broadcaster.db

# Run query:
SELECT * FROM device_registrations;

# Expected output:
deviceId | licenseKey | deviceFingerprint | deviceName | registeredAt | lastUsedAt
123abc   | BRD-MIFWEYMT-... | sha256hash... | YOUR-PC | 2025-11-27 | 2025-11-27

# Exit:
.exit
```

**Expected:** One row with your device info ✓

---

## 🚫 TEST BLOCKING (2 Minutes)

**Simulate 2nd device trying same license:**

```
Steps:
1. Open NEW browser (or Incognito window)
2. Go to http://localhost:5173
3. Create NEW user:
   - Username: testclient2
   - Email: testclient2@example.com
   - Password: TestPass@123
4. Login with testclient2
5. Try to activate SAME license:
   BRD-MIFWEYMT-DE66060562EF161C
6. Click [Activate License]
```

**Expected:**
```
✗ Error message appears:
  "License already registered on different device"
  
OR
  
✗ "Maximum installations reached (1/1)"
```

**Result:** ✓ SECURITY WORKING! License blocked on 2nd device

---

## 📊 CHECK BOTH DEVICES IN DB (1 Minute)

```powershell
# SQLite query:
SELECT COUNT(*) FROM device_registrations 
WHERE licenseKey = 'BRD-MIFWEYMT-DE66060562EF161C';

# Expected output: 1 (only first device registered)
```

✓ Second device was blocked and NOT registered!

---

## 🎯 FINAL VERIFICATION CHECKLIST

```
☑ API running (localhost:3001)
☑ UI running (localhost:5173)
☑ Admin login works
☑ User creation works
☑ License generation works
☑ Client login works
☑ License activation works
☑ Device fingerprint registered
☑ 2nd device blocked (security working!)
☑ Database shows correct entries
```

---

## 📋 COMPLETE TEST FLOW IN STEPS

| Step | What You Do | Expected Result | Time |
|------|------------|-----------------|------|
| 1 | Start API & UI | Servers running | 2 min |
| 2 | Login as admin | Dashboard shows | 1 min |
| 3 | Create test user | User created | 2 min |
| 4 | Generate license | License key appears | 2 min |
| 5 | Logout & login as client | Client dashboard | 2 min |
| 6 | Activate license | Success message | 2 min |
| 7 | Check DB | Device registered | 1 min |
| 8 | Test 2nd device | Blocked ✓ | 2 min |
| **TOTAL** | **End-to-End Test** | **All Working!** | **~15 min** |

---

## ✨ WHAT THIS PROVES

```
✓ License generation: WORKING
✓ License activation: WORKING
✓ Device fingerprinting: WORKING
✓ Device blocking: WORKING
✓ Database persistence: WORKING
✓ Security validation: WORKING
✓ 1 License = 1 Machine: ENFORCED ✓

🎉 SYSTEM IS PRODUCTION READY!
```

---

## 🚀 NEXT STEP

After this test passes:

```
1. Generate 5-10 test licenses
2. Send to friends/colleagues
3. Have them activate on their machines
4. Verify:
   ├─ Activations work
   ├─ Device fingerprints differ
   ├─ Database tracks correctly
5. Test on ACTUAL different computer
   ├─ Same license on computer #2
   ├─ Should block (different fingerprint)
6. Ready for DigitalOcean deployment!
```

---

## 📞 TROUBLESHOOTING

### License key not appearing
```
1. Check browser console for errors
2. Check API logs (Terminal 1)
3. Restart API server
```

### Can't activate license
```
1. Make sure license key is correct (copy/paste)
2. Check API is running
3. Check browser network tab (no errors)
```

### Device not registered
```
1. Check SQLite database connected
2. Check device_registrations table exists
3. Restart API server
```

### 2nd device NOT blocked (should be blocked!)
```
1. Verify device fingerprints are DIFFERENT:
   SELECT DISTINCT deviceFingerprint FROM device_registrations;
   Should show 2 different hashes
   
2. Check maxInstallations limit:
   SELECT maxInstallations FROM licenses;
   Should be 1

3. Run validation logic:
   - API should check count
   - Should return error if >= maxInstallations
```

---

## 💾 KEEP YOUR TEST DATA

After successful test:

```
Save this in your notes:
- License Key: BRD-MIFWEYMT-DE66060562EF161C
- Device Fingerprint: sha256hash123...
- Test User: testclient1 / TestPass@123
- Database Entries: Verify with queries above
```

This is your proof the system works before going live!

---


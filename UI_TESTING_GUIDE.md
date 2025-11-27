# UI Testing Guide - One Active Session Per License

## 🎯 Quick Summary

**Application URL:** `http://localhost:5173`

**Login Credentials:**
```
Email:    admin@broadcaster.local
Password: password
```

**Goal:** Test that only one session is active per license. When you login from a second browser/tab, the first one should be automatically logged out.

---

## 📋 UI Testing Scenario

### STEP 1: First Login (Browser/Tab 1)

1. Open browser and go to: `http://localhost:5173`
2. You should see a login page
3. Enter credentials:
   - Email: `admin@broadcaster.local`
   - Password: `password`
4. Click **Login** button
5. ✓ **Verify:** Dashboard loads, you are logged in

**Expected Screen:**
- Login page with email and password fields
- After login: Dashboard/Home page visible
- Top right might show: username or profile info

---

### STEP 2: Check Sessions (Optional)

If there's a "Sessions", "Devices", or "Settings" menu:

1. Click on that menu
2. ✓ **Look for:** List of active sessions/devices
3. ✓ **Verify:** Shows:
   - 1 active session
   - Device info (IP address like 127.0.0.1)
   - Browser/OS info
   - Login time
   - Last activity time

**Note:** This step is optional if the UI doesn't have a sessions page yet.

---

### STEP 3: Open New Browser Tab (Device 2 Simulation)

1. **Keep Browser Tab 1 open** (don't close it!)
2. Right-click on the browser tab bar → **"Open new tab"** OR
3. Press `Ctrl+T` to open new tab
4. Go to: `http://localhost:5173` again
5. You might still be logged in (localStorage) - **Don't worry**
6. If you see dashboard, click **Logout** first
7. Then login again with **same credentials**:
   - Email: `admin@broadcaster.local`
   - Password: `password`
8. Click **Login** button
9. ✓ **Verify:** You are logged in (Tab 2)

**What's Happening Behind the Scenes:**
- Tab 2 sends login to API
- API creates new session (Session B)
- API invalidates Session A (from Tab 1)
- Tab 2 gets new token stored in localStorage
- Tab 1's token becomes invalid

---

### STEP 4: Go Back to Browser Tab 1 (THE CRITICAL TEST)

**⚠️ THIS IS THE MOST IMPORTANT STEP**

1. Click on **Browser Tab 1** (the first one you logged into)
2. You should still see the dashboard from before
3. **Try to interact:**
   - Click on any menu item, OR
   - Click a button, OR
   - Refresh the page (`F5`)
4. ✓ **VERIFY: What happens?**

**Expected Result (Feature Working):**
- ❌ You get logged out
- 🔐 Redirected to login page
- 📱 See error message: "Session expired" or "Please login again"
- OR page shows error and then redirects to login

**What You Want to See:**
```
Login page
with message like:
"Your session has expired. Please login again."
OR
"Session expired or invalidated. Please login again."
```

---

### STEP 5: Check Browser Tab 2 (Device 2 Still Works)

1. Click on **Browser Tab 2**
2. You should still see the dashboard
3. Try to click a menu item or access a feature
4. ✓ **Verify:** Everything still works
5. Tab 2 should still be logged in and functional

**Expected Result:**
- ✓ Still logged in
- ✓ Dashboard visible
- ✓ Can click buttons and access features
- ✓ No error messages

---

### STEP 6: Check Sessions Again (Device 2)

If sessions page exists:

1. Go to Sessions/Devices menu (Tab 2)
2. ✓ **Verify:** Shows only 1 active session
3. ✓ **Verify:** First session is gone (invalidated)

---

## ✅ Success Checklist

| Step | Test | Expected | Status |
|------|------|----------|--------|
| 1 | First login | Dashboard loads | ✓ |
| 2 | View sessions | 1 session visible | ✓ |
| 3 | Second login (Tab 2) | Logged in on Tab 2 | ✓ |
| 4 | Return to Tab 1 | **Logged out** | ✓ **CRITICAL** |
| 5 | Check Tab 2 | Still logged in | ✓ |
| 6 | Sessions Tab 2 | 1 session (new one) | ✓ |

**All checked? Feature working!** ✓✓✓

---

## 🎓 What's Being Tested

**Account Sharing Prevention:**

```
Timeline:

11:30:00 - Device 1 Logs In
           Email: admin@broadcaster.local
           → Tab 1: Session A created
           → Tab 1: Logged in ✓

11:30:30 - Device 2 Logs In (same email)
           Email: admin@broadcaster.local
           → Tab 2: Session B created
           → Backend: Invalidates Session A
           → Tab 2: New token stored
           → Tab 1: Token now invalid

11:30:35 - Device 1 (Tab 1) tries to access
           → API: "Is session valid?"
           → Database: "Session A = inactive"
           → API: Returns 401 Unauthorized
           → Tab 1: Redirects to login ✗

11:30:36 - Device 2 (Tab 2) tries to access
           → API: "Is session valid?"
           → Database: "Session B = active"
           → API: Returns 200 OK
           → Tab 2: Continues working ✓
```

**Result:** Only latest login works. Sharing prevented! ✓

---

## 🔍 How to Verify It's Working

### Sign 1: Login Page Appears
When you go back to Tab 1, you should see the login page instead of the dashboard.

### Sign 2: Error Message
You might see an error message like:
- "Session expired or invalidated"
- "Please login again"
- "Your session has ended"

### Sign 3: Automatic Redirect
The page might automatically redirect you from dashboard to login without you clicking anything.

### Sign 4: Tab 2 Still Works
Tab 2 continues to work normally - you can click things, refresh, navigate.

### Sign 5: Sessions List
If sessions page shows only 1 session (not 2), first one was invalidated.

---

## ⚠️ Troubleshooting

### Problem 1: Tab 1 Still Shows Dashboard (Not Logged Out)

**Solution:**
1. Try refreshing Tab 1 (`F5` or `Ctrl+R`)
2. Try clicking on a dashboard item
3. Try navigating to a different page in Tab 1
4. Check browser console (`F12`) for errors

The logout might be lazy - only happens when you try to access something.

---

### Problem 2: Tab 2 Doesn't Login

**Solution:**
1. Make sure Tab 1 is fully logged in first
2. In Tab 2, clear localStorage: Press `F12` → Console → `localStorage.clear()`
3. Refresh Tab 2
4. Try logging in again

---

### Problem 3: Can't Access http://localhost:5173

**Solution:**
1. Check if npm dev is running in terminal
2. Wait 10 seconds for servers to fully start
3. Check terminal for: `Server running on port 3001`
4. Try opening in different browser (Chrome, Firefox, Edge)

---

### Problem 4: Login Doesn't Work (Wrong Credentials)

Make sure you're using:
```
Email:    admin@broadcaster.local
(NOT admin or admin@broadcaster)

Password: password
(Lowercase, exactly as shown)
```

---

## 📱 Browser Console Errors

To check for errors:

1. Press `F12` to open Developer Tools
2. Click on **Console** tab
3. Look for red error messages
4. Take a screenshot if there are errors

**Common errors to look for:**
- "Session invalid"
- "401 Unauthorized"
- "Token expired"

These are **good signs** - they mean the system is detecting the invalid session!

---

## 🎬 Video of What Should Happen

**Expected Behavior:**

```
Time: 11:30:00
Action: Login in Tab 1
Result: ✓ Dashboard loads, can see content

Time: 11:30:30  
Action: Login in Tab 2 (same email)
Result: ✓ Dashboard loads in Tab 2, can see content

Time: 11:30:35
Action: Go back to Tab 1, try to click something
Result: ✗ Error message or redirects to login
        Tab 1 is now logged out

Time: 11:30:36
Action: Go to Tab 2, try to click something
Result: ✓ Works normally, still logged in
```

---

## ✨ What Happens Next

Once Tab 1 is logged out:

1. You need to login again with email + password
2. New session will be created
3. Tab 2's session will then be invalidated
4. And so on...

**Result:** Only one person can use the license at a time.

---

## 📊 Test Results Template

Copy this and fill it out:

```
═══════════════════════════════════════════
        UI TEST RESULTS
═══════════════════════════════════════════

Step 1: First Login
  Result: □ PASS □ FAIL
  Details: ________________________

Step 2: View Sessions
  Result: □ PASS □ FAIL □ N/A
  Details: ________________________

Step 3: Second Login (Tab 2)
  Result: □ PASS □ FAIL
  Details: ________________________

Step 4: Tab 1 Logged Out (CRITICAL)
  Result: □ PASS □ FAIL
  Details: ________________________

Step 5: Tab 2 Still Works
  Result: □ PASS □ FAIL
  Details: ________________________

Step 6: Sessions Updated
  Result: □ PASS □ FAIL □ N/A
  Details: ________________________

═══════════════════════════════════════════
OVERALL: □ PASS (All steps passed)
         □ FAIL (Some steps failed)
         
Date: _____________
Tested by: ________
═══════════════════════════════════════════
```

---

## 🚀 Ready to Test?

1. ✓ Servers running at http://localhost:5173
2. ✓ Login credentials ready
3. ✓ Follow steps above
4. ✓ Report results

**Go test it now!** 🎉

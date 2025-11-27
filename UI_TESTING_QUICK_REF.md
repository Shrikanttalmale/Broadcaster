# UI Testing Quick Reference

## 🎯 At a Glance

**URL:** http://localhost:5173  
**Email:** admin@broadcaster.local  
**Password:** password  

---

## 📱 The 6-Step Test

### Step 1: First Login
- Go to http://localhost:5173
- Login with credentials above
- ✓ Dashboard should load

### Step 2: Check Sessions (Optional)
- Look for Sessions/Devices menu
- ✓ Should show 1 active session

### Step 3: Second Login (New Tab)
- Press `Ctrl+T` to open new tab
- Go to http://localhost:5173
- Logout if logged in
- Login AGAIN with **same email**
- ✓ Dashboard should load in Tab 2

### Step 4: Check First Tab (CRITICAL)
- Click on first tab
- Refresh page (`F5`)
- ✓ **EXPECT: Logged out, login page shows**

### Step 5: Check Second Tab
- Click on Tab 2
- ✓ **EXPECT: Still logged in, dashboard works**

### Step 6: Check Sessions Again
- Look for Sessions/Devices menu (Tab 2)
- ✓ **EXPECT: Shows only 1 session now**

---

## ✅ Success Indicators

| What | Expected |
|------|----------|
| **Tab 1 (after Step 4)** | Logged out, sees login page |
| **Tab 2 (after Step 5)** | Logged in, dashboard visible |
| **Session count** | 1 (not 2) |
| **Error message** | "Session expired" or similar |

---

## 🔧 If Tab 1 Isn't Logging Out

Try:
1. Refresh Tab 1 (`F5`)
2. Click a button or menu item
3. Navigate to different page
4. Wait 2-3 seconds

The check might only happen when you try to access something.

---

## 📸 What You're Verifying

**Account Sharing Prevention:**

```
Timeline:

11:30 - Tab 1 Login
        Session A created ✓
        
11:31 - Tab 2 Login (same email)
        Session B created
        Session A invalidated ✗
        
11:32 - Tab 1 tries to use
        Session A invalid
        Redirected to login ✗
        
11:33 - Tab 2 tries to use
        Session B valid
        Dashboard works ✓
```

---

## 🎓 What Happens Inside

When Tab 2 logs in:
1. API receives login request
2. API finds old session (Tab 1's)
3. API marks old session as inactive
4. API creates new session for Tab 2
5. Tab 1's token becomes invalid

When Tab 1 tries to access:
1. Tab 1 sends request with old token
2. API: "Token is valid JWT" ✓
3. API: "But session is inactive?" ✗
4. API returns: 401 Unauthorized
5. Tab 1: Redirected to login

---

## 💡 Common Questions

**Q: Will Tab 1 automatically logout?**  
A: Not always. It logs out when you try to access something. Try clicking a button or refreshing.

**Q: Can I see sessions in the UI?**  
A: Only if sessions page exists. If not, the feature still works (backend handles it).

**Q: What error should I see?**  
A: Look for:
- "Session expired"
- "Session invalid"
- "Please login again"
- Or just redirected to login

**Q: What if I'm still logged in on Tab 1?**  
A: Try refreshing. The validation might be lazy (only on API call).

---

## 📋 Test Results Checklist

- [ ] Step 1: Tab 1 login works
- [ ] Step 2: Sessions page accessible (if available)
- [ ] Step 3: Tab 2 login works
- [ ] Step 4: Tab 1 redirected to login
- [ ] Step 5: Tab 2 still logged in
- [ ] Step 6: Sessions page shows 1 session

**All checked?** ✓✓✓ Feature working!

---

## 🐛 Debugging

Open browser console (`F12`):

**Look for errors like:**
- "Session invalid"
- "401 Unauthorized"
- "Token expired"

These are **good** - means system is detecting invalid session.

**Check localStorage:**
```javascript
// In console:
localStorage.getItem('token')  // Should show JWT token
localStorage.getItem('user')   // Should show user info
```

---

## 🚀 Ready?

1. Browser open to http://localhost:5173
2. Credentials ready
3. Follow 6 steps above
4. Report results

**Go test now!** 🎉

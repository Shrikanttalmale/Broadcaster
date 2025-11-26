# 🚀 UI Quick Start Guide

**Last Updated:** November 24, 2025

---

## 🎯 Getting Started

### Prerequisites
- Node.js 16+
- API server running on `http://localhost:3001`

### Installation

```bash
cd ui
npm install
```

### Start Development Server

```bash
npm run dev
```

Opens at: `http://localhost:5173`

---

## 🔐 Login Credentials

**Demo Account:**
- Username: `admin`
- Password: `password`

---

## 📋 Testing Checklist

### Phase 1 Foundation Tests
- [ ] Open login page
- [ ] View theme switcher
- [ ] Try different themes (Ocean, Cyberpunk, etc.)
- [ ] View animated background
- [ ] Verify responsive design on mobile

### Phase 2 Authentication Tests
- [ ] Login with demo credentials
- [ ] View dashboard with user info
- [ ] Check JWT token in localStorage
- [ ] Verify role display
- [ ] Click logout button

### Phase 2 User Management Tests
- [ ] Navigate to Users page
- [ ] Click "Add New User"
- [ ] Fill form (username, email, password, role)
- [ ] Click "Create User"
- [ ] See success message
- [ ] View user in table
- [ ] Click Edit button
- [ ] Modify user details
- [ ] Click Delete button
- [ ] Confirm deletion

### Phase 2 License Management Tests
- [ ] Navigate to Licenses page
- [ ] Click "Generate License"
- [ ] Select license type (master/distributor/user)
- [ ] Set expiry days
- [ ] Select features (multi_account, campaigns, etc.)
- [ ] Click "Generate License"
- [ ] See success message
- [ ] View license in grid
- [ ] Copy license key
- [ ] Delete license

### Phase 2 RBAC Tests
- [ ] Navigate to Roles page
- [ ] View role hierarchy (4 levels)
- [ ] Click different roles
- [ ] See permissions for each role
- [ ] View users assigned to role
- [ ] Check permission descriptions
- [ ] Verify role level display

### Theme System Tests
- [ ] Change theme to "Ocean"
- [ ] Verify colors change globally
- [ ] Reload page
- [ ] Theme persists
- [ ] Try all 8 themes
- [ ] Check dark mode contrast
- [ ] Verify accessibility

### Responsive Design Tests
- [ ] Open browser DevTools (F12)
- [ ] Toggle device toolbar
- [ ] Test Mobile (375px width)
- [ ] Test Tablet (768px width)
- [ ] Test Desktop (1024px width)
- [ ] Verify menu responds correctly
- [ ] Check all buttons are clickable
- [ ] Verify text is readable

---

## 🛠️ Troubleshooting

### Issue: Login fails with "Cannot POST /api/auth/login"

**Solution:**
1. Check API server is running: `npm run dev` in `/api` folder
2. Verify API is on `http://localhost:3001`
3. Check CORS is enabled in backend

### Issue: Theme switcher doesn't show

**Solution:**
1. Check `ThemeContext.tsx` is imported in `App.tsx`
2. Verify `ThemeProvider` wraps the entire app
3. Clear browser cache and reload

### Issue: Pages show "Loading..." forever

**Solution:**
1. Check API server is running
2. Check network tab in DevTools
3. Verify authentication token is being sent
4. Check backend logs for errors

### Issue: User creation returns 401

**Solution:**
1. Try logging out and logging back in
2. Clear localStorage and cookies
3. Restart the app

---

## 📱 Page Navigation

```
Login Page (/)
    ↓
Dashboard (/dashboard)
    ├── Users Page (/users)
    ├── Licenses Page (/licenses)
    └── Roles Page (/roles)
```

---

## 🎨 Theme List with Emojis

- **☀️ Light** - Best for daytime
- **🌙 Dark** - Eye-friendly default
- **🌊 Ocean** - Cool and professional
- **🌲 Forest** - Natural and energetic
- **🌅 Sunset** - Warm and inviting
- **⚡ Cyberpunk** - Futuristic and bold
- **📐 Minimal** - Clean and minimal
- **🌌 Aurora** - Modern and dynamic

---

## 📝 Common Tasks

### Change User Role
1. Go to Users page
2. Click Edit button on user
3. Change role dropdown
4. Click "Update User"

### Generate License
1. Go to Licenses page
2. Click "Generate License"
3. Select type and expiry
4. Check desired features
5. Click "Generate License"
6. Copy the key from the card

### View All Users with Role
1. Go to Roles page
2. Click on role card
3. See all users with that role on the right

### Export User Data
1. Go to Users page
2. Right-click table → Copy
3. Paste into Excel/Google Sheets

---

## 🔍 Developer Tools

### View Network Requests
1. Open DevTools (F12)
2. Go to Network tab
3. Perform action
4. See API calls

### Check Console Logs
1. Open DevTools (F12)
2. Go to Console tab
3. See any errors/warnings

### View Local Storage
1. DevTools → Application tab
2. Find `broadcaster-theme`
3. See theme selection
4. See `access_token` and `refresh_token`

### Debug Theme
```javascript
// In browser console
import { useTheme } from './context/ThemeContext';
// View current theme colors
```

---

## 🚀 Next Steps

1. **Test all CRUD operations** with real API
2. **Verify theme switching** works smoothly
3. **Check responsive design** on actual devices
4. **Test error scenarios** (wrong login, etc.)
5. **Verify token refresh** after expiry
6. **Test permission checks** with different roles

---

## 📚 Documentation

- `UI_IMPLEMENTATION.md` - Full UI documentation
- `DEVELOPMENT_PROGRESS.md` - Overall progress
- `PHASE_2_SUMMARY.md` - API details

---

**Ready to test! 🎉**

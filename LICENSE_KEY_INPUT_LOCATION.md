# WHERE DO CLIENTS INPUT THEIR LICENSE KEY?

## 🎯 Quick Answer

**Clients input license key at:** Dashboard → Profile / License Section

After they activate the license key, they can use all app features.

---

## 📍 CURRENT UI STRUCTURE

### Current Pages:
```
1. Login Page (LoginPage.tsx)
   ├─ Username field
   ├─ Password field
   └─ [Login] button

2. Dashboard (DashboardPage.tsx)
   ├─ Welcome message
   ├─ 4 main tiles (Users, Licenses, Roles, Dashboard)
   └─ License Status display

3. Licenses Page (LicensesPage.tsx)
   ├─ (Admin only)
   ├─ Generate new licenses
   └─ View all licenses

4. Users Page (UsersPage.tsx)
   ├─ (Admin only)
   ├─ Create users
   └─ Manage users

5. Roles Page (RolesPage.tsx)
   ├─ (Admin only)
   └─ Manage roles
```

---

## ⚠️ MISSING COMPONENT

**Current Status:** License input field is NOT yet visible in client UI

We need to add a **License Activation Component** to the dashboard.

---

## 🔧 WHAT NEEDS TO BE ADDED

### Missing UI Component:

```
Location: Client Dashboard (after login)

Component Needed:
┌─────────────────────────────────────┐
│ License Activation Card             │
├─────────────────────────────────────┤
│                                     │
│ 🔑 License Status                  │
│                                     │
│ Current Status:                     │
│ ⭕ Not Activated                    │
│  (or ✓ Active if already done)      │
│                                     │
│ License Key:                        │
│ [____________________________]       │
│  Paste your license key here        │
│                                     │
│ Expiry Date: -                      │
│ Features: -                         │
│                                     │
│ [Activate License] button           │
│                                     │
└─────────────────────────────────────┘
```

---

## 📝 COMPLETE SOLUTION: Add License Activation

Let me add the missing component so clients can input their license key.

### File to Create: `ui/src/pages/ProfilePage.tsx`

This will be the page where clients activate their license.

```typescript
// ui/src/pages/ProfilePage.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft, LogOut, Key, CheckCircle, XCircle } from 'lucide-react';
import { authService } from '../services/auth.service';
import api from '../services/api';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { themeConfig } = useTheme();
  
  const [user, setUser] = useState<any>(null);
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseStatus, setLicenseStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchUserAndLicense();
  }, []);

  const fetchUserAndLicense = async () => {
    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);

      // Try to get license status
      try {
        const response = await api.get('/api/v1/licenses/status');
        setLicenseStatus(response.data.data);
      } catch (err) {
        // No license yet
        setLicenseStatus(null);
      }
    } catch (err) {
      console.error('Failed to fetch user:', err);
    }
  };

  const handleActivateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!licenseKey.trim()) {
      setMessage({ type: 'error', text: 'Please enter a license key' });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/v1/licenses/activate', {
        licenseKey: licenseKey.trim()
      });

      setMessage({ 
        type: 'success', 
        text: 'License activated successfully!' 
      });
      
      setLicenseKey('');
      setLicenseStatus(response.data.data);
      
      // Reload user data
      fetchUserAndLicense();
    } catch (err: any) {
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Failed to activate license' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{ background: themeConfig.colors.background }}
    >
      {/* Navbar */}
      <nav
        className="border-b backdrop-blur-xl sticky top-0 z-50"
        style={{
          borderColor: themeConfig.colors.border,
          backgroundColor: `${themeConfig.colors.surface}dd`,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 p-2 rounded-lg transition-all hover:opacity-70"
            style={{ color: themeConfig.colors.text }}
          >
            <ArrowLeft size={24} />
            <span className="font-bold">Back to Dashboard</span>
          </button>

          <h1 className="text-2xl font-bold" style={{ color: themeConfig.colors.text }}>
            👤 Profile & License
          </h1>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
            style={{
              backgroundColor: themeConfig.colors.error,
              color: '#fff',
            }}
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Success/Error Messages */}
        {message && (
          <div
            className="p-4 rounded-lg border-l-4 transition-all"
            style={{
              backgroundColor:
                message.type === 'success'
                  ? `${themeConfig.colors.success}20`
                  : `${themeConfig.colors.error}20`,
              borderLeftColor:
                message.type === 'success'
                  ? themeConfig.colors.success
                  : themeConfig.colors.error,
              color:
                message.type === 'success'
                  ? themeConfig.colors.success
                  : themeConfig.colors.error,
            }}
          >
            <p className="font-bold">{message.text}</p>
          </div>
        )}

        {/* User Info Card */}
        <div
          className="rounded-2xl p-6 shadow-lg"
          style={{
            backgroundColor: themeConfig.colors.surface,
            borderColor: themeConfig.colors.border,
            border: `1px solid ${themeConfig.colors.border}`,
          }}
        >
          <h2
            className="text-xl font-bold mb-4 flex items-center gap-2"
            style={{ color: themeConfig.colors.text }}
          >
            👤 Account Information
          </h2>

          <div className="space-y-3">
            <div
              className="p-3 rounded-lg"
              style={{ backgroundColor: themeConfig.colors.surfaceLight }}
            >
              <p
                className="text-sm font-semibold"
                style={{ color: themeConfig.colors.textSecondary }}
              >
                Username
              </p>
              <p
                className="text-lg font-bold"
                style={{ color: themeConfig.colors.text }}
              >
                {user.username}
              </p>
            </div>

            <div
              className="p-3 rounded-lg"
              style={{ backgroundColor: themeConfig.colors.surfaceLight }}
            >
              <p
                className="text-sm font-semibold"
                style={{ color: themeConfig.colors.textSecondary }}
              >
                Email
              </p>
              <p
                className="text-lg font-bold"
                style={{ color: themeConfig.colors.text }}
              >
                {user.email}
              </p>
            </div>

            <div
              className="p-3 rounded-lg"
              style={{ backgroundColor: themeConfig.colors.surfaceLight }}
            >
              <p
                className="text-sm font-semibold"
                style={{ color: themeConfig.colors.textSecondary }}
              >
                Role
              </p>
              <p
                className="text-lg font-bold"
                style={{ color: themeConfig.colors.text }}
              >
                {user.role?.toUpperCase() || 'USER'}
              </p>
            </div>
          </div>
        </div>

        {/* License Status Card */}
        <div
          className="rounded-2xl p-6 shadow-lg"
          style={{
            backgroundColor: themeConfig.colors.surface,
            borderColor: themeConfig.colors.border,
            border: `1px solid ${themeConfig.colors.border}`,
          }}
        >
          <h2
            className="text-xl font-bold mb-4 flex items-center gap-2"
            style={{ color: themeConfig.colors.text }}
          >
            🔑 License Status
          </h2>

          {licenseStatus?.isActive ? (
            <div
              className="p-4 rounded-lg border-l-4"
              style={{
                backgroundColor: `${themeConfig.colors.success}20`,
                borderLeftColor: themeConfig.colors.success,
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={24} style={{ color: themeConfig.colors.success }} />
                <p
                  className="text-lg font-bold"
                  style={{ color: themeConfig.colors.success }}
                >
                  ✓ License Active
                </p>
              </div>

              <div className="space-y-2 text-sm">
                <p>
                  <strong>License Key:</strong> {licenseStatus?.licenseKey}
                </p>
                <p>
                  <strong>Type:</strong> {licenseStatus?.type?.toUpperCase()}
                </p>
                <p>
                  <strong>Expires:</strong>{' '}
                  {new Date(licenseStatus?.expiryDate).toLocaleDateString()}
                </p>
                <p>
                  <strong>Features:</strong> {licenseStatus?.features?.join(', ')}
                </p>
                <p>
                  <strong>Device:</strong> Registered ✓
                </p>
              </div>
            </div>
          ) : (
            <div
              className="p-4 rounded-lg border-l-4"
              style={{
                backgroundColor: `${themeConfig.colors.warning}20`,
                borderLeftColor: themeConfig.colors.warning,
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <XCircle size={24} style={{ color: themeConfig.colors.warning }} />
                <p
                  className="text-lg font-bold"
                  style={{ color: themeConfig.colors.warning }}
                >
                  ⚠️ License Not Activated
                </p>
              </div>
              <p className="text-sm">
                Paste your license key below to activate all features.
              </p>
            </div>
          )}
        </div>

        {/* License Activation Form */}
        {!licenseStatus?.isActive && (
          <div
            className="rounded-2xl p-6 shadow-lg"
            style={{
              backgroundColor: themeConfig.colors.surface,
              borderColor: themeConfig.colors.border,
              border: `1px solid ${themeConfig.colors.border}`,
            }}
          >
            <h2
              className="text-xl font-bold mb-4 flex items-center gap-2"
              style={{ color: themeConfig.colors.text }}
            >
              🔐 Activate Your License
            </h2>

            <form onSubmit={handleActivateLicense} className="space-y-4">
              <div>
                <label
                  className="block text-sm font-bold mb-2"
                  style={{ color: themeConfig.colors.text }}
                >
                  Enter Your License Key:
                </label>
                <input
                  type="text"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  placeholder="BRD-XXXXXXXX-XXXXXXXXXXXXXXXX"
                  className="w-full px-4 py-3 rounded-lg border-2 font-mono transition-all focus:outline-none"
                  style={{
                    borderColor: themeConfig.colors.border,
                    backgroundColor: themeConfig.colors.surfaceLight,
                    color: themeConfig.colors.text,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = themeConfig.colors.primary;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = themeConfig.colors.border;
                  }}
                />
                <p
                  className="text-xs mt-2"
                  style={{ color: themeConfig.colors.textSecondary }}
                >
                  Check your email for your license key
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 rounded-lg font-bold text-white transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: themeConfig.colors.gradient,
                }}
              >
                {loading ? 'Activating...' : '✓ Activate License'}
              </button>
            </form>

            <div
              className="mt-4 p-4 rounded-lg"
              style={{ backgroundColor: themeConfig.colors.surfaceLight }}
            >
              <p
                className="text-sm"
                style={{ color: themeConfig.colors.textSecondary }}
              >
                <strong>ℹ️ Important:</strong> Your license is tied to this device.
                You cannot use the same license on a different computer.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
```

---

## 🔗 Where to Add Navigation Link

**File:** `ui/src/pages/DashboardPage.tsx`

Add this to the navigation/profile section (so clients can click to go to license activation):

```typescript
// In DashboardPage.tsx, add link:

<button
  onClick={() => navigate('/profile')}
  className="flex items-center gap-2 p-2"
>
  <User size={20} />
  Profile & License
</button>
```

---

## 🗺️ Update Routes

**File:** `ui/src/main.tsx` or your router configuration

Add this route:

```typescript
import ProfilePage from './pages/ProfilePage';

// In your routes array:
{
  path: '/profile',
  element: <ProfilePage />
}
```

---

## ✨ WHAT THIS ADDS

```
✓ License activation form for clients
✓ License status display
✓ Device registration feedback
✓ Feature list display
✓ Expiry date display
✓ Beautiful, user-friendly UI
```

---

## 📍 COMPLETE FLOW NOW

```
CLIENT JOURNEY:

1. Receives email with:
   ├─ Account credentials (username/password)
   └─ License key (BRD-XXXX-XXXX-XXXX)

2. Goes to http://localhost:5173
   ├─ Logs in with credentials
   └─ Sees dashboard

3. Clicks "Profile & License" button
   ├─ Sees license activation form
   └─ "License Not Activated" warning

4. Pastes license key:
   BRD-MIFWEYMT-DE66060562EF161C

5. Clicks "Activate License"

6. Success! ✓
   ├─ Status: "License Active"
   ├─ Features: Enabled
   ├─ Device: Registered
   └─ Back to dashboard (fully working now)
```

---

## 🚀 READY TO TEST

After adding ProfilePage component:

```
1. Start app
2. Login as client (testclient1)
3. Click "Profile & License"
4. Paste license key
5. Click "Activate"
6. See success! ✓
```

---


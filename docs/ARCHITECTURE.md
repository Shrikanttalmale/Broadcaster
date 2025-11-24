# System Architecture Overview

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER'S MACHINE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │              ELECTRON DESKTOP APP                      │   │
│  ├────────────────────────────────────────────────────────┤   │
│  │                                                        │   │
│  │  ┌─────────────────────────────────────────────────┐  │   │
│  │  │        MAIN PROCESS (Node.js)                  │  │   │
│  │  ├─────────────────────────────────────────────────┤  │   │
│  │  │ • Window Management                            │  │   │
│  │  │ • IPC Handlers                                 │  │   │
│  │  │ • Auto-Updater                                 │  │   │
│  │  │ • File System Access                           │  │   │
│  │  └─────────────────────────────────────────────────┘  │   │
│  │                      ↕ IPC                            │   │
│  │  ┌─────────────────────────────────────────────────┐  │   │
│  │  │   RENDERER PROCESS (React + TypeScript)        │  │   │
│  │  ├─────────────────────────────────────────────────┤  │   │
│  │  │ • Pages                                        │  │   │
│  │  │   - Login                                      │  │   │
│  │  │   - Dashboard                                 │  │   │
│  │  │   - Campaigns                                 │  │   │
│  │  │   - Contacts                                  │  │   │
│  │  │   - Reports                                   │  │   │
│  │  │   - Settings                                  │  │   │
│  │  │ • Components                                  │  │   │
│  │  │ • i18n (EN, HI, MR)                          │  │   │
│  │  │ • Tailwind CSS Styling                        │  │   │
│  │  │ • State Management (Zustand)                  │  │   │
│  │  └─────────────────────────────────────────────────┘  │   │
│  │              ↕ HTTP http://localhost:3001            │   │
│  │  ┌─────────────────────────────────────────────────┐  │   │
│  │  │   API SERVER (Express.js)                      │  │   │
│  │  ├─────────────────────────────────────────────────┤  │   │
│  │  │ • Route Handlers                               │  │   │
│  │  │ • License Validation                           │  │   │
│  │  │ • RBAC Middleware                              │  │   │
│  │  │ • Campaign Engine                              │  │   │
│  │  │ • Message Queue                                │  │   │
│  │  │ • WhatsApp Baileys Integration                 │  │   │
│  │  │ • Error Handling                               │  │   │
│  │  └─────────────────────────────────────────────────┘  │   │
│  │                      ↕ SQL                            │   │
│  │  ┌─────────────────────────────────────────────────┐  │   │
│  │  │   SQLITE DATABASE                              │  │   │
│  │  ├─────────────────────────────────────────────────┤  │   │
│  │  │ • Users Table                                  │  │   │
│  │  │ • Licenses Table                               │  │   │
│  │  │ • Plans Table                                  │  │   │
│  │  │ • WhatsApp Accounts                            │  │   │
│  │  │ • Campaigns                                    │  │   │
│  │  │ • Messages                                     │  │   │
│  │  │ • Contacts                                     │  │   │
│  │  │ • Analytics                                    │  │   │
│  │  └─────────────────────────────────────────────────┘  │   │
│  │                                                        │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │          LOCAL FILES                                  │   │
│  ├────────────────────────────────────────────────────────┤   │
│  │ • broadcaster.db (SQLite)                            │   │
│  │ • license.key (encrypted)                            │   │
│  │ • white-label.config.json                            │   │
│  │ • plans.config.json                                  │   │
│  │ • .whatsapp-sessions/ (WA credentials - encrypted)   │   │
│  │ • logs/ (error.log, combined.log)                    │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
         ↕
    (Optional)
         ↓
┌─────────────────────────────────────────────────────────────────┐
│               EXTERNAL (FULLY OPTIONAL)                         │
├─────────────────────────────────────────────────────────────────┤
│ • WhatsApp Servers (for messages)                              │
│ • GitHub (for updates checking)                                │
│ • Optional: Cloud backup                                       │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow: Campaign Execution

```
User Creates Campaign
    ↓
React UI sends POST /api/v1/campaigns
    ↓
Express validates request & checks license restrictions
    ↓
API stores campaign in SQLite
    ↓
Scheduler triggers at scheduled time
    ↓
Campaign Engine:
  1. Load contacts for campaign
  2. For each contact:
    a. Generate random delay (5-15 sec)
    b. Check throttle limit (60/min)
    c. Get Baileys session
    d. Send message via WhatsApp
    e. Update message status in DB
    f. Wait for delivery confirmation
  3. Update campaign status
    ↓
React Dashboard polls for status
    ↓
User sees real-time updates
```

## IPC Communication Flow

```
Electron Main Process
├─ ipcMain.handle('app:check-for-updates')
│   ├─ Check GitHub releases
│   └─ Send to renderer: 'update:available'
│
├─ ipcMain.handle('app:get-version')
│   └─ Return app version
│
└─ ipcMain.handle('license:validate')
    └─ Return license status to UI

React Component
├─ window.electronAPI.checkForUpdates()
├─ window.electronAPI.getVersion()
├─ window.electronAPI.invokeAPI('POST', '/campaigns', data)
│   └─ Forwarded to Express API
└─ window.electronAPI.onUpdateAvailable(() => {...})
```

## License Validation Flow

```
App Starts
    ↓
Check if license.key exists
    ├─ NO → Show: "Please activate license"
    └─ YES ↓
    
Decrypt license file
    ├─ Failed → Show: "Invalid license"
    └─ SUCCESS ↓
    
Verify signature (HMAC-SHA256)
    ├─ Failed → Show: "License tampered"
    └─ SUCCESS ↓
    
Check expiry date
    ├─ Expired → Show: "License expired"
    └─ Valid ↓
    
Load distributor branding
    ├─ Apply app name
    ├─ Load logo
    ├─ Apply color scheme
    └─ Set support contact
    
Load plan features
    ├─ Set maxAccounts
    ├─ Set maxCampaigns
    ├─ Set maxContacts
    └─ Set maxMessagesPerDay
    
Load RBAC rules
    ├─ Admin role → Full access
    ├─ Manager role → Limited access
    └─ Operator role → View only
    
App Ready ✅
```

## Multi-Tier Architecture

### Tier 1: Presentation (React UI)
- Components
- Pages  
- Forms
- Charts
- Translations

### Tier 2: Business Logic (Express API)
- Campaign execution
- License validation
- RBAC checks
- Message queuing
- WhatsApp integration
- Analytics

### Tier 3: Data Access (SQLite)
- Persistent storage
- Query execution
- Transaction management
- Backup

### Tier 4: External Services (Optional)
- WhatsApp (Baileys)
- GitHub (updates)
- Cloud backup (optional)

## Deployment Scenarios

### Scenario 1: Direct User
```
1. User downloads app from GitHub releases
2. Installs on Windows/Mac/Linux
3. Provides license.key (from admin)
4. App starts and works offline
```

### Scenario 2: Distributor Model
```
1. Distributor gets master license
2. Customizes branding & plans
3. Builds custom app with npm run dist
4. Distributes to customers
5. Each customer gets their own installer
```

### Scenario 3: Enterprise
```
1. Enterprise distributor buys license
2. Deploys to 100+ machines
3. Centralized license management
4. Each user gets individual license
5. Usage analytics aggregated
```

## State Management (Phase 2+)

```
Store (Zustand)
├─ auth
│  ├─ user
│  ├─ role
│  └─ permissions
├─ licenses
│  ├─ currentLicense
│  └─ restrictions
├─ campaigns
│  ├─ activeList
│  ├─ selectedCampaign
│  └─ executionStatus
├─ contacts
│  └─ allContacts
├─ reports
│  └─ dashboardMetrics
└─ ui
   ├─ theme
   ├─ language
   └─ darkMode
```

## Performance Considerations

### Optimizations
- SQLite WAL mode for concurrent access
- Proper database indexing
- React code splitting with Vite
- Lazy loading of routes
- Virtualization for large lists
- Message queue for batch processing

### Scalability
- Can handle 1,000,000+ contacts (SQLite limitation ~2GB)
- Can send 50,000+ messages per day
- Auto-rotate between multiple WA accounts
- Randomized delays prevent WhatsApp bans

## Security Layers

1. **Electron Level**
   - Context isolation
   - Preload script
   - Sandbox enabled

2. **IPC Level**
   - Validated message formats
   - Type checking

3. **API Level**
   - Input validation (Joi)
   - License verification
   - RBAC middleware

4. **Database Level**
   - Prepared statements
   - Foreign key constraints

5. **File Level**
   - License encryption
   - Session data encryption
   - .env secrets

---

This architecture ensures **zero maintenance, maximum security, and unlimited scalability**! 🚀

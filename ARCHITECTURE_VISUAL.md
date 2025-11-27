# 🏗️ QUICK VISUAL: HOW THE SYSTEM WORKS

## The Setup

```
YOU (Owner)
├─ Server running broadcaster.db (your office/cloud)
│  └─ API on port 3001
│
Customers (Anywhere in the world)
├─ Device #1 (Desktop/Laptop/Phone)
└─ Device #2 (Another Desktop/Laptop/Phone)
```

---

## The Flow

### ✅ Device #1 Registers

```
Customer's Desktop
└─ Opens your app
   └─ Enters license: BRD-XXXX-YYYY
      └─ Sends HTTP request: "Register me as device-001"
         │
         └─→ YOUR SERVER
            └─ Checks database: "Is this license in use?"
               └─ Result: NO (first time)
                  └─ Saves to database:
                     {
                       licenseKey: "BRD-XXXX-YYYY",
                       deviceId: "device-001",
                       deviceName: "Desktop",
                       isPrimary: true
                     }
                     └─ Responds: "✅ SUCCESS"
                        └─ Device #1 app works!
```

### ❌ Device #2 Tries to Register

```
Customer's Laptop
└─ Opens your app
   └─ Enters SAME license: BRD-XXXX-YYYY
      └─ Sends HTTP request: "Register me as device-002"
         │
         └─→ YOUR SERVER
            └─ Checks database: "Is this license in use?"
               └─ Query: SELECT * FROM device_registrations
                  WHERE licenseKey = "BRD-XXXX-YYYY"
                  └─ Result: YES! device-001 is using it!
                     └─ Counts: 1 device
                        └─ Checks limit: maxInstallations = 1
                           └─ Math: 1 >= 1? YES
                              └─ Decision: BLOCK!
                                 └─ Responds: "❌ LICENSE IN USE"
                                    └─ Device #2 app blocked!
```

---

## The Database

```
┌─────────────────────────────────────────────┐
│  broadcaster.db (on YOUR SERVER)             │
├─────────────────────────────────────────────┤
│  device_registrations Table:                 │
│                                              │
│  licenseKey: BRD-XXXX-YYYY                   │
│  ├─ deviceId: device-001 ✓ REGISTERED       │
│  │  deviceName: john-desktop                 │
│  │  isPrimary: true                          │
│  │                                            │
│  └─ deviceId: device-002 ✗ BLOCKED          │
│     (Never registered - limit reached)       │
└─────────────────────────────────────────────┘
```

---

## Network Diagram

```
                     INTERNET
         ┌────────────────────────┐
         │                        │
    ┌────▼────────┐          ┌────▼────────┐
    │  Device #1  │          │  Device #2  │
    │  (Desktop)  │          │  (Laptop)   │
    │             │          │             │
    │ App asks:   │          │ App asks:   │
    │ "Can I use  │          │ "Can I use  │
    │ this        │          │ this        │
    │ license?"   │          │ license?"   │
    └────┬────────┘          └────┬────────┘
         │                        │
         │ HTTP GET /devices/register      │ HTTP GET /devices/register
         │                        │
         └────────────┬───────────┘
                      │
            ┌─────────▼──────────┐
            │  YOUR SERVER       │
            │  (Node.js API)     │
            │                    │
            │ Queries:           │
            │ broadcaster.db     │
            │                    │
            │ Decision Logic:    │
            │ • Count devices    │
            │ • Check limits     │
            │ • Allow/Block      │
            │                    │
            │ Database:          │
            │ broadcaster.db     │
            │ (SQLite)           │
            └────────────────────┘
```

---

## Three Important Points

### 1. Single Database (Centralized)

```
broadcaster.db (ONE file on your server)
└─ Contains ALL licenses
└─ Contains ALL device registrations
└─ Contains ALL users
└─ NO database on Device #1
└─ NO database on Device #2
```

### 2. Devices Don't Talk to Each Other

```
Device #1 ═══════════════════════════════════════════╌ Device #2
                          ❌ NO DIRECT CONNECTION

Device #1 ════════════════ YOUR SERVER ════════════════ Device #2
                          ✅ BOTH CONNECT HERE
```

### 3. Server Makes Decisions

```
Device #2 asks: "Can I use license BRD-XXXX-YYYY?"

Server:
1. Checks broadcaster.db
2. Finds: Device #1 already using it
3. Checks: Limit is 1
4. Decides: NO

Response to Device #2: ❌ BLOCKED
```

---

## How Device #2 "Knows" About Device #1

**Device #2 doesn't directly know about Device #1.**

**Instead:**
1. Device #2 asks your SERVER
2. Server checks the database
3. Server finds Device #1's registration
4. Server tells Device #2: "Sorry, already in use"

**It's like:**
- Device #1 tells your server: "I'm using this license"
- Device #2 asks your server: "Can I use this license?"
- Your server says: "No, Device #1 beat you to it"

---

## Real-World Analogy

```
Movie Theater Example:

Ticket Counter = YOUR SERVER
Database = List of sold seats

Person #1: "Buy ticket for seat 5A"
Ticket Counter: Checks database → Seat 5A free → Sells it ✅
Database Updated: Seat 5A = SOLD

Person #2: "Buy ticket for seat 5A"  
Ticket Counter: Checks database → Seat 5A taken → Refuses ❌

Person #2 knows seat 5A is taken ONLY because
the ticket counter told them (by checking the database)
```

---

## Key Security Points

```
✅ Database is on YOUR SERVER
   → Device #2 can't modify it
   → Hacker can't fake registration
   
✅ Validation happens on YOUR SERVER
   → Device #2 can't bypass the check
   → Limit is enforced server-side
   
✅ Devices trust YOUR SERVER
   → No need to verify each other
   → Server is single source of truth
   
✅ Cryptographic signatures
   → License can't be forged
   → Device registration can't be faked
```

---

## Network Communication

```
Client-Server Model (what you have):

Device #1                    YOUR SERVER               Device #2
   │                              │                       │
   ├─ POST /devices/register ────→ │                       │
   │                          Checks DB                     │
   │                        Device #1 = NEW                 │
   │                     INSERT to database                 │
   │                              │                         │
   │ ← {"success": true} ─────────┤                         │
   │                              │                         │
   │                              │ ← POST /devices/register┤
   │                              │                         │
   │                          Checks DB                     │
   │                      Device #1 = EXISTS                │
   │                      Count = 1, Limit = 1              │
   │                          BLOCKED                       │
   │                              │                         │
   │                  {"success": false} ────────────────→  │
   │                              │                         │
App runs ✅                       │                    App blocked ❌
```

---

## Summary Table

| Aspect | What It Is | Why Important |
|--------|-----------|---------------|
| **Database** | SQLite on your server | Single source of truth |
| **Connection** | Devices → Server only | Security & reliability |
| **Validation** | Server-side | Can't be bypassed |
| **Storage** | broadcaster.db | Persists across restarts |
| **Device Knowledge** | Via server query | Device #2 learns about Device #1 from DB |

---

## Installation Reality

```
YOUR COMPUTER (Server):
C:\broadcaster\api\
├── broadcaster.db ← WHERE DATA LIVES
├── .license-secret
├── src/
│   ├── services/database.service.ts
│   ├── services/device.service.ts
│   └── routes/device.routes.ts
└── Running: npm run dev (localhost:3001)


CUSTOMER'S COMPUTER (Device #1):
├── Your app (React)
└── When they enter license:
    └── Makes HTTP request to YOUR_SERVER:3001/api/v1/devices/register


CUSTOMER'S OTHER COMPUTER (Device #2):
├── Your app (React)
└── When they enter license:
    └── Makes HTTP request to YOUR_SERVER:3001/api/v1/devices/register
        └── Server checks broadcaster.db
        └── Finds Device #1 registration
        └── Blocks Device #2
```

---

**Remember: You have ONE database, multiple devices, ONE server!** 🎯


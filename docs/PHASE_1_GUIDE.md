# Phase 1: Foundation - Development Guide

## Objective
Establish the core application structure with Electron, React, and Node.js. Create IPC communication bridge and verify all components work together.

## Deliverables

### ✅ Core Setup
- [x] Monorepo workspace (main, api, ui)
- [x] TypeScript configuration for all packages
- [x] Package management
- [x] Development environment setup

### ✅ Electron Main Process
- [x] Window creation and management
- [x] Menu system
- [x] Auto-updater configuration
- [x] IPC handlers (basic)
- [x] Preload bridge for security

### ✅ React UI
- [x] Vite build configuration
- [x] React Router setup
- [x] i18n (react-i18next) with English, Hindi, Marathi
- [x] Basic pages (Login, Dashboard)
- [x] Tailwind CSS styling

### ✅ Node.js Backend
- [x] Express server setup
- [x] SQLite database connection
- [x] Database schema with all required tables
- [x] Logger service
- [x] Error handling middleware

### ✅ Database
- [x] SQLite schema with foreign keys
- [x] Indexes for performance
- [x] Tables for users, licenses, campaigns, messages, contacts, etc.

### ✅ Configuration
- [x] White-labeling config template
- [x] Default plans configuration
- [x] Environment variables

### ✅ CI/CD
- [x] GitHub Actions workflow
- [x] Build pipeline for multiple OS

## Getting Started

### Prerequisites
```bash
# Install Node.js 18+
# Verify installation
node --version
npm --version
```

### Installation

```bash
cd broadcaster

# Install all dependencies
npm run install-all

# Or using pnpm (faster)
pnpm install
```

### Development Mode

```bash
# Start all services
npm run dev

# This runs in parallel:
# - Node.js API on http://localhost:3001
# - React UI on http://localhost:3000
# - Electron window with dev tools
```

### Building

```bash
# Build all workspaces
npm run build

# Create packaged app (Windows)
npm run dist

# Create portable executable
npm run pack
```

## Project Structure Explained

```
broadcaster/
├── main/                     # Electron main process
│   ├── src/
│   │   ├── index.ts         # Main entry point, window creation
│   │   ├── preload.ts       # Secure IPC bridge
│   │   └── types.ts         # TypeScript definitions
│   └── package.json
│
├── api/                      # Node.js backend
│   ├── src/
│   │   ├── index.ts         # Express server
│   │   ├── services/        # Business logic
│   │   │   └── database.service.ts
│   │   ├── middleware/      # Express middleware
│   │   ├── routes/          # API routes (coming in Phase 2)
│   │   ├── models/          # Data models
│   │   └── utils/           # Helpers
│   └── package.json
│
├── ui/                       # React frontend
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API calls
│   │   ├── hooks/           # Custom hooks
│   │   ├── store/           # State management
│   │   ├── locales/         # i18n translations
│   │   └── App.tsx
│   ├── vite.config.ts
│   └── package.json
│
├── db/                       # Database
│   └── schema.sql           # SQLite schema
│
├── config/                   # Configuration
│   ├── white-label.config.json
│   └── plans.config.json
│
├── docs/                     # Documentation
├── .github/workflows/        # CI/CD
└── package.json             # Root workspace
```

## IPC Communication Architecture

```
Electron Main Process
├── IPC Handlers (preload.js exposes these)
│   ├── app:check-for-updates
│   ├── app:get-version
│   ├── app:quit
│   └── Custom API forwarding
│
React Renderer Process
├── window.electronAPI
│   └── Communicate with main process
└── Call backend APIs via http://localhost:3001
```

## Next Steps (Phase 2)

1. **Implement License System**
   - Offline license validation
   - Plan restrictions

2. **Create User Authentication**
   - Login/logout
   - Role-based dashboard

3. **Build Campaign Management UI**
   - Create/edit/delete campaigns
   - Campaign list view

4. **RBAC System**
   - Admin, Manager, Operator roles
   - Permission checks

## Troubleshooting

### Port Already in Use
```bash
# Check what's using port 3000 or 3001
lsof -i :3000
lsof -i :3001

# Kill process
kill -9 <PID>
```

### SQLite Not Creating
- Check that `/broadcaster` folder has write permissions
- Verify `db/schema.sql` is correct

### Electron Dev Tools Not Opening
- Try pressing `Ctrl+Shift+I` or `Cmd+Option+I`
- Check browser DevTools in opened window

### i18n Not Loading Translations
- Verify JSON files in `/ui/src/locales/` are valid JSON
- Check browser console for errors

## Testing Phase 1

1. ✅ App launches without errors
2. ✅ Can see login page (React rendering)
3. ✅ Navigation to dashboard works
4. ✅ Database file created at app start
5. ✅ Console shows "Database initialized successfully"
6. ✅ Dev tools show React components rendering

## Phase 1 Checkpoint ✅

You now have:
- ✅ Working Electron + React + Node desktop app
- ✅ SQLite database with proper schema
- ✅ Multi-language support (EN, HI, MR)
- ✅ Clean architecture with separate concerns
- ✅ Ready for Phase 2 implementation

---

**Ready to proceed?** Commit this to GitHub and move to Phase 2!

```bash
git add .
git commit -m "Phase 1: Foundation setup - Electron + React + Node + SQLite"
git push origin main
git tag -a v0.1.0 -m "Initial foundation release"
git push origin v0.1.0
```

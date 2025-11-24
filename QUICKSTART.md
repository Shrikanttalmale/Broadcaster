# Broadcaster - Quick Start Setup

## 🚀 One-Time Setup

### 1. Prerequisites
```powershell
# Check Node.js version (should be 18+)
node --version
npm --version
```

### 2. Install Dependencies
```powershell
cd broadcaster
npm run install-all
```

### 3. Configure Environment
```powershell
# Copy example env file
Copy-Item .env.example -Destination .env

# Edit .env if needed (usually not required for dev)
```

### 4. Start Development Mode
```powershell
npm run dev
```

This will start:
- React UI on http://localhost:3000
- Node API on http://localhost:3001
- Electron window with dev tools

### 5. Verify Everything Works

✅ Check that:
- Electron window opens
- React app loads at http://localhost:3000
- No errors in console
- You can navigate to Login → Dashboard

## 📁 Project Structure

```
broadcaster/
├── main/              # Electron main process
├── api/               # Node.js backend
├── ui/                # React frontend
├── db/                # Database schema
├── config/            # Configuration files
├── docs/              # Documentation
└── .github/workflows/ # CI/CD
```

## 🔨 Common Commands

```powershell
# Development
npm run dev              # Start all services
npm run build            # Build all workspaces
npm run dist             # Package for distribution
npm run test             # Run tests
npm run lint             # Check code quality
npm run format           # Auto-format code
```

## 🐛 Troubleshooting

### Port 3000/3001 Already in Use
```powershell
# Find and kill process
Get-Process -Name node | Stop-Process
```

### Dependencies Won't Install
```powershell
# Clear npm cache and reinstall
npm cache clean --force
rm package-lock.json
npm install
```

### Electron Won't Start
```powershell
# Make sure TypeScript is built
npm run build -w main
npm start
```

## 📚 Documentation

- **[PHASE_1_GUIDE.md](./docs/PHASE_1_GUIDE.md)** - Foundation setup guide
- **[WHITE_LABELING_GUIDE.md](./docs/WHITE_LABELING_GUIDE.md)** - Distributor licensing
- **[README.md](./README.md)** - Project overview

## 🎯 Next Steps

1. ✅ Project initialized
2. ✅ Dependencies ready
3. ✅ Database schema created
4. → **Run `npm run dev` to start development**

## 📞 Support

For issues, check:
1. [Troubleshooting in PHASE_1_GUIDE.md](./docs/PHASE_1_GUIDE.md#troubleshooting)
2. GitHub Issues
3. Check console for error messages

---

**Ready to start?** → `npm run dev` 🚀

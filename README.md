# 📱 Broadcaster - WhatsApp Bulk Marketing Desktop Application

A comprehensive, zero-cost desktop application for WhatsApp bulk marketing with white-labeling support for distributors.

## ✨ Features

- **Desktop Application**: Electron-based with React UI
- **Multi-Account Support**: Manage multiple WhatsApp numbers
- **Campaign Management**: Create, schedule, and execute bulk campaigns
- **Anti-Ban Protection**: Randomized delays, safe throttling, account rotation
- **Offline License Validation**: Fully offline, no cloud dependencies
- **White-Labeling**: Rebrand for distributors with custom branding
- **Flexible Plans**: Admin-configurable pricing plans
- **Multi-Language**: English, Hindi, Marathi
- **Role-Based Access**: Admin, Manager, Operator roles
- **Analytics & Reports**: Campaign status and delivery reports
- **Auto-Updates**: Seamless updates via GitHub

## 🏗️ Tech Stack

| Component | Technology |
|-----------|-----------|
| Desktop | Electron 27+ |
| UI | React 18 + TypeScript |
| Backend | Node.js + Express |
| Database | SQLite |
| WhatsApp | Baileys |
| Scheduler | node-cron |
| Theming | Tailwind CSS + shadcn/ui |
| i18n | react-i18next |
| Build | esbuild |
| CI/CD | GitHub Actions |

## 📊 Cost Analysis

- **Monthly Maintenance**: $0
- **Deployment Cost**: $0
- **Hosting**: Free (GitHub)
- **Backend Servers**: Not needed (fully local)
- **Database**: SQLite (no server)

## 🚀 Development Phases

- **Phase 1 (Week 1-2)**: Foundation - Electron + React + Node scaffold
- **Phase 2 (Week 3-4)**: Core Features - License system, RBAC, UI
- **Phase 3 (Week 5-6)**: WhatsApp Integration - Baileys, multi-account
- **Phase 4 (Week 7-8)**: Scheduler & Anti-Ban - Campaign execution
- **Phase 5 (Week 9)**: Analytics - Reports and dashboards
- **Phase 6 (Week 10)**: Multilingual - i18n and branding
- **Phase 7 (Week 11)**: Auto-Updates - Release system
- **Phase 8 (Week 12)**: Production - Optimization and security

## 📁 Project Structure

```
broadcaster/
├── main/                 # Electron main process
│   ├── index.js
│   ├── ipc-handlers.js
│   ├── preload.js
│   └── package.json
├── api/                  # Node.js backend
│   ├── src/
│   │   ├── index.js
│   │   ├── routes/
│   │   ├── services/
│   │   └── models/
│   └── package.json
├── ui/                   # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── App.tsx
│   └── package.json
├── db/                   # Database
│   ├── schema.sql
│   └── migrations/
├── config/               # Configuration files
│   ├── white-label.config.json
│   └── plans.config.json
├── docs/                 # Documentation
├── .github/workflows/    # CI/CD pipelines
└── package.json          # Root workspace config
```

## 🔧 Installation & Setup

### Prerequisites
- Node.js 18+
- npm or pnpm
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/broadcaster.git
cd broadcaster

# Install dependencies for all workspaces
npm run install-all

# Or using pnpm (recommended for speed)
pnpm install
```

### Development

```bash
# Start all services (main, api, ui)
npm run dev

# Build all workspaces
npm run build

# Run tests
npm run test

# Format code
npm run format

# Lint code
npm run lint
```

### Build & Distribution

```bash
# Create packaged app
npm run dist

# Create portable executable
npm run pack
```

## 🏢 White-Labeling & Distributor Model

### For Distributors

1. Get a Distributor License from us
2. Brand the app with your company colors, logo, and name
3. Create custom plans for your customers
4. Generate user licenses with specific plan features
5. Your customers download and use the white-labeled app

### Configuration Example

Edit `config/white-label.config.json`:

```json
{
  "branding": {
    "appName": "ABC Broadcaster",
    "companyName": "ABC Marketing Solutions",
    "primaryColor": "#FF6B35"
  },
  "features": {
    "maxAccounts": 5,
    "maxCampaigns": 20,
    "advancedReports": true
  }
}
```

## 🔐 Licensing

- **Master License**: For app creators (you)
- **Distributor License**: For resellers with white-labeling
- **User License**: For end customers

All licenses are validated locally (offline). No cloud calls needed.

## 📈 Revenue Model

```
You (Creator)
  ↓
Distributor A ($2,000/year license)
  ├─ Resells to Customer 1 (Basic: $500/mo)
  ├─ Resells to Customer 2 (Pro: $2,000/mo)
  └─ Resells to Customer 3 (Premium: $5,000/mo)
  ↓
Distributor B ($2,000/year license)
  └─ Resells to multiple customers...
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create feature branch: `git checkout -b feature/feature-name`
3. Commit changes: `git commit -m "Add feature"`
4. Push to branch: `git push origin feature/feature-name`
5. Submit pull request

## 📝 License

This project is licensed under the MIT License - see LICENSE file for details.

## 🆘 Support

- **Documentation**: See `/docs` folder
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions

## 🗺️ Roadmap

- [ ] Phase 1: Foundation ✅ In Progress
- [ ] Phase 2: Core Features
- [ ] Phase 3: WhatsApp Integration
- [ ] Phase 4: Scheduler & Anti-Ban
- [ ] Phase 5: Analytics
- [ ] Phase 6: Multilingual
- [ ] Phase 7: Auto-Updates
- [ ] Phase 8: Production Release (v1.0.0)

## 💡 Zero-Cost Architecture

This application is designed for **zero maintenance and deployment costs**:

- ✅ No backend servers needed (all local)
- ✅ No database servers (SQLite embedded)
- ✅ No API hosting costs
- ✅ No cloud storage (all local)
- ✅ Free updates via GitHub
- ✅ No DevOps required

Revenue model: Sell licenses to distributors, who resell to end customers.

---

**Last Updated**: November 24, 2025
**Maintained by**: Broadcaster Team

# SubManager - Smart Subscription Tracking for India

Track all your subscriptions in one place. Connect bank accounts, scan emails, and never miss a payment.

## Features

- **Dashboard** - Monthly spending, category breakdown, upcoming renewals
- **Subscription Management** - Add, edit, delete with categories, billing cycles, and reminders
- **Calendar View** - Visual calendar showing renewal dates
- **Email Scanner** - Gmail OAuth integration to auto-detect subscriptions from inbox
- **Bank Integration** - Connect Indian bank accounts (HDFC, ICICI, SBI, Axis, Kotak)
- **Smart Detection** - AI-powered subscription detection from emails and bank transactions
- **Notifications** - Renewal reminders and scan alerts
- **Budget Tracking** - Set spending limits with alerts
- **Authentication** - JWT-based auth with register/login/logout

## Tech Stack

**Frontend**: React 19, Vite, Tailwind CSS, Recharts, Lucide Icons

**Backend**: Fastify 5, TypeScript, PostgreSQL 16, Redis 7, BullMQ, JWT, Zod

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 16
- Redis 7

### 1. Backend Setup

```bash
cd backend-v2
npm install
cp .env.example .env    # Edit with your credentials

# Database setup
createdb submanager
npm run migrate

# Start server
npm run dev              # http://localhost:3001
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev              # http://localhost:5173
```

### 3. Open the App

Visit http://localhost:5173, register a new account, and start tracking.

## Project Structure

```
subscription-manager/
├── frontend/                React 19 + Vite + Tailwind
│   ├── src/
│   │   ├── components/      Dashboard, SubscriptionList, Calendar,
│   │   │                    EmailScanner, ConnectedAccounts, Settings,
│   │   │                    NotificationBell, ErrorBoundary, etc.
│   │   ├── contexts/        AuthContext (JWT token management)
│   │   ├── api.js           API client with auto token refresh
│   │   ├── App.jsx          Main app with auth gating + tab navigation
│   │   └── main.jsx         Entry point with providers
│   └── package.json
│
├── backend-v2/              Fastify + TypeScript + PostgreSQL
│   ├── src/
│   │   ├── modules/         auth, subscriptions, analytics, bank,
│   │   │                    email, detection, notifications, budgets,
│   │   │                    family, cancellation, recommendations
│   │   ├── db/migrations/   12 SQL migration files
│   │   ├── jobs/            BullMQ workers (email scan, renewal check, etc.)
│   │   └── shared/          Middleware, schemas, utilities
│   ├── docs/                Feature documentation
│   └── package.json
│
└── README.md
```

## Built for India

- Native INR (₹) currency support
- Indian bank integration (HDFC, ICICI, SBI, Axis, Kotak)
- Popular Indian subscription services
- Indian date/time formats

## Author

**Shreya Pachauri** - [@code-shreya](https://github.com/code-shreya)

## License

MIT

# 🎯 SubManager - Smart Subscription Tracking for India

<div align="center">

![SubManager](https://img.shields.io/badge/SubManager-Smart%20Subscription%20Tracking-blue?style=for-the-badge)
![Made for India](https://img.shields.io/badge/Made%20For-India%20%F0%9F%87%AE%F0%9F%87%B3-orange?style=for-the-badge)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js)

**Track all your subscriptions in one place. Never miss a payment again.**

[🚀 Try Live Demo](#) | [📖 Documentation](./DEMO_WALKTHROUGH.md) | [🐛 Report Bug](https://github.com/code-shreya/subscription-manager/issues)

</div>

---

## ✨ Features

### 📊 **Analytics Dashboard**
- Monthly and yearly spending overview with beautiful charts
- Category breakdown with interactive pie chart
- Upcoming renewals with 30-day forecast
- Active subscription count and insights
- GitHub-inspired clean UI design

### 📧 **Smart Email Scanner**
- AI-powered Gmail integration
- Automatic subscription detection from emails
- **365-day deep scan** with real-time progress tracking
- Quick scan for last 100 emails
- AI insights and recommendations
- Categorizes subscriptions vs. one-time payments

### 🏦 **Bank Integration** (Mock for Demo)
- Connect Indian bank accounts (HDFC, ICICI, SBI, Axis, Kotak)
- Automatic transaction categorization
- Real-time balance and transaction sync
- Supports ₹ INR currency natively

### 📅 **Visual Calendar**
- Beautiful calendar view showing all renewal dates
- Monthly navigation with day-by-day breakdown
- Color-coded categories
- Upcoming renewal highlights

### 🔔 **Smart Reminders**
- Automated renewal notifications
- 7-day, 3-day, and 1-day advance warnings
- Daily scheduled scans at 8:00 AM
- Browser notifications support

### 🎨 **Modern UI Design**
- GitHub-inspired design system
- Clean, professional interface
- Responsive mobile-first design
- Dark header with light content areas
- Subtle hover effects and transitions

---

## 🚀 Quick Start

### Live Demo

Visit the deployed application at: **[Your Render URL]**

The demo includes:
- Sample subscription data
- Mock bank accounts
- Full email scanning capabilities (requires Gmail OAuth)
- All features unlocked

### Local Development

#### Prerequisites
- Node.js 18+
- npm or yarn
- Gmail account (for email scanning)
- OpenAI API key (for AI features)

#### Installation

1. **Clone the repository**
```bash
git clone https://github.com/code-shreya/subscription-manager.git
cd subscription-manager
```

2. **Backend Setup**
```bash
cd backend
npm install

# Create .env file
cp .env.example .env
# Add your API keys to .env:
# - OPENAI_API_KEY
# - GMAIL_CLIENT_ID
# - GMAIL_CLIENT_SECRET

npm start
```
Backend runs on: http://localhost:3001

3. **Frontend Setup**
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on: http://localhost:5173

---

## 🏗️ Tech Stack

### Frontend
- **React 19** - Latest React with concurrent features
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first styling
- **Recharts** - Beautiful analytics charts
- **Lucide React** - Clean, consistent icons

### Backend
- **Node.js + Express** - REST API server
- **OpenAI GPT-4** - AI-powered subscription detection
- **Gmail API** - Email scanning and OAuth
- **Node-Cron** - Scheduled tasks
- **JSON Storage** - Lightweight data persistence

---

## 📂 Project Structure

```
subscription-manager/
├── backend/
│   ├── server.js                 # Express server
│   ├── services/
│   │   ├── gmail.service.js      # Gmail integration
│   │   ├── openai.service.js     # AI processing
│   │   ├── scheduler.service.js  # Cron jobs
│   │   └── notification.service.js
│   ├── data/
│   │   ├── subscriptions.json    # Main data
│   │   ├── detected.json         # Email scan results
│   │   └── history.json          # Scan history
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx           # Analytics
│   │   │   ├── SubscriptionList.jsx    # Manage subs
│   │   │   ├── CalendarView.jsx        # Calendar
│   │   │   ├── EmailScanner.jsx        # Email scan
│   │   │   ├── ConnectedAccounts.jsx   # Banks
│   │   │   ├── Settings.jsx            # Settings
│   │   │   ├── LandingPage.jsx         # Public demo
│   │   │   ├── NotificationBell.jsx    # Alerts
│   │   │   └── DeepScanInsights.jsx    # AI insights
│   │   ├── api.js                      # API client
│   │   ├── App.jsx                     # Main app
│   │   └── main.jsx                    # Entry point
│   └── package.json
│
├── DEMO_WALKTHROUGH.md          # Feature documentation
├── DEPLOYMENT.md                # Deployment guide
└── README.md                    # This file
```

---

## 🔌 API Endpoints

### Subscriptions
- `GET /api/subscriptions` - Get all subscriptions
- `GET /api/subscriptions/:id` - Get single subscription
- `POST /api/subscriptions` - Create new subscription
- `PUT /api/subscriptions/:id` - Update subscription
- `DELETE /api/subscriptions/:id` - Delete subscription
- `GET /api/analytics` - Get analytics data

### Gmail Integration
- `GET /api/gmail/auth-url` - Get OAuth URL
- `GET /api/gmail/callback` - OAuth callback
- `GET /api/gmail/status` - Check connection
- `POST /api/gmail/scan` - Quick email scan
- `POST /api/gmail/deep-scan` - 365-day deep scan
- `GET /api/gmail/detected` - Get scan results

### Bank Accounts (Mock)
- `GET /api/banks` - Get connected accounts
- `POST /api/banks` - Add bank account
- `DELETE /api/banks/:id` - Remove account

---

## 🎯 Key Features in Detail

### Email Scanner
The email scanner uses OpenAI's GPT-4 to intelligently detect subscriptions from your Gmail inbox:

1. **Quick Scan**: Scans last 100 emails
2. **Deep Scan**: Scans entire year (365 days, ~1000 emails)
3. **Real-time Progress**: Shows current phase and email count
4. **AI Categorization**: Distinguishes subscriptions from one-time payments
5. **Smart Extraction**: Pulls out service name, amount, billing cycle, dates

### Bank Integration (Demo)
Mock integration with Indian banks for demonstration:
- Connects to HDFC, ICICI, SBI, Axis, Kotak Mahindra
- Shows realistic transaction data
- Categorizes payments automatically
- Native ₹ INR support

### Analytics Dashboard
Comprehensive spending insights:
- Monthly spending trends
- Category-wise breakdown
- Top subscriptions by cost
- Renewal forecasts
- Savings recommendations

---

## 🌍 Built for India

SubManager is specifically designed for Indian users:
- ✅ Native ₹ INR currency support
- ✅ Indian bank integration
- ✅ Popular Indian services (Netflix, Prime, Zomato Gold, etc.)
- ✅ Local payment methods
- ✅ Indian date/time formats

---

## 🚢 Deployment

The app is deployed on Render:
- **Frontend**: Static site
- **Backend**: Web service with persistent disk
- **Database**: JSON file storage with backups

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👩‍💻 Author

**Shreya Pachauri**
- GitHub: [@code-shreya](https://github.com/code-shreya)

---

## 🙏 Acknowledgments

- OpenAI for GPT-4 API
- Google for Gmail API
- GitHub for design inspiration
- React and Vite teams for amazing tools

---

<div align="center">

**Made with ❤️ for smarter subscription tracking**

[⭐ Star this repo](https://github.com/code-shreya/subscription-manager) if you find it useful!

</div>

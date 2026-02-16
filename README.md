# SubManager - Subscription Management AI Agent

A full-stack subscription management application with an interactive UI to track, manage, and optimize all your recurring subscriptions.

## Features

✨ **Dashboard with Analytics**
- Monthly and yearly spending overview
- Category breakdown with pie chart
- Upcoming renewals alerts
- Active subscription count

📅 **Calendar View**
- Visual calendar showing all renewal dates
- Monthly navigation
- Highlighted upcoming renewals
- Days until next billing

📋 **Subscription Management**
- Add, edit, and delete subscriptions
- Search and filter functionality
- Status tracking (active, cancelled, paused)
- Support for multiple currencies
- Monthly and yearly billing cycles

## Tech Stack

**Frontend:**
- React + Vite
- Tailwind CSS
- Recharts (for analytics)
- Lucide React (icons)

**Backend:**
- Node.js + Express
- JSON file-based storage

## Installation & Setup

### Backend

```bash
cd backend
npm install
npm start
```

Backend runs on: http://localhost:3001

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: http://localhost:5173

## API Endpoints

- `GET /api/subscriptions` - Get all subscriptions
- `GET /api/subscriptions/:id` - Get single subscription
- `POST /api/subscriptions` - Create new subscription
- `PUT /api/subscriptions/:id` - Update subscription
- `DELETE /api/subscriptions/:id` - Delete subscription
- `GET /api/analytics` - Get analytics data

## Project Structure

```
subscription-manager/
├── backend/
│   ├── server.js          # Express server
│   ├── subscriptions.json # Data storage
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── CalendarView.jsx
│   │   │   ├── SubscriptionList.jsx
│   │   │   └── SubscriptionForm.jsx
│   │   ├── api.js         # API client
│   │   ├── App.jsx        # Main app
│   │   └── index.css      # Tailwind styles
│   └── package.json
└── README.md
```

## Usage

1. Start both backend and frontend servers
2. Navigate to http://localhost:5173
3. Add your first subscription using the "Add Subscription" button
4. Explore the Dashboard for analytics
5. View the Calendar to see upcoming renewals
6. Manage all subscriptions from the Subscriptions tab

## Future Enhancements

- Email parsing for automatic subscription detection
- Bank integration for transaction tracking
- AI-powered recommendations
- Cancellation assistant
- Bill negotiation
- Mobile apps
- Multi-user support
- Notification system

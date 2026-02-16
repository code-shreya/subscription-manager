# 📧 Email Scanner Setup Guide

## Overview
The Email Scanner automatically detects subscriptions from your Gmail inbox using AI. It requires two API integrations:

1. **Gmail API** - To read your emails
2. **OpenAI API** - To extract subscription information with AI

---

## 🔑 Step 1: Get OpenAI API Key (Easier - Start Here!)

### 1.1 Create OpenAI Account
1. Go to https://platform.openai.com/
2. Sign up or log in
3. Add payment method (pay-as-you-go)

### 1.2 Create API Key
1. Navigate to https://platform.openai.com/api-keys
2. Click **"Create new secret key"**
3. Name it: `SubManager Email Scanner`
4. Copy the key (starts with `sk-proj-...`)
5. **SAVE IT NOW** - you won't see it again!

### 1.3 Add to .env File
```bash
cd backend
nano .env
```

Add your key:
```
OPENAI_API_KEY=sk-proj-your-key-here
```

Save and exit (Ctrl+X, then Y, then Enter)

**Cost**: ~$0.01-0.05 per 20 emails scanned (very cheap!)

---

## 📧 Step 2: Setup Gmail API (Required for Email Access)

### 2.1 Create Google Cloud Project
1. Go to https://console.cloud.google.com/
2. Click **"Select a project"** → **"New Project"**
3. Name: `SubManager Email Scanner`
4. Click **"Create"**
5. Wait for project creation (~30 seconds)

### 2.2 Enable Gmail API
1. In the search bar, type: `Gmail API`
2. Click on **Gmail API** in results
3. Click **"Enable"** button
4. Wait for activation

### 2.3 Configure OAuth Consent Screen
1. Go to: https://console.cloud.google.com/apis/credentials/consent
2. Select **"External"** user type
3. Click **"Create"**

**App Information:**
- App name: `SubManager`
- User support email: (your email)
- Developer email: (your email)

**Scopes:**
- Click **"Add or Remove Scopes"**
- Filter: `gmail.readonly`
- Select: `https://www.googleapis.com/auth/gmail.readonly`
- Click **"Update"**

**Test Users:**
- Click **"Add Users"**
- Add your Gmail address
- Click **"Save and Continue"**

Click **"Save and Continue"** through remaining screens.

### 2.4 Create OAuth 2.0 Credentials
1. Go to: https://console.cloud.google.com/apis/credentials
2. Click **"+ Create Credentials"**
3. Select **"OAuth client ID"**
4. Application type: **"Web application"**
5. Name: `SubManager Web Client`

**Authorized redirect URIs:**
- Click **"+ Add URI"**
- Enter: `http://localhost:3001/api/gmail/callback`
- Click **"Create"**

### 2.5 Download Credentials
1. You'll see a modal with:
   - **Client ID** (looks like: `123456789-abc...googleusercontent.com`)
   - **Client Secret** (looks like: `GOCSPX-...`)
2. **Copy both values**

### 2.6 Add to .env File
Open `backend/.env` and add:

```
GMAIL_CLIENT_ID=your-client-id-here.googleusercontent.com
GMAIL_CLIENT_SECRET=GOCSPX-your-secret-here
GMAIL_REDIRECT_URI=http://localhost:3001/api/gmail/callback
```

Save the file.

---

## 🚀 Step 3: Restart & Test

### 3.1 Restart Backend Server
```bash
# Stop the current server (Ctrl+C if running in terminal)
# Or if running in background, use:
# pkill -f "node.*server.js"

# Start it again
cd backend
npm start
```

You should see:
```
✅ OpenAI initialized
🚀 Server running on http://localhost:3001
```

### 3.2 Test in Browser
1. Open http://localhost:5173
2. Click **"Email Scanner"** tab
3. Click **"Connect Gmail Account"**
4. Sign in with Google
5. Grant permissions
6. Should show "✅ Gmail Connected Successfully!"

### 3.3 Scan Your Emails
1. Click **"🔍 Scan Emails"** button
2. Wait 30-60 seconds (AI is processing)
3. View detected subscriptions!
4. Click **✅ (checkmark)** to import subscriptions
5. Click **❌ (X)** to dismiss false positives

---

## 🔒 Security & Privacy

### What We Access:
- **Read-only** Gmail access (we CANNOT send or delete emails)
- Only subscription-related emails are processed
- Emails from last 90 days

### What's Stored:
- OAuth tokens locally (`backend/gmail-token.json`)
- Detected subscriptions (`backend/detected-subscriptions.json`)
- NO email content is permanently stored

### To Revoke Access:
1. Go to: https://myaccount.google.com/permissions
2. Find "SubManager"
3. Click "Remove Access"

---

## 💰 Cost Breakdown

### OpenAI API (GPT-4o-mini)
- **Per email**: ~$0.0005 (half a cent)
- **20 emails**: ~$0.01 (1 cent)
- **100 emails**: ~$0.05 (5 cents)
- **Very affordable for personal use!**

### Gmail API
- **100% FREE** for personal use
- No charges for read-only access

---

## 🐛 Troubleshooting

### "OpenAI API key not configured"
- Check `backend/.env` has correct `OPENAI_API_KEY`
- Restart backend server
- Verify key starts with `sk-proj-`

### "Gmail not connected" after auth
- Check redirect URI is exactly: `http://localhost:3001/api/gmail/callback`
- Verify backend is running on port 3001
- Try disconnecting and reconnecting

### "Failed to scan emails"
- Both Gmail API and OpenAI must be configured
- Check backend console logs for errors
- Ensure you have subscription emails in last 90 days

### "Access blocked: This app is not verified"
- Click **"Advanced"** → **"Go to SubManager (unsafe)"**
- This is normal for development apps
- Your own app accessing your own data is safe

### Gmail API Errors
- Make sure you added yourself as a test user
- Enable Gmail API in Cloud Console
- Check OAuth consent screen is published

---

## 📊 What It Detects

The AI scanner looks for:
- ✅ Subscription receipts (Netflix, Spotify, etc.)
- ✅ Renewal notifications
- ✅ Billing confirmations
- ✅ Payment receipts
- ✅ Trial expiration notices

Extracts:
- Service name
- Amount & currency
- Billing cycle (monthly/yearly)
- Next billing date
- Category

---

## 🎯 Next Steps After Setup

1. **Scan your inbox** - Find all subscriptions
2. **Import detected subscriptions** - Add them to your dashboard
3. **Set up notifications** (coming soon)
4. **Enable auto-scanning** (coming soon)

---

## 🔮 Future Enhancements

Coming soon:
- [ ] Automatic daily/weekly scans
- [ ] Bank transaction integration (Plaid)
- [ ] Price change detection
- [ ] Cancellation assistant
- [ ] Mobile app with push notifications

---

## 📞 Need Help?

- Check backend logs: `tail -f backend/logs/*.log`
- Verify .env configuration
- Ensure all services are running
- Check API quotas in Google Cloud Console

---

## ✅ Quick Verification Checklist

- [ ] OpenAI API key added to .env
- [ ] Gmail OAuth credentials added to .env
- [ ] Backend server restarted
- [ ] Gmail connection successful
- [ ] First scan completed
- [ ] Subscriptions detected and imported

---

**🎉 You're all set! Your AI-powered email scanner is ready to use!**

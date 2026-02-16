# 🚀 Deploy SubManager to Render

## Quick Deploy (5 minutes)

### Step 1: Push to GitHub First
Your code needs to be on GitHub for Render to deploy it.

**Run this command:**
```bash
cd ~/subscription-manager
git push origin main
```
(Enter your GitHub credentials when prompted)

### Step 2: Go to Render Dashboard
1. Open: https://dashboard.render.com/
2. Sign in with GitHub (if not already)

### Step 3: Create New Blueprint
1. Click **"New +"** button → **"Blueprint"**
2. Connect your GitHub repository: `code-shreya/subscription-manager`
3. Click **"Apply"**

Render will automatically:
- Read your `render.yaml` file
- Create 2 services:
  - `submanager-backend` (API server)
  - `submanager-frontend` (Website)
- Deploy both services

### Step 4: Configure Environment Variables
After deployment starts, click on **"submanager-backend"**:

Add these environment variables:
- `OPENAI_API_KEY` = Your OpenAI key
- `GMAIL_CLIENT_ID` = Your Gmail OAuth ID
- `GMAIL_CLIENT_SECRET` = Your Gmail OAuth secret
- `GMAIL_REDIRECT_URI` = `https://submanager-backend.onrender.com/api/gmail/callback`

Click **"Save Changes"** - it will redeploy automatically.

### Step 5: Get Your URLs

**Frontend URL** (Share this with your brother):
```
https://submanager-frontend.onrender.com
```

**Backend URL** (API):
```
https://submanager-backend.onrender.com
```

### Step 6: Test It
1. Open your frontend URL
2. You should see the landing page
3. Click "Try Live Demo"
4. All features should work!

## 🎯 Share Links

Once deployed, share with your brother:

**Landing Page:**
```
https://submanager-frontend.onrender.com
```

**GitHub Repo:**
```
https://github.com/code-shreya/subscription-manager
```

## ⚡ Auto-Deploy

Good news! After initial setup:
- Every git push to `main` branch
- Automatically triggers new deployment
- Updates live in 2-3 minutes

## 🆘 Troubleshooting

**Build Failed?**
- Check environment variables are set
- View logs in Render dashboard
- Make sure all dependencies are in package.json

**Frontend shows error?**
- Wait 2-3 min for backend to fully start
- Check VITE_API_URL is correctly linked
- Clear browser cache and refresh

## 📝 Current Status

- ✅ render.yaml configured
- ✅ Code committed to git
- ⏳ Needs: Push to GitHub
- ⏳ Needs: Deploy on Render dashboard

**Next Step:** Push to GitHub, then deploy!

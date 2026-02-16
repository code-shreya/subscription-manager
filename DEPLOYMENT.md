# 🚀 Deployment Guide - SubManager

Deploy your subscription manager app to **Render** (free hosting) so others can access it!

---

## 📋 **Prerequisites**

Before deploying, you need:
- ✅ GitHub account
- ✅ Render account (free): https://render.com
- ✅ Your API keys (Gmail, OpenAI, Plaid)

---

## 🎯 **Step 1: Push to GitHub**

### **1.1 Create GitHub Repository**

1. Go to: https://github.com/new
2. Repository name: `subscription-manager`
3. Description: "Smart subscription tracking app with Indian bank integration"
4. **Keep it PUBLIC** (for free hosting)
5. **Don't** initialize with README (we already have one)
6. Click **"Create repository"**

### **1.2 Push Your Code**

Copy the commands shown on GitHub, or use these:

```bash
cd /Users/shreyapachauri/subscription-manager

# Add GitHub remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/subscription-manager.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**✅ Your code is now on GitHub!**

---

## 🎯 **Step 2: Deploy to Render**

### **2.1 Sign Up for Render**

1. Go to: https://render.com
2. Click **"Get Started"**
3. Sign up with **GitHub** (easiest)
4. Authorize Render to access your repositories

### **2.2 Create New Web Service (Backend)**

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository: `subscription-manager`
3. **Configure Backend**:

```
Name: submanager-backend
Region: Singapore (or closest to you)
Branch: main
Root Directory: backend
Runtime: Node
Build Command: npm install
Start Command: npm start
Instance Type: Free
```

4. **Add Environment Variables** (click "Advanced"):

```
PORT = 3001
NODE_ENV = production

# Gmail API
GMAIL_CLIENT_ID = your_gmail_client_id
GMAIL_CLIENT_SECRET = your_gmail_client_secret
GMAIL_REDIRECT_URI = https://submanager-backend.onrender.com/api/gmail/callback

# OpenAI
OPENAI_API_KEY = your_openai_api_key

# Plaid (optional)
PLAID_CLIENT_ID = your_plaid_client_id
PLAID_SECRET = your_plaid_secret
PLAID_ENV = sandbox
```

5. Click **"Create Web Service"**
6. **Wait 5-10 minutes** for deployment
7. **Copy your backend URL**: `https://submanager-backend.onrender.com`

### **2.3 Create Static Site (Frontend)**

1. Click **"New +"** → **"Static Site"**
2. Connect same repository
3. **Configure Frontend**:

```
Name: submanager-frontend
Region: Singapore
Branch: main
Root Directory: frontend
Build Command: npm install && npm run build
Publish Directory: dist
```

4. **Add Environment Variable**:

```
VITE_API_URL = https://submanager-backend.onrender.com/api
```

5. Click **"Create Static Site"**
6. **Wait 5-10 minutes** for deployment
7. **Get your app URL**: `https://submanager-frontend.onrender.com`

---

## 🎯 **Step 3: Update OAuth Callback**

Since your backend URL changed, update Google OAuth:

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click your OAuth 2.0 Client ID
3. **Add to "Authorized redirect URIs"**:
   ```
   https://submanager-backend.onrender.com/api/gmail/callback
   ```
4. Click **Save**

---

## 🎯 **Step 4: Initialize Database**

On first deploy, initialize the JSON files:

1. Go to backend service in Render dashboard
2. Click **"Shell"** tab
3. Run these commands:

```bash
cd backend
echo '{"subscriptions":[],"nextId":1}' > subscriptions.json
echo '{"detected":[],"lastScan":null}' > detected-subscriptions.json
echo '{"accounts":[],"nextId":1}' > connected-accounts.json
echo '{"transactions":[],"lastSync":null}' > transactions.json
echo '{"detectedSubscriptions":[],"nextId":1}' > detected-from-bank.json
echo '{"notifications":[]}' > notifications.json
```

---

## ✅ **Step 5: Test Your App!**

1. **Open your app**: `https://submanager-frontend.onrender.com`
2. **Test features**:
   - ✅ Dashboard loads
   - ✅ Can add subscriptions
   - ✅ Bank integration works
   - ✅ Email scanner (after OAuth)

---

## 🎨 **Step 6: Custom Domain (Optional)**

### **Free Options:**

1. **Use Render domains** (already set up):
   - `submanager-frontend.onrender.com`

2. **Custom subdomain** (if you have a domain):
   - Render dashboard → Custom Domains
   - Add your domain
   - Update DNS records

---

## 📝 **Important Notes**

### **Free Tier Limitations:**

⚠️ **Render Free Tier**:
- Services **spin down** after 15 minutes of inactivity
- First request after sleep takes 30-60 seconds
- 750 hours/month free
- Good for demos and testing

### **Data Persistence:**

⚠️ **JSON Files**:
- Will reset on each deployment
- For production, upgrade to PostgreSQL
- See: UPGRADE_TO_DATABASE.md (coming soon)

### **Performance:**

- First load: 30-60 seconds (if sleeping)
- After wake: Fast and responsive
- Singapore region: Best for India/Asia

---

## 🔧 **Troubleshooting**

### **Backend won't start:**
- Check environment variables are set
- Check logs in Render dashboard
- Verify build succeeded

### **Frontend can't connect to backend:**
- Check `VITE_API_URL` is correct
- Check backend is running
- Check CORS settings

### **OAuth errors:**
- Update Google Console with new redirect URI
- Check `GMAIL_REDIRECT_URI` matches exactly

### **Services sleeping:**
- Upgrade to paid plan ($7/month) for always-on
- Or use a ping service to keep alive

---

## 🚀 **What's Next?**

### **Recommended Upgrades:**

1. **Add PostgreSQL Database** (free on Render)
   - Persistent data storage
   - Better for production

2. **Add Redis Cache**
   - Speed up API responses
   - Cache analytics data

3. **Custom Domain**
   - Professional branding
   - Better for sharing

4. **Monitoring**
   - Set up Render alerts
   - Monitor uptime

5. **CI/CD**
   - Auto-deploy on git push
   - Run tests before deploy

---

## 💰 **Costs**

### **Free Tier (What we're using):**
- ✅ Free forever
- ✅ Good for demos
- ✅ Unlimited apps
- ⚠️ Services sleep after 15min

### **Paid Tier ($7/month per service):**
- ✅ Always on
- ✅ Faster
- ✅ More resources
- ✅ Better support

### **Your Monthly Cost:**
- **Free**: $0/month (with sleep)
- **Paid**: $14/month (2 services always-on)

---

## 🎉 **Success!**

Your app is now live and accessible to anyone!

**Share your links:**
- Frontend: `https://submanager-frontend.onrender.com`
- API: `https://submanager-backend.onrender.com`

---

## 📚 **Resources**

- Render Docs: https://render.com/docs
- Render Dashboard: https://dashboard.render.com
- Support: support@render.com

---

*Built with ❤️ • Deployed on Render • Open Source*

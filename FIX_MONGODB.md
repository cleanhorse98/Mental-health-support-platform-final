# Fix MongoDB Connection Error

## Problem
Your `.env` file is trying to connect to MongoDB Atlas (cloud) but the connection is failing with SSL errors.

## Solution Options

### Option 1: Use Local MongoDB (Easiest - Recommended)

**Step 1:** Update your `.env` file to use local MongoDB:

```env
MONGODB_URI=mongodb://localhost:27017/mental-health-platform
SESSION_SECRET=mental-health-platform-secret-key-change-in-production
PORT=3000
JWT_SECRET=your-jwt-secret-key-change-in-production
NODE_ENV=development
```

**Step 2:** Make sure MongoDB is installed and running on your computer.

**Step 3:** Restart the server:
```powershell
npm run dev
```

---

### Option 2: Fix MongoDB Atlas Connection

If you want to use MongoDB Atlas (cloud database):

**Step 1:** Go to your MongoDB Atlas dashboard: https://cloud.mongodb.com/

**Step 2:** Get your connection string:
- Click "Connect" on your cluster
- Choose "Connect your application"
- Copy the connection string
- Replace `<password>` with your actual database password

**Step 3:** Update `.env` file:
```env
MONGODB_URI=mongodb+srv://PRANEETH:YOUR_ACTUAL_PASSWORD@cluster0.7aranom.mongodb.net/mental-health-platform?retryWrites=true&w=majority
```

**Step 4:** Make sure your IP is whitelisted in Atlas (Network Access)

---

## Quick Fix Commands

```powershell
# You're already in the correct directory
# Just update .env file and restart:

# 1. Edit .env file (change MONGODB_URI to local):
# MONGODB_URI=mongodb://localhost:27017/mental-health-platform

# 2. Restart server (press Ctrl+C to stop, then):
npm run dev
```


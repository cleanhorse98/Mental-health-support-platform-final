# How to Run Mental Health Support Platform

## ⚡ Quick Start (PowerShell)

```powershell
# 1. Navigate to the nested project folder
cd Mental-health-support-platform-main

# 2. Install dependencies (already done if you see this)
npm install

# 3. Create .env file (if not exists) with MongoDB connection
# See Step 5 below for .env content

# 4. Start MongoDB (if using local MongoDB)

# 5. Start the server
npm start
# OR for development with auto-restart:
npm run dev

# 6. Open browser to: http://localhost:3000
```

## Quick Start Guide

### Step 1: Install Node.js
Make sure you have Node.js installed (version 14 or higher).
- Download from: https://nodejs.org/
- Verify installation: Open terminal and run `node --version`

### Step 2: Install MongoDB

**Option A: Local MongoDB (Recommended for Development)**
1. Download MongoDB Community Server from: https://www.mongodb.com/try/download/community
2. Install and start MongoDB service
3. MongoDB will run on `mongodb://localhost:27017` by default

**Option B: MongoDB Atlas (Cloud - Free)**
1. Go to: https://www.mongodb.com/cloud/atlas
2. Create a free account
3. Create a new cluster
4. Get your connection string
5. Update `MONGODB_URI` in `.env` file with your Atlas connection string

### Step 3: Navigate to Project Directory
**IMPORTANT:** The project files are in a nested folder. Navigate to the correct directory:

```powershell
# If you're in: C:\Users\prane\Downloads\Mental-health-support-platform-main
# Navigate to the nested folder:
cd Mental-health-support-platform-main

# Verify you're in the right place (should show package.json exists):
Test-Path package.json
# Should return: True

# Your current path should be:
# C:\Users\prane\Downloads\Mental-health-support-platform-main\Mental-health-support-platform-main
```

### Step 4: Install Dependencies
```powershell
npm install
```

**Note:** If you see warnings about deprecated packages or vulnerabilities, that's normal. The project will still work. You can run `npm audit fix` later if needed.

This will install all required packages listed in `package.json`.

### Step 5: Configure Environment Variables
The `.env` file has been created with default values. If using MongoDB Atlas, update the `MONGODB_URI` in the `.env` file.

### Step 6: Start MongoDB (if using local MongoDB)
**Windows:**
- MongoDB should start automatically as a service
- Or run: `mongod` in a separate terminal

**Mac/Linux:**
```bash
sudo systemctl start mongod
# or
mongod
```

### Step 7: Run the Application

**Development Mode (with auto-restart):**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

### Step 8: Access the Application
Open your browser and go to:
```
http://localhost:3000
```

## Troubleshooting

### MongoDB Connection Error
- **Error:** "MongoDB connection error"
- **Solution:** 
  - Make sure MongoDB is running (check with `mongosh` or MongoDB Compass)
  - Verify the connection string in `.env` file
  - For Atlas: Check your IP is whitelisted and credentials are correct

### Port Already in Use
- **Error:** "Port 3000 is already in use"
- **Solution:** 
  - Change `PORT=3000` to another port (e.g., `PORT=3001`) in `.env` file
  - Or stop the process using port 3000

### Module Not Found
- **Error:** "Cannot find module"
- **Solution:** Run `npm install` again

### Dependencies Installation Issues
- **Solution:** 
  - Delete `node_modules` folder
  - Delete `package-lock.json`
  - Run `npm install` again

## First Time Setup Checklist

- [ ] Node.js installed (v14+)
- [ ] MongoDB installed and running (local or Atlas)
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file configured
- [ ] Server started (`npm start` or `npm run dev`)
- [ ] Browser opened to `http://localhost:3000`

## Creating Your First Account

1. Click "Register" button
2. Fill in the registration form:
   - Username
   - Email
   - Password
   - First Name, Last Name
   - Student ID
   - Department
   - Year
3. Click "Create Account"
4. You'll be automatically logged in

## Features Available

- ✅ Home Page (default view)
- ✅ User Authentication (Login/Register)
- ✅ Resources Hub
- ✅ Journal/Feelings Wall
- ✅ Peer Support Forum
- ✅ Chat with Counselors
- ✅ Mood Tracker
- ✅ Admin Dashboard (for admin users)

## Development Tips

- Use `npm run dev` for development (auto-restarts on file changes)
- Check browser console (F12) for any JavaScript errors
- Check terminal for server logs and errors
- MongoDB data is stored in your local database or Atlas cluster

## Need Help?

- Check the console logs for error messages
- Verify MongoDB is running
- Ensure all environment variables are set correctly
- Make sure port 3000 (or your configured port) is available


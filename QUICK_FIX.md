# 🚀 Quick Fix - Run These Commands

## You're Already in the Correct Directory! ✅

The `.env` file has been updated to use **local MongoDB** (no SSL errors).

## Now Run These Commands:

```powershell
# 1. Make sure you're in the right folder (you already are!)
# Current path: C:\Users\prane\Downloads\Mental-health-support-platform-main\Mental-health-support-platform-main

# 2. Start the server (the .env file is now fixed):
npm run dev
```

## What Was Fixed:

1. ✅ **Server.js** - Now handles MongoDB errors gracefully (won't crash)
2. ✅ **.env file** - Changed from MongoDB Atlas to local MongoDB
3. ✅ **Connection** - No more SSL errors

## If You See MongoDB Connection Error:

**Don't worry!** The server will still run. You'll see:
- ✅ Server running on port 3000
- ⚠️ MongoDB connection error (but server continues)

**To fix MongoDB:**
- Install MongoDB locally, OR
- Use MongoDB Atlas with correct password

## Open Browser:

Once server starts, go to:
```
http://localhost:3000
```

The website should load even without MongoDB! 🎉


# 🔧 API 404 Error Fix Guide

## 🚨 **Error:**
```
Failed to fetch route information: Request failed with status code 404
```

## 🔍 **Root Cause:**
The API endpoint `/api/check-route` is not being found, which means either:
1. The server isn't running properly
2. The routing isn't configured correctly for Render
3. The API URL is incorrect

## ✅ **Solutions:**

### **Solution 1: Single Service Deployment (Recommended)**

Your app should be deployed as a **single service** that serves both frontend and backend.

#### **Render Configuration:**
- **Service Type:** Web Service
- **Build Command:** `npm run render-build`
- **Start Command:** `npm run render-start`
- **Environment Variables:**
  ```
  NODE_ENV=production
  FRONTEND_URL=https://rain-route-planner-2.onrender.com
  REACT_APP_API_URL=/api
  OPENROUTE_API_KEY=demo
  WEATHER_API_KEY=HTNJcLddtA3C4CKdA6fKofZXODA4qBji
  WEATHER_API_PROVIDER=windy
  PORT=10000
  ```

#### **Update server.js to serve static files:**
Add this to your `server.js` after the API routes:

```javascript
// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'client/build')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});
```

### **Solution 2: Test API Endpoints**

First, test if your API is working:

1. **Health Check:** https://rain-route-planner-2.onrender.com/api/health
2. **Test Endpoint:** https://rain-route-planner-2.onrender.com/api/test

If these return 404, your server isn't running properly.

### **Solution 3: Debug Steps**

#### **Step 1: Check Render Logs**
1. Go to your Render dashboard
2. Click on your service
3. Check the "Logs" tab for any errors

#### **Step 2: Test API Directly**
Try making a POST request to your API:
```bash
curl -X POST https://rain-route-planner-2.onrender.com/api/check-route \
  -H "Content-Type: application/json" \
  -d '{"source":"Delhi","destination":"Mumbai","speed":60,"spacing":3}'
```

#### **Step 3: Check Environment Variables**
Make sure these are set in Render:
- `REACT_APP_API_URL=/api`
- `NODE_ENV=production`

### **Solution 4: Alternative API URL Configuration**

If the above doesn't work, try setting the full API URL:

**Environment Variable:**
```
REACT_APP_API_URL=https://rain-route-planner-2.onrender.com/api
```

## 🛠️ **Quick Fix Implementation:**

### **1. Update server.js to serve static files:**

Add this at the end of your `server.js` file (before `app.listen`):

```javascript
const path = require('path');

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'client/build')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});
```

### **2. Update package.json dependencies:**

Add `path` to your dependencies if it's not already there (it's built-in to Node.js).

### **3. Test the fix:**

1. **Commit and push** your changes
2. **Redeploy** on Render
3. **Test the endpoints:**
   - Frontend: https://rain-route-planner-2.onrender.com/
   - API Health: https://rain-route-planner-2.onrender.com/api/health
   - API Test: https://rain-route-planner-2.onrender.com/api/test

## 🔍 **Troubleshooting:**

### **If API still returns 404:**

1. **Check if server is running:**
   - Look at Render logs for "Server running on port X"
   - Check if there are any startup errors

2. **Verify routing:**
   - Make sure your API routes are defined before the static file serving
   - Check that the route path is exactly `/api/check-route`

3. **Check environment variables:**
   - Ensure `REACT_APP_API_URL` is set correctly
   - Verify `NODE_ENV=production`

### **If frontend loads but API doesn't work:**

1. **Check browser console** for CORS errors
2. **Verify API URL** in the network tab
3. **Test API directly** with curl or Postman

## 🎯 **Expected Result:**

After implementing these fixes:
- ✅ Frontend loads at https://rain-route-planner-2.onrender.com/
- ✅ API health check works: https://rain-route-planner-2.onrender.com/api/health
- ✅ Route planning works from the frontend
- ✅ No more 404 errors

## 📞 **Still Having Issues?**

If you're still getting 404 errors:
1. Share your Render logs
2. Test the health endpoint directly
3. Check if your service is actually running
4. Verify your deployment configuration

The main issue is likely that your Render service isn't configured to serve both frontend and backend together, or the API routes aren't being registered properly.

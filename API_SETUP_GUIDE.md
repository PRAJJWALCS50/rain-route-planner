# 🌤️ OpenWeatherMap API Setup Guide

## Step 1: Get Your Free API Key

1. Go to: https://openweathermap.org/api
2. Click "Sign Up" (it's free!)
3. Verify your email
4. Go to "API Keys" section
5. Copy your API key

## Step 2: Set Up Environment Variables

### Option A: Create .env file (Recommended)
Create a `.env` file in your project root with:
```
WEATHER_API_KEY=your_actual_api_key_here
PORT=5001
```

### Option B: Set Environment Variable
```bash
# Windows (PowerShell)
$env:WEATHER_API_KEY="your_actual_api_key_here"

# Windows (Command Prompt)
set WEATHER_API_KEY=your_actual_api_key_here

# Linux/Mac
export WEATHER_API_KEY="your_actual_api_key_here"
```

## Step 3: Restart Server
```bash
node server.js
```

## Step 4: Test
The system will now use real forecast data instead of mock data!

## What You'll Get:
- ✅ **Real Weather Forecasts**: Actual 5-day/3-hour forecast data
- ✅ **ETA-Based Weather**: Each waypoint gets weather for its arrival time
- ✅ **Different Routes**: Patiala vs Delhi routes will show different weather conditions
- ✅ **Time-Aware**: Weather changes based on when you'll actually arrive

## Free Tier Limits:
- 1,000 API calls per day
- 60 calls per minute
- Perfect for development and testing!

## Example:
- **Patiala to Rampur** (436km, 5+ hours): Weather for 5+ hours later
- **Delhi to Rampur** (203km, 2+ hours): Weather for 2+ hours later
- **Different ETAs = Different Weather Conditions!**

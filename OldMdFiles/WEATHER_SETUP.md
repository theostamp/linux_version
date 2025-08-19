# Weather API Setup Guide

## Overview
The dashboard now includes weather information in the welcome banner. It uses multiple weather APIs for better reliability:
1. **OpenWeatherMap API** (primary) - requires API key
2. **Open-Meteo API** (fallback) - free, no API key required
3. **Demo data** (final fallback) - for development/testing

## Setup Instructions

### 1. Get OpenWeatherMap API Key (Optional)
1. Go to [OpenWeatherMap](https://openweathermap.org/api)
2. Sign up for a free account
3. Go to "My API Keys" section
4. Copy your API key (it should look like: `1234567890abcdef1234567890abcdef`)
5. The free tier allows 1000 calls per day (sufficient for development)

### 2. Configure Environment Variables
Add the following to your `.env.local` file:

```env
NEXT_PUBLIC_OPENWEATHER_API_KEY="your-openweathermap-api-key-here"
```

**Important**: 
- Make sure you're using the OpenWeatherMap API key, not a Google API key
- The OpenWeatherMap API key should be 32 characters long and contain only letters and numbers
- If you don't have an API key, the system will automatically use the free fallback API

### 3. Features
- **Current Temperature**: Displays in Celsius
- **Weather Condition**: Shows current weather description in Greek
- **Weather Icons**: Different icons for sunny, cloudy, rainy, snowy conditions
- **Multiple Fallbacks**: If one API fails, it tries the next one
- **Demo Data**: If all APIs fail, shows demo data (22°C, Αίθριος)

### 4. Location
Currently set to Athens coordinates (37.9838, 23.7275). You can modify the coordinates in the dashboard component to match your building's location.

### 5. API Endpoints
The app tries these APIs in order:

1. **OpenWeatherMap** (if API key provided):
```
https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={API_KEY}&units=metric&lang=el
```

2. **Open-Meteo** (free fallback):
```
https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,weather_code&timezone=auto
```

### 6. Weather Icons
- ☀️ Sunny (Clear)
- ☁️ Cloudy (Clouds)
- 🌧️ Rainy (Rain)
- ❄️ Snowy (Snow)
- 🌡️ Default (Other conditions)

## Troubleshooting
- **401 Unauthorized Error**: This usually means you're using the wrong API key (e.g., Google API key instead of OpenWeatherMap)
- **API Key Format**: OpenWeatherMap keys are 32 characters long, containing only letters and numbers
- **No API Key**: The system will automatically use the free Open-Meteo API
- **All APIs Fail**: The system will show demo data (22°C, Αίθριος)
- **Check Browser Console**: Look for weather-related error messages

## Cost
- **OpenWeatherMap**: Free tier: 1000 calls/day
- **Open-Meteo**: Completely free, no API key required
- **Demo Data**: Always available as final fallback

## Reliability
The system is designed to be highly reliable:
1. Tries OpenWeatherMap first (if API key provided)
2. Falls back to Open-Meteo (free, no key required)
3. Shows demo data if all else fails

This ensures weather information is always available, even if APIs are down or keys are invalid. 
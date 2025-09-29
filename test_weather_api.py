#!/usr/bin/env python3
"""
Test Weather API (Open-Meteo)
"""

import requests
import json

def test_weather_api():
    """Test weather API"""
    
    print("🌤️ Testing Weather API")
    print("=" * 50)
    
    # Test Open-Meteo API directly
    try:
        # Athens coordinates
        lat = 37.9838
        lon = 23.7275
        
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=Europe%2FAthens"
        response = requests.get(url)
        
        if response.status_code == 200:
            data = response.json()
            current = data.get('current', {})
            print(f"✅ Open-Meteo API working")
            print(f"   - Temperature: {current.get('temperature_2m', 'N/A')}°C")
            print(f"   - Humidity: {current.get('relative_humidity_2m', 'N/A')}%")
            print(f"   - Weather Code: {current.get('weather_code', 'N/A')}")
            print(f"   - Time: {current.get('time', 'N/A')}")
        else:
            print(f"❌ Open-Meteo API failed: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error testing Open-Meteo API: {e}")

if __name__ == "__main__":
    test_weather_api()

import { NextResponse } from 'next/server';
import { fetchWeatherData } from '@/lib/weather-api';

export async function GET() {
  try {
    const weatherData = await fetchWeatherData();
    return NextResponse.json(weatherData);
  } catch (error) {
    console.error('Weather API error:', error);

    // Return fallback data
    return NextResponse.json({
      temperature: 22,
      weathercode: 1,
      description: 'Καθαρός ουρανός',
      location: 'Αθήνα, Ελλάδα',
      humidity: 65,
      wind_speed: 12,
      visibility: 10
    });
  }
}

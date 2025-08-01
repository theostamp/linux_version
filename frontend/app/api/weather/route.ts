import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const latitude = searchParams.get('latitude');
  const longitude = searchParams.get('longitude');
  const city = searchParams.get('city');

  // Validate parameters
  if (!latitude || !longitude) {
    return NextResponse.json(
      { error: 'Latitude and longitude are required' },
      { status: 400 }
    );
  }

  try {
    // Fetch weather data from Open-Meteo API
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=Europe%2FAthens`
    );

    if (!response.ok) {
      throw new Error(`Weather API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Get weather description based on weather code
    const weatherDescription = getWeatherDescription(data.current_weather.weathercode);
    
    return NextResponse.json({
      temperature: data.current_weather.temperature,
      weathercode: data.current_weather.weathercode,
      description: weatherDescription,
      city: city || 'Unknown',
      coordinates: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching weather data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weather data' },
      { status: 500 }
    );
  }
}

function getWeatherDescription(code: number): string {
  const weatherMap: Record<number, string> = {
    0: 'Αίθριος',
    1: 'Κυρίως καθαρός',
    2: 'Λίγα σύννεφα',
    3: 'Συννεφιά',
    45: 'Ομίχλη',
    48: 'Ομίχλη',
    51: 'Ασθενής ψιχάλα',
    53: 'Ψιχάλα',
    55: 'Έντονη ψιχάλα',
    61: 'Ασθενής βροχή',
    63: 'Μέτρια βροχή',
    65: 'Ισχυρή βροχή',
    80: 'Περιστασιακή βροχή',
    95: 'Καταιγίδα',
  };
  return weatherMap[code] || 'Άγνωστο';
} 
// Weather API service for kiosk application

export interface WeatherData {
  temperature: number;
  weathercode: number;
  description: string;
  humidity?: number;
  wind_speed?: number;
  visibility?: number;
  location: string;
  forecast?: Array<{
    date: string;
    temperature_max: number;
    temperature_min: number;
    weathercode: number;
  }>;
}

export interface WeatherApiResponse {
  current_weather: {
    temperature: number;
    weathercode: number;
  };
  daily?: {
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weathercode: number[];
    time: string[];
  };
}

// Weather code descriptions
const WEATHER_DESCRIPTIONS: Record<number, string> = {
  0: 'Καθαρός ουρανός',
  1: 'Κυρίως καθαρός',
  2: 'Μερικώς νεφελώδης',
  3: 'Νεφελώδης',
  45: 'Ομίχλη',
  48: 'Ομίχλη με παγετό',
  51: 'Αδύναμη βροχή',
  53: 'Μέτρια βροχή',
  55: 'Ισχυρή βροχή',
  61: 'Αδύναμη βροχή',
  63: 'Μέτρια βροχή',
  65: 'Ισχυρή βροχή',
  71: 'Αδύναμο χιόνι',
  73: 'Μέτριο χιόνι',
  75: 'Ισχυρό χιόνι',
  80: 'Αδύναμη βροχόπτωση',
  81: 'Μέτρια βροχόπτωση',
  82: 'Ισχυρή βροχόπτωση',
  95: 'Καταιγίδα',
  96: 'Καταιγίδα με χαλαζόπτωση',
  99: 'Ισχυρή καταιγίδα'
};

export async function fetchWeatherData(): Promise<WeatherData> {
  try {
    // Use Open-Meteo API (free weather service)
    const response = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=37.9755&longitude=23.7348&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=Europe%2FAthens'
    );
    
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }
    
    const data: WeatherApiResponse = await response.json();
    
    return {
      temperature: Math.round(data.current_weather.temperature),
      weathercode: data.current_weather.weathercode,
      description: WEATHER_DESCRIPTIONS[data.current_weather.weathercode] || 'Άγνωστο',
      location: 'Αθήνα, Ελλάδα',
      forecast: data.daily ? data.daily.time.slice(0, 3).map((date, index) => ({
        date,
        temperature_max: Math.round(data.daily!.temperature_2m_max[index]),
        temperature_min: Math.round(data.daily!.temperature_2m_min[index]),
        weathercode: data.daily!.weathercode[index]
      })) : undefined
    };
  } catch (error) {
    console.error('Failed to fetch weather data:', error);
    
    // Return mock data on error
    return {
      temperature: 22,
      weathercode: 1,
      description: 'Καθαρός ουρανός',
      location: 'Αθήνα, Ελλάδα',
      humidity: 65,
      wind_speed: 12,
      visibility: 10
    };
  }
}

export async function fetchWeatherWithFallback(): Promise<WeatherData> {
  try {
    // Try local API first
    const localResponse = await fetch('/api/weather');
    if (localResponse.ok) {
      return await localResponse.json();
    }
  } catch (error) {
    console.log('Local weather API not available, using Open-Meteo');
  }
  
  // Fallback to Open-Meteo
  return fetchWeatherData();
}

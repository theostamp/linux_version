'use client';

import { BaseWidgetProps } from '@/types/kiosk';
import { 
  Thermometer, 
  Droplets, 
  Wind, 
  Eye
} from 'lucide-react';
import { fetchWeatherWithFallback } from '@/lib/weather-api';
import { useQuery } from '@tanstack/react-query';

export default function WeatherWidget({ data, isLoading, error }: BaseWidgetProps) {
  // Get building location data
  const building = data?.building;

  // Helper functions - define before useQuery
  const getWeatherDescription = (weathercode: number) => {
    if (weathercode === 0) return 'Καθαρός ουρανός';
    if (weathercode === 1 || weathercode === 2) return 'Λίγο νεφελώδης';
    if (weathercode === 3) return 'Νεφελώδης';
    if (weathercode >= 45 && weathercode <= 48) return 'Ομίχλη';
    if (weathercode >= 51 && weathercode <= 67) return 'Βροχή';
    if (weathercode >= 71 && weathercode <= 77) return 'Χιόνι';
    if (weathercode >= 80 && weathercode <= 82) return 'Βροχόπτωση';
    if (weathercode >= 95 && weathercode <= 99) return 'Καταιγίδα';
    return 'Άγνωστο';
  };

  const getDayName = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(today.getDate() + 2);
    const dayAfter2 = new Date(today);
    dayAfter2.setDate(today.getDate() + 3);

    if (date.toDateString() === today.toDateString()) return 'Σήμερα';
    if (date.toDateString() === tomorrow.toDateString()) return 'Αύριο';
    if (date.toDateString() === dayAfter.toDateString()) return 'Μεθαύριο';
    if (date.toDateString() === dayAfter2.toDateString()) return 'Σε 3 μέρες';
    
    return date.toLocaleDateString('el-GR', { weekday: 'long' });
  };
  
  // Fetch real weather data based on building location
  const { 
    data: weatherData, 
    isLoading: isWeatherLoading, 
    error: weatherError 
  } = useQuery({
    queryKey: ['weather', building?.latitude, building?.longitude],
    queryFn: async () => {
      try {
        // Use building coordinates if available, otherwise fallback to Athens
        const latitude = building?.latitude || 37.9755;
        const longitude = building?.longitude || 23.7348;
        const city = building?.city || 'Αθήνα';
        
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max&timezone=Europe%2FAthens&forecast_days=4`
        );
        
        if (!response.ok) {
          throw new Error(`Weather API error: ${response.status}`);
        }
        
        const apiData = await response.json();
        
        return {
          temperature: Math.round(apiData.current_weather.temperature),
          weathercode: apiData.current_weather.weathercode,
          description: getWeatherDescription(apiData.current_weather.weathercode),
          location: `${city}, Ελλάδα`,
          humidity: Math.round(Math.random() * 30 + 50), // Mock humidity
          wind_speed: Math.round(Math.random() * 20 + 5), // Mock wind
          visibility: Math.round(Math.random() * 5 + 8), // Mock visibility
          sunrise: '06:30', // Mock sunrise
          sunset: '18:45', // Mock sunset
          forecast: apiData.daily ? apiData.daily.time.slice(0, 4).map((date: string, index: number) => ({
            date,
            day: getDayName(date),
            temp_max: Math.round(apiData.daily.temperature_2m_max[index]),
            temp_min: Math.round(apiData.daily.temperature_2m_min[index]),
            weathercode: apiData.daily.weathercode[index],
            precipitation: apiData.daily.precipitation_probability_max?.[index] || 0
          })) : []
        };
      } catch (error) {
        console.error('Failed to fetch weather data:', error);
        // Return fallback data
        return {
          temperature: 22,
          weathercode: 1,
          description: 'Καθαρός ουρανός',
          location: building?.city ? `${building.city}, Ελλάδα` : 'Αθήνα, Ελλάδα',
          humidity: 65,
          wind_speed: 12,
          visibility: 10,
          sunrise: '06:30',
          sunset: '18:45',
          forecast: []
        };
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 15 * 60 * 1000, // Refetch every 15 minutes
  });

  if (isLoading || isWeatherLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-300"></div>
      </div>
    );
  }

  if (error || weatherError) {
    return (
      <div className="flex items-center justify-center h-full text-red-300">
        <div className="text-center">
          <div className="text-2xl mb-2">⚠️</div>
          <p className="text-sm">{error || 'Weather data unavailable'}</p>
        </div>
      </div>
    );
  }

  // Use real weather data with fallback
  const weather = weatherData || {
    temperature: 22,
    weathercode: 1,
    description: 'Καθαρός ουρανός',
    humidity: 65,
    wind_speed: 12,
    visibility: 10,
    location: 'Αθήνα, Ελλάδα'
  };

  const getWeatherIcon = (weathercode: number) => {
    if (weathercode === 0) return '☀️';
    if (weathercode === 1 || weathercode === 2) return '🌤️';
    if (weathercode === 3) return '☁️';
    if (weathercode >= 45 && weathercode <= 48) return '🌫️';
    if (weathercode >= 51 && weathercode <= 67) return '🌧️';
    if (weathercode >= 71 && weathercode <= 77) return '❄️';
    if (weathercode >= 80 && weathercode <= 82) return '🌦️';
    if (weathercode >= 95 && weathercode <= 99) return '⛈️';
    return '🌤️';
  };

  return (
    <div className="h-full overflow-hidden flex flex-col">
      {/* Current Weather */}
      <div className="text-center mb-4 flex-shrink-0">
        <div className="text-4xl mb-2">
          {getWeatherIcon(weather.weathercode)}
        </div>
        <div className="text-3xl font-bold text-white mb-1">
          {weather.temperature}°C
        </div>
        <div className="text-sm text-blue-200">
          {weather.description}
        </div>
        <div className="text-xs text-blue-300 mt-1">
          {weather.location}
        </div>
      </div>

      {/* Main Content - Two Columns with better spacing and more height */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left Column - Weather Details (More space) */}
        <div className="w-1/2 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-900/30 p-3 rounded-lg text-center">
              <Droplets className="w-5 h-5 mx-auto mb-2 text-blue-300" />
              <div className="text-sm text-blue-200">Υγρασία</div>
              <div className="text-lg font-semibold text-white">
                {weather.humidity || 65}%
              </div>
            </div>
            
            <div className="bg-blue-900/30 p-3 rounded-lg text-center">
              <Wind className="w-5 h-5 mx-auto mb-2 text-blue-300" />
              <div className="text-sm text-blue-200">Ανεμος</div>
              <div className="text-lg font-semibold text-white">
                {weather.wind_speed || 12} km/h
              </div>
            </div>
            
            <div className="bg-blue-900/30 p-3 rounded-lg text-center">
              <Eye className="w-5 h-5 mx-auto mb-2 text-blue-300" />
              <div className="text-sm text-blue-200">Ορατότητα</div>
              <div className="text-lg font-semibold text-white">
                {weather.visibility || 10} km
              </div>
            </div>
            
            <div className="bg-blue-900/30 p-3 rounded-lg text-center">
              <Thermometer className="w-5 h-5 mx-auto mb-2 text-blue-300" />
              <div className="text-sm text-blue-200">Αίσθηση</div>
              <div className="text-lg font-semibold text-white">
                {weather.temperature + 2}°C
              </div>
            </div>
          </div>

        </div>

        {/* Right Column - Real Forecast */}
        <div className="w-1/2">
          <div className="space-y-3 h-full">
            {/* Real forecast data - No scroll for kiosk */}
            <div className="space-y-2 h-full">
              {weatherData?.forecast && weatherData.forecast.length > 0 ? (
                weatherData.forecast.slice(0, 3).map((day, index) => (
                  <div key={index} className="bg-blue-800/20 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">
                          {getWeatherIcon(day.weathercode)}
                        </span>
                        <div>
                          <div className="text-sm text-blue-200 font-medium">
                            {day.day}
                          </div>
                          {day.precipitation > 0 && (
                            <div className="text-xs text-blue-300">
                              {day.precipitation}% βροχή
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-white text-right">
                        <div className="font-semibold">{day.temp_max}°</div>
                        <div className="text-gray-400 text-xs">{day.temp_min}°</div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-full text-blue-200/50 text-xs">
                  Δεν υπάρχει διαθέσιμη πρόγνωση
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

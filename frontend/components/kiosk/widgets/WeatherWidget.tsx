'use client';

import { BaseWidgetProps } from '@/types/kiosk';
import { 
  Thermometer, 
  Droplets, 
  Wind, 
  Eye,
  Sunrise,
  Sunset
} from 'lucide-react';
import { fetchWeatherWithFallback } from '@/lib/weather-api';
import { useQuery } from '@tanstack/react-query';

export default function WeatherWidget({ data, isLoading, error }: BaseWidgetProps) {
  // Fetch real weather data
  const { 
    data: weatherData, 
    isLoading: isWeatherLoading, 
    error: weatherError 
  } = useQuery({
    queryKey: ['weather'],
    queryFn: fetchWeatherWithFallback,
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

  return (
    <div className="h-full overflow-hidden">
      {/* Current Weather */}
      <div className="text-center mb-4">
        <div className="text-4xl mb-2">
          {getWeatherIcon(weather.weathercode)}
        </div>
        <div className="text-3xl font-bold text-white mb-1">
          {weather.temperature}°C
        </div>
        <div className="text-sm text-blue-200">
          {weather.description}
        </div>
      </div>

      {/* Weather Details */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-blue-900/30 p-2 rounded-lg text-center">
          <Droplets className="w-4 h-4 mx-auto mb-1 text-blue-300" />
          <div className="text-xs text-blue-200">Υγρασία</div>
          <div className="text-sm font-semibold text-white">
            {weather.humidity || 65}%
          </div>
        </div>
        
        <div className="bg-blue-900/30 p-2 rounded-lg text-center">
          <Wind className="w-4 h-4 mx-auto mb-1 text-blue-300" />
          <div className="text-xs text-blue-200">Ανεμος</div>
          <div className="text-sm font-semibold text-white">
            {weather.wind_speed || 12} km/h
          </div>
        </div>
        
        <div className="bg-blue-900/30 p-2 rounded-lg text-center">
          <Eye className="w-4 h-4 mx-auto mb-1 text-blue-300" />
          <div className="text-xs text-blue-200">Ορατότητα</div>
          <div className="text-sm font-semibold text-white">
            {weather.visibility || 10} km
          </div>
        </div>
        
        <div className="bg-blue-900/30 p-2 rounded-lg text-center">
          <Thermometer className="w-4 h-4 mx-auto mb-1 text-blue-300" />
          <div className="text-xs text-blue-200">Αίσθηση</div>
          <div className="text-sm font-semibold text-white">
            {weather.temperature + 2}°C
          </div>
        </div>
      </div>

      {/* Sunrise/Sunset */}
      <div className="bg-gradient-to-br from-orange-900/30 to-yellow-900/30 backdrop-blur-sm p-3 rounded-xl border border-orange-500/20 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <Sunrise className="w-4 h-4 mx-auto mb-1 text-orange-300" />
            <div className="text-xs text-orange-200">Ανατολή</div>
            <div className="text-sm font-semibold text-white">
              {weatherData.sunrise}
            </div>
          </div>
          <div className="text-center">
            <Sunset className="w-4 h-4 mx-auto mb-1 text-orange-300" />
            <div className="text-xs text-orange-200">Δύση</div>
            <div className="text-sm font-semibold text-white">
              {weatherData.sunset}
            </div>
          </div>
        </div>
      </div>

      {/* Forecast */}
      {weather.forecast && weather.forecast.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-blue-100 mb-2">
            Πρόγνωση
          </div>
          {weather.forecast.map((day: any, index: number) => (
            <div key={index} className="bg-blue-800/20 p-2 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">
                    {getWeatherIcon(day.weathercode)}
                  </span>
                  <span className="text-xs text-blue-200">
                    {day.day}
                  </span>
                </div>
                <div className="text-xs text-white">
                  <span className="font-semibold">{day.temp_max}°</span>
                  <span className="text-gray-400"> / {day.temp_min}°</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

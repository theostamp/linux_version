'use client';

import { useEffect, useState } from 'react';
import { Sun, Cloud, CloudRain, MapPin, ExternalLink } from 'lucide-react';
import { useKioskWidgets } from '@/hooks/useKioskWidgets';

interface WeatherData {
  temperature: number;
  weathercode: number;
  description: string;
}

interface AdvertisingBanner {
  id: number;
  title: string;
  description: string;
  image_url: string;
  link: string;
  duration: number;
}

interface KioskTopBarProps {
  buildingId?: number;
}

export default function KioskTopBar({ buildingId }: KioskTopBarProps = {}) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [loading, setLoading] = useState(true);

  // Get enabled widgets from configuration
  const { getEnabledWidgets } = useKioskWidgets(buildingId);
  const enabledTopBarWidgets = getEnabledWidgets('top_bar_widgets');

  // Mock advertising banners - you can replace these with real data from your API
  const advertisingBanners: AdvertisingBanner[] = [
    {
      id: 1,
      title: 'Καθαριστικές Υπηρεσίες',
      description: 'Εξειδικευμένες καθαριστικές υπηρεσίες για πολυκατοικίες',
      image_url: '/api/static/banners/cleaning.jpg',
      link: 'https://example.com/cleaning',
      duration: 5000,
    },
    {
      id: 2,
      title: 'Ασφάλεια & Συστήματα',
      description: 'Συστήματα ασφαλείας και παρακολούθησης',
      image_url: '/api/static/banners/security.jpg',
      link: 'https://example.com/security',
      duration: 5000,
    },
  ];

  // Load weather data
  useEffect(() => {
    async function loadWeather() {
      try {
        const response = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=37.98&longitude=23.72&current_weather=true&timezone=Europe%2FAthens'
        );
        if (response.ok) {
          const data = await response.json();
          const { temperature, weathercode } = data.current_weather;
          const description = getWeatherDescription(weathercode);
          setWeather({ temperature, weathercode, description });
        }
      } catch (error) {
        console.error('Failed to load weather:', error);
      } finally {
        setLoading(false);
      }
    }
    loadWeather();
  }, []);

  // Rotate advertising banners
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % advertisingBanners.length);
    }, 8000); // Change banner every 8 seconds

    return () => clearInterval(interval);
  }, [advertisingBanners.length]);

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

  function getWeatherIcon(code: number) {
    if (code === 0) return <Sun className="w-6 h-6 text-yellow-500" />;
    if (code >= 1 && code <= 3) return <Cloud className="w-6 h-6 text-gray-500" />;
    if (code >= 45 && code <= 48) return <Cloud className="w-6 h-6 text-gray-400" />;
    if (code >= 51 && code <= 55) return <CloudRain className="w-6 h-6 text-blue-500" />;
    if (code >= 61 && code <= 65) return <CloudRain className="w-6 h-6 text-blue-600" />;
    if (code >= 80 && code <= 95) return <CloudRain className="w-6 h-6 text-blue-700" />;
    return <Cloud className="w-6 h-6 text-gray-500" />;
  }

  // Helper function to check if a widget is enabled
  const isWidgetEnabled = (widgetId: string) => {
    return enabledTopBarWidgets.some(w => w.id === widgetId);
  };

  // If no widgets are enabled, don't render anything
  if (enabledTopBarWidgets.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4">
      <div className="flex items-center justify-between">
        {/* Weather Widget - Only show if enabled */}
        {isWidgetEnabled('weather_widget_topbar') && (
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span className="text-sm">Φόρτωση...</span>
              </div>
            ) : weather ? (
              <>
                {getWeatherIcon(weather.weathercode)}
                <div>
                  <div className="text-lg font-bold">{weather.temperature}°C</div>
                  <div className="text-xs opacity-90">{weather.description}</div>
                </div>
                <div className="flex items-center text-xs opacity-75">
                  <MapPin className="w-3 h-3 mr-1" />
                  Αθήνα
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Cloud className="w-5 h-5" />
                <span className="text-sm">Δεν ήταν δυνατή η φόρτωση του καιρού</span>
              </div>
            )}
          </div>
          </div>
        )}

        {/* Advertisement Banners - Only show if enabled */}
        {isWidgetEnabled('advertising_banners_topbar') && (
          <div className="flex items-center space-x-4">
          {advertisingBanners.map((banner, index) => (
            <div
              key={banner.id}
              className={`transition-all duration-500 ${
                index === currentBanner ? 'opacity-100 scale-100' : 'opacity-0 scale-95 absolute'
              }`}
              style={{ display: index === currentBanner ? 'block' : 'none' }}
            >
              <div className="bg-white/15 backdrop-blur-sm rounded-lg p-3 border border-white/20 hover:bg-white/20 transition-colors duration-200 cursor-pointer">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <ExternalLink className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{banner.title}</h3>
                    <p className="text-xs opacity-90 line-clamp-1">{banner.description}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {/* Banner Navigation Dots */}
          <div className="flex space-x-1">
            {advertisingBanners.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentBanner(index)}
                className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                  index === currentBanner
                    ? 'bg-white'
                    : 'bg-white/50 hover:bg-white/75'
                }`}
              />
            ))}
          </div>
          </div>
        )}
      </div>
    </div>
  );
} 
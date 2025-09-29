'use client';

import { useState, useEffect } from 'react';
import { 
  Thermometer, 
  Globe, 
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface KioskTopBarProps {
  buildingId?: number;
}

interface WeatherData {
  temperature: number;
  weathercode: number;
  description: string;
  location: string;
}

interface AdvertisingBanner {
  id: number;
  title: string;
  description: string;
  image: string;
  link?: string;
  duration: number;
}

export default function KioskTopBar({ buildingId }: KioskTopBarProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Mock advertising banners
  const advertisingBanners: AdvertisingBanner[] = [
    {
      id: 1,
      title: 'Καθαριστικές Υπηρεσίες',
      description: 'Εξειδικευμένες καθαριστικές υπηρεσίες για πολυκατοικίες',
      image: '🧽',
      link: 'https://example.com/cleaning',
      duration: 5000
    },
    {
      id: 2,
      title: 'Ασφάλεια & Συστήματα',
      description: 'Συστήματα ασφαλείας και παρακολούθησης 24/7',
      image: '🔒',
      link: 'https://example.com/security',
      duration: 5000
    },
    {
      id: 3,
      title: 'Συντήρηση & Επισκευές',
      description: 'Γρήγορη και αξιόπιστη συντήρηση κτιρίων',
      image: '🔧',
      link: 'https://example.com/maintenance',
      duration: 5000
    },
    {
      id: 4,
      title: 'Ηλεκτρολογικές Επισκευές',
      description: 'Επαγγελματικές ηλεκτρολογικές υπηρεσίες',
      image: '⚡',
      link: 'https://example.com/electrical',
      duration: 5000
    }
  ];

  // Load weather data
  useEffect(() => {
    const loadWeather = async () => {
      try {
        const response = await fetch('/api/weather');
        if (response.ok) {
          const data = await response.json();
          setWeather({
            temperature: data.temperature,
            weathercode: data.weathercode,
            description: data.description,
            location: data.location || 'Αθήνα, Ελλάδα'
          });
        } else {
          throw new Error('Weather API not available');
        }
      } catch (error) {
        console.error('Failed to load weather:', error);
        // Set mock weather data if API fails
        setWeather({
          temperature: 22,
          weathercode: 1,
          description: 'Καθαρός ουρανός',
          location: 'Αθήνα, Ελλάδα'
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadWeather();
    
    // Refresh weather data every 15 minutes
    const interval = setInterval(loadWeather, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Rotate advertising banners
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBanner(prev => (prev + 1) % advertisingBanners.length);
    }, advertisingBanners[currentBanner]?.duration || 5000);

    return () => clearInterval(interval);
  }, [currentBanner, advertisingBanners]);

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

  const handleBannerClick = (banner: AdvertisingBanner) => {
    if (banner.link) {
      window.open(banner.link, '_blank');
    }
  };

  return (
    <div className="h-16 bg-black bg-opacity-40 backdrop-blur-sm border-b border-blue-500/20 flex items-center justify-between px-4">
      {/* Weather Widget */}
      <div className="flex items-center space-x-3">
        <Globe className="w-5 h-5 text-blue-300" />
        {isLoading ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-300"></div>
            <span className="text-sm text-blue-200">Φόρτωση...</span>
          </div>
        ) : weather ? (
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className="text-lg">{getWeatherIcon(weather.weathercode)}</span>
              <div>
                <div className="text-lg font-bold text-white">
                  {weather.temperature}°C
                </div>
                <div className="text-xs text-blue-200">
                  {weather.description}
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-300">
              {weather.location}
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-400">
            Δεδομένα καιρού μη διαθέσιμα
          </div>
        )}
      </div>

      {/* Advertising Banners */}
      <div className="flex-1 flex items-center justify-center max-w-2xl">
        <div className="flex items-center space-x-4">
          {/* Previous Banner Button */}
          <button
            onClick={() => setCurrentBanner(prev => 
              prev === 0 ? advertisingBanners.length - 1 : prev - 1
            )}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Current Banner */}
          {advertisingBanners.length > 0 && (
            <div 
              className="flex items-center space-x-3 bg-blue-900/30 px-4 py-2 rounded-lg border border-blue-500/30 hover:border-blue-400/50 transition-all cursor-pointer"
              onClick={() => handleBannerClick(advertisingBanners[currentBanner])}
            >
              <span className="text-2xl">
                {advertisingBanners[currentBanner].image}
              </span>
              <div className="text-center">
                <div className="text-sm font-semibold text-white">
                  {advertisingBanners[currentBanner].title}
                </div>
                <div className="text-xs text-blue-200">
                  {advertisingBanners[currentBanner].description}
                </div>
              </div>
              {advertisingBanners[currentBanner].link && (
                <ExternalLink className="w-3 h-3 text-blue-300" />
              )}
            </div>
          )}

          {/* Next Banner Button */}
          <button
            onClick={() => setCurrentBanner(prev => 
              (prev + 1) % advertisingBanners.length
            )}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Banner Indicators */}
        {advertisingBanners.length > 1 && (
          <div className="flex space-x-1 ml-4">
            {advertisingBanners.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentBanner(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentBanner
                    ? 'bg-blue-400 scale-125'
                    : 'bg-gray-500 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Right Side - Time or Additional Info */}
      <div className="flex items-center space-x-3">
        <div className="text-right">
          <div className="text-sm font-semibold text-white">
            {new Date().toLocaleTimeString('el-GR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
          <div className="text-xs text-gray-300">
            {new Date().toLocaleDateString('el-GR', {
              day: 'numeric',
              month: 'short'
            })}
          </div>
        </div>
        <div className="w-1 h-8 bg-blue-500/30 rounded"></div>
      </div>
    </div>
  );
}

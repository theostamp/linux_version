'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sun, Cloud, CloudRain, CloudSnow, Wind, Thermometer, MapPin, Clock, Calendar } from 'lucide-react';

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

export default function KioskSidebar() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentBanner, setCurrentBanner] = useState(0);
  const [loading, setLoading] = useState(true);

  // Mock advertising banners
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
    {
      id: 3,
      title: 'Συντήρηση & Επισκευές',
      description: 'Γρήγορη και αξιόπιστη συντήρηση κτιρίων',
      image_url: '/api/static/banners/maintenance.jpg',
      link: 'https://example.com/maintenance',
      duration: 5000,
    },
  ];

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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
    if (code === 0) return <Sun className="w-8 h-8 text-yellow-500" />;
    if (code >= 1 && code <= 3) return <Cloud className="w-8 h-8 text-gray-500" />;
    if (code >= 45 && code <= 48) return <Cloud className="w-8 h-8 text-gray-400" />;
    if (code >= 51 && code <= 55) return <CloudRain className="w-8 h-8 text-blue-500" />;
    if (code >= 61 && code <= 65) return <CloudRain className="w-8 h-8 text-blue-600" />;
    if (code >= 80 && code <= 95) return <CloudRain className="w-8 h-8 text-blue-700" />;
    return <Cloud className="w-8 h-8 text-gray-500" />;
  }

  return (
    <aside className="w-80 bg-gradient-to-b from-blue-50 to-indigo-100 border-l border-blue-200 p-6 space-y-6 overflow-y-auto">
      {/* Current Time */}
      <Card className="bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-lg">
            <Clock className="w-5 h-5 mr-2 text-blue-600" />
            Ώρα & Ημερομηνία
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-3xl font-mono font-bold text-gray-800 mb-2">
              {currentTime.toLocaleTimeString('el-GR', { 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit' 
              })}
            </div>
            <div className="text-sm text-gray-600 flex items-center justify-center">
              <Calendar className="w-4 h-4 mr-1" />
              {currentTime.toLocaleDateString('el-GR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weather Widget */}
      <Card className="bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-lg">
            <Thermometer className="w-5 h-5 mr-2 text-blue-600" />
            Καιρός
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-600 mt-2">Φόρτωση καιρού...</p>
            </div>
          ) : weather ? (
            <div className="text-center">
              <div className="flex justify-center mb-3">
                {getWeatherIcon(weather.weathercode)}
              </div>
              <div className="text-2xl font-bold text-gray-800 mb-1">
                {weather.temperature}°C
              </div>
              <div className="text-sm text-gray-600 mb-3">
                {weather.description}
              </div>
              <div className="flex items-center justify-center text-xs text-gray-500">
                <MapPin className="w-3 h-3 mr-1" />
                Αθήνα, Ελλάδα
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <Cloud className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Δεν ήταν δυνατή η φόρτωση του καιρού</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advertising Banners */}
      <Card className="bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-blue-600">
            Χρήσιμες Υπηρεσίες
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {advertisingBanners.map((banner, index) => (
              <div
                key={banner.id}
                className={`transition-all duration-500 ${
                  index === currentBanner ? 'opacity-100 scale-100' : 'opacity-0 scale-95 absolute'
                }`}
                style={{ display: index === currentBanner ? 'block' : 'none' }}
              >
                <div className="bg-gradient-to-r from-purple-500 to-blue-600 rounded-lg p-4 text-white">
                  <h3 className="font-semibold text-lg mb-2">{banner.title}</h3>
                  <p className="text-sm opacity-90 mb-3">{banner.description}</p>
                  <div className="flex items-center text-xs opacity-75">
                    <span>📞 Επικοινωνήστε μαζί μας</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Banner Navigation Dots */}
          <div className="flex justify-center mt-4 space-x-2">
            {advertisingBanners.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentBanner(index)}
                className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                  index === currentBanner
                    ? 'bg-blue-600'
                    : 'bg-blue-300 hover:bg-blue-400'
                }`}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Info */}
      <Card className="bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-blue-600">
            Γρήγορες Πληροφορίες
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Διαχειριστής:</span>
              <span className="font-medium">Γιώργος Παπαδόπουλος</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Τηλέφωνο:</span>
              <span className="font-medium">210 1234567</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Επείγοντα:</span>
              <span className="font-medium text-red-600">210 7654321</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </aside>
  );
} 
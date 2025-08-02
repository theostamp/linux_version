'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sun, Cloud, CloudRain, CloudSnow, Wind, Thermometer, MapPin, Clock, Calendar, Phone, Users, QrCode, Smartphone } from 'lucide-react';
import QRCodeDisplay from './QRCodeDisplay';

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

interface KioskSidebarProps {
  buildingInfo?: {
    id: number;
    name: string;
    address: string;
    city?: string;
    postal_code?: string;
    latitude?: number;
    longitude?: number;
    internal_manager_name?: string;
    internal_manager_phone?: string;
    management_office_name?: string;
    management_office_phone?: string;
    management_office_address?: string;
  };
}

export default function KioskSidebar({ buildingInfo }: KioskSidebarProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentBanner, setCurrentBanner] = useState(0);
  const [loading, setLoading] = useState(true);
  const [communityMessage, setCommunityMessage] = useState<string>('');

  // Enhanced advertising banners
  const advertisingBanners: AdvertisingBanner[] = [
    {
      id: 1,
      title: 'Καθαριστικές Υπηρεσίες',
      description: 'Εξειδικευμένες καθαριστικές υπηρεσίες για πολυκατοικίες με εγγύηση ποιότητας',
      image_url: '/api/static/banners/cleaning.jpg',
      link: 'https://example.com/cleaning',
      duration: 5000,
    },
    {
      id: 2,
      title: 'Ασφάλεια & Συστήματα',
      description: 'Συστήματα ασφαλείας και παρακολούθησης με τεχνολογία 24/7',
      image_url: '/api/static/banners/security.jpg',
      link: 'https://example.com/security',
      duration: 5000,
    },
    {
      id: 3,
      title: 'Συντήρηση & Επισκευές',
      description: 'Γρήγορη και αξιόπιστη συντήρηση κτιρίων από επαγγελματίες',
      image_url: '/api/static/banners/maintenance.jpg',
      link: 'https://example.com/maintenance',
      duration: 5000,
    },
    {
      id: 4,
      title: 'Ενεργειακά Συστήματα',
      description: 'Λύσεις ενεργειακής απόδοσης και φωτοβολταϊκά συστήματα',
      image_url: '/api/static/banners/energy.jpg',
      link: 'https://example.com/energy',
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

  // Load weather data based on building location
  useEffect(() => {
    async function loadWeather() {
      try {
        // Use building coordinates if available, otherwise fallback to Athens
        const latitude = buildingInfo?.latitude || 37.98;
        const longitude = buildingInfo?.longitude || 23.72;
        const city = buildingInfo?.city || 'Αθήνα';
        
        const response = await fetch(
          `/api/weather?latitude=${latitude}&longitude=${longitude}&city=${encodeURIComponent(city)}`
        );
        if (response.ok) {
          const data = await response.json();
          setWeather({ 
            temperature: data.temperature, 
            weathercode: data.weathercode, 
            description: data.description 
          });
        }
      } catch (error) {
        console.error('Failed to load weather:', error);
      } finally {
        setLoading(false);
      }
    }
    loadWeather();
  }, [buildingInfo?.latitude, buildingInfo?.longitude, buildingInfo?.city]);

  // Rotate advertising banners
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % advertisingBanners.length);
    }, 6000); // Change banner every 6 seconds

    return () => clearInterval(interval);
  }, [advertisingBanners.length]);

  // Load community messages
  useEffect(() => {
    async function loadCommunityMessage() {
      try {
        const response = await fetch('/api/community-messages');
        if (response.ok) {
          const data = await response.json();
          setCommunityMessage(data.content);
        }
      } catch (error) {
        setCommunityMessage('Καλώς ήρθατε στην πολυκατοικία μας! 🏠');
      }
    }
    loadCommunityMessage();
    
    // Refresh community message every 30 seconds
    const interval = setInterval(loadCommunityMessage, 30 * 1000);
    return () => clearInterval(interval);
  }, []);

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
    if (code === 0) return <Sun className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-yellow-400" />;
    if (code >= 1 && code <= 3) return <Cloud className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-gray-400" />;
    if (code >= 45 && code <= 48) return <Cloud className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-gray-500" />;
    if (code >= 51 && code <= 55) return <CloudRain className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-blue-400" />;
    if (code >= 61 && code <= 65) return <CloudRain className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-blue-500" />;
    if (code >= 80 && code <= 95) return <CloudRain className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-blue-600" />;
    return <Cloud className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-gray-400" />;
  }

  return (
    <aside className="w-64 sm:w-72 md:w-80 lg:w-96 xl:w-[400px] bg-gradient-to-b from-blue-900 via-blue-800 to-indigo-900 border-r border-blue-700 p-2 sm:p-3 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-6 overflow-y-auto text-white flex-shrink-0 font-roboto">
      {/* Current Time */}
      <Card className="bg-white/10 backdrop-blur-sm border-white/20">
        <CardContent className="pt-2 sm:pt-3 lg:pt-4">
          <div className="text-center">
            <div className="text-xl sm:text-2xl lg:text-3xl font-mono font-bold text-white mb-1 sm:mb-2">
              {currentTime.toLocaleTimeString('el-GR', { 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit' 
              })}
            </div>
            <div className="text-xs sm:text-sm text-blue-200 flex items-center justify-center">
              <Calendar className="w-3 h-3 lg:w-4 lg:h-4 mr-1" />
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

      {/* QR Code Connection */}
      {buildingInfo && (
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader className="pb-2 lg:pb-3">
            <CardTitle className="flex items-center text-sm sm:text-base lg:text-lg text-blue-200">
              <QrCode className="w-4 h-4 lg:w-5 lg:h-5 mr-2 text-blue-300" />
              Σύνδεση Κινητού
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              {/* Real QR Code Display */}
              <QRCodeDisplay 
                buildingId={buildingInfo.id}
                buildingName={buildingInfo.name}
                size={128}
              />
              
              {/* Connection Instructions */}
              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex items-center justify-center text-blue-200">
                  <Smartphone className="w-4 h-4 mr-2" />
                  <span>Σκανάρετε με το κινητό σας</span>
                </div>
                <p className="text-blue-300 leading-relaxed">
                  Επιλέξτε το όνομά σας και συνδεθείτε για ειδοποιήσεις
                </p>
                <div className="bg-blue-800/50 rounded p-2 mt-2">
                  <p className="text-xs text-blue-200">
                    <strong>Link:</strong> {window.location.host}/connect?building={buildingInfo.id}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weather Widget */}
      <Card className="bg-white/10 backdrop-blur-sm border-white/20">
        <CardHeader className="pb-2 lg:pb-3">
          <CardTitle className="flex items-center text-sm sm:text-base lg:text-lg text-blue-200">
            <Thermometer className="w-4 h-4 lg:w-5 lg:h-5 mr-2 text-blue-300" />
            Καιρός
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-2 sm:py-3 lg:py-4">
              <div className="animate-spin rounded-full h-6 w-6 lg:h-8 lg:w-8 border-b-2 border-blue-300 mx-auto"></div>
              <p className="text-xs sm:text-sm text-blue-200 mt-2">Φόρτωση καιρού...</p>
            </div>
          ) : weather ? (
            <div className="text-center">
              <div className="flex justify-center mb-2 sm:mb-3 lg:mb-4">
                {getWeatherIcon(weather.weathercode)}
              </div>
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-1 sm:mb-2">
                {weather.temperature}°C
              </div>
              <div className="text-xs sm:text-sm text-blue-200 mb-2 lg:mb-3">
                {weather.description}
              </div>
              <div className="flex items-center justify-center text-xs text-blue-300">
                <MapPin className="w-3 h-3 mr-1" />
                {buildingInfo?.city || 'Αθήνα'}, Ελλάδα
              </div>
            </div>
          ) : (
            <div className="text-center py-2 sm:py-3 lg:py-4">
              <Cloud className="w-6 h-6 lg:w-8 lg:h-8 text-blue-300 mx-auto mb-2" />
              <p className="text-xs sm:text-sm text-blue-200">Δεν ήταν δυνατή η φόρτωση του καιρού</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Info - Internal Manager */}
      <Card className="bg-white/10 backdrop-blur-sm border-white/20">
        <CardHeader className="pb-2 lg:pb-3">
          <CardTitle className="flex items-center text-sm sm:text-base lg:text-lg text-blue-200">
            <Users className="w-4 h-4 lg:w-5 lg:h-5 mr-2 text-blue-300" />
            Εσωτερικός Διαχειριστής
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 lg:space-y-3 text-xs sm:text-sm">
            {/* Internal Manager */}
            {buildingInfo?.internal_manager_name && (
              <div className="flex items-center justify-between p-2 bg-white/5 rounded">
                <span className="text-blue-200">Όνομα:</span>
                <span className="font-medium text-white">{buildingInfo.internal_manager_name}</span>
              </div>
            )}
            {buildingInfo?.internal_manager_phone && (
              <div className="flex items-center justify-between p-2 bg-white/5 rounded">
                <span className="text-blue-200">Τηλέφωνο:</span>
                <span className="font-medium text-white">{buildingInfo.internal_manager_phone}</span>
              </div>
            )}
            
            {/* Fallback if no manager info */}
            {!buildingInfo?.internal_manager_name && (
              <div className="flex items-center justify-center p-2 bg-white/5 rounded">
                <span className="text-blue-200 text-center">Δεν υπάρχουν διαθέσιμα στοιχεία διαχείρισης</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Community Message */}
      {communityMessage && (
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardContent className="pt-2 sm:pt-3 lg:pt-4">
            <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-lg p-2 sm:p-3 text-white border border-white/20">
              <p className="text-xs font-medium leading-relaxed">
                {communityMessage}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advertising Banners */}
      <Card className="bg-white/10 backdrop-blur-sm border-white/20">
        <CardHeader className="pb-2 lg:pb-3">
          <CardTitle className="text-sm sm:text-base lg:text-lg text-blue-200">
            Χρήσιμες Υπηρεσίες
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 sm:space-y-3 lg:space-y-4">
            {advertisingBanners.map((banner, index) => (
              <div
                key={banner.id}
                className={`transition-all duration-700 ${
                  index === currentBanner ? 'opacity-100 scale-100' : 'opacity-0 scale-95 absolute'
                }`}
                style={{ display: index === currentBanner ? 'block' : 'none' }}
              >
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-2 sm:p-3 lg:p-4 text-white border border-white/20">
                  <h3 className="font-semibold text-sm sm:text-base lg:text-lg mb-1 sm:mb-2">{banner.title}</h3>
                  <p className="text-xs sm:text-sm opacity-90 mb-2 lg:mb-3 leading-relaxed">{banner.description}</p>
                  <div className="flex items-center text-xs opacity-75">
                    <Phone className="w-3 h-3 mr-1" />
                    <span>📞 Επικοινωνήστε μαζί μας</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Banner Navigation Dots */}
          <div className="flex justify-center mt-2 sm:mt-3 lg:mt-4 space-x-1 lg:space-x-2">
            {advertisingBanners.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentBanner(index)}
                className={`w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full transition-colors duration-200 ${
                  index === currentBanner
                    ? 'bg-blue-300'
                    : 'bg-blue-600 hover:bg-blue-500'
                }`}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </aside>
  );
} 
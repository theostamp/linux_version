'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Clock, 
  QrCode, 
  Thermometer, 
  Users, 
  MessageSquare, 
  Megaphone,
  Calendar,
  Phone
} from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

interface KioskSidebarProps {
  buildingInfo?: {
    id: number;
    name: string;
    address: string;
    city?: string;
    postal_code?: string;
    internal_manager_name?: string;
    internal_manager_phone?: string;
    management_office_name?: string;
    management_office_phone?: string;
    management_office_address?: string;
  };
  buildingId?: number;
}

export default function KioskSidebar({ buildingInfo, buildingId }: KioskSidebarProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState<any>(null);
  const [currentBanner, setCurrentBanner] = useState(0);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Load weather data
  useEffect(() => {
    const loadWeather = async () => {
      try {
        const response = await fetch('/api/weather');
        if (response.ok) {
          const data = await response.json();
          setWeather(data);
        }
      } catch (error) {
        console.error('Failed to load weather:', error);
      }
    };

    loadWeather();
  }, []);

  // Rotate advertising banners
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBanner(prev => (prev + 1) % 3);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const advertisingBanners = [
    {
      title: 'Καθαριστικές Υπηρεσίες',
      description: 'Εξειδικευμένες καθαριστικές υπηρεσίες για πολυκατοικίες',
      image: '🧽'
    },
    {
      title: 'Ασφάλεια & Συστήματα',
      description: 'Συστήματα ασφαλείας και παρακολούθησης 24/7',
      image: '🔒'
    },
    {
      title: 'Συντήρηση & Επισκευές',
      description: 'Γρήγορη και αξιόπιστη συντήρηση κτιρίων',
      image: '🔧'
    }
  ];

  return (
    <div className="h-full bg-gradient-to-b from-slate-900/50 to-blue-900/30 backdrop-blur-sm border-l border-blue-500/20 flex flex-col">
      {/* Time Widget */}
      <Card className="m-3 bg-slate-800/50 border-slate-600/30">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <Clock className="w-6 h-6 text-blue-300" />
            <div>
              <div className="text-2xl font-bold text-white">
                {format(currentTime, 'HH:mm')}
              </div>
              <div className="text-sm text-gray-300">
                {format(currentTime, 'EEEE, dd MMMM', { locale: el })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QR Code Widget */}
      <Card className="mx-3 mb-3 bg-slate-800/50 border-slate-600/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center space-x-2 text-white">
            <QrCode className="w-4 h-4" />
            <span>Σύνδεση Κινητού</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="text-center">
            <div className="w-16 h-16 bg-white rounded-lg mx-auto mb-2 flex items-center justify-center">
              <QrCode className="w-8 h-8 text-gray-800" />
            </div>
            <p className="text-xs text-gray-300">
              Σκανάρετε για σύνδεση
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Weather Widget */}
      <Card className="mx-3 mb-3 bg-slate-800/50 border-slate-600/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center space-x-2 text-white">
            <Thermometer className="w-4 h-4" />
            <span>Καιρός</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {weather ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-bold text-white">
                  {weather.temperature}°C
                </span>
                <span className="text-lg">🌤️</span>
              </div>
              <p className="text-xs text-gray-300">
                {weather.description}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Αθήνα, Ελλάδα
              </p>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-2xl mb-2">🌤️</div>
              <p className="text-xs text-gray-300">
                Φόρτωση καιρού...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manager Info Widget */}
      {buildingInfo?.internal_manager_name && (
        <Card className="mx-3 mb-3 bg-slate-800/50 border-slate-600/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center space-x-2 text-white">
              <Users className="w-4 h-4" />
              <span>Εσωτερικός Διαχειριστής</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium text-white">
                  {buildingInfo.internal_manager_name}
                </p>
                {buildingInfo.internal_manager_phone && (
                  <div className="flex items-center space-x-1 mt-1">
                    <Phone className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-300">
                      {buildingInfo.internal_manager_phone}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Community Message Widget */}
      <Card className="mx-3 mb-3 bg-slate-800/50 border-slate-600/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center space-x-2 text-white">
            <MessageSquare className="w-4 h-4" />
            <span>Μήνυμα Κοινότητας</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="text-center">
            <div className="text-2xl mb-2">💬</div>
            <p className="text-xs text-gray-300">
              Καλώς ήρθατε στο σύστημα διαχείρισης κτιρίου
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Advertising Banners */}
      <Card className="mx-3 mb-3 bg-slate-800/50 border-slate-600/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center space-x-2 text-white">
            <Megaphone className="w-4 h-4" />
            <span>Χρήσιμες Υπηρεσίες</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="space-y-3">
            {advertisingBanners.map((banner, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg transition-all ${
                  index === currentBanner
                    ? 'bg-blue-600/30 border border-blue-400/50'
                    : 'bg-gray-700/30'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{banner.image}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">
                      {banner.title}
                    </p>
                    <p className="text-xs text-gray-300 line-clamp-2">
                      {banner.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Banner indicators */}
          <div className="flex justify-center space-x-1 mt-3">
            {advertisingBanners.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentBanner
                    ? 'bg-blue-400'
                    : 'bg-gray-500'
                }`}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Spacer to push content to top */}
      <div className="flex-1" />
    </div>
  );
}

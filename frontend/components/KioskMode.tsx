'use client';

import { useEffect, useState, useRef } from 'react';
import { useKeenSlider } from 'keen-slider/react';
import { Bell, Calendar, Clock, MapPin, Users, Vote, AlertTriangle, Building, ExternalLink } from 'lucide-react';
import { Announcement, Vote as VoteType } from '@/lib/api';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

interface KioskModeProps {
  announcements: Announcement[];
  votes: VoteType[];
  buildingInfo?: {
    id: number;
    name: string;
    address: string;
    city?: string;
    postal_code?: string;
    apartments_count?: number;
    internal_manager_name?: string;
    internal_manager_phone?: string;
  };
  advertisingBanners?: Array<{
    id: number;
    title: string;
    description: string;
    image_url: string;
    link: string;
    duration: number;
  }>;
  generalInfo?: {
    current_time: string;
    current_date: string;
    system_status: string;
    last_updated: string;
  };
}

export default function KioskMode({
  announcements,
  votes,
  buildingInfo,
  advertisingBanners = [],
  generalInfo
}: KioskModeProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentSlide, setCurrentSlide] = useState(0);
  const [weather, setWeather] = useState<string>('');
  const [newsTicker, setNewsTicker] = useState<string>('');
  
  const sliderRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [sliderContainerRef, instanceRef] = useKeenSlider<HTMLDivElement>({
    loop: true,
    slides: {
      perView: 1,
      spacing: 0,
    },
    renderMode: 'performance',
    created(s) {
      s.container.addEventListener('mouseenter', () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      });
      s.container.addEventListener('mouseleave', () => {
        startAutoSlide();
      });
    },
    slideChanged(s) {
      setCurrentSlide(s.track.details.rel);
    },
  });

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Auto-slide every 10 seconds
  const startAutoSlide = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      instanceRef.current?.next();
    }, 10000);
  };

  useEffect(() => {
    startAutoSlide();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [instanceRef]);

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
          const weatherText = getWeatherText(weathercode);
          setWeather(`${temperature}°C - ${weatherText}`);
        }
      } catch (error) {
        console.error('Failed to load weather:', error);
        setWeather('Αποτυχία φόρτωσης καιρού');
      }
    }
    loadWeather();
  }, []);

  // Load news ticker
  useEffect(() => {
    async function loadNews() {
      try {
        const response = await fetch('/api/quote');
        if (response.ok) {
          const data = await response.json();
          setNewsTicker(data.content || 'Καλώς ήρθατε στην πολυκατοικία μας!');
        }
      } catch (error) {
        setNewsTicker('Καλώς ήρθατε στην πολυκατοικία μας!');
      }
    }
    loadNews();
  }, []);

  function getWeatherText(code: number): string {
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

  const slides = [
    // Slide 1: Announcements
    {
      id: 'announcements',
      title: 'Ανακοινώσεις',
      icon: Bell,
      content: announcements.length > 0 ? (
        <div className="space-y-4">
          {announcements.slice(0, 3).map((announcement) => (
            <div
              key={announcement.id}
              className={`p-4 rounded-lg border-l-4 ${
                announcement.is_urgent
                  ? 'bg-red-50 border-red-500'
                  : 'bg-blue-50 border-blue-500'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {announcement.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {announcement.description}
                  </p>
                  <div className="flex items-center text-xs text-gray-500">
                    <Calendar className="w-3 h-3 mr-1" />
                    {format(new Date(announcement.start_date), 'dd/MM/yyyy', { locale: el })} - 
                    {format(new Date(announcement.end_date), 'dd/MM/yyyy', { locale: el })}
                  </div>
                </div>
                {announcement.is_urgent && (
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-8">
          <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Δεν υπάρχουν ενεργές ανακοινώσεις</p>
        </div>
      ),
    },
    // Slide 2: Votes
    {
      id: 'votes',
      title: 'Ενεργές Ψηφοφορίες',
      icon: Vote,
      content: votes.length > 0 ? (
        <div className="space-y-4">
          {votes.map((vote) => (
            <div
              key={vote.id}
              className={`p-4 rounded-lg border-l-4 ${
                vote.is_urgent
                  ? 'bg-orange-50 border-orange-500'
                  : 'bg-green-50 border-green-500'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {vote.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {vote.description}
                  </p>
                  <div className="flex items-center text-xs text-gray-500">
                    <Calendar className="w-3 h-3 mr-1" />
                    Λήξη: {format(new Date(vote.end_date), 'dd/MM/yyyy', { locale: el })}
                  </div>
                </div>
                {vote.is_urgent && (
                  <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-8">
          <Vote className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Δεν υπάρχουν ενεργές ψηφοφορίες</p>
        </div>
      ),
    },
    // Slide 3: Building Information
    {
      id: 'building-info',
      title: 'Πληροφορίες Κτιρίου',
      icon: Building,
      content: buildingInfo ? (
        <div className="space-y-6">
          <div className="text-center">
            <Building className="w-16 h-16 mx-auto mb-4 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {buildingInfo.name}
            </h2>
            <p className="text-gray-600 mb-4">
              <MapPin className="w-4 h-4 inline mr-1" />
              {buildingInfo.address}
              {buildingInfo.city && `, ${buildingInfo.city}`}
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <p className="text-sm text-gray-600">Διαμερίσματα</p>
              <p className="text-xl font-bold text-blue-900">
                {buildingInfo.apartments_count || 'N/A'}
              </p>
            </div>
            
            {buildingInfo.internal_manager_name && (
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <Users className="w-8 h-8 mx-auto mb-2 text-green-600" />
                <p className="text-sm text-gray-600">Διαχειριστής</p>
                <p className="text-sm font-semibold text-green-900">
                  {buildingInfo.internal_manager_name}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-500 py-8">
          <Building className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Δεν υπάρχουν πληροφορίες κτιρίου</p>
        </div>
      ),
    },
    // Slide 4: Advertising Banners
    {
      id: 'advertising',
      title: 'Χρήσιμες Υπηρεσίες',
      icon: ExternalLink,
      content: advertisingBanners.length > 0 ? (
        <div className="space-y-4">
          {advertisingBanners.map((banner) => (
            <div
              key={banner.id}
              className="bg-gradient-to-r from-purple-500 to-blue-600 p-6 rounded-lg text-white"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">
                    {banner.title}
                  </h3>
                  <p className="text-sm opacity-90 mb-3">
                    {banner.description}
                  </p>
                  <div className="flex items-center text-xs opacity-75">
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Περισσότερες πληροφορίες
                  </div>
                </div>
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <ExternalLink className="w-8 h-8" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-8">
          <ExternalLink className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Δεν υπάρχουν διαθέσιμες υπηρεσίες</p>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white">
      {/* Header */}
      <div className="bg-black bg-opacity-30 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Building className="w-8 h-8" />
            <div>
              <h1 className="text-xl font-bold">
                {buildingInfo?.name || 'Πολυκατοικία'}
              </h1>
              <p className="text-sm opacity-75">
                {buildingInfo?.address || 'Πληροφορίες Κτιρίου'}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-mono">
              {format(currentTime, 'HH:mm:ss')}
            </div>
            <div className="text-sm opacity-75">
              {format(currentTime, 'EEEE, dd MMMM yyyy', { locale: el })}
            </div>
          </div>
        </div>
      </div>

      {/* News Ticker */}
      {newsTicker && (
        <div className="bg-yellow-600 bg-opacity-90 p-2 overflow-hidden">
          <div className="flex items-center space-x-2 animate-marquee">
            <span className="font-semibold">📢</span>
            <span className="whitespace-nowrap">{newsTicker}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div ref={sliderRef} className="h-full">
          <div
            ref={sliderContainerRef}
            className="keen-slider h-full"
          >
            {slides.map((slide, index) => (
              <div key={slide.id} className="keen-slider__slide">
                <div className="h-full flex flex-col">
                  {/* Slide Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <slide.icon className="w-8 h-8 text-blue-300" />
                      <h2 className="text-2xl font-bold">{slide.title}</h2>
                    </div>
                    <div className="text-right">
                      <div className="text-sm opacity-75">{weather}</div>
                    </div>
                  </div>

                  {/* Slide Content */}
                  <div className="flex-1 overflow-y-auto">
                    {slide.content}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation Dots */}
      <div className="bg-black bg-opacity-30 p-4">
        <div className="flex justify-center space-x-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => instanceRef.current?.moveToIdx(index)}
              className={`w-3 h-3 rounded-full transition-colors duration-200 ${
                currentSlide === index
                  ? 'bg-white'
                  : 'bg-white bg-opacity-50 hover:bg-opacity-75'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Custom CSS for marquee animation */}
      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
      `}</style>
    </div>
  );
} 
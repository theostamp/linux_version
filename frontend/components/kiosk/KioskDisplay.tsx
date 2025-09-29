'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  Users, 
  Phone, 
  Bell, 
  Vote, 
  Euro, 
  Wrench, 
  FolderOpen,
  Clock,
  QrCode,
  Cloud,
  User,
  MessageCircle,
  Megaphone,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Home,
  Thermometer,
  Wind,
  Eye,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Zap,
  Shield,
  Car
} from 'lucide-react';
import { getAllWidgets, getWidgetById } from '@/lib/widget-library';
import CommonExpensesBillWidget from './widgets/CommonExpensesBillWidget';
import HeatingConsumptionChartWidget from './widgets/HeatingConsumptionChartWidget';
import AirbnbInfoWidget from './widgets/AirbnbInfoWidget';

interface KioskWidget {
  id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  order: number;
  settings: any;
  greekName?: string;
  greekDescription?: string;
  icon?: string;
}

interface BuildingInfo {
  id: number;
  name: string;
  address: string;
  city: string;
  postal_code: string;
  apartments_count: number;
  internal_manager_name: string;
  internal_manager_phone: string;
  management_office_name: string;
  management_office_phone: string;
  management_office_address: string;
}

interface Announcement {
  id: number;
  title: string;
  description: string;
  author_name: string;
  created_at: string;
  is_urgent: boolean;
  priority: number;
  status_display: string;
}

interface Vote {
  id: number;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
}

interface PublicInfo {
  building_info: BuildingInfo;
  announcements: Announcement[];
  votes: Vote[];
}

interface KioskData {
  building: number;
  widgets: KioskWidget[];
  settings: {
    autoRefresh: boolean;
    slideDuration: number;
    refreshInterval: number;
  };
  timestamp?: string;
}

interface WeatherData {
  temperature: number;
  weathercode: number;
  description: string;
  location: string;
  forecast: Array<{
    date: string;
    temperature_max: number;
    temperature_min: number;
    weathercode: number;
  }>;
}

export default function KioskDisplay({ buildingId }: { buildingId: number }) {
  const [kioskData, setKioskData] = useState<KioskData | null>(null);
  const [publicInfo, setPublicInfo] = useState<PublicInfo | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch kiosk configuration
        const kioskResponse = await fetch(`http://demo.localhost:18000/api/kiosk/public/configs/?building_id=${buildingId}`);
        if (kioskResponse.ok) {
          const kioskResult = await kioskResponse.json();
          // Transform API response to expected format
          setKioskData({
            widgets: kioskResult.widgets || [],
            settings: {
              slideDuration: 10, // Default 10 seconds
              autoRefresh: true,
              refreshInterval: 30
            },
            building: buildingId,
            timestamp: kioskResult.timestamp
          });
        }

        // Fetch public building info
        const publicResponse = await fetch(`http://demo.localhost:18000/api/public-info/${buildingId}/`);
        if (publicResponse.ok) {
          const publicResult = await publicResponse.json();
          setPublicInfo(publicResult);
        }

        // Fetch weather data
        const weatherResponse = await fetch('/api/weather');
        if (weatherResponse.ok) {
          const weatherResult = await weatherResponse.json();
          setWeatherData(weatherResult);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Auto-refresh
    const interval = setInterval(fetchData, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [buildingId]);

  useEffect(() => {
    if (!kioskData || isManualMode) return;

    const slideInterval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % getMainSlides().length);
    }, kioskData.settings.slideDuration * 1000);

    return () => clearInterval(slideInterval);
  }, [kioskData, isManualMode]);

  const handleSlideChange = (newSlideIndex: number) => {
    if (newSlideIndex === currentSlide) return;
    
    setIsTransitioning(true);
    setIsManualMode(true);
    
    setTimeout(() => {
      setCurrentSlide(newSlideIndex);
      setIsTransitioning(false);
    }, 300); // Half of the transition duration
  };

  const nextSlide = () => {
    const mainSlides = getMainSlides();
    const nextIndex = (currentSlide + 1) % mainSlides.length;
    handleSlideChange(nextIndex);
  };

  const prevSlide = () => {
    const mainSlides = getMainSlides();
    const prevIndex = currentSlide === 0 ? mainSlides.length - 1 : currentSlide - 1;
    handleSlideChange(prevIndex);
  };

  const getMainSlides = () => {
    if (!kioskData) return [];
    
    // Use widgets from API response
    const mainSlideWidgets = kioskData.widgets.filter(widget => 
      widget.category === 'main_slides' && widget.enabled
    );
    
    // Filter out empty slides based on content
    return mainSlideWidgets.filter(widget => {
      switch (widget.id) {
        case 'announcements':
          return publicInfo && publicInfo.announcements.length > 0;
        case 'votes':
          return publicInfo && publicInfo.votes.length > 0;
        case 'emergency_contacts':
          return true; // Always show emergency contacts
        case 'building_statistics':
          return true; // Always show building statistics
        case 'dashboard_overview':
          return true; // Always show dashboard
        case 'common_expenses_bill':
          return true; // Always show if enabled
        case 'heating_consumption_chart':
          return true; // Always show if enabled
        case 'airbnb_apartments_info':
          return true; // Always show if enabled
        case 'financial_overview':
          return true; // Always show financial overview
        default:
          return true;
      }
    });
  };

  const getGreekTitle = (widgetId: string, originalTitle: string) => {
    // First try to find widget in API response
    const apiWidget = kioskData?.widgets.find(w => w.id === widgetId);
    if (apiWidget) {
      return apiWidget.greekName;
    }
    
    // Fallback to widget library
    const widget = getWidgetById(widgetId);
    if (widget) {
      return widget.greekName;
    }
    
    // Fallback for legacy widgets
    const greekTitles: { [key: string]: string } = {
      'dashboard_overview': 'Επισκόπηση Κτιρίου',
      'building_statistics': 'Στατιστικά Κτιρίου',
      'emergency_contacts': 'Τηλέφωνα Έκτακτης Ανάγκης',
      'announcements': 'Ανακοινώσεις',
      'votes': 'Ψηφοφορίες'
    };
    return greekTitles[widgetId] || originalTitle;
  };

  const getGreekDescription = (widgetId: string, originalDescription: string) => {
    // First try to find widget in API response
    const apiWidget = kioskData?.widgets.find(w => w.id === widgetId);
    if (apiWidget) {
      return apiWidget.greekDescription;
    }
    
    // Fallback to widget library
    const widget = getWidgetById(widgetId);
    if (widget) {
      return widget.greekDescription;
    }
    
    // Fallback for legacy widgets
    const greekDescriptions: { [key: string]: string } = {
      'dashboard_overview': 'Συνολική επισκόπηση και πληροφορίες του κτιρίου',
      'building_statistics': 'Βασικά στατιστικά και πληροφορίες του κτιρίου',
      'emergency_contacts': 'Τηλέφωνα έκτακτης ανάγκης και ασφαλείας',
      'announcements': 'Τελευταίες ανακοινώσεις και νέα',
      'votes': 'Ενεργές ψηφοφορίες και αποφάσεις',
      'financial_overview': 'Οικονομικές πληροφορίες και κοινόχρηστα'
    };
    return greekDescriptions[widgetId] || originalDescription;
  };

  const isSlideEmpty = (widgetId: string) => {
    switch (widgetId) {
      case 'announcements':
        return !publicInfo || publicInfo.announcements.length === 0;
      case 'votes':
        return !publicInfo || publicInfo.votes.length === 0;
      case 'maintenance_overview':
        return true; // No maintenance data available
      case 'projects_overview':
        return true; // No projects data available
      case 'financial_overview':
        return true; // No financial data available
      default:
        return false;
    }
  };

  const getSidebarWidgets = () => {
    if (!kioskData) return [];
    return kioskData.widgets.filter(w => w.category === 'sidebar_widgets' && w.enabled);
  };

  const renderSidebarWidgetContent = (widget: any) => {
    switch (widget.id) {
      case 'time_weather':
        return `${new Date().toLocaleTimeString('el-GR')}${weatherData ? ` • ${weatherData.temperature}°C - ${weatherData.description}` : ''}`;
      case 'building_stats':
        return `${publicInfo?.building_info?.apartments_count || 0} διαμερίσματα • ${publicInfo?.building_info?.internal_manager_name || 'Δεν υπάρχει'}`;
      case 'announcements_count':
        return `${publicInfo?.announcements?.length || 0} ενεργές`;
      case 'votes_count':
        return `${publicInfo?.votes?.length || 0} ενεργές`;
      default:
        return widget.greekDescription || widget.description;
    }
  };

  const getWeatherDescription = (code: number) => {
    const weatherCodes: { [key: number]: string } = {
      0: 'Καθαρός ουρανός',
      1: 'Κυρίως καθαρός',
      2: 'Μερικώς νεφελώδης',
      3: 'Νεφελώδης',
      45: 'Ομίχλη',
      48: 'Παγωμένη ομίχλη',
      51: 'Ελαφρό ντριμπάκι',
      53: 'Μέτριο ντριμπάκι',
      55: 'Πυκνό ντριμπάκι',
      61: 'Ελαφρή βροχή',
      63: 'Μέτρια βροχή',
      65: 'Πυκνή βροχή',
      71: 'Ελαφρό χιόνι',
      73: 'Μέτριο χιόνι',
      75: 'Πυκνό χιόνι',
      77: 'Χιονόκοκκοι',
      80: 'Ελαφρές βροχοπτώσεις',
      81: 'Μέτριες βροχοπτώσεις',
      82: 'Πυκνές βροχοπτώσεις',
      85: 'Ελαφρές χιονοπτώσεις',
      86: 'Πυκνές χιονοπτώσεις',
      95: 'Καταιγίδα',
      96: 'Καταιγίδα με χαλαζοπτώσεις',
      99: 'Ισχυρή καταιγίδα με χαλαζοπτώσεις'
    };
    return weatherCodes[code] || 'Άγνωστος καιρός';
  };

  const getWidgetIcon = (widgetId: string) => {
    // First try to find widget in API response
    const apiWidget = kioskData?.widgets.find(w => w.id === widgetId);
    const iconName = apiWidget?.icon || getWidgetById(widgetId)?.icon;
    if (iconName) {
      const icons: { [key: string]: any } = {
        'Building2': Building2,
        'Users': Users,
        'Phone': Phone,
        'Bell': Bell,
        'Vote': Vote,
        'Euro': Euro,
        'Wrench': Wrench,
        'FolderOpen': FolderOpen,
        'Clock': Clock,
        'QrCode': QrCode,
        'Cloud': Cloud,
        'User': User,
        'MessageCircle': MessageCircle,
        'Megaphone': Megaphone,
        'Calendar': Calendar,
        'Receipt': Receipt,
        'Thermometer': Thermometer,
        'Home': Home,
        'Zap': Zap,
        'Shield': Shield,
        'Car': Car
      };
      return icons[iconName] || Building2;
    }
    
    // Fallback for legacy widgets
    const legacyIcons: { [key: string]: any } = {
      'dashboard_overview': Building2,
      'building_statistics': Users,
      'emergency_contacts': Phone,
      'announcements': Bell,
      'votes': Vote,
      'current_time': Clock,
      'qr_code_connection': QrCode,
      'weather_widget_sidebar': Cloud,
      'internal_manager_info': User,
      'community_message': MessageCircle,
      'advertising_banners_sidebar': Megaphone,
      'advertising_banners_topbar': Megaphone,
      'news_ticker': Calendar
    };
    return legacyIcons[widgetId] || Building2;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-kiosk-primary-dark to-kiosk-primary flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold">Φόρτωση Kiosk...</h2>
        </div>
      </div>
    );
  }

  if (!kioskData || !publicInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-kiosk-error to-kiosk-error-light flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-2">Σφάλμα</h2>
          <p>Δεν ήταν δυνατή η φόρτωση των δεδομένων</p>
        </div>
      </div>
    );
  }

  const mainSlides = getMainSlides();
  const sidebarWidgets = getSidebarWidgets();
  const currentSlideData = mainSlides[currentSlide];

  return (
    <div className="min-h-screen bg-gradient-to-br from-kiosk-neutral-950 via-kiosk-primary-dark to-kiosk-secondary-dark text-white overflow-hidden relative">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-kiosk-primary/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-kiosk-secondary/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-kiosk-accent/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Top Bar */}
      <div className="relative bg-kiosk-neutral-900/80 backdrop-blur-xl border-b border-kiosk-primary/30 shadow-2xl">
        <div className="p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-6">
              <div className="p-3 bg-gradient-to-r from-kiosk-primary to-kiosk-primary-light rounded-xl shadow-lg">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-kiosk-primary-lighter bg-clip-text text-transparent">
                  {publicInfo.building_info.name}
                </h1>
                <p className="text-kiosk-primary-lighter text-lg font-medium">{publicInfo.building_info.address}</p>
              </div>
            </div>
            <div className="flex items-center space-x-8">
              {/* Weather Info */}
              {weatherData && (
                <div className="flex items-center space-x-3 bg-gradient-to-r from-white/15 to-white/5 backdrop-blur-xl rounded-2xl px-6 py-4 shadow-xl border border-white/20">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <Cloud className="w-6 h-6" />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{weatherData.temperature}°C</div>
                    <div className="text-sm text-blue-200 font-medium">{weatherData.description}</div>
                  </div>
                </div>
              )}
              
              {/* Time & Date */}
              <div className="text-right bg-gradient-to-r from-white/15 to-white/5 backdrop-blur-xl rounded-2xl px-6 py-4 shadow-xl border border-white/20">
                <div className="text-3xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                  {new Date().toLocaleTimeString('el-GR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
                <div className="text-blue-200 font-medium">
                  {new Date().toLocaleDateString('el-GR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Thumbnail Navigation */}
      <div className="relative bg-black/20 backdrop-blur-xl border-b border-white/10 shadow-xl">
        <div className="p-4">
          <div className="flex justify-center items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={prevSlide}
              className="text-white hover:bg-kiosk-neutral-800/30 p-3 rounded-xl transition-all duration-300 hover:scale-110"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            
            <div className="flex space-x-3">
              {getMainSlides().map((slide, index) => {
                const IconComponent = getWidgetIcon(slide.id);
                return (
                  <button
                    key={slide.id}
                    onClick={() => handleSlideChange(index)}
                    className={`group flex flex-col items-center p-4 rounded-2xl transition-all duration-300 hover:scale-105 ${
                      index === currentSlide 
                        ? 'bg-gradient-to-br from-kiosk-primary/30 to-kiosk-primary-light/30 border-2 border-kiosk-primary-lighter/50 shadow-xl backdrop-blur-xl' 
                        : 'bg-kiosk-neutral-800/20 border border-kiosk-primary/20 hover:bg-kiosk-neutral-800/30 hover:border-kiosk-primary/30 backdrop-blur-sm'
                    }`}
                  >
                    <div className={`p-3 rounded-xl mb-3 transition-all duration-300 ${
                      index === currentSlide 
                        ? 'bg-gradient-to-r from-kiosk-primary to-kiosk-primary-light shadow-lg' 
                        : 'bg-kiosk-neutral-800/30 group-hover:bg-kiosk-neutral-800/50'
                    }`}>
                      <IconComponent className="w-7 h-7" />
                    </div>
                    <span className={`text-xs font-semibold text-center max-w-24 leading-tight transition-all duration-300 ${
                      index === currentSlide ? 'text-white' : 'text-kiosk-primary-lighter group-hover:text-white'
                    }`}>
                      {getGreekTitle(slide.id, slide.name)}
                    </span>
                  </button>
                );
              })}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={nextSlide}
              className="text-white hover:bg-kiosk-neutral-800/30 p-3 rounded-xl transition-all duration-300 hover:scale-110"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-220px)]">
        {/* Main Content Area */}
        <div className="flex-1 p-8">
          {currentSlideData && (
            <Card className="h-full bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl border-white/30 text-white relative overflow-hidden shadow-2xl">
              {/* Subtle animated background pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-transparent to-indigo-500/20 animate-pulse"></div>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
              </div>
              
              <div 
                className={`relative h-full flex flex-col justify-center items-center p-12 transition-all duration-700 ${
                  isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                }`}
              >
                <div className="text-center">
                  {(() => {
                    const IconComponent = getWidgetIcon(currentSlideData.id);
                    return (
                      <div className={`p-6 rounded-3xl bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-sm border border-white/30 shadow-xl mx-auto mb-8 w-fit ${
                        isSlideEmpty(currentSlideData.id) ? 'opacity-60' : 'opacity-100'
                      }`}>
                        <IconComponent className={`w-16 h-16 ${isSlideEmpty(currentSlideData.id) ? 'text-blue-300/60' : 'text-white'}`} />
                      </div>
                    );
                  })()}
                  
                  <h2 className={`text-6xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-indigo-200 bg-clip-text text-transparent ${
                    isSlideEmpty(currentSlideData.id) ? 'opacity-60' : 'opacity-100'
                  }`}>
                    {getGreekTitle(currentSlideData.id, currentSlideData.name)}
                  </h2>
                  
                  <p className={`text-2xl mb-12 max-w-3xl leading-relaxed font-medium ${
                    isSlideEmpty(currentSlideData.id) ? 'text-blue-200/60' : 'text-blue-100'
                  }`}>
                    {getGreekDescription(currentSlideData.id, currentSlideData.description)}
                  </p>

                  {/* Widget-specific content */}
                  {currentSlideData.id === 'emergency_contacts' && (
                    <div className="grid grid-cols-2 gap-8 mt-8">
                      <div className="bg-gradient-to-br from-red-500/30 to-red-600/20 p-8 rounded-2xl border border-red-400/40 backdrop-blur-sm shadow-xl hover:scale-105 transition-all duration-300">
                        <div className="p-4 bg-red-500/30 rounded-xl w-fit mx-auto mb-6">
                          <Phone className="w-10 h-10" />
                        </div>
                        <h3 className="text-2xl font-bold mb-4 text-center">Εκτάκτων Ανάγκης</h3>
                        <p className="text-5xl font-bold text-center bg-gradient-to-r from-white to-red-200 bg-clip-text text-transparent">100</p>
                      </div>
                      <div className="bg-gradient-to-br from-orange-500/30 to-orange-600/20 p-8 rounded-2xl border border-orange-400/40 backdrop-blur-sm shadow-xl hover:scale-105 transition-all duration-300">
                        <div className="p-4 bg-orange-500/30 rounded-xl w-fit mx-auto mb-6">
                          <Phone className="w-10 h-10" />
                        </div>
                        <h3 className="text-2xl font-bold mb-4 text-center">Ασφαλείας</h3>
                        <p className="text-5xl font-bold text-center bg-gradient-to-r from-white to-orange-200 bg-clip-text text-transparent">199</p>
                      </div>
                    </div>
                  )}

                  {currentSlideData.id === 'announcements' && (
                    <div className="mt-8">
                      {publicInfo.announcements.length > 0 ? (
                        <div className="bg-gradient-to-br from-yellow-500/30 to-yellow-600/20 p-8 rounded-2xl border border-yellow-400/40 backdrop-blur-sm shadow-xl max-w-4xl mx-auto hover:scale-105 transition-all duration-300">
                          <div className="p-4 bg-yellow-500/30 rounded-xl w-fit mx-auto mb-6">
                            <Bell className="w-10 h-10" />
                          </div>
                          <h3 className="text-3xl font-bold mb-4 text-center bg-gradient-to-r from-white to-yellow-200 bg-clip-text text-transparent">{publicInfo.announcements[0].title}</h3>
                          <p className="text-xl text-center mb-6 leading-relaxed">{publicInfo.announcements[0].description}</p>
                          <div className="text-center">
                            <span className="inline-block bg-yellow-500/20 px-4 py-2 rounded-xl text-yellow-100 font-medium">
                              Από: {publicInfo.announcements[0].author_name}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 p-8 rounded-2xl border border-yellow-400/30 backdrop-blur-sm shadow-xl max-w-4xl mx-auto opacity-60">
                          <div className="p-4 bg-yellow-500/20 rounded-xl w-fit mx-auto mb-6">
                            <Bell className="w-10 h-10 text-yellow-300/60" />
                          </div>
                          <h3 className="text-3xl font-bold mb-4 text-center text-yellow-200/60">Τελευταία Ανακοίνωση</h3>
                          <p className="text-xl text-center text-yellow-200/60">Δεν υπάρχουν ενεργές ανακοινώσεις</p>
                        </div>
                      )}
                    </div>
                  )}

                  {currentSlideData.id === 'votes' && (
                    <div className="mt-8">
                      {publicInfo.votes.length > 0 ? (
                        <div className="bg-gradient-to-br from-green-500/30 to-green-600/20 p-8 rounded-2xl border border-green-400/40 backdrop-blur-sm shadow-xl max-w-4xl mx-auto hover:scale-105 transition-all duration-300">
                          <div className="p-4 bg-green-500/30 rounded-xl w-fit mx-auto mb-6">
                            <Vote className="w-10 h-10" />
                          </div>
                          <h3 className="text-3xl font-bold mb-4 text-center bg-gradient-to-r from-white to-green-200 bg-clip-text text-transparent">Ενεργές Ψηφοφορίες</h3>
                          <p className="text-xl text-center mb-8">{publicInfo.votes.length} ενεργές ψηφοφορίες διαθέσιμες</p>
                          <div className="space-y-4">
                            {publicInfo.votes.map((vote, index) => (
                              <div key={vote.id} className="bg-white/10 p-6 rounded-xl border border-white/20 backdrop-blur-sm">
                                <h4 className="text-xl font-bold mb-2 text-white">{vote.title}</h4>
                                <p className="text-green-200 leading-relaxed">{vote.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 p-8 rounded-2xl border border-green-400/30 backdrop-blur-sm shadow-xl max-w-4xl mx-auto opacity-60">
                          <div className="p-4 bg-green-500/20 rounded-xl w-fit mx-auto mb-6">
                            <Vote className="w-10 h-10 text-green-300/60" />
                          </div>
                          <h3 className="text-3xl font-bold mb-4 text-center text-green-200/60">Ενεργές Ψηφοφορίες</h3>
                          <p className="text-xl text-center text-green-200/60">Δεν υπάρχουν ενεργές ψηφοφορίες</p>
                        </div>
                      )}
                    </div>
                  )}

                  {currentSlideData.id === 'building_statistics' && (
                    <div className="mt-8">
                      <div className="grid grid-cols-3 gap-8 max-w-6xl mx-auto">
                        <div className="bg-gradient-to-br from-blue-500/30 to-blue-600/20 p-8 rounded-2xl border border-blue-400/40 backdrop-blur-sm shadow-xl hover:scale-105 transition-all duration-300">
                          <div className="p-4 bg-blue-500/30 rounded-xl w-fit mx-auto mb-6">
                            <Home className="w-10 h-10" />
                          </div>
                          <h3 className="text-2xl font-bold mb-4 text-center">Διαμερίσματα</h3>
                          <p className="text-5xl font-bold text-center bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">{publicInfo.building_info.apartments_count}</p>
                        </div>
                        <div className="bg-gradient-to-br from-green-500/30 to-green-600/20 p-8 rounded-2xl border border-green-400/40 backdrop-blur-sm shadow-xl hover:scale-105 transition-all duration-300">
                          <div className="p-4 bg-green-500/30 rounded-xl w-fit mx-auto mb-6">
                            <User className="w-10 h-10" />
                          </div>
                          <h3 className="text-2xl font-bold mb-4 text-center">Διαχειριστής</h3>
                          <p className="text-xl text-center font-medium">{publicInfo.building_info.internal_manager_name}</p>
                        </div>
                        <div className="bg-gradient-to-br from-purple-500/30 to-purple-600/20 p-8 rounded-2xl border border-purple-400/40 backdrop-blur-sm shadow-xl hover:scale-105 transition-all duration-300">
                          <div className="p-4 bg-purple-500/30 rounded-xl w-fit mx-auto mb-6">
                            <Phone className="w-10 h-10" />
                          </div>
                          <h3 className="text-2xl font-bold mb-4 text-center">Τηλέφωνο</h3>
                          <p className="text-xl text-center font-medium">{publicInfo.building_info.internal_manager_phone}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentSlideData.id === 'financial_overview' && (
                    <div className="mt-8">
                      <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 p-8 rounded-2xl border border-green-400/30 backdrop-blur-sm shadow-xl max-w-4xl mx-auto opacity-60">
                        <div className="p-4 bg-green-500/20 rounded-xl w-fit mx-auto mb-6">
                          <Euro className="w-10 h-10 text-green-300/60" />
                        </div>
                        <h3 className="text-3xl font-bold mb-4 text-center text-green-200/60">Οικονομική Επισκόπηση</h3>
                        <p className="text-xl text-center text-green-200/60">Δεν υπάρχουν διαθέσιμα οικονομικά στοιχεία</p>
                      </div>
                    </div>
                  )}

                  {currentSlideData.id === 'maintenance_overview' && (
                    <div className="mt-8">
                      <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 p-8 rounded-2xl border border-orange-400/30 backdrop-blur-sm shadow-xl max-w-4xl mx-auto opacity-60">
                        <div className="p-4 bg-orange-500/20 rounded-xl w-fit mx-auto mb-6">
                          <Wrench className="w-10 h-10 text-orange-300/60" />
                        </div>
                        <h3 className="text-3xl font-bold mb-4 text-center text-orange-200/60">Συντήρηση & Επισκευές</h3>
                        <p className="text-xl text-center text-orange-200/60">Δεν υπάρχουν ενεργές εργασίες συντήρησης</p>
                      </div>
                    </div>
                  )}

                  {currentSlideData.id === 'projects_overview' && (
                    <div className="mt-8">
                      <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 p-8 rounded-2xl border border-purple-400/30 backdrop-blur-sm shadow-xl max-w-4xl mx-auto opacity-60">
                        <div className="p-4 bg-purple-500/20 rounded-xl w-fit mx-auto mb-6">
                          <FolderOpen className="w-10 h-10 text-purple-300/60" />
                        </div>
                        <h3 className="text-3xl font-bold mb-4 text-center text-purple-200/60">Έργα & Προσφορές</h3>
                        <p className="text-xl text-center text-purple-200/60">Δεν υπάρχουν ενεργά έργα ή προσφορές</p>
                      </div>
                    </div>
                  )}

                  {/* Custom Widgets */}
                  {currentSlideData.id === 'common_expenses_bill' && (
                    <CommonExpensesBillWidget />
                  )}

                  {currentSlideData.id === 'heating_consumption_chart' && (
                    <HeatingConsumptionChartWidget />
                  )}

                  {currentSlideData.id === 'airbnb_apartments_info' && (
                    <AirbnbInfoWidget />
                  )}
                </div>
              </div>
            </Card>
          )}

        </div>

        {/* Sidebar */}
        <div className="w-80 bg-gradient-to-b from-black/30 to-black/20 backdrop-blur-xl border-l border-white/20 shadow-2xl">
          <div className="p-6 space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">Πληροφορίες</h3>
              <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 mx-auto mt-2 rounded-full"></div>
            </div>
            
            {/* Dynamic Sidebar Widgets from API */}
            {getSidebarWidgets().map((widget, index) => (
              <Card key={widget.id} className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm border-white/30 p-6 shadow-xl hover:scale-105 transition-all duration-300">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-r from-blue-500/30 to-indigo-600/30 rounded-xl">
                    {(() => {
                      const IconComponent = getWidgetIcon(widget.id);
                      return <IconComponent className="w-6 h-6 text-white" />;
                    })()}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white mb-1">{widget.greekName}</h4>
                    <p className="text-sm text-blue-200 leading-relaxed">
                      {renderSidebarWidgetContent(widget)}
                    </p>
                  </div>
                </div>
              </Card>
            ))}

          {/* Default System Info (if no sidebar widgets) */}
          {getSidebarWidgets().length === 0 && (
            <>
              <Card className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm border-white/30 p-6 shadow-xl hover:scale-105 transition-all duration-300">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-r from-blue-500/30 to-indigo-600/30 rounded-xl">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white mb-1">Τρέχουσα Ώρα</h4>
                    <p className="text-sm text-blue-200">{new Date().toLocaleTimeString('el-GR')}</p>
                  </div>
                </div>
              </Card>

              {weatherData && (
                <Card className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm border-white/30 p-6 shadow-xl hover:scale-105 transition-all duration-300">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gradient-to-r from-blue-500/30 to-indigo-600/30 rounded-xl">
                      <Thermometer className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-white mb-1">Καιρός</h4>
                      <p className="text-sm text-blue-200 leading-relaxed">
                        {weatherData.temperature}°C - {weatherData.description}
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              <Card className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm border-white/30 p-6 shadow-xl hover:scale-105 transition-all duration-300">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-r from-blue-500/30 to-indigo-600/30 rounded-xl">
                    <Home className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white mb-1">Διαμερίσματα</h4>
                    <p className="text-sm text-blue-200">{publicInfo?.building_info?.apartments_count || 0} διαμερίσματα</p>
                  </div>
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm border-white/30 p-6 shadow-xl hover:scale-105 transition-all duration-300">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-r from-blue-500/30 to-indigo-600/30 rounded-xl">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white mb-1">Διαχειριστής</h4>
                    <p className="text-sm text-blue-200">{publicInfo?.building_info?.internal_manager_name || 'Δεν υπάρχει'}</p>
                  </div>
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm border-white/30 p-6 shadow-xl hover:scale-105 transition-all duration-300">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-r from-blue-500/30 to-indigo-600/30 rounded-xl">
                    <Bell className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white mb-1">Ανακοινώσεις</h4>
                    <p className="text-sm text-blue-200">{publicInfo?.announcements?.length || 0} ενεργές</p>
                  </div>
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm border-white/30 p-6 shadow-xl hover:scale-105 transition-all duration-300">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-r from-blue-500/30 to-indigo-600/30 rounded-xl">
                    <Vote className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white mb-1">Ψηφοφορίες</h4>
                    <p className="text-sm text-blue-200">{publicInfo?.votes?.length || 0} ενεργές</p>
                  </div>
                </div>
              </Card>
            </>
          )}

          {/* System Status */}
          <Card className="bg-gradient-to-br from-green-500/30 to-green-600/20 backdrop-blur-sm border-green-400/40 p-6 mt-8 shadow-xl hover:scale-105 transition-all duration-300">
            <div className="text-center">
              <div className="w-6 h-6 bg-gradient-to-r from-green-400 to-green-500 rounded-full mx-auto mb-4 animate-pulse shadow-lg"></div>
              <h4 className="font-bold text-white text-lg mb-2">Σύστημα Ενεργό</h4>
              <p className="text-sm text-green-200 leading-relaxed">Όλα τα συστήματα λειτουργούν κανονικά</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
    </div>
  );
}

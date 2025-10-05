'use client';

import React, { useState, useEffect } from 'react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useNews } from '@/hooks/useNews';
import { useKioskData } from '@/hooks/useKioskData';
import { useKioskWeather } from '@/hooks/useKioskWeather';
import { useKioskWidgets } from '@/hooks/useKioskWidgets';
import { useVoiceNavigation } from '@/hooks/useVoiceNavigation';
import { useOfflineVoiceNavigation } from '@/hooks/useOfflineVoiceNavigation';
import BuildingSelector from '@/components/BuildingSelector';
import { KioskWidget } from '@/types/kiosk';
import { hasWidgetData, getWidgetIcon } from '@/lib/kiosk/widgets/registry';
import { getIntelligentWidgetOrder, calculateWidgetPriority } from '@/lib/kiosk/widgetIntelligence';
import WidgetWrapper from '@/components/kiosk/widgets/base/WidgetWrapper';
import UrgentPrioritiesWidget from '@/components/kiosk/widgets/UrgentPrioritiesWidget';
import QRCodeGenerator from '@/components/QRCodeGenerator';

export default function KioskDisplayPage() {
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(1);
  const [showBuildingSelector, setShowBuildingSelector] = useState(false);
  const [widgets, setWidgets] = useState<KioskWidget[]>([]);

  // Function to get the appropriate icon for each slide using the registry
  const getSlideIcon = (widget: KioskWidget, index: number) => {
    return getWidgetIcon(widget);
  };

  // Function to get widget background color from settings
  const getWidgetBackgroundColor = (widget: KioskWidget) => {
    return widget.settings?.backgroundColor || '#0F172A';
  };
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [useOfflineVoice, setUseOfflineVoice] = useState(true); // Default to offline

  // Fetch real data from APIs
  const { news, loading: newsLoading, error: newsError, lastUpdated } = useNews(300000); // Refresh every 5 minutes
  const { data: kioskData, isLoading: kioskLoading, error: kioskError } = useKioskData(selectedBuildingId);
  const { weather, isLoading: weatherLoading, error: weatherError } = useKioskWeather(300000);
  const { widgets: backendWidgets, isLoading: widgetsLoading, error: widgetsError } = useKioskWidgets(selectedBuildingId);

  // Combine real data with weather data for widget compatibility
  const combinedData = React.useMemo(() => {
    if (!kioskData || !weather) return null;

    return {
      ...kioskData,
      weather,
      // Add compatibility aliases for existing widgets
      financial_info: kioskData.financial,
      maintenance_info: kioskData.maintenance
    };
  }, [kioskData, weather]);

  // Initialize widgets with data filtering and intelligent ordering
  useEffect(() => {
    if (selectedBuildingId && combinedData && backendWidgets.length > 0) {
      // Use widgets from backend (already filtered by enabled=true)
      // Note: Backend returns only enabled widgets via PublicKioskWidgetConfigViewSet

      // Filter widgets that have data and exclude AssemblyWidget from main slides
      const widgetsWithData = backendWidgets.filter(widget =>
        hasWidgetData(widget, combinedData) && widget.component !== 'AssemblyWidget'
      );

      // Apply intelligent ordering to main slides
      const mainSlides = widgetsWithData.filter(w => w.category === 'main_slides');
      const intelligentlyOrderedSlides = getIntelligentWidgetOrder(mainSlides, combinedData, 'main_slides');

      // Keep other categories as-is
      const otherWidgets = widgetsWithData.filter(w => w.category !== 'main_slides');

      // Combine intelligently ordered slides with other widgets
      const finalWidgets = [...intelligentlyOrderedSlides, ...otherWidgets];

      setWidgets(finalWidgets);
      setCurrentSlide(0); // Reset slide when widgets change
    }
  }, [selectedBuildingId, combinedData, backendWidgets]);

  // Auto-slide functionality
  useEffect(() => {
    if (!isAutoPlay || widgets.length === 0) return;

    const mainSlides = widgets.filter(w => w.category === 'main_slides');
    if (mainSlides.length === 0) return;

    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % mainSlides.length);
    }, 8000); // 8 seconds per slide

    return () => clearInterval(interval);
  }, [isAutoPlay, widgets]);

  // Keyboard shortcuts
  const { toggleFullscreen } = useKeyboardShortcuts({
    onBuildingSelector: () => setShowBuildingSelector(true),
    onSettings: () => setIsAutoPlay(prev => !prev),
  });

  // Voice navigation
  const mainSlides = widgets.filter(w => w.category === 'main_slides');

  // Command handler (shared by both online and offline)
  const handleVoiceCommand = (command: string) => {
    console.log('Voice command:', command);

    if (command === 'next') {
      setCurrentSlide(prev => (prev + 1) % mainSlides.length);
    } else if (command === 'previous') {
      setCurrentSlide(prev => (prev - 1 + mainSlides.length) % mainSlides.length);
    } else if (command === 'pause') {
      setIsAutoPlay(false);
    } else if (command === 'resume') {
      setIsAutoPlay(true);
    }
  };

  // Online voice (Web Speech API)
  const onlineVoice = useVoiceNavigation({
    onSlideChange: (index) => {
      setCurrentSlide(index);
      setIsAutoPlay(false);
    },
    onCommand: handleVoiceCommand,
    totalSlides: mainSlides.length,
    language: 'el-GR',
    enabled: voiceEnabled && !useOfflineVoice
  });

  // Offline voice (Vosk + WebSocket)
  const offlineVoice = useOfflineVoiceNavigation({
    onSlideChange: (index) => {
      setCurrentSlide(index);
      setIsAutoPlay(false);
    },
    onCommand: handleVoiceCommand,
    totalSlides: mainSlides.length,
    enabled: voiceEnabled && useOfflineVoice,
    websocketUrl: 'ws://localhost:8765'
  });

  // Use the appropriate voice system
  const {
    isListening,
    lastCommand,
    error: voiceError
  } = useOfflineVoice ? offlineVoice : onlineVoice;

  const sidebarWidgets = widgets.filter(w => w.category === 'sidebar_widgets');
  const topBarWidgets = widgets.filter(w => w.category === 'top_bar_widgets');

  const handleBuildingChange = (buildingId: number | null) => {
    setSelectedBuildingId(buildingId);
    setShowBuildingSelector(false);
    setCurrentSlide(0);
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 text-gray-900 flex flex-col overflow-hidden">

      {/* Loading State */}
      {(kioskLoading || weatherLoading || widgetsLoading) && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 text-center shadow-lg border border-gray-200">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <div className="text-gray-800">Φόρτωση δεδομένων...</div>
          </div>
        </div>
      )}

      {/* Error State */}
      {(kioskError || weatherError || widgetsError) && (
        <div className="absolute top-24 right-4 bg-red-100/90 border border-red-300 text-red-800 px-4 py-2 rounded-lg z-40 backdrop-blur-sm">
          <div className="text-sm">
            ⚠️ {kioskError || weatherError || widgetsError}
          </div>
        </div>
      )}

      {/* Voice Status Indicator */}
      {voiceEnabled && (
        <div className="absolute top-24 left-4 bg-white/90 border border-green-300 text-gray-800 px-4 py-2 rounded-lg z-40 backdrop-blur-sm shadow-lg">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex items-center space-x-3">
              <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
              <div className="text-sm">
                {isListening ? '🎤 Ακούω...' : '🎤 Φωνητική πλοήγηση ενεργή'}
              </div>
            </div>
            <button
              onClick={() => setUseOfflineVoice(prev => !prev)}
              className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition-colors"
              title={useOfflineVoice ? 'Χρήση Online Voice' : 'Χρήση Offline Voice'}
            >
              {useOfflineVoice ? '🖥️ Offline' : '☁️ Online'}
            </button>
          </div>
          {lastCommand && (
            <div className="text-xs text-gray-600 mt-1">
              Τελευταία εντολή: "{lastCommand}"
            </div>
          )}
          {voiceError && (
            <div className="text-xs text-red-600 mt-1">
              {voiceError}
            </div>
          )}
          {useOfflineVoice && (
            <div className="text-xs text-gray-500 mt-1">
              {offlineVoice.isConnected ? '✅ WebSocket connected' : '⏳ Connecting...'}
            </div>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col">
        {/* Top Row: Sidebar and Slides */}
        <div className="flex flex-1">
          {/* Sidebar */}
          <div className="w-64 sm:w-80 bg-white/60 backdrop-blur-sm p-2 sm:p-4 space-y-2 sm:space-y-4 overflow-y-auto border-r border-gray-300/30 shadow-sm">
            {/* Header Info Card */}
            <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-lg p-3 hover:bg-white/90 transition-all duration-300 shadow-sm">
              <div className="space-y-2">
                <div className="text-sm font-semibold text-gray-800">
                  {kioskData?.building_info?.address || 'Αλκμάνος 22, Αθήνα'}
                </div>
                <div className="text-xs text-gray-600">
                  {new Date().toLocaleDateString('el-GR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-800">
                    {new Date().toLocaleTimeString('el-GR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setVoiceEnabled(prev => !prev)}
                      className={`p-1 rounded text-xs transition-all ${
                        voiceEnabled
                          ? 'bg-green-600/80 text-white animate-pulse'
                          : 'hover:bg-gray-200/80 text-gray-700'
                      }`}
                      title={voiceEnabled ? 'Απενεργοποίηση φωνητικής πλοήγησης' : 'Ενεργοποίηση φωνητικής πλοήγησης'}
                    >
                      🎤
                    </button>
                    <button
                      onClick={toggleFullscreen}
                      className="p-1 hover:bg-gray-200/80 text-gray-700 rounded transition-colors text-xs"
                      title="Toggle Fullscreen (F11)"
                    >
                      ⛶
                    </button>
                  </div>
                </div>
              </div>
            </div>
            {/* Weather Widget */}
            {weather && (
              <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-lg p-4 hover:bg-white/90 transition-all duration-300 shadow-sm">
                <h3 className="text-lg font-semibold text-blue-700 mb-4">🌤️ Καιρός</h3>
                
                {/* Current Weather */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-2xl font-bold text-gray-800">
                      {weather.current.temperature}°C
                    </div>
                    <div className="text-sm text-gray-600">
                      {weather.current.condition}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div>Υγρασία: {weather.current.humidity}%</div>
                    <div>Άνεμος: {weather.current.wind_speed} km/h</div>
                    <div>Ορατότητα: {weather.current.visibility} km</div>
                    <div>Αίσθηση: {weather.current.feels_like}°C</div>
                  </div>
                  
                  <div className="flex justify-between text-xs text-gray-600 mt-2">
                    <div>Ανατολή: {weather.current.sunrise}</div>
                    <div>Δύση: {weather.current.sunset}</div>
                  </div>
                </div>

                {/* Weather Forecast */}
                <div>
                  <h4 className="text-sm font-semibold text-blue-600 mb-2">Πρόγνωση</h4>
                  <div className="space-y-2">
                    {weather.forecast.map((day: any, index: number) => (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <div className="text-gray-600">{day.day}</div>
                        <div className="text-lg">{day.icon}</div>
                        <div className="text-gray-800 font-semibold">
                          {day.high}° / {day.low}°
                        </div>
                        <div className="text-gray-500">{day.condition}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* QR Code Widget */}
            <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-lg p-4 hover:bg-white/90 transition-all duration-300 shadow-sm">
              <h3 className="text-lg font-semibold text-blue-700 mb-4">📱 Σύνδεση</h3>
              <div className="flex flex-col items-center space-y-3">
                <div className="bg-white p-2 rounded-lg">
                  <QRCodeGenerator 
                    url={`${window.location.origin}/dashboard`}
                    size={100}
                    className="rounded"
                  />
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-gray-800">Συνδεθείτε</div>
                  <div className="text-xs text-gray-600">Σαρώστε για πρόσβαση στο Dashboard</div>
                </div>
              </div>
            </div>

            {/* Manager Widget */}
            <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-lg p-4 hover:bg-white/90 transition-all duration-300 shadow-sm">
              <h3 className="text-lg font-semibold text-blue-700 mb-4">👨‍💼 Διαχειριστής</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-semibold text-gray-800">Εσωτερικός Διαχειριστής</div>
                  <div className="text-sm text-gray-600">Γιάννης Παπαδόπουλος</div>
                  <div className="text-sm text-blue-600">+30 210 123 4567</div>
                </div>
                
                <div className="border-t border-gray-200/50 pt-3">
                  <div className="text-xs text-gray-600 mb-1">Διαμερίσματα:</div>
                  <div className="text-sm text-gray-800">Α1, Α2, Β1, Β2, Γ1, Γ2</div>
                </div>
                
                <div className="border-t border-gray-200/50 pt-3">
                  <div className="text-xs text-gray-600 mb-1">Πληρωμή Κοινόχρηστων:</div>
                  <div className="text-sm text-gray-800">Δευτέρα - Παρασκευή</div>
                  <div className="text-xs text-gray-600">09:00 - 17:00</div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area - 2x2 Grid Layout */}
          <div className="flex-1 p-2 sm:p-6 overflow-hidden">
            {mainSlides.length > 0 && combinedData && (
              <div className="h-full flex flex-col">
                {/* Navigation Icons - Fixed Height: 56px (h-14) - Reduced Size */}
                <div className="h-14 flex justify-center items-center space-x-6 flex-shrink-0">
                  {mainSlides.length > 1 && mainSlides.map((widget, index) => {
                    const IconComponent = getSlideIcon(widget, index);
                    const widgetBgColor = getWidgetBackgroundColor(widget);
                    return (
                      <button
                        key={index}
                        onClick={() => setCurrentSlide(index)}
                        className={`p-3 rounded-lg transition-all duration-300 ${
                          index === currentSlide
                            ? 'text-white shadow-lg scale-105'
                            : 'bg-white/80 text-gray-600 hover:bg-blue-100 hover:text-blue-700 hover:shadow-md hover:scale-105 border border-gray-200'
                        }`}
                        style={index === currentSlide ? {
                          backgroundColor: widgetBgColor,
                          boxShadow: `0 10px 25px -3px ${widgetBgColor}50, 0 4px 6px -2px ${widgetBgColor}30`
                        } : {}}
                        title={widget.name || `Slide ${index + 1}`}
                      >
                        <IconComponent className="w-6 h-6" />
                      </button>
                    );
                  })}
                </div>

                {/* Custom Grid Content - Left 30%, Right 70% */}
                <div className="relative overflow-hidden flex-1 flex gap-4 p-2" style={{ height: 'calc(100% - 184px)' }}>
                  {/* Left Column - 30% */}
                  <div className="w-[30%] flex flex-col gap-4">
                    {/* Top Left - Assembly Widget (Permanent, only if has data) */}
                    {(() => {
                      // Check if there are assembly announcements
                      const hasAssemblyData = combinedData?.announcements?.some((a: any) =>
                        a.title?.includes('Συνέλευση') || a.title?.includes('Σύγκληση')
                      );
                      
                      return hasAssemblyData ? (
                        <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-lg overflow-hidden shadow-sm flex items-center justify-center flex-1">
                          <div className="w-full h-full">
                            <WidgetWrapper
                              widget={{
                                id: 'assembly-widget',
                                name: 'General Assembly',
                                description: 'Upcoming general assembly information',
                                category: 'main_slides',
                                component: 'AssemblyWidget',
                                enabled: true,
                                order: 0,
                            settings: {
                              title: '',
                              showTitle: false,
                              gridSize: 'medium',
                              dataSource: '/api/public-info',
                              refreshInterval: 300,
                            },
                              }}
                              data={combinedData}
                              className="h-full"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-lg overflow-hidden flex items-center justify-center shadow-sm flex-1">
                          <div className="text-center text-gray-500">
                            <div className="text-4xl mb-2">📅</div>
                            <div className="text-sm font-semibold">Δεν υπάρχει προγραμματισμένη συνέλευση</div>
                          </div>
                        </div>
                      );
                    })()}
                    
                    {/* Bottom Left - Next Main Slide */}
                    <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-lg overflow-hidden shadow-sm flex-1">
                      <WidgetWrapper
                        widget={mainSlides[(currentSlide + 1) % mainSlides.length]}
                        data={combinedData}
                        className="h-full"
                      />
                    </div>
                  </div>

                  {/* Right Column - 70% */}
                  <div className="w-[70%] flex flex-col gap-4">
                    {/* Top Right - Current Main Slide */}
                    <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-lg overflow-hidden shadow-sm flex-1">
                  <WidgetWrapper
                    widget={mainSlides[currentSlide]}
                    data={combinedData}
                    className="h-full"
                  />
                </div>

                    {/* Bottom Right - Previous Main Slide */}
                    <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-lg overflow-hidden shadow-sm flex-1">
                      <WidgetWrapper
                        widget={mainSlides[(currentSlide - 1 + mainSlides.length) % mainSlides.length]}
                        data={combinedData}
                        className="h-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Urgent Priorities Widget - Fixed Height: 128px (h-32) - Light theme */}
                <div className="h-32 backdrop-blur-sm border-t border-gray-200/50 p-4 flex-shrink-0 bg-white/90 shadow-sm">
                  <UrgentPrioritiesWidget
                    data={combinedData}
                    settings={{
                      title: 'Άμεσες Προτεραιότητες',
                      showTitle: true,
                      maxItems: 3,
                      showDueDates: true,
                      showContact: true,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Footer */}
      <div className="h-20 flex-shrink-0 bg-white/80 backdrop-blur-sm border-t border-gray-200/50 shadow-sm">
        <div className="grid grid-cols-12 h-full">


          {/* News Ticker Section */}
          <div className="col-span-12 flex items-center px-6 py-4 overflow-hidden">
            <div className="flex items-center space-x-2 sm:space-x-3 w-full">
              <div className="text-xs sm:text-sm font-semibold text-gray-800 whitespace-nowrap">
                📰 Ειδήσεις:
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="animate-scroll-left whitespace-nowrap text-xs sm:text-sm text-gray-600">
                  {news && news.map((title, index) => (
                    <span key={index}>
                      {title}
                      {index < news.length - 1 && ' • '}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Auto-play Status & Priority Debug */}
      <div className="absolute bottom-32 right-4 space-y-2">
        <button
          onClick={() => setIsAutoPlay(prev => !prev)}
          className={`px-3 py-1 rounded text-xs border ${
            isAutoPlay
              ? 'bg-blue-600/90 text-white border-blue-500'
              : 'bg-white/90 text-gray-700 border-gray-300'
          }`}
          title="Toggle Auto-play (Ctrl+Alt+S)"
        >
          {isAutoPlay ? '▶️ Auto' : '⏸️ Manual'}
        </button>

        {/* Priority Debug Info (Development Only) */}
        {process.env.NODE_ENV === 'development' && mainSlides.length > 0 && combinedData && (
          <div className="bg-white/90 backdrop-blur-sm rounded p-2 text-xs border border-gray-300 max-w-xs">
            <div className="font-semibold mb-1">Widget Priorities:</div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {mainSlides.map((widget, idx) => {
                const priority = calculateWidgetPriority(widget, combinedData);
                return (
                  <div
                    key={widget.id}
                    className={`p-1 rounded ${idx === currentSlide ? 'bg-blue-100 border border-blue-300' : 'bg-gray-50'}`}
                  >
                    <div className="font-semibold text-gray-800">
                      #{idx + 1}: {widget.name}
                    </div>
                    <div className="text-gray-600">Score: {priority.score.toFixed(0)}</div>
                    {priority.reasons.length > 0 && (
                      <div className="text-gray-500 text-xs">
                        {priority.reasons.join(', ')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>


      {/* Building Selector Modal */}
      <BuildingSelector
        isOpen={showBuildingSelector}
        onClose={() => setShowBuildingSelector(false)}
        onBuildingSelect={(building) => handleBuildingChange(building?.id || null)}
        selectedBuilding={selectedBuildingId ? { id: selectedBuildingId, name: `Κτίριο ${selectedBuildingId}`, address: '', city: '', created_at: new Date().toISOString() } : null}
        currentBuilding={selectedBuildingId ? { id: selectedBuildingId, name: `Κτίριο ${selectedBuildingId}`, address: '', city: '', created_at: new Date().toISOString() } : null}
      />
    </div>
  );
}
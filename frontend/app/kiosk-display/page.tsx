'use client';

import React, { useState, useEffect } from 'react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useNews } from '@/hooks/useNews';
import { useKioskData } from '@/hooks/useKioskData';
import { useKioskWeather } from '@/hooks/useKioskWeather';
import { useVoiceNavigation } from '@/hooks/useVoiceNavigation';
import BuildingSelector from '@/components/BuildingSelector';
import { KioskWidget } from '@/types/kiosk';
import { getSystemWidgets, hasWidgetData, getWidgetIcon } from '@/lib/kiosk/widgets/registry';
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

  // Fetch real data from APIs
  const { news, loading: newsLoading, error: newsError, lastUpdated } = useNews(300000); // Refresh every 5 minutes
  const { data: kioskData, isLoading: kioskLoading, error: kioskError } = useKioskData(selectedBuildingId);
  const { weather, isLoading: weatherLoading, error: weatherError } = useKioskWeather(300000);

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

  // Initialize widgets with data filtering
  useEffect(() => {
    if (selectedBuildingId) {
      const systemWidgets = getSystemWidgets(selectedBuildingId);
      const enabledWidgets = systemWidgets.filter(w => w.enabled);

      // Filter widgets that have data
      const widgetsWithData = enabledWidgets.filter(widget =>
        hasWidgetData(widget, combinedData)
      );

      setWidgets(widgetsWithData);
      setCurrentSlide(0); // Reset slide when widgets change
    }
  }, [selectedBuildingId, combinedData]);

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
  const {
    isListening,
    lastCommand,
    error: voiceError,
    startListening,
    stopListening
  } = useVoiceNavigation({
    onSlideChange: (index) => {
      setCurrentSlide(index);
      setIsAutoPlay(false);
    },
    onCommand: (command) => {
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
    },
    totalSlides: mainSlides.length,
    language: 'el-GR',
    enabled: voiceEnabled
  });

  const sidebarWidgets = widgets.filter(w => w.category === 'sidebar_widgets');
  const topBarWidgets = widgets.filter(w => w.category === 'top_bar_widgets');

  const handleBuildingChange = (buildingId: number | null) => {
    setSelectedBuildingId(buildingId);
    setShowBuildingSelector(false);
    setCurrentSlide(0);
  };

  return (
    <div className="h-screen bg-gradient-to-br from-kiosk-neutral-950 via-kiosk-primary-dark to-kiosk-secondary-dark text-white flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="h-20 flex-shrink-0 bg-kiosk-neutral-900/80 backdrop-blur-sm flex items-center justify-between px-8 py-4 border-b border-kiosk-primary/30">
        <div className="flex items-center space-x-6">
          <div className="text-xl font-bold">
            {kioskData?.building_info?.address || 'Αλκμάνος 22, Αθήνα'}
          </div>
          <div className="text-sm text-kiosk-neutral-300">
            {new Date().toLocaleDateString('el-GR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
        </div>

        <div className="flex items-center space-x-6">
          {/* Current Time */}
          <div className="text-lg font-semibold">
            {new Date().toLocaleTimeString('el-GR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>

          {/* Voice Control Button */}
          <button
            onClick={() => setVoiceEnabled(prev => !prev)}
            className={`p-2 rounded transition-all ${
              voiceEnabled
                ? 'bg-green-600/80 text-white animate-pulse'
                : 'hover:bg-kiosk-neutral-800/30'
            }`}
            title={voiceEnabled ? 'Απενεργοποίηση φωνητικής πλοήγησης' : 'Ενεργοποίηση φωνητικής πλοήγησης'}
          >
            🎤
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 hover:bg-kiosk-neutral-800/30 rounded transition-colors"
            title="Toggle Fullscreen (F11)"
          >
            ⛶
          </button>
        </div>
      </div>

      {/* Loading State */}
      {(kioskLoading || weatherLoading) && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-kiosk-neutral-800 rounded-lg p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-kiosk-primary mx-auto mb-4"></div>
            <div className="text-white">Φόρτωση δεδομένων...</div>
          </div>
        </div>
      )}

      {/* Error State */}
      {(kioskError || weatherError) && (
        <div className="absolute top-24 right-4 bg-red-900/80 border border-red-700 text-red-100 px-4 py-2 rounded-lg z-40">
          <div className="text-sm">
            ⚠️ {kioskError || weatherError}
          </div>
        </div>
      )}

      {/* Voice Status Indicator */}
      {voiceEnabled && (
        <div className="absolute top-24 left-4 bg-kiosk-neutral-900/90 border border-green-500/50 text-white px-4 py-2 rounded-lg z-40 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
            <div className="text-sm">
              {isListening ? '🎤 Ακούω...' : '🎤 Φωνητική πλοήγηση ενεργή'}
            </div>
          </div>
          {lastCommand && (
            <div className="text-xs text-kiosk-neutral-300 mt-1">
              Τελευταία εντολή: "{lastCommand}"
            </div>
          )}
          {voiceError && (
            <div className="text-xs text-red-400 mt-1">
              {voiceError}
            </div>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col">
        {/* Top Row: Slides and Sidebar */}
        <div className="flex flex-1">
          {/* Main Slides */}
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
                            : 'bg-kiosk-neutral-800/50 text-kiosk-neutral-400 hover:bg-kiosk-primary/30 hover:text-kiosk-primary-lighter hover:shadow-md hover:shadow-kiosk-primary/30 hover:scale-105'
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

                {/* Slide Content - Fixed Height: calc(100% - 184px) where 184px = 56px nav + 128px priorities */}
                <div className="relative overflow-hidden flex-1" style={{ height: 'calc(100% - 184px)' }}>
                  <WidgetWrapper
                    widget={mainSlides[currentSlide]}
                    data={combinedData}
                    className="h-full"
                  />
                </div>

                {/* Urgent Priorities Widget - Fixed Height: 128px (h-32) - Integrated with #0A7181 */}
                <div className="h-32 backdrop-blur-sm border-t border-kiosk-primary/20 p-4 flex-shrink-0" style={{ backgroundColor: '#0A7181' }}>
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

          {/* Sidebar */}
          <div className="w-64 sm:w-80 bg-kiosk-neutral-900/40 backdrop-blur-sm p-2 sm:p-4 space-y-2 sm:space-y-4 overflow-y-auto border-l border-kiosk-primary/20">
            {/* Weather Widget */}
            {weather && (
              <div className="bg-kiosk-neutral-800/20 backdrop-blur-sm border border-kiosk-primary/20 rounded-lg p-4 hover:bg-kiosk-neutral-800/30 transition-all duration-300">
                <h3 className="text-lg font-semibold text-kiosk-primary-lighter mb-4">🌤️ Καιρός</h3>
                
                {/* Current Weather */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-2xl font-bold text-white">
                      {weather.current.temperature}°C
                    </div>
                    <div className="text-sm text-kiosk-neutral-300">
                      {weather.current.condition}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs text-kiosk-neutral-300">
                    <div>Υγρασία: {weather.current.humidity}%</div>
                    <div>Άνεμος: {weather.current.wind_speed} km/h</div>
                    <div>Ορατότητα: {weather.current.visibility} km</div>
                    <div>Αίσθηση: {weather.current.feels_like}°C</div>
                  </div>
                  
                  <div className="flex justify-between text-xs text-kiosk-neutral-300 mt-2">
                    <div>Ανατολή: {weather.current.sunrise}</div>
                    <div>Δύση: {weather.current.sunset}</div>
                  </div>
                </div>

                {/* Weather Forecast */}
                <div>
                  <h4 className="text-sm font-semibold text-kiosk-primary-lighter mb-2">Πρόγνωση</h4>
                  <div className="space-y-2">
                    {weather.forecast.map((day: any, index: number) => (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <div className="text-kiosk-neutral-300">{day.day}</div>
                        <div className="text-lg">{day.icon}</div>
                        <div className="text-white font-semibold">
                          {day.high}° / {day.low}°
                        </div>
                        <div className="text-kiosk-neutral-400">{day.condition}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* QR Code Widget */}
            <div className="bg-kiosk-neutral-800/20 backdrop-blur-sm border border-kiosk-primary/20 rounded-lg p-4 hover:bg-kiosk-neutral-800/30 transition-all duration-300">
              <h3 className="text-lg font-semibold text-kiosk-primary-lighter mb-4">📱 Σύνδεση</h3>
              <div className="flex flex-col items-center space-y-3">
                <div className="bg-white p-2 rounded-lg">
                  <QRCodeGenerator 
                    url={`${window.location.origin}/dashboard`}
                    size={100}
                    className="rounded"
                  />
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-white">Συνδεθείτε</div>
                  <div className="text-xs text-kiosk-neutral-300">Σαρώστε για πρόσβαση στο Dashboard</div>
                </div>
              </div>
            </div>

            {/* Manager Widget */}
            <div className="bg-kiosk-neutral-800/20 backdrop-blur-sm border border-kiosk-primary/20 rounded-lg p-4 hover:bg-kiosk-neutral-800/30 transition-all duration-300">
              <h3 className="text-lg font-semibold text-kiosk-primary-lighter mb-4">👨‍💼 Διαχειριστής</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-semibold text-white">Εσωτερικός Διαχειριστής</div>
                  <div className="text-sm text-kiosk-neutral-300">Γιάννης Παπαδόπουλος</div>
                  <div className="text-sm text-kiosk-primary-lighter">+30 210 123 4567</div>
                </div>
                
                <div className="border-t border-kiosk-primary/20 pt-3">
                  <div className="text-xs text-kiosk-neutral-300 mb-1">Διαμερίσματα:</div>
                  <div className="text-sm text-white">Α1, Α2, Β1, Β2, Γ1, Γ2</div>
                </div>
                
                <div className="border-t border-kiosk-primary/20 pt-3">
                  <div className="text-xs text-kiosk-neutral-300 mb-1">Πληρωμή Κοινόχρηστων:</div>
                  <div className="text-sm text-white">Δευτέρα - Παρασκευή</div>
                  <div className="text-xs text-kiosk-neutral-300">09:00 - 17:00</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Footer */}
      <div className="h-20 flex-shrink-0 bg-kiosk-neutral-900/80 backdrop-blur-sm border-t border-kiosk-primary/30">
        <div className="grid grid-cols-12 h-full">


          {/* News Ticker Section */}
          <div className="col-span-12 flex items-center px-6 py-4 overflow-hidden">
            <div className="flex items-center space-x-2 sm:space-x-3 w-full">
              <div className="text-xs sm:text-sm font-semibold text-white whitespace-nowrap">
                📰 Ειδήσεις:
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="animate-scroll-left whitespace-nowrap text-xs sm:text-sm text-kiosk-neutral-300">
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

      {/* Auto-play Status */}
      <div className="absolute bottom-32 right-4">
        <button
          onClick={() => setIsAutoPlay(prev => !prev)}
          className={`px-3 py-1 rounded text-xs ${
            isAutoPlay
              ? 'bg-kiosk-accent/80 text-white'
              : 'bg-kiosk-neutral-600/80 text-kiosk-neutral-300'
          }`}
          title="Toggle Auto-play (Ctrl+Alt+S)"
        >
          {isAutoPlay ? '▶️ Auto' : '⏸️ Manual'}
        </button>
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
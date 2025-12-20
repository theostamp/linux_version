'use client';

import { useState, useEffect, useMemo } from 'react';
import { BaseWidgetProps } from '@/types/kiosk';
import AnnouncementsVotesCarousel from './AnnouncementsVotesCarousel';
import CurrentMonthExpensesWidget from './CurrentMonthExpensesWidget';
import HeatingChartWidget from './HeatingChartWidget';

interface AnnouncementsExpensesSliderProps extends BaseWidgetProps {
  buildingId?: number | null;
}

// Check if we're in heating season (September to May)
const isHeatingSeasonActive = (): boolean => {
  const month = new Date().getMonth(); // 0-11
  // Heating season: September (8) to May (4)
  // NOT heating season: June (5) to August (7)
  return month <= 4 || month >= 8;
};

export default function AnnouncementsExpensesSlider({ data, isLoading, error, buildingId }: AnnouncementsExpensesSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const shouldShowHeatingWidget = useMemo(() => {
    const hasHeatingExpenses =
      Array.isArray(data?.financial?.heating_expenses) && data.financial.heating_expenses.length > 0;
    const hasHeatingPeriod = Boolean(data?.financial?.heating_period);
    return hasHeatingExpenses || hasHeatingPeriod || isHeatingSeasonActive();
  }, [data]);

  // Filter widgets based on heating season
  const widgets = useMemo(() => {
    const baseWidgets = [
      {
        id: 'announcements-votes',
        name: 'Ανακοινώσεις & Ψηφοφορίες',
        Component: AnnouncementsVotesCarousel,
      },
      {
        id: 'expenses',
        name: 'Δαπάνες Τρέχοντος Μήνα',
        Component: CurrentMonthExpensesWidget,
      },
    ];
    
    // Show heating chart when it has data/period, or during heating season.
    if (shouldShowHeatingWidget) {
      baseWidgets.push({
        id: 'heating',
        name: 'Κατανάλωση Θέρμανσης',
        Component: HeatingChartWidget,
      });
    }
    
    return baseWidgets;
  }, [shouldShowHeatingWidget]);

  // Keep currentIndex valid when widget list changes
  useEffect(() => {
    setCurrentIndex((prev) => (widgets.length === 0 ? 0 : prev % widgets.length));
  }, [widgets.length]);

  // Auto-advance slider every 15 seconds
  useEffect(() => {
    if (widgets.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % widgets.length);
    }, 15000); // 15 seconds per widget

    return () => clearInterval(interval);
  }, [widgets.length]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-300"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-300">
        <div className="text-center">
          <div className="text-xl mb-2">⚠️</div>
          <p className="text-xs">Σφάλμα φόρτωσης δεδομένων</p>
        </div>
      </div>
    );
  }

  const CurrentWidget = widgets[currentIndex].Component;

  return (
    <div className="h-full flex flex-col">
      {/* Widget Content - Clean, no navigation controls */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full">
          <CurrentWidget 
            data={data} 
            isLoading={false} 
            error={undefined}
            buildingId={buildingId}
          />
        </div>
      </div>
    </div>
  );
}


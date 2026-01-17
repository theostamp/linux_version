'use client';

import { useState, useEffect, useMemo } from 'react';
import { BaseWidgetProps } from '@/types/kiosk';
import AnnouncementsVotesCarousel from './AnnouncementsVotesCarousel';
import CurrentMonthExpensesWidget from './CurrentMonthExpensesWidget';
import HeatingChartWidget from './HeatingChartWidget';

interface AnnouncementsExpensesSliderProps extends BaseWidgetProps {
  buildingId?: number | null;
}

// We rotate widgets faster than the default scene duration (often 30s),
// otherwise the 3rd widget (Heating chart) may never be shown before the scene switches.
const WIDGET_ROTATION_MS = 9000; // 9s -> 3 widgets fit in ~27s

// Check if we're in heating season (September to May)
const isHeatingSeasonActive = (): boolean => {
  const month = new Date().getMonth(); // 0-11
  // Heating season: September (8) to May (4)
  // NOT heating season: June (5) to August (7)
  return month <= 4 || month >= 8;
};

export default function AnnouncementsExpensesSlider({ data, isLoading, error, buildingId }: AnnouncementsExpensesSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Match AnnouncementsVotesCarousel filtering so we don't show an empty slide
  const hasAnnouncementsOrVotes = useMemo(() => {
    const rawAnnouncements = Array.isArray(data?.announcements) ? data.announcements : [];
    const filteredAnnouncements = rawAnnouncements.filter((ann: any) =>
      !ann?.title?.toLowerCase?.().includes('συνέλευση') &&
      !ann?.title?.toLowerCase?.().includes('σύγκληση')
    );
    const votes = Array.isArray(data?.votes) ? data.votes : [];
    return filteredAnnouncements.length > 0 || votes.length > 0;
  }, [data]);

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
        id: 'expenses',
        name: 'Σύνολο Οφειλών',
        Component: CurrentMonthExpensesWidget,
      },
    ];

    if (hasAnnouncementsOrVotes) {
      baseWidgets.unshift({
        id: 'announcements-votes',
        name: 'Ανακοινώσεις & Ψηφοφορίες',
        Component: AnnouncementsVotesCarousel,
      });
    }

    // Show heating chart when it has data/period, or during heating season.
    if (shouldShowHeatingWidget) {
      baseWidgets.push({
        id: 'heating',
        name: 'Κατανάλωση Θέρμανσης',
        Component: HeatingChartWidget,
      });
    }

    return baseWidgets;
  }, [shouldShowHeatingWidget, hasAnnouncementsOrVotes]);

  // Keep currentIndex valid when widget list changes
  useEffect(() => {
    setCurrentIndex((prev) => (widgets.length === 0 ? 0 : prev % widgets.length));
  }, [widgets.length]);

  // Auto-advance slider every 15 seconds
  useEffect(() => {
    if (widgets.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % widgets.length);
    }, WIDGET_ROTATION_MS);

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
      {/* Minimal slider header so users understand there are multiple panels */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] uppercase tracking-[0.12em] text-indigo-200/80">
          {widgets[currentIndex]?.name}
        </div>
        {widgets.length > 1 && (
          <div className="flex items-center gap-1">
            {widgets.map((w, idx) => (
              <span
                key={w.id}
                className={`h-1.5 w-1.5 rounded-full ${
                  idx === currentIndex ? 'bg-indigo-200' : 'bg-indigo-200/30'
                }`}
              />
            ))}
          </div>
        )}
      </div>
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

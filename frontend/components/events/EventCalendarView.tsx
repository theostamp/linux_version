'use client';

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useCalendarEvents } from '@/hooks/useEvents';

interface EventCalendarViewProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

const DAYS_OF_WEEK = ['Κυρ', 'Δευ', 'Τρί', 'Τετ', 'Πέμ', 'Παρ', 'Σάβ'];
const MONTHS = [
  'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος',
  'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'
];

export default function EventCalendarView({ selectedDate, onDateSelect }: EventCalendarViewProps) {
  const { selectedBuilding } = useBuilding();
  const [currentMonth, setCurrentMonth] = useState(selectedDate);

  // Calculate month range for API call
  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

  // Memoize filters to prevent infinite re-renders
  const calendarFilters = useMemo(() => ({
    building: selectedBuilding?.id,
    start_date: monthStart.toISOString(),
    end_date: monthEnd.toISOString()
  }), [selectedBuilding?.id, currentMonth.getFullYear(), currentMonth.getMonth()]);

  const { data: events = [], isLoading } = useCalendarEvents(calendarFilters);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: { [key: string]: any[] } = {};
    
    events.forEach((event: any) => {
      const eventDate = new Date(event.scheduled_date || event.due_date);
      const dateKey = `${eventDate.getFullYear()}-${eventDate.getMonth()}-${eventDate.getDate()}`;
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });
    
    return grouped;
  }, [events]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentMonth(newMonth);
  };

  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    
    // Start from Sunday of the week containing the first day
    startDate.setDate(firstDay.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDate = new Date(startDate);
    
    // Generate 6 weeks (42 days)
    for (let i = 0; i < 42; i++) {
      const dateKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`;
      const dayEvents = eventsByDate[dateKey] || [];
      
      days.push({
        date: new Date(currentDate),
        isCurrentMonth: currentDate.getMonth() === month,
        isToday: 
          currentDate.getDate() === new Date().getDate() &&
          currentDate.getMonth() === new Date().getMonth() &&
          currentDate.getFullYear() === new Date().getFullYear(),
        isSelected: 
          currentDate.getDate() === selectedDate.getDate() &&
          currentDate.getMonth() === selectedDate.getMonth() &&
          currentDate.getFullYear() === selectedDate.getFullYear(),
        events: dayEvents
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();

  const getEventCount = (events: any[]) => {
    if (events.length === 0) return null;
    if (events.length <= 3) return events.length;
    return '3+';
  };

  const getDayEvents = (date: Date) => {
    const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return eventsByDate[dateKey] || [];
  };

  const selectedDayEvents = getDayEvents(selectedDate);

  return (
    <div className="flex flex-col h-full">
      {/* Calendar Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('prev')}
              className="p-1"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('next')}
              className="p-1"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS_OF_WEEK.map((day) => (
            <div key={day} className="text-xs font-medium text-gray-500 dark:text-gray-400 text-center p-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            const eventCount = getEventCount(day.events);
            
            return (
              <button
                key={index}
                onClick={() => onDateSelect(day.date)}
                className={`
                  relative p-1 text-xs h-8 rounded transition-colors
                  ${day.isCurrentMonth
                    ? 'text-gray-900 dark:text-gray-100'
                    : 'text-gray-400 dark:text-gray-600'
                  }
                  ${day.isToday
                    ? 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100 font-bold'
                    : ''
                  }
                  ${day.isSelected
                    ? 'bg-blue-500 text-white'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                `}
              >
                <span>{day.date.getDate()}</span>
                {eventCount && (
                  <span className={`
                    absolute -top-0.5 -right-0.5 inline-flex items-center justify-center
                    text-[9px] font-bold rounded-full min-w-[14px] h-[14px] px-1
                    ${day.isSelected
                      ? 'bg-white text-blue-500'
                      : 'bg-red-500 text-white'
                    }
                  `}>
                    {eventCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Events */}
      <div className="flex-1 overflow-auto p-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
          Συμβάντα για {selectedDate.toLocaleDateString('el-GR', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long' 
          })}
        </h4>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ))}
          </div>
        ) : selectedDayEvents.length === 0 ? (
          <div className="text-center py-6">
            <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Δεν υπάρχουν συμβάντα για αυτή την ημερομηνία
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedDayEvents.map((event: any) => (
              <div
                key={event.id}
                className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex items-start gap-2">
                  <span className="text-base flex-shrink-0">{event.type_icon}</span>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                      {event.title}
                    </h5>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {event.event_type_display}
                    </p>
                    {event.scheduled_date && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>
                          {new Date(event.scheduled_date).toLocaleTimeString('el-GR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                  {event.is_urgent_priority && (
                    <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-1" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
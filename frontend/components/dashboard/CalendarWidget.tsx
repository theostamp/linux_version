'use client';

import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Eye, 
  ExternalLink, 
  RefreshCw,
  Settings,
  ChevronRight,
  MapPin,
  Users,
  Wrench,
  MessageSquare,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useCalendarStatusExtended, useSyncCalendar, googleCalendarUtils } from '@/hooks/useGoogleCalendar';
import { useCalendarEvents, Event } from '@/hooks/useEvents';
import CalendarPreviewModal from '@/components/modals/CalendarPreviewModal';
import CalendarSetupModal from '@/components/modals/CalendarSetupModal';

// Map Event to CalendarEvent interface for display
interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  location?: string;
  type: 'maintenance' | 'meeting' | 'announcement' | 'deadline' | 'other';
  description?: string;
  attendees?: number;
}

const mapEventToCalendarEvent = (event: Event): CalendarEvent => {
  // Map event types to our display types
  const getEventType = (eventType: string): CalendarEvent['type'] => {
    switch (eventType.toLowerCase()) {
      case 'maintenance':
      case 'repair':
        return 'maintenance';
      case 'meeting':
      case 'assembly':
        return 'meeting';
      case 'announcement':
        return 'announcement';
      case 'payment':
      case 'deadline':
        return 'deadline';
      default:
        return 'other';
    }
  };

  return {
    id: event.id.toString(),
    title: event.title,
    start: event.scheduled_date || event.due_date || event.created_at,
    end: event.due_date !== event.scheduled_date ? event.due_date : undefined,
    type: getEventType(event.event_type),
    description: event.description
  };
};

const getEventIcon = (type: CalendarEvent['type']) => {
  switch (type) {
    case 'maintenance':
      return <Wrench className="w-4 h-4 text-blue-600" />;
    case 'meeting':
      return <Users className="w-4 h-4 text-green-600" />;
    case 'announcement':
      return <MessageSquare className="w-4 h-4 text-purple-600" />;
    case 'deadline':
      return <DollarSign className="w-4 h-4 text-red-600" />;
    default:
      return <Calendar className="w-4 h-4 text-gray-600" />;
  }
};

const getEventColor = (type: CalendarEvent['type']) => {
  switch (type) {
    case 'maintenance':
      return 'bg-blue-50 border-blue-200 text-blue-800';
    case 'meeting':
      return 'bg-green-50 border-green-200 text-green-800';
    case 'announcement':
      return 'bg-purple-50 border-purple-200 text-purple-800';
    case 'deadline':
      return 'bg-red-50 border-red-200 text-red-800';
    default:
      return 'bg-gray-50 border-gray-200 text-gray-800';
  }
};

const formatEventTime = (start: string, end?: string) => {
  const startDate = new Date(start);
  const now = new Date();
  const isToday = startDate.toDateString() === now.toDateString();
  const isTomorrow = startDate.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
  
  const timeStr = startDate.toLocaleTimeString('el-GR', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
  
  if (isToday) {
    return `Σήμερα ${timeStr}`;
  } else if (isTomorrow) {
    return `Αύριο ${timeStr}`;
  } else {
    return `${startDate.toLocaleDateString('el-GR', { 
      day: '2-digit', 
      month: '2-digit' 
    })} ${timeStr}`;
  }
};

interface CalendarWidgetProps {
  className?: string;
}

export default function CalendarWidget({ className }: CalendarWidgetProps) {
  const { selectedBuilding } = useBuilding();
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);

  // API hooks
  const { status, isLoading, isConnected, lastSyncFormatted } = useCalendarStatusExtended(selectedBuilding?.id);
  const syncMutation = useSyncCalendar();

  // Memoize date calculations to prevent infinite re-renders
  const dateRange = useMemo(() => {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    return {
      start_date: today.toISOString().split('T')[0], // Today
      end_date: thirtyDaysFromNow.toISOString().split('T')[0] // Next 30 days
    };
  }, []); // Empty dependency array - dates should be calculated once

  // Get real events from API
  const { data: events = [], isLoading: eventsLoading } = useCalendarEvents({
    building: selectedBuilding?.id,
    ...dateRange
  });

  // Map and sort events by start time and get upcoming ones
  const upcomingEvents = events
    .map(mapEventToCalendarEvent)
    .filter(event => event.start && new Date(event.start) >= new Date())
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 4); // Show max 4 upcoming events

  const handleSyncCalendar = () => {
    if (selectedBuilding?.id) {
      syncMutation.mutate(selectedBuilding.id);
    }
  };

  const handleOpenCalendar = () => {
    if (isConnected && status?.google_calendar_id) {
      setShowPreviewModal(true);
    } else {
      setShowSetupModal(true);
    }
  };

  const handleOpenInGoogle = () => {
    if (status?.google_calendar_id) {
      const publicUrl = googleCalendarUtils.getPublicUrl(status.google_calendar_id);
      window.open(publicUrl, '_blank');
    }
  };

  return (
    <>
      <Card className={`${className}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <Calendar className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base">Ημερολόγιο Events</CardTitle>
              <CardDescription className="text-xs">
                {eventsLoading 
                  ? 'Φόρτωση events...'
                  : isConnected 
                    ? `Συγχρονισμός: ${lastSyncFormatted}`
                    : 'Δεν είναι συνδεδεμένο'
                }
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isConnected && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSyncCalendar}
                disabled={syncMutation.isPending}
                className="h-7 w-7 p-0"
              >
                <RefreshCw className={`w-3 h-3 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenCalendar}
              className="h-7 w-7 p-0"
            >
              <Eye className="w-3 h-3" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Connection Status */}
          <div className={`flex items-center justify-between p-2 rounded-lg border ${
            isConnected 
              ? 'bg-green-50 border-green-200' 
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                isLoading 
                  ? 'bg-blue-500 animate-pulse' 
                  : isConnected 
                    ? 'bg-green-500' 
                    : 'bg-gray-400'
              }`} />
              <span className="text-xs font-medium">
                {isLoading 
                  ? 'Φόρτωση...' 
                  : isConnected 
                    ? 'Google Calendar Συνδεδεμένο' 
                    : 'Google Calendar Ανενεργό'
                }
              </span>
            </div>
            {isConnected ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenInGoogle}
                className="h-6 px-2 text-xs"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Άνοιγμα
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSetupModal(true)}
                className="h-6 px-2 text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Σύνδεση
              </Button>
            )}
          </div>

          {/* Upcoming Events */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900">Επερχόμενα Events</h4>
              {upcomingEvents.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {upcomingEvents.length}
                </Badge>
              )}
            </div>

            {upcomingEvents.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`p-3 rounded-lg border ${getEventColor(event.type)} hover:shadow-sm transition-shadow cursor-pointer`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        {getEventIcon(event.type)}
                        <div className="flex-1 min-w-0">
                          <h5 className="text-sm font-medium truncate">
                            {event.title}
                          </h5>
                          <div className="flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" />
                            <span className="text-xs">
                              {formatEventTime(event.start, event.end)}
                            </span>
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3" />
                              <span className="text-xs truncate">
                                {event.location}
                              </span>
                            </div>
                          )}
                          {event.attendees && (
                            <div className="flex items-center gap-1 mt-1">
                              <Users className="w-3 h-3" />
                              <span className="text-xs">
                                {event.attendees} άτομα
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  Δεν υπάρχουν επερχόμενα events
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenCalendar}
                  className="mt-2 text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Προσθήκη Event
                </Button>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          {isConnected && upcomingEvents.length > 0 && (
            <div className="flex gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenCalendar}
                className="flex-1 h-8 text-xs"
              >
                <Eye className="w-3 h-3 mr-1" />
                Προβολή Όλων
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {/* TODO: Open event creation */}}
                className="flex-1 h-8 text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Νέο Event
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <CalendarPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        building={selectedBuilding}
      />

      <CalendarSetupModal
        isOpen={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        building={selectedBuilding}
      />
    </>
  );
}
'use client';

import React, { useState, useMemo } from 'react';
import { Calendar, Plus, Filter, Users, Clock, AlertCircle, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';
import { useBuilding } from '@/components/contexts/BuildingContext';
import EventCalendarView from '@/components/events/EventCalendarView';
import EventSidebar from '@/components/events/EventSidebar';
import EventForm from '@/components/events/EventForm';
import { useCalendarEvents } from '@/hooks/useEvents';
import CalendarWidget from '@/components/dashboard/CalendarWidget';
import GoogleCalendarSettings from '@/components/admin/GoogleCalendarSettings';

function CalendarPageContent() {
  const { selectedBuilding } = useBuilding();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showEventForm, setShowEventForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar' | 'google-settings'

  // Memoize date calculations to prevent infinite re-renders
  const dateRanges = useMemo(() => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const weekEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return {
      today: {
        start_date: todayStart.toISOString(),
        end_date: todayEnd.toISOString()
      },
      upcoming: {
        start_date: today.toISOString(),
        end_date: weekEnd.toISOString()
      }
    };
  }, []); // Empty dependency array - dates should be calculated once

  const { data: todayEvents = [] } = useCalendarEvents({
    building: selectedBuilding?.id,
    ...dateRanges.today
  });

  const { data: upcomingEvents = [] } = useCalendarEvents({
    building: selectedBuilding?.id,
    ...dateRanges.upcoming
  });

  // Calculate stats
  const overdueEvents = upcomingEvents.filter(event => event.is_overdue);
  const urgentEvents = upcomingEvents.filter(event => event.is_urgent_priority);
  const completedToday = todayEvents.filter(event => event.status === 'completed');

  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
    setShowEventForm(true);
  };

  const handleNewEvent = () => {
    setSelectedEvent(null);
    setShowEventForm(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Ημερολόγιο Εκδηλώσεων
          </h1>
          <p className="text-muted-foreground">
            Διαχείριση συμβάντων και χρονοδιαγράμματος για {selectedBuilding?.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Tab Navigation */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <Button
              variant={activeTab === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('calendar')}
              className="h-8 px-3 text-xs"
            >
              <Calendar className="h-3 w-3 mr-1" />
              Ημερολόγιο
            </Button>
            <Button
              variant={activeTab === 'google-settings' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('google-settings')}
              className="h-8 px-3 text-xs"
            >
              <Settings className="h-3 w-3 mr-1" />
              Google Calendar
            </Button>
          </div>
          
          {activeTab === 'calendar' && (
            <Button onClick={handleNewEvent} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Νέο Συμβάν
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Σήμερα</p>
                <p className="text-lg font-semibold">{todayEvents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Καθυστερημένα</p>
                <p className="text-lg font-semibold text-orange-600">{overdueEvents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Επείγοντα</p>
                <p className="text-lg font-semibold text-red-600">{urgentEvents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ολοκληρωμένα Σήμερα</p>
                <p className="text-lg font-semibold text-green-600">{completedToday.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      {activeTab === 'calendar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Ημερολόγιο</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Φίλτρα
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EventCalendarView 
                selectedDate={selectedDate} 
                onDateSelect={setSelectedDate}
              />
            </CardContent>
          </Card>
        </div>

        {/* Event Sidebar */}
        <div className="space-y-4">
          {/* Google Calendar Widget */}
          <CalendarWidget />
          
          <EventSidebar 
            selectedDate={selectedDate}
            onEventClick={handleEventClick}
          />

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Γρήγορες Ενέργειες</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="ghost" 
                className="w-full justify-start text-sm" 
                onClick={handleNewEvent}
              >
                <Plus className="h-4 w-4 mr-2" />
                Νέα Συντήρηση
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-sm"
                onClick={() => {
                  setSelectedEvent({
                    event_type: 'meeting',
                    priority: 'medium',
                    title: '',
                    description: '',
                    scheduled_date: selectedDate.toISOString().split('T')[0]
                  });
                  setShowEventForm(true);
                }}
              >
                <Users className="h-4 w-4 mr-2" />
                Νέα Συνάντηση
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-sm"
                onClick={() => {
                  setSelectedEvent({
                    event_type: 'reminder',
                    priority: 'low',
                    title: '',
                    description: '',
                    scheduled_date: selectedDate.toISOString().split('T')[0]
                  });
                  setShowEventForm(true);
                }}
              >
                <Clock className="h-4 w-4 mr-2" />
                Νέα Υπενθύμιση
              </Button>
            </CardContent>
          </Card>

          {/* Priority Legend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Προτεραιότητες</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="w-2 h-2 p-0"></Badge>
                <span className="text-sm">Επείγουσα</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-orange-500 w-2 h-2 p-0"></Badge>
                <span className="text-sm">Υψηλή</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-500 w-2 h-2 p-0"></Badge>
                <span className="text-sm">Μέση</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="w-2 h-2 p-0"></Badge>
                <span className="text-sm">Χαμηλή</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      ) : (
        // Google Calendar Settings Tab
        <GoogleCalendarSettings building={selectedBuilding} />
      )}

      {/* Event Form Modal */}
      {showEventForm && (
        <EventForm
          event={selectedEvent}
          isOpen={showEventForm}
          onClose={() => setShowEventForm(false)}
          selectedDate={selectedDate}
        />
      )}
    </div>
  );
}

export default function CalendarPage() {
  return (
    <AuthGate role="any">
      <SubscriptionGate requiredStatus="any">
        <CalendarPageContent />
      </SubscriptionGate>
    </AuthGate>
  );
}
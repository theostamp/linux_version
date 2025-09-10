'use client';

import React from 'react';
import { Calendar, Building2, Settings } from 'lucide-react';
import GoogleCalendarSettings from '@/components/admin/GoogleCalendarSettings';
import GoogleCalendarWidget from '@/components/widgets/GoogleCalendarWidget';
import { useBuilding } from '@/components/contexts/BuildingContext';

export default function CalendarAdminPage() {
  const { selectedBuilding } = useBuilding();

  // Mock building data - replace with actual building data
  const mockBuilding = selectedBuilding || {
    id: 1,
    name: "Αλκμάνος 22, Αθήνα",
    google_calendar_enabled: false, // Change to true to see connected state
    google_calendar_id: "test_calendar_id",
    get_google_calendar_url: () => "https://calendar.google.com/calendar/embed?src=test",
    get_google_calendar_public_url: () => "https://calendar.google.com/calendar/u/0?cid=test"
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-blue-100 rounded-xl">
          <Calendar className="w-8 h-8 text-blue-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Διαχείριση Google Calendar</h1>
          <p className="text-gray-600">
            Συνδέστε και διαχειριστείτε το Google Calendar για τα κτίριά σας
          </p>
        </div>
      </div>

      {/* Building Selection */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-blue-800">
          <Building2 className="w-5 h-5" />
          <span className="font-medium">Τρέχον Κτίριο: {mockBuilding.name}</span>
        </div>
        <p className="text-sm text-blue-600 mt-1">
          Οι ρυθμίσεις Google Calendar εφαρμόζονται στο επιλεγμένο κτίριο
        </p>
      </div>

      {/* Widget Demo - Compact Version */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Calendar Widget (Compact)
          </h2>
          
          {/* Connected State */}
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Συνδεδεμένο κτίριο:</p>
            <GoogleCalendarWidget
              building={{
                ...mockBuilding,
                google_calendar_enabled: true,
                google_calendar_id: "connected_calendar"
              }}
              compact={true}
            />
          </div>

          {/* Disconnected State */}
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Μη συνδεδεμένο κτίριο:</p>
            <GoogleCalendarWidget
              building={{
                ...mockBuilding,
                google_calendar_enabled: false,
                google_calendar_id: ""
              }}
              compact={true}
            />
          </div>
        </div>

        {/* Widget Demo - Full Version */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Calendar Widget (Full)</h2>
          <GoogleCalendarWidget
            building={mockBuilding}
            compact={false}
          />
        </div>
      </div>

      {/* Full Settings Component */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Πλήρεις Ρυθμίσεις Google Calendar</h2>
        <GoogleCalendarSettings building={mockBuilding} />
      </div>

      {/* Development Notes */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">📝 Development Notes</h3>
        <div className="space-y-2 text-sm">
          <p><strong>Setup Modal:</strong> Κάντε κλικ στο "Σύνδεση με Google Calendar" για να δείτε το setup wizard</p>
          <p><strong>Preview Modal:</strong> Κάντε κλικ στο "Προβολή Calendar" (όταν συνδεδεμένο) για να δείτε το calendar preview</p>
          <p><strong>Widget States:</strong> Τα widgets δείχνουν διαφορετικά states (συνδεδεμένο/μη συνδεδεμένο)</p>
          <p><strong>Responsive Design:</strong> Όλα τα components είναι responsive και mobile-friendly</p>
          <p><strong>Mock Data:</strong> Αυτή τη στιγμή χρησιμοποιεί mock data - θα συνδεθεί με πραγματικό API</p>
        </div>
      </div>
    </div>
  );
}
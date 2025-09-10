'use client';

import React, { useState } from 'react';
import { Calendar, ExternalLink, Eye, Settings, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import CalendarPreviewModal from '@/components/modals/CalendarPreviewModal';
import CalendarSetupModal from '@/components/modals/CalendarSetupModal';

interface GoogleCalendarWidgetProps {
  building?: {
    id: number;
    name: string;
    google_calendar_enabled?: boolean;
    google_calendar_id?: string;
    get_google_calendar_url?: () => string;
    get_google_calendar_public_url?: () => string;
  };
  compact?: boolean;
  showSetupButton?: boolean;
}

export default function GoogleCalendarWidget({ 
  building, 
  compact = false, 
  showSetupButton = true 
}: GoogleCalendarWidgetProps) {
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);

  if (!building) {
    return null;
  }

  const isConnected = building.google_calendar_enabled && building.google_calendar_id;

  if (compact) {
    // Compact version for dashboards/sidebars
    return (
      <>
        <Card className={`${isConnected ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isConnected ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <Calendar className={`w-4 h-4 ${isConnected ? 'text-green-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <h4 className="text-sm font-medium">Google Calendar</h4>
                  <p className="text-xs text-gray-600">
                    {isConnected ? 'Συνδεδεμένο' : 'Δεν είναι συνδεδεμένο'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                {isConnected && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPreviewModal(true)}
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="w-3 h-3" />
                  </Button>
                )}
                
                {!isConnected && showSetupButton && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSetupModal(true)}
                    className="h-8 w-8 p-0"
                  >
                    <Settings className="w-3 h-3" />
                  </Button>
                )}
                
                {isConnected && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(building.get_google_calendar_public_url?.(), '_blank')}
                    className="h-8 w-8 p-0"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modals */}
        <CalendarPreviewModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          building={building}
        />

        <CalendarSetupModal
          isOpen={showSetupModal}
          onClose={() => setShowSetupModal(false)}
          building={building}
        />
      </>
    );
  }

  // Full version for dedicated pages
  return (
    <>
      <Card className={`${isConnected ? 'border-green-200' : 'border-orange-200'}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${isConnected ? 'bg-green-100' : 'bg-orange-100'}`}>
                <Calendar className={`w-6 h-6 ${isConnected ? 'text-green-600' : 'text-orange-600'}`} />
              </div>
              <div>
                <CardTitle>Google Calendar Integration</CardTitle>
                <CardDescription>
                  {isConnected 
                    ? 'Το ημερολόγιό σας είναι συνδεδεμένο με το Google Calendar'
                    : 'Συνδέστε το ημερολόγιο για καλύτερη οργάνωση'
                  }
                </CardDescription>
              </div>
            </div>
            
            <Badge variant={isConnected ? 'default' : 'secondary'}>
              {isConnected ? 'Ενεργό' : 'Ανενεργό'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          {isConnected ? (
            <div className="space-y-4">
              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">12</p>
                  <p className="text-xs text-green-700">Συνολικά Events</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">10</p>
                  <p className="text-xs text-green-700">Συγχρονισμένα</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-green-700">Τελευταίος</p>
                  <p className="text-xs font-medium text-green-800">2 λεπτά πριν</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => setShowPreviewModal(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Προβολή Calendar
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => window.open(building.get_google_calendar_public_url?.(), '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Άνοιγμα στο Google
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-orange-600" />
              </div>
              
              <h3 className="text-lg font-medium mb-2">Google Calendar δεν είναι συνδεδεμένο</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Συνδέστε το Google Calendar για να συγχρονίσετε αυτόματα όλα τα events 
                και να λαμβάνετε ειδοποιήσεις στο κινητό σας.
              </p>
              
              {showSetupButton && (
                <Button
                  onClick={() => setShowSetupModal(true)}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Σύνδεση Google Calendar
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <CalendarPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        building={building}
      />

      <CalendarSetupModal
        isOpen={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        building={building}
      />
    </>
  );
}
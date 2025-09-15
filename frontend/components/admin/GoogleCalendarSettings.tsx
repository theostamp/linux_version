'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Settings, Link, Users, Eye, RefreshCw, CheckCircle2, XCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useBuilding } from '@/components/contexts/BuildingContext';
import CalendarPreviewModal from '@/components/modals/CalendarPreviewModal';
import CalendarSetupModal from '@/components/modals/CalendarSetupModal';
import { 
  useCalendarStatusExtended,
  useDisconnectGoogleCalendar,
  useSyncCalendar,
  useUpdateSyncSettings,
  useOAuthCallback,
  type SyncSettings
} from '@/hooks/useGoogleCalendar';

interface GoogleCalendarSettingsProps {
  building?: any; // Replace with proper Building type
}

export default function GoogleCalendarSettings({ building }: GoogleCalendarSettingsProps) {
  const { selectedBuilding } = useBuilding();
  const currentBuilding = building || selectedBuilding;
  
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [syncSettings, setSyncSettings] = useState<SyncSettings>({
    auto_sync: true,
    sync_maintenance: true,
    sync_meetings: true,
    sync_deadlines: true,
    sync_reminders: true,
  });

  // API hooks
  const { status, isLoading, isConnected, syncHealth, lastSyncFormatted, refetch } = 
    useCalendarStatusExtended(currentBuilding?.id);
  const disconnectMutation = useDisconnectGoogleCalendar();
  const syncMutation = useSyncCalendar();
  const updateSettingsMutation = useUpdateSyncSettings();
  const oauthCallback = useOAuthCallback();

  // Handle OAuth callback on component mount
  useEffect(() => {
    const callbackResult = oauthCallback.checkAndHandle();
    if (callbackResult === true) {
      // Successfully connected - refresh data
      refetch();
    }
  }, [oauthCallback, refetch]);

  // Update local sync settings when status loads
  useEffect(() => {
    if (status) {
      setSyncSettings(prev => ({
        ...prev,
        auto_sync: currentBuilding?.google_calendar_sync_enabled ?? true,
      }));
    }
  }, [status, currentBuilding?.google_calendar_sync_enabled]);

  const handleConnectGoogle = () => {
    setShowSetupModal(true);
  };

  const handleDisconnect = async () => {
    if (!confirm('Είστε σίγουροι ότι θέλετε να αποσυνδέσετε το Google Calendar;')) {
      return;
    }
    
    if (currentBuilding?.id) {
      disconnectMutation.mutate(currentBuilding.id);
    }
  };

  const handleSyncNow = async () => {
    if (currentBuilding?.id) {
      syncMutation.mutate(currentBuilding.id);
    }
  };

  const handleSaveSettings = async () => {
    if (currentBuilding?.id) {
      updateSettingsMutation.mutate({
        buildingId: currentBuilding.id,
        settings: syncSettings
      });
    }
  };

  const getStatusIcon = () => {
    if (isLoading) {
      return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
    }
    
    if (isConnected) {
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    }
    
    return <XCircle className="w-5 h-5 text-gray-400" />;
  };

  const getStatusColor = () => {
    if (isLoading) return 'bg-blue-50 border-blue-200';
    if (isConnected) return 'bg-green-50 border-green-200';
    return 'bg-gray-50 border-gray-200';
  };

  if (!currentBuilding) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-gray-500">Επιλέξτε κτίριο για να διαχειριστείτε το Google Calendar</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Calendar className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Google Calendar Integration</h2>
          <p className="text-sm text-gray-600">Συγχρονισμός events με Google Calendar για {currentBuilding.name}</p>
        </div>
      </div>

      {/* Connection Status Card */}
      <Card className={`border-2 ${getStatusColor()}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <div>
                <CardTitle className="text-lg">
                  Κατάσταση Σύνδεσης
                </CardTitle>
                <CardDescription>
                  {isLoading 
                    ? 'Φόρτωση κατάστασης σύνδεσης...'
                    : isConnected 
                      ? 'Συνδεδεμένο με Google Calendar' 
                      : 'Δεν είναι συνδεδεμένο'
                  }
                </CardDescription>
              </div>
            </div>
            <Badge variant={isConnected ? 'default' : 'secondary'}>
              {isLoading ? 'Φόρτωση...' : isConnected ? 'Ενεργό' : 'Ανενεργό'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          {isConnected && status ? (
            <div className="space-y-4">
              {/* Calendar Info */}
              <div className="bg-white p-4 rounded-lg border">
                <h4 className="font-medium mb-2">📅 Πληροφορίες Ημερολογίου</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Σύνολο Events</p>
                    <p className="font-semibold">{status.events_count}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Συγχρονισμένα</p>
                    <p className={`font-semibold ${
                      syncHealth === 'healthy' ? 'text-green-600' : 
                      syncHealth === 'warning' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {status.synced_events}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Τελευταίος Συγχρονισμός</p>
                    <p className="font-semibold">{lastSyncFormatted}</p>
                  </div>
                </div>
              </div>

              {/* Calendar Links */}
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => setShowPreviewModal(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Προβολή Calendar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(currentBuilding.get_google_calendar_public_url?.(), '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Άνοιγμα στο Google
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleSyncNow}
                  disabled={syncMutation.isPending}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                  {syncMutation.isPending ? 'Συγχρονισμός...' : 'Συγχρονισμός Τώρα'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(status?.calendar_url || '');
                    alert('Embed URL αντιγράφηκε!');
                  }}
                  disabled={!status?.calendar_url}
                >
                  <Link className="w-4 h-4 mr-2" />
                  Αντιγραφή Embed URL
                </Button>
              </div>

              {/* Disconnect Button */}
              <div className="pt-4 border-t">
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={handleDisconnect}
                >
                  Αποσύνδεση Google Calendar
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="mb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-medium mb-2">Συνδέστε το Google Calendar</h3>
                <p className="text-gray-600 mb-6">
                  Συγχρονίστε αυτόματα όλα τα events του κτιρίου με Google Calendar 
                  για εύκολη πρόσβαση από κινητό και desktop.
                </p>
              </div>

              <Button 
                onClick={handleConnectGoogle}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Link className="w-4 h-4 mr-2" />
                Σύνδεση με Google Calendar
              </Button>

              {/* Benefits */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Αυτόματος Συγχρονισμός</p>
                    <p className="text-gray-600">Όλα τα νέα events συγχρονίζονται αυτόματα</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Mobile Notifications</p>
                    <p className="text-gray-600">Λαμβάνετε ειδοποιήσεις στο κινητό σας</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Κοινή Πρόσβαση</p>
                    <p className="text-gray-600">Μοιράστε το calendar με κατοίκους</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Πλήρης Έλεγχος</p>
                    <p className="text-gray-600">Διαχειρίζεστε όλα από το New Concierge</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Settings Card */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Ρυθμίσεις Συγχρονισμού
            </CardTitle>
            <CardDescription>
              Επιλέξτε ποια events θέλετε να συγχρονίζονται με το Google Calendar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Αυτόματος Συγχρονισμός</p>
                  <p className="text-xs text-gray-600">Συγχρονισμός νέων events αυτόματα</p>
                </div>
                <Switch
                  checked={syncSettings.auto_sync}
                  onCheckedChange={(checked) => 
                    setSyncSettings(prev => ({ ...prev, auto_sync: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">🔧 Events Συντήρησης</p>
                  <p className="text-xs text-gray-600">Συγχρονισμός maintenance events</p>
                </div>
                <Switch
                  checked={syncSettings.sync_maintenance}
                  onCheckedChange={(checked) => 
                    setSyncSettings(prev => ({ ...prev, sync_maintenance: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">👥 Συναντήσεις</p>
                  <p className="text-xs text-gray-600">Συγχρονισμός meetings και gatherings</p>
                </div>
                <Switch
                  checked={syncSettings.sync_meetings}
                  onCheckedChange={(checked) => 
                    setSyncSettings(prev => ({ ...prev, sync_meetings: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">💰 Προθεσμίες Πληρωμών</p>
                  <p className="text-xs text-gray-600">Συγχρονισμός common expense deadlines</p>
                </div>
                <Switch
                  checked={syncSettings.sync_deadlines}
                  onCheckedChange={(checked) => 
                    setSyncSettings(prev => ({ ...prev, sync_deadlines: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">⏰ Υπενθυμίσεις</p>
                  <p className="text-xs text-gray-600">Συγχρονισμός reminders και notifications</p>
                </div>
                <Switch
                  checked={syncSettings.sync_reminders}
                  onCheckedChange={(checked) => 
                    setSyncSettings(prev => ({ ...prev, sync_reminders: checked }))
                  }
                />
              </div>

              <div className="pt-4 border-t">
                <Button 
                  onClick={handleSaveSettings}
                  className="w-full"
                  disabled={updateSettingsMutation.isPending}
                >
                  {updateSettingsMutation.isPending ? 'Αποθήκευση...' : 'Αποθήκευση Ρυθμίσεων'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <CalendarPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        building={currentBuilding}
      />

      <CalendarSetupModal
        isOpen={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        building={currentBuilding}
      />
    </div>
  );
}
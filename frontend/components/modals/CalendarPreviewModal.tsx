'use client';

import React from 'react';
import { Calendar, ExternalLink, X, Maximize2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCalendarStatusExtended, useSyncCalendar, googleCalendarUtils } from '@/hooks/useGoogleCalendar';

interface CalendarPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  building?: {
    id: number;
    name: string;
    google_calendar_id?: string;
    get_google_calendar_url?: () => string;
    get_google_calendar_public_url?: () => string;
  };
}

export default function CalendarPreviewModal({
  isOpen,
  onClose,
  building
}: CalendarPreviewModalProps) {
  const [iframeKey, setIframeKey] = React.useState(0); // For forcing iframe refresh

  // API hooks
  const { status, isLoading, lastSyncFormatted, refetch } = useCalendarStatusExtended(building?.id);
  const syncMutation = useSyncCalendar();

  const handleRefresh = async () => {
    if (building?.id) {
      try {
        await syncMutation.mutateAsync(building.id);
        setIframeKey(prev => prev + 1);
        refetch(); // Refresh calendar status
      } catch (error) {
        console.error('Failed to sync calendar:', error);
      }
    }
  };

  const handleOpenInGoogle = () => {
    if (status?.google_calendar_id) {
      const publicUrl = googleCalendarUtils.getPublicUrl(status.google_calendar_id);
      window.open(publicUrl, '_blank');
    }
  };

  // Don't render if not connected or loading
  if (isLoading || !status?.google_calendar_enabled || !status?.google_calendar_id) {
    if (isOpen) {
      return (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="max-w-md">
            <div className="flex flex-col items-center justify-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-gray-600 text-center">
                {isLoading ? 'Φόρτωση...' : 'Το Google Calendar δεν είναι συνδεδεμένο'}
              </p>
            </div>
          </DialogContent>
        </Dialog>
      );
    }
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-xl">
                  Google Calendar - {building?.name || 'Κτίριο'}
                </DialogTitle>
                <DialogDescription>
                  Προβολή και διαχείριση events του κτιρίου
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pb-4 border-b">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={syncMutation.isPending}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            {syncMutation.isPending ? 'Συγχρονισμός...' : 'Συγχρονισμός'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenInGoogle}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Άνοιγμα στο Google
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (status?.google_calendar_id) {
                const agendaUrl = googleCalendarUtils.getEmbedUrl(status.google_calendar_id, { mode: 'AGENDA' });
                window.open(agendaUrl, '_blank');
              }
            }}
          >
            <Maximize2 className="w-4 h-4 mr-2" />
            Λίστα Events
          </Button>

          <div className="flex-1" />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Calendar Iframe */}
        <div className="flex-1 relative bg-gray-50 rounded-lg overflow-hidden">
          {status?.google_calendar_id ? (
            <>
              <iframe
                key={iframeKey}
                src={googleCalendarUtils.getEmbedUrl(status.google_calendar_id, {
                  height: 600,
                  showTitle: false,
                  showPrint: false,
                  showTabs: false,
                  showCalendars: false
                })}
                style={{ border: 0 }}
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                className="absolute inset-0"
                title={`Google Calendar - ${building?.name}`}
                loading="lazy"
              />
              
              {/* Loading Overlay */}
              {syncMutation.isPending && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                  <div className="flex items-center gap-2 text-gray-600">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Συγχρονισμός ημερολογίου...</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Δεν είναι δυνατή η φόρτωση του ημερολογίου</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="flex-shrink-0 flex items-center justify-between text-xs text-gray-500 pt-3 border-t">
          <div className="flex items-center gap-4">
            <span>📅 Events: {status?.events_count || 0} συνολικά, {status?.synced_events || 0} συγχρονισμένα</span>
            <span>🔄 Τελευταία ενημέρωση: {lastSyncFormatted}</span>
          </div>
          <div>
            <span>Calendar ID: {status?.google_calendar_id}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
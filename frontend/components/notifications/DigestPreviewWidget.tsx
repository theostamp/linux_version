'use client';

/**
 * Digest Preview Widget
 * Shows pending notification events and allows sending digest email
 */
import { useState } from 'react';
import { usePendingEvents, useSendDigest, useDigestPreview } from '@/hooks/useNotificationEvents';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Mail, Send, Eye, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { el } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function DigestPreviewWidget() {
  const { currentBuilding } = useBuilding();
  const { data: pending, isLoading } = usePendingEvents(currentBuilding?.id);
  const sendDigestMutation = useSendDigest();
  const previewMutation = useDigestPreview();

  const [showPreview, setShowPreview] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Εκκρεμείς Ειδοποιήσεις
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Φόρτωση...</p>
        </CardContent>
      </Card>
    );
  }

  if (!pending || pending.count === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Εκκρεμείς Ειδοποιήσεις
          </CardTitle>
          <CardDescription>Δεν υπάρχουν νέα γεγονότα για αποστολή</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handlePreview = async () => {
    try {
      await previewMutation.mutateAsync({
        building_id: currentBuilding?.id!,
      });
      setShowPreview(true);
    } catch (error) {
      console.error('Preview error:', error);
    }
  };

  const handleSend = async () => {
    await sendDigestMutation.mutateAsync({
      building_id: currentBuilding?.id!,
    });
    setShowPreview(false);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Εκκρεμείς Ειδοποιήσεις
                <Badge variant="secondary">{pending.count}</Badge>
              </CardTitle>
              <CardDescription>Γεγονότα που δεν έχουν σταλεί ακόμα</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreview}
                disabled={previewMutation.isPending}
              >
                <Eye className="w-4 h-4 mr-2" />
                Προεπισκόπηση
              </Button>
              <Button
                size="sm"
                onClick={handleSend}
                disabled={sendDigestMutation.isPending}
              >
                <Send className="w-4 h-4 mr-2" />
                Αποστολή Digest
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* Events by type */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(pending.events_by_type).map(([type, count]) => (
                <Badge key={type} variant="outline">
                  {type}: {count}
                </Badge>
              ))}
            </div>

            <Separator />

            {/* Recent events list */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Πρόσφατα Γεγονότα:</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {pending.events.slice(0, 5).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-2xl">{event.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDistanceToNow(new Date(event.created_at), {
                          addSuffix: true,
                          locale: el,
                        })}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {event.event_type_display}
                    </Badge>
                  </div>
                ))}
              </div>

              {pending.count > 5 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  +{pending.count - 5} ακόμα γεγονότα
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Προεπισκόπηση Digest Email</DialogTitle>
            <DialogDescription>
              Το email θα σταλεί σε όλα τα διαμερίσματα της πολυκατοικίας
            </DialogDescription>
          </DialogHeader>

          {previewMutation.data && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Θέμα:</p>
                <p className="text-lg font-semibold">{previewMutation.data.subject}</p>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Περιεχόμενο:</p>
                <div
                  className="prose prose-sm max-w-none bg-muted/30 p-4 rounded-md"
                  dangerouslySetInnerHTML={{ __html: previewMutation.data.body }}
                />
              </div>

              <div className="flex gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">
                  {previewMutation.data.event_count} γεγονότα
                </Badge>
                {Object.entries(previewMutation.data.events_by_type).map(([type, count]) => (
                  <Badge key={type} variant="outline">
                    {type}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Ακύρωση
            </Button>
            <Button onClick={handleSend} disabled={sendDigestMutation.isPending}>
              <Send className="w-4 h-4 mr-2" />
              {sendDigestMutation.isPending ? 'Αποστολή...' : 'Αποστολή Τώρα'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

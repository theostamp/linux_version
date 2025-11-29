'use client';

import { useState, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Megaphone, Send, Eye, Mail, MessageSquare, Phone, Bell } from 'lucide-react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { notificationsApi } from '@/lib/api/notifications';
import type { NotificationChannel } from '@/types/notifications';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import RecipientSelector from '../shared/RecipientSelector';
import ChannelSelector from '../shared/ChannelSelector';
import { 
  extractBuildingData, 
  generateEmailSignature 
} from '../shared/buildingUtils';

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AnnouncementSender({ onSuccess, onCancel }: Props) {
  const { buildings, selectedBuilding } = useBuilding();
  
  const [buildingId, setBuildingId] = useState<number | null>(selectedBuilding?.id ?? null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<NotificationChannel[]>(['email']);

  // Εξαγωγή δεδομένων κτιρίου
  const selectedBuilding_ = buildings.find(b => b.id === buildingId);
  const buildingData = useMemo(
    () => extractBuildingData(selectedBuilding_), 
    [selectedBuilding_]
  );

  const generateEmailBody = () => {
    let body = `Αγαπητοί ένοικοι,

${message.trim()}`;

    body += `\n\n${generateEmailSignature(buildingData)}`;

    return body;
  };

  const getSubject = () => {
    const prefix = title || 'Ανακοίνωση';
    return `${prefix} - ${buildingData.name}`;
  };

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!buildingId) throw new Error('Επιλέξτε πολυκατοικία');
      if (!title.trim()) throw new Error('Συμπληρώστε τον τίτλο');
      if (!message.trim()) throw new Error('Συμπληρώστε το μήνυμα');

      // Determine notification_type based on selected channels
      let notificationType: 'email' | 'sms' | 'both' | 'viber' | 'push' | 'all' = 'email';
      if (selectedChannels.length > 1 || selectedChannels.includes('viber') || selectedChannels.includes('push')) {
        notificationType = 'all';
      } else if (selectedChannels.includes('sms') && selectedChannels.includes('email')) {
        notificationType = 'both';
      } else if (selectedChannels.includes('sms')) {
        notificationType = 'sms';
      }

      return notificationsApi.create({
        building_id: buildingId,
        subject: getSubject(),
        body: generateEmailBody(),
        sms_body: message.substring(0, 160), // Truncate for SMS
        notification_type: notificationType,
        priority: 'normal',
        send_to_all: sendToAll,
        ...(sendToAll ? {} : { apartment_ids: selectedIds }),
      });
    },
    onSuccess: () => {
      toast.success('Η ανακοίνωση στάλθηκε επιτυχώς');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Αποτυχία αποστολής');
    },
  });

  return (
    <>
      <Card className="border-teal-200">
        <CardHeader className="bg-teal-50 border-b border-teal-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-teal-100">
              <Megaphone className="h-6 w-6 text-teal-600" />
            </div>
            <div>
              <CardTitle className="text-lg text-teal-900">
                Γενική Ανακοίνωση
              </CardTitle>
              <p className="text-sm text-teal-700">
                Ενημέρωση για θέματα της πολυκατοικίας
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Επιλογή Κτιρίου */}
          <div className="space-y-2">
            <Label>Πολυκατοικία</Label>
            <Select
              value={buildingId?.toString() ?? ''}
              onValueChange={(v) => setBuildingId(parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Επιλέξτε πολυκατοικία" />
              </SelectTrigger>
              <SelectContent>
                {buildings.map((b) => (
                  <SelectItem key={b.id} value={b.id.toString()}>
                    {b.name || b.address}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {buildingData.fullAddress && (
              <p className="text-xs text-gray-500">📍 {buildingData.fullAddress}</p>
            )}
          </div>

          {/* Τίτλος */}
          <div className="space-y-2">
            <Label>Τίτλος Ανακοίνωσης</Label>
            <Input
              placeholder="π.χ. Καθαρισμός κοινόχρηστων χώρων"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Μήνυμα */}
          <div className="space-y-2">
            <Label>Κείμενο Ανακοίνωσης</Label>
            <Textarea
              placeholder="Γράψτε το κείμενο της ανακοίνωσης..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
            />
          </div>

          {/* Κανάλια Αποστολής */}
          <ChannelSelector
            selectedChannels={selectedChannels}
            onChannelsChange={setSelectedChannels}
          />

          {/* Παραλήπτες */}
          <RecipientSelector
            buildingId={buildingId}
            sendToAll={sendToAll}
            onSendToAllChange={setSendToAll}
            selectedIds={selectedIds}
            onSelectedIdsChange={setSelectedIds}
          />

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={onCancel}>
              Ακύρωση
            </Button>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowPreview(true)}
                disabled={!buildingId || !message.trim()}
              >
                <Eye className="h-4 w-4 mr-2" />
                Προεπισκόπηση
              </Button>
              <Button
                onClick={() => sendMutation.mutate()}
                disabled={sendMutation.isPending || !buildingId || !title.trim() || !message.trim()}
              >
                {sendMutation.isPending ? (
                  'Αποστολή...'
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Αποστολή
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Προεπισκόπηση Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-500 mb-1">Θέμα:</p>
              <p className="font-medium">{getSubject()}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-500 mb-2">Περιεχόμενο:</p>
              <div className="whitespace-pre-wrap text-sm">
                {generateEmailBody()}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

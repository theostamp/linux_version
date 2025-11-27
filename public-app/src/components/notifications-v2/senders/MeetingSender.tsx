'use client';

import { useState, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Users, Send, Eye, Calendar, Clock, MapPin } from 'lucide-react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { notificationsApi } from '@/lib/api/notifications';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { 
  extractBuildingData, 
  generateEmailSignature,
  formatDateGreek 
} from '../shared/buildingUtils';

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function MeetingSender({ onSuccess, onCancel }: Props) {
  const { buildings, selectedBuilding } = useBuilding();
  
  const [buildingId, setBuildingId] = useState<number | null>(selectedBuilding?.id ?? null);
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [location, setLocation] = useState('');
  const [agenda, setAgenda] = useState('');
  const [extraMessage, setExtraMessage] = useState('');
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // Εξαγωγή δεδομένων κτιρίου
  const selectedBuilding_ = buildings.find(b => b.id === buildingId);
  const buildingData = useMemo(
    () => extractBuildingData(selectedBuilding_), 
    [selectedBuilding_]
  );

  const generateEmailBody = () => {
    const formattedDate = formatDateGreek(meetingDate);
    
    let body = `Αγαπητοί ένοικοι,

Σας καλούμε σε Γενική Συνέλευση της πολυκατοικίας μας.

📅 Ημερομηνία: ${formattedDate}
🕐 Ώρα: ${meetingTime}
📍 Τοποθεσία: ${location || 'Θα ανακοινωθεί'}`;

    if (agenda.trim()) {
      body += `

ΘΕΜΑΤΑ ΗΜΕΡΗΣΙΑΣ ΔΙΑΤΑΞΗΣ:
${agenda.trim()}`;
    }

    body += `

Η παρουσία σας είναι απαραίτητη για τη λήψη αποφάσεων που αφορούν την ομαλή λειτουργία της πολυκατοικίας μας.

Σε περίπτωση αδυναμίας παρουσίας, παρακαλούμε να ορίσετε εκπρόσωπο με γραπτή εξουσιοδότηση.`;

    if (extraMessage.trim()) {
      body += `\n\n${extraMessage.trim()}`;
    }

    body += `\n\n${generateEmailSignature(buildingData)}`;

    return body;
  };

  const getSubject = () => {
    const formattedDate = formatDateGreek(meetingDate);
    return `Πρόσκληση Γενικής Συνέλευσης ${formattedDate ? `- ${formattedDate}` : ''} - ${buildingData.name}`;
  };

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!buildingId) throw new Error('Επιλέξτε πολυκατοικία');
      if (!meetingDate) throw new Error('Επιλέξτε ημερομηνία');
      if (!meetingTime) throw new Error('Επιλέξτε ώρα');

      return notificationsApi.create({
        building_id: buildingId,
        subject: getSubject(),
        body: generateEmailBody(),
        notification_type: 'email',
        priority: 'high',
        send_to_all: sendToAll,
        ...(sendToAll ? {} : { apartment_ids: selectedIds }),
      });
    },
    onSuccess: () => {
      toast.success('Η πρόσκληση στάλθηκε επιτυχώς');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Αποτυχία αποστολής');
    },
  });

  // Get tomorrow as minimum date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <>
      <Card className="border-indigo-200">
        <CardHeader className="bg-indigo-50 border-b border-indigo-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-indigo-100">
              <Users className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <CardTitle className="text-lg text-indigo-900">
                Πρόσκληση Γενικής Συνέλευσης
              </CardTitle>
              <p className="text-sm text-indigo-700">
                Σύγκληση συνέλευσης ιδιοκτητών/ενοίκων
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

          {/* Ημερομηνία & Ώρα */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Ημερομηνία
              </Label>
              <Input
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                min={minDate}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Ώρα
              </Label>
              <Input
                type="time"
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
              />
            </div>
          </div>

          {/* Τοποθεσία */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Τοποθεσία
            </Label>
            <Input
              placeholder="π.χ. Αίθουσα πολυκατοικίας, 1ος όροφος"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          {/* Θέματα */}
          <div className="space-y-2">
            <Label>Θέματα Ημερήσιας Διάταξης</Label>
            <Textarea
              placeholder="1. Οικονομικός απολογισμός&#10;2. Συντήρηση ανελκυστήρα&#10;3. Διάφορα θέματα"
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              rows={4}
            />
          </div>

          {/* Επιπλέον Μήνυμα */}
          <div className="space-y-2">
            <Label>Επιπλέον Σχόλια (προαιρετικά)</Label>
            <Textarea
              placeholder="π.χ. Θα υπάρχει ελαφρύ κέρασμα..."
              value={extraMessage}
              onChange={(e) => setExtraMessage(e.target.value)}
              rows={2}
            />
          </div>

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
                disabled={!buildingId || !meetingDate}
              >
                <Eye className="h-4 w-4 mr-2" />
                Προεπισκόπηση
              </Button>
              <Button
                onClick={() => sendMutation.mutate()}
                disabled={sendMutation.isPending || !buildingId || !meetingDate || !meetingTime}
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

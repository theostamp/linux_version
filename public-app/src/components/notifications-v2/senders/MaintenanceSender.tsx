'use client';

import { useState, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Wrench, Send, Eye, Calendar, Clock } from 'lucide-react';
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

const MAINTENANCE_TYPES = [
  { value: 'elevator', label: 'Ανελκυστήρας', icon: '🛗' },
  { value: 'cleaning', label: 'Καθαρισμός', icon: '🧹' },
  { value: 'water', label: 'Υδραυλικά', icon: '🚿' },
  { value: 'electricity', label: 'Ηλεκτρολογικά', icon: '⚡' },
  { value: 'heating', label: 'Θέρμανση', icon: '🔥' },
  { value: 'painting', label: 'Βαφή', icon: '🎨' },
  { value: 'garden', label: 'Κήπος', icon: '🌳' },
  { value: 'other', label: 'Άλλο', icon: '🔧' },
];

export default function MaintenanceSender({ onSuccess, onCancel }: Props) {
  const { buildings, selectedBuilding } = useBuilding();

  const [buildingId, setBuildingId] = useState<number | null>(selectedBuilding?.id ?? null);
  const [maintenanceType, setMaintenanceType] = useState<string>('');
  const [workDate, setWorkDate] = useState('');
  const [workTime, setWorkTime] = useState('');
  const [duration, setDuration] = useState('');
  const [affectedAreas, setAffectedAreas] = useState('');
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

  const selectedType = MAINTENANCE_TYPES.find(t => t.value === maintenanceType);

  const generateEmailBody = () => {
    const formattedDate = formatDateGreek(workDate);
    const typeLabel = selectedType?.label || 'Εργασία συντήρησης';

    let body = `Αγαπητοί ένοικοι,

Σας ενημερώνουμε ότι θα πραγματοποιηθεί ${typeLabel.toLowerCase()} στην πολυκατοικία μας.

📅 Ημερομηνία: ${formattedDate}
🕐 Ώρα: ${workTime}${duration ? `\n⏱️ Εκτιμώμενη διάρκεια: ${duration}` : ''}`;

    if (affectedAreas.trim()) {
      body += `

⚠️ ΕΠΗΡΕΑΖΟΜΕΝΟΙ ΧΩΡΟΙ:
${affectedAreas.trim()}`;
    }

    body += `

Παρακαλούμε για την κατανόησή σας κατά τη διάρκεια των εργασιών.`;

    if (maintenanceType === 'elevator') {
      body += ` Κατά τη διάρκεια των εργασιών, ο ανελκυστήρας θα είναι εκτός λειτουργίας.`;
    } else if (maintenanceType === 'water') {
      body += ` Ενδέχεται να υπάρξει προσωρινή διακοπή νερού.`;
    } else if (maintenanceType === 'electricity') {
      body += ` Ενδέχεται να υπάρξει προσωρινή διακοπή ρεύματος.`;
    }

    if (extraMessage.trim()) {
      body += `\n\n${extraMessage.trim()}`;
    }

    body += `\n\n${generateEmailSignature(buildingData)}`;

    return body;
  };

  const getSubject = () => {
    const typeLabel = selectedType?.label || 'Εργασία συντήρησης';
    const formattedDate = formatDateGreek(workDate);
    return `${typeLabel} - ${formattedDate} - ${buildingData.name}`;
  };

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!buildingId) throw new Error('Επιλέξτε πολυκατοικία');
      if (!maintenanceType) throw new Error('Επιλέξτε τύπο εργασίας');
      if (!workDate) throw new Error('Επιλέξτε ημερομηνία');
      if (!workTime) throw new Error('Επιλέξτε ώρα');

      return notificationsApi.create({
        building_id: buildingId,
        subject: getSubject(),
        body: generateEmailBody(),
        notification_type: 'email',
        priority: 'normal',
        send_to_all: sendToAll,
        ...(sendToAll ? {} : { apartment_ids: selectedIds }),
      });
    },
    onSuccess: () => {
      toast.success('Η ειδοποίηση στάλθηκε επιτυχώς');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Αποτυχία αποστολής');
    },
  });

  // Get today as minimum date
  const today = new Date().toISOString().split('T')[0];

  return (
    <>
      <Card className="border-orange-200">
        <CardHeader className="bg-orange-50 border-b border-orange-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-orange-100">
              <Wrench className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <CardTitle className="text-lg text-orange-900">
                Ενημέρωση Συντήρησης
              </CardTitle>
              <p className="text-sm text-orange-700">
                Ειδοποίηση για προγραμματισμένες εργασίες
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

          {/* Τύπος Εργασίας */}
          <div className="space-y-2">
            <Label>Τύπος Εργασίας</Label>
            <Select value={maintenanceType} onValueChange={setMaintenanceType}>
              <SelectTrigger>
                <SelectValue placeholder="Επιλέξτε τύπο" />
              </SelectTrigger>
              <SelectContent>
                {MAINTENANCE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <span className="flex items-center gap-2">
                      <span>{type.icon}</span>
                      <span>{type.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
                min={today}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Ώρα Έναρξης
              </Label>
              <Input
                type="time"
                value={workTime}
                onChange={(e) => setWorkTime(e.target.value)}
              />
            </div>
          </div>

          {/* Διάρκεια */}
          <div className="space-y-2">
            <Label>Εκτιμώμενη Διάρκεια (προαιρετικά)</Label>
            <Input
              placeholder="π.χ. 2-3 ώρες"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>

          {/* Επηρεαζόμενοι Χώροι */}
          <div className="space-y-2">
            <Label>Επηρεαζόμενοι Χώροι (προαιρετικά)</Label>
            <Textarea
              placeholder="π.χ. Είσοδος πολυκατοικίας, κοινόχρηστος διάδρομος"
              value={affectedAreas}
              onChange={(e) => setAffectedAreas(e.target.value)}
              rows={2}
            />
          </div>

          {/* Επιπλέον Μήνυμα */}
          <div className="space-y-2">
            <Label>Επιπλέον Σχόλια (προαιρετικά)</Label>
            <Textarea
              placeholder="π.χ. Υπεύθυνος εργασιών: Τεχνική Εταιρεία ΑΕ, τηλ: 210-1234567"
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
                disabled={!buildingId || !maintenanceType || !workDate}
              >
                <Eye className="h-4 w-4 mr-2" />
                Προεπισκόπηση
              </Button>
              <Button
                onClick={() => sendMutation.mutate()}
                disabled={
                  sendMutation.isPending ||
                  !buildingId ||
                  !maintenanceType ||
                  !workDate ||
                  !workTime
                }
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

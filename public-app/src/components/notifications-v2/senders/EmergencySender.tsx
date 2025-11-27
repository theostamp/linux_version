'use client';

import { useState, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, Send, Eye, Phone } from 'lucide-react';
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
import { 
  extractBuildingData, 
  generateEmailSignature 
} from '../shared/buildingUtils';

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

const EMERGENCY_TYPES = [
  { value: 'water_leak', label: 'Διαρροή Νερού', icon: '💧', urgency: 'high' },
  { value: 'power_outage', label: 'Διακοπή Ρεύματος', icon: '⚡', urgency: 'high' },
  { value: 'gas_leak', label: 'Διαρροή Αερίου', icon: '🔥', urgency: 'critical' },
  { value: 'elevator', label: 'Βλάβη Ανελκυστήρα', icon: '🛗', urgency: 'medium' },
  { value: 'security', label: 'Θέμα Ασφαλείας', icon: '🚨', urgency: 'high' },
  { value: 'weather', label: 'Ακραία Καιρικά Φαινόμενα', icon: '⛈️', urgency: 'high' },
  { value: 'other', label: 'Άλλο Έκτακτο', icon: '⚠️', urgency: 'medium' },
];

export default function EmergencySender({ onSuccess, onCancel }: Props) {
  const { buildings, selectedBuilding } = useBuilding();
  
  const [buildingId, setBuildingId] = useState<number | null>(selectedBuilding?.id ?? null);
  const [emergencyType, setEmergencyType] = useState<string>('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Εξαγωγή δεδομένων κτιρίου
  const selectedBuilding_ = buildings.find(b => b.id === buildingId);
  const buildingData = useMemo(
    () => extractBuildingData(selectedBuilding_), 
    [selectedBuilding_]
  );

  // Pre-fill contact phone from building data
  useMemo(() => {
    if (buildingData.managementPhone && !contactPhone) {
      setContactPhone(buildingData.managementPhone);
    }
  }, [buildingData.managementPhone, contactPhone]);

  const selectedType = EMERGENCY_TYPES.find(t => t.value === emergencyType);

  const generateEmailBody = () => {
    const typeLabel = selectedType?.label || 'Έκτακτο Περιστατικό';
    const phone = contactPhone || buildingData.managementPhone;
    
    let body = `⚠️ ΕΚΤΑΚΤΗ ΑΝΑΚΟΙΝΩΣΗ ⚠️

Αγαπητοί ένοικοι,

Σας ενημερώνουμε για ${typeLabel.toLowerCase()} στην πολυκατοικία μας.

${description.trim()}`;

    if (instructions.trim()) {
      body += `

📋 ΟΔΗΓΙΕΣ:
${instructions.trim()}`;
    }

    if (phone) {
      body += `

📞 ΤΗΛΕΦΩΝΟ ΕΠΙΚΟΙΝΩΝΙΑΣ: ${phone}`;
    }

    body += `

Παρακαλούμε να ακολουθήσετε τις οδηγίες και να διατηρήσετε την ψυχραιμία σας.`;

    body += `\n\n${generateEmailSignature(buildingData)}`;

    return body;
  };

  const getSubject = () => {
    const typeLabel = selectedType?.label || 'Έκτακτο';
    return `⚠️ ΕΠΕΙΓΟΝ: ${typeLabel} - ${buildingData.name}`;
  };

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!buildingId) throw new Error('Επιλέξτε πολυκατοικία');
      if (!emergencyType) throw new Error('Επιλέξτε τύπο έκτακτου');
      if (!description.trim()) throw new Error('Περιγράψτε το περιστατικό');

      return notificationsApi.create({
        building_id: buildingId,
        subject: getSubject(),
        body: generateEmailBody(),
        notification_type: 'email',
        priority: 'urgent',
        send_to_all: true,
      });
    },
    onSuccess: () => {
      toast.success('Η έκτακτη ειδοποίηση στάλθηκε επιτυχώς');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Αποτυχία αποστολής');
    },
  });

  return (
    <>
      <Card className="border-red-300">
        <CardHeader className="bg-red-50 border-b border-red-300">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-red-100 animate-pulse">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-lg text-red-900">
                Έκτακτη Ειδοποίηση
              </CardTitle>
              <p className="text-sm text-red-700">
                Άμεση ενημέρωση για επείγοντα περιστατικά
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Warning */}
          <div className="bg-red-100 border border-red-300 rounded-lg p-4 text-sm text-red-800">
            ⚠️ Οι έκτακτες ειδοποιήσεις αποστέλλονται <strong>άμεσα</strong> σε{' '}
            <strong>όλους</strong> τους ενοίκους. Χρησιμοποιήστε μόνο για πραγματικά
            επείγοντα περιστατικά.
          </div>

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

          {/* Τύπος Έκτακτου */}
          <div className="space-y-2">
            <Label>Τύπος Περιστατικού</Label>
            <Select value={emergencyType} onValueChange={setEmergencyType}>
              <SelectTrigger>
                <SelectValue placeholder="Επιλέξτε τύπο" />
              </SelectTrigger>
              <SelectContent>
                {EMERGENCY_TYPES.map((type) => (
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

          {/* Περιγραφή */}
          <div className="space-y-2">
            <Label>Περιγραφή Περιστατικού</Label>
            <Textarea
              placeholder="Περιγράψτε τι συμβαίνει, πού ακριβώς, και την τρέχουσα κατάσταση..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="border-red-200 focus:border-red-400"
            />
          </div>

          {/* Οδηγίες */}
          <div className="space-y-2">
            <Label>Οδηγίες προς Ενοίκους</Label>
            <Textarea
              placeholder="π.χ. Κλείστε τους κεντρικούς διακόπτες, εκκενώστε τους κοινόχρηστους χώρους..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
            />
          </div>

          {/* Τηλέφωνο Επικοινωνίας */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Τηλέφωνο Επικοινωνίας
            </Label>
            <Input
              placeholder="π.χ. 210-1234567"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
            {buildingData.managementPhone && contactPhone !== buildingData.managementPhone && (
              <p className="text-xs text-gray-500">
                Διαχείριση: {buildingData.managementPhone}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={onCancel}>
              Ακύρωση
            </Button>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowPreview(true)}
                disabled={!buildingId || !emergencyType || !description.trim()}
              >
                <Eye className="h-4 w-4 mr-2" />
                Προεπισκόπηση
              </Button>
              <Button
                variant="destructive"
                onClick={() => sendMutation.mutate()}
                disabled={
                  sendMutation.isPending || 
                  !buildingId || 
                  !emergencyType || 
                  !description.trim()
                }
              >
                {sendMutation.isPending ? (
                  'Αποστολή...'
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Άμεση Αποστολή
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
            <DialogTitle className="text-red-600">Προεπισκόπηση Έκτακτης Ειδοποίησης</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-red-50 p-4 border border-red-200">
              <p className="text-sm text-red-600 mb-1">Θέμα:</p>
              <p className="font-medium text-red-900">{getSubject()}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-500 mb-2">Περιεχόμενο:</p>
              <div className="whitespace-pre-wrap text-sm">
                {generateEmailBody()}
              </div>
            </div>
            <div className="rounded-lg bg-amber-50 p-4 border border-amber-200">
              <p className="text-sm text-amber-800">
                🚀 Θα σταλεί <strong>αμέσως</strong> σε <strong>όλους</strong> τους ενοίκους
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

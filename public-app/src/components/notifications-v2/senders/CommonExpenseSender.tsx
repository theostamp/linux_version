'use client';

import { useState, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { FileSpreadsheet, Upload, Send, Eye, X, FileText, Zap, CheckCircle2, Info } from 'lucide-react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { notificationsApi } from '@/lib/api/notifications';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import { toast } from 'sonner';
import RecipientSelector from '../shared/RecipientSelector';
import {
  extractBuildingData,
  generateEmailSignature,
  MONTHS,
  MONTHS_GENITIVE
} from '../shared/buildingUtils';

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

function getCurrentMonthYear() {
  const now = new Date();
  return { month: now.getMonth(), year: now.getFullYear() };
}

export default function CommonExpenseSender({ onSuccess, onCancel }: Props) {
  const { buildings, selectedBuilding } = useBuilding();
  const current = getCurrentMonthYear();

  const [buildingId, setBuildingId] = useState<number | null>(selectedBuilding?.id ?? null);
  const [month, setMonth] = useState(current.month);
  const [year, setYear] = useState(current.year);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [extraMessage, setExtraMessage] = useState('');
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // ✅ ΝΕΑ: Επιλογές για personalized notifications
  const [includeNotification, setIncludeNotification] = useState(true);
  const [attachmentMode, setAttachmentMode] = useState<'auto' | 'manual' | 'none'>('manual');

  // Εξαγωγή δεδομένων κτιρίου
  const selectedBuilding_ = buildings.find(b => b.id === buildingId);
  const buildingData = useMemo(
    () => extractBuildingData(selectedBuilding_),
    [selectedBuilding_]
  );

  const generateEmailBody = () => {
    const monthName = MONTHS[month];

    let body = `Αγαπητοί ένοικοι,

Σας αποστέλλουμε τον αναλυτικό λογαριασμό κοινοχρήστων δαπανών για τον μήνα ${monthName} ${year}.

Στο συνημμένο αρχείο θα βρείτε την αναλυτική κατάσταση με:
• Τις δαπάνες του μήνα
• Την κατανομή ανά διαμέρισμα
• Το τρέχον υπόλοιπό σας

Παρακαλούμε για την έγκαιρη τακτοποίηση τυχόν οφειλών.`;

    if (extraMessage.trim()) {
      body += `\n\n${extraMessage.trim()}`;
    }

    body += `\n\n${generateEmailSignature(buildingData)}`;

    return body;
  };

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!buildingId) throw new Error('Επιλέξτε πολυκατοικία');
      if (attachmentMode === 'manual' && !attachment) {
        throw new Error('Επισυνάψτε το φύλλο κοινοχρήστων');
      }

      const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

      // Αν έχουμε personalized notification, χρησιμοποιούμε το νέο endpoint
      if (includeNotification) {
        return notificationsApi.sendPersonalizedCommonExpenses({
          building_id: buildingId,
          month: monthStr,
          include_sheet: attachmentMode !== 'none',
          include_notification: true,
          custom_message: extraMessage || undefined,
          attachment: attachmentMode === 'manual' ? attachment : undefined,
          apartment_ids: sendToAll ? undefined : selectedIds,
        });
      }

      // Fallback στο παλιό endpoint για απλή αποστολή
      if (!attachment) throw new Error('Επισυνάψτε το φύλλο κοινοχρήστων');

      const subject = `Κοινόχρηστα ${MONTHS_GENITIVE[month]} ${year} - ${buildingData.name}`;

      return notificationsApi.sendCommonExpenses({
        attachment,
        subject,
        body: generateEmailBody(),
        building_id: buildingId,
        month: monthStr,
        send_to_all: sendToAll,
      });
    },
    onSuccess: (data: any) => {
      if (data?.sent_count !== undefined) {
        toast.success(`Στάλθηκαν ${data.sent_count} ειδοποιήσεις επιτυχώς`);
      } else {
        toast.success('Τα κοινόχρηστα στάλθηκαν επιτυχώς');
      }
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Αποτυχία αποστολής');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast.error('Επιτρέπονται μόνο αρχεία JPG, PNG ή PDF');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Το αρχείο δεν πρέπει να υπερβαίνει τα 10MB');
        return;
      }
      setAttachment(file);
    }
  };

  const years = [current.year - 1, current.year, current.year + 1];

  return (
    <>
      <Card className="border-blue-200">
        <CardHeader className="bg-blue-50 border-b border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-100">
              <FileSpreadsheet className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg text-blue-900">
                Αποστολή Κοινοχρήστων
              </CardTitle>
              <p className="text-sm text-blue-700">
                Μηνιαίος λογαριασμός κοινοχρήστων δαπανών
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
            {/* Προβολή διεύθυνσης κτιρίου */}
            {buildingData.fullAddress && (
              <p className="text-xs text-gray-500">📍 {buildingData.fullAddress}</p>
            )}
          </div>

          {/* Επιλογή Μήνα */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Μήνας</Label>
              <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((name, idx) => (
                    <SelectItem key={idx} value={idx.toString()}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Έτος</Label>
              <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ✅ ΝΕΟ: Επιλογή Ειδοποιητηρίου */}
          <div className="space-y-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-100">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <Label className="text-blue-900 font-medium">Προσωποποιημένο Ειδοποιητήριο</Label>
                  <p className="text-xs text-blue-700">
                    Κάθε ένοικος λαμβάνει τα δικά του ποσά & ανάλυση
                  </p>
                </div>
              </div>
              <Switch
                checked={includeNotification}
                onCheckedChange={setIncludeNotification}
                className="data-[state=unchecked]:bg-gray-300 data-[state=checked]:bg-blue-600 border-gray-400"
              />
            </div>

            {includeNotification && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 text-sm">
                  <strong>Τι θα λάβει κάθε ένοικος:</strong>
                  <ul className="mt-1 list-disc list-inside">
                    <li>Προηγούμενο υπόλοιπο</li>
                    <li>Κοινόχρηστα τρέχοντος μήνα</li>
                    <li>Ανάλυση δαπανών (ένοικος/ιδιοκτήτης)</li>
                    <li>Συνολικό πληρωτέο ποσό</li>
                    <li>Τραπεζικά στοιχεία πληρωμής</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Επιλογή τρόπου επισύναψης */}
          <div className="space-y-3">
            <Label>Φύλλο Κοινοχρήστων</Label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setAttachmentMode('manual')}
                className={`p-3 rounded-lg border-2 transition-all text-center ${
                  attachmentMode === 'manual'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-blue-300'
                }`}
              >
                <Upload className="h-5 w-5 mx-auto text-blue-600 mb-1" />
                <span className="text-sm font-medium">Χειροκίνητα</span>
                <p className="text-xs text-gray-500">Επιλογή αρχείου</p>
              </button>

              <button
                type="button"
                onClick={() => setAttachmentMode('auto')}
                className={`p-3 rounded-lg border-2 transition-all text-center ${
                  attachmentMode === 'auto'
                    ? 'border-green-500 bg-green-50'
                    : 'border-slate-200 hover:border-green-300'
                }`}
              >
                <Zap className="h-5 w-5 mx-auto text-green-600 mb-1" />
                <span className="text-sm font-medium">Αυτόματα</span>
                <p className="text-xs text-gray-500">Από το σύστημα</p>
              </button>

              <button
                type="button"
                onClick={() => setAttachmentMode('none')}
                className={`p-3 rounded-lg border-2 transition-all text-center ${
                  attachmentMode === 'none'
                    ? 'border-gray-500 bg-gray-50'
                    : 'border-slate-200 hover:border-gray-300'
                }`}
              >
                <X className="h-5 w-5 mx-auto text-gray-600 mb-1" />
                <span className="text-sm font-medium">Χωρίς</span>
                <p className="text-xs text-gray-500">Μόνο email</p>
              </button>
            </div>

            {attachmentMode === 'auto' && (
              <Alert className="bg-amber-50 border-amber-200">
                <Info className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 text-sm">
                  Θα επισυναφθεί αυτόματα το φύλλο κοινοχρήστων που έχει καταχωρηθεί
                  στο σύστημα για τον επιλεγμένο μήνα (αν υπάρχει).
                </AlertDescription>
              </Alert>
            )}

            {attachmentMode === 'manual' && (
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                {attachment ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileSpreadsheet className="h-8 w-8 text-blue-600" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{attachment.name}</p>
                      <p className="text-sm text-gray-500">
                        {(attachment.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAttachment(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <Upload className="h-10 w-10 text-gray-400 mx-auto" />
                    <p className="mt-2 text-sm text-gray-600">
                      Κάντε κλικ για επιλογή αρχείου
                    </p>
                    <p className="text-xs text-gray-400">
                      JPG, PNG ή PDF έως 10MB
                    </p>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            )}
          </div>

          {/* Επιπλέον Μήνυμα */}
          <div className="space-y-2">
            <Label>Επιπλέον Σχόλια (προαιρετικά)</Label>
            <Textarea
              placeholder="π.χ. Υπενθυμίζουμε ότι η προθεσμία πληρωμής είναι η 15η του μήνα..."
              value={extraMessage}
              onChange={(e) => setExtraMessage(e.target.value)}
              rows={3}
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
                disabled={!buildingId}
              >
                <Eye className="h-4 w-4 mr-2" />
                Προεπισκόπηση
              </Button>
              <Button
                onClick={() => sendMutation.mutate()}
                disabled={
                  sendMutation.isPending ||
                  !buildingId ||
                  (attachmentMode === 'manual' && !attachment)
                }
              >
                {sendMutation.isPending ? (
                  'Αποστολή...'
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {includeNotification ? 'Αποστολή Ειδοποιητηρίων' : 'Αποστολή'}
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
              <p className="font-medium">
                Κοινόχρηστα {MONTHS_GENITIVE[month]} {year} - {buildingData.name}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-500 mb-2">Περιεχόμενο:</p>
              <div className="whitespace-pre-wrap text-sm">
                {generateEmailBody()}
              </div>
            </div>
            {attachment && (
              <div className="rounded-lg bg-blue-50 p-4 flex items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                <span className="text-sm text-blue-800">
                  Συνημμένο: {attachment.name}
                </span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

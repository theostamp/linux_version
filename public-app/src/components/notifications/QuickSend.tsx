'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Bell, Clock, Mail, MessageSquare, Phone, Send } from 'lucide-react';
import { notificationTemplatesApi, notificationsApi } from '@/lib/api/notifications';
import {
  fetchApartments,
  fetchBuildingResidents,
  type ApartmentList,
  type BuildingResident,
} from '@/lib/api';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { NotificationPriority, NotificationTemplate, NotificationType } from '@/types/notifications';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type RecipientMode = 'all' | 'manual';

const channelOptions: { value: NotificationType; label: string; icon: JSX.Element }[] = [
  { value: 'email', label: 'Email', icon: <Mail className="h-4 w-4" /> },
  { value: 'sms', label: 'SMS', icon: <MessageSquare className="h-4 w-4" /> },
  { value: 'viber', label: 'Viber', icon: <Phone className="h-4 w-4" /> },
  { value: 'both', label: 'Email + SMS', icon: <Bell className="h-4 w-4" /> },
];

const priorityOptions: { value: NotificationPriority; label: string }[] = [
  { value: 'low', label: 'Χαμηλή' },
  { value: 'normal', label: 'Κανονική' },
  { value: 'high', label: 'Υψηλή' },
  { value: 'urgent', label: 'Επείγον' },
];

export default function QuickSend() {
  const { buildings, selectedBuilding, currentBuilding, setSelectedBuilding } = useBuilding();
  const defaultBuildingId = selectedBuilding?.id ?? currentBuilding?.id ?? null;
  const [buildingId, setBuildingId] = useState<number | null>(defaultBuildingId);
  const [templateId, setTemplateId] = useState<string>('none');
  const [channel, setChannel] = useState<NotificationType>('email');
  const [priority, setPriority] = useState<NotificationPriority>('normal');
  const [recipientMode, setRecipientMode] = useState<RecipientMode>('all');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [smsBody, setSmsBody] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [selectedApartmentIds, setSelectedApartmentIds] = useState<number[]>([]);

  const {
    data: templates = [],
    isLoading: templatesLoading,
  } = useQuery<NotificationTemplate[]>({
    queryKey: ['quickSendTemplates', buildingId ?? 'all'],
    queryFn: () => notificationTemplatesApi.list(buildingId ? { building: buildingId } : undefined),
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: apartments = [],
    isLoading: apartmentsLoading,
  } = useQuery<ApartmentList[]>({
    queryKey: ['quickSendApartments', buildingId],
    queryFn: () => (buildingId ? fetchApartments(buildingId) : Promise.resolve([])),
    enabled: !!buildingId,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: residents = [],
    isLoading: residentsLoading,
  } = useQuery<BuildingResident[]>({
    queryKey: ['quickSendResidents', buildingId],
    queryFn: async () => {
      if (!buildingId) return [];
      const response = await fetchBuildingResidents(buildingId);
      return response.residents || [];
    },
    enabled: !!buildingId,
    staleTime: 5 * 60 * 1000,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!buildingId) throw new Error('Επιλέξτε πολυκατοικία');

      const subjectToSend =
        subject.trim() ||
        (channel === 'sms' || channel === 'viber' ? 'Ειδοποίηση' : 'Ενημέρωση πολυκατοικίας');
      const apiChannel: NotificationType = channel === 'viber' ? 'sms' : channel;

      const payload: any = {
        notification_type: apiChannel,
        priority,
        template_id: templateId !== 'none' ? Number(templateId) : undefined,
        subject: subjectToSend,
        body: body.trim() || undefined,
        sms_body: smsBody.trim() || undefined,
        building_ids: [buildingId],
        // Legacy compatibility (some endpoints expect single building)
        building: buildingId,
        building_id: buildingId,
        apartment_ids: recipientMode === 'manual' ? selectedApartmentIds : undefined,
        send_to_all: recipientMode === 'all',
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      };

      if (channel === 'email' && !payload.subject) {
        throw new Error('Συμπληρώστε θέμα email');
      }
      if ((channel === 'sms' || channel === 'viber' || channel === 'both') && !payload.sms_body) {
        throw new Error('Συμπληρώστε μήνυμα για SMS/Viber');
      }
      if (!payload.template_id && !payload.body && channel !== 'sms' && channel !== 'viber') {
        throw new Error('Συμπληρώστε κείμενο ή επιλέξτε πρότυπο');
      }
      if (recipientMode === 'manual' && selectedApartmentIds.length === 0) {
        throw new Error('Επιλέξτε παραλήπτες ή στείλτε σε όλους');
      }
      if (recipientMode !== 'all') {
        payload.send_to_all = false;
      }

      return notificationsApi.create(payload);
    },
    onSuccess: (response) => {
      toast.success(
        `Η αποστολή προετοιμάστηκε (${response.status === 'scheduled' ? 'προγραμματισμένη' : 'άμεση'})`
      );
      if (channel === 'viber') {
        toast.info('Το Viber δεν υποστηρίζεται backend · στάλθηκε ως SMS');
      }
      setTemplateId('none');
      setSubject('');
      setBody('');
      setSmsBody('');
      setSelectedApartmentIds([]);
      setRecipientMode('all');
      setScheduledAt('');
    },
    onError: (error: any) => {
      const apiData = error?.response?.data || error?.response;
      const detail =
        apiData?.detail ||
        (typeof apiData === 'object' ? JSON.stringify(apiData) : null) ||
        error?.message;
      toast.error(detail || 'Δεν ήταν δυνατή η αποστολή');
    },
  });

  const handleTemplateSelect = (value: string) => {
    setTemplateId(value);
    if (value === 'none') {
      setSubject('');
      setBody('');
      setSmsBody('');
      return;
    }
    const picked = templates.find((t) => t.id === Number(value));
    if (picked) {
      setSubject(picked.subject || '');
      setBody(picked.body_template || '');
      if (picked.sms_template) {
        setSmsBody(picked.sms_template);
      }
    }
  };

  const toggleApartment = (id: number) => {
    setSelectedApartmentIds((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      return [...prev, id];
    });
  };

  const selectedRecipientsPreview = useMemo(() => {
    if (recipientMode === 'all') return 'Όλοι οι ένοικοι της πολυκατοικίας';
    const apartmentMatches = apartments
      .filter((apt) => selectedApartmentIds.includes(apt.id))
      .map((apt) => apt.number || `Διαμ. #${apt.id}`);
    return apartmentMatches.length > 0 ? apartmentMatches.join(', ') : 'Χωρίς παραλήπτες';
  }, [recipientMode, apartments, selectedApartmentIds]);

  const handleBuildingChange = (value: string) => {
    const id = value === 'none' ? null : parseInt(value, 10);
    setBuildingId(id);
    setSelectedApartmentIds([]);
    setRecipientMode('all');
    const matched = buildings.find((b) => b.id === id);
    if (matched) {
      setSelectedBuilding(matched);
    }
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="flex flex-col gap-2 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Γρήγορη Αποστολή</CardTitle>
            <p className="text-sm text-gray-500">
              Στείλτε άμεσα ή προγραμματισμένα email / SMS / Viber χωρίς τεχνικές μεταβλητές
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            Χειροκίνητη αποστολή
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[1.2fr,1fr]">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Κανάλι</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {channelOptions.map((option) => (
                    <Button
                      key={option.value}
                      variant={channel === option.value ? 'default' : 'outline'}
                      size="sm"
                      className="justify-start"
                      onClick={() => setChannel(option.value)}
                    >
                      {option.icon}
                      <span className="ml-2">{option.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Προτεραιότητα</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as NotificationPriority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Προγραμματισμός (προαιρετικό)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                  <Clock className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1.2fr,1fr]">
              <div className="space-y-2">
                <Label>Πρότυπο (έτοιμο)</Label>
                <Select value={templateId} onValueChange={handleTemplateSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder={templatesLoading ? 'Φόρτωση...' : 'Επιλέξτε πρότυπο'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Χωρίς πρότυπο</SelectItem>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id.toString()}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Τα templates γεμίζουν αυτόματα το κείμενο — χωρίς μεταβλητές προς συμπλήρωση.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Πολυκατοικία</Label>
                <Select
                  value={buildingId?.toString() ?? 'none'}
                  onValueChange={handleBuildingChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Επιλέξτε" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Επιλογή —</SelectItem>
                    {buildings.map((building) => (
                      <SelectItem key={building.id} value={building.id.toString()}>
                        {building.name || building.street}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Θέμα</Label>
              <Input
                placeholder="Εισάγετε θέμα (π.χ. Υπενθύμιση πληρωμής)"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Κύριο κείμενο (Email)</Label>
                <Textarea
                  rows={6}
                  placeholder="Φιλικό μήνυμα χωρίς τεχνικές μεταβλητές..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  disabled={channel === 'sms' || channel === 'viber'}
                />
              </div>
              <div className="space-y-2">
                <Label>Μήνυμα SMS / Viber</Label>
                <Textarea
                  rows={6}
                  placeholder="Σύντομο κείμενο για SMS ή Viber"
                  value={smsBody}
                  onChange={(e) => setSmsBody(e.target.value)}
                  disabled={channel === 'email'}
                />
                <p className="text-xs text-gray-500">
                  Προτείνετε ευανάγνωστο μήνυμα (160-300 χαρακτήρες για SMS/Viber). Το Viber θα σταλεί ως SMS αν δεν υποστηρίζεται.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Παραλήπτες</p>
                <p className="text-xs text-gray-500">
                  Διαλέξτε κτίριο και στόχευση (όλοι ή συγκεκριμένοι).
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {recipientMode === 'all' ? 'Αποστολή σε όλους' : 'Επιλογή παραληπτών'}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={recipientMode === 'all' ? 'default' : 'outline'}
                onClick={() => setRecipientMode('all')}
              >
                Όλοι
              </Button>
              <Button
                size="sm"
                variant={recipientMode === 'manual' ? 'default' : 'outline'}
                onClick={() => setRecipientMode('manual')}
                disabled={!buildingId}
              >
                Επιλογή
              </Button>
            </div>

            {recipientMode === 'manual' && (
              <div className="space-y-3">
                <div className="rounded-md border bg-white">
                  <div className="flex items-center justify-between border-b px-3 py-2">
                    <p className="text-xs font-medium text-gray-700">Διαμερίσματα</p>
                    <Badge variant="outline" className="text-xs">
                      {apartmentsLoading ? 'Φόρτωση...' : `${apartments.length} διαθέσιμα`}
                    </Badge>
                  </div>
                  <div className="max-h-44 space-y-2 overflow-y-auto px-3 py-2">
                    {apartmentsLoading ? (
                      <p className="text-xs text-gray-500">Φόρτωση...</p>
                    ) : apartments.length === 0 ? (
                      <p className="text-xs text-gray-500">Δεν βρέθηκαν διαμερίσματα.</p>
                    ) : (
                      apartments.map((apartment) => (
                        <label
                          key={apartment.id}
                          className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-slate-50"
                        >
                          <Checkbox
                            checked={selectedApartmentIds.includes(apartment.id)}
                            onCheckedChange={() => toggleApartment(apartment.id)}
                          />
                          <div className="text-xs text-gray-700">
                            <div className="font-medium">{apartment.number || `Διαμ. #${apartment.id}`}</div>
                            <div className="text-[11px] text-gray-500">
                              {apartment.owner_name || apartment.tenant_name || 'Χωρίς όνομα'}
                            </div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-md border bg-white">
                  <div className="flex items-center justify-between border-b px-3 py-2">
                    <p className="text-xs font-medium text-gray-700">Κάτοικοι</p>
                    <Badge variant="outline" className="text-xs">
                      {residentsLoading ? 'Φόρτωση...' : `${residents.length} χρήστες`}
                    </Badge>
                  </div>
                  <div className="max-h-40 space-y-2 overflow-y-auto px-3 py-2">
                    {residentsLoading ? (
                      <p className="text-xs text-gray-500">Φόρτωση...</p>
                    ) : residents.length === 0 ? (
                      <p className="text-xs text-gray-500">Δεν βρέθηκαν χρήστες.</p>
                    ) : (
                      residents.map((resident) => (
                        <label
                          key={resident.id}
                          className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-slate-50"
                        >
                          <Checkbox
                            checked={selectedApartmentIds.includes(resident.apartment_id)}
                            onCheckedChange={() => toggleApartment(resident.apartment_id)}
                          />
                          <div className="text-xs text-gray-700">
                            <div className="font-medium">
                              {resident.name} <span className="text-gray-400">· Διαμ. {resident.apartment_number}</span>
                            </div>
                            <div className="text-[11px] text-gray-500">{resident.email || resident.phone}</div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-md bg-white px-3 py-3 text-sm text-gray-700">
              <p className="font-semibold">Προεπισκόπηση κοινού</p>
              <p className="text-xs text-gray-500">{selectedRecipientsPreview}</p>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-gray-500">
                Η αποστολή γίνεται για το επιλεγμένο κτίριο. Μπορείτε να προγραμματίσετε για αργότερα.
              </div>
              <Button
                onClick={() => sendMutation.mutate()}
                disabled={sendMutation.isLoading || !buildingId}
              >
                {sendMutation.isLoading ? (
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
        </div>
      </CardContent>
    </Card>
  );
}

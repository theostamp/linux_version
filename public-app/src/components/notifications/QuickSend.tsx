'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import type {
  NotificationCategory,
  NotificationPriority,
  NotificationTemplate,
  NotificationType,
} from '@/types/notifications';
import { useNotificationPreferences, getPreferenceForCategory } from '@/hooks/useNotificationPreferences';
import { toast } from 'sonner';

type RecipientMode = 'all' | 'manual';

const channelOptions: { value: NotificationType; label: string; icon: JSX.Element }[] = [
  { value: 'email', label: 'Email', icon: <Mail className="h-4 w-4" /> },
  { value: 'sms', label: 'SMS', icon: <MessageSquare className="h-4 w-4" /> },
  { value: 'viber', label: 'Viber', icon: <Phone className="h-4 w-4" /> },
  { value: 'both', label: 'Email + SMS', icon: <Bell className="h-4 w-4" /> },
];

const categoryOptions: { value: NotificationCategory; label: string }[] = [
  { value: 'announcement', label: 'Ανακοινώσεις' },
  { value: 'payment', label: 'Πληρωμές' },
  { value: 'maintenance', label: 'Συντηρήσεις' },
  { value: 'meeting', label: 'Συνελεύσεις' },
  { value: 'reminder', label: 'Υπενθυμίσεις' },
  { value: 'emergency', label: 'Έκτακτα' },
];

const priorityOptions: { value: NotificationPriority; label: string }[] = [
  { value: 'low', label: 'Χαμηλή' },
  { value: 'normal', label: 'Κανονική' },
  { value: 'high', label: 'Υψηλή' },
  { value: 'urgent', label: 'Επείγον' },
];

const formatDateTimeLocal = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const getDefaultScheduledTime = () => {
  const date = new Date();
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + 2);
  return formatDateTimeLocal(date);
};

export default function QuickSend() {
  const { buildings, selectedBuilding, currentBuilding, setSelectedBuilding } = useBuilding();
  const { preferences } = useNotificationPreferences();
  const defaultBuildingId = selectedBuilding?.id ?? currentBuilding?.id ?? null;
  const [buildingId, setBuildingId] = useState<number | null>(defaultBuildingId);
  const [category, setCategory] = useState<NotificationCategory>('announcement');
  const [templateId, setTemplateId] = useState<string>('none');
  const [channel, setChannel] = useState<NotificationType>('email');
  const [priority, setPriority] = useState<NotificationPriority>('normal');
  const [instantSend, setInstantSend] = useState(true);
  const [scheduledSend, setScheduledSend] = useState(false);
  const [recipientMode, setRecipientMode] = useState<RecipientMode>('all');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [smsBody, setSmsBody] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [selectedApartmentIds, setSelectedApartmentIds] = useState<number[]>([]);
  const [templateContext, setTemplateContext] = useState<Record<string, string>>({});
  const [showPersonalization, setShowPersonalization] = useState(false);

  useEffect(() => {
    const pref = getPreferenceForCategory(preferences, category);
    setInstantSend(pref.instant);
    setScheduledSend(pref.scheduled);
    if (pref.scheduled) {
      setScheduledAt((prev) => prev || getDefaultScheduledTime());
    } else {
      setScheduledAt('');
    }
  }, [preferences, category]);

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
      const effectiveScheduledAt = scheduledSend ? scheduledAt || getDefaultScheduledTime() : null;

      const subjectToSend =
        subject.trim() ||
        (channel === 'sms' || channel === 'viber' ? 'Ειδοποίηση' : 'Ενημέρωση πολυκατοικίας');
      const apiChannel: NotificationType = channel === 'viber' ? 'sms' : channel;

      const hasTemplateId = templateId !== 'none' && templateId;
      const payload: any = {
        notification_type: apiChannel,
        priority,
        subject: subjectToSend,
        sms_body: smsBody.trim() || undefined,
        // Backend expects building_id; keep building for legacy
        building_id: buildingId,
        building: buildingId,
        apartment_ids: recipientMode === 'manual' ? selectedApartmentIds : undefined,
        send_to_all: recipientMode === 'all',
      };

      // Add template_id and context only if using a template
      if (hasTemplateId) {
        payload.template_id = Number(templateId);
        payload.context = buildContextForSubmit();
      } else {
        // When not using template, backend always requires subject+body
        // For SMS/Viber, use sms_body as body if body is empty
        if (channel === 'sms' || channel === 'viber') {
          payload.body = smsBody.trim() || 'Ειδοποίηση';
        } else {
          payload.body = body.trim() || undefined;
        }
      }

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

      if (!instantSend && !(scheduledSend && effectiveScheduledAt)) {
        throw new Error('Ενεργοποιήστε άμεση ή προγραμματισμένη αποστολή');
      }
      if (scheduledSend) {
        const finalScheduledAt = effectiveScheduledAt || getDefaultScheduledTime();
        if (!scheduledAt) {
          setScheduledAt(finalScheduledAt);
        }
        if (Number.isNaN(Date.parse(finalScheduledAt))) {
          throw new Error('Ορίστε ώρα για την προγραμματισμένη αποστολή');
        }
        payload.scheduled_at = new Date(finalScheduledAt).toISOString();
      } else {
        payload.scheduled_at = undefined;
      }

      return notificationsApi.create(payload);
    },
    onSuccess: (response) => {
      const isScheduled = response.status === 'scheduled' || (scheduledSend && !!scheduledAt);
      toast.success(isScheduled ? 'Η αποστολή μπήκε στο πρόγραμμα' : 'Η αποστολή θα φύγει άμεσα');
      if (channel === 'viber') {
        toast.info('Το Viber δεν υποστηρίζεται backend · στάλθηκε ως SMS');
      }
      setTemplateId('none');
      setSubject('');
      setBody('');
      setSmsBody('');
      setSelectedApartmentIds([]);
      setRecipientMode('all');
      setScheduledAt(scheduledSend ? getDefaultScheduledTime() : '');
    },
    onError: (error: any) => {
      const apiData = error?.response?.data || error?.response;
      const detail =
        apiData?.detail ||
        (apiData && typeof apiData === 'object' ? JSON.stringify(apiData) : null) ||
        error?.message;
      toast.error(detail || 'Δεν ήταν δυνατή η αποστολή');
      // Helpful console log for debugging backend validation
      // eslint-disable-next-line no-console
      console.error('[QuickSend] send failed', { apiData, error });
    },
  });

  // Extract placeholders from template text (e.g., {{ variable_name }})
  const extractPlaceholders = (text: string): string[] => {
    const regex = /\{\{\s*(\w+)\s*\}\}/g;
    const matches = new Set<string>();
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.add(match[1]);
    }
    return Array.from(matches);
  };

  // Convert placeholder name to user-friendly label
  const getPlaceholderLabel = (placeholder: string): string => {
    const labelMap: Record<string, string> = {
      building_name: 'Όνομα Πολυκατοικίας',
      owner_name: 'Όνομα Ιδιοκτήτη',
      recipient_name: 'Όνομα Παραλήπτη',
      apartment_number: 'Αριθμός Διαμερίσματος',
      month_name: 'Μήνας',
      month: 'Μήνας',
      year: 'Έτος',
      total_due: 'Συνολικό Οφειλόμενο Ποσό',
      amount: 'Ποσό',
      due_date: 'Ημερομηνία Λήξης',
      meeting_date: 'Ημερομηνία Συνάντησης',
      meeting_time: 'Ώρα Συνάντησης',
      meeting_location: 'Τοποθεσία Συνάντησης',
      agenda_short: 'Θέματα (Σύντομα)',
      payment_short_instructions: 'Οδηγίες Πληρωμής',
      announcement_title: 'Τίτλος Ανακοίνωσης',
      announcement_body: 'Κείμενο Ανακοίνωσης',
    };
    return labelMap[placeholder] || placeholder.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const defaultContextValue = (placeholder: string, currentBuildingName?: string) => {
    const fallback = 'Συμπληρώστε πληροφορία';
    const map: Record<string, string> = {
      building_name: currentBuildingName || 'Πολυκατοικία',
      meeting_date: 'Ημερομηνία συνέλευσης',
      meeting_time: 'Ώρα συνέλευσης',
      meeting_location: 'Χώρος συνάντησης',
      agenda_items: 'Θέματα ημερήσιας διάταξης',
      agenda_short: 'Σύνοψη θεμάτων',
      contact_name: 'Διαχείριση',
      recipient_name: 'Κάτοικος',
      month_name: 'Τρέχων μήνας',
      due_date: 'Ημερομηνία λήξης',
      total_due: 'Ποσό',
      payment_short_instructions: 'Τρόπος πληρωμής',
      maintenance_date: 'Ημερομηνία εργασίας',
      maintenance_time: 'Ώρα εργασίας',
      maintenance_location: 'Χώρος εργασίας',
      maintenance_scope: 'Περιγραφή εργασίας',
      issue_title: 'Τίτλος θέματος',
      issue_description: 'Περιγραφή θέματος',
      next_actions: 'Επόμενα βήματα',
      contact_phone: 'Τηλέφωνο επικοινωνίας',
    };
    return map[placeholder] || fallback;
  };

  const buildContextForSubmit = () => {
    const buildingLabel =
      buildings.find((b) => b.id === buildingId)?.name ||
      buildings.find((b) => b.id === buildingId)?.street;

    return Object.entries(templateContext).reduce<Record<string, string>>((acc, [key, value]) => {
      acc[key] = value?.trim() || defaultContextValue(key, buildingLabel);
      return acc;
    }, {});
  };

  const handleTemplateSelect = (value: string) => {
    setTemplateId(value);
    if (value === 'none') {
      setSubject('');
      setBody('');
      setSmsBody('');
      setTemplateContext({});
      return;
    }
    const picked = templates.find((t) => t.id === Number(value));
    if (picked) {
      setCategory(picked.category as NotificationCategory);
      setSubject(picked.subject || '');
      setBody(picked.body_template || '');
      if (picked.sms_template) {
        setSmsBody(picked.sms_template);
      }

      // Extract placeholders and initialize context with friendly defaults (no dev-style variables)
      const allText = `${picked.subject || ''} ${picked.body_template || ''} ${picked.sms_template || ''}`;
      const placeholders = extractPlaceholders(allText);
      const initialContext: Record<string, string> = {};
      const currentBuildingName =
        buildings.find((b) => b.id === buildingId)?.name || buildings.find((b) => b.id === buildingId)?.street;
      placeholders.forEach((placeholder) => {
        initialContext[placeholder] = defaultContextValue(placeholder, currentBuildingName);
      });
      setTemplateContext(initialContext);
      setShowPersonalization(false);
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
      // Update building_name placeholder if present
      setTemplateContext((prev) => {
        if (!prev.building_name) return prev;
        return { ...prev, building_name: matched.name || matched.street || prev.building_name };
      });
    }
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="flex flex-col gap-2 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Γρήγορη Αποστολή</CardTitle>
            <p className="text-sm text-gray-500">
              Διαλέξτε με διακόπτες αν θα φύγουν άμεσα ή προγραμματισμένα, χωρίς περίπλοκες μεταβλητές
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
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Κατηγορία</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as NotificationCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Label>Χρόνος αποστολής</Label>
                <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">Άμεση αποστολή</span>
                    <Switch checked={instantSend} onCheckedChange={setInstantSend} />
                  </div>
                  <div className="space-y-2 rounded-md border border-slate-200 bg-white p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900">Προγραμματισμένη</span>
                      <Switch
                        checked={scheduledSend}
                        onCheckedChange={(checked) => {
                          setScheduledSend(checked);
                          if (checked && !scheduledAt) {
                            setScheduledAt(getDefaultScheduledTime());
                          } else if (!checked) {
                            setScheduledAt('');
                          }
                        }}
                      />
                    </div>
                    {scheduledSend && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="datetime-local"
                          value={scheduledAt}
                          onChange={(e) => setScheduledAt(e.target.value)}
                        />
                        <Clock className="h-4 w-4 text-slate-400" />
                      </div>
                    )}
                    <p className="text-[11px] text-gray-500">
                      Ενεργοποιήστε τουλάχιστον έναν διακόπτη. Αν είναι ενεργό το προγραμματισμένο, θα χρησιμοποιηθεί η ώρα που ορίζετε.
                    </p>
                  </div>
                </div>
              </div>
            </div>

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
                  Τα templates έχουν έτοιμο κείμενο. Οι βασικές τιμές συμπληρώνονται αυτόματα για εσάς.
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

            {templateId !== 'none' && Object.keys(templateContext).length > 0 && (
              <Collapsible key={templateId}>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Προσωποποίηση (προαιρετικό)</p>
                    <p className="text-xs text-gray-600">
                      Έχουμε ήδη συμπληρώσει τις βασικές τιμές. Άνοιξε μόνο αν θέλεις αλλαγές.
                    </p>
                  </div>
                  <CollapsibleTrigger
                    asChild
                    onClick={() => setShowPersonalization((prev) => !prev)}
                  >
                    <Button variant="ghost" size="sm">
                      {showPersonalization ? 'Κλείσιμο' : 'Εμφάνιση'}
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {Object.keys(templateContext).map((placeholder) => (
                      <div key={placeholder} className="space-y-1">
                        <Label className="text-xs text-gray-800">{getPlaceholderLabel(placeholder)}</Label>
                        <Input
                          value={templateContext[placeholder] || ''}
                          onChange={(e) =>
                            setTemplateContext((prev) => ({
                              ...prev,
                              [placeholder]: e.target.value,
                            }))
                          }
                          className="bg-white"
                        />
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

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

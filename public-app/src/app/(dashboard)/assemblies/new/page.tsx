'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Users, ArrowLeft, Calendar, Clock, MapPin, Video,
  Plus, Trash2, GripVertical, Save, Loader2, AlertCircle,
  Vote, FileText, MessageSquare, CheckCircle, Info
} from 'lucide-react';

import { useBuilding } from '@/components/contexts/BuildingContext';
import { useAuth } from '@/components/contexts/AuthContext';
import { useCreateAssembly } from '@/hooks/useAssemblies';
import type { CreateAssemblyPayload, AgendaItemType, VotingType } from '@/lib/api';

import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { hasInternalManagerAccess } from '@/lib/roleUtils';
import ZoomSettingsModal from '@/components/projects/ZoomSettingsModal';

interface AgendaItemForm {
  id: string;
  order: number;
  title: string;
  description: string;
  item_type: AgendaItemType;
  estimated_duration: number;
  voting_type: VotingType;
  allows_pre_voting: boolean;
}

const itemTypes: { value: AgendaItemType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'informational', label: 'Ενημερωτικό', icon: <Info className="w-4 h-4" />, color: 'bg-blue-100 text-blue-700' },
  { value: 'discussion', label: 'Συζήτηση', icon: <MessageSquare className="w-4 h-4" />, color: 'bg-amber-100 text-amber-700' },
  { value: 'voting', label: 'Ψηφοφορία', icon: <Vote className="w-4 h-4" />, color: 'bg-indigo-100 text-indigo-700' },
  { value: 'approval', label: 'Έγκριση', icon: <CheckCircle className="w-4 h-4" />, color: 'bg-emerald-100 text-emerald-700' },
];

const votingTypes: { value: VotingType; label: string }[] = [
  { value: 'simple_majority', label: 'Απλή Πλειοψηφία (>50%)' },
  { value: 'qualified_majority', label: 'Ειδική Πλειοψηφία (2/3)' },
  { value: 'unanimous', label: 'Ομοφωνία' },
  { value: 'relative_majority', label: 'Σχετική Πλειοψηφία' },
];

function AgendaItemCard({
  item,
  index,
  onUpdate,
  onRemove,
  canRemove
}: {
  item: AgendaItemForm;
  index: number;
  onUpdate: (id: string, updates: Partial<AgendaItemForm>) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const itemType = itemTypes.find(t => t.value === item.item_type);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden"
    >
      {/* Header */}
      <div
        className="p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 text-gray-400">
          <GripVertical className="w-4 h-4" />
          <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium">
            {item.order}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <Input
            value={item.title}
            onChange={(e) => onUpdate(item.id, { title: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            placeholder="Τίτλος θέματος..."
            className="border-0 p-0 h-auto text-base font-medium focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className={cn('px-2 py-1 rounded text-xs font-medium', itemType?.color)}>
            {itemType?.icon}
          </span>
          <span className="text-sm text-gray-500">{item.estimated_duration} λ.</span>
          {canRemove && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-t border-gray-100 p-4 space-y-4"
        >
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>Τύπος Θέματος</Label>
              <Select
                value={item.item_type}
                onValueChange={(v) => onUpdate(item.id, { item_type: v as AgendaItemType })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {itemTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <span className="flex items-center gap-2">
                        {type.icon}
                        {type.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Εκτιμώμενη Διάρκεια (λεπτά)</Label>
              <Input
                type="number"
                min={1}
                max={180}
                value={item.estimated_duration}
                onChange={(e) => onUpdate(item.id, { estimated_duration: parseInt(e.target.value) || 10 })}
                className="mt-1"
              />
            </div>

            {item.item_type === 'voting' && (
              <div>
                <Label>Τύπος Ψηφοφορίας</Label>
                <Select
                  value={item.voting_type}
                  onValueChange={(v) => onUpdate(item.id, { voting_type: v as VotingType })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {votingTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div>
            <Label>Περιγραφή</Label>
            <Textarea
              value={item.description}
              onChange={(e) => onUpdate(item.id, { description: e.target.value })}
              placeholder="Αναλυτική περιγραφή του θέματος..."
              className="mt-1"
              rows={3}
            />
          </div>

          {item.item_type === 'voting' && (
            <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg">
              <Switch
                checked={item.allows_pre_voting}
                onCheckedChange={(v) => onUpdate(item.id, { allows_pre_voting: v })}
                className="data-[state=unchecked]:bg-gray-300 data-[state=checked]:bg-indigo-600 border-gray-400"
              />
              <div>
                <Label className="text-indigo-800">Επιτρέπεται Pre-voting</Label>
                <p className="text-xs text-indigo-600">
                  Οι ένοικοι μπορούν να ψηφίσουν πριν τη συνέλευση
                </p>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

function CreateAssemblyContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentBuilding, selectedBuilding, buildingContext, buildings } = useBuilding();
  const createAssembly = useCreateAssembly();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    building: (selectedBuilding?.id ?? currentBuilding?.id) || 0,
    scheduled_date: '',
    scheduled_time: '19:00',
    estimated_duration: 60,
    is_physical: true,
    is_online: false,
    location: '',
    meeting_link: '',
    zoom_settings: {
      meetingUrl: '',
      meetingId: '',
      password: '',
      waitingRoom: true,
      participantVideo: false,
      hostVideo: true,
      muteOnEntry: true,
      autoRecord: false,
      notes: '',
    },
    pre_voting_enabled: true,
    pre_voting_start_date: '',
    pre_voting_end_date: '',
  });

  const [userTouchedBuilding, setUserTouchedBuilding] = useState(false);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);

  // Auto-fill building once we know the current/selected building, unless user already chose manually
  useEffect(() => {
    const ctxBuildingId = (selectedBuilding?.id ?? currentBuilding?.id) || 0;
    if (!userTouchedBuilding && ctxBuildingId && (!formData.building || formData.building === 0)) {
      setFormData((prev) => ({ ...prev, building: ctxBuildingId }));
    }
  }, [selectedBuilding?.id, currentBuilding?.id, userTouchedBuilding, formData.building]);

  const [agendaItems, setAgendaItems] = useState<AgendaItemForm[]>([
    {
      id: '1',
      order: 1,
      title: 'Έγκριση πρακτικών προηγούμενης συνέλευσης',
      description: '',
      item_type: 'approval',
      estimated_duration: 5,
      voting_type: 'simple_majority',
      allows_pre_voting: false,
    }
  ]);

  const canManage = hasInternalManagerAccess(user, buildingContext ?? selectedBuilding);

  if (!canManage) {
    router.push('/assemblies');
    return null;
  }

  const addAgendaItem = () => {
    const newItem: AgendaItemForm = {
      id: Date.now().toString(),
      order: agendaItems.length + 1,
      title: '',
      description: '',
      item_type: 'discussion',
      estimated_duration: 10,
      voting_type: 'simple_majority',
      allows_pre_voting: true,
    };
    setAgendaItems([...agendaItems, newItem]);
  };

  const updateAgendaItem = (id: string, updates: Partial<AgendaItemForm>) => {
    setAgendaItems(items =>
      items.map(item => item.id === id ? { ...item, ...updates } : item)
    );
  };

  const removeAgendaItem = (id: string) => {
    setAgendaItems(items => {
      const filtered = items.filter(item => item.id !== id);
      return filtered.map((item, index) => ({ ...item, order: index + 1 }));
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Calculate pre-voting dates if not set
    let preVotingStartDate = formData.pre_voting_start_date;
    let preVotingEndDate = formData.pre_voting_end_date;

    if (formData.pre_voting_enabled && formData.scheduled_date) {
      const assemblyDate = new Date(formData.scheduled_date);

      if (!preVotingStartDate) {
        // Default: voting starts 7 days before assembly
        const startDate = new Date(assemblyDate);
        startDate.setDate(startDate.getDate() - 7);
        preVotingStartDate = startDate.toISOString().split('T')[0];
      }

      if (!preVotingEndDate) {
        // Default: voting closes 1 day BEFORE assembly (backend requirement)
        const endDate = new Date(assemblyDate);
        endDate.setDate(endDate.getDate() - 1);
        preVotingEndDate = endDate.toISOString().split('T')[0];
      }
    }

    const payload: CreateAssemblyPayload = {
      title: formData.title || `Γενική Συνέλευση - ${new Date(formData.scheduled_date).toLocaleDateString('el-GR')}`,
      building: formData.building,
      description: formData.description,
      scheduled_date: formData.scheduled_date,
      scheduled_time: formData.scheduled_time,
      estimated_duration: formData.estimated_duration,
      is_physical: formData.is_physical,
      is_online: formData.is_online,
      location: formData.location,
      meeting_link: formData.meeting_link,
      meeting_id: formData.zoom_settings.meetingId || '',
      meeting_password: formData.zoom_settings.password || '',
      pre_voting_enabled: formData.pre_voting_enabled,
      pre_voting_start_date: preVotingStartDate,
      pre_voting_end_date: preVotingEndDate,
      agenda_items: agendaItems.filter(item => item.title.trim()).map(item => ({
        order: item.order,
        title: item.title,
        description: item.description,
        item_type: item.item_type,
        estimated_duration: item.estimated_duration,
        voting_type: item.voting_type,
        allows_pre_voting: item.allows_pre_voting,
      })),
    };

    try {
      const assembly = await createAssembly.mutateAsync(payload);
      router.push(`/assemblies/${assembly.id}`);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const totalDuration = agendaItems.reduce((sum, item) => sum + item.estimated_duration, 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Header */}
      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => router.push('/assemblies')}
          className="mb-2 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Πίσω
        </Button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Νέα Συνέλευση</h1>
            <p className="text-gray-500">Δημιουργήστε μια νέα γενική συνέλευση</p>
          </div>
        </div>
      </div>

      {/* Basic info */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Βασικά Στοιχεία
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <Label htmlFor="title">Τίτλος Συνέλευσης</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="π.χ. Τακτική Γενική Συνέλευση 2024"
              className="mt-1"
            />
          </div>

          {buildings && buildings.length > 1 && (
            <div>
              <Label htmlFor="building">Κτίριο</Label>
              <Select
                value={formData.building.toString()}
                onValueChange={(v) => {
                  setUserTouchedBuilding(true);
                  setFormData({ ...formData, building: parseInt(v) });
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Επιλέξτε κτίριο" />
                </SelectTrigger>
                <SelectContent>
                  {buildings.map((b) => (
                    <SelectItem key={b.id} value={b.id.toString()}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="date">Ημερομηνία</Label>
            <Input
              id="date"
              type="date"
              value={formData.scheduled_date}
              onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="time">Ώρα</Label>
            <Input
              id="time"
              type="time"
              value={formData.scheduled_time}
              onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
              className="mt-1"
              required
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="description">Περιγραφή (προαιρετικό)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Περιγράψτε τον σκοπό της συνέλευσης..."
              className="mt-1"
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Τοποθεσία & Τρόπος Διεξαγωγής
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="flex items-center gap-4 p-4 border rounded-xl">
            <Switch
              checked={formData.is_physical}
              onCheckedChange={(v) => setFormData({ ...formData, is_physical: v })}
              className="data-[state=unchecked]:bg-gray-300 data-[state=checked]:bg-primary border-gray-400"
            />
            <div className="flex-1">
              <Label className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Φυσική παρουσία
              </Label>
              <p className="text-xs text-gray-500">Η συνέλευση θα γίνει σε φυσικό χώρο</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 border rounded-xl">
            <Switch
              checked={formData.is_online}
              onCheckedChange={(v) => setFormData({ ...formData, is_online: v })}
              className="data-[state=unchecked]:bg-gray-300 data-[state=checked]:bg-primary border-gray-400"
            />
            <div className="flex-1">
              <Label className="flex items-center gap-2">
                <Video className="w-4 h-4" />
                Διαδικτυακή συμμετοχή
              </Label>
              <p className="text-xs text-gray-500">Επιτρέπεται η συμμετοχή μέσω Zoom/Meet</p>
            </div>
          </div>

          {formData.is_physical && (
            <div>
              <Label htmlFor="location">Τοποθεσία</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="π.χ. Pilotis, Αίθουσα Α"
                className="mt-1"
              />
            </div>
          )}

          {formData.is_online && (
            <div className="md:col-span-2 space-y-3">
              <div>
                <Label htmlFor="meeting_link">Σύνδεσμος τηλεδιάσκεψης</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="meeting_link"
                    type="url"
                    value={formData.meeting_link}
                    onChange={(e) => {
                      const url = e.target.value;
                      // Extract meeting ID from URL
                      const match = url.match(/\/j\/(\d+)/);
                      const meetingId = match ? match[1] : '';
                      setFormData({
                        ...formData,
                        meeting_link: url,
                        zoom_settings: {
                          ...formData.zoom_settings,
                          meetingUrl: url,
                          meetingId: meetingId,
                        },
                      });
                    }}
                    placeholder="https://zoom.us/j/..."
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsZoomModalOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Video className="w-4 h-4" />
                    Ρυθμίσεις Zoom
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pre-voting */}
      <div className="bg-indigo-50 rounded-2xl border border-indigo-100 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Vote className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="text-lg font-semibold text-indigo-900">Ηλεκτρονική Ψηφοφορία (Pre-voting)</h2>
              <p className="text-sm text-indigo-600">Οι ένοικοι μπορούν να ψηφίσουν πριν τη συνέλευση</p>
            </div>
          </div>
          <Switch
            checked={formData.pre_voting_enabled}
            onCheckedChange={(v) => setFormData({ ...formData, pre_voting_enabled: v })}
            className="data-[state=unchecked]:bg-gray-300 data-[state=checked]:bg-indigo-600 border-gray-400"
          />
        </div>

        {formData.pre_voting_enabled && (
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div>
              <Label>Έναρξη pre-voting</Label>
              <Input
                type="date"
                value={formData.pre_voting_start_date}
                onChange={(e) => setFormData({ ...formData, pre_voting_start_date: e.target.value })}
                className="mt-1"
                placeholder="7 ημέρες πριν"
              />
              <p className="text-xs text-indigo-500 mt-1">Αφήστε κενό για 7 ημέρες πριν</p>
            </div>
            <div>
              <Label>Λήξη pre-voting</Label>
              <Input
                type="date"
                value={formData.pre_voting_end_date}
                onChange={(e) => setFormData({ ...formData, pre_voting_end_date: e.target.value })}
                className="mt-1"
                placeholder="3 ημέρες μετά"
              />
              <p className="text-xs text-indigo-500 mt-1">Αφήστε κενό για 3 ημέρες μετά τη συνέλευση</p>
            </div>
          </div>
        )}
      </div>

      {/* Agenda */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Ημερήσια Διάταξη
            </h2>
            <p className="text-sm text-gray-500">
              Συνολική διάρκεια: ~{totalDuration} λεπτά
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={addAgendaItem}
          >
            <Plus className="w-4 h-4 mr-2" />
            Προσθήκη Θέματος
          </Button>
        </div>

        <div className="space-y-3">
          {agendaItems.map((item, index) => (
            <AgendaItemCard
              key={item.id}
              item={item}
              index={index}
              onUpdate={updateAgendaItem}
              onRemove={removeAgendaItem}
              canRemove={agendaItems.length > 1}
            />
          ))}
        </div>

        {agendaItems.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p>Δεν έχετε προσθέσει θέματα.</p>
            <Button
              type="button"
              variant="outline"
              onClick={addAgendaItem}
              className="mt-3"
            >
              <Plus className="w-4 h-4 mr-2" />
              Προσθήκη πρώτου θέματος
            </Button>
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/assemblies')}
        >
          Ακύρωση
        </Button>
        <Button
          type="submit"
          disabled={createAssembly.isPending || !formData.scheduled_date}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
        >
          {createAssembly.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Αποθήκευση...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Δημιουργία Συνέλευσης
            </>
          )}
        </Button>
      </div>

      {/* Zoom Settings Modal */}
      <ZoomSettingsModal
        isOpen={isZoomModalOpen}
        onClose={() => setIsZoomModalOpen(false)}
        onSave={(settings) => {
          setFormData({
            ...formData,
            meeting_link: settings.meetingUrl,
            zoom_settings: settings,
          });
        }}
        initialSettings={formData.zoom_settings}
      />
    </form>
  );
}

export default function CreateAssemblyPage() {
  return (
    <AuthGate role="any">
      <SubscriptionGate requiredStatus="any">
        <CreateAssemblyContent />
      </SubscriptionGate>
    </AuthGate>
  );
}

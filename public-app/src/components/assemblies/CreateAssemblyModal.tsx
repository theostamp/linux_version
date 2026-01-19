'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, X, Calendar, Clock, MapPin, Video,
  Plus, Trash2, GripVertical, Save, Loader2,
  Vote, FileText, MessageSquare, CheckCircle, Info
} from 'lucide-react';

import { useBuilding } from '@/components/contexts/BuildingContext';
import { useCreateAssembly } from '@/hooks/useAssemblies';
import type { CreateAssemblyPayload, AgendaItemType, VotingType } from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

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

export interface ProjectDataForAssembly {
  title: string;
  description?: string;
  estimatedCost?: string | number;
  buildingId?: number;
  proposedDate?: string;
  proposedTime?: string;
}

interface CreateAssemblyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (assemblyId: string) => void;
  projectData?: ProjectDataForAssembly;
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

function AgendaItemRow({
  item,
  onUpdate,
  onRemove,
  canRemove
}: {
  item: AgendaItemForm;
  onUpdate: (id: string, updates: Partial<AgendaItemForm>) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const itemType = itemTypes.find(t => t.value === item.item_type);

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-300 overflow-hidden">
      <div
        className="p-3 flex items-center gap-2 cursor-pointer hover:bg-gray-100"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-1 text-gray-400">
          <GripVertical className="w-3 h-3" />
          <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-xs font-medium">
            {item.order}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <Input
            value={item.title}
            onChange={(e) => onUpdate(item.id, { title: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            placeholder="Τίτλος θέματος..."
            className="border-0 p-0 h-auto text-sm font-medium focus-visible:ring-0 bg-transparent"
          />
        </div>

        <div className="flex items-center gap-1">
          <span className={cn('px-1.5 py-0.5 rounded text-xs', itemType?.color)}>
            {itemType?.icon}
          </span>
          <span className="text-xs text-gray-500">{item.estimated_duration}λ</span>
          {canRemove && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-300 p-3 space-y-3 bg-white">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Τύπος</Label>
              <Select
                value={item.item_type}
                onValueChange={(v) => onUpdate(item.id, { item_type: v as AgendaItemType })}
              >
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {itemTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value} className="text-xs">
                      <span className="flex items-center gap-1">
                        {type.icon}
                        {type.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Διάρκεια (λεπτά)</Label>
              <Input
                type="number"
                min={1}
                max={180}
                value={item.estimated_duration}
                onChange={(e) => onUpdate(item.id, { estimated_duration: parseInt(e.target.value) || 10 })}
                className="h-8 text-xs mt-1"
              />
            </div>

            {item.item_type === 'voting' && (
              <div>
                <Label className="text-xs">Τύπος Ψηφοφορίας</Label>
                <Select
                  value={item.voting_type}
                  onValueChange={(v) => onUpdate(item.id, { voting_type: v as VotingType })}
                >
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {votingTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value} className="text-xs">
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs">Περιγραφή</Label>
            <Textarea
              value={item.description}
              onChange={(e) => onUpdate(item.id, { description: e.target.value })}
              placeholder="Αναλυτική περιγραφή..."
              className="mt-1 text-xs"
              rows={2}
            />
          </div>

          {item.item_type === 'voting' && (
            <div className="flex items-center gap-2 p-2 bg-indigo-50 rounded">
              <Switch
                checked={item.allows_pre_voting}
                onCheckedChange={(v) => onUpdate(item.id, { allows_pre_voting: v })}
                className="scale-75 data-[state=unchecked]:bg-gray-300 data-[state=checked]:bg-indigo-600 border-gray-400"
              />
              <div>
                <Label className="text-xs text-indigo-800">Pre-voting</Label>
                <p className="text-[10px] text-indigo-600">
                  Ψηφοφορία πριν τη συνέλευση
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CreateAssemblyModal({
  isOpen,
  onClose,
  onSuccess,
  projectData
}: CreateAssemblyModalProps) {
  const { currentBuilding } = useBuilding();
  const createAssembly = useCreateAssembly();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    building: currentBuilding?.id || 0,
    scheduled_date: '',
    scheduled_time: '19:00',
    estimated_duration: 60,
    is_physical: true,
    is_online: false,
    location: '',
    meeting_link: '',
    pre_voting_enabled: true,
    pre_voting_start_date: '',
    pre_voting_end_date: '',
  });

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

  // Prefill from project data
  useEffect(() => {
    if (projectData && isOpen) {
      const costText = projectData.estimatedCost
        ? `\n\nΕκτιμώμενο κόστος: ${projectData.estimatedCost}€`
        : '';

      setFormData(prev => ({
        ...prev,
        title: `Γενική Συνέλευση - Έργο: ${projectData.title}`,
        description: `Συνέλευση για την έγκριση του έργου "${projectData.title}"\n\n${projectData.description || ''}${costText}`.trim(),
        building: projectData.buildingId || currentBuilding?.id || 0,
        scheduled_date: projectData.proposedDate || '',
        scheduled_time: projectData.proposedTime || '19:00',
      }));

      // Add project voting item
      const projectVotingItem: AgendaItemForm = {
        id: 'project-vote',
        order: 2,
        title: `Έγκριση έργου: ${projectData.title}`,
        description: `Ψηφοφορία για την έγκριση του έργου "${projectData.title}"${costText}`,
        item_type: 'voting',
        estimated_duration: 15,
        voting_type: 'simple_majority',
        allows_pre_voting: true,
      };

      setAgendaItems(prev => {
        // Check if already has project voting item
        const hasProjectItem = prev.some(item => item.id === 'project-vote');
        if (hasProjectItem) {
          return prev.map(item =>
            item.id === 'project-vote' ? projectVotingItem : item
          );
        }
        return [...prev.slice(0, 1), projectVotingItem, ...prev.slice(1)].map((item, idx) => ({
          ...item,
          order: idx + 1
        }));
      });
    }
  }, [projectData, isOpen, currentBuilding?.id]);

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

    const normalizeDate = (value?: string) => {
      const trimmed = value?.trim();
      if (!trimmed) return '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
      const match = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
      if (match) {
        const [, day, month, year] = match;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      return trimmed;
    };

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
      scheduled_date: normalizeDate(formData.scheduled_date),
      scheduled_time: formData.scheduled_time,
      estimated_duration: formData.estimated_duration,
      is_physical: formData.is_physical,
      is_online: formData.is_online,
      location: formData.location,
      meeting_link: formData.meeting_link,
      pre_voting_enabled: formData.pre_voting_enabled,
      pre_voting_start_date: normalizeDate(preVotingStartDate),
      pre_voting_end_date: normalizeDate(preVotingEndDate),
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
      onSuccess?.(assembly.id);
      onClose();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const totalDuration = agendaItems.reduce((sum, item) => sum + item.estimated_duration, 0);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col mx-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Δημιουργία Συνέλευσης</h2>
                  <p className="text-sm text-white/80">
                    {projectData ? `Για έγκριση: ${projectData.title}` : 'Νέα γενική συνέλευση'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Basic Info */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>Τίτλος Συνέλευσης</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="π.χ. Τακτική Γενική Συνέλευση 2024"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Ημερομηνία
                  </Label>
                  <Input
                    type="date"
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Ώρα
                  </Label>
                  <Input
                    type="time"
                    value={formData.scheduled_time}
                    onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                    className="mt-1"
                    required
                  />
                </div>
              </div>

              {/* Location */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Switch
                    checked={formData.is_physical}
                    onCheckedChange={(v) => setFormData({ ...formData, is_physical: v })}
                    className="data-[state=unchecked]:bg-gray-300 data-[state=checked]:bg-primary border-gray-400"
                  />
                  <div className="flex-1">
                    <Label className="flex items-center gap-1 text-sm">
                      <MapPin className="w-3 h-3" />
                      Φυσική παρουσία
                    </Label>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Switch
                    checked={formData.is_online}
                    onCheckedChange={(v) => setFormData({ ...formData, is_online: v })}
                    className="data-[state=unchecked]:bg-gray-300 data-[state=checked]:bg-primary border-gray-400"
                  />
                  <div className="flex-1">
                    <Label className="flex items-center gap-1 text-sm">
                      <Video className="w-3 h-3" />
                      Διαδικτυακά
                    </Label>
                  </div>
                </div>

                {formData.is_physical && (
                  <div>
                    <Label>Τοποθεσία</Label>
                    <Input
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="π.χ. Pilotis"
                      className="mt-1"
                    />
                  </div>
                )}

                {formData.is_online && (
                  <div>
                    <Label>Σύνδεσμος τηλεδιάσκεψης</Label>
                    <Input
                      type="url"
                      value={formData.meeting_link}
                      onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                      placeholder="https://zoom.us/j/..."
                      className="mt-1"
                    />
                  </div>
                )}
              </div>

              {/* Pre-voting */}
              <div className="p-3 bg-indigo-50 rounded-lg border border-gray-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Vote className="w-4 h-4 text-indigo-600" />
                    <div>
                      <Label className="text-sm text-indigo-900">Ηλεκτρονική Ψηφοφορία (Pre-voting)</Label>
                      <p className="text-xs text-indigo-600">Ψήφος πριν τη συνέλευση</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.pre_voting_enabled}
                    onCheckedChange={(v) => setFormData({ ...formData, pre_voting_enabled: v })}
                    className="data-[state=unchecked]:bg-gray-300 data-[state=checked]:bg-indigo-600 border-gray-400"
                  />
                </div>
                {formData.pre_voting_enabled && (
                  <div className="grid md:grid-cols-2 gap-3 mt-3">
                    <div>
                      <Label className="text-xs">Έναρξη pre-voting</Label>
                      <Input
                        type="date"
                        value={formData.pre_voting_start_date}
                        onChange={(e) => setFormData({ ...formData, pre_voting_start_date: e.target.value })}
                        className="mt-1"
                        placeholder="YYYY-MM-DD"
                      />
                      <p className="text-[11px] text-gray-500 mt-1">Μορφή: YYYY-MM-DD</p>
                    </div>
                    <div>
                      <Label className="text-xs">Λήξη pre-voting</Label>
                      <Input
                        type="date"
                        value={formData.pre_voting_end_date}
                        onChange={(e) => setFormData({ ...formData, pre_voting_end_date: e.target.value })}
                        className="mt-1"
                        placeholder="YYYY-MM-DD"
                      />
                      <p className="text-[11px] text-gray-500 mt-1">Μορφή: YYYY-MM-DD</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Agenda */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      Ημερήσια Διάταξη
                    </Label>
                    <p className="text-xs text-gray-500">
                      Συνολική διάρκεια: ~{totalDuration} λεπτά
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAgendaItem}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Θέμα
                  </Button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {agendaItems.map((item) => (
                    <AgendaItemRow
                      key={item.id}
                      item={item}
                      onUpdate={updateAgendaItem}
                      onRemove={removeAgendaItem}
                      canRemove={agendaItems.length > 1}
                    />
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <Label>Περιγραφή (προαιρετικό)</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Περιγράψτε τον σκοπό της συνέλευσης..."
                  className="mt-1"
                  rows={2}
                />
              </div>
            </form>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
              <Button type="button" variant="outline" onClick={onClose}>
                Ακύρωση
              </Button>
              <Button
                type="submit"
                onClick={handleSubmit}
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
                    Δημιουργία
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

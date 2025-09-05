'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, ArrowLeft, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useCreateTodo } from '@/hooks/useTodoMutations';
import { useTodoCategories } from '@/hooks/useTodos';
import { createTodoCategory } from '@/lib/todos';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { createScheduledMaintenance } from '@/lib/api';
import { BackButton } from '@/components/ui/BackButton';

type Priority = 'low' | 'medium' | 'high' | 'urgent';

type ServiceOption = {
  value: string;
  label: string;
  templateTitle: string;
  templateDescription: string;
  defaultPriority?: Priority;
};

const SERVICES: ServiceOption[] = [
  {
    value: 'elevator_maintenance',
    label: 'Συντήρηση ανελκυστήρα',
    templateTitle: 'Προγραμματισμένη συντήρηση ανελκυστήρα',
    templateDescription:
      'Τακτικός έλεγχος ασφαλείας, λίπανση εξαρτημάτων, δοκιμή συστημάτων ασφαλείας και καθαρισμός φρεατίου.',
    defaultPriority: 'medium',
  },
  {
    value: 'boiler_check',
    label: 'Έλεγχος καυστήρα/λεβητοστασίου',
    templateTitle: 'Ετήσιος έλεγχος καυστήρα και λεβητοστασίου',
    templateDescription:
      'Ρύθμιση καύσης, καθαρισμός, έλεγχος διαρροών, πιστοποίηση ασφαλούς λειτουργίας σύμφωνα με τον κανονισμό.',
    defaultPriority: 'high',
  },
  {
    value: 'water_tank_cleaning',
    label: 'Καθαρισμός δεξαμενής νερού',
    templateTitle: 'Καθαρισμός και απολύμανση δεξαμενής ύδρευσης',
    templateDescription:
      'Άδειασμα δεξαμενής, μηχανικός καθαρισμός, απολύμανση με εγκεκριμένα μέσα, επαναπλήρωση και έλεγχος ποιότητας.',
    defaultPriority: 'high',
  },
  {
    value: 'fire_safety_check',
    label: 'Έλεγχος πυρασφάλειας',
    templateTitle: 'Περιοδικός έλεγχος πυροσβεστήρων και πυρασφάλειας',
    templateDescription:
      'Έλεγχος/αναγόμωση πυροσβεστήρων, λειτουργικότητα πυρανίχνευσης, έξοδοι κινδύνου, σήμανση και φωτισμός ασφαλείας.',
    defaultPriority: 'medium',
  },
  {
    value: 'common_areas_cleaning',
    label: 'Καθαρισμός κοινόχρηστων',
    templateTitle: 'Περιοδικός καθαρισμός κοινόχρηστων χώρων',
    templateDescription:
      'Σκούπισμα/σφουγγάρισμα κλιμακοστασίων, καθαρισμός εισόδου/ανελκυστήρα, απολύμανση χειρολαβών/κουμπιών.',
    defaultPriority: 'low',
  },
  {
    value: 'roof_inspection',
    label: 'Έλεγχος ταράτσας/στεγάνωσης',
    templateTitle: 'Επιθεώρηση στεγάνωσης ταράτσας',
    templateDescription:
      'Οπτικός έλεγχος ρωγμών, καθαρισμός υδρορροών, εντοπισμός σημείων υγρασίας και προτάσεις αποκατάστασης.',
    defaultPriority: 'medium',
  },
];

export default function NewScheduledMaintenancePage() {
  const { currentBuilding, selectedBuilding } = useBuilding();
  const buildingToUse = selectedBuilding || currentBuilding;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contractor, setContractor] = useState('');
  const [startDate, setStartDate] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [serviceType, setServiceType] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [customServices, setCustomServices] = useState<ServiceOption[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('custom_scheduled_services');
      return raw ? (JSON.parse(raw) as ServiceOption[]) : [];
    } catch {
      return [];
    }
  });
  const allServices = [...SERVICES, ...customServices];
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newServiceLabel, setNewServiceLabel] = useState('');
  const [newServiceTitle, setNewServiceTitle] = useState('');
  const [newServiceDescription, setNewServiceDescription] = useState('');
  const [newServicePriority, setNewServicePriority] = useState<Priority>('medium');
  const createTodo = useCreateTodo();
  const { data: categories } = useTodoCategories(buildingToUse?.id);

  // Recurrence state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceDialogOpen, setRecurrenceDialogOpen] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<'weekly' | 'monthly' | 'yearly' | 'oncall' | ''>('');

  function applyTemplateFromSelection() {
    if (!serviceType) return;
    const selected = allServices.find((s) => s.value === serviceType);
    if (!selected) return;
    setTitle(selected.templateTitle);
    setDescription(selected.templateDescription);
    if (selected.defaultPriority) setPriority(selected.defaultPriority);
  }

  function handleServiceChange(value: string) {
    setServiceType(value);
    const selected = allServices.find((s) => s.value === value);
    if (!selected) return;
    if (!title.trim()) setTitle(selected.templateTitle);
    if (!description.trim()) setDescription(selected.templateDescription);
    if (selected.defaultPriority && priority === 'medium') {
      setPriority(selected.defaultPriority);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!title.trim()) {
      setError('Ο τίτλος είναι υποχρεωτικός.');
      return;
    }
    if (!buildingToUse?.id) {
      setError('Δεν έχει επιλεγεί κτίριο.');
      return;
    }
    setSubmitting(true);
    try {
      // Create scheduled maintenance in backend
      const scheduledPayload = {
        title: title.trim(),
        description: description.trim(),
        building: buildingToUse.id,
        contractor: undefined as number | undefined,
        scheduled_date: (startDate ? new Date(startDate) : new Date()).toISOString().slice(0, 10),
        estimated_duration: 2,
        priority,
        status: 'scheduled' as const,
        estimated_cost: estimatedCost ? Number(estimatedCost) : undefined,
        location: undefined as string | undefined,
        notes: undefined as string | undefined,
      };
      console.log('[ScheduledMaintenance] Creating item with payload:', scheduledPayload);
      await createScheduledMaintenance(scheduledPayload);

      // Create linked TODO so it appears in the sidebar and updates the bell
      try {
        if (buildingToUse?.id) {
          const maintenanceCategory = (categories || []).find((c) => /συντη|maint/i.test(c.name));
          let categoryId = maintenanceCategory?.id;
          if (!categoryId) {
            const created = await createTodoCategory({
              name: 'Συντήρηση',
              icon: 'wrench',
              color: 'orange',
              building: buildingToUse.id,
              description: 'Εργασίες συντήρησης',
              is_active: true,
            });
            categoryId = created.id;
          }

          const dueDateIso = startDate ? new Date(startDate).toISOString() : new Date().toISOString();
          const tags = ['maintenance'];
          if (serviceType) tags.push(serviceType);
          if (isRecurring) {
            tags.push('recurring');
            if (recurrenceFrequency) tags.push(`freq:${recurrenceFrequency}`);
          }

          await createTodo.mutateAsync({
            title: title.trim(),
            description: description.trim(),
            building: buildingToUse.id,
            category: categoryId,
            priority,
            due_date: dueDateIso,
            tags,
          });
        }
      } catch (todoErr) {
        console.error('Failed to create linked TODO:', todoErr);
      }
      window.location.href = '/maintenance/scheduled';
    } catch (err) {
      setError('Κάτι πήγε στραβά. Δοκιμάστε ξανά.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Νέο Προγραμματισμένο Έργο</h1>
          <p className="text-muted-foreground">Καταχώριση νέας εργασίας συντήρησης</p>
        </div>
        <BackButton href="/maintenance/scheduled" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Στοιχεία Έργου</CardTitle>
          <CardDescription>Συμπληρώστε τα βασικά στοιχεία</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Τύπος έργου</Label>
                <Select value={serviceType} onValueChange={handleServiceChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Επιλέξτε υπηρεσία" />
                  </SelectTrigger>
                  <SelectContent>
                    {allServices.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Η επιλογή συμπληρώνει αυτόματα τίτλο/περιγραφή. Μπορείτε να τα αλλάξετε.</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button type="button" variant="outline" size="sm" onClick={applyTemplateFromSelection} disabled={!serviceType}>Εφαρμογή προτύπου</Button>

                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="secondary" size="sm" className="flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Νέα κατηγορία
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Προσθήκη νέας κατηγορίας έργου</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="newServiceLabel">Όνομα κατηγορίας</Label>
                          <Input id="newServiceLabel" value={newServiceLabel} onChange={(e) => setNewServiceLabel(e.target.value)} placeholder="π.χ. Ηλεκτρολογικός έλεγχος" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="newServiceTitle">Προτεινόμενος τίτλος</Label>
                          <Input id="newServiceTitle" value={newServiceTitle} onChange={(e) => setNewServiceTitle(e.target.value)} placeholder="π.χ. Ετήσιος ηλεκτρολογικός έλεγχος" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="newServiceDescription">Προτεινόμενη περιγραφή</Label>
                          <Textarea id="newServiceDescription" value={newServiceDescription} onChange={(e) => setNewServiceDescription(e.target.value)} placeholder="Σύντομη περιγραφή εργασιών..." rows={4} />
                        </div>
                        <div className="space-y-2">
                          <Label>Προτεραιότητα</Label>
                          <Select value={newServicePriority} onValueChange={(v) => setNewServicePriority(v as Priority)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Επιλέξτε" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Χαμηλή</SelectItem>
                              <SelectItem value="medium">Μεσαία</SelectItem>
                              <SelectItem value="high">Υψηλή</SelectItem>
                              <SelectItem value="urgent">Επείγον</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Άκυρο</Button>
                        <Button
                          type="button"
                          onClick={() => {
                            const label = newServiceLabel.trim();
                            const t = newServiceTitle.trim();
                            const d = newServiceDescription.trim();
                            if (!label || !t || !d) return;
                            const value = `custom_${label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}_${Date.now()}`;
                            const newService: ServiceOption = {
                              value,
                              label,
                              templateTitle: t,
                              templateDescription: d,
                              defaultPriority: newServicePriority,
                            };
                            const updated = [...customServices, newService];
                            setCustomServices(updated);
                            try {
                              localStorage.setItem('custom_scheduled_services', JSON.stringify(updated));
                            } catch {}
                            setIsDialogOpen(false);
                            setNewServiceLabel('');
                            setNewServiceTitle('');
                            setNewServiceDescription('');
                            setNewServicePriority('medium');
                            setServiceType(value);
                            setTitle(t);
                            setDescription(d);
                            setPriority(newServicePriority);
                          }}
                        >
                          Αποθήκευση
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Τίτλος</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="π.χ. Συντήρηση ανελκυστήρα" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contractor">Συνεργείο (προαιρετικό)</Label>
                <Input id="contractor" value={contractor} onChange={(e) => setContractor(e.target.value)} placeholder="π.χ. LiftCo" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Ημ/νία έναρξης</Label>
                <div className="flex items-center gap-2">
                  <Input id="startDate" type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Περιοδικότητα</Label>
                <div className="flex items-center gap-2 p-3 border rounded-lg">
                  <Checkbox
                    id="isRecurring"
                    checked={isRecurring}
                    onCheckedChange={(checked) => {
                      const value = Boolean(checked);
                      setIsRecurring(value);
                      if (value) setRecurrenceDialogOpen(true);
                    }}
                  />
                  <Label htmlFor="isRecurring" className="text-sm">Επαναλαμβανόμενο έργο</Label>
                  {isRecurring && (
                    <span className="text-xs text-muted-foreground">
                      Συχνότητα: {recurrenceFrequency === 'weekly' ? 'Εβδομαδιαίως' : recurrenceFrequency === 'monthly' ? 'Μηνιαίως' : recurrenceFrequency === 'yearly' ? 'Ετησίως' : recurrenceFrequency === 'oncall' ? 'On-call' : '—'}
                    </span>
                  )}
                </div>
                <Dialog open={recurrenceDialogOpen} onOpenChange={setRecurrenceDialogOpen}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Επιλογή περιοδικότητας</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-3">
                      <Button
                        type="button"
                        variant={recurrenceFrequency === 'weekly' ? 'default' : 'outline'}
                        onClick={() => setRecurrenceFrequency('weekly')}
                        className="justify-start"
                      >
                        Εβδομαδιαίως
                      </Button>
                      <Button
                        type="button"
                        variant={recurrenceFrequency === 'monthly' ? 'default' : 'outline'}
                        onClick={() => setRecurrenceFrequency('monthly')}
                        className="justify-start"
                      >
                        Μηνιαίως
                      </Button>
                      <Button
                        type="button"
                        variant={recurrenceFrequency === 'yearly' ? 'default' : 'outline'}
                        onClick={() => setRecurrenceFrequency('yearly')}
                        className="justify-start"
                      >
                        Ετησίως
                      </Button>
                      <Button
                        type="button"
                        variant={recurrenceFrequency === 'oncall' ? 'default' : 'outline'}
                        onClick={() => setRecurrenceFrequency('oncall')}
                        className="justify-start"
                      >
                        On-call (κατ' απαίτηση)
                      </Button>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2">
                      <Button type="button" variant="outline" onClick={() => setRecurrenceDialogOpen(false)}>Άκυρο</Button>
                      <Button
                        type="button"
                        onClick={() => setRecurrenceDialogOpen(false)}
                        disabled={!recurrenceFrequency}
                      >
                        Επιβεβαίωση
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimatedCost">Εκτιμώμενο κόστος (€)</Label>
                <Input id="estimatedCost" type="number" inputMode="decimal" step="0.01" min="0" value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} placeholder="π.χ. 150.00" />
              </div>
              <div className="space-y-2">
                <Label>Προτεραιότητα</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Επιλέξτε" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Χαμηλή</SelectItem>
                    <SelectItem value="medium">Μεσαία</SelectItem>
                    <SelectItem value="high">Υψηλή</SelectItem>
                    <SelectItem value="urgent">Επείγον</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Περιγραφή</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Σύντομη περιγραφή εργασιών, πρόσβαση, υλικά, κλπ." rows={5} />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex items-center gap-2">
              <Button type="submit" disabled={submitting}>{submitting ? 'Αποθήκευση…' : 'Αποθήκευση'}</Button>
              <Button asChild variant="outline" type="button">
                <Link href="/maintenance/scheduled">Άκυρο</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}



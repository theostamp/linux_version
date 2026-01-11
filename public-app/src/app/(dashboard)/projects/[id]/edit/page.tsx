'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import ZoomSettingsModal from '@/components/projects/ZoomSettingsModal';
import { BackButton } from '@/components/ui/BackButton';
import { Save, Settings as SettingsIcon, Loader2, AlertCircle } from 'lucide-react';
import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';
import { useActiveBuildingId } from '@/hooks/useActiveBuildingId';

type Priority = 'low' | 'medium' | 'high' | 'urgent';

export default function EditProjectPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const projectId = params.id as string;
  const buildingId = useActiveBuildingId();

  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const response = await api.get(`/projects/${projectId}/`);
      return response.data;
    },
    enabled: !!projectId,
  });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    building: buildingId,
    estimated_cost: '',
    priority: 'medium' as Priority,
    deadline: '',
    tender_deadline: '',
    general_assembly_date: '',
    assembly_time: '',
    assembly_is_online: false,
    assembly_is_physical: false,
    assembly_location: '',
    assembly_zoom_link: '',
    assembly_zoom_settings: {
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
    payment_terms: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);

  // Load project data into form
  useEffect(() => {
    if (project) {
      const deadline = project.deadline ? project.deadline.split('T')[0] : '';
      const tenderDeadline = project.tender_deadline ? project.tender_deadline.split('T')[0] : '';
      const generalAssemblyDate = project.general_assembly_date ? project.general_assembly_date.split('T')[0] : '';
      const assemblyTime = project.assembly_time ? project.assembly_time.substring(0, 5) : '';

      setFormData({
        title: project.title || '',
        description: project.description || '',
        building: project.building || buildingId,
        estimated_cost: project.estimated_cost ? project.estimated_cost.toString() : '',
        priority: project.priority || 'medium',
        deadline,
        tender_deadline: tenderDeadline,
        general_assembly_date: generalAssemblyDate,
        assembly_time: assemblyTime,
        assembly_is_online: project.assembly_is_online || false,
        assembly_is_physical: project.assembly_is_physical || false,
        assembly_location: project.assembly_location || '',
        assembly_zoom_link: project.assembly_zoom_link || '',
        assembly_zoom_settings: {
          meetingUrl: project.assembly_zoom_link || '',
          meetingId: project.assembly_zoom_meeting_id || '',
          password: project.assembly_zoom_password || '',
          waitingRoom: project.assembly_zoom_waiting_room ?? true,
          participantVideo: project.assembly_zoom_participant_video ?? false,
          hostVideo: project.assembly_zoom_host_video ?? true,
          muteOnEntry: project.assembly_zoom_mute_on_entry ?? true,
          autoRecord: project.assembly_zoom_auto_record ?? false,
          notes: project.assembly_zoom_notes || '',
        },
        payment_terms: project.payment_terms || '',
      });
    }
  }, [project, buildingId]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleZoomSettingsSave = (settings: {
    meetingUrl: string;
    meetingId: string;
    password: string;
    waitingRoom: boolean;
    participantVideo: boolean;
    hostVideo: boolean;
    muteOnEntry: boolean;
    autoRecord: boolean;
    notes: string;
  }) => {
    setFormData((prev) => ({
      ...prev,
      assembly_zoom_link: settings.meetingUrl,
      assembly_zoom_settings: settings,
    }));
    toast({
      title: 'Ρυθμίσεις Zoom',
      description: 'Οι ρυθμίσεις Zoom αποθηκεύτηκαν επιτυχώς',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast({
        title: 'Σφάλμα',
        description: 'Ο τίτλος είναι υποχρεωτικός',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.building) {
      toast({
        title: 'Σφάλμα',
        description: 'Πρέπει να επιλέξετε κτίριο',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description || '',
        building: formData.building,
        estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
        priority: formData.priority,
        deadline: formData.deadline || null,
        tender_deadline: formData.tender_deadline || null,
        general_assembly_date: formData.general_assembly_date || null,
        assembly_time: formData.assembly_time || null,
        assembly_is_online: formData.assembly_is_online,
        assembly_is_physical: formData.assembly_is_physical,
        assembly_location: formData.assembly_location || null,
        assembly_zoom_link: formData.assembly_zoom_link || null,
        assembly_zoom_meeting_id: formData.assembly_zoom_settings.meetingId || null,
        assembly_zoom_password: formData.assembly_zoom_settings.password || null,
        assembly_zoom_waiting_room: formData.assembly_zoom_settings.waitingRoom,
        assembly_zoom_participant_video: formData.assembly_zoom_settings.participantVideo,
        assembly_zoom_host_video: formData.assembly_zoom_settings.hostVideo,
        assembly_zoom_mute_on_entry: formData.assembly_zoom_settings.muteOnEntry,
        assembly_zoom_auto_record: formData.assembly_zoom_settings.autoRecord,
        assembly_zoom_notes: formData.assembly_zoom_settings.notes || null,
        payment_terms: formData.payment_terms || null,
      };

      await api.patch(`/projects/${projectId}/`, payload);

      toast({
        title: 'Επιτυχία',
        description: 'Το έργο ενημερώθηκε επιτυχώς',
      });

      router.push(`/projects/${projectId}`);
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : undefined;
      toast({
        title: 'Σφάλμα',
        description: errorMessage || 'Αποτυχία ενημέρωσης έργου',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AuthGate>
        <SubscriptionGate>
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </SubscriptionGate>
      </AuthGate>
    );
  }

  if (error || !project) {
    return (
      <AuthGate>
        <SubscriptionGate>
          <div className="space-y-6">
            <BackButton href="/projects" label="Επιστροφή" size="sm" />
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4 text-red-600">
                  <AlertCircle className="h-6 w-6" />
                  <div>
                    <h2 className="text-xl font-semibold">Σφάλμα</h2>
                    <p className="text-sm">Δεν βρέθηκε το έργο ή προέκυψε σφάλμα κατά τη φόρτωση.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </SubscriptionGate>
      </AuthGate>
    );
  }

  return (
    <AuthGate>
      <SubscriptionGate>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <BackButton href={`/projects/${projectId}`} label="Επιστροφή" size="sm" />
            <div>
              <h1 className="page-title">Επεξεργασία Έργου</h1>
              <p className="text-muted-foreground">Ενημέρωση στοιχείων έργου</p>
            </div>
          </div>

          <Card>
            <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Στοιχεία έργου</CardTitle>
                <p className="text-sm text-gray-500">Ορίστε βασικά στοιχεία, προθεσμίες και προαιρετικά Zoom</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={() => setIsZoomModalOpen(true)}
                >
                  <SettingsIcon className="w-4 h-4" />
                  Ρυθμίσεις Zoom
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="title">Τίτλος *</Label>
                    <Input
                      id="title"
                      placeholder="π.χ. Αντικατάσταση λέβητα"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Προτεραιότητα</Label>
                    <select
                      id="priority"
                      className="w-full border rounded-lg px-3 py-2"
                      value={formData.priority}
                      onChange={(e) => handleInputChange('priority', e.target.value as Priority)}
                    >
                      <option value="low">Χαμηλή</option>
                      <option value="medium">Μεσαία</option>
                      <option value="high">Υψηλή</option>
                      <option value="urgent">Επείγον</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estimated_cost">Εκτιμώμενο Κόστος (€)</Label>
                    <Input
                      id="estimated_cost"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="π.χ. 5000"
                      value={formData.estimated_cost}
                      onChange={(e) => handleInputChange('estimated_cost', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deadline">Προθεσμία</Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => handleInputChange('deadline', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Περιγραφή</Label>
                  <Textarea
                    id="description"
                    rows={4}
                    placeholder="Αναλυτική περιγραφή του έργου..."
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                  />
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="tender_deadline">Προθεσμία Προσφορών</Label>
                    <Input
                      id="tender_deadline"
                      type="date"
                      value={formData.tender_deadline}
                      onChange={(e) => handleInputChange('tender_deadline', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="general_assembly_date">Ημερομηνία Γ.Σ.</Label>
                    <Input
                      id="general_assembly_date"
                      type="date"
                      value={formData.general_assembly_date}
                      onChange={(e) => handleInputChange('general_assembly_date', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="assembly_time">Ώρα Γ.Σ.</Label>
                    <Input
                      id="assembly_time"
                      type="time"
                      value={formData.assembly_time}
                      onChange={(e) => handleInputChange('assembly_time', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assembly_location">Τοποθεσία Γ.Σ.</Label>
                    <Input
                      id="assembly_location"
                      placeholder="π.χ. Γραφείο διαχείρισης"
                      value={formData.assembly_location}
                      onChange={(e) => handleInputChange('assembly_location', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="flex items-center space-x-2">
                    <input
                      id="assembly_is_online"
                      type="checkbox"
                      className="h-4 w-4"
                      checked={formData.assembly_is_online}
                      onChange={(e) => handleInputChange('assembly_is_online', e.target.checked)}
                    />
                    <Label htmlFor="assembly_is_online" className="cursor-pointer">
                      Η συνέλευση θα γίνει online (Zoom)
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      id="assembly_is_physical"
                      type="checkbox"
                      className="h-4 w-4"
                      checked={formData.assembly_is_physical}
                      onChange={(e) => handleInputChange('assembly_is_physical', e.target.checked)}
                    />
                    <Label htmlFor="assembly_is_physical" className="cursor-pointer">
                      Η συνέλευση θα γίνει δια ζώσης
                    </Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_terms">Όροι Πληρωμής</Label>
                  <Textarea
                    id="payment_terms"
                    rows={3}
                    placeholder="Περιγράψτε τους όρους πληρωμής..."
                    value={formData.payment_terms}
                    onChange={(e) => handleInputChange('payment_terms', e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => router.push(`/projects/${projectId}`)}>
                    Ακύρωση
                  </Button>
                  <Button type="submit" className="flex items-center gap-2" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-b-transparent rounded-full animate-spin" />
                        Αποθήκευση...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Αποθήκευση Αλλαγών
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <ZoomSettingsModal
            isOpen={isZoomModalOpen}
            onClose={() => setIsZoomModalOpen(false)}
            onSave={handleZoomSettingsSave}
            initialSettings={formData.assembly_zoom_settings}
          />
        </div>
      </SubscriptionGate>
    </AuthGate>
  );
}

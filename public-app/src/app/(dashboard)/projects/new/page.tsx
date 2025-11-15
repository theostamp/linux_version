'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getActiveBuildingId, createVote, type CreateVotePayload } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import ZoomSettingsModal from '@/components/projects/ZoomSettingsModal';
import { BackButton } from '@/components/ui/BackButton';
import { Save, Plus, Settings as SettingsIcon } from 'lucide-react';

const SUGGESTED_PROJECTS = [
  { title: 'Στεγανοποίηση Ταράτσας', description: 'Πλήρης στεγανοποίηση ταράτσας με ασφαλτόπανο και τσιμεντοκονίαμα', priority: 'high' },
  { title: 'Επισκευή Όψεων Κτιρίου', description: 'Επισκευή ρωγμών, σοβάτισμα και βάψιμο εξωτερικών όψεων', priority: 'medium' },
  { title: 'Αντικατάσταση Λέβητα', description: 'Αντικατάσταση παλαιού λέβητα με νέο ενεργειακής κλάσης Α', priority: 'high' },
  { title: 'Συντήρηση Ανελκυστήρα', description: 'Ετήσια συντήρηση και πιστοποίηση ανελκυστήρα', priority: 'medium' },
  { title: 'Αντικατάσταση Κουφωμάτων', description: 'Αντικατάσταση παλαιών κουφωμάτων με ενεργειακά αλουμίνια', priority: 'medium' },
  { title: 'Μόνωση Σωληνώσεων', description: 'Θερμομόνωση σωληνώσεων θέρμανσης και ύδρευσης', priority: 'low' },
  { title: 'Αντικατάσταση Πλακιδίων Εισόδου', description: 'Αντικατάσταση φθαρμένων πλακιδίων στην είσοδο του κτιρίου', priority: 'low' },
  { title: 'Εγκατάσταση Συστήματος Ασφαλείας', description: 'Τοποθέτηση καμερών και συναγερμού στους κοινόχρηστους χώρους', priority: 'medium' },
  { title: 'Ανακαίνιση Κλιμακοστασίου', description: 'Βάψιμο, φωτισμός και αντικατάσταση κιγκλιδωμάτων', priority: 'low' },
  { title: 'Καθαρισμός Φρεατίων', description: 'Καθαρισμός και απόφραξη φρεατίων ομβρίων και αποχέτευσης', priority: 'high' },
];

type Priority = 'low' | 'medium' | 'high' | 'urgent';

export default function NewProjectPage() {
  const router = useRouter();
  const { toast } = useToast();
  const buildingId = getActiveBuildingId();

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
    should_create_vote: true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'new' | 'suggested'>('new');
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSelectSuggestedProject = (project: typeof SUGGESTED_PROJECTS[number]) => {
    setFormData((prev) => ({
      ...prev,
      title: project.title,
      description: project.description,
      priority: project.priority as Priority,
    }));
    setSelectedTab('new');
    toast({
      title: 'Έργο επιλέχθηκε',
      description: `Το έργο "${project.title}" προστέθηκε στη φόρμα`,
    });
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

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
        deadline: formData.deadline || null,
        tender_deadline: formData.tender_deadline || null,
        general_assembly_date: formData.general_assembly_date || null,
        payment_terms: formData.payment_terms || null,
        assembly_zoom_meeting_id: formData.assembly_zoom_settings.meetingId || null,
        assembly_zoom_password: formData.assembly_zoom_settings.password || null,
        assembly_zoom_waiting_room: formData.assembly_zoom_settings.waitingRoom,
        assembly_zoom_participant_video: formData.assembly_zoom_settings.participantVideo,
        assembly_zoom_host_video: formData.assembly_zoom_settings.hostVideo,
        assembly_zoom_mute_on_entry: formData.assembly_zoom_settings.muteOnEntry,
        assembly_zoom_auto_record: formData.assembly_zoom_settings.autoRecord,
        assembly_zoom_notes: formData.assembly_zoom_settings.notes || null,
      };

      const response = await api.post('/projects/projects/', payload);

      if (formData.should_create_vote) {
        const votePayload: CreateVotePayload = {
          title: `Έγκριση Έργου: ${formData.title}`,
          description: `Ψηφοφορία για την έγκριση του έργου "${formData.title}".\n\nΠεριγραφή: ${formData.description || 'Δεν έχει δοθεί περιγραφή'}\n\nΕκτιμώμενο κόστος: ${formData.estimated_cost ? `${formData.estimated_cost}€` : 'Δεν έχει καθοριστεί'}`,
          start_date: new Date().toISOString().split('T')[0],
          end_date: formData.general_assembly_date || undefined,
          choices: ['ΝΑΙ', 'ΟΧΙ', 'ΛΕΥΚΟ'],
          building: buildingId,
          is_active: true,
        };

        try {
          await createVote(votePayload);
          toast({
            title: 'Επιτυχία',
            description: 'Το έργο και η ψηφοφορία δημιουργήθηκαν επιτυχώς',
          });
        } catch (voteError) {
          console.error('Failed to create vote:', voteError);
          toast({
            title: 'Επιτυχία με προειδοποίηση',
            description: 'Το έργο δημιουργήθηκε, αλλά απέτυχε η δημιουργία της ψηφοφορίας',
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Επιτυχία',
          description: 'Το έργο δημιουργήθηκε επιτυχώς',
        });
      }

      const projectId = (response.data as { id: number }).id;
      router.push(`/projects/${projectId}`);
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : undefined;
      toast({
        title: 'Σφάλμα',
        description: errorMessage || 'Αποτυχία δημιουργίας έργου',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <BackButton href="/projects" label="Επιστροφή" size="sm" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Νέο Έργο</h1>
          <p className="text-muted-foreground">Δημιουργία νέου έργου ή συντήρησης</p>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as 'new' | 'suggested')}>
        <TabsList className="mb-6">
          <TabsTrigger value="new">Νέα Δημιουργία</TabsTrigger>
          <TabsTrigger value="suggested">Προτεινόμενα Έργα</TabsTrigger>
        </TabsList>

        <TabsContent value="new">
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

            <div className="flex items-center space-x-2">
              <input
                id="should_create_vote"
                type="checkbox"
                className="h-4 w-4"
                checked={formData.should_create_vote}
                onChange={(e) => handleInputChange('should_create_vote', e.target.checked)}
              />
              <Label htmlFor="should_create_vote" className="cursor-pointer">
                Δημιουργία ψηφοφορίας για έγκριση του έργου
              </Label>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => router.push('/projects')}>
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
                    Αποθήκευση Έργου
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="suggested">
          <div className="grid gap-4 md:grid-cols-2">
            {SUGGESTED_PROJECTS.map((project) => (
              <Card key={project.title} className="border border-blue-100">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{project.title}</CardTitle>
                    <Badge
                      variant="secondary"
                      className={
                        project.priority === 'high'
                          ? 'bg-red-100 text-red-700'
                          : project.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                      }
                    >
                      {project.priority === 'high'
                        ? 'Υψηλή'
                        : project.priority === 'medium'
                          ? 'Μεσαία'
                          : 'Χαμηλή'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{project.description}</p>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2"
                    onClick={() => handleSelectSuggestedProject(project)}
                  >
                    <Plus className="w-4 h-4" />
                    Συμπλήρωση Φόρμας με αυτό το έργο
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <ZoomSettingsModal
        isOpen={isZoomModalOpen}
        onClose={() => setIsZoomModalOpen(false)}
        onSave={handleZoomSettingsSave}
        initialSettings={formData.assembly_zoom_settings}
      />
    </div>
  );
}

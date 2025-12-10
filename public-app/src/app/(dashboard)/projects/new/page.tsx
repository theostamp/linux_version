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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import ZoomSettingsModal from '@/components/projects/ZoomSettingsModal';
import CreateAssemblyModal, { type ProjectDataForAssembly } from '@/components/assemblies/CreateAssemblyModal';
import { BackButton } from '@/components/ui/BackButton';
import { Save, Plus, Settings as SettingsIcon, Users, ExternalLink } from 'lucide-react';

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
  const [isAssemblyModalOpen, setIsAssemblyModalOpen] = useState(false);
  const [createGeneralAssembly, setCreateGeneralAssembly] = useState(false);
  const [linkedAssemblyId, setLinkedAssemblyId] = useState<string | null>(null);

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
    if (isSubmitting) return;

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
        deadline: null,
        tender_deadline: null,
        general_assembly_date: createGeneralAssembly ? formData.general_assembly_date || null : null,
        assembly_time: createGeneralAssembly ? formData.assembly_time || null : null,
        assembly_is_online: createGeneralAssembly ? formData.assembly_is_online : false,
        assembly_is_physical: createGeneralAssembly ? formData.assembly_is_physical : false,
        assembly_location: createGeneralAssembly ? formData.assembly_location || null : null,
        assembly_zoom_link: createGeneralAssembly ? formData.assembly_zoom_link || null : null,
        assembly_zoom_meeting_id: createGeneralAssembly ? formData.assembly_zoom_settings.meetingId || null : null,
        assembly_zoom_password: createGeneralAssembly ? formData.assembly_zoom_settings.password || null : null,
        assembly_zoom_waiting_room: createGeneralAssembly ? formData.assembly_zoom_settings.waitingRoom : false,
        assembly_zoom_participant_video: createGeneralAssembly ? formData.assembly_zoom_settings.participantVideo : false,
        assembly_zoom_host_video: createGeneralAssembly ? formData.assembly_zoom_settings.hostVideo : false,
        assembly_zoom_mute_on_entry: createGeneralAssembly ? formData.assembly_zoom_settings.muteOnEntry : false,
        assembly_zoom_auto_record: createGeneralAssembly ? formData.assembly_zoom_settings.autoRecord : false,
        assembly_zoom_notes: createGeneralAssembly ? formData.assembly_zoom_settings.notes || null : null,
        payment_terms: formData.payment_terms || null,
        // Link to Assembly system
        linked_assembly: linkedAssemblyId,
      };

      const response = await api.post('/projects/', payload);

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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <BackButton href="/projects" label="Επιστροφή" size="sm" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Νέο Έργο</h1>
          <p className="text-muted-foreground">Δημιουργία νέου έργου ή συντήρησης</p>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as 'new' | 'suggested')}>
        <TabsList className="mb-6 grid w-full grid-cols-2 lg:w-[420px] rounded-lg bg-muted p-1">
          <TabsTrigger
            value="new"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md"
          >
            Νέα Δημιουργία
          </TabsTrigger>
          <TabsTrigger
            value="suggested"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md"
          >
            Προτεινόμενα Έργα
          </TabsTrigger>
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

            <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-sm">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-lg font-bold text-indigo-900">Γενική Συνέλευση</Label>
                      <p className="text-sm text-muted-foreground">
                        Δημιουργία πλήρους συνέλευσης με ημερήσια διάταξη και ψηφοφορία
                      </p>
                    </div>
                  </div>
                  <Switch checked={createGeneralAssembly} onCheckedChange={setCreateGeneralAssembly} />
                </div>

                {createGeneralAssembly && (
                  <div className="space-y-4 pt-4 border-t border-indigo-200">
                    {linkedAssemblyId ? (
                      <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-green-200">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                            <Users className="w-4 h-4 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium text-green-800">Συνέλευση δημιουργήθηκε!</p>
                            <p className="text-sm text-gray-500">ID: {linkedAssemblyId}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/assemblies/${linkedAssemblyId}`, '_blank')}
                          >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            Προβολή
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsAssemblyModalOpen(true)}
                          >
                            Αλλαγή
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-20 border-2 border-dashed border-indigo-300 hover:border-indigo-500 hover:bg-indigo-100/50"
                        onClick={() => setIsAssemblyModalOpen(true)}
                      >
                        <div className="flex items-center gap-3">
                          <Plus className="w-5 h-5 text-indigo-600" />
                          <div className="text-left">
                            <p className="font-medium text-indigo-700">Ρύθμιση Συνέλευσης</p>
                            <p className="text-sm text-gray-500">Κλικ για δημιουργία ημερήσιας διάταξης & ψηφοφορίας</p>
                          </div>
                        </div>
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

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

            {/* Vote Creation Section with Toggle */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
              <div className="space-y-0.5">
                <Label htmlFor="should_create_vote" className="text-base font-semibold">
                  Δημιουργία Ψηφοφορίας
                </Label>
                <p className="text-sm text-muted-foreground">
                  Δημιουργία ψηφοφορίας για έγκριση του έργου
                </p>
              </div>
              <Switch
                id="should_create_vote"
                checked={formData.should_create_vote}
                onCheckedChange={(checked) => handleInputChange('should_create_vote', checked)}
              />
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

      <CreateAssemblyModal
        isOpen={isAssemblyModalOpen}
        onClose={() => setIsAssemblyModalOpen(false)}
        onSuccess={(assemblyId) => {
          setLinkedAssemblyId(assemblyId);
          toast({
            title: 'Συνέλευση δημιουργήθηκε',
            description: 'Η συνέλευση θα συνδεθεί με το έργο μετά την αποθήκευση',
          });
        }}
        projectData={{
          title: formData.title,
          description: formData.description,
          estimatedCost: formData.estimated_cost,
          buildingId: buildingId || undefined,
          proposedDate: formData.general_assembly_date,
          proposedTime: formData.assembly_time,
        }}
      />
    </div>
  );
}

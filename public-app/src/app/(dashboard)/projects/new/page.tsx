'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import ZoomSettingsModal from '@/components/projects/ZoomSettingsModal';
import CreateAssemblyModal, { type ProjectDataForAssembly } from '@/components/assemblies/CreateAssemblyModal';
import { BackButton } from '@/components/ui/BackButton';
import { Save, Plus, Settings as SettingsIcon, Users, ExternalLink, HelpCircle, ArrowRight, FileText, CheckCircle, Vote } from 'lucide-react';
import { useActiveBuildingId } from '@/hooks/useActiveBuildingId';

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
  const buildingId = useActiveBuildingId();

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
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

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

      const project = await api.post<{ id: number }>('/projects/', payload);

      if (formData.should_create_vote) {
        // Σημείωση: Η ψηφοφορία δημιουργείται αυτόματα από το backend (projects/signals.py).
        // Αν κάναμε εδώ δεύτερο POST /votes/ θα είχαμε duplicates (400).
        toast({
          title: 'Επιτυχία',
          description: 'Το έργο δημιουργήθηκε και η ψηφοφορία θα εμφανιστεί αυτόματα',
        });
      } else {
        toast({
          title: 'Επιτυχία',
          description: 'Το έργο δημιουργήθηκε επιτυχώς',
        });
      }

      router.push(`/projects/${project.id}`);
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
          <h1 className="page-title">Νέο Έργο</h1>
          <p className="text-muted-foreground">Δημιουργία νέου έργου ή συντήρησης</p>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as 'new' | 'suggested')}>
        <div className="flex items-center gap-3 mb-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-[420px] rounded-lg bg-gray-100 p-1 border border-gray-300">
            <TabsTrigger
              value="new"
              className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm data-[state=inactive]:text-gray-600 rounded-md font-medium"
            >
              Νέα Δημιουργία
            </TabsTrigger>
            <TabsTrigger
              value="suggested"
              className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm data-[state=inactive]:text-gray-600 rounded-md font-medium"
            >
              Προτεινόμενα Έργα
            </TabsTrigger>
          </TabsList>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setIsHelpModalOpen(true)}
            className="h-9 w-9 rounded-full text-gray-600 hover:text-blue-600 hover:bg-blue-50 border border-gray-300 hover:border-blue-300"
            title="Οδηγίες διαδικασίας έργων"
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
        </div>

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
                  <Switch
                    checked={createGeneralAssembly}
                    onCheckedChange={setCreateGeneralAssembly}
                    className="data-[state=unchecked]:bg-gray-300 data-[state=checked]:bg-indigo-600 border-gray-400"
                  />
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
                className="data-[state=unchecked]:bg-gray-300 data-[state=checked]:bg-primary border-gray-400"
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

      {/* Help Modal - Διαδικασία Έργων */}
      <Dialog open={isHelpModalOpen} onOpenChange={setIsHelpModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <HelpCircle className="w-6 h-6 text-blue-600" />
              Διαδικασία Διαχείρισης Έργων
            </DialogTitle>
            <DialogDescription>
              Ολοκληρωμένη επεξήγηση της ροής εργασιών από την προσφορά έως την έγκριση του έργου
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Εισαγωγή */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                Η διαδικασία διαχείρισης έργων στην εφαρμογή ακολουθεί μια οργανωμένη ροή που εξασφαλίζει διαφάνεια και συμμετοχή όλων των ενοίκων.
              </p>
            </div>

            {/* Βήμα 1: Προσφορά */}
            <div className="space-y-3">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-700 font-bold text-lg">1</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Προσφορά Έργου
                  </h3>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>Στο στάδιο αυτό:</p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li>Δημιουργείτε ένα <strong>νέο έργο</strong> με τίτλο, περιγραφή και εκτιμώμενο κόστος</li>
                      <li>Ορίζετε <strong>προτεραιότητα</strong> (Χαμηλή, Μεσαία, Υψηλή, Επείγον)</li>
                      <li>Προσθέτετε <strong>προθεσμίες</strong> και <strong>όρους πληρωμής</strong></li>
                      <li>Μπορείτε να επιλέξετε από <strong>προτεινόμενα έργα</strong> για γρήγορη δημιουργία</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <ArrowRight className="w-6 h-6 text-gray-400" />
            </div>

            {/* Βήμα 2: Έργο */}
            <div className="space-y-3">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                  <span className="text-indigo-700 font-bold text-lg">2</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-2">
                    <SettingsIcon className="w-5 h-5 text-indigo-600" />
                    Διαχείριση Έργου
                  </h3>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>Μετά τη δημιουργία:</p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li>Το έργο εμφανίζεται στη <strong>λίστα έργων</strong> με κατάσταση "Προσφορά"</li>
                      <li>Μπορείτε να <strong>επεξεργαστείτε</strong> τα στοιχεία του έργου</li>
                      <li>Να προσθέσετε <strong>προσφορές</strong> από εταιρείες</li>
                      <li>Να συγκρίνετε <strong>τιμές και προδιαγραφές</strong></li>
                      <li>Να επιλέξετε την <strong>καλύτερη προσφορά</strong></li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <ArrowRight className="w-6 h-6 text-gray-400" />
            </div>

            {/* Βήμα 3: Συνέλευση */}
            <div className="space-y-3">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <span className="text-purple-700 font-bold text-lg">3</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-purple-600" />
                    Γενική Συνέλευση
                  </h3>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>Για έγκριση του έργου:</p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li>Ενεργοποιείτε την επιλογή <strong>"Γενική Συνέλευση"</strong> κατά τη δημιουργία</li>
                      <li>Ορίζετε <strong>ημερήσια διάταξη</strong> με θέματα συζήτησης</li>
                      <li>Δημιουργείτε <strong>ψηφοφορίες</strong> για κάθε θέμα</li>
                      <li>Ρυθμίζετε <strong>Zoom settings</strong> για online συμμετοχή</li>
                      <li>Ενεργοποιείτε <strong>pre-voting</strong> για ηλεκτρονική ψηφοφορία πριν τη συνέλευση</li>
                    </ul>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mt-3">
                      <p className="text-xs text-purple-800">
                        <strong>💡 Συμβουλή:</strong> Η συνέλευση μπορεί να είναι <strong>φυσική</strong>, <strong>online</strong> ή <strong>υβριδική</strong> (και τα δύο).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <ArrowRight className="w-6 h-6 text-gray-400" />
            </div>

            {/* Βήμα 4: Έγκριση */}
            <div className="space-y-3">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-700 font-bold text-lg">4</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Έγκριση Έργου
                  </h3>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>Στο στάδιο αυτό:</p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li>Οι ένοικοι <strong>ψηφίζουν</strong> για την έγκριση του έργου</li>
                      <li>Η ψηφοφορία μπορεί να γίνει <strong>πριν</strong> (pre-voting) ή <strong>κατά τη διάρκεια</strong> της συνέλευσης</li>
                      <li>Ελέγχεται η <strong>απαρτία</strong> (quorum) - απαιτείται συνήθως 50%+ των χιλιοστών</li>
                      <li>Αν εγκριθεί, το έργο μεταβαίνει σε κατάσταση <strong>"Εγκεκριμένο"</strong></li>
                      <li>Μπορείτε να ξεκινήσετε την <strong>εκτέλεση</strong> του έργου</li>
                    </ul>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
                      <p className="text-xs text-green-800">
                        <strong>✅ Αποτέλεσμα:</strong> Μετά την έγκριση, το έργο είναι έτοιμο για εκτέλεση και παρακολούθηση προόδου.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Συνολική ροή */}
            <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-green-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Vote className="w-5 h-5 text-indigo-600" />
                Συνολική Ροή
              </h4>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="text-center p-2 bg-white rounded border border-blue-200">
                  <div className="font-semibold text-blue-700">1. Προσφορά</div>
                  <div className="text-gray-600 mt-1">Δημιουργία έργου</div>
                </div>
                <div className="text-center p-2 bg-white rounded border border-indigo-200">
                  <div className="font-semibold text-indigo-700">2. Έργο</div>
                  <div className="text-gray-600 mt-1">Επιλογή προσφοράς</div>
                </div>
                <div className="text-center p-2 bg-white rounded border border-purple-200">
                  <div className="font-semibold text-purple-700">3. Συνέλευση</div>
                  <div className="text-gray-600 mt-1">Ψηφοφορία</div>
                </div>
                <div className="text-center p-2 bg-white rounded border border-green-200">
                  <div className="font-semibold text-green-700">4. Έγκριση</div>
                  <div className="text-gray-600 mt-1">Εκτέλεση</div>
                </div>
              </div>
            </div>

            {/* Συμβουλές */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                Συμβουλές
              </h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-amber-800">
                <li>Χρησιμοποιήστε τα <strong>προτεινόμενα έργα</strong> για γρήγορη έναρξη</li>
                <li>Συμπεριλάβετε <strong>λεπτομερή περιγραφή</strong> και <strong>εκτιμώμενο κόστος</strong></li>
                <li>Ενεργοποιήστε <strong>pre-voting</strong> για μεγαλύτερη συμμετοχή</li>
                <li>Ρυθμίστε <strong>Zoom</strong> εκ των προτέρων για online συμμετοχή</li>
                <li>Καταγράψτε τα <strong>πρακτικά</strong> μετά τη συνέλευση</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsHelpModalOpen(false)}>
              Κατάλαβα
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

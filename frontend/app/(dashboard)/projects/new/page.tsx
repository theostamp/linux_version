'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getActiveBuildingId, createVote, CreateVotePayload, createAnnouncement, CreateAnnouncementPayload } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Save, Lightbulb, Plus, Vote, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ZoomSettingsModal from '@/components/projects/ZoomSettingsModal';
import { BackButton } from '@/components/ui/BackButton';

// Προτεινόμενα έργα πολυκατοικίας
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
  { title: 'Καθαρισμός Φρεατίων', description: 'Καθαρισμός και απόφραξη φρεατίων ομβρίων και αποχέτευσης', priority: 'high' }
];

export default function NewProjectPage() {
  const router = useRouter();
  const { toast } = useToast();
  const buildingId = getActiveBuildingId();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    building: buildingId,
    estimated_cost: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
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
    should_create_vote: true, // Default value is YES
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'new' | 'suggested'>('new');
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSelectSuggestedProject = (project: typeof SUGGESTED_PROJECTS[0]) => {
    setFormData(prev => ({
      ...prev,
      title: project.title,
      description: project.description,
      priority: project.priority as 'low' | 'medium' | 'high' | 'urgent'
    }));
    setSelectedTab('new');
    toast({
      title: 'Έργο επιλέχθηκε',
      description: `Το έργο "${project.title}" προστέθηκε στη φόρμα`
    });
  };

  const handleZoomSettingsSave = (settings: any) => {
    setFormData(prev => ({
      ...prev,
      assembly_zoom_link: settings.meetingUrl,
      assembly_zoom_settings: settings
    }));
    toast({
      title: 'Ρυθμίσεις Zoom',
      description: 'Οι ρυθμίσεις Zoom αποθηκεύτηκαν επιτυχώς'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({
        title: 'Σφάλμα',
        description: 'Ο τίτλος είναι υποχρεωτικός',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Δημιουργία του έργου
      const projectPayload = {
        ...formData,
        estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
        deadline: formData.deadline || null,
        tender_deadline: formData.tender_deadline || null,
        general_assembly_date: formData.general_assembly_date || null,
        payment_terms: formData.payment_terms || null,
        // Zoom ρυθμίσεις
        assembly_zoom_meeting_id: formData.assembly_zoom_settings.meetingId || null,
        assembly_zoom_password: formData.assembly_zoom_settings.password || null,
        assembly_zoom_waiting_room: formData.assembly_zoom_settings.waitingRoom,
        assembly_zoom_participant_video: formData.assembly_zoom_settings.participantVideo,
        assembly_zoom_host_video: formData.assembly_zoom_settings.hostVideo,
        assembly_zoom_mute_on_entry: formData.assembly_zoom_settings.muteOnEntry,
        assembly_zoom_auto_record: formData.assembly_zoom_settings.autoRecord,
        assembly_zoom_notes: formData.assembly_zoom_settings.notes || null,
      };

      const response = await api.post('/projects/projects/', projectPayload);
      
      // Δημιουργία ανακοίνωσης αν υπάρχει ημερομηνία γενικής συνέλευσης
      if (formData.general_assembly_date) {
        // Προσδιορισμός τρόπου διεξαγωγής συνέλευσης
        const assemblyMethods = [];
        if (formData.assembly_is_physical && formData.assembly_location) {
          assemblyMethods.push(`Φυσική παρουσία στο: ${formData.assembly_location}`);
        }
        if (formData.assembly_is_online && formData.assembly_zoom_link) {
          assemblyMethods.push(`Διαδικτυακή συνέλευση (Zoom): ${formData.assembly_zoom_link}`);
        }
        
        // Προσδιορισμός τρόπου διεξαγωγής
        let assemblyMethodText = '';
        if (assemblyMethods.length === 2) {
          assemblyMethodText = `Η συνέλευση θα διεξαχθεί με υβριδικό τρόπο:\n• ${assemblyMethods[0]}\n• ${assemblyMethods[1]}\n\nΟι κάτοικοι μπορούν να συμμετάσχουν είτε φυσικά είτε διαδικτυακά.`;
        } else if (assemblyMethods.length === 1) {
          if (formData.assembly_is_physical) {
            assemblyMethodText = `Η συνέλευση θα διεξαχθεί με φυσική παρουσία στο: ${formData.assembly_location}`;
          } else {
            assemblyMethodText = `Η συνέλευση θα διεξαχθεί διαδικτυακά μέσω Zoom: ${formData.assembly_zoom_link}`;
          }
        }
        
        // Στοιχεία συνέλευσης
        const assemblyDetails = [];
        if (formData.assembly_time) {
          assemblyDetails.push(`Ώρα: ${formData.assembly_time}`);
        }
        
        const announcementPayload: CreateAnnouncementPayload = {
          title: `Γενική Συνέλευση - Έργο: ${formData.title}`,
          description: `Ανακοίνωση για τη γενική συνέλευση σχετικά με το έργο "${formData.title}".\n\nΠεριγραφή έργου: ${formData.description || 'Δεν έχει δοθεί περιγραφή'}\n\nΕκτιμώμενο κόστος: ${formData.estimated_cost ? `${formData.estimated_cost}€` : 'Δεν έχει καθοριστεί'}\n\n--- ΣΤΟΙΧΕΙΑ ΣΥΝΕΛΕΥΣΗΣ ---\n\n${assemblyMethodText}\n\n${assemblyDetails.length > 0 ? `\n${assemblyDetails.join('\n')}` : ''}\n\nΠαρακαλούμε να συμμετάσχετε στη συνέλευση για να εκφράσετε τη γνώμη σας σχετικά με τα προτεινόμενα θέματα.`,
          start_date: formData.general_assembly_date,
          end_date: formData.general_assembly_date, // Η ανακοίνωση ισχύει για την ημέρα της συνέλευσης
          building: buildingId,
          is_active: true,
        };

        try {
          await createAnnouncement(announcementPayload);
          console.log('Announcement created successfully for assembly');
        } catch (announcementError: any) {
          console.error('Failed to create announcement:', announcementError);
          // Δεν αποτυγχάνει η δημιουργία έργου αν αποτύχει η ανακοίνωση
        }
      }
      
      // Αν είναι επιλεγμένο το checkbox, δημιουργούμε ψηφοφορία
      if (formData.should_create_vote) {
        const votePayload: CreateVotePayload = {
          title: `Έγκριση Έργου: ${formData.title}`,
          description: `Ψηφοφορία για την έγκριση του έργου "${formData.title}".\n\nΠεριγραφή: ${formData.description || 'Δεν έχει δοθεί περιγραφή'}\n\nΕκτιμώμενο κόστος: ${formData.estimated_cost ? `${formData.estimated_cost}€` : 'Δεν έχει καθοριστεί'}`,
          start_date: new Date().toISOString().split('T')[0], // Σημερινή ημερομηνία
          end_date: formData.general_assembly_date || undefined,
          choices: ['ΝΑΙ', 'ΟΧΙ', 'ΛΕΥΚΟ'],
          building: buildingId,
          is_active: true,
        };

        try {
          await createVote(votePayload);
          
          let successMessage = 'Το έργο δημιουργήθηκε επιτυχώς';
          if (formData.general_assembly_date) {
            successMessage += ' και δημιουργήθηκε ανακοίνωση για τη συνέλευση';
          }
          successMessage += ' και δημιουργήθηκε ψηφοφορία για την έγκρισή του';
          
          toast({
            title: 'Επιτυχία',
            description: successMessage
          });
        } catch (voteError: any) {
          // Αν αποτύχει η δημιουργία ψηφοφορίας, το έργο έχει ήδη δημιουργηθεί
          console.error('Failed to create vote:', voteError);
          
          let warningMessage = 'Το έργο δημιουργήθηκε επιτυχώς';
          if (formData.general_assembly_date) {
            warningMessage += ' και δημιουργήθηκε ανακοίνωση για τη συνέλευση';
          }
          warningMessage += ', αλλά απέτυχε η δημιουργία της ψηφοφορίας';
          
          toast({
            title: 'Επιτυχία με προειδοποίηση',
            description: warningMessage,
            variant: 'destructive'
          });
        }
      } else {
        let successMessage = 'Το έργο δημιουργήθηκε επιτυχώς';
        if (formData.general_assembly_date) {
          successMessage += ' και δημιουργήθηκε ανακοίνωση για τη συνέλευση';
        }
        
        toast({
          title: 'Επιτυχία',
          description: successMessage
        });
      }
      
      router.push(`/projects/${response.data.id}`);
    } catch (error: any) {
      toast({
        title: 'Σφάλμα',
        description: error?.response?.data?.detail || 'Αποτυχία δημιουργίας έργου',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <BackButton href="/projects" label="Επιστροφή" size="sm" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Νέο Έργο</h1>
          <p className="text-muted-foreground">
            Δημιουργία νέου έργου ή συντήρησης
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Επιλογή Έργου */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              Επιλογή Έργου
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as 'new' | 'suggested')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="new">Νέο Έργο</TabsTrigger>
                <TabsTrigger value="suggested">Προτεινόμενα Έργα</TabsTrigger>
              </TabsList>

              <TabsContent value="suggested" className="mt-6">
                <div className="grid gap-3 md:grid-cols-2">
                  {SUGGESTED_PROJECTS.map((project, index) => (
                    <div
                      key={index}
                      className="relative rounded-lg border p-4 hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => handleSelectSuggestedProject(project)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">{project.title}</h4>
                        <Badge
                          variant={
                            project.priority === 'high' ? 'destructive' :
                            project.priority === 'medium' ? 'default' :
                            'secondary'
                          }
                          className="ml-2"
                        >
                          {project.priority === 'high' ? 'Υψηλή' :
                           project.priority === 'medium' ? 'Μεσαία' :
                           'Χαμηλή'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {project.description}
                      </p>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="new">
                <p className="text-sm text-muted-foreground mb-4">
                  Συμπληρώστε τα στοιχεία του νέου έργου στη φόρμα παρακάτω
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Βασικές Πληροφορίες */}
        <Card>
          <CardHeader>
            <CardTitle>Βασικές Πληροφορίες</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="title">Τίτλος Έργου *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="π.χ. Ανακαίνιση κλιματισμού"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Περιγραφή</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Λεπτομερής περιγραφή του έργου..."
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="priority">Προτεραιότητα</Label>
                <select
                  id="priority"
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="low">Χαμηλή</option>
                  <option value="medium">Μεσαία</option>
                  <option value="high">Υψηλή</option>
                  <option value="urgent">Επείγον</option>
                </select>
              </div>

              {/* Checkbox για ψηφοφορία */}
              <div className="flex items-center space-x-3 pt-4 border-t">
                <input
                  id="should_create_vote"
                  type="checkbox"
                  checked={formData.should_create_vote}
                  onChange={(e) => handleInputChange('should_create_vote', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="flex items-center space-x-2">
                  <Vote className="w-4 h-4 text-blue-600" />
                  <Label htmlFor="should_create_vote" className="text-sm font-medium cursor-pointer">
                    Να τεθεί σε ψηφοφορία
                  </Label>
                </div>
              </div>
              <p className="text-xs text-gray-500 ml-7">
                Όταν επιλεγεί, θα δημιουργηθεί αυτόματα ψηφοφορία για την έγκριση του έργου από τους κατοίκους
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Οικονομικά */}
        <Card>
          <CardHeader>
            <CardTitle>Οικονομικά</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="estimated_cost">Εκτιμώμενο Κόστος (€)</Label>
                <Input
                  id="estimated_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.estimated_cost}
                  onChange={(e) => handleInputChange('estimated_cost', e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="payment_terms">Όροι Πληρωμής</Label>
                <Input
                  id="payment_terms"
                  value={formData.payment_terms}
                  onChange={(e) => handleInputChange('payment_terms', e.target.value)}
                  placeholder="π.χ. 50% προκαταβολή, 50% κατά την παράδοση"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ημερομηνίες */}
        <Card>
          <CardHeader>
            <CardTitle>Ημερομηνίες</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="deadline">Προθεσμία Έργου</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => handleInputChange('deadline', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="tender_deadline">Προθεσμία Υποβολής Προσφορών</Label>
                <Input
                  id="tender_deadline"
                  type="date"
                  value={formData.tender_deadline}
                  onChange={(e) => handleInputChange('tender_deadline', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="general_assembly_date">Ημερομηνία Γενικής Συνελεύσης</Label>
                <Input
                  id="general_assembly_date"
                  type="date"
                  value={formData.general_assembly_date}
                  onChange={(e) => handleInputChange('general_assembly_date', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Στοιχεία Γενικής Συνέλευσης */}
        {formData.general_assembly_date && (
          <Card>
            <CardHeader>
              <CardTitle>Στοιχεία Γενικής Συνέλευσης</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="assembly_time">Ώρα Συνέλευσης</Label>
                  <Input
                    id="assembly_time"
                    type="time"
                    value={formData.assembly_time || ''}
                    onChange={(e) => handleInputChange('assembly_time', e.target.value)}
                  />
                </div>
              </div>

              {/* Επιλογές παρουσίας */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Θέλετε να παραβρεθείτε με:</Label>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      id="assembly_is_physical"
                      type="checkbox"
                      checked={formData.assembly_is_physical || false}
                      onChange={(e) => handleInputChange('assembly_is_physical', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <Label htmlFor="assembly_is_physical" className="cursor-pointer">
                      Φυσική Παρουσία
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      id="assembly_is_online"
                      type="checkbox"
                      checked={formData.assembly_is_online || false}
                      onChange={(e) => handleInputChange('assembly_is_online', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <Label htmlFor="assembly_is_online" className="cursor-pointer">
                      Διαδικτυακή Συνέλευση (Zoom)
                    </Label>
                  </div>
                </div>
              </div>

              {/* Πεδία για φυσική παρουσία */}
              {formData.assembly_is_physical && (
                <div>
                  <Label htmlFor="assembly_location">Τοποθεσία Συνέλευσης *</Label>
                  <Input
                    id="assembly_location"
                    type="text"
                    placeholder="π.χ. Pilotis, Διαμέρισμα Α2"
                    value={formData.assembly_location || ''}
                    onChange={(e) => handleInputChange('assembly_location', e.target.value)}
                    required={formData.assembly_is_physical}
                  />
                </div>
              )}

              {/* Πεδία για διαδικτυακή συνέλευση */}
              {formData.assembly_is_online && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="assembly_zoom_link">Σύνδεσμος Zoom *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="assembly_zoom_link"
                        type="url"
                        placeholder="https://zoom.us/j/..."
                        value={formData.assembly_zoom_link || ''}
                        onChange={(e) => handleInputChange('assembly_zoom_link', e.target.value)}
                        required={formData.assembly_is_online}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsZoomModalOpen(true)}
                        className="flex items-center gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        Ρυθμίσεις
                      </Button>
                    </div>
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-gray-500">
                        Κάντε κλικ στο "Ρυθμίσεις" για προχωρημένες επιλογές Zoom
                      </p>
                      <p className="text-xs text-blue-600">
                        <a 
                          href="https://zoom.us/meeting/schedule" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="underline hover:text-blue-800"
                        >
                          📅 Δημιουργήστε νέα συνάντηση Zoom
                        </a>
                      </p>
                      <p className="text-xs text-gray-600">
                        Ή αν έχετε ήδη συνάντηση: 
                        <a 
                          href="https://zoom.us/meeting" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 underline hover:text-blue-800 ml-1"
                        >
                          Εισέλθετε στη συνάντησή σας
                        </a>
                      </p>
                    </div>
                  </div>

                  {/* Εμφάνιση επιπλέον ρυθμίσεων αν έχουν οριστεί */}
                  {formData.assembly_zoom_settings.meetingId && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <h4 className="text-sm font-medium text-blue-900 mb-2">Ρυθμίσεις Zoom:</h4>
                      <div className="space-y-1 text-xs text-blue-800">
                        <p><strong>Meeting ID:</strong> {formData.assembly_zoom_settings.meetingId}</p>
                        {formData.assembly_zoom_settings.password && (
                          <p><strong>Κωδικός:</strong> {formData.assembly_zoom_settings.password}</p>
                        )}
                        <p><strong>Αίθουσα Αναμονής:</strong> {formData.assembly_zoom_settings.waitingRoom ? 'Ναι' : 'Όχι'}</p>
                        <p><strong>Σίγαση κατά Είσοδο:</strong> {formData.assembly_zoom_settings.muteOnEntry ? 'Ναι' : 'Όχι'}</p>
                        {formData.assembly_zoom_settings.notes && (
                          <p><strong>Σημειώσεις:</strong> {formData.assembly_zoom_settings.notes}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button asChild variant="outline">
            <Link href="/projects">Ακύρωση</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Αποθήκευση...' : 'Δημιουργία Έργου'}
          </Button>
        </div>
      </form>

      {/* Zoom Settings Modal */}
      <ZoomSettingsModal
        isOpen={isZoomModalOpen}
        onClose={() => setIsZoomModalOpen(false)}
        onSave={handleZoomSettingsSave}
        initialSettings={formData.assembly_zoom_settings}
      />
    </div>
  );
}
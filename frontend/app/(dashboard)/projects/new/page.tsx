'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getActiveBuildingId } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Lightbulb, Plus } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
    assembly_location: '',
    assembly_zoom_link: '',
    payment_terms: '',
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'new' | 'suggested'>('new');

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
      const payload = {
        ...formData,
        estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
        deadline: formData.deadline || null,
        tender_deadline: formData.tender_deadline || null,
        general_assembly_date: formData.general_assembly_date || null,
        payment_terms: formData.payment_terms || null,
      };

      const response = await api.post('/projects/projects/', payload);
      
      toast({
        title: 'Επιτυχία',
        description: 'Το έργο δημιουργήθηκε επιτυχώς'
      });
      
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
        <Button asChild variant="outline" size="sm">
          <Link href="/projects">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Επιστροφή
          </Link>
        </Button>
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

                <div className="flex items-center space-x-2 pt-8">
                  <input
                    id="assembly_is_online"
                    type="checkbox"
                    checked={formData.assembly_is_online || false}
                    onChange={(e) => handleInputChange('assembly_is_online', e.target.checked)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="assembly_is_online" className="cursor-pointer">
                    Διαδικτυακή Συνέλευση (Zoom)
                  </Label>
                </div>
              </div>

              {formData.assembly_is_online ? (
                <div>
                  <Label htmlFor="assembly_zoom_link">Σύνδεσμος Zoom *</Label>
                  <Input
                    id="assembly_zoom_link"
                    type="url"
                    placeholder="https://zoom.us/j/..."
                    value={formData.assembly_zoom_link || ''}
                    onChange={(e) => handleInputChange('assembly_zoom_link', e.target.value)}
                  />
                </div>
              ) : (
                <div>
                  <Label htmlFor="assembly_location">Τοποθεσία Συνέλευσης</Label>
                  <Input
                    id="assembly_location"
                    type="text"
                    placeholder="π.χ. Pilotis, Διαμέρισμα Α2"
                    value={formData.assembly_location || ''}
                    onChange={(e) => handleInputChange('assembly_location', e.target.value)}
                  />
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
    </div>
  );
}
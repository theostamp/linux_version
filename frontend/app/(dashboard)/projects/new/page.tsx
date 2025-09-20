'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api, getActiveBuildingId } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

interface Building {
  id: number;
  name: string;
  address: string;
}

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
    payment_terms: '',
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const buildingsQ = useQuery({
    queryKey: ['buildings'],
    queryFn: async () => {
      return (await api.get('/buildings/buildings/')).data;
    }
  });

  const buildings = buildingsQ.data?.results || [];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
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
          <h1 className="text-3xl font-bold tracking-tight">Νέο Έργο</h1>
          <p className="text-muted-foreground">
            Δημιουργία νέου έργου ή συντήρησης
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Βασικές Πληροφορίες */}
        <Card>
          <CardHeader>
            <CardTitle>Βασικές Πληροφορίες</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="title">Τίτλος Έργου *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="π.χ. Ανακαίνιση κλιματισμού"
                  required
                />
              </div>
              
              <div className="md:col-span-2">
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
                <Label htmlFor="building">Κτίριο</Label>
                <select
                  id="building"
                  value={formData.building}
                  onChange={(e) => handleInputChange('building', e.target.value)}
                  className="w-full p-2 border rounded-md"
                  required
                >
                  {buildings.map((building: Building) => (
                    <option key={building.id} value={building.id}>
                      {building.name} - {building.address}
                    </option>
                  ))}
                </select>
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
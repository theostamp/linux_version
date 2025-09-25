'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, getActiveBuildingId } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

interface Project {
  id: string;
  title: string;
  building_name: string;
}

export default function NewOfferPage() {
  const router = useRouter();
  const { toast } = useToast();
  const buildingId = getActiveBuildingId();

  const [formData, setFormData] = useState({
    project: '',
    contractor_name: '',
    contractor_contact: '',
    contractor_phone: '',
    contractor_email: '',
    contractor_address: '',
    amount: '',
    description: '',
    payment_terms: '',
    payment_method: '',
    installments: '1',
    advance_payment: '',
    warranty_period: '',
    completion_time: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const projectsQ = useQuery({
    queryKey: ['projects', { building: buildingId }],
    queryFn: async () => {
      return (await api.get('/projects/projects/', { 
        params: { building: buildingId, page_size: 1000 } 
      })).data;
    }
  });

  const projects = projectsQ.data?.results || [];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.project || !formData.contractor_name || !formData.amount) {
      toast({
        title: 'Σφάλμα',
        description: 'Τα πεδία Έργο, Όνομα Συνεργείου και Ποσό είναι υποχρεωτικά',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        installments: parseInt(formData.installments) || 1,
        advance_payment: formData.advance_payment ? parseFloat(formData.advance_payment) : null,
        contractor_contact: formData.contractor_contact || null,
        contractor_phone: formData.contractor_phone || null,
        contractor_email: formData.contractor_email || null,
        contractor_address: formData.contractor_address || null,
        description: formData.description || null,
        payment_terms: formData.payment_terms || null,
        payment_method: formData.payment_method || null,
        warranty_period: formData.warranty_period || null,
        completion_time: formData.completion_time || null,
      };

      const response = await api.post('/projects/offers/', payload);
      
      toast({
        title: 'Επιτυχία',
        description: 'Η προσφορά δημιουργήθηκε επιτυχώς'
      });
      
      router.push(`/projects/offers/${response.data.id}`);
    } catch (error: any) {
      toast({
        title: 'Σφάλμα',
        description: error?.response?.data?.detail || 'Αποτυχία δημιουργίας προσφοράς',
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
          <Link href="/projects/offers">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Επιστροφή
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Νέα Προσφορά</h1>
          <p className="text-muted-foreground">
            Δημιουργία νέας προσφοράς από συνεργείο
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Επιλογή Έργου */}
        <Card>
          <CardHeader>
            <CardTitle>Επιλογή Έργου</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="project">Επιλέξτε Έργο *</Label>
              <select
                id="project"
                value={formData.project}
                onChange={(e) => handleInputChange('project', e.target.value)}
                className="w-full p-2 border rounded-md mt-2"
                required
              >
                <option value="">Επιλέξτε έργο για το οποίο υποβάλλεται η προσφορά...</option>
                {projects.map((project: Project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
              <p className="text-sm text-muted-foreground mt-2">
                Επιλέξτε το έργο για το οποίο υποβάλλεται η προσφορά από το συνεργείο.
                Αν το έργο δεν υπάρχει, πρέπει πρώτα να δημιουργηθεί από τη σελίδα έργων.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Στοιχεία Συνεργείου */}
        <Card>
          <CardHeader>
            <CardTitle>Στοιχεία Συνεργείου</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="contractor_name">Όνομα Συνεργείου *</Label>
                <Input
                  id="contractor_name"
                  value={formData.contractor_name}
                  onChange={(e) => handleInputChange('contractor_name', e.target.value)}
                  placeholder="π.χ. ΑΒΓ Ηλεκτρολογικά"
                  required
                />
              </div>

              <div>
                <Label htmlFor="contractor_contact">Στοιχεία Επικοινωνίας</Label>
                <Input
                  id="contractor_contact"
                  value={formData.contractor_contact}
                  onChange={(e) => handleInputChange('contractor_contact', e.target.value)}
                  placeholder="π.χ. Γιάννης Παπαδόπουλος"
                />
              </div>

              <div>
                <Label htmlFor="contractor_phone">Τηλέφωνο</Label>
                <Input
                  id="contractor_phone"
                  value={formData.contractor_phone}
                  onChange={(e) => handleInputChange('contractor_phone', e.target.value)}
                  placeholder="π.χ. 210 1234567"
                />
              </div>

              <div>
                <Label htmlFor="contractor_email">Email</Label>
                <Input
                  id="contractor_email"
                  type="email"
                  value={formData.contractor_email}
                  onChange={(e) => handleInputChange('contractor_email', e.target.value)}
                  placeholder="π.χ. info@abg-electrical.gr"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="contractor_address">Διεύθυνση</Label>
                <Textarea
                  id="contractor_address"
                  value={formData.contractor_address}
                  onChange={(e) => handleInputChange('contractor_address', e.target.value)}
                  placeholder="Πλήρης διεύθυνση συνεργείου..."
                  rows={2}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Προσφορά */}
        <Card>
          <CardHeader>
            <CardTitle>Προσφορά</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="amount">Ποσό Προσφοράς (€) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <Label htmlFor="completion_time">Χρόνος Ολοκλήρωσης</Label>
                <Input
                  id="completion_time"
                  value={formData.completion_time}
                  onChange={(e) => handleInputChange('completion_time', e.target.value)}
                  placeholder="π.χ. 30 ημέρες"
                />
              </div>

              <div>
                <Label htmlFor="warranty_period">Περίοδος Εγγύησης</Label>
                <Input
                  id="warranty_period"
                  value={formData.warranty_period}
                  onChange={(e) => handleInputChange('warranty_period', e.target.value)}
                  placeholder="π.χ. 2 χρόνια"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="payment_terms">Όροι Πληρωμής</Label>
                <Textarea
                  id="payment_terms"
                  value={formData.payment_terms}
                  onChange={(e) => handleInputChange('payment_terms', e.target.value)}
                  placeholder="π.χ. 50% προκαταβολή, 50% κατά την παράδοση"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="payment_method">Τρόπος Πληρωμής</Label>
                <select
                  id="payment_method"
                  value={formData.payment_method}
                  onChange={(e) => handleInputChange('payment_method', e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">Επιλέξτε τρόπο πληρωμής...</option>
                  <option value="cash">Μετρητά</option>
                  <option value="bank_transfer">Τραπεζική Μεταφορά</option>
                  <option value="check">Επιταγή</option>
                  <option value="card">Κάρτα</option>
                  <option value="installments">Δόσεις</option>
                </select>
              </div>

              <div>
                <Label htmlFor="installments">Αριθμός Δόσεων</Label>
                <Input
                  id="installments"
                  type="number"
                  min="1"
                  max="48"
                  value={formData.installments}
                  onChange={(e) => handleInputChange('installments', e.target.value)}
                  placeholder="1"
                />
              </div>

              <div>
                <Label htmlFor="advance_payment">Προκαταβολή (€)</Label>
                <Input
                  id="advance_payment"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.advance_payment}
                  onChange={(e) => handleInputChange('advance_payment', e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Περιγραφή Προσφοράς</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Λεπτομερής περιγραφή της προσφοράς, υλικών, εργασιών κλπ..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button asChild variant="outline">
            <Link href="/projects/offers">Ακύρωση</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Αποθήκευση...' : 'Δημιουργία Προσφοράς'}
          </Button>
        </div>
      </form>
    </div>
  );
}
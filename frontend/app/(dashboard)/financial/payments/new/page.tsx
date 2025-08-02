'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, CreditCard, Calendar, Euro } from 'lucide-react';
import { useAuth } from '@/components/contexts/AuthContext';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { createPayment, fetchApartments, type ApartmentList } from '@/lib/api';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import BuildingFilterIndicator from '@/components/BuildingFilterIndicator';

export default function NewPaymentPage() {
  const router = useRouter();
  const { selectedBuilding, currentBuilding } = useBuilding();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [apartments, setApartments] = useState<ApartmentList[]>([]);
  const [saving, setSaving] = useState(false);

  const buildingToUse = selectedBuilding || currentBuilding;

  const [formData, setFormData] = useState({
    apartment: '',
    payment_type: '',
    amount: '',
    due_date: '',
    status: 'pending',
    payment_date: '',
    amount_paid: '0',
    payment_method: '',
    reference_number: '',
    notes: ''
  });

  useEffect(() => {
    if (buildingToUse) {
      loadApartments();
    }
  }, [buildingToUse]);

  const loadApartments = async () => {
    if (!buildingToUse) return;
    
    setIsLoading(true);
    try {
      const apartmentsData = await fetchApartments(buildingToUse.id);
      setApartments(apartmentsData);
    } catch (error) {
      console.error('Error loading apartments:', error);
      toast.error('Σφάλμα κατά τη φόρτωση των διαμερισμάτων');
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!buildingToUse) {
      toast.error('Παρακαλώ επιλέξτε ένα κτίριο');
      return;
    }

    if (!formData.apartment) {
      toast.error('Παρακαλώ επιλέξτε ένα διαμέρισμα');
      return;
    }

    if (!formData.payment_type) {
      toast.error('Παρακαλώ επιλέξτε τύπο πληρωμής');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Παρακαλώ εισάγετε ένα έγκυρο ποσό');
      return;
    }

    if (!formData.due_date) {
      toast.error('Παρακαλώ εισάγετε ημερομηνία λήξης');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        apartment: parseInt(formData.apartment),
        payment_type: formData.payment_type,
        amount: parseFloat(formData.amount),
        due_date: formData.due_date,
        status: formData.status,
        payment_date: formData.payment_date || undefined,
        amount_paid: parseFloat(formData.amount_paid) || 0,
        payment_method: formData.payment_method,
        reference_number: formData.reference_number,
        notes: formData.notes
      };

      await createPayment(payload);
      toast.success('Η πληρωμή δημιουργήθηκε επιτυχώς');
      router.push('/financial/payments');
    } catch (error: any) {
      console.error('Error creating payment:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Σφάλμα κατά τη δημιουργία της πληρωμής';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const paymentTypes = [
    { value: 'common_expenses', label: 'Κοινοχρήστων' },
    { value: 'heating', label: 'Θέρμανση' },
    { value: 'electricity_common', label: 'Ηλεκτρικό Κοινοχρήστων' },
    { value: 'cleaning', label: 'Καθαριότητα' },
    { value: 'security', label: 'Ασφάλεια' },
    { value: 'elevator', label: 'Ανελκυστήρες' },
    { value: 'other', label: 'Άλλο' }
  ];

  const statusOptions = [
    { value: 'pending', label: 'Εκκρεμεί' },
    { value: 'paid', label: 'Πληρωμένο' },
    { value: 'partial', label: 'Μερική Πληρωμή' },
    { value: 'overdue', label: 'Ληξιπρόθεσμο' }
  ];

  if (!buildingToUse) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">💳 Νέα Πληρωμή</h1>
        <p className="text-red-600">Παρακαλώ επιλέξτε κτίριο για να συνεχίσετε.</p>
        <BuildingFilterIndicator />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            💳 Νέα Πληρωμή
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Δημιουργία νέας πληρωμής κοινοχρήστων
          </p>
          <BuildingFilterIndicator />
        </div>
        <Button variant="outline" asChild>
          <Link href="/financial/payments">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Επιστροφή
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                Βασικές Πληροφορίες
              </CardTitle>
              <CardDescription>
                Επιλέξτε διαμέρισμα και τύπο πληρωμής
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="apartment">Διαμέρισμα *</Label>
                <Select value={formData.apartment} onValueChange={(value) => updateFormData('apartment', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Επιλέξτε διαμέρισμα" />
                  </SelectTrigger>
                  <SelectContent>
                    {apartments.map((apartment) => (
                      <SelectItem key={apartment.id} value={apartment.id.toString()}>
                        {apartment.number} - {apartment.owner_name || apartment.tenant_name || 'Χωρίς ιδιοκτήτη'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="payment_type">Τύπος Πληρωμής *</Label>
                <Select value={formData.payment_type} onValueChange={(value) => updateFormData('payment_type', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Επιλέξτε τύπο πληρωμής" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="amount">Ποσό (€) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => updateFormData('amount', e.target.value)}
                  placeholder="0.00"
                  className="w-full"
                />
              </div>

              <div>
                <Label htmlFor="due_date">Ημερομηνία Λήξης *</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => updateFormData('due_date', e.target.value)}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Euro className="w-5 h-5 mr-2" />
                Λεπτομέρειες Πληρωμής
              </CardTitle>
              <CardDescription>
                Κατάσταση και πληροφορίες πληρωμής
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="status">Κατάσταση</Label>
                <Select value={formData.status} onValueChange={(value) => updateFormData('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="amount_paid">Ποσό που Πληρώθηκε (€)</Label>
                <Input
                  id="amount_paid"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount_paid}
                  onChange={(e) => updateFormData('amount_paid', e.target.value)}
                  placeholder="0.00"
                  className="w-full"
                />
              </div>

              <div>
                <Label htmlFor="payment_date">Ημερομηνία Πληρωμής</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => updateFormData('payment_date', e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <Label htmlFor="payment_method">Μέθοδος Πληρωμής</Label>
                <Input
                  id="payment_method"
                  value={formData.payment_method}
                  onChange={(e) => updateFormData('payment_method', e.target.value)}
                  placeholder="π.χ. Τραπεζική μεταφορά, Μετρητά..."
                  className="w-full"
                />
              </div>

              <div>
                <Label htmlFor="reference_number">Αριθμός Αναφοράς</Label>
                <Input
                  id="reference_number"
                  value={formData.reference_number}
                  onChange={(e) => updateFormData('reference_number', e.target.value)}
                  placeholder="Αριθμός συναλλαγής..."
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Σημειώσεις</CardTitle>
            <CardDescription>
              Προαιρετικές σημειώσεις για την πληρωμή
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.notes}
              onChange={(e) => updateFormData('notes', e.target.value)}
              placeholder="Προσθέστε σημειώσεις για την πληρωμή..."
              rows={3}
              className="w-full"
            />
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Button variant="outline" asChild>
            <Link href="/financial/payments">
              Ακύρωση
            </Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Αποθήκευση...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Δημιουργία Πληρωμής
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
} 
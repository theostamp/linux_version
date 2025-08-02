'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, TrendingUp, Calendar, Euro, Wallet } from 'lucide-react';
import { useAuth } from '@/components/contexts/AuthContext';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { createTransaction, fetchAccounts, type BuildingAccount } from '@/lib/api';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import BuildingFilterIndicator from '@/components/BuildingFilterIndicator';

export default function NewTransactionPage() {
  const router = useRouter();
  const { selectedBuilding, currentBuilding } = useBuilding();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [accounts, setAccounts] = useState<BuildingAccount[]>([]);
  const [saving, setSaving] = useState(false);

  const buildingToUse = selectedBuilding || currentBuilding;

  const [formData, setFormData] = useState({
    account: '',
    transaction_type: 'income',
    amount: '',
    description: '',
    transaction_date: '',
    reference_number: '',
    category: '',
    notes: ''
  });

  useEffect(() => {
    if (buildingToUse) {
      loadAccounts();
    }
  }, [buildingToUse]);

  const loadAccounts = async () => {
    if (!buildingToUse) return;
    
    setIsLoading(true);
    try {
      const accountsData = await fetchAccounts(buildingToUse.id);
      setAccounts(accountsData);
    } catch (error) {
      console.error('Error loading accounts:', error);
      toast.error('Σφάλμα κατά τη φόρτωση των λογαριασμών');
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

    if (!formData.account) {
      toast.error('Παρακαλώ επιλέξτε ένα λογαριασμό');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Παρακαλώ εισάγετε ένα έγκυρο ποσό');
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Παρακαλώ εισάγετε περιγραφή');
      return;
    }

    if (!formData.transaction_date) {
      toast.error('Παρακαλώ εισάγετε ημερομηνία συναλλαγής');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        building: buildingToUse.id,
        account: parseInt(formData.account),
        transaction_type: formData.transaction_type as 'income' | 'expense',
        amount: parseFloat(formData.amount),
        description: formData.description.trim(),
        transaction_date: formData.transaction_date,
        reference_number: formData.reference_number || undefined,
        category: formData.category || undefined,
        notes: formData.notes || undefined
      };

      await createTransaction(payload);
      toast.success('Η συναλλαγή δημιουργήθηκε επιτυχώς');
      router.push('/financial/transactions');
    } catch (error: any) {
      console.error('Error creating transaction:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Σφάλμα κατά τη δημιουργία της συναλλαγής';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const categories = [
    'Κοινοχρήστων',
    'Θέρμανση',
    'Ηλεκτρικό',
    'Καθαριότητα',
    'Ασφάλεια',
    'Ανελκυστήρες',
    'Συντήρηση',
    'Ασφάλιση',
    'Φόροι',
    'Άλλο'
  ];

  if (!buildingToUse) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">📊 Νέα Συναλλαγή</h1>
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
            📊 Νέα Οικονομική Συναλλαγή
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Δημιουργία νέας οικονομικής συναλλαγής
          </p>
          <BuildingFilterIndicator />
        </div>
        <Button variant="outline" asChild>
          <Link href="/financial/transactions">
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
                <TrendingUp className="w-5 h-5 mr-2" />
                Βασικές Πληροφορίες
              </CardTitle>
              <CardDescription>
                Επιλέξτε λογαριασμό και τύπο συναλλαγής
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="account">Λογαριασμός *</Label>
                <Select value={formData.account} onValueChange={(value) => updateFormData('account', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Επιλέξτε λογαριασμό" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id.toString()}>
                        {account.account_type_display} - {account.bank_name} (€{parseFloat(account.current_balance).toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="transaction_type">Τύπος Συναλλαγής *</Label>
                <Select value={formData.transaction_type} onValueChange={(value) => updateFormData('transaction_type', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Έσοδο</SelectItem>
                    <SelectItem value="expense">Έξοδο</SelectItem>
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
                <Label htmlFor="transaction_date">Ημερομηνία Συναλλαγής *</Label>
                <Input
                  id="transaction_date"
                  type="date"
                  value={formData.transaction_date}
                  onChange={(e) => updateFormData('transaction_date', e.target.value)}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>

          {/* Transaction Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Euro className="w-5 h-5 mr-2" />
                Λεπτομέρειες Συναλλαγής
              </CardTitle>
              <CardDescription>
                Περιγραφή και κατηγοριοποίηση
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="description">Περιγραφή *</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  placeholder="Περιγραφή της συναλλαγής..."
                  className="w-full"
                />
              </div>

              <div>
                <Label htmlFor="category">Κατηγορία</Label>
                <Select value={formData.category} onValueChange={(value) => updateFormData('category', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Επιλέξτε κατηγορία" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="reference_number">Αριθμός Αναφοράς</Label>
                <Input
                  id="reference_number"
                  value={formData.reference_number}
                  onChange={(e) => updateFormData('reference_number', e.target.value)}
                  placeholder="Αριθμός συναλλαγής, επιταγής..."
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
              Προαιρετικές σημειώσεις για τη συναλλαγή
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.notes}
              onChange={(e) => updateFormData('notes', e.target.value)}
              placeholder="Προσθέστε σημειώσεις για τη συναλλαγή..."
              rows={3}
              className="w-full"
            />
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Button variant="outline" asChild>
            <Link href="/financial/transactions">
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
                Δημιουργία Συναλλαγής
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
} 
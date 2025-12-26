'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';
import { InvoiceUploadForm } from '@/components/financial/InvoiceUploadForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileText, Sparkles } from 'lucide-react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useExpenses } from '@/hooks/useExpenses';
import { ScannedInvoiceData } from '@/types/financial';
import { ExpenseFormData } from '@/types/financial';
import { toast } from 'sonner';

function DocumentsContent() {
  const router = useRouter();
  const { selectedBuilding } = useBuilding();
  const { createExpense, isLoading } = useExpenses(selectedBuilding?.id);

  const handleSave = async (scannedData: ScannedInvoiceData) => {
    if (!selectedBuilding?.id) {
      toast.error('Παρακαλώ επιλέξτε ένα κτίριο');
      return;
    }

    if (!scannedData.amount || !scannedData.date) {
      toast.error('Παρακαλώ συμπληρώστε το ποσό και την ημερομηνία');
      return;
    }

    try {
      // Convert ScannedInvoiceData to ExpenseFormData
      const expenseData: ExpenseFormData = {
        building: selectedBuilding.id,
        title: scannedData.description || scannedData.supplier || 'Δαπάνη από παραστατικό',
        amount: scannedData.amount,
        date: scannedData.date,
        category: scannedData.category || 'miscellaneous',
        distribution_type: 'by_participation_mills', // Default distribution
        notes: scannedData.description || undefined,
      };

      await createExpense(expenseData);
      toast.success('Η δαπάνη δημιουργήθηκε επιτυχώς!');
      
      // Redirect to financial page to see the new expense
      router.push(`/financial?building=${selectedBuilding.id}`);
    } catch (error: any) {
      console.error('Error creating expense:', error);
      toast.error(error?.message || 'Σφάλμα κατά τη δημιουργία της δαπάνης');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="w-8 h-8" />
            Παραστατικά
          </h1>
          <p className="text-muted-foreground mt-2">
            Ανάλυση παραστατικών με AI για αυτόματη συμπλήρωση δαπανών
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="w-4 h-4" />
          <span>Powered by Google Gemini AI</span>
        </div>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Πώς λειτουργεί</CardTitle>
          <CardDescription>
            Ανέβασε μια φωτογραφία παραστατικού και το AI θα εξάγει αυτόματα τα στοιχεία
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>Ανέβασε εικόνα παραστατικού (JPG, PNG, WebP)</li>
            <li>Το AI αναλύει την εικόνα και εξάγει: ποσό, ημερομηνία, προμηθευτή, κατηγορία</li>
            <li>Ελέγξε και επεξεργάσου τα αποτελέσματα</li>
            <li>Αποθήκευσε τη δαπάνη με ένα κλικ</li>
          </ul>
        </CardContent>
      </Card>

      {/* Invoice Upload Form */}
      <InvoiceUploadForm onSave={handleSave} />
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <AuthGate role={['manager', 'staff', 'superuser']}>
      <SubscriptionGate requiredStatus="any">
        <DocumentsContent />
      </SubscriptionGate>
    </AuthGate>
  );
}


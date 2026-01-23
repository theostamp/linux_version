'use client';

import React, { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';
import { InvoiceUploadForm } from '@/components/financial/InvoiceUploadForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileText, Loader2 } from 'lucide-react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { createArchiveDocument } from '@/lib/api';
import { api } from '@/lib/api';
import { ScannedInvoiceData, ExpenseFormData } from '@/types/financial';
import { useExpenses as useExpensesQuery } from '@/hooks/useExpensesQuery';
import { toast } from 'sonner';
import PremiumFeatureInfo from '@/components/premium/PremiumFeatureInfo';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type PendingSave = {
  scannedData: ScannedInvoiceData;
  file: File | null;
  shouldArchive: boolean;
};

const AUTO_BUILDING_CONFIDENCE = 0.85;

function parseApiErrorBody(error: any): any | null {
  const body = error?.response?.body;
  if (!body || typeof body !== 'string') return null;
  try {
    const parsed = JSON.parse(body);
    const details = parsed?.details;
    if (typeof details === 'string') {
      const trimmed = details.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          const parsedDetails = JSON.parse(trimmed);
          if (parsedDetails && typeof parsedDetails === 'object') {
            return { ...parsed, ...parsedDetails, details: parsedDetails };
          }
        } catch {
          return parsed;
        }
      }
    }
    return parsed;
  } catch {
    return null;
  }
}

function DocumentsContent() {
  const router = useRouter();
  const { selectedBuilding, buildings, setSelectedBuilding } = useBuilding();
  const { data: availableExpenses = [], isLoading: isLoadingExpenses } = useExpensesQuery(
    { building_id: selectedBuilding?.id, page_size: 500 },
    { enabled: !!selectedBuilding?.id }
  );

  const [isSaving, setIsSaving] = useState(false);
  const pendingSaveResolveRef = useRef<((value: boolean) => void) | null>(null);
  const duplicateDetectedRef = useRef(false);
  const suppressDialogResolveRef = useRef(false);

  // Building confirmation dialog (when we can't confidently detect a building)
  const [buildingDialogOpen, setBuildingDialogOpen] = useState(false);
  const [buildingChoiceId, setBuildingChoiceId] = useState<number | null>(null);
  const [pendingSave, setPendingSave] = useState<PendingSave | null>(null);

  // Duplicate confirmation dialog (probable duplicate in archive)
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [pendingDuplicate, setPendingDuplicate] = useState<{ buildingId: number; save: PendingSave } | null>(null);
  const [duplicateInfo, setDuplicateInfo] = useState<{ reason?: string; existing_ids?: number[] } | null>(null);

  const hasMultipleBuildings = useMemo(() => (buildings?.length ?? 0) > 1, [buildings]);

  const buildExpenseFormData = (expenseData: ExpenseFormData) => {
    const formData = new FormData();
    formData.append('building', expenseData.building.toString());
    formData.append('title', expenseData.title);
    formData.append('amount', expenseData.amount.toString());
    formData.append('date', expenseData.date);
    formData.append('category', expenseData.category);
    formData.append('distribution_type', expenseData.distribution_type);
    if (expenseData.notes) formData.append('notes', expenseData.notes);
    return formData;
  };

  const buildArchiveFormData = (
    buildingId: number,
    scannedData: ScannedInvoiceData,
    file: File,
    allowDuplicate: boolean,
    options?: { category?: string; linkedExpenseId?: number | null },
  ) => {
    const archiveData = new FormData();
    archiveData.append('building', buildingId.toString());
    archiveData.append('category', options?.category || 'expense_receipt');
    archiveData.append('file', file);
    if (allowDuplicate) archiveData.append('allow_duplicate', 'true');
    if (options?.linkedExpenseId) archiveData.append('linked_expense', options.linkedExpenseId.toString());

    if (scannedData.document_type) archiveData.append('document_type', scannedData.document_type);
    if (scannedData.document_number) archiveData.append('document_number', scannedData.document_number);
    if (scannedData.supplier) archiveData.append('supplier_name', scannedData.supplier);
    if (scannedData.supplier_vat) archiveData.append('supplier_vat', scannedData.supplier_vat);
    if (scannedData.date) archiveData.append('document_date', scannedData.date);
    if (scannedData.amount !== null && scannedData.amount !== undefined) {
      archiveData.append('amount', scannedData.amount.toString());
    }

    const fallbackTitle = options?.category === 'payment_receipt'
      ? 'Απόδειξη Πληρωμής'
      : 'Παραστατικό Δαπάνης';
    const title =
      scannedData.description ||
      scannedData.supplier ||
      file.name ||
      fallbackTitle;
    archiveData.append('title', title);

    return archiveData;
  };

  const performSave = async (
    buildingId: number,
    save: PendingSave,
    options?: { allowDuplicate?: boolean }
  ): Promise<boolean> => {
    if (isSaving) return false;

    const { scannedData, file, shouldArchive } = save;

    if (!buildingId) {
      toast.error('Παρακαλώ επιλέξτε ένα κτίριο');
      return false;
    }
    if (!scannedData.amount || !scannedData.date) {
      toast.error('Παρακαλώ συμπληρώστε το ποσό και την ημερομηνία');
      return false;
    }

    setIsSaving(true);
    let archivedDoc: any | null = null;

    try {
      const intent = scannedData.financial_intent === 'payment_receipt' ? 'payment_receipt' : 'expense';

      if (intent === 'payment_receipt') {
        if (!scannedData.linked_expense_id) {
          toast.error('Επιλέξτε τη δαπάνη που εξοφλείται.');
          return false;
        }
        if (!scannedData.payment_method) {
          toast.error('Επιλέξτε τρόπο πληρωμής.');
          return false;
        }
      }

      if (shouldArchive && file) {
        const archiveData = buildArchiveFormData(
          buildingId,
          scannedData,
          file,
          Boolean(options?.allowDuplicate),
          {
            category: intent === 'payment_receipt' ? 'payment_receipt' : 'expense_receipt',
            linkedExpenseId: intent === 'payment_receipt' ? scannedData.linked_expense_id : null,
          }
        );
        try {
          archivedDoc = await createArchiveDocument(archiveData);
        } catch (archiveError: any) {
          const parsed = parseApiErrorBody(archiveError);
          const statusCode = archiveError?.status ?? archiveError?.response?.status;

          if (statusCode === 409 && parsed?.code === 'PROBABLE_DUPLICATE') {
            duplicateDetectedRef.current = true;
            setDuplicateInfo({
              reason: parsed?.reason,
              existing_ids: parsed?.existing_ids,
            });
            setPendingDuplicate({ buildingId, save });
            setDuplicateDialogOpen(true);
            toast.warning('Βρέθηκε πιθανό διπλό παραστατικό. Επιβεβαιώστε για να συνεχίσετε.');
            return false;
          }

          throw archiveError;
        }
      }

      if (intent === 'payment_receipt') {
        const paymentForm = new FormData();
        paymentForm.append('building_id', buildingId.toString());
        paymentForm.append('expense', String(scannedData.linked_expense_id));
        paymentForm.append('amount', scannedData.amount.toString());
        paymentForm.append('payment_date', scannedData.date);
        paymentForm.append('method', scannedData.payment_method || 'bank_transfer');
        if (scannedData.document_number) {
          paymentForm.append('reference_number', scannedData.document_number);
        }
        if (scannedData.description) {
          paymentForm.append('notes', scannedData.description);
        }
        if (file) {
          paymentForm.append('receipt', file);
        }

        const createdPayment = await api.post<any>('/financial/expense-payments/', paymentForm);
        const createdPaymentId = createdPayment?.id ?? createdPayment?.data?.id;

        if (archivedDoc?.id && createdPaymentId) {
          try {
            const linkForm = new FormData();
            linkForm.append('metadata', JSON.stringify({ expense_payment_id: createdPaymentId }));
            await api.patch(`/archive/documents/${archivedDoc.id}/`, linkForm);
          } catch (linkError) {
            console.warn('[DocumentsPage] Failed to link archive to expense payment:', linkError);
          }
          toast.success('Το παραστατικό αποθηκεύτηκε στο ηλεκτρονικό αρχείο');
        }

        toast.success('Η απόδειξη πληρωμής καταχωρήθηκε επιτυχώς!');
        router.push(`/financial?building=${buildingId}`);
        return true;
      }

      const expenseData: ExpenseFormData = {
        building: buildingId,
        title: scannedData.description || scannedData.supplier || 'Δαπάνη από παραστατικό',
        amount: scannedData.amount,
        date: scannedData.date,
        category: scannedData.category || 'miscellaneous',
        distribution_type: 'by_participation_mills',
        notes: scannedData.description || undefined,
      };

      const createdExpense = await api.post<any>('/financial/expenses/', buildExpenseFormData(expenseData));
      const createdExpenseId = createdExpense?.id ?? createdExpense?.data?.id;

      if (archivedDoc?.id && createdExpenseId) {
        // Best-effort link (don’t fail the whole flow if linking fails)
        try {
          const linkForm = new FormData();
          linkForm.append('linked_expense', createdExpenseId.toString());
          await api.patch(`/archive/documents/${archivedDoc.id}/`, linkForm);
        } catch (linkError) {
          console.warn('[DocumentsPage] Failed to link archived document to expense:', linkError);
        }
        toast.success('Το παραστατικό αποθηκεύτηκε στο ηλεκτρονικό αρχείο');
      }

      toast.success('Η δαπάνη δημιουργήθηκε επιτυχώς!');
      router.push(`/financial?building=${buildingId}`);
      return true;
    } catch (error: any) {
      console.error('Error creating expense:', error);
      const parsed = parseApiErrorBody(error);
      const friendlyMessage =
        (typeof parsed?.error === 'string' && parsed.error) ||
        (typeof parsed?.detail === 'string' && parsed.detail) ||
        (typeof parsed?.message === 'string' && parsed.message);
      toast.error(friendlyMessage || error?.message || 'Σφάλμα κατά τη δημιουργία της δαπάνης');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async (
    scannedData: ScannedInvoiceData,
    file: File | null,
    shouldArchive: boolean
  ): Promise<boolean> => {
    if (isSaving) return false;

    const save: PendingSave = { scannedData, file, shouldArchive };

    // 1) Auto-select building when confidence is high
    const suggestion = scannedData.building_suggestion;
    const suggestedBuildingId =
      suggestion?.status === 'matched' &&
      typeof suggestion?.confidence === 'number' &&
      suggestion.confidence >= AUTO_BUILDING_CONFIDENCE &&
      typeof suggestion.building_id === 'number'
        ? suggestion.building_id
        : null;

    let targetBuildingId: number | null = selectedBuilding?.id ?? null;

    if (suggestedBuildingId) {
      targetBuildingId = suggestedBuildingId;
      if (selectedBuilding?.id !== suggestedBuildingId) {
        const matched = buildings?.find((b) => b.id === suggestedBuildingId) ?? null;
        if (matched) {
          setSelectedBuilding(matched);
          toast.message(`Επιλέχθηκε αυτόματα το κτίριο: ${matched.name}`);
        } else {
          toast.message('Επιλέχθηκε αυτόματα κτίριο (αναγνώριση παραστατικού)');
        }
      }
    } else if (hasMultipleBuildings) {
      // 2) Not confidently recognized → require explicit confirmation before saving
      setPendingSave(save);
      setBuildingChoiceId(selectedBuilding?.id ?? buildings?.[0]?.id ?? null);
      setBuildingDialogOpen(true);
      toast.info('Δεν αναγνωρίστηκε με βεβαιότητα το κτίριο. Επιβεβαιώστε πριν την καταχώρηση.');
      return await new Promise<boolean>((resolve) => {
        pendingSaveResolveRef.current = resolve;
      });
    }

    if (!targetBuildingId) {
      toast.error('Παρακαλώ επιλέξτε ένα κτίριο');
      return false;
    }

    duplicateDetectedRef.current = false;
    const saved = await performSave(targetBuildingId, save, { allowDuplicate: false });
    if (saved) return true;
    if (duplicateDetectedRef.current) {
      return await new Promise<boolean>((resolve) => {
        pendingSaveResolveRef.current = resolve;
      });
    }
    return false;
  };

  const handleConfirmBuilding = async () => {
    const save = pendingSave;
    const chosenId = buildingChoiceId;

    if (!save) return;
    if (!chosenId) {
      toast.error('Παρακαλώ επιλέξτε κτίριο');
      return;
    }

    const matched = buildings?.find((b) => b.id === chosenId) ?? null;
    if (matched) {
      setSelectedBuilding(matched);
    }

    suppressDialogResolveRef.current = true;
    setBuildingDialogOpen(false);
    setPendingSave(null);

    duplicateDetectedRef.current = false;
    const saved = await performSave(chosenId, save, { allowDuplicate: false });
    if (duplicateDetectedRef.current) {
      return;
    }
    if (pendingSaveResolveRef.current) {
      pendingSaveResolveRef.current(saved);
      pendingSaveResolveRef.current = null;
    }
  };

  const handleConfirmDuplicateContinue = async () => {
    const ctx = pendingDuplicate;
    if (!ctx) return;
    suppressDialogResolveRef.current = true;
    setDuplicateDialogOpen(false);
    setPendingDuplicate(null);
    duplicateDetectedRef.current = false;
    const saved = await performSave(ctx.buildingId, ctx.save, { allowDuplicate: true });
    if (pendingSaveResolveRef.current) {
      pendingSaveResolveRef.current(saved);
      pendingSaveResolveRef.current = null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <FileText className="w-8 h-8" />
            Παραστατικά
          </h1>
          <p className="text-muted-foreground mt-2">
            Ανάλυση παραστατικών για αυτόματη συμπλήρωση δαπανών ή αποδείξεων πληρωμής
          </p>
        </div>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Πώς λειτουργεί</CardTitle>
          <CardDescription>
            Ανέβασε μια φωτογραφία παραστατικού και η εφαρμογή θα εξάγει αυτόματα τα στοιχεία
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>Ανέβασε ένα ή περισσότερα αρχεία (εικόνα ή PDF) για να δημιουργηθεί ουρά αναγνώρισης</li>
            <li>Η εφαρμογή αναλύει κάθε παραστατικό και εξάγει: ποσό, ημερομηνία, προμηθευτή, κατηγορία</li>
            <li>Επίλεξε αν πρόκειται για δαπάνη ή απόδειξη πληρωμής</li>
            <li>Δες τη μικρογραφία του ενεργού αρχείου και επιβεβαίωσε τα στοιχεία</li>
            <li>Αποθήκευσε το παραστατικό με ένα κλικ και προχώρα στο επόμενο</li>
          </ul>
        </CardContent>
      </Card>

      {/* Invoice Upload Form */}
      <InvoiceUploadForm
        onSave={handleSave}
        availableExpenses={availableExpenses}
        isLoadingExpenses={isLoadingExpenses}
      />

      {/* Building confirmation (when recognition is not confident) */}
      <AlertDialog
        open={buildingDialogOpen}
        onOpenChange={(open) => {
          setBuildingDialogOpen(open);
          if (!open && suppressDialogResolveRef.current) {
            suppressDialogResolveRef.current = false;
            return;
          }
          if (!open && pendingSaveResolveRef.current) {
            pendingSaveResolveRef.current(false);
            pendingSaveResolveRef.current = null;
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Επιβεβαίωση κτιρίου</AlertDialogTitle>
            <AlertDialogDescription>
              Δεν αναγνωρίστηκε με βεβαιότητα το κτίριο από το παραστατικό. Επιβεβαιώστε το σωστό κτίριο για να συνεχίσετε.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <Select
              value={buildingChoiceId ? buildingChoiceId.toString() : ''}
              onValueChange={(value) => setBuildingChoiceId(parseInt(value, 10))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Επιλέξτε κτίριο" />
              </SelectTrigger>
              <SelectContent>
                {(buildings ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.id.toString()}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isSaving}
              onClick={() => {
                setPendingSave(null);
                if (pendingSaveResolveRef.current) {
                  pendingSaveResolveRef.current(false);
                  pendingSaveResolveRef.current = null;
                }
              }}
            >
              Ακύρωση
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmBuilding}
              disabled={!buildingChoiceId || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Αποθήκευση...
                </>
              ) : (
                'Συνέχεια'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Probable duplicate confirmation */}
      <AlertDialog
        open={duplicateDialogOpen}
        onOpenChange={(open) => {
          setDuplicateDialogOpen(open);
          if (!open && suppressDialogResolveRef.current) {
            suppressDialogResolveRef.current = false;
            return;
          }
          if (!open && pendingSaveResolveRef.current) {
            pendingSaveResolveRef.current(false);
            pendingSaveResolveRef.current = null;
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Πιθανό διπλό παραστατικό</AlertDialogTitle>
            <AlertDialogDescription>
              Βρέθηκε πιθανή διπλο-καταχώρηση στο Ηλεκτρονικό Αρχείο. Θέλετε να συνεχίσετε και να καταχωρηθεί ξανά;
              {duplicateInfo?.existing_ids?.length ? (
                <span className="block mt-2 text-xs text-muted-foreground">
                  Ενδεικτικά IDs: {duplicateInfo.existing_ids.join(', ')}
                </span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isSaving}
              onClick={() => {
                setDuplicateInfo(null);
                setPendingDuplicate(null);
                if (pendingSaveResolveRef.current) {
                  pendingSaveResolveRef.current(false);
                  pendingSaveResolveRef.current = null;
                }
              }}
            >
              Ακύρωση
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDuplicateContinue} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Αποθήκευση...
                </>
              ) : (
                'Ναι, συνέχισε'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function DocumentsPage() {
  const { buildingContext, isLoadingContext } = useBuilding();
  const premiumAccess = Boolean(
    buildingContext?.billing?.premium_access ?? buildingContext?.billing?.kiosk_enabled ?? false
  );
  const upgradeHref = buildingContext?.id ? `/upgrade?building_id=${buildingContext.id}` : '/upgrade';

  return (
    <AuthGate role={['manager', 'staff', 'superuser']}>
      <SubscriptionGate requiredStatus="any">
        {isLoadingContext && !buildingContext ? (
          <div className="min-h-[50vh] flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
              <p>Έλεγχος Premium...</p>
            </div>
          </div>
        ) : premiumAccess ? (
          <DocumentsContent />
        ) : (
          <PremiumFeatureInfo
            title="Παραστατικά με αναγνώριση εφαρμογής"
            description="Σάρωσε παραστατικά και μεταμόρφωσέ τα σε έτοιμες δαπάνες με ακρίβεια. Όλα καταγράφονται αυτόματα και συνδέονται με το ηλεκτρονικό αρχείο."
            note="Απαιτείται ενεργή Premium συνδρομή για το επιλεγμένο κτίριο."
            bullets={[
              'Αυτόματη εξαγωγή ποσού, ημερομηνίας, προμηθευτή και ΑΦΜ.',
              'Πρόταση κατηγορίας και δημιουργία δαπάνης με ένα κλικ.',
              'Σύνδεση παραστατικού με το Ηλεκτρονικό Αρχείο.',
              'Έλεγχος για πιθανές διπλο-καταχωρήσεις πριν την αποθήκευση.',
            ]}
            highlights={[
              {
                title: 'OCR + ανάλυση εφαρμογής',
                description: 'Διαβάζει εικόνες/PDF και μετατρέπει το παραστατικό σε δομημένα δεδομένα.',
              },
              {
                title: 'Auto-fill δαπάνης',
                description: 'Συμπληρώνει τα πεδία και μειώνει τα λάθη στις καταχωρήσεις.',
              },
              {
                title: 'Σύνδεση με οικονομικά',
                description: 'Κρατά την αλυσίδα παραστατικό → δαπάνη → αρχείο ενιαία.',
              },
            ]}
            tags={['OCR', 'Auto-fill', 'Έλεγχος διπλών', 'Σύνδεση δαπανών']}
            ctaHref={upgradeHref}
            ctaLabel="Αναβάθμιση Premium"
            icon={<FileText className="h-5 w-5" />}
          />
        )}
      </SubscriptionGate>
    </AuthGate>
  );
}

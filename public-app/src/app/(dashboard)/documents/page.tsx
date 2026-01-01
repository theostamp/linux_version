'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';
import { InvoiceUploadForm } from '@/components/financial/InvoiceUploadForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileText, Sparkles, Loader2 } from 'lucide-react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { createArchiveDocument } from '@/lib/api';
import { api } from '@/lib/api';
import { ScannedInvoiceData, ExpenseFormData } from '@/types/financial';
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
    return JSON.parse(body);
  } catch {
    return null;
  }
}

function DocumentsContent() {
  const router = useRouter();
  const { selectedBuilding, buildings, setSelectedBuilding } = useBuilding();

  const [isSaving, setIsSaving] = useState(false);

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
  ) => {
    const archiveData = new FormData();
    archiveData.append('building', buildingId.toString());
    archiveData.append('category', 'expense_receipt');
    archiveData.append('file', file);
    if (allowDuplicate) archiveData.append('allow_duplicate', 'true');

    if (scannedData.document_type) archiveData.append('document_type', scannedData.document_type);
    if (scannedData.document_number) archiveData.append('document_number', scannedData.document_number);
    if (scannedData.supplier) archiveData.append('supplier_name', scannedData.supplier);
    if (scannedData.supplier_vat) archiveData.append('supplier_vat', scannedData.supplier_vat);
    if (scannedData.date) archiveData.append('document_date', scannedData.date);
    if (scannedData.amount !== null && scannedData.amount !== undefined) {
      archiveData.append('amount', scannedData.amount.toString());
    }

    const title =
      scannedData.description ||
      scannedData.supplier ||
      file.name ||
      'Παραστατικό Δαπάνης';
    archiveData.append('title', title);

    return archiveData;
  };

  const performSave = async (
    buildingId: number,
    save: PendingSave,
    options?: { allowDuplicate?: boolean }
  ) => {
    if (isSaving) return;

    const { scannedData, file, shouldArchive } = save;

    if (!buildingId) {
      toast.error('Παρακαλώ επιλέξτε ένα κτίριο');
      return;
    }
    if (!scannedData.amount || !scannedData.date) {
      toast.error('Παρακαλώ συμπληρώστε το ποσό και την ημερομηνία');
      return;
    }

    setIsSaving(true);
    let archivedDoc: any | null = null;

    try {
      if (shouldArchive && file) {
        const archiveData = buildArchiveFormData(buildingId, scannedData, file, Boolean(options?.allowDuplicate));
        try {
          archivedDoc = await createArchiveDocument(archiveData);
        } catch (archiveError: any) {
          const parsed = parseApiErrorBody(archiveError);
          const statusCode = archiveError?.status ?? archiveError?.response?.status;

          if (statusCode === 409 && parsed?.code === 'PROBABLE_DUPLICATE') {
            setDuplicateInfo({
              reason: parsed?.reason,
              existing_ids: parsed?.existing_ids,
            });
            setPendingDuplicate({ buildingId, save });
            setDuplicateDialogOpen(true);
            toast.warning('Βρέθηκε πιθανό διπλό παραστατικό. Επιβεβαιώστε για να συνεχίσετε.');
            return;
          }

          throw archiveError;
        }
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
    } catch (error: any) {
      console.error('Error creating expense:', error);
      toast.error(error?.message || 'Σφάλμα κατά τη δημιουργία της δαπάνης');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async (scannedData: ScannedInvoiceData, file: File | null, shouldArchive: boolean) => {
    if (isSaving) return;

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
      return;
    }

    if (!targetBuildingId) {
      toast.error('Παρακαλώ επιλέξτε ένα κτίριο');
      return;
    }

    await performSave(targetBuildingId, save, { allowDuplicate: false });
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

    setBuildingDialogOpen(false);
    setPendingSave(null);

    await performSave(chosenId, save, { allowDuplicate: false });
  };

  const handleConfirmDuplicateContinue = async () => {
    const ctx = pendingDuplicate;
    if (!ctx) return;
    setDuplicateDialogOpen(false);
    setPendingDuplicate(null);
    await performSave(ctx.buildingId, ctx.save, { allowDuplicate: true });
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
            <li>Ανέβασε εικόνα ή PDF παραστατικού (JPG, PNG, WebP, PDF)</li>
            <li>Το AI αναλύει το παραστατικό και εξάγει: ποσό, ημερομηνία, προμηθευτή, κατηγορία</li>
            <li>Ελέγξε και επεξεργάσου τα αποτελέσματα</li>
            <li>Αποθήκευσε τη δαπάνη με ένα κλικ</li>
          </ul>
        </CardContent>
      </Card>

      {/* Invoice Upload Form */}
      <InvoiceUploadForm onSave={handleSave} />

      {/* Building confirmation (when recognition is not confident) */}
      <AlertDialog
        open={buildingDialogOpen}
        onOpenChange={(open) => {
          setBuildingDialogOpen(open);
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
            title="Παραστατικά με AI αναγνώριση"
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
                title: 'OCR + AI ανάλυση',
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

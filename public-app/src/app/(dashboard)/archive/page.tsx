'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, FolderArchive, Upload, Search, ExternalLink, Trash2, Loader2 } from 'lucide-react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import {
  createArchiveDocument,
  deleteArchiveDocument,
  fetchArchiveDocuments,
  fetchArchiveCategories,
  fetchArchiveDocumentTypes,
  extractResults,
} from '@/lib/api';
import type { ArchiveDocument, ArchiveDocumentCategory, ArchiveDocumentType } from '@/types/archive';
import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
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

const FALLBACK_CATEGORIES: { value: ArchiveDocumentCategory; label: string }[] = [
  { value: 'assembly_minutes', label: 'Πρακτικά Γενικής Συνέλευσης' },
  { value: 'building_plans', label: 'Κατόψεις Κτιρίου' },
  { value: 'expense_receipt', label: 'Παραστατικά Δαπανών' },
  { value: 'payment_receipt', label: 'Αποδείξεις Πληρωμής' },
  { value: 'income_receipt', label: 'Αποδείξεις Είσπραξης' },
  { value: 'regulations', label: 'Εσωτερικός Κανονισμός' },
  { value: 'maintenance_contract', label: 'Συμβάσεις Συντήρησης' },
  { value: 'insurance', label: 'Ασφάλεια Κτιρίου' },
  { value: 'certificate', label: 'Πιστοποιητικά' },
  { value: 'other', label: 'Λοιπά' },
];

const FALLBACK_DOCUMENT_TYPES: { value: ArchiveDocumentType; label: string }[] = [
  { value: 'invoice', label: 'Τιμολόγιο' },
  { value: 'receipt', label: 'Απόδειξη' },
  { value: 'credit_note', label: 'Πιστωτικό' },
  { value: 'debit_note', label: 'Χρεωστικό' },
  { value: 'other', label: 'Άλλο' },
];

type UploadFormState = {
  file: File | null;
  category: ArchiveDocumentCategory | '';
  document_type: ArchiveDocumentType | '';
  document_number: string;
  supplier_name: string;
  supplier_vat: string;
  document_date: string;
  amount: string;
  title: string;
  description: string;
};

const initialUploadState: UploadFormState = {
  file: null,
  category: '',
  document_type: '',
  document_number: '',
  supplier_name: '',
  supplier_vat: '',
  document_date: '',
  amount: '',
  title: '',
  description: '',
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('el-GR');
  } catch {
    return value;
  }
}

function ArchiveContent() {
  const { selectedBuilding } = useBuilding();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [uploadForm, setUploadForm] = useState<UploadFormState>(initialUploadState);
  const [isUploading, setIsUploading] = useState(false);
  const [openingDocId, setOpeningDocId] = useState<number | null>(null);
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<ArchiveDocument | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<number | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const categoriesQ = useQuery({
    queryKey: ['archive-categories'],
    queryFn: fetchArchiveCategories,
  });

  const documentTypesQ = useQuery({
    queryKey: ['archive-document-types'],
    queryFn: fetchArchiveDocumentTypes,
  });

  const documentsQ = useQuery({
    queryKey: ['archive-documents', selectedBuilding?.id, categoryFilter, searchTerm],
    queryFn: async () => {
      if (!selectedBuilding?.id) return [];
      const params: Record<string, unknown> = {
        building: selectedBuilding.id,
      };
      if (categoryFilter !== 'all') {
        params.category = categoryFilter;
      }
      if (searchTerm) {
        params.search = searchTerm;
      }
      const response = await fetchArchiveDocuments(params);
      return extractResults<ArchiveDocument>(response);
    },
    enabled: Boolean(selectedBuilding?.id),
  });

  const documents = documentsQ.data ?? [];
  const allSelected = documents.length > 0 && selectedDocIds.length === documents.length;
  const isAnyDeleting = Boolean(deletingDocId) || isBulkDeleting;

  // Safety: if filters change, clear selection to avoid bulk actions on hidden rows
  useEffect(() => {
    setSelectedDocIds([]);
  }, [selectedBuilding?.id, categoryFilter, searchTerm]);

  const categories = categoriesQ.data && categoriesQ.data.length > 0 ? categoriesQ.data : FALLBACK_CATEGORIES;
  const documentTypes = documentTypesQ.data && documentTypesQ.data.length > 0 ? documentTypesQ.data : FALLBACK_DOCUMENT_TYPES;

  const categoryLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((item) => map.set(item.value, item.label));
    return map;
  }, [categories]);

  const documentTypeLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    documentTypes.forEach((item) => map.set(item.value, item.label));
    return map;
  }, [documentTypes]);

  const handleFileChange = (file: File | null) => {
    setUploadForm((prev) => ({ ...prev, file }));
  };

  const toggleDocSelection = (docId: number) => {
    setSelectedDocIds((prev) => (prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]));
  };

  const handleToggleSelectAllVisible = (shouldSelect?: boolean) => {
    const next = typeof shouldSelect === 'boolean' ? shouldSelect : !allSelected;
    setSelectedDocIds(next ? documents.map((d) => d.id) : []);
  };

  const requestSingleDelete = (doc: ArchiveDocument) => {
    setDocToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const handleConfirmSingleDelete = async () => {
    if (!docToDelete?.id) return;
    const docId = docToDelete.id;
    setDeletingDocId(docId);
    try {
      await deleteArchiveDocument(docId);
      toast.success('Το αρχείο διαγράφηκε');
      setSelectedDocIds((prev) => prev.filter((id) => id !== docId));
      setDeleteDialogOpen(false);
      setDocToDelete(null);
      documentsQ.refetch();
    } catch (error: any) {
      console.error('Archive delete failed:', error);
      toast.error(error?.message || 'Σφάλμα κατά τη διαγραφή');
    } finally {
      setDeletingDocId(null);
    }
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedDocIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      const results = await Promise.allSettled(selectedDocIds.map((id) => deleteArchiveDocument(id)));
      const failed = results.filter((r) => r.status === 'rejected');
      const succeeded = results.length - failed.length;

      if (succeeded > 0) {
        toast.success(`Διαγράφηκαν ${succeeded} ${succeeded === 1 ? 'αρχείο' : 'αρχεία'}`);
      }
      if (failed.length > 0) {
        toast.error(`Αποτυχία διαγραφής ${failed.length} ${failed.length === 1 ? 'αρχείου' : 'αρχείων'}`);
      }

      setSelectedDocIds([]);
      setBulkDeleteDialogOpen(false);
      documentsQ.refetch();
    } catch (error: any) {
      console.error('Archive bulk delete failed:', error);
      toast.error(error?.message || 'Σφάλμα κατά τη μαζική διαγραφή');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handlePreview = async (doc: ArchiveDocument) => {
    if (!doc?.id || !doc.file_url) return;

    setOpeningDocId(doc.id);
    try {
      const token =
        localStorage.getItem('access_token') ||
        localStorage.getItem('access') ||
        localStorage.getItem('accessToken');

      if (!token) {
        toast.error('Δεν βρέθηκαν διαπιστευτήρια. Παρακαλώ συνδεθείτε ξανά.');
        return;
      }

      // Stream the file directly (no Blob-in-memory). This avoids white/blank tabs for large files.
      const url = new URL(doc.file_url, window.location.origin);
      url.searchParams.set('token', token);

      const previewWindow = window.open(url.toString(), '_blank', 'noopener,noreferrer');
      if (!previewWindow) {
        toast.error('Το πρόγραμμα περιήγησης μπλοκάρει το άνοιγμα νέας καρτέλας. Επιτρέψτε τα popups και δοκιμάστε ξανά.');
      }
    } catch (error) {
      console.error('[Archive] Preview failed', error);
      toast.error('Αποτυχία προβολής αρχείου');
    } finally {
      setOpeningDocId((prev) => (prev === doc.id ? null : prev));
    }
  };

  const handleUpload = async () => {
    if (!selectedBuilding?.id) {
      toast.error('Παρακαλώ επιλέξτε κτίριο');
      return;
    }
    if (!uploadForm.file) {
      toast.error('Παρακαλώ επιλέξτε αρχείο');
      return;
    }
    if (!uploadForm.category) {
      toast.error('Παρακαλώ επιλέξτε κατηγορία');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('building', selectedBuilding.id.toString());
      formData.append('category', uploadForm.category);
      formData.append('file', uploadForm.file);

      if (uploadForm.title) formData.append('title', uploadForm.title);
      if (uploadForm.description) formData.append('description', uploadForm.description);
      if (uploadForm.document_type) formData.append('document_type', uploadForm.document_type);
      if (uploadForm.document_number) formData.append('document_number', uploadForm.document_number);
      if (uploadForm.supplier_name) formData.append('supplier_name', uploadForm.supplier_name);
      if (uploadForm.supplier_vat) formData.append('supplier_vat', uploadForm.supplier_vat);
      if (uploadForm.document_date) formData.append('document_date', uploadForm.document_date);
      if (uploadForm.amount) formData.append('amount', uploadForm.amount);

      await createArchiveDocument(formData);
      toast.success('Το αρχείο αποθηκεύτηκε στο Ηλεκτρονικό Αρχείο');
      setUploadForm(initialUploadState);
      documentsQ.refetch();
    } catch (error: any) {
      console.error('Archive upload failed:', error);
      toast.error(error?.message || 'Σφάλμα κατά την αποθήκευση του αρχείου');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="w-7 h-7" />
              Ηλεκτρονικό Αρχείο
            </h1>
            <p className="text-muted-foreground">
              Κεντρική αποθήκευση αρχείων πολυκατοικίας με κατηγοριοποίηση και αναζήτηση.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Νέα Καταχώριση</CardTitle>
              <CardDescription>Ανεβάστε αρχείο και συμπληρώστε τα στοιχεία του.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="archive-file">Αρχείο</Label>
                  <Input
                    id="archive-file"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                    onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
                  />
                  {uploadForm.file && (
                    <p className="text-xs text-muted-foreground truncate">
                      Επιλεγμένο: {uploadForm.file.name}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Κατηγορία</Label>
                  <Select
                    value={uploadForm.category}
                    onValueChange={(value) => setUploadForm((prev) => ({ ...prev, category: value as ArchiveDocumentCategory }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Επιλέξτε κατηγορία" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Είδος Παραστατικού</Label>
                  <Select
                    value={uploadForm.document_type}
                    onValueChange={(value) => setUploadForm((prev) => ({ ...prev, document_type: value as ArchiveDocumentType }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Προαιρετικό" />
                    </SelectTrigger>
                    <SelectContent>
                      {documentTypes.map((docType) => (
                        <SelectItem key={docType.value} value={docType.value}>
                          {docType.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="document-number">Αριθμός Παραστατικού</Label>
                  <Input
                    id="document-number"
                    value={uploadForm.document_number}
                    onChange={(event) => setUploadForm((prev) => ({ ...prev, document_number: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier-name">Προμηθευτής</Label>
                  <Input
                    id="supplier-name"
                    value={uploadForm.supplier_name}
                    onChange={(event) => setUploadForm((prev) => ({ ...prev, supplier_name: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier-vat">ΑΦΜ Προμηθευτή</Label>
                  <Input
                    id="supplier-vat"
                    value={uploadForm.supplier_vat}
                    onChange={(event) => setUploadForm((prev) => ({ ...prev, supplier_vat: event.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="document-date">Ημερομηνία</Label>
                  <Input
                    id="document-date"
                    type="date"
                    value={uploadForm.document_date}
                    onChange={(event) => setUploadForm((prev) => ({ ...prev, document_date: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Ποσό</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={uploadForm.amount}
                    onChange={(event) => setUploadForm((prev) => ({ ...prev, amount: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Τίτλος</Label>
                  <Input
                    id="title"
                    value={uploadForm.title}
                    onChange={(event) => setUploadForm((prev) => ({ ...prev, title: event.target.value }))}
                    placeholder="Π.χ. ΔΕΗ Φεβρουαρίου"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Περιγραφή</Label>
                <Textarea
                  id="description"
                  rows={3}
                  value={uploadForm.description}
                  onChange={(event) => setUploadForm((prev) => ({ ...prev, description: event.target.value }))}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleUpload} disabled={isUploading}>
                  <Upload className="w-4 h-4 mr-2" />
                  {isUploading ? 'Αποθήκευση...' : 'Αποθήκευση'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Καταχωρίσεις</CardTitle>
              <CardDescription>Αναζήτηση και προβολή αρχείων ανά κατηγορία.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Αναζήτηση (τίτλος, αριθμός, ΑΦΜ, προμηθευτής)"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full lg:w-64">
                    <SelectValue placeholder="Όλες οι κατηγορίες" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Όλες οι κατηγορίες</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {documents.length > 0 ? (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="text-sm text-muted-foreground">
                    {selectedDocIds.length > 0 ? (
                      <>
                        <span className="font-medium text-foreground">{selectedDocIds.length}</span> επιλεγμένα
                      </>
                    ) : (
                      <>
                        Σύνολο: <span className="font-medium text-foreground">{documents.length}</span>
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleSelectAllVisible()}
                      disabled={documents.length === 0 || isAnyDeleting}
                    >
                      {allSelected ? 'Αποεπιλογή όλων' : 'Επιλογή όλων'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDocIds([])}
                      disabled={selectedDocIds.length === 0 || isAnyDeleting}
                    >
                      Καθαρισμός
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setBulkDeleteDialogOpen(true)}
                      disabled={selectedDocIds.length === 0 || isAnyDeleting}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Διαγραφή ({selectedDocIds.length})
                    </Button>
                  </div>
                </div>
              ) : null}

              {documentsQ.isLoading ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Φόρτωση αρχείου...
                </div>
              ) : documentsQ.data && documentsQ.data.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Δεν υπάρχουν αρχεία για τα τρέχοντα φίλτρα.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[44px]">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={(v) => handleToggleSelectAllVisible(Boolean(v))}
                          disabled={documents.length === 0 || isAnyDeleting}
                          aria-label="Επιλογή όλων"
                        />
                      </TableHead>
                      <TableHead>Τίτλος</TableHead>
                      <TableHead>Κατηγορία</TableHead>
                      <TableHead>Είδος</TableHead>
                      <TableHead>Αριθμός</TableHead>
                      <TableHead>ΑΦΜ</TableHead>
                      <TableHead>Ημερομηνία</TableHead>
                      <TableHead className="text-right">Ενέργειες</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(documentsQ.data ?? []).map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="align-top">
                          <Checkbox
                            checked={selectedDocIds.includes(doc.id)}
                            onCheckedChange={() => toggleDocSelection(doc.id)}
                            disabled={isAnyDeleting}
                            aria-label={`Επιλογή αρχείου ${doc.id}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {doc.title || doc.original_filename || '—'}
                        </TableCell>
                        <TableCell>{categoryLabelMap.get(doc.category) || doc.category}</TableCell>
                        <TableCell>
                          {doc.document_type ? (documentTypeLabelMap.get(doc.document_type) || doc.document_type) : '—'}
                        </TableCell>
                        <TableCell>{doc.document_number || '—'}</TableCell>
                        <TableCell>{doc.supplier_vat || '—'}</TableCell>
                        <TableCell>{formatDate(doc.document_date)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {doc.file_url ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePreview(doc)}
                                disabled={openingDocId === doc.id || isAnyDeleting}
                              >
                                <ExternalLink className="w-4 h-4 mr-1" />
                                {openingDocId === doc.id ? 'Άνοιγμα…' : 'Προβολή'}
                              </Button>
                            ) : null}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => requestSingleDelete(doc)}
                              disabled={isAnyDeleting}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Διαγραφή
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Single delete confirmation */}
          <AlertDialog
            open={deleteDialogOpen}
            onOpenChange={(open) => {
              setDeleteDialogOpen(open);
              if (!open) setDocToDelete(null);
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Διαγραφή αρχείου</AlertDialogTitle>
                <AlertDialogDescription>
                  Θέλετε σίγουρα να διαγράψετε το αρχείο{' '}
                  <span className="font-medium text-foreground">
                    {docToDelete?.title || docToDelete?.original_filename || `#${docToDelete?.id ?? ''}`}
                  </span>
                  ; Η ενέργεια είναι μη αναστρέψιμη.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={Boolean(deletingDocId)}>Ακύρωση</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirmSingleDelete}
                  disabled={Boolean(deletingDocId)}
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                >
                  {Boolean(deletingDocId) ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Διαγραφή...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Διαγραφή
                    </>
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Bulk delete confirmation */}
          <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Διαγραφή επιλεγμένων</AlertDialogTitle>
                <AlertDialogDescription>
                  Θα διαγραφούν οριστικά{' '}
                  <span className="font-medium text-foreground">{selectedDocIds.length}</span>{' '}
                  {selectedDocIds.length === 1 ? 'αρχείο' : 'αρχεία'}. Η ενέργεια είναι μη αναστρέψιμη.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isBulkDeleting}>Ακύρωση</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirmBulkDelete}
                  disabled={isBulkDeleting || selectedDocIds.length === 0}
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                >
                  {isBulkDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Διαγραφή...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Διαγραφή
                    </>
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
    </div>
  );
}

function ArchiveGate() {
  const { buildingContext, isLoadingContext } = useBuilding();
  const premiumEnabled = Boolean(
    buildingContext?.billing?.kiosk_enabled ?? buildingContext?.premium_enabled ?? false
  );
  const pricingHref = 'https://newconcierge.app/pricing';

  if (isLoadingContext && !buildingContext) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
          <p>Έλεγχος Premium...</p>
        </div>
      </div>
    );
  }

  if (!premiumEnabled) {
    return (
      <PremiumFeatureInfo
        title="Ηλεκτρονικό Αρχείο Πολυκατοικίας"
        description="Κράτα όλα τα έγγραφα σε ένα σημείο με κατηγορίες, μεταδεδομένα και ισχυρή αναζήτηση. Οργάνωσε πρακτικά, συμβάσεις και παραστατικά χωρίς χαμένο χρόνο."
        note="Απαιτείται ενεργή Premium συνδρομή για το επιλεγμένο κτίριο."
        bullets={[
          'Κατηγοριοποίηση εγγράφων με ευέλικτα φίλτρα και προβολές.',
          'Μεταδεδομένα (αριθμός, ΑΦΜ, ημερομηνία, ποσό) για εύκολη αναζήτηση.',
          'Άμεσο preview PDF/εικόνων χωρίς εξαγωγές.',
          'Σύνδεση με παραστατικά και οικονομικές κινήσεις.',
        ]}
        highlights={[
          {
            title: 'Ταξινόμηση & φίλτρα',
            description: 'Βρες αμέσως ό,τι χρειάζεσαι με κατηγορίες και έξυπνη αναζήτηση.',
          },
          {
            title: 'Ασφαλής πρόσβαση',
            description: 'Ορισμός πρόσβασης ανά ρόλο και πλήρες ιστορικό ενεργειών.',
          },
          {
            title: 'Προβολή αρχείων',
            description: 'Άνοιξε έγγραφα σε νέα καρτέλα χωρίς να βαραίνει η εφαρμογή.',
          },
        ]}
        tags={['Κατηγορίες', 'Μεταδεδομένα', 'Αναζήτηση', 'Preview']}
        ctaHref={pricingHref}
        ctaLabel="Premium συνδρομή"
        ctaExternal
        icon={<FolderArchive className="h-5 w-5" />}
      />
    );
  }

  return <ArchiveContent />;
}

export default function ArchivePage() {
  return (
    <AuthGate role={['manager', 'staff', 'superuser']}>
      <SubscriptionGate requiredStatus="any">
        <ArchiveGate />
      </SubscriptionGate>
    </AuthGate>
  );
}

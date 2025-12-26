'use client';

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Upload, Search, ExternalLink } from 'lucide-react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { createArchiveDocument, fetchArchiveDocuments, fetchArchiveCategories, fetchArchiveDocumentTypes, extractResults } from '@/lib/api';
import type { ArchiveDocument, ArchiveDocumentCategory, ArchiveDocumentType } from '@/types/archive';
import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';
import { toast } from 'sonner';

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

export default function ArchivePage() {
  const { selectedBuilding } = useBuilding();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [uploadForm, setUploadForm] = useState<UploadFormState>(initialUploadState);
  const [isUploading, setIsUploading] = useState(false);

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
    <AuthGate role={['manager', 'staff', 'superuser']}>
      <SubscriptionGate requiredStatus="any">
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
                      <TableHead>Τίτλος</TableHead>
                      <TableHead>Κατηγορία</TableHead>
                      <TableHead>Είδος</TableHead>
                      <TableHead>Αριθμός</TableHead>
                      <TableHead>ΑΦΜ</TableHead>
                      <TableHead>Ημερομηνία</TableHead>
                      <TableHead className="text-right">Αρχείο</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(documentsQ.data ?? []).map((doc) => (
                      <TableRow key={doc.id}>
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
                          {doc.file_url ? (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={doc.file_url} target="_blank" rel="noreferrer">
                                <ExternalLink className="w-4 h-4 mr-1" />
                                Προβολή
                              </a>
                            </Button>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </SubscriptionGate>
    </AuthGate>
  );
}

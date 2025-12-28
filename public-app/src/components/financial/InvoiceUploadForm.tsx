'use client';

import React, { useState, useEffect } from 'react';
import { useInvoiceScan } from '@/hooks/useInvoiceScan';
import { ScannedInvoiceData, ExpenseCategory } from '@/types/financial';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Loader2, Upload, CheckCircle, AlertCircle, FileText } from 'lucide-react';

interface InvoiceUploadFormProps {
  onSave?: (data: ScannedInvoiceData, file: File | null, shouldArchive: boolean) => void;
  onCancel?: () => void;
}

// Category mapping from AI categories to Expense model categories
const CATEGORY_MAPPING: Record<string, ExpenseCategory> = {
  'DEH': ExpenseCategory.ELECTRICITY_COMMON,
  'EYDAP': ExpenseCategory.WATER_COMMON,
  'HEATING': ExpenseCategory.HEATING_FUEL,
  'CLEANING': ExpenseCategory.CLEANING,
  'MAINTENANCE': ExpenseCategory.BUILDING_MAINTENANCE,
  'ELEVATOR': ExpenseCategory.ELEVATOR_MAINTENANCE,
  'OTHER': ExpenseCategory.MISCELLANEOUS,
};

// Category display labels
const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  [ExpenseCategory.ELECTRICITY_COMMON]: 'ΔΕΗ Κοινοχρήστων',
  [ExpenseCategory.WATER_COMMON]: 'Νερό Κοινοχρήστων',
  [ExpenseCategory.HEATING_FUEL]: 'Πετρέλαιο Θέρμανσης',
  [ExpenseCategory.CLEANING]: 'Καθαρισμός Κοινοχρήστων Χώρων',
  [ExpenseCategory.BUILDING_MAINTENANCE]: 'Συντήρηση Κτιρίου',
  [ExpenseCategory.ELEVATOR_MAINTENANCE]: 'Ετήσια Συντήρηση Ανελκυστήρα',
  [ExpenseCategory.MISCELLANEOUS]: 'Διάφορες Δαπάνες',
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  invoice: 'Τιμολόγιο',
  receipt: 'Απόδειξη',
  credit_note: 'Πιστωτικό',
  debit_note: 'Χρεωστικό',
  other: 'Άλλο',
};

export const InvoiceUploadForm: React.FC<InvoiceUploadFormProps> = ({ onSave, onCancel }) => {
  const { scanInvoiceAsync, isLoading, error, data: scannedData, reset } = useInvoiceScan();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [shouldArchive, setShouldArchive] = useState(true);
  const [formData, setFormData] = useState<ScannedInvoiceData>({
    amount: null,
    date: null,
    supplier: null,
    supplier_vat: null,
    document_number: null,
    document_type: null,
    category: null,
    description: null,
    building_suggestion: null,
    service_address: null,
    service_city: null,
    service_postal_code: null,
  });

  // Update form data when scan completes
  useEffect(() => {
    if (scannedData) {
      setFormData({
        amount: scannedData.amount,
        date: scannedData.date,
        supplier: scannedData.supplier,
        supplier_vat: scannedData.supplier_vat ?? null,
        document_number: scannedData.document_number ?? null,
        document_type: scannedData.document_type ?? null,
        category: scannedData.category ? CATEGORY_MAPPING[scannedData.category] || null : null,
        description: scannedData.description,
        building_suggestion: scannedData.building_suggestion ?? null,
        service_address: scannedData.service_address ?? null,
        service_city: scannedData.service_city ?? null,
        service_postal_code: scannedData.service_postal_code ?? null,
      });
    }
  }, [scannedData]);

  const handleFileSelect = async (files: File[]) => {
    if (files.length === 0) return;

    const file = files[0];
    setSelectedFile(file);

    const filename = file.name.toLowerCase();
    const isPdf = file.type === 'application/pdf' || filename.endsWith('.pdf');
    const isImage =
      file.type.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(file.name);

    // Create preview (images only)
    if (isImage && !isPdf) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }

    // Automatically trigger scan
    try {
      await scanInvoiceAsync(file);
    } catch (err) {
      console.error('Scan failed:', err);
    }
  };

  const handleInputChange = (field: keyof ScannedInvoiceData, value: string | number | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    console.log('[InvoiceUploadForm] handleSave called:', {
      hasFile: !!selectedFile,
      fileName: selectedFile?.name,
      fileSize: selectedFile?.size,
      shouldArchive,
      formData,
    });

    if (onSave) {
      onSave(formData, selectedFile, shouldArchive);
    } else {
      // Mock save action
      console.log('Saving expense data:', formData);
      alert('Η δαπάνη αποθηκεύτηκε (mock action)');
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setShouldArchive(true);
    setFormData({
      amount: null,
      date: null,
      supplier: null,
      supplier_vat: null,
      document_number: null,
      document_type: null,
      category: null,
      description: null,
      building_suggestion: null,
      service_address: null,
      service_city: null,
      service_postal_code: null,
    });
    reset();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ανάλυση Παραστατικού</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Upload Area & Image Preview */}
            <div className="space-y-4">
              {!selectedFile ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFileSelect(Array.from(e.target.files));
                      }
                    }}
                    className="hidden"
                    id="invoice-upload"
                  />
                  <label
                    htmlFor="invoice-upload"
                    className="cursor-pointer flex flex-col items-center space-y-4"
                  >
                    <Upload className="w-12 h-12 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Κάντε κλικ για επιλογή εικόνας ή PDF παραστατικού
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        ή σύρετε το αρχείο εδώ
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        Υποστηριζόμενοι τύποι: JPG, PNG, WebP, PDF (μέχρι 10MB)
                      </p>
                    </div>
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  {isLoading ? (
                    <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center bg-blue-50">
                      <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                      <p className="text-sm font-medium text-gray-700">
                        Ανάλυση παραστατικού...
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Παρακαλώ περιμένετε
                      </p>
                    </div>
                  ) : (
                    <div className="relative">
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Invoice preview"
                          className="w-full rounded-lg border border-gray-200"
                        />
                      ) : (
                        <div className="w-full rounded-lg border border-gray-200 bg-gray-50 p-6 flex items-center gap-3">
                          <FileText className="w-6 h-6 text-gray-500" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-700 truncate">
                              {selectedFile.name}
                            </p>
                            <p className="text-xs text-gray-500">PDF</p>
                          </div>
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReset}
                        className="absolute top-2 right-2"
                      >
                        Αλλαγή Αρχείου
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {error.message || 'Σφάλμα κατά την ανάλυση του παραστατικού'}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Right: Review Form */}
            {scannedData && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-green-600 mb-4">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Η ανάλυση ολοκληρώθηκε</span>
                </div>

                <div className="space-y-4">
                  {/* Amount */}
                  <div className="space-y-2">
                    <Label htmlFor="amount">Ποσό (€) *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount ?? ''}
                      onChange={(e) => handleInputChange('amount', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="0.00"
                    />
                  </div>

                  {/* Date */}
                  <div className="space-y-2">
                    <Label htmlFor="date">Ημερομηνία *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date ?? ''}
                      onChange={(e) => handleInputChange('date', e.target.value || null)}
                    />
                  </div>

                  {/* Supplier */}
                  <div className="space-y-2">
                    <Label htmlFor="supplier">Προμηθευτής</Label>
                    <Input
                      id="supplier"
                      type="text"
                      value={formData.supplier ?? ''}
                      onChange={(e) => handleInputChange('supplier', e.target.value || null)}
                      placeholder="Όνομα εταιρείας/προμηθευτή"
                    />
                  </div>

                  {/* Supplier VAT */}
                  <div className="space-y-2">
                    <Label htmlFor="supplier-vat">ΑΦΜ Προμηθευτή</Label>
                    <Input
                      id="supplier-vat"
                      type="text"
                      value={formData.supplier_vat ?? ''}
                      onChange={(e) => handleInputChange('supplier_vat', e.target.value || null)}
                      placeholder="π.χ. 094123123"
                    />
                  </div>

                  {/* Document Number */}
                  <div className="space-y-2">
                    <Label htmlFor="document-number">Αριθμός Παραστατικού</Label>
                    <Input
                      id="document-number"
                      type="text"
                      value={formData.document_number ?? ''}
                      onChange={(e) => handleInputChange('document_number', e.target.value || null)}
                      placeholder="π.χ. 12345"
                    />
                  </div>

                  {/* Document Type */}
                  <div className="space-y-2">
                    <Label htmlFor="document-type">Είδος Παραστατικού</Label>
                    <Select
                      value={formData.document_type ?? ''}
                      onValueChange={(value) => handleInputChange('document_type', value || null)}
                    >
                      <SelectTrigger id="document-type">
                        <SelectValue placeholder="Επιλέξτε είδος" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <Label htmlFor="category">Κατηγορία</Label>
                    <Select
                      value={formData.category ?? ''}
                      onValueChange={(value) => handleInputChange('category', value || null)}
                    >
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Επιλέξτε κατηγορία" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CATEGORY_MAPPING).map(([aiCategory, expenseCategory]) => (
                          <SelectItem key={expenseCategory} value={expenseCategory}>
                            {CATEGORY_LABELS[expenseCategory] || expenseCategory}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Περιγραφή</Label>
                    <Textarea
                      id="description"
                      value={formData.description ?? ''}
                      onChange={(e) => handleInputChange('description', e.target.value || null)}
                      placeholder="Σύντομη περιγραφή"
                      rows={3}
                    />
                  </div>

                  {/* Archive Toggle - More Visible */}
                  <div className="flex items-center justify-between gap-4 rounded-lg border-2 border-primary/20 bg-primary/5 px-4 py-3">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor="archive-toggle" className="text-sm font-semibold text-foreground">
                        Καταχώρηση στο Ηλεκτρονικό Αρχείο
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {shouldArchive
                          ? 'Το παραστατικό θα αποθηκευτεί αυτόματα στο ηλεκτρονικό αρχείο'
                          : 'Το παραστατικό δεν θα αποθηκευτεί στο αρχείο'}
                      </p>
                    </div>
                    <Switch
                      id="archive-toggle"
                      checked={shouldArchive}
                      onCheckedChange={(checked) => {
                        console.log('[InvoiceUploadForm] Archive toggle changed:', checked);
                        setShouldArchive(Boolean(checked));
                      }}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3 pt-4">
                    <Button
                      onClick={handleSave}
                      className="flex-1"
                      disabled={!formData.amount || !formData.date}
                    >
                      Αποθήκευση Δαπάνης
                    </Button>
                    {onCancel && (
                      <Button
                        variant="outline"
                        onClick={onCancel}
                      >
                        Ακύρωση
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

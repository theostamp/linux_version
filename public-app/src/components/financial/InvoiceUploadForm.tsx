'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useInvoiceScan } from '@/hooks/useInvoiceScan';
import { ScannedInvoiceData, ExpenseCategory, Expense } from '@/types/financial';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import {
  Loader2,
  Upload,
  CheckCircle,
  AlertCircle,
  FileText,
  Sparkles,
  Clock,
  Trash2,
  RefreshCw,
} from 'lucide-react';

interface InvoiceUploadFormProps {
  onSave?: (data: ScannedInvoiceData, file: File | null, shouldArchive: boolean) => Promise<boolean> | boolean | void;
  onCancel?: () => void;
  availableExpenses?: Expense[];
  isLoadingExpenses?: boolean;
}

type QueueStatus = 'queued' | 'scanning' | 'ready' | 'error';
type QueueFileKind = 'image' | 'pdf' | 'file';

interface QueueItem {
  id: string;
  file: File;
  kind: QueueFileKind;
  previewUrl: string | null;
  status: QueueStatus;
  scannedData: ScannedInvoiceData | null;
  formData: ScannedInvoiceData | null;
  error: string | null;
  shouldArchive: boolean;
  createdAt: number;
}

const FILE_ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp,application/pdf';

const QUEUE_STATUS_LABELS: Record<QueueStatus, string> = {
  queued: 'Σε ουρά',
  scanning: 'Ανάλυση',
  ready: 'Έτοιμο',
  error: 'Σφάλμα',
};

const QUEUE_STATUS_VARIANTS: Record<QueueStatus, 'secondary' | 'active' | 'success' | 'destructive'> = {
  queued: 'secondary',
  scanning: 'active',
  ready: 'success',
  error: 'destructive',
};

const FILE_KIND_LABELS: Record<QueueFileKind, string> = {
  image: 'Εικόνα',
  pdf: 'PDF',
  file: 'Αρχείο',
};

const EMPTY_FORM_DATA: ScannedInvoiceData = {
  amount: null,
  date: null,
  supplier: null,
  supplier_vat: null,
  document_number: null,
  document_type: null,
  financial_intent: null,
  category: null,
  description: null,
  building_suggestion: null,
  service_address: null,
  service_city: null,
  service_postal_code: null,
  linked_expense_id: null,
  payment_method: null,
};

// Category mapping from AI categories to Expense model categories
const CATEGORY_MAPPING: Record<string, ExpenseCategory> = {
  DEH: ExpenseCategory.ELECTRICITY_COMMON,
  EYDAP: ExpenseCategory.WATER_COMMON,
  HEATING: ExpenseCategory.HEATING_FUEL,
  CLEANING: ExpenseCategory.CLEANING,
  MAINTENANCE: ExpenseCategory.BUILDING_MAINTENANCE,
  ELEVATOR: ExpenseCategory.ELEVATOR_MAINTENANCE,
  OTHER: ExpenseCategory.MISCELLANEOUS,
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

const FINANCIAL_INTENT_LABELS: Record<string, string> = {
  expense: 'Καταχώρηση Δαπάνης',
  payment_receipt: 'Απόδειξη Πληρωμής',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Μετρητά',
  bank_transfer: 'Τραπεζική Μεταφορά',
  check: 'Επιταγή',
  card: 'Κάρτα',
};

const createQueueId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const getFileKind = (file: File): QueueFileKind => {
  const filename = file.name.toLowerCase();
  const isPdf = file.type === 'application/pdf' || filename.endsWith('.pdf');
  const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(file.name);
  if (isPdf) return 'pdf';
  if (isImage) return 'image';
  return 'file';
};

const createQueueItem = (file: File): QueueItem => {
  const kind = getFileKind(file);
  const previewUrl = kind === 'image' ? URL.createObjectURL(file) : null;

  return {
    id: createQueueId(),
    file,
    kind,
    previewUrl,
    status: 'queued',
    scannedData: null,
    formData: null,
    error: null,
    shouldArchive: true,
    createdAt: Date.now(),
  };
};

const buildFormDataFromScan = (scannedData: ScannedInvoiceData): ScannedInvoiceData => {
  const suggestedIntent =
    scannedData.financial_intent ||
    (scannedData.document_type === 'receipt' ? 'payment_receipt' : 'expense');

  return {
    amount: scannedData.amount,
    date: scannedData.date,
    supplier: scannedData.supplier,
    supplier_vat: scannedData.supplier_vat ?? null,
    document_number: scannedData.document_number ?? null,
    document_type: scannedData.document_type ?? null,
    financial_intent: suggestedIntent,
    category: scannedData.category ? CATEGORY_MAPPING[scannedData.category] || null : null,
    description: scannedData.description,
    building_suggestion: scannedData.building_suggestion ?? null,
    service_address: scannedData.service_address ?? null,
    service_city: scannedData.service_city ?? null,
    service_postal_code: scannedData.service_postal_code ?? null,
    linked_expense_id: scannedData.linked_expense_id ?? null,
    payment_method: scannedData.payment_method ?? null,
  };
};

const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes <= 0) return '0 KB';
  const sizeInKb = bytes / 1024;
  if (sizeInKb < 1024) return `${sizeInKb.toFixed(1)} KB`;
  const sizeInMb = sizeInKb / 1024;
  return `${sizeInMb.toFixed(1)} MB`;
};

export const InvoiceUploadForm: React.FC<InvoiceUploadFormProps> = ({
  onSave,
  onCancel,
  availableExpenses = [],
  isLoadingExpenses = false,
}) => {
  const { scanInvoiceAsync } = useInvoiceScan();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const queueRef = useRef<QueueItem[]>([]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    return () => {
      queueRef.current.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
  }, []);

  useEffect(() => {
    if (queue.length === 0) {
      if (activeId) setActiveId(null);
      return;
    }

    if (!activeId || !queue.some((item) => item.id === activeId)) {
      const nextActive =
        queue.find((item) => item.status === 'ready' || item.status === 'scanning') || queue[0];
      setActiveId(nextActive?.id ?? null);
    }
  }, [queue, activeId]);

  useEffect(() => {
    if (processingId) return;
    const next = queue.find((item) => item.status === 'queued');
    if (!next) return;

    setProcessingId(next.id);
    setQueue((prev) =>
      prev.map((item) =>
        item.id === next.id
          ? {
              ...item,
              status: 'scanning',
              error: null,
            }
          : item
      )
    );

    scanInvoiceAsync(next.file)
      .then((scannedData) => {
        setQueue((prev) =>
          prev.map((item) =>
            item.id === next.id
              ? {
                  ...item,
                  scannedData,
                  formData: buildFormDataFromScan(scannedData),
                  status: 'ready',
                  error: null,
                }
              : item
          )
        );
        setActiveId((current) => current ?? next.id);
      })
      .catch((error) => {
        const message = error?.message || 'Σφάλμα κατά την ανάλυση του παραστατικού';
        setQueue((prev) =>
          prev.map((item) =>
            item.id === next.id
              ? {
                  ...item,
                  status: 'error',
                  error: message,
                }
              : item
          )
        );
      })
      .finally(() => {
        setProcessingId(null);
      });
  }, [queue, processingId, scanInvoiceAsync]);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const list = Array.from(files ?? []);
    if (list.length === 0) return;

    const items = list.map(createQueueItem);
    setQueue((prev) => [...prev, ...items]);
    setActiveId((current) => current ?? items[0]?.id ?? null);
  }, []);

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      handleFiles(event.target.files);
    }
    event.target.value = '';
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      handleFiles(event.dataTransfer.files);
    }
  };

  const removeItem = useCallback((id: string) => {
    setQueue((prev) => {
      const item = prev.find((entry) => entry.id === id);
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((entry) => entry.id !== id);
    });

    setActiveId((current) => {
      if (current !== id) return current;
      const remaining = queueRef.current.filter((entry) => entry.id !== id);
      const nextActive =
        remaining.find((entry) => entry.status === 'ready' || entry.status === 'scanning') || remaining[0];
      return nextActive?.id ?? null;
    });
  }, []);

  const clearQueue = useCallback(() => {
    queueRef.current.forEach((item) => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
    setQueue([]);
    setActiveId(null);
  }, []);

  const retryItem = useCallback((id: string) => {
    setQueue((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: 'queued',
              error: null,
              scannedData: null,
              formData: null,
            }
          : item
      )
    );
  }, []);

  const activeItem = useMemo(
    () => queue.find((item) => item.id === activeId) ?? null,
    [queue, activeId]
  );

  const activeFormData = activeItem?.formData ?? EMPTY_FORM_DATA;

  const handleInputChange = (field: keyof ScannedInvoiceData, value: string | number | null) => {
    if (!activeItem) return;
    setQueue((prev) =>
      prev.map((item) =>
        item.id === activeItem.id
          ? {
              ...item,
              formData: {
                ...(item.formData ?? EMPTY_FORM_DATA),
                [field]: value,
              },
            }
          : item
      )
    );
  };

  const handleArchiveToggle = (checked: boolean) => {
    if (!activeItem) return;
    setQueue((prev) =>
      prev.map((item) =>
        item.id === activeItem.id
          ? {
              ...item,
              shouldArchive: checked,
            }
          : item
      )
    );
  };

  const handleSave = async () => {
    if (!activeItem) return;

    const payload = activeItem.formData ?? EMPTY_FORM_DATA;
    let success = true;

    if (onSave) {
      try {
        const result = onSave(payload, activeItem.file, activeItem.shouldArchive);
        if (typeof (result as Promise<boolean>)?.then === 'function') {
          const resolved = await (result as Promise<boolean>);
          if (typeof resolved === 'boolean') {
            success = resolved;
          }
        } else if (typeof result === 'boolean') {
          success = result;
        }
      } catch (error) {
        success = false;
        console.error('[InvoiceUploadForm] Save failed:', error);
      }
    } else {
      console.log('Saving expense data:', payload);
      alert('Η δαπάνη αποθηκεύτηκε (mock action)');
    }

    if (success) {
      removeItem(activeItem.id);
    }
  };

  const queueStats = useMemo(() => {
    return queue.reduce(
      (acc, item) => {
        acc[item.status] += 1;
        return acc;
      },
      { queued: 0, scanning: 0, ready: 0, error: 0 } as Record<QueueStatus, number>
    );
  }, [queue]);

  const summary = useMemo(() => {
    if (!activeItem?.formData) {
      return { items: [] as Array<{ label: string; value: string }>, confirmationLine: null as string | null };
    }

    const data = activeItem.formData;
    const docTypeLabel = data.document_type
      ? DOCUMENT_TYPE_LABELS[data.document_type] || data.document_type
      : 'Δεν αναγνωρίστηκε';
    const intentLabel = data.financial_intent
      ? FINANCIAL_INTENT_LABELS[data.financial_intent] || data.financial_intent
      : '—';
    const amountLabel = data.amount !== null && data.amount !== undefined
      ? formatCurrency(data.amount)
      : '—';
    const dateLabel = data.date ? formatDate(data.date) : '—';
    const supplierLabel = data.supplier || '—';
    const categoryLabel = data.category
      ? CATEGORY_LABELS[data.category as ExpenseCategory] || data.category
      : '—';

    const suggestion = data.building_suggestion;
    const suggestionName = suggestion?.building_name || suggestion?.candidates?.[0]?.building_name || null;
    const suggestionConfidence =
      typeof suggestion?.confidence === 'number' ? ` (${Math.round(suggestion.confidence * 100)}%)` : '';

    let buildingLabel = 'Δεν αναγνωρίστηκε';
    if (suggestionName) {
      if (suggestion?.status === 'ambiguous') {
        buildingLabel = `Πιθανό: ${suggestionName}${suggestionConfidence}`;
      } else {
        buildingLabel = `${suggestionName}${suggestionConfidence}`;
      }
    }

    const items = [
      { label: 'Τύπος', value: docTypeLabel },
      { label: 'Χρήση', value: intentLabel },
      { label: 'Ποσό', value: amountLabel },
      { label: 'Ημερομηνία', value: dateLabel },
      { label: 'Κτίριο', value: buildingLabel },
      { label: 'Προμηθευτής', value: supplierLabel },
      { label: 'Κατηγορία', value: categoryLabel },
    ];

    const confirmationParts: string[] = [];
    if (intentLabel && intentLabel !== '—') {
      confirmationParts.push(intentLabel.toLowerCase());
    }
    if (amountLabel && amountLabel !== '—') {
      confirmationParts.push(`ποσό ${amountLabel}`);
    }
    if (buildingLabel && buildingLabel !== 'Δεν αναγνωρίστηκε') {
      confirmationParts.push(`κτίριο ${buildingLabel}`);
    }

    const confirmationLine = confirmationParts.length
      ? `Αναγνώρισα ${confirmationParts.join(' · ')}. Προχωράω στην καταχώρηση;`
      : null;

    return { items, confirmationLine };
  }, [activeItem]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ανάλυση Παραστατικών</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-6">
            <div className="space-y-4">
              <div
                className={cn(
                  'border-2 border-dashed rounded-xl p-6 text-center transition-colors',
                  isDragging ? 'border-accent-primary bg-accent-primary/5' : 'border-gray-300 hover:border-gray-400'
                )}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept={FILE_ACCEPT}
                  multiple
                  onChange={handleFileInputChange}
                  className="hidden"
                  id="invoice-upload"
                />
                <label
                  htmlFor="invoice-upload"
                  className="cursor-pointer flex flex-col items-center space-y-3"
                >
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {queue.length === 0
                        ? 'Ανέβασε 1 ή περισσότερα παραστατικά (εικόνα ή PDF)'
                        : 'Πρόσθεσε επιπλέον αρχεία στην ουρά'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Σύρε τα αρχεία εδώ ή κάνε κλικ για επιλογή
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      Υποστηριζόμενοι τύποι: JPG, PNG, WebP, PDF (μέχρι 10MB)
                    </p>
                  </div>
                </label>
              </div>

              {activeItem ? (
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Ενεργό παραστατικό</p>
                      <p className="text-sm font-semibold text-foreground truncate">{activeItem.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(activeItem.file.size)} · {FILE_KIND_LABELS[activeItem.kind]}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={QUEUE_STATUS_VARIANTS[activeItem.status]} className="gap-1">
                        {activeItem.status === 'scanning' && <Loader2 className="h-3 w-3 animate-spin" />}
                        {activeItem.status === 'queued' && <Clock className="h-3 w-3" />}
                        {activeItem.status === 'error' && <AlertCircle className="h-3 w-3" />}
                        {QUEUE_STATUS_LABELS[activeItem.status]}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeItem(activeItem.id)}
                        aria-label="Αφαίρεση αρχείου"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {activeItem.status === 'scanning' ? (
                    <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center bg-blue-50">
                      <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-700">Ανάλυση παραστατικού...</p>
                      <p className="text-xs text-gray-500 mt-1">Παρακαλώ περιμένετε</p>
                    </div>
                  ) : activeItem.previewUrl ? (
                    <img
                      src={activeItem.previewUrl}
                      alt={activeItem.file.name}
                      className="w-full rounded-lg border border-gray-200"
                    />
                  ) : (
                    <div className="w-full rounded-lg border border-gray-200 bg-gray-50 p-6 flex items-center gap-3">
                      <FileText className="w-6 h-6 text-gray-500" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">{activeItem.file.name}</p>
                        <p className="text-xs text-gray-500">PDF</p>
                      </div>
                    </div>
                  )}

                  {activeItem.status === 'error' && activeItem.error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="flex flex-col gap-2">
                        <span>{activeItem.error}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => retryItem(activeItem.id)}
                          className="self-start"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Νέα προσπάθεια
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-sm text-muted-foreground">
                  Κανένα ενεργό έγγραφο. Πρόσθεσε αρχεία για να ξεκινήσει η ανάλυση.
                </div>
              )}

              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Ουρά αναγνώρισης</p>
                    <p className="text-xs text-muted-foreground">
                      Σε ουρά: {queueStats.queued} · Ανάλυση: {queueStats.scanning} · Έτοιμα: {queueStats.ready} · Σφάλματα: {queueStats.error}
                    </p>
                  </div>
                  {queue.length > 0 && (
                    <Button variant="ghost" size="xs" onClick={clearQueue}>
                      Καθαρισμός
                    </Button>
                  )}
                </div>

                {queue.length === 0 ? (
                  <div className="mt-4 text-sm text-muted-foreground">
                    Η ουρά είναι κενή. Ανέβασε έγγραφα για να δημιουργηθεί αυτόματα η λίστα αναγνώρισης.
                  </div>
                ) : (
                  <div className="mt-4 space-y-2 max-h-72 overflow-auto pr-1">
                    {queue.map((item) => {
                      const isActive = item.id === activeId;
                      return (
                        <div
                          key={item.id}
                          onClick={() => setActiveId(item.id)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              setActiveId(item.id);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          className={cn(
                            'w-full flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition-all',
                            isActive
                              ? 'border-primary/40 bg-primary/5 shadow-sm'
                              : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
                          )}
                        >
                          <div className="h-11 w-11 rounded-lg border border-gray-200 bg-white flex items-center justify-center overflow-hidden">
                            {item.previewUrl ? (
                              <img src={item.previewUrl} alt={item.file.name} className="h-full w-full object-cover" />
                            ) : (
                              <FileText className="h-5 w-5 text-gray-500" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">{item.file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(item.file.size)} · {FILE_KIND_LABELS[item.kind]}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={QUEUE_STATUS_VARIANTS[item.status]} className="gap-1">
                              {item.status === 'scanning' && <Loader2 className="h-3 w-3 animate-spin" />}
                              {item.status === 'queued' && <Clock className="h-3 w-3" />}
                              {item.status === 'error' && <AlertCircle className="h-3 w-3" />}
                              {QUEUE_STATUS_LABELS[item.status]}
                            </Badge>
                            {item.status === 'error' && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  retryItem(item.id);
                                }}
                                aria-label="Ξανά ανάλυση"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                removeItem(item.id);
                              }}
                              aria-label="Αφαίρεση από ουρά"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {activeItem ? (
                <>
                  <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white p-4">
                    <div className="flex items-center gap-2 text-emerald-700">
                      <Sparkles className="w-4 h-4" />
                      <p className="text-sm font-semibold">Σύνοψη αναγνώρισης</p>
                    </div>
                    {activeItem.status === 'ready' && (
                      <div className="flex items-center gap-2 text-emerald-600 text-xs font-medium mt-2">
                        <CheckCircle className="w-4 h-4" />
                        Η ανάλυση ολοκληρώθηκε
                      </div>
                    )}
                    {summary.items.length > 0 ? (
                      <>
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                          {summary.items.map((item) => (
                            <div key={item.label} className="flex items-start gap-2">
                              <span className="text-xs uppercase tracking-wide text-muted-foreground/70">
                                {item.label}
                              </span>
                              <span className="text-sm font-medium text-foreground">{item.value}</span>
                            </div>
                          ))}
                        </div>
                        {summary.confirmationLine && (
                          <p className="mt-3 text-sm font-medium text-foreground/80">
                            {summary.confirmationLine}
                          </p>
                        )}
                        <p className="mt-2 text-xs text-muted-foreground">
                          Αν κάτι δεν είναι σωστό, διόρθωσέ το παρακάτω πριν την αποθήκευση.
                        </p>
                      </>
                    ) : (
                      <p className="mt-3 text-sm text-muted-foreground">
                        Η αναγνώριση θα εμφανιστεί μόλις ξεκινήσει η ανάλυση του εγγράφου.
                      </p>
                    )}
                  </div>

                  {activeItem.status === 'ready' ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="amount">
                          {activeFormData.financial_intent === 'payment_receipt'
                            ? 'Ποσό Πληρωμής (€) *'
                            : 'Ποσό (€) *'}
                        </Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          value={activeFormData.amount ?? ''}
                          onChange={(e) =>
                            handleInputChange('amount', e.target.value ? parseFloat(e.target.value) : null)
                          }
                          placeholder="0.00"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="date">
                          {activeFormData.financial_intent === 'payment_receipt'
                            ? 'Ημερομηνία Πληρωμής *'
                            : 'Ημερομηνία *'}
                        </Label>
                        <Input
                          id="date"
                          type="date"
                          value={activeFormData.date ?? ''}
                          onChange={(e) => handleInputChange('date', e.target.value || null)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="supplier">Προμηθευτής</Label>
                        <Input
                          id="supplier"
                          type="text"
                          value={activeFormData.supplier ?? ''}
                          onChange={(e) => handleInputChange('supplier', e.target.value || null)}
                          placeholder="Όνομα εταιρείας/προμηθευτή"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="supplier-vat">ΑΦΜ Προμηθευτή</Label>
                        <Input
                          id="supplier-vat"
                          type="text"
                          value={activeFormData.supplier_vat ?? ''}
                          onChange={(e) => handleInputChange('supplier_vat', e.target.value || null)}
                          placeholder="π.χ. 094123123"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="document-number">Αριθμός Παραστατικού</Label>
                        <Input
                          id="document-number"
                          type="text"
                          value={activeFormData.document_number ?? ''}
                          onChange={(e) => handleInputChange('document_number', e.target.value || null)}
                          placeholder="π.χ. 12345"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="document-type">Είδος Παραστατικού</Label>
                        <Select
                          value={activeFormData.document_type ?? ''}
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

                      <div className="space-y-2">
                        <Label htmlFor="financial-intent">Χρήση Παραστατικού</Label>
                        <Select
                          value={activeFormData.financial_intent ?? ''}
                          onValueChange={(value) => handleInputChange('financial_intent', value || null)}
                        >
                          <SelectTrigger id="financial-intent">
                            <SelectValue placeholder="Επιλέξτε χρήση" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(FINANCIAL_INTENT_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {activeFormData.financial_intent === 'payment_receipt' && (
                          <p className="text-xs text-muted-foreground">
                            Θα συνδεθεί ως απόδειξη εξόφλησης με υπάρχουσα δαπάνη.
                          </p>
                        )}
                      </div>

                      {activeFormData.financial_intent === 'payment_receipt' && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="linked-expense">Σύνδεση με Δαπάνη *</Label>
                            <Select
                              value={
                                activeFormData.linked_expense_id
                                  ? String(activeFormData.linked_expense_id)
                                  : ''
                              }
                              onValueChange={(value) =>
                                handleInputChange('linked_expense_id', value ? Number(value) : null)
                              }
                            >
                              <SelectTrigger id="linked-expense">
                                <SelectValue
                                  placeholder={
                                    isLoadingExpenses ? 'Φόρτωση δαπανών...' : 'Επιλέξτε δαπάνη'
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {availableExpenses.length === 0 ? (
                                  <SelectItem value="none" disabled>
                                    Δεν υπάρχουν διαθέσιμες δαπάνες
                                  </SelectItem>
                                ) : (
                                  availableExpenses.map((expense) => (
                                    <SelectItem key={expense.id} value={String(expense.id)}>
                                      {expense.title} · {expense.amount}€ · {expense.date}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="payment-method">Τρόπος Πληρωμής *</Label>
                            <Select
                              value={activeFormData.payment_method ?? ''}
                              onValueChange={(value) => handleInputChange('payment_method', value || null)}
                            >
                              <SelectTrigger id="payment-method">
                                <SelectValue placeholder="Επιλέξτε τρόπο" />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>
                                    {label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="category">Κατηγορία</Label>
                        <Select
                          value={activeFormData.category ?? ''}
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

                      <div className="space-y-2">
                        <Label htmlFor="description">Περιγραφή</Label>
                        <Textarea
                          id="description"
                          value={activeFormData.description ?? ''}
                          onChange={(e) => handleInputChange('description', e.target.value || null)}
                          placeholder="Σύντομη περιγραφή"
                          rows={3}
                        />
                      </div>

                      <div className="flex items-center justify-between gap-4 rounded-lg border-2 border-primary/20 bg-primary/5 px-4 py-3">
                        <div className="space-y-0.5 flex-1">
                          <Label htmlFor="archive-toggle" className="text-sm font-semibold text-foreground">
                            Καταχώρηση στο Ηλεκτρονικό Αρχείο
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {activeItem.shouldArchive
                              ? 'Το παραστατικό θα αποθηκευτεί αυτόματα στο ηλεκτρονικό αρχείο'
                              : 'Το παραστατικό δεν θα αποθηκευτεί στο αρχείο'}
                          </p>
                        </div>
                        <Switch
                          id="archive-toggle"
                          checked={activeItem.shouldArchive}
                          onCheckedChange={(checked) => handleArchiveToggle(Boolean(checked))}
                        />
                      </div>

                      <div className="flex space-x-3 pt-4">
                        <Button
                          onClick={handleSave}
                          className="flex-1"
                          disabled={
                            !activeFormData.amount ||
                            !activeFormData.date ||
                            (activeFormData.financial_intent === 'payment_receipt' &&
                              (!activeFormData.linked_expense_id || !activeFormData.payment_method))
                          }
                        >
                          {activeFormData.financial_intent === 'payment_receipt'
                            ? 'Αποθήκευση Απόδειξης Πληρωμής'
                            : 'Αποθήκευση Δαπάνης'}
                        </Button>
                        {onCancel && (
                          <Button variant="outline" onClick={onCancel}>
                            Ακύρωση
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-muted-foreground">
                      Η ανάλυση δεν είναι ακόμη έτοιμη. Θα εμφανιστεί αυτόματα το έντυπο μόλις ολοκληρωθεί.
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-muted-foreground">
                  Ανεβάστε ένα ή περισσότερα παραστατικά για να ξεκινήσει η αναγνώριση.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export type ArchiveDocumentCategory =
  | 'assembly_minutes'
  | 'building_plans'
  | 'expense_receipt'
  | 'payment_receipt'
  | 'income_receipt'
  | 'regulations'
  | 'maintenance_contract'
  | 'insurance'
  | 'certificate'
  | 'other';

export type ArchiveDocumentType =
  | 'invoice'
  | 'receipt'
  | 'credit_note'
  | 'debit_note'
  | 'other';

export interface ArchiveDocument {
  id: number;
  building: number;
  building_name?: string;
  uploaded_by?: number | null;
  uploaded_by_name?: string | null;
  category: ArchiveDocumentCategory;
  document_type?: ArchiveDocumentType | null;
  document_number?: string | null;
  supplier_name?: string | null;
  supplier_vat?: string | null;
  document_date?: string | null;
  amount?: number | null;
  currency?: string | null;
  title?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  file_url?: string | null;
  download_url?: string | null;
  original_filename?: string;
  file_size?: number;
  mime_type?: string;
  linked_expense?: number | null;
  created_at?: string;
  updated_at?: string;
}

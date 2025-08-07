import { api } from './api';

export interface ExtractedData {
  building_info?: {
    name: string;
    address: string;
    city: string;
    postal_code: string;
    apartments_count: number;
    internal_manager_name?: string;
    internal_manager_phone?: string;
    management_office_name?: string;
    management_office_phone?: string;
    management_office_address?: string;
  };
  apartments?: Array<{
    number: string;
    identifier?: string;
    floor?: number;
    owner_name: string;
    owner_phone: string;
    owner_phone2?: string;
    owner_email: string;
    tenant_name?: string;
    tenant_phone?: string;
    tenant_phone2?: string;
    tenant_email?: string;
    square_meters?: number;
    bedrooms?: number;
    is_rented: boolean;
    is_closed?: boolean;
    ownership_percentage?: number;
    rent_start_date?: string;
    rent_end_date?: string;
    notes?: string;
  }>;
  residents?: Array<{
    name: string;
    email: string;
    phone: string;
    apartment: string;
    role: 'owner' | 'tenant' | 'resident';
  }>;
  confidence_score?: number;
  extraction_notes?: string[];
}

export interface ValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  statistics: {
    total_apartments: number;
    rented_apartments: number;
    owned_apartments: number;
    empty_apartments: number;
    total_residents: number;
  };
}

export interface ImportResult {
  success: boolean;
  message: string;
  building_id: number;
  apartments_created: number;
  users_created: number;
}

export interface MigrationTemplate {
  csv_template: {
    headers: string[];
    example_row: string[];
  };
  supported_formats: string[];
  max_file_size: string;
  max_files: number;
}

/**
 * Αναλύει εικόνες φορμών κοινοχρήστων με AI
 */
export async function analyzeFormImages(files: File[]): Promise<{
  success: boolean;
  data: ExtractedData;
  message: string;
}> {
  const formData = new FormData();
  
  files.forEach((file, index) => {
    formData.append('images', file);
  });

  const { data } = await api.post('/data-migration/analyze-images/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return data;
}

/**
 * Επικυρώνει τα εξαγόμενα δεδομένα
 */
export async function validateMigrationData(data: ExtractedData): Promise<ValidationResult> {
  const { data: response } = await api.post('/data-migration/validate-data/', data);
  return response;
}

/**
 * Εισάγει τα δεδομένα στη βάση δεδομένων
 */
export async function importMigrationData(
  data: ExtractedData, 
  targetBuildingId: string
): Promise<ImportResult> {
  const { data: response } = await api.post('/data-migration/import-data/', {
    ...data,
    target_building_id: targetBuildingId
  });
  return response;
}

/**
 * Λαμβάνει πρότυπα για μετανάστευση
 */
export async function getMigrationTemplates(): Promise<MigrationTemplate> {
  const { data } = await api.get('/data-migration/templates/');
  return data;
}

/**
 * Εισάγει δεδομένα από CSV αρχείο
 */
export async function importCSVData(csvFile: File, targetBuildingId: string): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('csv_file', csvFile);
  formData.append('target_building_id', targetBuildingId);

  const { data } = await api.post('/data-migration/import-csv/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return data;
} 
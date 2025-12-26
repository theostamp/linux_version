export interface MigrationBuildingInfo {
  name?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  apartments_count?: number;
  internal_manager_name?: string;
  internal_manager_phone?: string;
  internal_manager_apartment?: string;
  internal_manager_collection_schedule?: string;
  management_office_name?: string;
  management_office_phone?: string;
  management_office_address?: string;
}

export interface MigrationApartment {
  number: string;
  identifier?: string;
  floor?: number | null;
  owner_name?: string;
  owner_phone?: string;
  owner_phone2?: string;
  owner_email?: string;
  tenant_name?: string;
  tenant_phone?: string;
  tenant_phone2?: string;
  tenant_email?: string;
  is_rented?: boolean;
  is_closed?: boolean;
  ownership_percentage?: number;
  square_meters?: number;
  bedrooms?: number;
  notes?: string;
}

export interface MigrationResident {
  name: string;
  email?: string;
  phone?: string;
  apartment?: string;
  role?: string;
}

export interface MigrationAnalysisResult {
  building_info: MigrationBuildingInfo;
  apartments: MigrationApartment[];
  residents: MigrationResident[];
  confidence_score?: number;
  extraction_notes?: string[];
}

export interface MigrationValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  statistics?: {
    total_apartments?: number;
    rented_apartments?: number;
    owned_apartments?: number;
    empty_apartments?: number;
    total_residents?: number;
  };
}

export interface MigrationImportResponse {
  success: boolean;
  message: string;
  building_id: number;
  apartments_created: number;
  users_created: number;
}


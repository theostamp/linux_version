/**
 * Utilities για εξαγωγή δεδομένων κτιρίου στα emails
 */
import type { Building } from '@/lib/api';

export interface BuildingEmailData {
  name: string;
  fullAddress: string;
  managementName: string;
  managementPhone: string;
  managementEmail?: string;
  internalManagerName?: string;
  internalManagerPhone?: string;
}

/**
 * Εξάγει τα δεδομένα κτιρίου για χρήση σε emails
 */
export function extractBuildingData(building: Building | undefined | null): BuildingEmailData {
  if (!building) {
    return {
      name: 'Πολυκατοικία',
      fullAddress: '',
      managementName: 'Η Διαχείριση',
      managementPhone: '',
    };
  }

  // Όνομα κτιρίου - προτίμηση στο name, μετά address
  const name = building.name || building.address || 'Πολυκατοικία';

  // Πλήρης διεύθυνση
  const addressParts = [
    building.address,
    building.city,
    building.postal_code,
  ].filter(Boolean);
  const fullAddress = addressParts.join(', ');

  // Στοιχεία διαχείρισης - Γραφείο διαχείρισης ή εσωτερικός διαχειριστής
  const managementName =
    building.management_office_name ||
    building.internal_manager_name ||
    building.internal_manager_display_name ||
    'Η Διαχείριση';

  const managementPhone =
    building.management_office_phone ||
    building.internal_manager_phone ||
    '';

  return {
    name,
    fullAddress,
    managementName,
    managementPhone,
    internalManagerName: building.internal_manager_name || building.internal_manager_display_name,
    internalManagerPhone: building.internal_manager_phone,
  };
}

/**
 * Δημιουργεί επαγγελματική υπογραφή για email
 */
export function generateEmailSignature(buildingData: BuildingEmailData): string {
  let signature = `Με εκτίμηση,\n${buildingData.managementName}`;

  if (buildingData.name !== 'Πολυκατοικία') {
    signature += `\n${buildingData.name}`;
  }

  if (buildingData.fullAddress) {
    signature += `\n${buildingData.fullAddress}`;
  }

  if (buildingData.managementPhone) {
    signature += `\nΤηλ: ${buildingData.managementPhone}`;
  }

  return signature;
}

/**
 * Δημιουργεί τον τίτλο/θέμα email με το όνομα κτιρίου
 */
export function generateEmailSubject(title: string, buildingData: BuildingEmailData): string {
  if (buildingData.name && buildingData.name !== 'Πολυκατοικία') {
    return `${title} - ${buildingData.name}`;
  }
  return title;
}

/**
 * Formats ημερομηνία σε ελληνικό format
 */
export function formatDateGreek(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('el-GR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Μήνες στα ελληνικά
 */
export const MONTHS = [
  'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος',
  'Μάιος', 'Ιούνιος', 'Ιούλιος', 'Αύγουστος',
  'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'
];

export const MONTHS_GENITIVE = [
  'Ιανουαρίου', 'Φεβρουαρίου', 'Μαρτίου', 'Απριλίου',
  'Μαΐου', 'Ιουνίου', 'Ιουλίου', 'Αυγούστου',
  'Σεπτεμβρίου', 'Οκτωβρίου', 'Νοεμβρίου', 'Δεκεμβρίου'
];

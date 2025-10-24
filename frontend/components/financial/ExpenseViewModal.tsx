import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Expense } from '@/types/financial';
import { formatCurrency, formatDate } from '@/lib/utils';
import { FilePreview } from '@/components/ui/FilePreview';
import { 
  X, 
  Building,
  Calendar,
  Euro,
  FileText,
  User,
  Tag,
  Share2
} from 'lucide-react';

interface ExpenseViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
  buildingName?: string;
}

const EXPENSE_CATEGORIES: Record<string, string> = {
  'cleaning': 'Καθαρισμός Κοινοχρήστων Χώρων',
  'electricity_common': 'ΔΕΗ Κοινοχρήστων',
  'water_common': 'Νερό Κοινοχρήστων',
  'garbage_collection': 'Συλλογή Απορριμμάτων',
  'security': 'Ασφάλεια Κτιρίου',
  'concierge': 'Συνεργείο Καθαρισμού',
  'elevator_maintenance': 'Ετήσια Συντήρηση Ανελκυστήρα',
  'elevator_repair': 'Επισκευή Ανελκυστήρα',
  'elevator_inspection': 'Επιθεώρηση Ανελκυστήρα',
  'elevator_modernization': 'Αναβάθμιση Ανελκυστήρα',
  'heating_fuel': 'Πετρέλαιο Θέρμανσης',
  'heating_gas': 'Φυσικό Αέριο Θέρμανσης',
  'heating_maintenance': 'Συντήρηση Καυστήρα',
  'heating_repair': 'Επισκευή Θερμαντικών',
  'heating_inspection': 'Επιθεώρηση Θερμαντικών',
  'heating_modernization': 'Αναβάθμιση Θερμαντικών',
  'electrical_maintenance': 'Συντήρηση Ηλεκτρικών',
  'electrical_repair': 'Επισκευή Ηλεκτρικών',
  'electrical_upgrade': 'Αναβάθμιση Ηλεκτρικών',
  'lighting_common': 'Φωτισμός Κοινοχρήστων',
  'intercom_system': 'Σύστημα Εσωτερικής Επικοινωνίας',
  'plumbing_maintenance': 'Συντήρηση Υδραυλικών',
  'plumbing_repair': 'Επισκευή Υδραυλικών',
  'water_tank_cleaning': 'Καθαρισμός Δεξαμενής Νερού',
  'water_tank_maintenance': 'Συντήρηση Δεξαμενής Νερού',
  'sewage_system': 'Σύστημα Αποχέτευσης',
  'building_insurance': 'Ασφάλεια Κτιρίου',
  'building_maintenance': 'Συντήρηση Κτιρίου',
  'roof_maintenance': 'Συντήρηση Στέγης',
  'roof_repair': 'Επισκευή Στέγης',
  'facade_maintenance': 'Συντήρηση Πρόσοψης',
  'facade_repair': 'Επισκευή Πρόσοψης',
  'painting_exterior': 'Βαψίματα Εξωτερικών',
  'painting_interior': 'Βαψίματα Εσωτερικών Κοινοχρήστων',
  'garden_maintenance': 'Συντήρηση Κήπου',
  'parking_maintenance': 'Συντήρηση Χώρων Στάθμευσης',
  'entrance_maintenance': 'Συντήρηση Εισόδου',
  'emergency_repair': 'Έκτακτη Επισκευή',
  'storm_damage': 'Ζημιές από Κακοκαιρία',
  'flood_damage': 'Ζημιές από Πλημμύρα',
  'fire_damage': 'Ζημιές από Πυρκαγιά',
  'earthquake_damage': 'Ζημιές από Σεισμό',
  'vandalism_repair': 'Επισκευή Βανδαλισμών',
  'locksmith': 'Κλειδαράς',
  'glass_repair': 'Επισκευή Γυαλιών',
  'door_repair': 'Επισκευή Πόρτας',
  'window_repair': 'Επισκευή Παραθύρων',
  'balcony_repair': 'Επισκευή Μπαλκονιού',
  'staircase_repair': 'Επισκευή Σκάλας',
  'security_system': 'Σύστημα Ασφάλειας',
  'cctv_installation': 'Εγκατάσταση CCTV',
  'access_control': 'Σύστημα Ελέγχου Πρόσβασης',
  'fire_alarm': 'Σύστημα Πυρασφάλειας',
  'fire_extinguishers': 'Πυροσβεστήρες',
  'legal_fees': 'Δικαστικά Έξοδα',
  'notary_fees': 'Συμβολαιογραφικά Έξοδα',
  'surveyor_fees': 'Εκτιμητής',
  'architect_fees': 'Αρχιτέκτονας',
  'engineer_fees': 'Μηχανικός',
  'accounting_fees': 'Λογιστικά Έξοδα',
  'management_fees': 'Διοικητικά Έξοδα',
  'asbestos_removal': 'Αφαίρεση Ασβέστη',
  'lead_paint_removal': 'Αφαίρεση Μολύβδου',
  'mold_removal': 'Αφαίρεση Μούχλας',
  'pest_control': 'Εντομοκτονία',
  'tree_trimming': 'Κλάδεμα Δέντρων',
  'snow_removal': 'Καθαρισμός Χιονιού',
  'energy_upgrade': 'Ενεργειακή Αναβάθμιση',
  'insulation_work': 'Θερμομόνωση',
  'led_lighting': 'Αντικατάσταση με LED',
  'smart_systems': 'Έξυπνα Συστήματα',
  'special_contribution': 'Έκτακτη Εισφορά',
  'reserve_fund': 'Αποθεματικό Ταμείο',
  'emergency_fund': 'Ταμείο Έκτακτης Ανάγκης',
  'renovation_fund': 'Ταμείο Ανακαίνισης',
  'miscellaneous': 'Διάφορες Δαπάνες',
  'consulting_fees': 'Εργασίες Συμβούλου',
  'permits_licenses': 'Άδειες & Αποδοχές',
  'taxes_fees': 'Φόροι & Τέλη',
  'utilities_other': 'Άλλες Κοινόχρηστες Υπηρεσίες',
};

const DISTRIBUTION_TYPES: Record<string, string> = {
  'by_participation_mills': 'Ανά Χιλιοστά',
  'equal_share': 'Ισόποσα',
  'specific_apartments': 'Συγκεκριμένα',
  'by_meters': 'Μετρητές',
};

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    'electricity_common': 'bg-blue-100 text-blue-800',
    'water_common': 'bg-cyan-100 text-cyan-800',
    'heating_fuel': 'bg-orange-100 text-orange-800',
    'heating_gas': 'bg-orange-100 text-orange-800',
    'cleaning': 'bg-green-100 text-green-800',
    'building_maintenance': 'bg-purple-100 text-purple-800',
    'building_insurance': 'bg-red-100 text-red-800',
    'management_fees': 'bg-gray-100 text-gray-800',
    'miscellaneous': 'bg-yellow-100 text-yellow-800',
  };
  return colors[category] || 'bg-gray-100 text-gray-800';
};

export const ExpenseViewModal: React.FC<ExpenseViewModalProps> = ({
  isOpen,
  onClose,
  expense,
  buildingName = 'Άγνωστο Κτίριο'
}) => {
  if (!isOpen || !expense) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Building className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-800">Προβολή Δαπάνης</h2>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              🏢 {buildingName}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Title and Status */}
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <h3 className="text-2xl font-bold text-gray-900">{expense.title}</h3>
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-100 text-blue-800 flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  📋 Καταχωρημένη
                </Badge>
              </div>
            </div>
            
            {/* Amount */}
            <div className="flex items-center gap-2">
              <Euro className="h-5 w-5 text-green-600" />
              <span className="text-3xl font-bold text-green-600">
                {formatCurrency(expense.amount)}
              </span>
            </div>
          </div>

          <Separator />

          {/* Key Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Date */}
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Ημερομηνία</p>
                  <p className="font-medium">{formatDate(expense.date)}</p>
                </div>
              </div>

              {/* Category */}
              <div className="flex items-center gap-3">
                <Tag className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Κατηγορία</p>
                  <Badge className={`${getCategoryColor(expense.category)} mt-1`}>
                    {EXPENSE_CATEGORIES[expense.category] || expense.category}
                  </Badge>
                </div>
              </div>

              {/* Distribution Type */}
              <div className="flex items-center gap-3">
                <Share2 className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Τρόπος Κατανομής</p>
                  <p className="font-medium">{DISTRIBUTION_TYPES[expense.distribution_type] || expense.distribution_type}</p>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Supplier */}
              {expense.supplier_name && (
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Προμηθευτής</p>
                    <p className="font-medium text-blue-600">{expense.supplier_name}</p>
                  </div>
                </div>
              )}

              {/* Created/Updated */}
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Τελευταία Ενημέρωση</p>
                  <p className="font-medium">{formatDate(expense.updated_at || expense.created_at)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {expense.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Σημειώσεις
                </h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{expense.notes}</p>
                </div>
              </div>
            </>
          )}

          {/* Attachment */}
          {expense.attachment && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Επισύναψη
                </h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <FilePreview 
                    file={{
                      name: expense.attachment.split('/').pop() || 'attachment',
                      size: 0,
                      type: 'application/octet-stream',
                      url: expense.attachment
                    }}
                    showPreview={true}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t p-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Κλείσιμο
          </Button>
        </div>
      </div>
    </div>
  );
};

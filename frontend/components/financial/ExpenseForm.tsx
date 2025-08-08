import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { ExpenseFormData, ExpenseCategory, DistributionType } from '@/types/financial';
import { useExpenses } from '@/hooks/useExpenses';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useExpenseTemplates } from '@/hooks/useExpenseTemplates';
import { useSuppliers } from '@/hooks/useSuppliers';
import { FileUpload } from '@/components/ui/FileUpload';
import { FilePreview } from '@/components/ui/FilePreview';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SupplierSelector } from './SupplierSelector';
import { ExpenseTitleDropdown } from './ExpenseTitleDropdown';

interface ExpenseFormProps {
  buildingId: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string; group: string }[] = [
  // Πάγιες Δαπάνες Κοινοχρήστων
  { value: 'cleaning', label: 'Καθαρισμός Κοινοχρήστων Χώρων', group: 'Πάγιες Δαπάνες' },
  { value: 'electricity_common', label: 'ΔΕΗ Κοινοχρήστων', group: 'Πάγιες Δαπάνες' },
  { value: 'water_common', label: 'Νερό Κοινοχρήστων', group: 'Πάγιες Δαπάνες' },
  { value: 'garbage_collection', label: 'Συλλογή Απορριμμάτων', group: 'Πάγιες Δαπάνες' },
  { value: 'security', label: 'Ασφάλεια Κτιρίου', group: 'Πάγιες Δαπάνες' },
  { value: 'concierge', label: 'Καθαριστής/Πυλωρός', group: 'Πάγιες Δαπάνες' },
  
  // Δαπάνες Ανελκυστήρα
  { value: 'elevator_maintenance', label: 'Ετήσια Συντήρηση Ανελκυστήρα', group: 'Ανελκυστήρας' },
  { value: 'elevator_repair', label: 'Επισκευή Ανελκυστήρα', group: 'Ανελκυστήρας' },
  { value: 'elevator_inspection', label: 'Επιθεώρηση Ανελκυστήρα', group: 'Ανελκυστήρας' },
  { value: 'elevator_modernization', label: 'Μοντέρνιση Ανελκυστήρα', group: 'Ανελκυστήρας' },
  
  // Δαπάνες Θέρμανσης
  { value: 'heating_fuel', label: 'Πετρέλαιο Θέρμανσης', group: 'Θέρμανση' },
  { value: 'heating_gas', label: 'Φυσικό Αέριο Θέρμανσης', group: 'Θέρμανση' },
  { value: 'heating_maintenance', label: 'Συντήρηση Καυστήρα', group: 'Θέρμανση' },
  { value: 'heating_repair', label: 'Επισκευή Θερμαντικών', group: 'Θέρμανση' },
  { value: 'heating_inspection', label: 'Επιθεώρηση Θερμαντικών', group: 'Θέρμανση' },
  { value: 'heating_modernization', label: 'Μοντέρνιση Θερμαντικών', group: 'Θέρμανση' },
  
  // Δαπάνες Ηλεκτρικών
  { value: 'electrical_maintenance', label: 'Συντήρηση Ηλεκτρικών', group: 'Ηλεκτρικά' },
  { value: 'electrical_repair', label: 'Επισκευή Ηλεκτρικών', group: 'Ηλεκτρικά' },
  { value: 'electrical_upgrade', label: 'Αναβάθμιση Ηλεκτρικών', group: 'Ηλεκτρικά' },
  { value: 'lighting_common', label: 'Φωτισμός Κοινοχρήστων', group: 'Ηλεκτρικά' },
  { value: 'intercom_system', label: 'Σύστημα Εσωτερικής Επικοινωνίας', group: 'Ηλεκτρικά' },
  
  // Δαπάνες Υδραυλικών
  { value: 'plumbing_maintenance', label: 'Συντήρηση Υδραυλικών', group: 'Υδραυλικά' },
  { value: 'plumbing_repair', label: 'Επισκευή Υδραυλικών', group: 'Υδραυλικά' },
  { value: 'water_tank_cleaning', label: 'Καθαρισμός Δεξαμενής Νερού', group: 'Υδραυλικά' },
  { value: 'water_tank_maintenance', label: 'Συντήρηση Δεξαμενής Νερού', group: 'Υδραυλικά' },
  { value: 'sewage_system', label: 'Σύστημα Αποχέτευσης', group: 'Υδραυλικά' },
  
  // Δαπάνες Κτιρίου
  { value: 'building_insurance', label: 'Ασφάλεια Κτιρίου', group: 'Κτίριο' },
  { value: 'building_maintenance', label: 'Συντήρηση Κτιρίου', group: 'Κτίριο' },
  { value: 'roof_maintenance', label: 'Συντήρηση Στέγης', group: 'Κτίριο' },
  { value: 'roof_repair', label: 'Επισκευή Στέγης', group: 'Κτίριο' },
  { value: 'facade_maintenance', label: 'Συντήρηση Πρόσοψης', group: 'Κτίριο' },
  { value: 'facade_repair', label: 'Επισκευή Πρόσοψης', group: 'Κτίριο' },
  { value: 'painting_exterior', label: 'Βαψίματα Εξωτερικών', group: 'Κτίριο' },
  { value: 'painting_interior', label: 'Βαψίματα Εσωτερικών Κοινοχρήστων', group: 'Κτίριο' },
  { value: 'garden_maintenance', label: 'Συντήρηση Κήπου', group: 'Κτίριο' },
  { value: 'parking_maintenance', label: 'Συντήρηση Χώρων Στάθμευσης', group: 'Κτίριο' },
  { value: 'entrance_maintenance', label: 'Συντήρηση Εισόδου', group: 'Κτίριο' },
  
  // Έκτακτες Δαπάνες
  { value: 'emergency_repair', label: 'Έκτακτη Επισκευή', group: 'Έκτακτες' },
  { value: 'storm_damage', label: 'Ζημιές από Κακοκαιρία', group: 'Έκτακτες' },
  { value: 'flood_damage', label: 'Ζημιές από Πλημμύρα', group: 'Έκτακτες' },
  { value: 'fire_damage', label: 'Ζημιές από Πυρκαγιά', group: 'Έκτακτες' },
  { value: 'earthquake_damage', label: 'Ζημιές από Σεισμό', group: 'Έκτακτες' },
  { value: 'vandalism_repair', label: 'Επισκευή Βανδαλισμών', group: 'Έκτακτες' },
  
  // Ειδικές Επισκευές
  { value: 'locksmith', label: 'Κλειδαράς', group: 'Ειδικές Επισκευές' },
  { value: 'glass_repair', label: 'Επισκευή Γυαλιών', group: 'Ειδικές Επισκευές' },
  { value: 'door_repair', label: 'Επισκευή Πόρτας', group: 'Ειδικές Επισκευές' },
  { value: 'window_repair', label: 'Επισκευή Παραθύρων', group: 'Ειδικές Επισκευές' },
  { value: 'balcony_repair', label: 'Επισκευή Μπαλκονιού', group: 'Ειδικές Επισκευές' },
  { value: 'staircase_repair', label: 'Επισκευή Σκάλας', group: 'Ειδικές Επισκευές' },
  
  // Ασφάλεια & Πρόσβαση
  { value: 'security_system', label: 'Σύστημα Ασφάλειας', group: 'Ασφάλεια' },
  { value: 'cctv_installation', label: 'Εγκατάσταση CCTV', group: 'Ασφάλεια' },
  { value: 'access_control', label: 'Σύστημα Ελέγχου Πρόσβασης', group: 'Ασφάλεια' },
  { value: 'fire_alarm', label: 'Σύστημα Πυρασφάλειας', group: 'Ασφάλεια' },
  { value: 'fire_extinguishers', label: 'Πυροσβεστήρες', group: 'Ασφάλεια' },
  
  // Διοικητικές & Νομικές
  { value: 'legal_fees', label: 'Δικαστικά Έξοδα', group: 'Διοικητικές' },
  { value: 'notary_fees', label: 'Συμβολαιογραφικά Έξοδα', group: 'Διοικητικές' },
  { value: 'surveyor_fees', label: 'Εκτιμητής', group: 'Διοικητικές' },
  { value: 'architect_fees', label: 'Αρχιτέκτονας', group: 'Διοικητικές' },
  { value: 'engineer_fees', label: 'Μηχανικός', group: 'Διοικητικές' },
  { value: 'accounting_fees', label: 'Λογιστικά Έξοδα', group: 'Διοικητικές' },
  { value: 'management_fees', label: 'Διοικητικά Έξοδα', group: 'Διοικητικές' },
  
  // Ειδικές Εργασίες
  { value: 'asbestos_removal', label: 'Αφαίρεση Ασβέστη', group: 'Ειδικές Εργασίες' },
  { value: 'lead_paint_removal', label: 'Αφαίρεση Μολύβδου', group: 'Ειδικές Εργασίες' },
  { value: 'mold_removal', label: 'Αφαίρεση Μούχλας', group: 'Ειδικές Εργασίες' },
  { value: 'pest_control', label: 'Εντομοκτονία', group: 'Ειδικές Εργασίες' },
  { value: 'tree_trimming', label: 'Κλάδεμα Δέντρων', group: 'Ειδικές Εργασίες' },
  { value: 'snow_removal', label: 'Καθαρισμός Χιονιού', group: 'Ειδικές Εργασίες' },
  
  // Ενεργειακή Απόδοση
  { value: 'energy_upgrade', label: 'Ενεργειακή Αναβάθμιση', group: 'Ενεργειακή Απόδοση' },
  { value: 'insulation_work', label: 'Θερμομόνωση', group: 'Ενεργειακή Απόδοση' },
  { value: 'solar_panel_installation', label: 'Εγκατάσταση Φωτοβολταϊκών', group: 'Ενεργειακή Απόδοση' },
  { value: 'led_lighting', label: 'Αντικατάσταση με LED', group: 'Ενεργειακή Απόδοση' },
  { value: 'smart_systems', label: 'Έξυπνα Συστήματα', group: 'Ενεργειακή Απόδοση' },
  
  // Δαπάνες Ιδιοκτητών
  { value: 'special_contribution', label: 'Έκτακτη Εισφορά', group: 'Ιδιοκτητές' },
  { value: 'reserve_fund', label: 'Αποθεματικό Ταμείο', group: 'Ιδιοκτητές' },
  { value: 'emergency_fund', label: 'Ταμείο Έκτακτης Ανάγκης', group: 'Ιδιοκτητές' },
  { value: 'renovation_fund', label: 'Ταμείο Ανακαίνισης', group: 'Ιδιοκτητές' },
  
  // Άλλες Δαπάνες
  { value: 'miscellaneous', label: 'Διάφορες Δαπάνες', group: 'Άλλες' },
  { value: 'consulting_fees', label: 'Εργασίες Συμβούλου', group: 'Άλλες' },
  { value: 'permits_licenses', label: 'Άδειες & Αποδοχές', group: 'Άλλες' },
  { value: 'taxes_fees', label: 'Φόροι & Τέλη', group: 'Άλλες' },
  { value: 'utilities_other', label: 'Άλλες Κοινόχρηστες Υπηρεσίες', group: 'Άλλες' },
];

const DISTRIBUTION_TYPES: { value: DistributionType; label: string }[] = [
  { value: 'by_participation_mills', label: 'Ανά Χιλιοστά' },
  { value: 'equal_share', label: 'Ισόποσα' },
  { value: 'specific_apartments', label: 'Συγκεκριμένα' },
  { value: 'by_meters', label: 'Μετρητές' },
];

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ buildingId, onSuccess, onCancel }) => {
  const { createExpense, isLoading, error } = useExpenses();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  const { uploadFile, isUploading, progress, error: uploadError } = useFileUpload({
    maxSize: 10,
    allowedTypes: ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx'],
    maxFiles: 1
  });

  // Hooks for auto-complete functionality
  const { getSuggestedDate, getSuggestedDistribution, isMonthlyExpense, getTitleSuggestions } = useExpenseTemplates();
  const { suppliers } = useSuppliers({ buildingId, isActive: true });
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset
  } = useForm<ExpenseFormData>({
    defaultValues: {
      building: buildingId,
      distribution_type: 'by_participation_mills',
      date: new Date().toISOString().split('T')[0],
    },
    mode: 'onChange'
  });

  const selectedCategory = watch('category');
  const selectedSupplier = watch('supplier');
  const selectedTitle = watch('title');

  // Get selected supplier details
  const selectedSupplierDetails = suppliers.find(s => s.id === selectedSupplier);

  // Auto-fill functionality when category changes
  useEffect(() => {
    if (selectedCategory) {
      // Auto-set distribution type
      const suggestedDistribution = getSuggestedDistribution(selectedCategory);
      setValue('distribution_type', suggestedDistribution);

      // Auto-set date
      const suggestedDate = getSuggestedDate(selectedCategory);
      setValue('date', suggestedDate);

      // Auto-fill title if empty
      if (!selectedTitle) {
        const suggestions = getTitleSuggestions(selectedCategory, selectedSupplierDetails);
        if (suggestions.length > 0) {
          setValue('title', suggestions[0]);
        }
      }
    }
  }, [selectedCategory, selectedSupplierDetails, setValue, getSuggestedDistribution, getSuggestedDate, selectedTitle]);

  const getDefaultDistributionType = (category: ExpenseCategory): DistributionType => {
    const heatingCategories: ExpenseCategory[] = ['heating_fuel', 'heating_gas'];
    if (heatingCategories.includes(category)) {
      return 'by_meters';
    }
    return 'by_participation_mills';
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const category = e.target.value as ExpenseCategory;
    setValue('category', category);
    setValue('distribution_type', getDefaultDistributionType(category));
    // Καθαρίζουμε τον προμηθευτή όταν αλλάζει η κατηγορία
    setValue('supplier', undefined);
  };

  const handleSupplierChange = (supplierId: number | undefined) => {
    setValue('supplier', supplierId);
  };

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files);
  };

  const handleFileRemove = (file: File) => {
    setSelectedFiles(prev => prev.filter(f => f !== file));
  };

  const onSubmit = async (data: ExpenseFormData) => {
    try {
      // Validate title manually since we're not using register
      if (!data.title || data.title.trim() === '') {
        setValue('title', '', { shouldValidate: true });
        return;
      }

      if (selectedFiles.length > 0) {
        data.attachment = selectedFiles[0]; // Προς το παρόν υποστηρίζουμε μόνο ένα αρχείο
      }
      
      await createExpense(data);
      reset();
      setSelectedFiles([]);
      onSuccess?.();
    } catch (error) {
      console.error('Error creating expense:', error);
    }
  };

  const groupedCategories = EXPENSE_CATEGORIES.reduce((acc, category) => {
    if (!acc[category.group]) {
      acc[category.group] = [];
    }
    acc[category.group].push(category);
    return acc;
  }, {} as Record<string, typeof EXPENSE_CATEGORIES>);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Νέα Δαπάνη</h2>
      
      {/* Auto-complete info */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Έξυπνοι Αυτοματισμοί
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>• <strong>Γρήγορη επιλογή τίτλου</strong> με dropdown βάσει κατηγορίας</p>
              <p>• <strong>Αυτόματη ημερομηνία</strong> (τελευταία ημέρα μήνα για μηνιαίες δαπάνες)</p>
              <p>• <strong>Αυτόματη κατανομή</strong> βάσει τύπου δαπάνης</p>
            </div>
          </div>
        </div>
      </div>
      
      {(error || uploadError) && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error || uploadError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Τίτλος Δαπάνης */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Τίτλος Δαπάνης *
            </label>
            <ExpenseTitleDropdown
              value={selectedTitle || ''}
              onChange={(value) => setValue('title', value)}
              category={selectedCategory}
              supplier={selectedSupplierDetails}
              placeholder="Επιλέξτε τίτλο δαπάνης"
              error={errors.title?.message}
            />
            {/* Hidden input for form validation */}
            <input
              type="hidden"
              {...register('title', { required: 'Απαιτείται' })}
            />
          </div>

          {/* Ποσό */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ποσό (€) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              {...register('amount', { 
                required: 'Απαιτείται',
                min: { value: 0, message: 'Το ποσό πρέπει να είναι θετικό' }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
            {errors.amount && (
              <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
            )}
          </div>

          {/* Ημερομηνία */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ημερομηνία *
              {selectedCategory && isMonthlyExpense(selectedCategory) && (
                <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  Αυτόματη (τελευταία ημέρα μήνα)
                </span>
              )}
            </label>
            <input
              type="date"
              {...register('date', { required: 'Απαιτείται' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.date && (
              <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
            )}
          </div>

          {/* Κατηγορία */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Κατηγορία *
            </label>
            <select
              {...register('category', { required: 'Απαιτείται' })}
              onChange={handleCategoryChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Επιλέξτε κατηγορία</option>
              {Object.entries(groupedCategories).map(([group, categories]) => (
                <optgroup key={group} label={group}>
                  {categories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {errors.category && (
              <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
            )}
          </div>

          {/* Τρόπος Κατανομής */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Τρόπος Κατανομής *
              {selectedCategory && (
                <span className="ml-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                  Αυτόματη επιλογή
                </span>
              )}
            </label>
            <select
              {...register('distribution_type', { required: 'Απαιτείται' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DISTRIBUTION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {errors.distribution_type && (
              <p className="mt-1 text-sm text-red-600">{errors.distribution_type.message}</p>
            )}
          </div>

          {/* Προμηθευτής */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Προμηθευτής/Συναλλασόμενος
            </label>
            <SupplierSelector
              buildingId={buildingId}
              category={selectedCategory}
              value={selectedSupplier}
              onChange={handleSupplierChange}
              placeholder="Επιλέξτε προμηθευτή (προαιρετικό)"
              disabled={!selectedCategory}
            />
            {!selectedCategory && (
              <p className="mt-1 text-sm text-gray-500">
                Επιλέξτε πρώτα κατηγορία για να δείτε τους διαθέσιμους προμηθευτές
              </p>
            )}
          </div>

          {/* Επισύναψη */}
          <div className="md:col-span-2">
            <FileUpload
              onFilesSelected={handleFilesSelected}
              onFileRemove={handleFileRemove}
              selectedFiles={selectedFiles}
              label="Επισύναψη Παραστατικού"
              placeholder="Κάντε κλικ για επιλογή παραστατικού ή σύρετε εδώ"
              multiple={false}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
              maxSize={10}
              maxFiles={1}
            />
            
            {/* Progress Bar */}
            {isUploading && progress && (
              <div className="mt-4">
                <ProgressBar
                  progress={progress.percentage}
                  label="Φόρτωση αρχείου..."
                  variant="default"
                  size="md"
                />
              </div>
            )}
            
            {/* File Preview */}
            {selectedFiles.length > 0 && (
              <div className="mt-4">
                {selectedFiles.map((file, index) => (
                  <FilePreview
                    key={`${file.name}-${index}`}
                    file={file}
                    onRemove={() => handleFileRemove(file)}
                    showPreview={true}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Σημειώσεις */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Σημειώσεις
          </label>
          <textarea
            {...register('notes')}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Προαιρετικές σημειώσεις..."
          />
        </div>

        {/* Κουμπιά */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Ακύρωση
          </button>
          <button
            type="submit"
            disabled={isLoading || isUploading}
            className="px-4 py-2 text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading || isUploading ? 'Αποθήκευση...' : 'Αποθήκευση Δαπάνης'}
          </button>
        </div>
      </form>
    </div>
  );
}; 
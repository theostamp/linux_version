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
import { CategorySearchDropdown } from './CategorySearchDropdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, AlertCircle, CheckCircle } from 'lucide-react';

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
    formState: { errors, isValid },
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
    
    if (category) {
      // Auto-set distribution type based on category
      const defaultDistribution = getDefaultDistributionType(category);
      setValue('distribution_type', defaultDistribution);
      
      // Auto-set date for monthly expenses
      if (isMonthlyExpense(category)) {
        const suggestedDate = getSuggestedDate(category);
        setValue('date', suggestedDate);
      }
      
      // Auto-set title to the selected category name
      const selectedCategoryDetails = EXPENSE_CATEGORIES.find(cat => cat.value === category);
      if (selectedCategoryDetails) {
        setValue('title', selectedCategoryDetails.label);
      }
    }
    
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
      // If no title is provided, use the category name as title
      if (!data.title || data.title.trim() === '') {
        const selectedCategoryDetails = EXPENSE_CATEGORIES.find(cat => cat.value === data.category);
        data.title = selectedCategoryDetails ? selectedCategoryDetails.label : 'Δαπάνη';
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Νέα Δαπάνη</h1>
          <p className="text-gray-600 mt-1">Καταχώρηση νέας δαπάνης για το κτίριο</p>
        </div>
        {isValid && (
          <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">
            <CheckCircle className="w-4 h-4 mr-1" />
            Φόρμα έγκυρη
          </Badge>
        )}
      </div>

      {/* Error Alerts */}
      {(error || uploadError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || uploadError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600" />
              Βασικές Πληροφορίες
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Κατηγορία */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Κατηγορία Δαπάνης *
                </label>
                <CategorySearchDropdown
                  value={selectedCategory || ''}
                  onChange={(value) => {
                    setValue('category', value);
                    handleCategoryChange({ target: { value } } as React.ChangeEvent<HTMLSelectElement>);
                  }}
                  placeholder="Αναζήτηση κατηγορίας..."
                  error={errors.category?.message}
                />
                <input
                  type="hidden"
                  {...register('category', { required: 'Απαιτείται' })}
                />
                {errors.category && (
                  <p className="text-sm text-red-600">{errors.category.message}</p>
                )}
              </div>

              {/* Τίτλος Δαπάνης */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Τίτλος Δαπάνης
                </label>
                <ExpenseTitleDropdown
                  value={selectedTitle || ''}
                  onChange={(value) => setValue('title', value)}
                  category={selectedCategory}
                  supplier={selectedSupplierDetails}
                  placeholder="Επιλέξτε τίτλο δαπάνης (προαιρετικό)"
                  error={errors.title?.message}
                />
                <input
                  type="hidden"
                  {...register('title')}
                />
                {errors.title && (
                  <p className="text-sm text-red-600">{errors.title.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Details Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-green-600" />
              Οικονομικά Στοιχεία
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Ποσό */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Ποσό (€) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="999999.99"
                  {...register('amount', { 
                    required: 'Απαιτείται',
                    min: { value: 0, message: 'Το ποσό πρέπει να είναι θετικό' },
                    onChange: (e) => {
                      // Allow user to type freely
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        // Don't force formatting during typing
                      }
                    },
                    onBlur: (e) => {
                      // Round to 2 decimal places when user finishes editing
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        const roundedValue = Math.round(value * 100) / 100;
                        e.target.value = roundedValue.toFixed(2);
                      }
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
                {errors.amount && (
                  <p className="text-sm text-red-600">{errors.amount.message}</p>
                )}
              </div>

              {/* Ημερομηνία */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Ημερομηνία *
                  {selectedCategory && isMonthlyExpense(selectedCategory) && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Αυτόματη
                    </Badge>
                  )}
                </label>
                <input
                  type="date"
                  {...register('date', { required: 'Απαιτείται' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.date && (
                  <p className="text-sm text-red-600">{errors.date.message}</p>
                )}
              </div>

              {/* Τρόπος Κατανομής */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Τρόπος Κατανομής *
                  {selectedCategory && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Αυτόματη
                    </Badge>
                  )}
                </label>
                <select
                  {...register('distribution_type', { required: 'Απαιτείται' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {DISTRIBUTION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {errors.distribution_type && (
                  <p className="text-sm text-red-600">{errors.distribution_type.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Supplier Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-purple-600" />
              Προμηθευτής & Επισύναψη
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Προμηθευτής */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
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
                  <p className="text-sm text-gray-500">
                    Επιλέξτε πρώτα κατηγορία για να δείτε τους διαθέσιμους προμηθευτές
                  </p>
                )}
              </div>

              {/* Επισύναψη */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Επισύναψη Παραστατικού
                </label>
                <FileUpload
                  onFilesSelected={handleFilesSelected}
                  onFileRemove={handleFileRemove}
                  selectedFiles={selectedFiles}
                  placeholder="Κάντε κλικ για επιλογή παραστατικού ή σύρετε εδώ"
                  multiple={false}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                  maxSize={10}
                  maxFiles={1}
                />
              </div>
            </div>

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
          </CardContent>
        </Card>

        {/* Notes Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-orange-600" />
              Σημειώσεις
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Προαιρετικές Σημειώσεις
              </label>
              <textarea
                {...register('notes')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Προσθέστε σημειώσεις για αυτή τη δαπάνη..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
          >
            Ακύρωση
          </button>
          <button
            type="submit"
            disabled={isLoading || isUploading}
            className="px-6 py-2 text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading || isUploading ? 'Αποθήκευση...' : 'Αποθήκευση Δαπάνης'}
          </button>
        </div>
      </form>
    </div>
  );
}; 
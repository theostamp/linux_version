import React, { useState, useEffect, useRef } from 'react';
import { ExpenseCategory } from '@/types/financial';

interface CategorySearchDropdownProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: string;
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
  
  // Δαπάνες Συντήρησης
  { value: 'maintenance_general', label: 'Γενική Συντήρηση Κτιρίου', group: 'Συντήρηση' },
  { value: 'maintenance_plumbing', label: 'Συντήρηση Υδραυλικών', group: 'Συντήρηση' },
  { value: 'maintenance_electrical', label: 'Συντήρηση Ηλεκτρικών', group: 'Συντήρηση' },
  { value: 'maintenance_structural', label: 'Συντήρηση Δομικών Στοιχείων', group: 'Συντήρηση' },
  { value: 'maintenance_roof', label: 'Συντήρηση Στέγης', group: 'Συντήρηση' },
  { value: 'maintenance_facade', label: 'Συντήρηση Πρόσοψης', group: 'Συντήρηση' },
  { value: 'maintenance_garden', label: 'Συντήρηση Κήπου', group: 'Συντήρηση' },
  { value: 'maintenance_parking', label: 'Συντήρηση Χώρων Στάθμευσης', group: 'Συντήρηση' },
  
  // Δαπάνες Ασφάλειας
  { value: 'insurance_building', label: 'Ασφάλεια Κτιρίου', group: 'Ασφάλεια' },
  { value: 'insurance_liability', label: 'Ασφάλεια Ευθύνης', group: 'Ασφάλεια' },
  { value: 'insurance_equipment', label: 'Ασφάλεια Εξοπλισμού', group: 'Ασφάλεια' },
  
  // Δαπάνες Διοίκησης
  { value: 'management_fees', label: 'Διοικητικά Έξοδα', group: 'Διοίκηση' },
  { value: 'accounting_fees', label: 'Λογιστικά Έξοδα', group: 'Διοίκηση' },
  { value: 'legal_fees', label: 'Νομικά Έξοδα', group: 'Διοίκηση' },
  { value: 'meeting_expenses', label: 'Έξοδα Συνεδριάσεων', group: 'Διοίκηση' },
  
  // Δαπάνες Τηλεπικοινωνιών
  { value: 'internet_common', label: 'Διαδίκτυο Κοινοχρήστων', group: 'Τηλεπικοινωνίες' },
  { value: 'phone_common', label: 'Τηλέφωνο Κοινοχρήστων', group: 'Τηλεπικοινωνίες' },
  { value: 'tv_antenna', label: 'Τηλεοπτική Κεραία', group: 'Τηλεπικοινωνίες' },
  
  // Δαπάνες Εξοπλισμού
  { value: 'equipment_purchase', label: 'Αγορά Εξοπλισμού', group: 'Εξοπλισμός' },
  { value: 'equipment_repair', label: 'Επισκευή Εξοπλισμού', group: 'Εξοπλισμός' },
  { value: 'equipment_maintenance', label: 'Συντήρηση Εξοπλισμού', group: 'Εξοπλισμός' },
  
  // Δαπάνες Καθαρισμού
  { value: 'cleaning_supplies', label: 'Καθαριστικά Υλικά', group: 'Καθαρισμός' },
  { value: 'cleaning_equipment', label: 'Εξοπλισμός Καθαρισμού', group: 'Καθαρισμός' },
  { value: 'cleaning_services', label: 'Υπηρεσίες Καθαρισμού', group: 'Καθαρισμός' },
  
  // Δαπάνες Ασφάλειας & Πυρασφάλειας
  { value: 'fire_safety', label: 'Πυρασφάλεια', group: 'Ασφάλεια & Πυρασφάλεια' },
  { value: 'security_systems', label: 'Συστήματα Ασφάλειας', group: 'Ασφάλεια & Πυρασφάλεια' },
  { value: 'cctv', label: 'Καμερές Ασφαλείας', group: 'Ασφάλεια & Πυρασφάλεια' },
  { value: 'access_control', label: 'Σύστημα Ελέγχου Πρόσβασης', group: 'Ασφάλεια & Πυρασφάλεια' },
  
  // Δαπάνες Ενέργειας
  { value: 'energy_audit', label: 'Ενεργειακός Έλεγχος', group: 'Ενέργεια' },
  { value: 'energy_upgrades', label: 'Βελτιώσεις Ενεργειακής Απόδοσης', group: 'Ενέργεια' },
  { value: 'solar_panels', label: 'Φωτοβολταϊκά Πάνελ', group: 'Ενέργεια' },
  { value: 'led_lighting', label: 'LED Φωτισμός', group: 'Ενέργεια' },
  
  // Δαπάνες Περιβάλλοντος
  { value: 'waste_management', label: 'Διαχείριση Αποβλήτων', group: 'Περιβάλλον' },
  { value: 'recycling', label: 'Ανακύκλωση', group: 'Περιβάλλον' },
  { value: 'green_spaces', label: 'Πράσινοι Χώροι', group: 'Περιβάλλον' },
  
  // Δαπάνες Τεχνολογίας
  { value: 'smart_home', label: 'Έξυπνο Σπίτι', group: 'Τεχνολογία' },
  { value: 'automation', label: 'Αυτοματισμοί', group: 'Τεχνολογία' },
  { value: 'smart_systems', label: 'Έξυπνα Συστήματα', group: 'Τεχνολογία' },
  
  // Δαπάνες Ιδιοκτητών
  { value: 'special_contribution', label: 'Έκτακτη Εισφορά', group: 'Ιδιοκτητές' },
  { value: 'reserve_fund', label: 'Αποθεματικό Ταμείο', group: 'Ιδιοκτητές' },
  { value: 'emergency_fund', label: 'Ταμείο Έκτακτης Ανάγκης', group: 'Ιδιοκτητές' },
  { value: 'renovation_fund', label: 'Ταμείο Ανακαίνισης', group: 'Ιδιοκτητές' },
  
  // Άλλες Δαπάνες
  { value: 'miscellaneous', label: 'Διάφορες Δαπάνες', group: 'Άλλες Δαπάνες' },
  { value: 'consulting_fees', label: 'Εργασίες Συμβούλου', group: 'Άλλες Δαπάνες' },
  { value: 'permits_licenses', label: 'Άδειες & Αποδοχές', group: 'Άλλες Δαπάνες' },
  { value: 'taxes_fees', label: 'Φόροι & Τέλη', group: 'Άλλες Δαπάνες' },
  { value: 'utilities_other', label: 'Άλλες Κοινόχρηστες Υπηρεσίες', group: 'Άλλες Δαπάνες' },
  { value: 'other', label: 'Άλλο', group: 'Άλλες Δαπάνες' },
];

export const CategorySearchDropdown: React.FC<CategorySearchDropdownProps> = ({
  value,
  onChange,
  placeholder = "Αναζήτηση κατηγορίας...",
  className = "",
  disabled = false,
  error
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCategories, setFilteredCategories] = useState<typeof EXPENSE_CATEGORIES>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get selected category details
  const selectedCategory = EXPENSE_CATEGORIES.find(cat => cat.value === value);

  // Filter categories based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCategories(EXPENSE_CATEGORIES);
    } else {
      const filtered = EXPENSE_CATEGORIES.filter(category =>
        category.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.group.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCategories(filtered);
    }
    setSelectedIndex(-1);
  }, [searchTerm]);

  // Group filtered categories
  const groupedFilteredCategories = filteredCategories.reduce((acc, category) => {
    if (!acc[category.group]) {
      acc[category.group] = [];
    }
    acc[category.group].push(category);
    return acc;
  }, {} as Record<string, typeof EXPENSE_CATEGORIES>);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setIsOpen(true);
  };

  // Handle input focus
  const handleInputFocus = () => {
    if (!disabled) {
      setIsOpen(true);
      setSearchTerm('');
    }
  };

  // Handle input blur
  const handleInputBlur = () => {
    setTimeout(() => {
      setIsOpen(false);
      setSelectedIndex(-1);
    }, 150);
  };

  // Handle key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    const allCategories = Object.values(groupedFilteredCategories).flat();

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < allCategories.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : allCategories.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          selectCategory(allCategories[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle category selection
  const selectCategory = (category: typeof EXPENSE_CATEGORIES[0]) => {
    onChange(category.value);
    setIsOpen(false);
    setSelectedIndex(-1);
    setSearchTerm('');
    inputRef.current?.focus();
  };

  // Handle category click
  const handleCategoryClick = (category: typeof EXPENSE_CATEGORIES[0]) => {
    selectCategory(category);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get current display value
  const getDisplayValue = () => {
    if (isOpen) {
      return searchTerm;
    }
    return selectedCategory ? selectedCategory.label : '';
  };

  const allCategories = Object.values(groupedFilteredCategories).flat();

  return (
    <div className="relative" ref={dropdownRef}>
      <input
        ref={inputRef}
        type="text"
        value={getDisplayValue()}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-500' : ''
        } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''} ${className}`}
      />
      
      {/* Search indicator */}
      {isOpen && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="text-gray-400 text-xs bg-white px-1">
            {filteredCategories.length} κατηγορίες
          </div>
        </div>
      )}

      {/* Categories dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredCategories.length === 0 ? (
            <div className="px-3 py-2 text-gray-500">
              Δεν βρέθηκαν κατηγορίες
            </div>
          ) : (
            <div>
              {Object.entries(groupedFilteredCategories).map(([group, categories]) => (
                <div key={group}>
                  <div className="px-3 py-1 bg-gray-50 text-xs font-medium text-gray-600 border-b">
                    {group}
                  </div>
                  {categories.map((category, index) => {
                    const globalIndex = allCategories.findIndex(cat => cat.value === category.value);
                    return (
                      <button
                        key={category.value}
                        type="button"
                        onClick={() => handleCategoryClick(category)}
                        className={`
                          w-full px-3 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none
                          ${globalIndex === selectedIndex ? 'bg-blue-100' : ''}
                          ${selectedCategory?.value === category.value ? 'bg-blue-50 text-blue-900' : ''}
                        `}
                      >
                        <div className="text-sm text-gray-800">{category.label}</div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { ExpenseCategory, Supplier } from '@/types/financial';
import { useExpenseTemplates } from '@/hooks/useExpenseTemplates';

interface ExpenseTitleDropdownProps {
  value: string;
  onChange: (value: string) => void;
  category?: ExpenseCategory;
  supplier?: Supplier;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: string;
}

export const ExpenseTitleDropdown: React.FC<ExpenseTitleDropdownProps> = ({
  value,
  onChange,
  category,
  supplier,
  placeholder = "Επιλέξτε τίτλο δαπάνης",
  className = "",
  disabled = false,
  error
}) => {
  const { getTitleSuggestions } = useExpenseTemplates();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [customTitle, setCustomTitle] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Get suggestions when category or supplier changes
  useEffect(() => {
    if (category) {
      const titleSuggestions = getTitleSuggestions(category, supplier);
      setSuggestions(titleSuggestions);
      
      // If current value is not in suggestions, show custom input
      if (value && !titleSuggestions.includes(value)) {
        setCustomTitle(value);
        setShowCustomInput(true);
      } else if (value && titleSuggestions.includes(value)) {
        setShowCustomInput(false);
      }
    } else {
      setSuggestions([]);
      setShowCustomInput(false);
      setCustomTitle('');
    }
  }, [category, supplier, value, getTitleSuggestions]);

  // Handle dropdown selection
  const handleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    
    if (selectedValue === 'custom') {
      setShowCustomInput(true);
      onChange(customTitle || '');
    } else if (selectedValue === '') {
      setShowCustomInput(false);
      setCustomTitle('');
      onChange('');
    } else {
      setShowCustomInput(false);
      setCustomTitle('');
      onChange(selectedValue);
    }
  };

  // Handle custom input change
  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setCustomTitle(newValue);
    onChange(newValue);
  };

  // Handle custom input blur
  const handleCustomInputBlur = () => {
    if (!customTitle.trim()) {
      setShowCustomInput(false);
      setCustomTitle('');
      onChange('');
    }
  };

  // Get current display value
  const getDisplayValue = () => {
    if (showCustomInput) {
      return 'custom';
    }
    if (value && suggestions.includes(value)) {
      return value;
    }
    return '';
  };

  return (
    <div className="space-y-2">
      {/* Main Dropdown */}
      <select
        value={getDisplayValue()}
        onChange={handleDropdownChange}
        disabled={disabled || !category}
        className={`w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-500' : ''
        } ${disabled || !category ? 'bg-gray-100 cursor-not-allowed' : ''} ${className}`}
      >
        <option value="">
          {category ? placeholder : 'Επιλέξτε πρώτα κατηγορία'}
        </option>
        
        {suggestions.length > 0 && (
          <optgroup label="Προτεινόμενοι τίτλοι">
            {suggestions.map((suggestion, index) => (
              <option key={index} value={suggestion}>
                {suggestion}
              </option>
            ))}
          </optgroup>
        )}
        
        {category && (
          <option value="custom">
            ✏️ Προσαρμοσμένος τίτλος...
          </option>
        )}
      </select>

      {/* Custom Input */}
      {showCustomInput && (
        <div className="mt-2">
          <input
            type="text"
            value={customTitle}
            onChange={handleCustomInputChange}
            onBlur={handleCustomInputBlur}
            placeholder="Πληκτρολογήστε τον τίτλο..."
            className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
            autoFocus
          />
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Help text */}
      {!category && (
        <p className="text-sm text-gray-500">
          Επιλέξτε κατηγορία για να δείτε προτάσεις τίτλου
        </p>
      )}

      {/* Suggestions count */}
      {category && suggestions.length > 0 && !showCustomInput && (
        <p className="text-sm text-gray-500">
          {suggestions.length} προτάσεις διαθέσιμες (προαιρετικό)
        </p>
      )}
    </div>
  );
};

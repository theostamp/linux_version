import React, { useState, useEffect, useRef } from 'react';
import { ExpenseCategory, Supplier } from '@/types/financial';
import { useExpenseTemplates } from '@/hooks/useExpenseTemplates';

interface ExpenseTitleAutoCompleteProps {
  value: string;
  onChange: (value: string) => void;
  category?: ExpenseCategory;
  supplier?: Supplier;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: string;
}

export const ExpenseTitleAutoComplete: React.FC<ExpenseTitleAutoCompleteProps> = ({
  value,
  onChange,
  category,
  supplier,
  placeholder = "π.χ. ΔΕΗ Ιανουαρίου 2024",
  className = "",
  disabled = false,
  error
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { getTitleSuggestions } = useExpenseTemplates();

  // Get suggestions based on category and supplier
  const getSuggestions = () => {
    if (!category) return [];
    return getTitleSuggestions(category, supplier);
  };

  // Filter suggestions based on input
  const filterSuggestions = (input: string, suggestions: string[]) => {
    if (!input.trim()) return suggestions;
    return suggestions.filter(suggestion =>
      suggestion.toLowerCase().includes(input.toLowerCase())
    );
  };

  // Update suggestions when category, supplier, or input changes
  useEffect(() => {
    const suggestions = getSuggestions();
    const filtered = filterSuggestions(inputValue, suggestions);
    setFilteredSuggestions(filtered);
    setSelectedIndex(-1);
  }, [category, supplier, inputValue]);

  // Update input value when value prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    setIsOpen(true);
  };

  // Handle input focus
  const handleInputFocus = () => {
    if (!disabled && getSuggestions().length > 0) {
      setIsOpen(true);
    }
  };

  // Handle input blur
  const handleInputBlur = () => {
    // Delay closing to allow for clicks on suggestions
    setTimeout(() => {
      setIsOpen(false);
      setSelectedIndex(-1);
    }, 150);
  };

  // Handle key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filteredSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          selectSuggestion(filteredSuggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle suggestion selection
  const selectSuggestion = (suggestion: string) => {
    setInputValue(suggestion);
    onChange(suggestion);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    selectSuggestion(suggestion);
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

  const suggestions = getSuggestions();
  const hasSuggestions = suggestions.length > 0 && !disabled;

  return (
    <div className="relative" ref={dropdownRef}>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
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
      
      {/* Auto-complete indicator */}
      {hasSuggestions && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="text-gray-400 text-xs bg-white px-1">
            {filteredSuggestions.length > 0 ? `${filteredSuggestions.length} προτάσεις` : 'προτάσεις'}
          </div>
        </div>
      )}

      {/* Suggestions dropdown */}
      {isOpen && hasSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredSuggestions.map((suggestion, index) => (
            <div
              key={index}
              className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${
                index === selectedIndex ? 'bg-blue-100' : ''
              }`}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className="text-sm text-gray-800">{suggestion}</div>
              {category && (
                <div className="text-xs text-gray-500 mt-1">
                  Κατηγορία: {category}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {/* Help text when no suggestions */}
      {hasSuggestions && filteredSuggestions.length === 0 && inputValue.trim() && (
        <p className="mt-1 text-sm text-gray-500">
          Δεν βρέθηκαν προτάσεις για "{inputValue}"
        </p>
      )}

      {/* Help text when no category selected */}
      {!category && (
        <p className="mt-1 text-sm text-gray-500">
          Επιλέξτε κατηγορία για να δείτε προτάσεις τίτλου
        </p>
      )}
    </div>
  );
}; 
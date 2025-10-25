'use client';

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ExpenseCategory } from '@/types/financial';

interface CategorySelectorProps {
  value?: ExpenseCategory;
  onValueChange: (value: ExpenseCategory) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  value,
  onValueChange,
  label = 'Κατηγορία',
  placeholder = 'Επιλέξτε κατηγορία',
  disabled = false,
  required = false,
  error,
}) => {
  const getCategoryLabel = (category: ExpenseCategory) => {
    const labels: Partial<Record<ExpenseCategory, string>> = {
      [ExpenseCategory.ELECTRICITY_COMMON]: 'Ηλεκτρισμός',
      [ExpenseCategory.WATER_COMMON]: 'Νερό',
      [ExpenseCategory.HEATING_FUEL]: 'Θέρμανση',
      [ExpenseCategory.CLEANING]: 'Καθαριότητα',
      [ExpenseCategory.BUILDING_MAINTENANCE]: 'Συντήρηση',
      [ExpenseCategory.BUILDING_INSURANCE]: 'Ασφάλεια',
      [ExpenseCategory.MANAGEMENT_FEES]: 'Διοίκηση',
      [ExpenseCategory.OTHER]: 'Άλλο',
    };
    return labels[category] || category;
  };

  const getCategoryIcon = (category: ExpenseCategory) => {
    const icons: Partial<Record<ExpenseCategory, string>> = {
      [ExpenseCategory.ELECTRICITY_COMMON]: '⚡',
      [ExpenseCategory.WATER_COMMON]: '💧',
      [ExpenseCategory.HEATING_FUEL]: '🔥',
      [ExpenseCategory.CLEANING]: '🧹',
      [ExpenseCategory.BUILDING_MAINTENANCE]: '🔧',
      [ExpenseCategory.BUILDING_INSURANCE]: '🛡️',
      [ExpenseCategory.MANAGEMENT_FEES]: '📋',
      [ExpenseCategory.OTHER]: '📦',
    };
    return icons[category] || '📦';
  };

  const getCategoryColor = (category: ExpenseCategory) => {
    const colors: Partial<Record<ExpenseCategory, string>> = {
      [ExpenseCategory.ELECTRICITY_COMMON]: 'text-blue-600',
      [ExpenseCategory.WATER_COMMON]: 'text-cyan-600',
      [ExpenseCategory.HEATING_FUEL]: 'text-orange-600',
      [ExpenseCategory.CLEANING]: 'text-green-600',
      [ExpenseCategory.BUILDING_MAINTENANCE]: 'text-purple-600',
      [ExpenseCategory.BUILDING_INSURANCE]: 'text-red-600',
      [ExpenseCategory.MANAGEMENT_FEES]: 'text-gray-600',
      [ExpenseCategory.OTHER]: 'text-yellow-600',
    };
    return colors[category] || 'text-gray-600';
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor="category-selector" className={required ? 'after:content-["*"] after:ml-0.5 after:text-red-500' : ''}>
          {label}
        </Label>
      )}
      <Select
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectTrigger id="category-selector" className={error ? 'border-red-500' : ''}>
          <SelectValue placeholder={placeholder}>
            {value && (
              <div className="flex items-center gap-2">
                <span className="text-lg">{getCategoryIcon(value)}</span>
                <span className={getCategoryColor(value)}>
                  {getCategoryLabel(value)}
                </span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.values(ExpenseCategory).map((category) => (
            <SelectItem key={category} value={category}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{getCategoryIcon(category)}</span>
                <span className={getCategoryColor(category)}>
                  {getCategoryLabel(category)}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}; 
'use client';

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ExpenseCategory, type ExpenseCategory as ExpenseCategoryType } from '@/types/financial';

interface CategorySelectorProps {
  value?: ExpenseCategoryType;
  onValueChange: (value: ExpenseCategoryType) => void;
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
  // Simplified category mapping for common categories
  const getCategoryLabel = (category: ExpenseCategoryType) => {
    const categoryStr = category.toLowerCase();
    if (categoryStr.includes('electricity') || categoryStr.includes('electrical')) return 'Ηλεκτρισμός';
    if (categoryStr.includes('water')) return 'Νερό';
    if (categoryStr.includes('heating')) return 'Θέρμανση';
    if (categoryStr.includes('cleaning')) return 'Καθαριότητα';
    if (categoryStr.includes('maintenance')) return 'Συντήρηση';
    if (categoryStr.includes('insurance')) return 'Ασφάλεια';
    if (categoryStr.includes('administration') || categoryStr.includes('admin')) return 'Διοίκηση';
    if (categoryStr === 'other') return 'Άλλο';
    return category;
  };

  const getCategoryIcon = (category: ExpenseCategoryType) => {
    const categoryStr = category.toLowerCase();
    if (categoryStr.includes('electricity') || categoryStr.includes('electrical')) return '⚡';
    if (categoryStr.includes('water')) return '💧';
    if (categoryStr.includes('heating')) return '🔥';
    if (categoryStr.includes('cleaning')) return '🧹';
    if (categoryStr.includes('maintenance')) return '🔧';
    if (categoryStr.includes('insurance')) return '🛡️';
    if (categoryStr.includes('administration') || categoryStr.includes('admin')) return '📋';
    return '📦';
  };

  const getCategoryColor = (category: ExpenseCategoryType) => {
    const categoryStr = category.toLowerCase();
    if (categoryStr.includes('electricity') || categoryStr.includes('electrical')) return 'text-blue-600';
    if (categoryStr.includes('water')) return 'text-cyan-600';
    if (categoryStr.includes('heating')) return 'text-orange-600';
    if (categoryStr.includes('cleaning')) return 'text-green-600';
    if (categoryStr.includes('maintenance')) return 'text-purple-600';
    if (categoryStr.includes('insurance')) return 'text-red-600';
    if (categoryStr.includes('administration') || categoryStr.includes('admin')) return 'text-gray-600';
    return 'text-yellow-600';
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
          <SelectValue placeholder={placeholder} />
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

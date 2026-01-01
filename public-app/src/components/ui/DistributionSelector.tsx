'use client';

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { DistributionType } from '@/types/financial';

interface DistributionSelectorProps {
  value?: DistributionType;
  onValueChange: (value: DistributionType) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  showDescription?: boolean;
}

export const DistributionSelector: React.FC<DistributionSelectorProps> = ({
  value,
  onValueChange,
  label = 'Τύπος Κατανομής',
  placeholder = 'Επιλέξτε τύπο κατανομής',
  disabled = false,
  required = false,
  error,
  showDescription = true,
}) => {
  const getDistributionLabel = (distribution: DistributionType) => {
    const labels: Record<DistributionType, string> = {
      [DistributionType.EQUAL]: 'Ισόποσα',
      [DistributionType.MILLS]: 'Χιλιοστά',
      [DistributionType.METERS]: 'Μετρητές',
    };
    return labels[distribution] || distribution;
  };

  const getDistributionDescription = (distribution: DistributionType) => {
    const descriptions: Record<DistributionType, string> = {
      [DistributionType.EQUAL]: 'Η δαπάνη κατανέμεται ισόποσα σε όλα τα διαμερίσματα',
      [DistributionType.MILLS]: 'Η δαπάνη κατανέμεται ανάλογα με τα χιλιοστά συμμετοχής κάθε διαμερίσματος',
      [DistributionType.METERS]: 'Η δαπάνη κατανέμεται ανάλογα με τις μετρήσεις των μετρητών',
    };
    return descriptions[distribution] || '';
  };

  const getDistributionIcon = (distribution: DistributionType) => {
    const icons: Record<DistributionType, string> = {
      [DistributionType.EQUAL]: '⚖️',
      [DistributionType.MILLS]: '📊',
      [DistributionType.METERS]: '📈',
    };
    return icons[distribution] || '📊';
  };

  const getDistributionColor = (distribution: DistributionType) => {
    const colors: Record<DistributionType, string> = {
      [DistributionType.EQUAL]: 'text-blue-600',
      [DistributionType.MILLS]: 'text-purple-600',
      [DistributionType.METERS]: 'text-green-600',
    };
    return colors[distribution] || 'text-gray-600';
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor="distribution-selector" className={required ? 'after:content-["*"] after:ml-0.5 after:text-red-500' : ''}>
          {label}
        </Label>
      )}
      <Select
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectTrigger id="distribution-selector" className={error ? 'border-red-500' : ''}>
          <SelectValue placeholder={placeholder}>
            {value && (
              <div className="flex items-center gap-2">
                <span className="text-lg">{getDistributionIcon(value)}</span>
                <span className={getDistributionColor(value)}>
                  {getDistributionLabel(value)}
                </span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.values(DistributionType).map((distribution) => (
            <SelectItem key={distribution} value={distribution}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{getDistributionIcon(distribution)}</span>
                <div className="flex flex-col">
                  <span className={getDistributionColor(distribution)}>
                    {getDistributionLabel(distribution)}
                  </span>
                  {showDescription && (
                    <span className="text-xs text-gray-500">
                      {getDistributionDescription(distribution)}
                    </span>
                  )}
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      {showDescription && value && (
        <p className="text-sm text-gray-500">
          {getDistributionDescription(value)}
        </p>
      )}
    </div>
  );
};

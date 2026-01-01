'use client';

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';

interface MonthSelectorProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  className?: string;
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({
  selectedMonth,
  onMonthChange,
  className = ''
}) => {
  // Memoize month options to avoid recalculation on every render
  const monthOptions = React.useMemo(() => {
    const months = [];
    const currentDate = new Date();

    // Go back 2 years
    for (let i = 24; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('el-GR', {
        year: 'numeric',
        month: 'long'
      });
      months.push({ value, label });
    }

    // Go forward 6 months
    for (let i = 1; i <= 6; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('el-GR', {
        year: 'numeric',
        month: 'long'
      });
      months.push({ value, label });
    }

    return months;
  }, []); // Empty dependency array - only calculate once

  // Debounced month change handler to avoid performance issues
  const handleMonthChange = React.useCallback((newMonth: string) => {
    if (newMonth !== selectedMonth) {
      onMonthChange(newMonth);
    }
  }, [selectedMonth, onMonthChange]);

  // Get current month value for comparison
  const currentDate = new Date();
  const currentMonthValue = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Select value={selectedMonth} onValueChange={handleMonthChange}>
        <SelectTrigger className="w-56 bg-white border-blue-300 hover:border-blue-400 focus:border-blue-500 transition-colors">
          <SelectValue placeholder="Επιλέξτε μήνα" />
        </SelectTrigger>
        <SelectContent className="max-h-80 bg-white dark:bg-zinc-900">
          {/* Current Month Section - Only show if current month is selected or available */}
          {selectedMonth === currentMonthValue && (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-900/30 border-b">
                Τρέχων Μήνας
              </div>
              {monthOptions.slice(24, 25).map((month) => (
                <SelectItem
                  key={month.value}
                  value={month.value}
                  className="font-semibold text-blue-700 bg-blue-50/50 dark:bg-blue-900/20 dark:text-blue-300"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    {month.label}
                  </div>
                </SelectItem>
              ))}
            </>
          )}

          {/* Recent Months Section */}
          <div className="px-2 py-1.5 text-xs font-semibold text-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-300 border-b">
            Πρόσφατοι Μήνες
          </div>
          {monthOptions.slice(18, 25).map((month) => {
            // Skip current month if it's already shown in the current month section
            if (month.value === currentMonthValue && selectedMonth === currentMonthValue) {
              return null;
            }

            return (
              <SelectItem key={month.value} value={month.value}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  {month.label}
                </div>
              </SelectItem>
            );
          })}

          {/* Historical Months Section */}
          <div className="px-2 py-1.5 text-xs font-semibold text-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-300 border-b">
            Ιστορικά Δεδομένα
          </div>
          {monthOptions.slice(0, 18).map((month) => (
            <SelectItem key={month.value} value={month.value}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                {month.label}
              </div>
            </SelectItem>
          ))}

          {/* Future Months Section */}
          <div className="px-2 py-1.5 text-xs font-semibold text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-300 border-b">
            Μελλοντικοί Μήνες
          </div>
          {monthOptions.slice(25).map((month) => (
            <SelectItem key={month.value} value={month.value}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                {month.label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

import React from 'react';
import { CalculatorWizard } from './CalculatorWizard';

interface CommonExpenseCalculatorNewProps {
  buildingId: number;
  selectedMonth?: string;
  reserveFundMonthlyAmount?: number;
}

export const CommonExpenseCalculatorNew: React.FC<CommonExpenseCalculatorNewProps> = ({
  buildingId,
  selectedMonth,
  reserveFundMonthlyAmount
}) => {
  const handleComplete = (results: any) => {
    // Handle completion - could trigger refresh of other components
    console.log('Calculator completed:', results);
  };

  console.log('🔄 CommonExpenseCalculatorNew: Received props:', {
    buildingId,
    selectedMonth,
    reserveFundMonthlyAmount
  });

  return (
    <div className="w-full">
      <CalculatorWizard
        buildingId={buildingId}
        selectedMonth={selectedMonth}
        reserveFundMonthlyAmount={reserveFundMonthlyAmount}
        onComplete={handleComplete}
      />
    </div>
  );
};

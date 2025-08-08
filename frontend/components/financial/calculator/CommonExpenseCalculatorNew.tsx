import React from 'react';
import { CalculatorWizard } from './CalculatorWizard';

interface CommonExpenseCalculatorNewProps {
  buildingId: number;
  selectedMonth?: string;
}

export const CommonExpenseCalculatorNew: React.FC<CommonExpenseCalculatorNewProps> = ({ 
  buildingId, 
  selectedMonth 
}) => {
  const handleComplete = (results: any) => {
    // Handle completion - could trigger refresh of other components
    console.log('Calculator completed:', results);
  };

  return (
    <div className="w-full">
      <CalculatorWizard
        buildingId={buildingId}
        selectedMonth={selectedMonth}
        onComplete={handleComplete}
      />
    </div>
  );
};

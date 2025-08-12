import React, { useState, useCallback, useEffect } from 'react';
import { ResultsStep } from './ResultsStep';

export interface CalculatorState {
  // Step 1: Period Selection
  periodMode: 'quick' | 'custom' | 'advanced';
  quickOptions: {
    currentMonth: boolean;
    previousMonth: boolean;
    customRange: boolean;
  };
  customPeriod: {
    startDate: string;
    endDate: string;
    periodName: string;
  };
  advancedOptions: {
    includeReserveFund: boolean;
    reserveFundMonthlyAmount: number;
    heatingFixedPercentage: number;
    elevatorMills: boolean;
  };
  
  // Step 2: Results
  shares: Record<string, any>;
  totalExpenses: number;
  advancedShares: any;
  isIssuing: boolean;
}

interface CalculatorWizardProps {
  buildingId: number;
  selectedMonth?: string;
  reserveFundMonthlyAmount?: number;
  onComplete?: (results: any) => void;
}



export const CalculatorWizard: React.FC<CalculatorWizardProps> = ({ 
  buildingId, 
  selectedMonth,
  reserveFundMonthlyAmount,
  onComplete 
}) => {
  // Auto-calculate current month dates
  const getCurrentMonthDates = () => {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      periodName: now.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' })
    };
  };

  // Simplified wizard - now just displays results directly
  const [state, setState] = useState<CalculatorState>({
    // Step 1 defaults
    periodMode: 'quick',
    quickOptions: {
      currentMonth: true,
      previousMonth: false,
      customRange: false,
    },
    customPeriod: getCurrentMonthDates(),
    advancedOptions: {
      includeReserveFund: true, // Auto-enabled when reserve fund amount > 0
      reserveFundMonthlyAmount: 0.0, // Will be updated from BuildingOverviewSection
      heatingFixedPercentage: 30,
      elevatorMills: false,
    },
    
    // Step 2 defaults
    shares: {},
    totalExpenses: 0,
    advancedShares: null,
    isIssuing: false,
  });

  const updateState = useCallback((updates: Partial<CalculatorState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Update period when selectedMonth changes
  useEffect(() => {
    console.log('🔄 CalculatorWizard: useEffect triggered with selectedMonth:', selectedMonth);
    
    if (selectedMonth) {
      // Parse selectedMonth (format: "2025-03") and create period dates
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1); // month - 1 because Date months are 0-indexed
      const endDate = new Date(year, month, 0); // Last day of the month
      
      const periodName = startDate.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });
      
      const newPeriod = {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        periodName
      };
      
      console.log('🔄 CalculatorWizard: Setting new period:', newPeriod);
      
      setState(prev => {
        console.log('🔄 CalculatorWizard: Previous state customPeriod:', prev.customPeriod);
        return {
          ...prev,
          customPeriod: newPeriod
        };
      });
    } else {
      console.log('🔄 CalculatorWizard: No selectedMonth, using current month');
      // When no selectedMonth, use current month as default
      const currentMonthDates = getCurrentMonthDates();
      setState(prev => ({
        ...prev,
        customPeriod: currentMonthDates
      }));
    }
  }, [selectedMonth]);

  // Update reserve fund monthly amount when prop changes
  // Auto-enable reserve fund if amount is greater than 0
  useEffect(() => {
    if (reserveFundMonthlyAmount !== undefined) {
      setState(prev => ({
        ...prev,
        advancedOptions: {
          ...prev.advancedOptions,
          reserveFundMonthlyAmount,
          includeReserveFund: reserveFundMonthlyAmount > 0
        }
      }));
    }
  }, [reserveFundMonthlyAmount]);



  const renderStep = useCallback(() => {
    return (
      <ResultsStep
        state={state}
        updateState={updateState}
        buildingId={buildingId}
        onComplete={onComplete}
      />
    );
  }, [state, updateState, buildingId, onComplete]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {renderStep()}
    </div>
  );
};

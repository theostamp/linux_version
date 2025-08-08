import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { PeriodSelectionStep } from './PeriodSelectionStep';
import { CalculationStep } from './CalculationStep';
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
    heatingFixedPercentage: number;
    elevatorMills: boolean;
  };
  
  // Step 2: Calculation
  isCalculating: boolean;
  calculationProgress: number;
  calculationError: string | null;
  
  // Step 3: Results
  shares: Record<string, any>;
  totalExpenses: number;
  advancedShares: any;
  isIssuing: boolean;
}

interface CalculatorWizardProps {
  buildingId: number;
  selectedMonth?: string;
  onComplete?: (results: any) => void;
}

const STEPS = [
  { id: 1, title: 'Επιλογή Περιόδου', description: 'Επιλέξτε την περίοδο υπολογισμού' },
  { id: 2, title: 'Υπολογισμός', description: 'Πραγματοποιήστε τον υπολογισμό' },
  { id: 3, title: 'Αποτελέσματα', description: 'Εξετάστε και εκδώστε τα αποτελέσματα' }
];

export const CalculatorWizard: React.FC<CalculatorWizardProps> = ({ 
  buildingId, 
  selectedMonth, 
  onComplete 
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [state, setState] = useState<CalculatorState>({
    // Step 1 defaults
    periodMode: 'quick',
    quickOptions: {
      currentMonth: true,
      previousMonth: false,
      customRange: false,
    },
    customPeriod: {
      startDate: '',
      endDate: '',
      periodName: '',
    },
    advancedOptions: {
      includeReserveFund: true,
      heatingFixedPercentage: 30,
      elevatorMills: false,
    },
    
    // Step 2 defaults
    isCalculating: false,
    calculationProgress: 0,
    calculationError: null,
    
    // Step 3 defaults
    shares: {},
    totalExpenses: 0,
    advancedShares: null,
    isIssuing: false,
  });

  const updateState = useCallback((updates: Partial<CalculatorState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const canProceedToNext = useCallback(() => {
    switch (currentStep) {
      case 1:
        return state.periodMode === 'quick' || 
               (state.periodMode === 'custom' && 
                state.customPeriod.startDate && 
                state.customPeriod.endDate && 
                state.customPeriod.periodName);
      case 2:
        return Object.keys(state.shares).length > 0;
      case 3:
        return true;
      default:
        return false;
    }
  }, [currentStep, state.periodMode, state.customPeriod, state.shares]);

  const renderStep = useCallback(() => {
    switch (currentStep) {
      case 1:
        return (
          <PeriodSelectionStep
            state={state}
            updateState={updateState}
            selectedMonth={selectedMonth}
          />
        );
      case 2:
        return (
          <CalculationStep
            state={state}
            updateState={updateState}
            buildingId={buildingId}
            onComplete={nextStep}
          />
        );
      case 3:
        return (
          <ResultsStep
            state={state}
            updateState={updateState}
            buildingId={buildingId}
            onComplete={onComplete}
          />
        );
      default:
        return null;
    }
  }, [currentStep, state, updateState, selectedMonth, buildingId, nextStep, onComplete]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Progress Steps */}
            <div className="flex items-center justify-between">
              {STEPS.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    currentStep > step.id 
                      ? 'bg-green-500 border-green-500 text-white' 
                      : currentStep === step.id 
                        ? 'bg-blue-500 border-blue-500 text-white' 
                        : 'bg-gray-100 border-gray-300 text-gray-500'
                  }`}>
                    {currentStep > step.id ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <span className="text-sm font-medium">{step.id}</span>
                    )}
                  </div>
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">
                      {step.title}
                    </div>
                    <div className="text-xs text-gray-500">
                      {step.description}
                    </div>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-4 ${
                      currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            
            {/* Progress Bar */}
            <Progress 
              value={(currentStep / STEPS.length) * 100} 
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl font-bold text-blue-600">
              Βήμα {currentStep}
            </span>
            <span className="text-lg text-gray-600">
              {STEPS[currentStep - 1].title}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderStep()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 1}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Προηγούμενο
        </Button>
        
        <Button
          onClick={nextStep}
          disabled={!canProceedToNext()}
          className="flex items-center gap-2"
        >
          {currentStep === 3 ? 'Ολοκλήρωση' : 'Επόμενο'}
          {currentStep < 3 && <ChevronRight className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
};

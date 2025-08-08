import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calculator, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Play,
  Eye,
  FileText,
  TrendingUp
} from 'lucide-react';
import { CalculatorState } from './CalculatorWizard';
import { useCommonExpenses } from '@/hooks/useCommonExpenses';
import { toast } from 'sonner';

interface CalculationStepProps {
  state: CalculatorState;
  updateState: (updates: Partial<CalculatorState>) => void;
  buildingId: number;
  onComplete: () => void;
}

export const CalculationStep: React.FC<CalculationStepProps> = ({
  state,
  updateState,
  buildingId,
  onComplete
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const { calculateShares, calculateAdvancedShares } = useCommonExpenses();

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('el-GR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getPeriodInfo = () => {
    if (state.periodMode === 'quick') {
      if (state.quickOptions.currentMonth) {
        const now = new Date();
        return now.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });
      } else if (state.quickOptions.previousMonth) {
        const now = new Date();
        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return prevMonth.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });
      }
    }
    return state.customPeriod.periodName;
  };

  const getCalculationParams = () => {
    const baseParams = {
      building_id: buildingId,
      start_date: state.customPeriod.startDate,
      end_date: state.customPeriod.endDate,
      period_name: state.customPeriod.periodName,
    };

    if (state.advancedOptions.includeReserveFund || 
        state.advancedOptions.heatingFixedPercentage !== 30 || 
        state.advancedOptions.elevatorMills) {
      return {
        ...baseParams,
        advanced: true,
        include_reserve_fund: state.advancedOptions.includeReserveFund,
        heating_fixed_percentage: state.advancedOptions.heatingFixedPercentage,
        elevator_mills: state.advancedOptions.elevatorMills,
      };
    }

    return baseParams;
  };

  const handleCalculate = async () => {
    try {
      updateState({
        isCalculating: true,
        calculationProgress: 0,
        calculationError: null
      });

      const params = getCalculationParams();
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        updateState(prev => ({
          calculationProgress: Math.min(prev.calculationProgress + 10, 90)
        }));
      }, 200);

      let result;
      if (params.advanced) {
        result = await calculateAdvancedShares(params);
      } else {
        result = await calculateShares(params);
      }

      clearInterval(progressInterval);
      
      updateState({
        isCalculating: false,
        calculationProgress: 100,
        shares: result.shares || {},
        totalExpenses: result.total_expenses || 0,
        advancedShares: params.advanced ? result : null
      });

      toast.success('Ο υπολογισμός ολοκληρώθηκε επιτυχώς!');
      
      // Auto-advance to next step after a short delay
      setTimeout(() => {
        onComplete();
      }, 1500);

    } catch (error: any) {
      updateState({
        isCalculating: false,
        calculationProgress: 0,
        calculationError: error.message || 'Σφάλμα κατά τον υπολογισμό'
      });
      
      toast.error('Σφάλμα κατά τον υπολογισμό: ' + (error.message || 'Άγνωστο σφάλμα'));
    }
  };

  const handlePreview = async () => {
    try {
      setShowPreview(true);
      updateState({ calculationProgress: 0 });
      
      const params = getCalculationParams();
      const result = params.advanced ? 
        await calculateAdvancedShares(params) : 
        await calculateShares(params);
      
      setPreviewData(result);
      updateState({ calculationProgress: 100 });
      
    } catch (error: any) {
      toast.error('Σφάλμα κατά την προεπισκόπηση: ' + (error.message || 'Άγνωστο σφάλμα'));
    }
  };

  const getCalculationSummary = () => {
    if (!previewData && Object.keys(state.shares).length === 0) {
      return null;
    }

    const data = previewData || state;
    const totalApartments = Object.keys(data.shares || {}).length;
    const totalAmount = data.totalExpenses || data.total_expenses || 0;

    return {
      totalApartments,
      totalAmount,
      averagePerApartment: totalApartments > 0 ? totalAmount / totalApartments : 0
    };
  };

  const summary = getCalculationSummary();

  return (
    <div className="space-y-6">
      {/* Calculation Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Κατάσταση Υπολογισμού
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            Περίοδος: <span className="font-medium">{getPeriodInfo()}</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Progress Bar */}
            {state.isCalculating && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Πρόοδος υπολογισμού...</span>
                  <span>{state.calculationProgress}%</span>
                </div>
                <Progress value={state.calculationProgress} className="w-full" />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Επεξεργασία δεδομένων...
                </div>
              </div>
            )}

            {/* Error Display */}
            {state.calculationError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{state.calculationError}</AlertDescription>
              </Alert>
            )}

            {/* Success Display */}
            {!state.isCalculating && Object.keys(state.shares).length > 0 && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Ο υπολογισμός ολοκληρώθηκε επιτυχώς! Προχωρήστε στο επόμενο βήμα.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Calculation Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Επιλογές Υπολογισμού
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={handleCalculate}
              disabled={state.isCalculating}
              className="flex items-center gap-2"
              size="lg"
            >
              {state.isCalculating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Calculator className="h-4 w-4" />
              )}
              {state.isCalculating ? 'Υπολογισμός...' : 'Έναρξη Υπολογισμού'}
            </Button>
            
            <Button 
              onClick={handlePreview}
              disabled={state.isCalculating}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              Προεπισκόπηση
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Results */}
      {showPreview && previewData && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Eye className="h-5 w-5" />
              Προεπισκόπηση Αποτελεσμάτων
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold text-gray-800">Συνολικές Δαπάνες</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {formatAmount(previewData.total_expenses || 0)}€
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="font-semibold text-gray-800">Διαμερίσματα</span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {Object.keys(previewData.shares || {}).length}
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Calculator className="h-4 w-4 text-orange-600" />
                  <span className="font-semibold text-gray-800">Μέσο Όρο</span>
                </div>
                <div className="text-2xl font-bold text-orange-600">
                  {formatAmount((previewData.total_expenses || 0) / Math.max(Object.keys(previewData.shares || {}).length, 1))}€
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <Button 
                onClick={() => setShowPreview(false)}
                variant="outline"
                size="sm"
              >
                Κλείσιμο Προεπισκόπησης
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calculation Summary */}
      {summary && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-green-800">Σύνοψη Υπολογισμού</h4>
                <p className="text-sm text-green-600">
                  {summary.totalApartments} διαμερίσματα • {formatAmount(summary.totalAmount)}€ συνολικά
                </p>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Επιτυχής
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advanced Options Summary */}
      {(state.advancedOptions.includeReserveFund || 
        state.advancedOptions.heatingFixedPercentage !== 30 || 
        state.advancedOptions.elevatorMills) && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-orange-800">Ενεργές Προηγμένες Επιλογές</h4>
                <div className="text-sm text-orange-600 space-y-1">
                  {state.advancedOptions.includeReserveFund && (
                    <div>• Εισφορά αποθεματικού: 5€ ανά διαμέρισμα</div>
                  )}
                  {state.advancedOptions.heatingFixedPercentage !== 30 && (
                    <div>• Πάγιο ποσοστό θέρμανσης: {state.advancedOptions.heatingFixedPercentage}%</div>
                  )}
                  {state.advancedOptions.elevatorMills && (
                    <div>• Ειδικά χιλιοστά ανελκυστήρα</div>
                  )}
                </div>
              </div>
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                Προηγμένο
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

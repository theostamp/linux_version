import React, { useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  Settings, 
  Zap, 
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { CalculatorState } from './CalculatorWizard';

interface PeriodSelectionStepProps {
  state: CalculatorState;
  updateState: (updates: Partial<CalculatorState>) => void;
  selectedMonth?: string;
}

export const PeriodSelectionStep: React.FC<PeriodSelectionStepProps> = ({
  state,
  updateState,
  selectedMonth
}) => {
  const hasInitialized = useRef(false);
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  // Helper functions for date handling
  const getCurrentMonthDates = useCallback(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    return {
      startDate: firstDay.toISOString().split('T')[0],
      endDate: lastDay.toISOString().split('T')[0],
      periodName: firstDay.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' })
    };
  }, []);

  const getPreviousMonthDates = useCallback(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() - 1;
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    return {
      startDate: firstDay.toISOString().split('T')[0],
      endDate: lastDay.toISOString().split('T')[0],
      periodName: firstDay.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' })
    };
  }, []);

  const formatSelectedMonth = useCallback((monthString: string) => {
    if (!monthString) return '';
    
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });
  }, []);

  const getMonthDates = useCallback((monthString: string) => {
    if (!monthString) return { startDate: '', endDate: '' };
    
    const [year, month] = monthString.split('-');
    const yearNum = parseInt(year);
    const monthNum = parseInt(month) - 1;
    
    const firstDay = new Date(yearNum, monthNum, 1);
    const lastDay = new Date(yearNum, monthNum + 1, 0);
    
    return {
      startDate: firstDay.toISOString().split('T')[0],
      endDate: lastDay.toISOString().split('T')[0]
    };
  }, []);

  // Initialize with selectedMonth if provided
  useEffect(() => {
    if (selectedMonth && !state.customPeriod.startDate && !hasInitialized.current) {
      hasInitialized.current = true;
      const formattedMonth = formatSelectedMonth(selectedMonth);
      const { startDate, endDate } = getMonthDates(selectedMonth);
      
      updateState({
        periodMode: 'custom',
        customPeriod: {
          startDate,
          endDate,
          periodName: formattedMonth
        }
      });
    }
  }, [selectedMonth, formatSelectedMonth, getMonthDates, updateState, state.customPeriod.startDate]);

  const handleQuickSelect = useCallback((type: 'current' | 'previous') => {
    const dates = type === 'current' ? getCurrentMonthDates() : getPreviousMonthDates();
    
    updateState({
      periodMode: 'quick',
      quickOptions: {
        currentMonth: type === 'current',
        previousMonth: type === 'previous',
        customRange: false,
      },
      customPeriod: dates
    });
  }, [getCurrentMonthDates, getPreviousMonthDates, updateState]);

  const handleCustomPeriodChange = useCallback((field: keyof typeof state.customPeriod, value: string) => {
    updateState({
      periodMode: 'custom',
      customPeriod: {
        ...state.customPeriod,
        [field]: value
      }
    });
  }, [state.customPeriod, updateState]);

  const getPeriodSummary = useCallback(() => {
    if (state.periodMode === 'quick') {
      if (state.quickOptions.currentMonth) {
        const dates = getCurrentMonthDates();
        return `${dates.periodName} (${dates.startDate} - ${dates.endDate})`;
      } else if (state.quickOptions.previousMonth) {
        const dates = getPreviousMonthDates();
        return `${dates.periodName} (${dates.startDate} - ${dates.endDate})`;
      }
    } else if (state.periodMode === 'custom') {
      return `${state.customPeriod.periodName} (${state.customPeriod.startDate} - ${state.customPeriod.endDate})`;
    }
    return 'Δεν έχει επιλεγεί περίοδος';
  }, [state.periodMode, state.quickOptions, state.customPeriod, getCurrentMonthDates, getPreviousMonthDates]);

  return (
    <div className="space-y-6">
      {/* Quick Selection */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Zap className="h-5 w-5" />
            Γρήγορη Επιλογή
          </CardTitle>
          <div className="text-sm text-blue-600 flex items-center gap-2">
            <Info className="h-4 w-4" />
            Επιλέξτε για αυτόματη συμπλήρωση ημερομηνιών
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={() => handleQuickSelect('current')}
              variant={state.periodMode === 'quick' && state.quickOptions.currentMonth ? 'default' : 'outline'}
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Τρέχων Μήνας
            </Button>
            
            <Button 
              onClick={() => handleQuickSelect('previous')}
              variant={state.periodMode === 'quick' && state.quickOptions.previousMonth ? 'default' : 'outline'}
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Προηγούμενος Μήνας
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Custom Period */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Προσαρμοσμένη Περίοδος
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            Συμπληρώστε χειροκίνητα την περίοδο υπολογισμού
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="periodName">Όνομα Περιόδου</Label>
              <Input
                id="periodName"
                value={state.customPeriod.periodName}
                onChange={(e) => handleCustomPeriodChange('periodName', e.target.value)}
                placeholder="π.χ. Ιανουάριος 2024"
                className={state.periodMode === 'custom' ? 'border-blue-300 bg-blue-50' : ''}
              />
            </div>
            <div>
              <Label htmlFor="startDate">Ημερομηνία Έναρξης</Label>
              <Input
                id="startDate"
                type="date"
                value={state.customPeriod.startDate}
                onChange={(e) => handleCustomPeriodChange('startDate', e.target.value)}
                className={state.periodMode === 'custom' ? 'border-blue-300 bg-blue-50' : ''}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Ημερομηνία Λήξης</Label>
              <Input
                id="endDate"
                type="date"
                value={state.customPeriod.endDate}
                onChange={(e) => handleCustomPeriodChange('endDate', e.target.value)}
                className={state.periodMode === 'custom' ? 'border-blue-300 bg-blue-50' : ''}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Options */}
      <Card>
        <CardHeader>
          <Button
            variant="ghost"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between w-full p-0 h-auto"
          >
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <span className="text-lg font-semibold">Προηγμένες Επιλογές</span>
            </div>
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CardHeader>
        
        {showAdvanced && (
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="reserve-fund">Εισφορά Αποθεματικού</Label>
                  <div className="text-sm text-muted-foreground">
                    Προσθήκη 5€ ανά διαμέρισμα στο αποθεματικό
                  </div>
                </div>
                <Switch
                  id="reserve-fund"
                  checked={state.advancedOptions.includeReserveFund}
                  onCheckedChange={(checked) => 
                    updateState({
                      advancedOptions: {
                        ...state.advancedOptions,
                        includeReserveFund: checked
                      }
                    })
                  }
                />
              </div>

              <div>
                <Label htmlFor="heating-percentage">Πάγιο Ποσοστό Θέρμανσης (%)</Label>
                <div className="text-sm text-muted-foreground mb-2">
                  Ποσοστό θέρμανσης που κατανέμεται ισόποσα
                </div>
                <Input
                  id="heating-percentage"
                  type="number"
                  min="0"
                  max="100"
                  value={state.advancedOptions.heatingFixedPercentage}
                  onChange={(e) => 
                    updateState({
                      advancedOptions: {
                        ...state.advancedOptions,
                        heatingFixedPercentage: parseInt(e.target.value) || 0
                      }
                    })
                  }
                  className="w-32"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="elevator-mills">Ειδικά Χιλιοστά Ανελκυστήρα</Label>
                  <div className="text-sm text-muted-foreground">
                    Χρήση ειδικών χιλιοστών για ανελκυστήρα
                  </div>
                </div>
                <Switch
                  id="elevator-mills"
                  checked={state.advancedOptions.elevatorMills}
                  onCheckedChange={(checked) => 
                    updateState({
                      advancedOptions: {
                        ...state.advancedOptions,
                        elevatorMills: checked
                      }
                    })
                  }
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Period Summary */}
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-green-800">Επιλεγμένη Περίοδος</h4>
              <p className="text-sm text-green-600">{getPeriodSummary()}</p>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              {state.periodMode === 'quick' ? 'Γρήγορη' : 
               state.periodMode === 'custom' ? 'Προσαρμοσμένη' : 'Προηγμένη'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

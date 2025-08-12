import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Send, 
  Download, 
  Printer, 
  ChevronDown, 
  ChevronUp,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Calculator,
  Building,
  Euro,
  Eye,
  TrendingDown,
  Users,
  AlertTriangle,
  RefreshCw,
  X
} from 'lucide-react';
import { CalculatorState } from './CalculatorWizard';
import { useCommonExpenses } from '@/hooks/useCommonExpenses';
import { toast } from 'sonner';
import { CommonExpenseModal } from './CommonExpenseModal';

interface ResultsStepProps {
  state: CalculatorState;
  updateState: (updates: Partial<CalculatorState>) => void;
  buildingId: number;
  onComplete?: (results: any) => void;
}

export const ResultsStep: React.FC<ResultsStepProps> = ({
  state,
  updateState,
  buildingId,
  onComplete
}) => {
  const [expandedBreakdown, setExpandedBreakdown] = useState<string | null>(null);
  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);
  const [showCommonExpenseModal, setShowCommonExpenseModal] = useState(false);
  const { issueCommonExpenses, calculateAdvancedShares, calculateShares } = useCommonExpenses();
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [calculationProgress, setCalculationProgress] = useState(0);
  const [calculationSuccess, setCalculationSuccess] = useState(false);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('el-GR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getDistributionTypeLabel = (type: string) => {
    switch (type) {
      case 'by_participation_mills':
        return 'Ανά Χιλιοστά';
      case 'equal_share':
        return 'Ισόποσα';
      case 'specific_apartments':
        return 'Συγκεκριμένα';
      case 'by_meters':
        return 'Μετρητές';
      default:
        return type;
    }
  };

  const handleIssue = async () => {
    try {
      updateState({ isIssuing: true });
      
      // Transform shares to match backend expectations
      const transformedShares: Record<string, { total_amount: number; breakdown: Record<string, any> }> = {};
      const expenseIds: number[] = [];
      
      Object.entries(state.shares).forEach(([apartmentId, share]) => {
        transformedShares[apartmentId] = {
          total_amount: share.total_amount,
          breakdown: share.breakdown ? share.breakdown.reduce((acc: Record<string, any>, item) => {
            acc[item.expense_id] = {
              expense_title: item.expense_title,
              expense_amount: item.expense_amount,
              apartment_share: item.apartment_share,
              distribution_type: item.distribution_type,
              distribution_type_display: item.distribution_type_display
            };
            // Collect expense IDs
            if (!expenseIds.includes(item.expense_id)) {
              expenseIds.push(item.expense_id);
            }
            return acc;
          }, {} as Record<string, any>) : {}
        };
      });
      
      const params = {
        building_id: buildingId,
        period_data: {
          name: state.customPeriod.periodName,
          start_date: state.customPeriod.startDate,
          end_date: state.customPeriod.endDate
        },
        shares: transformedShares,
        expense_ids: expenseIds
      };

      await issueCommonExpenses(params);
      
      toast.success('Τα κοινοχρήστα εκδόθηκαν επιτυχώς!');
      
      if (onComplete) {
        onComplete(params);
      }
      
    } catch (error: any) {
      toast.error('Σφάλμα κατά την έκδοση: ' + (error.message || 'Άγνωστο σφάλμα'));
    } finally {
      updateState({ isIssuing: false });
    }
  };

  const handleExport = (format: 'pdf' | 'excel') => {
    // TODO: Implement export functionality
    toast.info(`Εξαγωγή σε ${format.toUpperCase()} θα υλοποιηθεί σύντομα`);
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper function to check if period is within reserve fund collection timeline
  const checkIfPeriodInReserveFundTimeline = (startDate: string, endDate: string) => {
    try {
      // Get reserve fund timeline from localStorage (same as BuildingOverviewSection)
      const getStorageKey = (key: string) => `reserve_fund_${buildingId}_${key}`;
      const getFromStorage = (key: string, defaultValue: any = null) => {
        try {
          const stored = localStorage.getItem(getStorageKey(key));
          return stored ? JSON.parse(stored) : defaultValue;
        } catch {
          return defaultValue;
        }
      };
      
      const reserveFundStartDate = getFromStorage('start_date', '2025-07-31');
      const reserveFundEndDate = getFromStorage('target_date', '2026-01-30');
      
      const periodStart = new Date(startDate);
      const periodEnd = new Date(endDate);
      const rfStart = new Date(reserveFundStartDate);
      const rfEnd = new Date(reserveFundEndDate);
      
      console.log('🔄 Reserve fund timeline check:', {
        periodStart: periodStart.toISOString().split('T')[0],
        periodEnd: periodEnd.toISOString().split('T')[0],
        rfStart: rfStart.toISOString().split('T')[0],
        rfEnd: rfEnd.toISOString().split('T')[0]
      });
      
      // Check if the period overlaps with reserve fund timeline
      const isWithinTimeline = periodStart <= rfEnd && periodEnd >= rfStart;
      
      console.log('🔄 Reserve fund within timeline:', isWithinTimeline);
      return isWithinTimeline;
    } catch (error) {
      console.error('Error checking reserve fund timeline:', error);
      return false; // Safe fallback
    }
  };

  const getPeriodInfo = () => {
    console.log('🔄 ResultsStep: getPeriodInfo called with state:', {
      periodMode: state.periodMode,
      customPeriod: state.customPeriod,
      quickOptions: state.quickOptions
    });
    
    // Always use customPeriod.periodName if it exists (this includes selectedMonth overrides)
    if (state.customPeriod.periodName) {
      console.log('🔄 ResultsStep: Using customPeriod.periodName:', state.customPeriod.periodName);
      return state.customPeriod.periodName;
    }
    
    // Fallback to quick mode calculations only if no custom period name
    if (state.periodMode === 'quick') {
      if (state.quickOptions.currentMonth) {
        const now = new Date();
        const result = now.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });
        console.log('🔄 ResultsStep: Using current month fallback:', result);
        return result;
      } else if (state.quickOptions.previousMonth) {
        const now = new Date();
        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const result = prevMonth.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });
        console.log('🔄 ResultsStep: Using previous month fallback:', result);
        return result;
      }
    }
    
    console.log('🔄 ResultsStep: Using default customPeriod.periodName:', state.customPeriod.periodName);
    return state.customPeriod.periodName;
  };

  const getSummaryStats = () => {
    const shares = Object.values(state.shares);
    const totalApartments = shares.length;
    const totalAmount = state.totalExpenses;
    const averagePerApartment = totalApartments > 0 ? totalAmount / totalApartments : 0;
    const totalDue = shares.reduce((sum: number, share: any) => sum + (share.total_due || 0), 0);
    const totalCredits = shares.reduce((sum: number, share: any) => sum + Math.max(0, share.total_due || 0), 0);

    return {
      totalApartments,
      totalAmount,
      averagePerApartment,
      totalDue,
      totalCredits
    };
  };

  const getPaymentAnalytics = () => {
    const shares = Object.values(state.shares);
    const totalApartments = shares.length;
    
    // Κατηγοριοποίηση διαμερισμάτων βάσει οφειλών
    const currentApartments = shares.filter((share: any) => (share.total_due || 0) >= 0).length;
    const behindApartments = shares.filter((share: any) => {
      const totalDue = share.total_due || 0;
      return totalDue < 0 && Math.abs(totalDue) <= (share.total_amount || 0) * 2; // Έως 2 μήνες καθυστέρηση
    }).length;
    const criticalApartments = shares.filter((share: any) => {
      const totalDue = share.total_due || 0;
      return totalDue < 0 && Math.abs(totalDue) > (share.total_amount || 0) * 2; // Πάνω από 2 μήνες καθυστέρηση
    }).length;
    
    // Υπολογισμός συνολικής κάλυψης
    const totalMonthlyObligations = shares.reduce((sum: number, share: any) => sum + (share.total_amount || 0), 0);
    const totalPendingAmount = shares.reduce((sum: number, share: any) => {
      const totalDue = share.total_due || 0;
      return sum + Math.max(0, Math.abs(totalDue));
    }, 0);
    
    const overallCoveragePercentage = totalApartments > 0 
      ? ((currentApartments / totalApartments) * 100)
      : 0;
    
    return {
      currentApartments,
      behindApartments,
      criticalApartments,
      totalPendingAmount,
      totalMonthlyObligations,
      overallCoveragePercentage
    };
  };

  const stats = getSummaryStats();
  const analytics = getPaymentAnalytics();

  // Auto-calculate results when entering the Results step
  React.useEffect(() => {
    const run = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        setCalculationProgress(0);
        
        const startDate = state.customPeriod.startDate;
        const endDate = state.customPeriod.endDate;
        if (!startDate || !endDate) return;
        
        // Simulate realistic progress
        const progressSteps = [
          { progress: 10, message: 'Φόρτωση δεδομένων κτιρίου...' },
          { progress: 30, message: 'Ανάκτηση δαπανών...' },
          { progress: 60, message: 'Υπολογισμός μεριδίων...' },
          { progress: 90, message: 'Τελικοί υπολογισμοί...' },
          { progress: 100, message: 'Ολοκληρώθηκε!' }
        ];
        
        for (let i = 0; i < progressSteps.length - 1; i++) {
          await new Promise(resolve => setTimeout(resolve, 300));
          setCalculationProgress(progressSteps[i].progress);
        }
        
        const isAdvanced = state.advancedOptions.includeReserveFund ||
          state.advancedOptions.heatingFixedPercentage !== 30 ||
          state.advancedOptions.elevatorMills;

        if (isAdvanced) {
          // Check if selected period is within reserve fund collection timeline
          const shouldIncludeReserveFund = state.advancedOptions.includeReserveFund && 
            checkIfPeriodInReserveFundTimeline(startDate, endDate);
          
          console.log('🔄 ResultsStep: Reserve fund check:', {
            includeReserveFund: state.advancedOptions.includeReserveFund,
            shouldIncludeReserveFund,
            startDate,
            endDate,
            reserveFundAmount: state.advancedOptions.reserveFundMonthlyAmount
          });
          
          const result = await calculateAdvancedShares({
            building_id: buildingId,
            period_start_date: startDate,
            period_end_date: endDate,
            month_filter: startDate ? startDate.substring(0, 7) : undefined, // "2025-05" format
            reserve_fund_monthly_total: shouldIncludeReserveFund
              ? state.advancedOptions.reserveFundMonthlyAmount
              : 0,
          });
          const shares = result?.shares || {};
          const totalExpenses = Object.values(shares).reduce((sum: number, share: any) => sum + (share.total_amount || 0), 0);
          updateState({ shares, totalExpenses, advancedShares: result });
        } else {
          const result = await calculateShares({
            building_id: buildingId,
            month_filter: startDate ? startDate.substring(0, 7) : undefined, // "2025-05" format
          });
          updateState({ shares: result.shares || {}, totalExpenses: result.total_expenses || 0, advancedShares: null });
        }
        
        setCalculationProgress(100);
        // Show success message
        setCalculationSuccess(true);
      } catch (err: any) {
        setLoadError(err?.message || 'Σφάλμα κατά τον υπολογισμό');
        setCalculationSuccess(false);
      } finally {
        // Small delay to show completion
        setTimeout(() => {
        setIsLoading(false);
          setCalculationProgress(0);
        }, 500);
        
        // Hide success message after 4 seconds (total)
        setTimeout(() => setCalculationSuccess(false), 4000);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingId, state.customPeriod.startDate, state.customPeriod.endDate, state.advancedOptions.includeReserveFund, state.advancedOptions.heatingFixedPercentage, state.advancedOptions.elevatorMills, state.advancedOptions.reserveFundMonthlyAmount]);

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="space-y-6">
      {/* Loading Progress */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            Υπολογισμός σε εξέλιξη...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Πρόοδος</span>
              <span>{calculationProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${calculationProgress}%` }}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards Skeleton */}
      <Card>
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-1/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white p-3 sm:p-4 rounded-lg border animate-pulse">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-4 w-4 bg-gray-300 rounded"></div>
                  <div className="h-4 bg-gray-300 rounded w-20"></div>
                </div>
                <div className="h-8 bg-gray-300 rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons Skeleton */}
      <Card>
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-1/4"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 sm:space-y-0">
            <div className="animate-pulse">
              <div className="h-12 bg-gray-300 rounded w-full sm:w-48"></div>
            </div>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table Skeleton */}
      <Card>
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-1/3"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="h-5 bg-gray-300 rounded w-12 mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-24"></div>
                    </div>
                    <div className="h-5 bg-gray-200 rounded w-16"></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map((j) => (
                      <div key={j}>
                        <div className="h-3 bg-gray-200 rounded w-16 mb-1"></div>
                        <div className="h-4 bg-gray-300 rounded w-12"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Enhanced error handling
  const ErrorStateComponent = ({ error }: { error: string }) => {
    const [isRetrying, setIsRetrying] = useState(false);
    
    const handleRetry = async () => {
      setIsRetrying(true);
      try {
        // Wait a moment before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        window.location.reload();
      } catch (err) {
        console.error('Retry failed:', err);
      } finally {
        setIsRetrying(false);
      }
    };

    const getErrorDetails = (error: string) => {
      if (error.toLowerCase().includes('network') || error.toLowerCase().includes('fetch')) {
        return {
          title: 'Πρόβλημα Σύνδεσης',
          description: 'Δεν ήταν δυνατή η σύνδεση με τον διακομιστή. Ελέγξτε τη σύνδεσή σας στο internet.',
          suggestions: [
            'Ελέγξτε τη σύνδεση internet',
            'Δοκιμάστε να ανανεώσετε τη σελίδα',
            'Προσπαθήστε ξανά σε λίγα λεπτά'
          ]
        };
      } else if (error.toLowerCase().includes('unauthorized') || error.toLowerCase().includes('403')) {
        return {
          title: 'Μη Εξουσιοδοτημένη Πρόσβαση',
          description: 'Δεν έχετε δικαίωμα πρόσβασης σε αυτά τα δεδομένα.',
          suggestions: [
            'Συνδεθείτε ξανά στο λογαριασμό σας',
            'Επικοινωνήστε με τον διαχειριστή',
            'Ελέγξτε τα δικαιώματά σας'
          ]
        };
      } else if (error.toLowerCase().includes('timeout')) {
        return {
          title: 'Λήξη Χρονικού Ορίου',
          description: 'Η αίτηση χρειάστηκε περισσότερο χρόνο από τον αναμενόμενο.',
          suggestions: [
            'Δοκιμάστε ξανά με λιγότερα δεδομένα',
            'Ελέγξτε τη ταχύτητα της σύνδεσής σας',
            'Προσπαθήστε ξανά αργότερα'
          ]
        };
      } else {
        return {
          title: 'Σφάλμα Υπολογισμού',
          description: error || 'Προέκυψε απροσδόκητο σφάλμα κατά τον υπολογισμό.',
          suggestions: [
            'Ελέγξτε αν όλα τα απαιτούμενα δεδομένα είναι διαθέσιμα',
            'Δοκιμάστε με διαφορετική περίοδο',
            'Επικοινωνήστε με την υποστήριξη αν το πρόβλημα συνεχίζεται'
          ]
        };
      }
    };

    const errorDetails = getErrorDetails(error);

  return (
    <div className="space-y-6">
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              {errorDetails.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-red-700">{errorDetails.description}</p>
            
            <div className="bg-red-100 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-800 mb-2">Προτεινόμενες Λύσεις:</h4>
              <ul className="list-disc list-inside space-y-1 text-red-700 text-sm">
                {errorDetails.suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={handleRetry}
                disabled={isRetrying}
                variant="outline" 
                className="border-red-300 text-red-700 hover:bg-red-100 flex items-center gap-2"
              >
                {isRetrying ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                    Επανάληψη...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Επανάληψη
                  </>
                )}
              </Button>
              
              <Button 
                onClick={() => {
                  // Go back to previous step or refresh data
                  setLoadError(null);
                  setIsLoading(false);
                }}
                variant="ghost" 
                className="text-gray-600 hover:text-gray-800"
              >
                <X className="h-4 w-4 mr-2" />
                Ακύρωση
              </Button>
            </div>

            <div className="mt-4 pt-4 border-t border-red-200">
              <details className="text-xs text-red-600">
                <summary className="cursor-pointer font-medium">Τεχνικές Λεπτομέρειες</summary>
                <pre className="mt-2 p-2 bg-red-50 rounded border text-red-800 overflow-auto">
                  {error}
                </pre>
              </details>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Show error state
  if (loadError) {
    return <ErrorStateComponent error={loadError} />;
  }

  // Show loading state
  if (isLoading || Object.keys(state.shares).length === 0) {
    return <LoadingSkeleton />;
  }

  // Success message component
  const SuccessMessage = () => (
    <Card className="border-green-200 bg-green-50/50 animate-in slide-in-from-top duration-500">
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h4 className="font-semibold text-green-800">Επιτυχής Υπολογισμός</h4>
            <p className="text-sm text-green-600">Τα δεδομένα ενημερώθηκαν επιτυχώς</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Success Message - shown after successful calculation */}
      {calculationSuccess && <SuccessMessage />}
      
      {/* Results Summary */}
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-5 w-5" />
              Αποτελέσματα Υπολογισμού
            </div>
            <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50 self-start sm:self-center">
              📅 {getPeriodInfo()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-3 sm:p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Building className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-sm sm:text-base text-gray-800">Διαμερίσματα</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-blue-600">
                {stats.totalApartments}
              </div>
            </div>
            
            <div className="bg-white p-3 sm:p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Euro className="h-4 w-4 text-green-600" />
                <span className="font-semibold text-sm sm:text-base text-gray-800">Συνολικές Δαπάνες</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-green-600">
                {formatAmount(stats.totalAmount)}€
              </div>
            </div>
            
            <div className="bg-white p-3 sm:p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="h-4 w-4 text-orange-600" />
                <span className="font-semibold text-sm sm:text-base text-gray-800">Μέσο Όρο</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-orange-600">
                {formatAmount(stats.averagePerApartment)}€
              </div>
            </div>
            
            <div className="bg-white p-3 sm:p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                <span className="font-semibold text-sm sm:text-base text-gray-800">Συνολικό Οφειλόμενο</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-purple-600">
                {formatAmount(stats.totalDue)}€
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Action Menu */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg text-blue-800">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Send className="h-5 w-5 text-blue-600" />
              </div>
              Ενέργειες Κοινοχρήστων
          </CardTitle>
            <div className="text-xs text-blue-600 font-medium bg-blue-100 px-2 py-1 rounded-full">
              {Object.keys(state.shares).length} Διαμερίσματα
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Primary Action - Issue Common Expenses */}
          <div className="mb-6">
            <Button 
              onClick={handleIssue}
              disabled={state.isIssuing}
              className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 text-base font-semibold"
            >
              <div className="flex items-center justify-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  {state.isIssuing ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </div>
                <div className="text-left">
                  <div>{state.isIssuing ? 'Επεξεργασία έκδοσης...' : 'Έκδοση Κοινοχρήστων'}</div>
                  <div className="text-xs text-blue-100 font-normal">
                    Τελική έκδοση και αποστολή
                  </div>
                </div>
              </div>
            </Button>
          </div>

          {/* Secondary Actions Grid */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-200 rounded"></div>
              Εργαλεία Εξαγωγής & Προβολής
            </h4>
            
            {/* Desktop: 2x2 Grid */}
            <div className="hidden sm:grid sm:grid-cols-2 gap-3">
              <button
              onClick={() => handleExport('pdf')}
                className="group flex items-center gap-3 p-4 bg-white border-2 border-red-200 rounded-xl hover:border-red-300 hover:bg-red-50/50 transition-all duration-200 hover:shadow-sm"
              >
                <div className="p-2 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                  <Download className="h-5 w-5 text-red-600" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-800 text-sm">Εξαγωγή PDF</div>
                  <div className="text-xs text-gray-500">Πλήρες αρχείο</div>
                </div>
              </button>

              <button
              onClick={() => handleExport('excel')}
                className="group flex items-center gap-3 p-4 bg-white border-2 border-green-200 rounded-xl hover:border-green-300 hover:bg-green-50/50 transition-all duration-200 hover:shadow-sm"
              >
                <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                  <Download className="h-5 w-5 text-green-600" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-800 text-sm">Εξαγωγή Excel</div>
                  <div className="text-xs text-gray-500">Επεξεργάσιμο</div>
                </div>
              </button>

              <button
              onClick={handlePrint}
                className="group flex items-center gap-3 p-4 bg-white border-2 border-purple-200 rounded-xl hover:border-purple-300 hover:bg-purple-50/50 transition-all duration-200 hover:shadow-sm"
              >
                <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                  <Printer className="h-5 w-5 text-purple-600" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-800 text-sm">Εκτύπωση</div>
                  <div className="text-xs text-gray-500">Άμεση εκτύπωση</div>
                </div>
              </button>

              <button
              onClick={() => setShowCommonExpenseModal(true)}
                className="group flex items-center gap-3 p-4 bg-white border-2 border-orange-200 rounded-xl hover:border-orange-300 hover:bg-orange-50/50 transition-all duration-200 hover:shadow-sm"
              >
                <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                  <Eye className="h-5 w-5 text-orange-600" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-800 text-sm">Φύλλο Κοινοχρήστων</div>
                  <div className="text-xs text-gray-500">Λεπτομερή προβολή</div>
                </div>
              </button>
            </div>

            {/* Mobile: Vertical Stack */}
            <div className="sm:hidden space-y-3">
              <button
                onClick={() => handleExport('pdf')}
                className="w-full flex items-center gap-3 p-4 bg-white border-2 border-red-200 rounded-xl hover:border-red-300 hover:bg-red-50/50 transition-all duration-200"
              >
                <div className="p-2 bg-red-100 rounded-lg">
                  <Download className="h-5 w-5 text-red-600" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-gray-800">Εξαγωγή PDF</div>
                  <div className="text-xs text-gray-500">Πλήρες αρχείο για αποθήκευση</div>
                </div>
              </button>

              <button
                onClick={() => handleExport('excel')}
                className="w-full flex items-center gap-3 p-4 bg-white border-2 border-green-200 rounded-xl hover:border-green-300 hover:bg-green-50/50 transition-all duration-200"
              >
                <div className="p-2 bg-green-100 rounded-lg">
                  <Download className="h-5 w-5 text-green-600" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-gray-800">Εξαγωγή Excel</div>
                  <div className="text-xs text-gray-500">Επεξεργάσιμο spreadsheet</div>
                </div>
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handlePrint}
                  className="flex items-center justify-center gap-2 p-3 bg-white border-2 border-purple-200 rounded-xl hover:border-purple-300 hover:bg-purple-50/50 transition-all duration-200"
                >
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Printer className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="text-sm font-semibold text-gray-800">Εκτύπωση</div>
                </button>

                <button
                  onClick={() => setShowCommonExpenseModal(true)}
                  className="flex items-center justify-center gap-2 p-3 bg-white border-2 border-orange-200 rounded-xl hover:border-orange-300 hover:bg-orange-50/50 transition-all duration-200"
                >
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Eye className="h-4 w-4 text-orange-600" />
                  </div>
                  <div className="text-sm font-semibold text-gray-800">Προβολή</div>
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Analytics Section */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Users className="h-5 w-5" />
            Ανάλυση Καταστάσεων Πληρωμών
          </CardTitle>
          <div className="text-sm text-blue-600">
            Κατηγοριοποίηση διαμερισμάτων και συνολική κάλυψη υποχρεώσεων
          </div>
        </CardHeader>
        <CardContent>
          {/* Payment Status Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-green-50 p-3 sm:p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-semibold text-xs sm:text-sm text-green-800">Ενημερωμένα</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-green-700">
                {analytics.currentApartments}
              </div>
              <div className="text-xs sm:text-sm text-green-600">
                διαμερίσματα
              </div>
            </div>

            <div className="bg-yellow-50 p-3 sm:p-4 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="font-semibold text-xs sm:text-sm text-yellow-800">Καθυστέρηση</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-yellow-700">
                {analytics.behindApartments}
              </div>
              <div className="text-xs sm:text-sm text-yellow-600">
                διαμερίσματα
              </div>
            </div>

            <div className="bg-red-50 p-3 sm:p-4 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span className="font-semibold text-xs sm:text-sm text-red-800">Κρίσιμα</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-red-700">
                {analytics.criticalApartments}
              </div>
              <div className="text-xs sm:text-sm text-red-600">
                διαμερίσματα
              </div>
            </div>

            <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200 col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-xs sm:text-sm text-blue-800">Συνολική Κάλυψη</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-blue-700">
                {analytics.overallCoveragePercentage.toFixed(1)}%
              </div>
              <div className="text-xs sm:text-sm text-blue-600">
                των υποχρεώσεων
              </div>
            </div>
          </div>

          {/* Financial Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Euro className="h-4 w-4 text-red-600" />
                <span className="font-semibold text-gray-800">Συνολικές Εκκρεμότητες</span>
              </div>
              <div className="text-xl font-bold text-red-700">
                {formatAmount(analytics.totalPendingAmount)}€
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Ποσά που οφείλονται από διαμερίσματα
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-gray-800">Μηνιαίες Υποχρεώσεις</span>
              </div>
              <div className="text-xl font-bold text-blue-700">
                {formatAmount(analytics.totalMonthlyObligations)}€
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Συνολικό μηνιαίο κόστος όλων των διαμερισμάτων
              </div>
            </div>
          </div>

          {/* Alert for Critical Situations */}
          {analytics.criticalApartments > 0 && (
            <Alert className="mt-4 border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-red-800">
                <strong>Προσοχή:</strong> Υπάρχουν {analytics.criticalApartments} διαμερίσματα σε κρίσιμη κατάσταση. 
                Συνιστάται άμεση επικοινωνία για τη διευθέτηση των οφειλών.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Λεπτομερή Αποτελέσματα
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile: Card Layout */}
          <div className="block lg:hidden space-y-3">
            {Object.values(state.shares).map((share: any) => (
              <Card key={share.apartment_id} className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-lg">{share.apartment_number}</h4>
                      <p className="text-sm text-gray-600">{share.owner_name}</p>
                    </div>
                    <Badge variant={share.total_due < 0 ? 'destructive' : 'default'} className="text-xs">
                      {share.total_due < 0 ? 'Οφειλόμενο' : 'Ενεργό'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <span className="text-xs text-gray-500">Χιλιοστά</span>
                      <p className="font-medium">{share.participation_mills}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Προηγ. Υπόλοιπο</span>
                      <p className={`font-medium ${share.previous_balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatAmount(share.previous_balance)}€
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Μερίδιο Δαπανών</span>
                      <p className="font-medium">{formatAmount(share.total_amount)}€</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Συνολικό Οφειλόμενο</span>
                      <p className={`font-bold text-lg ${
                        share.total_due < 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {formatAmount(share.total_due)}€
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExpandedBreakdown(
                      expandedBreakdown === share.apartment_id ? null : share.apartment_id
                    )}
                    className="w-full h-9 flex items-center justify-center gap-2"
                  >
                    {expandedBreakdown === share.apartment_id ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        Κρύψε Λεπτομέρειες
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        Εμφάνιση Λεπτομερειών
                      </>
                    )}
                  </Button>
                  
                  {expandedBreakdown === share.apartment_id && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <h5 className="font-semibold mb-2 text-sm">Ανάλυση ανά Δαπάνη</h5>
                      <div className="space-y-2">
                        {Array.isArray(share.breakdown) ? share.breakdown.map((item: any, index: number) => (
                          <div key={index} className="flex justify-between items-center text-sm border-b border-gray-200 pb-1 last:border-b-0">
                            <div className="flex-1">
                              <span className="block font-medium">{item.expense_title}</span>
                              <span className="text-xs text-gray-500">
                                {getDistributionTypeLabel(item.distribution_type)}
                              </span>
                            </div>
                            <span className="font-semibold ml-2">
                              {formatAmount(item.apartment_share)}€
                            </span>
                          </div>
                        )) : (
                          <div className="text-sm text-gray-500">
                            Δεν υπάρχουν λεπτομέρειες διαθέσιμες
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop: Table Layout */}
          <div className="hidden lg:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Διαμέρισμα</TableHead>
                <TableHead>Ιδιοκτήτης</TableHead>
                <TableHead>Χιλιοστά</TableHead>
                <TableHead>Προηγούμενο Υπόλοιπο</TableHead>
                <TableHead>Μερίδιο Δαπανών</TableHead>
                <TableHead>Συνολικό Οφειλόμενο</TableHead>
                <TableHead>Κατάσταση</TableHead>
                <TableHead>Λεπτομέρειες</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.values(state.shares).map((share: any) => (
                <TableRow key={share.apartment_id}>
                  <TableCell className="font-medium">
                    {share.apartment_number}
                  </TableCell>
                  <TableCell>{share.owner_name}</TableCell>
                  <TableCell>{share.participation_mills}</TableCell>
                  <TableCell className={share.previous_balance < 0 ? 'text-red-600' : 'text-green-600'}>
                    {formatAmount(share.previous_balance)}€
                  </TableCell>
                  <TableCell>{formatAmount(share.total_amount)}€</TableCell>
                  <TableCell className={`font-semibold ${
                    share.total_due < 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {formatAmount(share.total_due)}€
                  </TableCell>
                  <TableCell>
                    <Badge variant={share.total_due < 0 ? 'destructive' : 'default'}>
                      {share.total_due < 0 ? 'Οφειλόμενο' : 'Ενεργό'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedBreakdown(
                        expandedBreakdown === share.apartment_id ? null : share.apartment_id
                      )}
                    >
                      {expandedBreakdown === share.apartment_id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                    {expandedBreakdown === share.apartment_id && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                        <h5 className="font-semibold mb-2">Ανάλυση ανά Δαπάνη</h5>
                        <div className="space-y-1">
                          {Array.isArray(share.breakdown) ? share.breakdown.map((item: any, index: number) => (
                            <div key={index} className="flex justify-between items-center text-sm">
                              <span className="flex-1">{item.expense_title}</span>
                              <span className="text-muted-foreground mr-2">
                                {getDistributionTypeLabel(item.distribution_type)}
                              </span>
                              <span className="font-medium">
                                {formatAmount(item.apartment_share)}€
                              </span>
                            </div>
                          )) : (
                            <div className="text-sm text-gray-500">
                              Δεν υπάρχουν λεπτομέρειες διαθέσιμες
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Analysis */}
      {state.advancedShares && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Calculator className="h-5 w-5" />
              Προηγμένη Ανάλυση
            </CardTitle>
            <div className="text-sm text-orange-600">
              Λεπτομερής ανάλυση με ειδική διαχείριση θέρμανσης και ανελκυστήρα
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg border">
                  <h4 className="font-semibold text-gray-800 mb-2">Θέρμανση</h4>
                  <div className="text-2xl font-bold text-orange-600">
                    {formatAmount(state.advancedShares.heating_costs?.total || 0)}€
                  </div>
                  <div className="text-sm text-gray-600">
                    Πάγιο: {formatAmount(state.advancedShares.heating_costs?.fixed || 0)}€ | 
                    Μεταβλητό: {formatAmount(state.advancedShares.heating_costs?.variable || 0)}€
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-lg border">
                  <h4 className="font-semibold text-gray-800 mb-2">Ανελκυστήρας</h4>
                  <div className="text-2xl font-bold text-purple-600">
                    {formatAmount(state.advancedShares.elevator_costs || 0)}€
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-lg border">
                  <h4 className="font-semibold text-gray-800 mb-2">Αποθεματικό</h4>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatAmount(
                      checkIfPeriodInReserveFundTimeline(state.customPeriod.startDate, state.customPeriod.endDate) 
                        ? (state.advancedShares.reserve_contribution || 0)
                        : 0
                    )}€
                  </div>
                  <div className="text-sm text-gray-600">
                    Στόχος αποθεματικού (μήνας): {
                      checkIfPeriodInReserveFundTimeline(state.customPeriod.startDate, state.customPeriod.endDate)
                        ? (state.advancedOptions.reserveFundMonthlyAmount?.toFixed(2) || '0,00')
                        : '0,00'
                    }€ (κατανομή ανά χιλιοστά)
                  </div>
                  {!checkIfPeriodInReserveFundTimeline(state.customPeriod.startDate, state.customPeriod.endDate) && (
                    <div className="text-xs text-blue-600 mt-2 bg-blue-50 p-2 rounded">
                      📅 Ο επιλεγμένος μήνας είναι εκτός της περιόδου συλλογής αποθεματικού
                    </div>
                  )}
                </div>
              </div>

              {/* Advanced Details Toggle */}
              <Button
                variant="outline"
                onClick={() => setShowAdvancedDetails(!showAdvancedDetails)}
                className="flex items-center gap-2"
              >
                {showAdvancedDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {showAdvancedDetails ? 'Απόκρυψη' : 'Εμφάνιση'} Λεπτομερειών
              </Button>

              {showAdvancedDetails && (
                <div className="space-y-4">
                  {/* Category Breakdown */}
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3">Ανάλυση ανά Κατηγορία</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Κατηγορία</TableHead>
                          <TableHead>Συνολικό Ποσό</TableHead>
                          <TableHead>Ανά Διαμέρισμα</TableHead>
                          <TableHead>Μέθοδος Κατανομής</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.isArray(state.advancedShares.expense_breakdown) ? state.advancedShares.expense_breakdown.map((category: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{category.category}</TableCell>
                            <TableCell>{formatAmount(category.total_amount)}€</TableCell>
                            <TableCell>{formatAmount(category.per_apartment)}€</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {category.distribution_method}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-gray-500">
                              Δεν υπάρχουν διαθέσιμα δεδομένα ανάλυσης
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Elevator Shares */}
                  {state.advancedShares.elevator_shares && (
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-3">Ειδικά Χιλιοστά Ανελκυστήρα</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Διαμέρισμα</TableHead>
                            <TableHead>Χιλιοστά Ανελκυστήρα</TableHead>
                            <TableHead>Μερίδιο Ανελκυστήρα</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {state.advancedShares.elevator_shares && typeof state.advancedShares.elevator_shares === 'object' ? Object.values(state.advancedShares.elevator_shares).map((share: any) => (
                            <TableRow key={share.apartment_id}>
                              <TableCell className="font-medium">
                                {share.apartment_number}
                              </TableCell>
                              <TableCell>{share.elevator_mills}</TableCell>
                              <TableCell>{formatAmount(share.elevator_share)}€</TableCell>
                            </TableRow>
                          )) : (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center text-gray-500">
                                Δεν υπάρχουν διαθέσιμα δεδομένα ανελκυστήρα
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completion Status */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-blue-800">Ολοκλήρωση Υπολογισμού</h4>
              <p className="text-sm text-blue-600">
                Ο υπολογισμός ολοκληρώθηκε επιτυχώς. Μπορείτε να εκδώσετε τα κοινοχρήστα ή να εξάγετε τα αποτελέσματα.
              </p>
            </div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              Έτοιμο
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Common Expense Modal */}
      <CommonExpenseModal
        isOpen={showCommonExpenseModal}
        onClose={() => setShowCommonExpenseModal(false)}
        state={state}
        buildingId={buildingId}
        buildingName="Κτίριο Διαχείρισης"
      />
    </div>
  );
};

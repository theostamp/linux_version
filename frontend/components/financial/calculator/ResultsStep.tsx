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
  Eye
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
  const { issueCommonExpenses } = useCommonExpenses();

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

  const stats = getSummaryStats();

  return (
    <div className="space-y-6">
      {/* Results Summary */}
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <CheckCircle className="h-5 w-5" />
            Αποτελέσματα Υπολογισμού
          </CardTitle>
          <div className="text-sm text-green-600">
            Περίοδος: <span className="font-medium">{getPeriodInfo()}</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Building className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-gray-800">Διαμερίσματα</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {stats.totalApartments}
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Euro className="h-4 w-4 text-green-600" />
                <span className="font-semibold text-gray-800">Συνολικές Δαπάνες</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {formatAmount(stats.totalAmount)}€
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="h-4 w-4 text-orange-600" />
                <span className="font-semibold text-gray-800">Μέσο Όρο</span>
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {formatAmount(stats.averagePerApartment)}€
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                <span className="font-semibold text-gray-800">Συνολικό Οφειλόμενο</span>
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {formatAmount(stats.totalDue)}€
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Ενέργειες
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={handleIssue}
              disabled={state.isIssuing}
              className="flex items-center gap-2"
              size="lg"
            >
              <Send className="h-4 w-4" />
              {state.isIssuing ? 'Έκδοση...' : 'Έκδοση Κοινοχρήστων'}
            </Button>
            
            <Button 
              onClick={() => handleExport('pdf')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Εξαγωγή PDF
            </Button>
            
            <Button 
              onClick={() => handleExport('excel')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Εξαγωγή Excel
            </Button>
            
            <Button 
              onClick={handlePrint}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Εκτύπωση
            </Button>
            
            <Button 
              onClick={() => setShowCommonExpenseModal(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              Φύλλο Κοινοχρήστων
            </Button>
          </div>
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
                    {formatAmount(state.advancedShares.reserve_contribution || 0)}€
                  </div>
                  <div className="text-sm text-gray-600">
                    5€ ανά διαμέρισμα
                  </div>
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

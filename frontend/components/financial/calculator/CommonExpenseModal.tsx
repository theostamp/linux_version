import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  Download, 
  Printer, 
  FileText,
  Building,
  Calendar,
  User,
  Euro,
  Save
} from 'lucide-react';
import { CalculatorState } from './CalculatorWizard';
import { toast } from 'sonner';
import { useCommonExpenses } from '@/hooks/useCommonExpenses';

// Print styles
const printStyles = `
  @media print {
    body * {
      visibility: hidden;
    }
    .print-content, .print-content * {
      visibility: visible;
    }
    .print-content {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
    }
    .no-print {
      display: none !important;
    }
  }
`;

interface CommonExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: CalculatorState;
  buildingId: number;
  buildingName?: string;
}

export const CommonExpenseModal: React.FC<CommonExpenseModalProps> = ({
  isOpen,
  onClose,
  state,
  buildingId,
  buildingName = 'Άγνωστο Κτίριο'
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const { saveCommonExpenseSheet } = useCommonExpenses();

  if (!isOpen) return null;

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

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('el-GR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getPaymentDueDate = () => {
    const now = new Date();
    const dueDate = new Date(now.getFullYear(), now.getMonth(), 15);
    return dueDate.toLocaleDateString('el-GR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getExpenseDetails = () => {
    // Use real expense details from advanced shares if available
    if (state.advancedShares && state.advancedShares.expense_details) {
      return state.advancedShares.expense_details;
    }
    
    return {
      general: [],
      elevator: [],
      heating: [],
      equal_share: [],
      individual: []
    };
  };

  const calculateExpenseBreakdown = () => {
    const breakdown = {
      common: 0,
      elevator: 0,
      heating: 0,
      other: 0,
      coownership: 0
    };

    // Use real expense data from advanced shares if available
    if (state.advancedShares && state.advancedShares.expense_totals) {
      const expenseTotals = state.advancedShares.expense_totals;
      
      // Map backend categories to our display categories
      breakdown.common = parseFloat(expenseTotals.general || 0);
      breakdown.elevator = parseFloat(expenseTotals.elevator || 0);
      breakdown.heating = parseFloat(expenseTotals.heating || 0);
      breakdown.other = parseFloat(expenseTotals.equal_share || 0);
      breakdown.coownership = parseFloat(expenseTotals.individual || 0);
      
      return breakdown;
    }

    // Calculate totals from shares breakdown (fallback)
    Object.values(state.shares).forEach((share: any) => {
      if (share.breakdown && typeof share.breakdown === 'object') {
        // Handle new breakdown format from advanced calculator
        if (share.breakdown.general_expenses !== undefined) {
          breakdown.common += parseFloat(share.breakdown.general_expenses || 0);
          breakdown.elevator += parseFloat(share.breakdown.elevator_expenses || 0);
          breakdown.heating += parseFloat(share.breakdown.heating_expenses || 0);
          breakdown.other += parseFloat(share.breakdown.equal_share_expenses || 0);
          breakdown.coownership += parseFloat(share.breakdown.individual_expenses || 0);
        } else if (Array.isArray(share.breakdown)) {
          // Handle legacy array format
          share.breakdown.forEach((item: any) => {
            const category = item.expense_category?.toLowerCase() || 'other';
            if (category.includes('καθαριότητα') || category.includes('κοινοχρήστα')) {
              breakdown.common += item.apartment_share || 0;
            } else if (category.includes('ανελκυστήρα') || category.includes('ανελκυστήρας')) {
              breakdown.elevator += item.apartment_share || 0;
            } else if (category.includes('θέρμανση') || category.includes('θερμάνση')) {
              breakdown.heating += item.apartment_share || 0;
            } else if (category.includes('συνιδιοκτησία')) {
              breakdown.coownership += item.apartment_share || 0;
            } else {
              breakdown.other += item.apartment_share || 0;
            }
          });
        }
      }
    });

    // Last resort fallback to proportional split only if no real data exists
    if (Object.values(breakdown).every(val => val === 0) && state.totalExpenses > 0) {
      const totalExpenses = state.totalExpenses;
      
      breakdown.common = totalExpenses * 0.3; // 30% for common expenses
      breakdown.elevator = totalExpenses * 0.2; // 20% for elevator
      breakdown.heating = totalExpenses * 0.3; // 30% for heating
      breakdown.other = totalExpenses * 0.2; // 20% for other expenses
      breakdown.coownership = 0; // 0% for co-ownership
    }

    return breakdown;
  };

  const getReserveFundInfo = () => {
    // Calculate monthly amount from reserve fund goal and duration
    const reserveFundGoal = state.advancedShares?.reserve_fund_goal || 0;
    const reserveFundDuration = state.advancedShares?.reserve_fund_duration || 1;
    const fallbackContribution = state.advancedShares?.reserve_contribution || 0;
    
    let monthlyAmount = 0;
    let totalContribution = 0;
    let displayText = '';
    
    if (reserveFundGoal > 0 && reserveFundDuration > 0) {
      monthlyAmount = reserveFundGoal / reserveFundDuration;
      totalContribution = monthlyAmount; // Χρησιμοποιούμε τη μηνιαία δόση
      displayText = `Στόχος ${formatAmount(reserveFundGoal)}€ σε ${reserveFundDuration} δόσεις = ${formatAmount(monthlyAmount)}€`;
    } else if (fallbackContribution > 0) {
      monthlyAmount = fallbackContribution;
      totalContribution = fallbackContribution;
      displayText = `Μηνιαία εισφορά αποθεματικού`;
    }
    
    return {
      monthlyAmount,
      totalContribution,
      displayText,
      goal: reserveFundGoal,
      duration: reserveFundDuration
    };
  };

  const expenseBreakdown = calculateExpenseBreakdown();
  const expenseDetails = getExpenseDetails();
  const reserveFundInfo = getReserveFundInfo();
  const totalExpenses = Object.values(expenseBreakdown).reduce((sum, val) => sum + val, 0) + reserveFundInfo.totalContribution;

  const handlePrint = () => {
    window.print();
  };

  const handleExport = (format: 'pdf' | 'excel') => {
    // TODO: Implement export functionality
    console.log(`Exporting to ${format}`);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Προετοιμασία δεδομένων για αποθήκευση
      const periodData = {
        name: getPeriodInfo(),
        start_date: state.customPeriod.startDate,
        end_date: state.customPeriod.endDate
      };

      const saveData = {
        building_id: buildingId,
        period_data: periodData,
        shares: state.shares,
        total_expenses: state.totalExpenses,
        advanced: state.advancedShares !== null,
        advanced_options: state.advancedOptions
      };

      await saveCommonExpenseSheet(saveData);
      
      toast.success('Το φύλλο κοινοχρήστων αποθηκεύθηκε επιτυχώς!');
      onClose();
    } catch (error: any) {
      toast.error('Σφάλμα κατά την αποθήκευση: ' + (error.message || 'Άγνωστο σφάλμα'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <div className="bg-white rounded-lg max-w-[95vw] w-full max-h-[85vh] overflow-y-auto print-content">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between no-print">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Building className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-800">Φύλλο Κοινοχρήστων</h2>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              {getPeriodInfo()}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Αποθήκευση...' : 'Αποθήκευση'}
            </Button>
            <Button
              onClick={() => handleExport('pdf')}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              PDF
            </Button>
            <Button
              onClick={() => handleExport('excel')}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Excel
            </Button>
            <Button
              onClick={handlePrint}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Εκτύπωση
            </Button>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Print Header */}
        <div className="hidden print:block p-4 border-b">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Φύλλο Κοινοχρήστων</h1>
            <p className="text-lg text-gray-600">{getPeriodInfo()}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Header Information */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Building Info */}
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Building className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-800">ΠΟΛΥΚΑΤΟΙΚΙΑ</h3>
                </div>
                <p className="text-lg font-medium text-blue-900">{buildingName}</p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-green-800">ΜΗΝΑΣ</h3>
                </div>
                <p className="text-lg font-medium text-green-900">{getPeriodInfo()}</p>
              </div>
            </div>

            {/* Middle Column - Manager & Due Date */}
            <div className="space-y-4">
              <div className="bg-purple-50 p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold text-purple-800">ΔΙΑΧΕΙΡΙΣΤΗΣ</h3>
                </div>
                <p className="text-lg font-medium text-purple-900">Διαχειριστής Κτιρίου</p>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 text-orange-600" />
                  <h3 className="font-semibold text-orange-800">ΛΗΞΗ ΠΛΗΡΩΜΗΣ</h3>
                </div>
                <p className="text-lg font-medium text-orange-900">{getPaymentDueDate()}</p>
              </div>
            </div>

            {/* Right Column - Expense Breakdown */}
            <div className="bg-gray-50 p-4 rounded-lg border">
              <h3 className="font-bold text-gray-800 mb-4 text-center">ΑΝΑΛΥΣΗ ΔΑΠΑΝΩΝ ΠΟΛΥΚΑΤΟΙΚΙΑΣ</h3>
              
              <div className="space-y-3">
                {/* General Expenses */}
                {expenseDetails.general.length > 0 && (
                  <div className="bg-white p-3 rounded border">
                    <h4 className="font-semibold text-gray-800 mb-2">Α. ΓΕΝΙΚΕΣ ΔΑΠΑΝΕΣ</h4>
                    <div className="space-y-1 text-sm">
                      {expenseDetails.general.map((expense: any, index: number) => (
                        <div key={expense.id || index} className="flex justify-between">
                          <span>{index + 1}. {expense.description || expense.title}</span>
                          <span className="font-medium">{formatAmount(expense.amount)}€</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-semibold border-t pt-1">
                        <span>ΣΥΝΟΛΟ</span>
                        <span>{formatAmount(expenseBreakdown.common)}€</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Elevator */}
                {expenseDetails.elevator.length > 0 && (
                  <div className="bg-white p-3 rounded border">
                    <h4 className="font-semibold text-gray-800 mb-2">Β. ΑΝΕΛΚΥΣΤΗΡΑΣ</h4>
                    <div className="space-y-1 text-sm">
                      {expenseDetails.elevator.map((expense: any, index: number) => (
                        <div key={expense.id || index} className="flex justify-between">
                          <span>{index + 1}. {expense.description || expense.title}</span>
                          <span className="font-medium">{formatAmount(expense.amount)}€</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-semibold border-t pt-1">
                        <span>ΣΥΝΟΛΟ</span>
                        <span>{formatAmount(expenseBreakdown.elevator)}€</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Heating */}
                {expenseDetails.heating.length > 0 && (
                  <div className="bg-white p-3 rounded border">
                    <h4 className="font-semibold text-gray-800 mb-2">Γ. ΘΕΡΜΑΝΣΗ</h4>
                    <div className="space-y-1 text-sm">
                      {expenseDetails.heating.map((expense: any, index: number) => (
                        <div key={expense.id || index} className="flex justify-between">
                          <span>{index + 1}. {expense.description || expense.title}</span>
                          <span className="font-medium">{formatAmount(expense.amount)}€</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-semibold border-t pt-1">
                        <span>ΣΥΝΟΛΟ</span>
                        <span>{formatAmount(expenseBreakdown.heating)}€</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Equal Share Expenses */}
                {expenseDetails.equal_share.length > 0 && (
                  <div className="bg-white p-3 rounded border">
                    <h4 className="font-semibold text-gray-800 mb-2">Δ. ΙΣΟΠΟΣΕΣ ΔΑΠΑΝΕΣ</h4>
                    <div className="space-y-1 text-sm">
                      {expenseDetails.equal_share.map((expense: any, index: number) => (
                        <div key={expense.id || index} className="flex justify-between">
                          <span>{index + 1}. {expense.description || expense.title}</span>
                          <span className="font-medium">{formatAmount(expense.amount)}€</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-semibold border-t pt-1">
                        <span>ΣΥΝΟΛΟ</span>
                        <span>{formatAmount(expenseBreakdown.other)}€</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Individual Expenses */}
                {expenseDetails.individual.length > 0 && (
                  <div className="bg-white p-3 rounded border">
                    <h4 className="font-semibold text-gray-800 mb-2">Ε. ΑΤΟΜΙΚΕΣ ΔΑΠΑΝΕΣ</h4>
                    <div className="space-y-1 text-sm">
                      {expenseDetails.individual.map((expense: any, index: number) => (
                        <div key={expense.id || index} className="flex justify-between">
                          <span>{index + 1}. {expense.description || expense.title}</span>
                          <span className="font-medium">{formatAmount(expense.amount)}€</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-semibold border-t pt-1">
                        <span>ΣΥΝΟΛΟ</span>
                        <span>{formatAmount(expenseBreakdown.coownership)}€</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reserve Fund Contribution */}
                {reserveFundInfo.totalContribution > 0 && (
                  <div className="bg-white p-3 rounded border">
                    <h4 className="font-semibold text-gray-800 mb-2">ΣΤ. ΕΙΣΦΟΡΑ ΑΠΟΘΕΜΑΤΙΚΟΥ</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-xs">
                          {reserveFundInfo.displayText || 'ΜΗΝΙΑΙΑ ΔΟΣΗ (κατανομή ανά χιλιοστά)'}
                        </span>
                        <span className="font-medium">{formatAmount(reserveFundInfo.monthlyAmount)}€</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-1">
                        <span>ΣΥΝΟΛΟ</span>
                        <span>{formatAmount(reserveFundInfo.totalContribution)}€</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Grand Total */}
                <div className="bg-blue-100 p-3 rounded border">
                  <div className="flex justify-between font-bold text-lg">
                    <span>ΣΥΝΟΛΟ ΔΑΠΑΝΩΝ</span>
                    <span>{formatAmount(totalExpenses)}€</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Results Table */}
          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="bg-gray-100 p-4 border-b">
              <h3 className="font-bold text-gray-800 text-center">ΑΝΑΛΥΣΗ ΚΑΤΑ ΔΙΑΜΕΡΙΣΜΑΤΑ</h3>
            </div>
            
            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-center font-bold border">A/A</TableHead>
                    <TableHead className="text-center font-bold border">ΟΝΟΜΑΤΕΠΩΝΥΜΟ</TableHead>
                    <TableHead className="text-center font-bold border">ΚΩΔ.</TableHead>
                    <TableHead className="text-center font-bold border">ΜΕΤΡΑ</TableHead>
                    <TableHead className="text-center font-bold border" colSpan={3}>ΘΕΡΜΑΝΣΗ</TableHead>
                    <TableHead className="text-center font-bold border" colSpan={5}>ΧΙΛΙΟΣΤΑ ΣΥΜΜΕΤΟΧΗΣ</TableHead>
                    <TableHead className="text-center font-bold border" colSpan={5}>ΠΟΣΟ ΠΟΥ ΑΝΑΛΟΓΕΙ</TableHead>
                    <TableHead className="text-center font-bold border">ΣΤΡΟΓΓ.</TableHead>
                    <TableHead className="text-center font-bold border">ΠΛΗΡΩΤΕΟ ΠΟΣΟ</TableHead>
                    <TableHead className="text-center font-bold border">A/A</TableHead>
                  </TableRow>
                  <TableRow className="bg-gray-50">
                    <TableHead className="border"></TableHead>
                    <TableHead className="border"></TableHead>
                    <TableHead className="border"></TableHead>
                    <TableHead className="border"></TableHead>
                    <TableHead className="text-center text-xs border">ei</TableHead>
                    <TableHead className="text-center text-xs border">fi</TableHead>
                    <TableHead className="text-center text-xs border">ΘΕΡΜΙΔΕΣ</TableHead>
                    <TableHead className="text-center text-xs border">ΚΟΙΝΟΧΡΗΣΤΑ</TableHead>
                    <TableHead className="text-center text-xs border">ΑΝΕΛΚΥΡΑΣ</TableHead>
                    <TableHead className="text-center text-xs border">ΘΕΡΜΑΝΣΗ</TableHead>
                    <TableHead className="text-center text-xs border">ΛΟΙΠΑ ΕΞΟΔΑ</TableHead>
                    <TableHead className="text-center text-xs border">ΕΞΟΔΑ ΣΥΝΙΔΙΟΚΤΗΣ</TableHead>
                    <TableHead className="text-center text-xs border">ΚΟΙΝΟΧΡΗΣΤΑ</TableHead>
                    <TableHead className="text-center text-xs border">ΑΝΕΛΚΥΡΑΣ</TableHead>
                    <TableHead className="text-center text-xs border">ΘΕΡΜΑΝΣΗ</TableHead>
                    <TableHead className="text-center text-xs border">ΛΟΙΠΑ ΕΞΟΔΑ</TableHead>
                    <TableHead className="text-center text-xs border">ΕΞΟΔΑ ΣΥΝΙΔΙΟΚΤΗΣ</TableHead>
                    <TableHead className="border"></TableHead>
                    <TableHead className="border"></TableHead>
                    <TableHead className="border"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.values(state.shares).map((share: any, index: number) => {
                    const participationMills = share.participation_mills || 0;
                    const totalMills = Object.values(state.shares).reduce((sum: number, s: any) => sum + (s.participation_mills || 0), 0);
                    const participationPercentage = totalMills > 0 ? (participationMills / totalMills) * 1000 : 0;
                    
                    return (
                      <TableRow key={share.apartment_id} className="hover:bg-gray-50">
                        <TableCell className="text-center border font-medium">{index + 1}</TableCell>
                        <TableCell className="border font-medium">{share.owner_name}</TableCell>
                        <TableCell className="text-center border">{share.apartment_number}</TableCell>
                        <TableCell className="text-center border">{participationMills * 10}</TableCell>
                        <TableCell className="text-center border text-xs">0.015</TableCell>
                        <TableCell className="text-center border text-xs">0.25</TableCell>
                        <TableCell className="text-center border text-xs">2</TableCell>
                        <TableCell className="text-center border text-xs">{participationPercentage.toFixed(2)}</TableCell>
                        <TableCell className="text-center border text-xs">{participationPercentage.toFixed(2)}</TableCell>
                        <TableCell className="text-center border text-xs">{participationPercentage.toFixed(2)}</TableCell>
                        <TableCell className="text-center border text-xs">{participationPercentage.toFixed(2)}</TableCell>
                        <TableCell className="text-center border text-xs">0.00</TableCell>
                        <TableCell className="text-center border font-medium">{formatAmount(expenseBreakdown.common * participationMills / totalMills)}</TableCell>
                        <TableCell className="text-center border font-medium">{formatAmount(expenseBreakdown.elevator * participationMills / totalMills)}</TableCell>
                        <TableCell className="text-center border font-medium">{formatAmount(expenseBreakdown.heating * participationMills / totalMills)}</TableCell>
                        <TableCell className="text-center border font-medium">{formatAmount(expenseBreakdown.other * participationMills / totalMills)}</TableCell>
                        <TableCell className="text-center border font-medium">0.00</TableCell>
                        <TableCell className="text-center border text-xs">0.02</TableCell>
                        <TableCell className="text-center border font-bold">{formatAmount(share.total_due || 0)}</TableCell>
                        <TableCell className="text-center border">{index + 1}</TableCell>
                      </TableRow>
                    );
                  })}
                  
                  {/* Totals Row */}
                  <TableRow className="bg-gray-100 font-bold">
                    <TableCell className="text-center border">ΣΥΝΟΛΑ</TableCell>
                    <TableCell className="border"></TableCell>
                    <TableCell className="border"></TableCell>
                    <TableCell className="text-center border">
                      {Object.values(state.shares).reduce((sum: number, s: any) => sum + ((s.participation_mills || 0) * 10), 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center border"></TableCell>
                    <TableCell className="text-center border"></TableCell>
                    <TableCell className="text-center border">5</TableCell>
                    <TableCell className="text-center border">1000.00</TableCell>
                    <TableCell className="text-center border">1000.00</TableCell>
                    <TableCell className="text-center border">1000.00</TableCell>
                    <TableCell className="text-center border">1000.00</TableCell>
                    <TableCell className="text-center border">0.00</TableCell>
                    <TableCell className="text-center border">{formatAmount(expenseBreakdown.common)}</TableCell>
                    <TableCell className="text-center border">{formatAmount(expenseBreakdown.elevator)}</TableCell>
                    <TableCell className="text-center border">{formatAmount(expenseBreakdown.heating)}</TableCell>
                    <TableCell className="text-center border">{formatAmount(expenseBreakdown.other)}</TableCell>
                    <TableCell className="text-center border">0.00</TableCell>
                    <TableCell className="text-center border">0.01</TableCell>
                    <TableCell className="text-center border">{formatAmount(totalExpenses)}</TableCell>
                    <TableCell className="text-center border"></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <strong>ΗΜΕΡΟΜΗΝΙΑ ΕΚΔΟΣΗΣ:</strong> {getCurrentDate()}
              </div>
              <div>
                <strong>ΣΥΝΟΛΟ ΔΙΑΜΕΡΙΣΜΑΤΩΝ:</strong> {Object.keys(state.shares).length}
              </div>
              <div>
                <strong>ΣΥΝΟΛΟ ΔΑΠΑΝΩΝ:</strong> {formatAmount(totalExpenses)}€
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

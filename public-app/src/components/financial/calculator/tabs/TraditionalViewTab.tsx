
import React from 'react';
import { Button } from '@/components/ui/button';
import { Building, User, Calendar, CreditCard, Calculator, PiggyBank, Building2, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { ApartmentExpenseTable } from '../components/ApartmentExpenseTable';
import { GroupedExpenseBreakdown } from '../components/GroupedExpenseBreakdown';
import { ValidationResult, CommonExpenseModalProps, ExpenseBreakdown, ManagementFeeInfo, ReserveFundInfo, PerApartmentAmounts, GroupedExpenses } from '../types/financial';
import { getPaymentDueDate, getPeriodInfo, getPeriodInfoWithBillingCycle } from '../utils/periodHelpers';
import { formatAmount } from '../utils/formatters';
import { useMonthlyExpenses, ExpenseBreakdownItem } from '@/hooks/useMonthlyExpenses';
import { ApartmentWithFinancialData } from '@/hooks/useApartmentsWithFinancialData';

// This interface is now self-contained and doesn't extend CommonExpenseModalProps
interface TraditionalViewTabProps {
  state: any; // Should be CalculatorState
  buildingId?: number;
  selectedMonth?: string;
  buildingName?: string;
  buildingAddress?: string;
  buildingCity?: string;
  buildingPostalCode?: string;
  managerName?: string;
  managerApartment?: string;
  managerPhone?: string;
  managerCollectionSchedule?: string;
  aptWithFinancial: ApartmentWithFinancialData[];
  expenseBreakdown: ExpenseBreakdown;
  managementFeeInfo: ManagementFeeInfo;
  reserveFundInfo: ReserveFundInfo;
  totalExpenses: number;
  perApartmentAmounts: PerApartmentAmounts;
  validateData: () => void;
  validationResult: ValidationResult | null;
  getGroupedExpenses: () => GroupedExpenses;
  getTotalPreviousBalance: () => number;
  getFinalTotalExpenses: () => number;
}

export const TraditionalViewTab: React.FC<TraditionalViewTabProps> = (props) => {
  const {
    state,
    buildingId,
    selectedMonth,
    buildingName,
    buildingAddress,
    buildingCity,
    buildingPostalCode,
    managerName,
    managerApartment,
    managerPhone,
    managerCollectionSchedule,
    aptWithFinancial,
    expenseBreakdown,
    managementFeeInfo,
    reserveFundInfo,
    totalExpenses,
    perApartmentAmounts,
    validateData,
    validationResult,
    getGroupedExpenses,
    getTotalPreviousBalance,
    getFinalTotalExpenses
  } = props;

  const resolvedBuildingName = buildingName || 'Άγνωστο Κτίριο';
  const resolvedManagerName = managerName || 'Μη καταχωρημένος';
  const resolvedManagerPhone = managerPhone || 'Δεν έχει οριστεί τηλέφωνο';
  const resolvedManagerSchedule = managerCollectionSchedule || 'Δεν έχει οριστεί ωράριο';

  // Φέρνουμε τα μηνιαία έξοδα από το API
  const { expenses: monthlyExpenses } = useMonthlyExpenses(buildingId, selectedMonth);

  // Υπολογισμός συνόλου δαπανών που εμφανίζονται
  const displayedExpensesTotal = React.useMemo(() => {
    let total = 0;

    // Αν υπάρχουν αναλυτικές δαπάνες από το API, χρησιμοποίησε αυτές
    if (monthlyExpenses?.expense_breakdown && monthlyExpenses.expense_breakdown.length > 0) {
      total = monthlyExpenses.expense_breakdown.reduce((sum, expense) => sum + expense.amount, 0);
    }

    // Πρόσθεσε κόστος διαχείρισης
    total += managementFeeInfo.totalFee || 0;

    // Πρόσθεσε αποθεματικό
    total += reserveFundInfo.monthlyAmount || 0;

    // Πρόσθεσε παλαιότερες οφειλές
    total += getTotalPreviousBalance() || 0;

    return total;
  }, [monthlyExpenses, managementFeeInfo.totalFee, reserveFundInfo.monthlyAmount, getTotalPreviousBalance]);

  const showOwnerExpenses = (expenseBreakdown.other || 0) + (expenseBreakdown.coownership || 0) > 0;

  return (
    <div className="space-y-6 mt-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="space-y-3">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2"><Building className="h-4 w-4 text-blue-700" /><h3 className="font-bold text-blue-800 text-sm">ΠΟΛΥΚΑΤΟΙΚΙΑ</h3></div>
                <p className="text-sm font-semibold text-blue-900">{resolvedBuildingName}</p>
                {(buildingAddress || buildingCity || buildingPostalCode) && <p className="text-xs text-blue-700">{buildingAddress}{buildingCity && `, ${buildingCity}`}{buildingPostalCode && ` ${buildingPostalCode}`}</p>}
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2"><User className="h-4 w-4 text-purple-700" /><h3 className="font-bold text-purple-800 text-sm">ΔΙΑΧΕΙΡΙΣΤΗΣ</h3></div>
                <p className="text-sm font-semibold text-purple-900">
                  {resolvedManagerName}{managerApartment && ` (Διαμ. ${managerApartment})`}
                </p>
                <p className="text-xs text-purple-700">{resolvedManagerPhone}</p>
                <p className="text-xs text-purple-700">{resolvedManagerSchedule}</p>
            </div>
            {/* ✅ ΑΦΑΙΡΕΘΗΚΕ: Card "ΛΗΞΗ ΠΛΗΡΩΜΗΣ" για εξοικονόμηση χώρου */}
            {/* ✅ ΑΛΛΑΓΗ: Τραπεζικά Στοιχεία - Μόνο για Εκτύπωση */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200 shadow-sm hidden print:block">
                <div className="flex items-center gap-2 mb-2"><CreditCard className="h-4 w-4 text-green-700" /><h3 className="font-bold text-green-800 text-sm">ΤΡΑΠΕΖΙΚΑ ΣΤΟΙΧΕΙΑ</h3></div>
                <p className="text-xs text-green-700">Εθνική Τράπεζα</p>
                <p className="text-xs text-green-700 font-mono bg-green-50 p-2 rounded border">IBAN: GR16 0110 1250 0000 1234 5678 901</p>
                <p className="text-xs text-green-700">Δικαιούχος: Πολυκατοικία {buildingName}</p>
            </div>
        </div>

        {/* Middle Column - ΝΕΑ ΟΜΑΔΟΠΟΙΗΜΕΝΗ ΕΜΦΑΝΙΣΗ */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-3 text-center text-sm flex items-center justify-center gap-2">
                <Calculator className="h-4 w-4 text-blue-600" />
                ΑΝΑΛΥΣΗ ΔΑΠΑΝΩΝ ΠΟΛΥΚΑΤΟΙΚΙΑΣ
            </h3>

            {/* ΝΕΟ: Ομαδοποιημένη Εμφάνιση με Collapsible Sections */}
            {monthlyExpenses?.expense_breakdown_grouped ? (
              <GroupedExpenseBreakdown
                groupedExpenses={monthlyExpenses.expense_breakdown_grouped}
                managementFee={managementFeeInfo.totalFee || 0}
                reserveFund={reserveFundInfo.monthlyAmount || 0}
                previousBalance={getTotalPreviousBalance() || 0}
              />
            ) : (
              // Fallback: Παλιά flat εμφάνιση αν δεν υπάρχουν grouped δεδομένα
              <div className="space-y-2">
                {monthlyExpenses?.expense_breakdown && monthlyExpenses.expense_breakdown.length > 0 && (
                  monthlyExpenses.expense_breakdown.map((expense, index) => {
                    const isOwner = expense.payer_responsibility === 'owner';
                    const badgeColor = isOwner ? 'text-red-600' : 'text-emerald-600';
                    const badgeText = isOwner ? 'Δ' : 'Ε';

                    return (
                      <div key={`${expense.category}_${index}`} className="flex items-center justify-between py-1.5 px-2 bg-white rounded border">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-gray-600">{index + 1}</span>
                          <span className={`text-xs font-bold ${badgeColor} flex-shrink-0`}>{badgeText}</span>
                          <p className="text-xs font-semibold text-gray-700">{expense.category_display}</p>
                        </div>
                        <span className="text-xs font-bold text-blue-600">{formatAmount(expense.amount)}€</span>
                      </div>
                    );
                  })
                )}

                <div className="flex items-center justify-between py-1.5 px-2 bg-white rounded border">
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-gray-600">{(monthlyExpenses?.expense_breakdown?.length || 0) + 1}</span>
                        <span className="text-xs font-bold text-emerald-600 flex-shrink-0">Ε</span>
                        <p className="text-xs font-semibold text-gray-700">Κόστος διαχείρισης</p>
                    </div>
                    <span className="text-xs font-bold text-blue-600">{formatAmount(managementFeeInfo.totalFee || 0)}€</span>
                </div>

                <div className="flex items-center justify-between py-1.5 px-2 bg-white rounded border">
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-gray-600">{(monthlyExpenses?.expense_breakdown?.length || 0) + 2}</span>
                        <span className="text-xs font-bold text-red-600 flex-shrink-0">Δ</span>
                        <p className="text-xs font-semibold text-gray-700">Αποθεματικό Ταμείο</p>
                    </div>
                    <span className="text-xs font-bold text-blue-600">{formatAmount(reserveFundInfo.monthlyAmount || 0)}€</span>
                </div>

                <div className="flex items-center justify-between py-1.5 px-2 bg-white rounded border">
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-gray-600">{(monthlyExpenses?.expense_breakdown?.length || 0) + 3}</span>
                        <p className="text-xs font-semibold text-gray-700">Παλαιότερες οφειλές</p>
                    </div>
                    <span className="text-xs font-bold text-blue-600">{formatAmount(getTotalPreviousBalance() || 0)}€</span>
                </div>

                <div className="flex items-center justify-between py-2 px-2 bg-blue-50 rounded border border-blue-200">
                    <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-blue-700">Σ</span>
                        <p className="text-sm font-bold text-blue-800">ΣΥΝΟΛΟ</p>
                    </div>
                    <span className="text-sm font-bold text-blue-700">{formatAmount(displayedExpensesTotal)}€</span>
                </div>
              </div>
            )}
        </div>

        {/* Right Column */}
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200 shadow-sm">
            <h3 className="font-bold text-yellow-800 mb-3 text-center text-sm flex items-center justify-center gap-2">
                <FileText className="h-4 w-4 text-yellow-600" />
                ΠΑΡΑΤΗΡΗΣΕΙΣ
            </h3>

            <div className="bg-white p-3 rounded border border-yellow-200">
                <p className="text-sm font-medium text-yellow-900 text-center">ΕΙΣΠΡΑΞΗ ΚΟΙΝΟΧΡΗΣΤΩΝ</p>
                <p className="text-xs text-yellow-700 text-center mt-1">ΔΕΥΤΕΡΑ & ΤΕΤΑΡΤΗ ΑΠΟΓΕΥΜΑ</p>
            </div>
        </div>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        {/* ✅ ΑΦΑΙΡΕΘΗΚΕ: Επικεφαλίδα "ΑΝΑΛΥΣΗ ΚΑΤΑ ΔΙΑΜΕΡΙΣΜΑΤΑ" και κουμπί "Έλεγχος Δεδομένων" για μέγιστη εξοικονόμηση χώρου */}
        <ApartmentExpenseTable shares={state.shares} aptWithFinancial={aptWithFinancial} perApartmentAmounts={perApartmentAmounts} expenseBreakdown={expenseBreakdown} managementFeeInfo={managementFeeInfo} reserveFundInfo={reserveFundInfo} totalExpenses={totalExpenses} showOwnerExpenses={showOwnerExpenses} />
      </div>

      {validationResult && (
        <div className={`border rounded-lg p-4 ${validationResult.isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            {/* ... Validation results ... */}
        </div>
      )}

    </div>
  );
};

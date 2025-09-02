
import React from 'react';
import { Button } from '@/components/ui/button';
import { Building, User, Calendar, CreditCard, Calculator, PiggyBank, Building2, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { ApartmentExpenseTable } from '../components/ApartmentExpenseTable';
import { ValidationResult, CommonExpenseModalProps, ExpenseBreakdown, ManagementFeeInfo, ReserveFundInfo, PerApartmentAmounts, GroupedExpenses } from '../types/financial';
import { getPaymentDueDate, getPeriodInfo, getPeriodInfoWithBillingCycle } from '../utils/periodHelpers';
import { formatAmount } from '../utils/formatters';

// This interface is now self-contained and doesn't extend CommonExpenseModalProps
interface TraditionalViewTabProps {
  state: any; // Should be CalculatorState
  buildingName?: string;
  buildingAddress?: string;
  buildingCity?: string;
  buildingPostalCode?: string;
  managerName?: string;
  managerApartment?: string;
  managerPhone?: string;
  managerCollectionSchedule?: string;
  aptWithFinancial: any[];
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

  const showOwnerExpenses = (expenseBreakdown.other || 0) + (expenseBreakdown.coownership || 0) > 0;

  return (
    <div className="space-y-6 mt-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="space-y-3">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2"><Building className="h-4 w-4 text-blue-700" /><h3 className="font-bold text-blue-800 text-sm">ΠΟΛΥΚΑΤΟΙΚΙΑ</h3></div>
                <p className="text-sm font-semibold text-blue-900">{buildingName}</p>
                {(buildingAddress || buildingCity || buildingPostalCode) && <p className="text-xs text-blue-700">{buildingAddress}{buildingCity && `, ${buildingCity}`}{buildingPostalCode && ` ${buildingPostalCode}`}</p>}
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2"><User className="h-4 w-4 text-purple-700" /><h3 className="font-bold text-purple-800 text-sm">ΔΙΑΧΕΙΡΙΣΤΗΣ</h3></div>
                <p className="text-sm font-semibold text-purple-900">{managerName}{managerApartment && ` (Διαμ. ${managerApartment})`}</p>
                <p className="text-xs text-purple-700">{managerPhone}</p>
                <p className="text-xs text-purple-700">{managerCollectionSchedule}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2"><Calendar className="h-4 w-4 text-orange-700" /><h3 className="font-bold text-orange-800 text-sm">ΛΗΞΗ ΠΛΗΡΩΜΗΣ</h3></div>
                <p className="text-sm font-semibold text-orange-900">{getPaymentDueDate(state)}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2"><CreditCard className="h-4 w-4 text-green-700" /><h3 className="font-bold text-green-800 text-sm">ΤΡΑΠΕΖΙΚΑ ΣΤΟΙΧΕΙΑ</h3></div>
                <p className="text-xs text-green-700">Εθνική Τράπεζα</p>
                <p className="text-xs text-green-700 font-mono bg-green-50 p-2 rounded border">IBAN: GR16 0110 1250 0000 1234 5678 901</p>
                <p className="text-xs text-green-700">Δικαιούχος: Πολυκατοικία {buildingName}</p>
            </div>
        </div>

        {/* Middle Column */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-2 text-center text-sm flex items-center justify-center gap-2"><Calculator className="h-4 w-4 text-blue-600" />ΑΝΑΛΥΣΗ ΔΑΠΑΝΩΝ ΠΟΛΥΚΑΤΟΙΚΙΑΣ</h3>
            {/* ... JSX for expense analysis summary ... */}
        </div>

        {/* Right Column */}
        {showOwnerExpenses ? (
            <div className="bg-green-50 p-3 rounded border">{/* ... Owner expenses placeholder ... */}</div>
            ) : (
            reserveFundInfo.monthlyAmount > 0 && (
            <div className="bg-blue-50 p-3 rounded border">{/* ... Reserve fund info ... */}</div>
            )
        )}
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="bg-gray-100 p-4 border-b flex items-center justify-between">
            <div>
                <h3 className="font-bold text-gray-800">ΑΝΑΛΥΣΗ ΚΑΤΑ ΔΙΑΜΕΡΙΣΜΑΤΑ</h3>
                <p className="text-xs text-gray-600 mt-1">Πληρωτέο ποσό για {getPeriodInfo(state)}</p>
            </div>
            <Button onClick={validateData} variant="outline" size="sm"><Calculator className="h-4 w-4 mr-2" />Έλεγχος Δεδομένων</Button>
        </div>
        <ApartmentExpenseTable shares={state.shares} aptWithFinancial={aptWithFinancial} perApartmentAmounts={perApartmentAmounts} expenseBreakdown={expenseBreakdown} managementFeeInfo={managementFeeInfo} reserveFundInfo={reserveFundInfo} totalExpenses={totalExpenses} showOwnerExpenses={showOwnerExpenses} />
      </div>

      {validationResult && (
        <div className={`border rounded-lg p-4 ${validationResult.isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            {/* ... Validation results ... */}
        </div>
      )}

      <div className="bg-gray-50 p-4 rounded-lg border">
        <div className="bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-400 mb-4">
            <h3 className="font-semibold text-yellow-800 text-sm">ΠΑΡΑΤΗΡΗΣΕΙΣ</h3>
            <p className="text-sm font-medium text-yellow-900">ΕΙΣΠΡΑΞΗ ΚΟΙΝΟΧΡΗΣΤΩΝ: ΔΕΥΤΕΡΑ & ΤΕΤΑΡΤΗ ΑΠΟΓΕΥΜΑ</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div><strong>ΗΜΕΡΟΜΗΝΙΑ ΕΚΔΟΣΗΣ:</strong> {new Date().toLocaleDateString('el-GR')}</div>
            <div><strong>ΣΥΝΟΛΟ ΔΙΑΜΕΡΙΣΜΑΤΩΝ:</strong> {Object.keys(state.shares).length}</div>
            <div><strong>ΣΥΝΟΛΟ ΔΑΠΑΝΩΝ:</strong> {formatAmount(totalExpenses)}€</div>
        </div>
      </div>
    </div>
  );
};

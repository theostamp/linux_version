
/*
 * =================================================================================================
 * REFACTORING GUIDE & FILE INDEX
 * =================================================================================================
 * This component was refactored to separate concerns (UI, logic, utils).
 *
 * 1. Main Component (This file):
 *    - /home/theo/projects/linux_version/frontend/components/financial/calculator/CommonExpenseModal.tsx
 *    - Acts as a "controller" or "container". It's responsible for:
 *      - Displaying the modal structure and tabs.
 *      - Calling the main logic hook `useCommonExpenseCalculator`.
 *      - Passing props down to the specialized tab and UI components.
 *
 * 2. Core Logic Hook:
 *    - hooks/useCommonExpenseCalculator.ts
 *    - Contains ALL business logic, state management, and complex calculations.
 *    - If you need to change how expenses are calculated, how data is fetched or processed,
 *      or what happens when you save/export, this is the place to look.
 *
 * 3. UI Components:
 *    - tabs/TraditionalViewTab.tsx: Renders the main "traditional" view with info cards and the table.
 *    - tabs/ExportTab.tsx: Renders the UI for all export and action buttons.
 *    - components/ApartmentExpenseTable.tsx: A detailed, presentational component for the main expense table.
 *
 * 4. Utilities & Helpers:
 *    - utils/formatters.ts: Functions for formatting numbers, currency, dates.
 *    - utils/periodHelpers.ts: Functions for calculating and formatting billing periods.
 *
 * 5. Type Definitions:
 *    - types/financial.ts: Contains all shared TypeScript interfaces for props and data structures.
 * =================================================================================================
 */
import React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Building, PieChart, Receipt, BarChart, FileText, Calendar } from 'lucide-react';
import { CommonExpenseModalProps } from './types/financial';
import { useCommonExpenseCalculator } from './hooks/useCommonExpenseCalculator';
import { TraditionalViewTab } from './tabs/TraditionalViewTab';
import { ExportTab } from './tabs/ExportTab';
import { ExpenseBreakdownSection } from './ExpenseBreakdownSection';
import { StatisticsSection } from './StatisticsSection';
import { HeatingAnalysisModal } from './HeatingAnalysisModal';
import { getPeriodInfo, getPreviousMonthName } from './utils/periodHelpers';
import { formatAmount } from './utils/formatters';

const printStyles = `
  @media print {
    body * { visibility: hidden; }
    .print-content, .print-content * { visibility: visible; }
    .print-content { position: absolute; left: 0; top: 0; width: 100%; }
    .no-print { display: none !important; }
  }
`;

export const CommonExpenseModal: React.FC<CommonExpenseModalProps> = (props) => {
  const {
    isOpen,
    onClose,
    state,
    buildingName = 'Άγνωστο Κτίριο',
  } = props;

  // State for expense sheet month selection
  const [expenseSheetMonth, setExpenseSheetMonth] = React.useState(() => {
    // Default to previous month if available, otherwise current month
    const currentMonth = new Date();
    const previousMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    return `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, '0')}`;
  });

  // Generate month options for the last 12 months
  const generateMonthOptions = () => {
    const options = [];
    const currentDate = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const monthName = date.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });
      options.push({ value: `${year}-${month}`, label: monthName });
    }
    
    return options;
  };

  const monthOptions = generateMonthOptions();

  const {
    isSaving,
    showHeatingModal,
    setShowHeatingModal,
    heatingBreakdown,
    setHeatingBreakdown,
    validationResult,
    aptWithFinancial,
    perApartmentAmounts,
    expenseBreakdown,
    managementFeeInfo,
    reserveFundInfo,
    totalExpenses,
    handleSave,
    handlePrint,
    handleExport,
    validateData,
    getGroupedExpenses,
    getTotalPreviousBalance,
    getFinalTotalExpenses
  } = useCommonExpenseCalculator({ ...props, selectedMonth: expenseSheetMonth });

  // Debug: Log when expenseSheetMonth changes
  React.useEffect(() => {
    console.log('🔄 CommonExpenseModal: expenseSheetMonth changed:', expenseSheetMonth);
  }, [expenseSheetMonth]);

  // Force refresh when month changes
  React.useEffect(() => {
    if (expenseSheetMonth) {
      console.log('🔄 Month changed, forcing refresh:', expenseSheetMonth);
    }
  }, [expenseSheetMonth]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <div key={expenseSheetMonth} className="bg-white rounded-lg max-w-[95vw] w-full max-h-[85vh] overflow-y-auto print-content">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between no-print">
            <div className="flex items-center gap-4">
                <h2 className="text-lg font-bold text-blue-600">Digital Concierge App</h2>
                <div className="flex items-center gap-2">
                    <Building className="h-6 w-6 text-blue-600" />
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Φύλλο Κοινοχρήστων</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <Calendar className="h-3 w-3 text-gray-500" />
                            <Select value={expenseSheetMonth} onValueChange={setExpenseSheetMonth}>
                                <SelectTrigger className="w-32 h-6 text-xs">
                                    <SelectValue placeholder="Επιλέξτε μήνα" />
                                </SelectTrigger>
                                <SelectContent>
                                    {monthOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="text-xs text-gray-500">
                                Πληρωτέο μέχρι 10/{(() => {
                                    const date = new Date(expenseSheetMonth + '-01');
                                    return String(date.getMonth() + 2).padStart(2, '0');
                                })()}/{new Date(expenseSheetMonth + '-01').getFullYear()}
                            </div>
                        </div>
                    </div>
                </div>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 text-lg">
                  {expenseSheetMonth ? new Date(expenseSheetMonth + '-01').toLocaleDateString('el-GR', { month: 'long', year: 'numeric' }) : getPeriodInfo(state)}
                </Badge>
            </div>
            <div className="flex items-center gap-2">
                <Button onClick={onClose} variant="ghost" size="sm"><X className="h-4 w-4" /></Button>
            </div>
        </div>

        <div className="p-6">
          <Tabs defaultValue="traditional" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="traditional"><Receipt className="h-4 w-4 mr-2" />Παραδοσιακή Προβολή</TabsTrigger>
              <TabsTrigger value="analysis"><PieChart className="h-4 w-4 mr-2" />Ανάλυση Δαπανών</TabsTrigger>
              <TabsTrigger value="statistics"><BarChart className="h-4 w-4 mr-2" />Στατιστικά</TabsTrigger>
              <TabsTrigger value="export"><FileText className="h-4 w-4 mr-2" />Εξαγωγή</TabsTrigger>
            </TabsList>

            <TabsContent value="traditional">
              <TraditionalViewTab {...props} {...{ state, aptWithFinancial, expenseBreakdown, managementFeeInfo, reserveFundInfo, totalExpenses, perApartmentAmounts, validateData, validationResult, getGroupedExpenses, getTotalPreviousBalance, getFinalTotalExpenses }} />
            </TabsContent>

            <TabsContent value="analysis">
              <ExpenseBreakdownSection state={state} buildingName={buildingName} apartmentsCount={Object.keys(state.shares).length} onViewDetails={() => {}} />
            </TabsContent>

            <TabsContent value="statistics">
              <StatisticsSection state={state} buildingName={buildingName} apartmentsCount={Object.keys(state.shares).length} expenseBreakdown={expenseBreakdown} reserveFundInfo={reserveFundInfo} managementFeeInfo={managementFeeInfo} aptWithFinancial={aptWithFinancial} />
            </TabsContent>

            <TabsContent value="export">
                <ExportTab 
                    handleExport={handleExport}
                    handlePrint={handlePrint}
                    handleSave={handleSave}
                    isSaving={isSaving}
                    setShowHeatingModal={setShowHeatingModal}
                    buildingName={buildingName}
                    periodInfo={getPeriodInfo(state)}
                    apartmentsCount={Object.keys(state.shares).length}
                    totalExpenses={totalExpenses}
                    formatAmount={formatAmount}
                />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <HeatingAnalysisModal
        isOpen={showHeatingModal}
        onClose={() => setShowHeatingModal(false)}
        buildingId={props.buildingId}
        totalHeatingCost={expenseBreakdown.heating}
        apartments={aptWithFinancial.map(apt => ({ id: apt.id, number: apt.number, owner_name: apt.owner_name, heating_mills: apt.heating_mills || 0, participation_mills: apt.participation_mills || 0 }))}
        onHeatingCalculated={(breakdown) => {
          setHeatingBreakdown(breakdown);
          toast.success('✅ Υπολογισμοί θέρμανσης εφαρμόστηκαν!');
        }}
      />
    </div>
  );
};

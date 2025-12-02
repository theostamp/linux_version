
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
import { api, fetchBuilding } from '@/lib/api';
import { getOfficeLogoUrl } from '@/lib/utils';
import { TraditionalViewTab } from './tabs/TraditionalViewTab';
import { ExportTab } from './tabs/ExportTab';
import { ExpenseBreakdownSection } from './ExpenseBreakdownSection';
import { StatisticsSection } from './StatisticsSection';
import { HeatingAnalysisModal } from './HeatingAnalysisModal';
import { getPeriodInfo, getPreviousMonthName } from './utils/periodHelpers';
import { formatAmount } from './utils/formatters';
import { ModalPortal } from '@/components/ui/ModalPortal';

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
    buildingId,
    buildingName = 'Άγνωστο Κτίριο',
    managementOfficeName,
    managementOfficePhone,
    managementOfficeAddress,
    managementOfficeLogo,
  } = props;

  // Logo error handling
  const [logoError, setLogoError] = React.useState(false);
  
  // State for expense sheet month selection
  const [expenseSheetMonth, setExpenseSheetMonth] = React.useState(() => {
    // Default to current month
    const currentMonth = new Date();
    return `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
  });

  // State for building data
  const [buildingData, setBuildingData] = React.useState<any>(null);

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
    isSending,
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
    handleSendToAll,
    validateData,
    getGroupedExpenses,
    getTotalPreviousBalance,
    getFinalTotalExpenses
  } = useCommonExpenseCalculator({ ...props, selectedMonth: expenseSheetMonth });

  // Load building data
  React.useEffect(() => {
    const loadBuildingData = async () => {
      try {
        const building = await fetchBuilding(props.buildingId);
        setBuildingData(building);
        console.log('🏢 CommonExpenseModal: Building data loaded:', building);
      } catch (error) {
        console.error('Error loading building data:', error);
      }
    };

    if (props.buildingId) {
      loadBuildingData();
    }
  }, [props.buildingId]);

  // Note: Month change handling is done by useMonthRefresh in useCommonExpenseCalculator
  // Removed debug useEffects that were causing unnecessary logs

  if (!isOpen) return null;

  return (
    <ModalPortal>
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[120] p-4">
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <div className="bg-white rounded-lg max-w-[95vw] w-full max-h-[85vh] overflow-y-auto print-content">
        {/* ✅ ΝΕΟ: Screen Header - Οριζόντια Διάταξη */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-blue-100 border-b-2 border-blue-300 p-4 no-print">
            <div className="flex items-center justify-between mb-3">
                {/* Αριστερά: Logo + Γραφείο */}
                <div className="flex items-center gap-3">
                {(() => {
                  const logoUrl = getOfficeLogoUrl(managementOfficeLogo);
                  return logoUrl && !logoError ? (
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center shadow-md overflow-hidden bg-white border-2 border-blue-200">
                      <img 
                        src={logoUrl}
                        alt="Office Logo" 
                        className="w-full h-full object-contain"
                        onLoad={() => setLogoError(false)}
                        onError={() => setLogoError(true)}
                      />
                    </div>
                  ) : null;
                })()}
                <div>
                      <h2 className="text-base font-bold text-blue-900">
                    {managementOfficeName || 'Γραφείο Διαχείρισης'}
                  </h2>
                      <div className="flex gap-3 text-xs text-blue-700">
                  {managementOfficePhone && (
                          <span>📞 {managementOfficePhone}</span>
                  )}
                  {managementOfficeAddress && (
                          <span>📍 {managementOfficeAddress}</span>
                        )}
                      </div>
                    </div>
                </div>
                
                {/* Κέντρο: Τίτλος */}
                <div className="text-center">
                    <div className="flex items-center gap-2 justify-center">
                        <Building className="h-6 w-6 text-blue-600" />
                        <h2 className="text-xl font-bold text-gray-800 uppercase tracking-wide">Φύλλο Κοινοχρήστων</h2>
                    </div>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 mt-1 text-sm">
                      {expenseSheetMonth ? new Date(expenseSheetMonth + '-01').toLocaleDateString('el-GR', { month: 'long', year: 'numeric' }) : getPeriodInfo(state)}
                    </Badge>
                </div>
                
                {/* Δεξιά: Μήνας + Εξαγωγή + Close */}
                <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-600" />
                            <Select value={expenseSheetMonth} onValueChange={setExpenseSheetMonth}>
                            <SelectTrigger className="w-36 h-8 text-xs">
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
                    </div>
                    {/* ✅ ΝΕΟ: Κουμπί Εξαγωγής JPG */}
                    <Button 
                        onClick={() => handleExport('jpg')} 
                        variant="default" 
                        size="sm" 
                        className="bg-teal-600 hover:bg-teal-700 text-white"
                    >
                        <FileText className="h-4 w-4 mr-1" />
                        Εξαγωγή
                    </Button>
                    <Button onClick={onClose} variant="ghost" size="sm" className="hover:bg-blue-200">
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            
            {/* Δεύτερη γραμμή: Ημερομηνία Λήξης */}
            <div className="flex items-center justify-center gap-2 pt-2 border-t border-blue-200">
                <span className="text-xs font-medium text-blue-700">Πληρωτέο έως:</span>
                <span className="text-sm font-bold text-red-600">
                    10/{(() => {
                                    const date = new Date(expenseSheetMonth + '-01');
                                    return String(date.getMonth() + 2).padStart(2, '0');
                                })()}/{new Date(expenseSheetMonth + '-01').getFullYear()}
                </span>
                            </div>
                        </div>

        {/* ✅ ΝΕΟ: Print-Only Header - Οριζόντια Διάταξη */}
        <div className="hidden print:block border-b-2 border-gray-400 pb-3 mb-6 px-6 pt-6">
          <div className="flex items-center justify-between">
            {/* Αριστερά: Στοιχεία Γραφείου */}
            <div className="flex items-center gap-3">
              {(() => {
                const logoUrl = getOfficeLogoUrl(managementOfficeLogo);
                return logoUrl && !logoError ? (
                  <img
                    src={logoUrl}
                    alt="Office Logo"
                    className="w-14 h-14 object-contain"
                    onLoad={() => setLogoError(false)}
                    onError={() => setLogoError(true)}
                  />
                ) : null;
              })()}
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  {managementOfficeName || 'Γραφείο Διαχείρισης'}
                </h1>
                {managementOfficeAddress && (
                  <p className="text-xs text-gray-600">{managementOfficeAddress}</p>
                )}
                {managementOfficePhone && (
                  <p className="text-xs text-gray-600">Τηλ: {managementOfficePhone}</p>
                )}
                    </div>
                </div>
            
            {/* Κέντρο: Τίτλος & Περίοδος */}
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wide">
                ΦΥΛΛΟ ΚΟΙΝΟΧΡΗΣΤΩΝ
              </h2>
              <p className="text-sm text-gray-700 mt-1">
                {expenseSheetMonth ? new Date(expenseSheetMonth + '-01').toLocaleDateString('el-GR', { 
                  month: 'long', 
                  year: 'numeric' 
                }) : getPeriodInfo(state)}
              </p>
            </div>
            
            {/* Δεξιά: Ημερομηνία Λήξης */}
            <div className="text-right">
              <p className="text-xs text-gray-600 font-medium">Πληρωτέο έως:</p>
              <p className="text-lg font-bold text-red-600 mt-1">
                10/{(() => {
                  const date = new Date(expenseSheetMonth + '-01');
                  return String(date.getMonth() + 2).padStart(2, '0');
                })()}/{new Date(expenseSheetMonth + '-01').getFullYear()}
              </p>
            </div>
            </div>
        </div>

        <div className="p-6">
          <Tabs defaultValue="traditional" className="w-full">
            <TabsList className="grid w-full grid-cols-4 print:hidden">
              <TabsTrigger value="traditional"><Receipt className="h-4 w-4 mr-2" />Παραδοσιακή Προβολή</TabsTrigger>
              <TabsTrigger value="analysis"><PieChart className="h-4 w-4 mr-2" />Ανάλυση Δαπανών</TabsTrigger>
              <TabsTrigger value="statistics"><BarChart className="h-4 w-4 mr-2" />Στατιστικά</TabsTrigger>
              <TabsTrigger value="export"><FileText className="h-4 w-4 mr-2" />Εξαγωγή</TabsTrigger>
            </TabsList>

            <TabsContent value="traditional">
              <TraditionalViewTab {...props} {...{ state, buildingId, selectedMonth: expenseSheetMonth, aptWithFinancial, expenseBreakdown, managementFeeInfo, reserveFundInfo, totalExpenses, perApartmentAmounts, validateData, validationResult, getGroupedExpenses, getTotalPreviousBalance, getFinalTotalExpenses }} />
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
                    handleSendToAll={handleSendToAll}
                    isSaving={isSaving}
                    isSending={isSending}
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
        buildingHeatingSystem={buildingData?.heating_system}
        buildingHeatingFixedPercentage={buildingData?.heating_fixed_percentage}
      />
    </div>
    </div>
    </ModalPortal>
  );
};

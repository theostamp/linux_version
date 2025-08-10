'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FinancialOverview, 
  CommonExpenseCalculatorNew, 
  ExpenseForm, 
  TransactionHistory,
  ChartsContainer,
  BulkImportWizard,
  PaymentForm,
  ExpenseList,
  PaymentList
} from './index';
import { MeterReadingList } from './MeterReadingList';
import { MonthSelector } from './MonthSelector';
import { 
  BarChart3, 
  Calculator, 
  Plus, 
  History,
  DollarSign,
  TrendingUp,
  PieChart,
  FileText,
  Calendar
} from 'lucide-react';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { ProtectedFinancialRoute, ConditionalRender, PermissionButton } from './ProtectedFinancialRoute';
import { useSearchParams, useRouter } from 'next/navigation';
import { fetchApartments, ApartmentList } from '@/lib/api';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useModalState } from '@/hooks/useModalState';

interface FinancialPageProps {
  buildingId: number;
}

export const FinancialPage: React.FC<FinancialPageProps> = ({ buildingId }) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentBuilding, selectedBuilding } = useBuilding();
  
  // Use selectedBuilding ID if available, otherwise use the passed buildingId
  const activeBuildingId = selectedBuilding?.id || buildingId;
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Use custom hook for modal management
  const expenseModal = useModalState({
    modalKey: 'expense-form',
    requiredTab: 'expenses',
    buildingId: activeBuildingId
  });
  
  const paymentModal = useModalState({
    modalKey: 'payment-form',
    requiredTab: 'payments',
    buildingId: activeBuildingId
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [apartments, setApartments] = useState<ApartmentList[]>([]);
  const { canCreateExpense, canAccessReports, canCalculateCommonExpenses } = useFinancialPermissions();
  
  // Ref for financial overview to refresh data
  const overviewRef = useRef<{ loadSummary: () => void }>(null);
  // Ref for expense list to refresh data
  const expenseListRef = useRef<{ refresh: () => void }>(null);
  // Ref for payment list to refresh data
  const paymentListRef = useRef<{ refresh: () => void }>(null);
  
  // Force refresh when building changes
  useEffect(() => {
    // Trigger refresh of all data when activeBuildingId changes
    if (overviewRef.current) {
      overviewRef.current.loadSummary();
    }
    
    // Load apartments for the new building
    const loadApartments = async () => {
      try {
        const apartmentsData = await fetchApartments(activeBuildingId);
        setApartments(apartmentsData);
      } catch (error) {
        console.error('Error loading apartments:', error);
      }
    };
    
    loadApartments();
  }, [activeBuildingId]);
  
  // Handle URL parameters for tabs
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);
  
  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    // Remove modal parameter when changing tabs
    params.delete('modal');
    // Preserve building parameter
    if (!params.has('building')) {
      params.set('building', activeBuildingId.toString());
    }
    router.push(`/financial?${params.toString()}`);
  };
  
  const handleExpenseSuccess = () => {
    expenseModal.closeModal();
    // Refresh expense list data
    if (expenseListRef.current) {
      expenseListRef.current.refresh();
    }
    // Refresh financial overview data
    if (overviewRef.current) {
      overviewRef.current.loadSummary();
    }
  };
  
  const handlePaymentSuccess = () => {
    console.log('Payment success handler called');
    paymentModal.closeModal();
    // Refresh payment list data
    if (paymentListRef.current) {
      console.log('Refreshing payment list...');
      paymentListRef.current.refresh();
    }
    // Refresh financial overview data
    if (overviewRef.current) {
      overviewRef.current.loadSummary();
    }
  };
  
  const handleExpenseCancel = () => {
    expenseModal.closeModal();
  };
  
  const handlePaymentCancel = () => {
    paymentModal.closeModal();
  };

  // Quick Actions Handlers
  const handleNewExpense = () => {
    expenseModal.openModal();
  };

  const handleNewPayment = () => {
    paymentModal.openModal();
  };

  const handleCommonExpenses = () => {
    // Navigate to financial page with common expenses calculator tab
    router.push(`/financial?tab=calculator&building=${activeBuildingId}`);
  };

  useEffect(() => {
    fetchApartments(activeBuildingId).then(setApartments).catch(() => setApartments([]));
  }, [activeBuildingId]);
  
  // Get current building name
  const currentBuildingName = (selectedBuilding || currentBuilding)?.name || 'Άγνωστο Κτίριο';
  
  return (
    <div className="space-y-6" key={`financial-${activeBuildingId}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Οικονομική Διαχείριση</h1>
          <p className="text-muted-foreground">
            Διαχείριση δαπανών, κοινοχρήστων και εισπράξεων
          </p>
        </div>
      </div>
      
      {/* Building Location Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          Βρίσκεστε στο κτίριο <strong>{currentBuildingName}</strong>
        </p>
      </div>
      
      {/* Month Filter */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Φιλτράρισμα ανά μήνα:</span>
          <MonthSelector
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
          />
          <Button
            onClick={() => {
              const now = new Date();
              const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
              setSelectedMonth(currentMonth);
            }}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            Τρέχων Μήνας
          </Button>
        </div>
      </div>
      
      {/* Quick Actions Banner - Moved here from FinancialDashboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Γρήγορες Ενέργειες
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <ConditionalRender permission="expense_manage">
              <Button 
                onClick={handleNewExpense}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Νέα Δαπάνη
              </Button>
            </ConditionalRender>
            <ConditionalRender permission="financial_write">
              <Button 
                onClick={handleNewPayment}
                variant="outline" 
                className="flex items-center gap-2"
              >
                <DollarSign className="h-4 w-4" />
                Καταχώρηση Εισπράξεως
              </Button>
            </ConditionalRender>
            <ConditionalRender permission="financial_write">
              <Button 
                onClick={handleCommonExpenses}
                variant="outline" 
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Έκδοση Κοινοχρήστων
              </Button>
            </ConditionalRender>
          </div>
        </CardContent>
      </Card>
      

      
      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Επισκόπηση
          </TabsTrigger>
          <ConditionalRender permission="financial_write">
            <TabsTrigger value="calculator" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Κοινοχρήστων
            </TabsTrigger>
          </ConditionalRender>
          <ConditionalRender permission="expense_manage">
            <TabsTrigger value="expenses" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Δαπάνες
            </TabsTrigger>
          </ConditionalRender>
          <ConditionalRender permission="financial_write">
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Εισπράξεις
            </TabsTrigger>
          </ConditionalRender>
          <ConditionalRender permission="financial_write">
            <TabsTrigger value="meters" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Μετρητές
            </TabsTrigger>
          </ConditionalRender>
          <ConditionalRender permission="financial_read">
            <TabsTrigger value="charts" className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Γραφήματα
            </TabsTrigger>
          </ConditionalRender>
          <ConditionalRender permission="financial_read">
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Ιστορικό
            </TabsTrigger>
          </ConditionalRender>
        </TabsList>
        
        <TabsContent value="dashboard" className="space-y-4">
          <FinancialOverview ref={overviewRef} buildingId={activeBuildingId} selectedMonth={selectedMonth} />
        </TabsContent>
        
        <TabsContent value="calculator" className="space-y-4">
          <ProtectedFinancialRoute requiredPermission="financial_write">
            <CommonExpenseCalculatorNew buildingId={activeBuildingId} selectedMonth={selectedMonth} />
          </ProtectedFinancialRoute>
        </TabsContent>
        
        <TabsContent value="expenses" className="space-y-4">
          <ProtectedFinancialRoute requiredPermission="expense_manage">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Διαχείριση Δαπανών</span>
                    <Button 
                      onClick={expenseModal.openModal}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Προσθήκη Νέας Δαπάνης
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Εδώ μπορείτε να δείτε και να διαχειριστείτε όλες τις δαπάνες του κτιρίου.
                  </p>
                </CardContent>
              </Card>
              
              <ExpenseList 
                ref={expenseListRef}
                buildingId={activeBuildingId}
                buildingName={currentBuildingName}
                selectedMonth={selectedMonth}
                onMonthChange={setSelectedMonth}
                onExpenseSelect={(expense) => {
                  console.log('Selected expense:', expense);
                  // Here you could open an expense detail modal or navigate to expense details
                }}
                showActions={true}
              />
            </div>
          </ProtectedFinancialRoute>
        </TabsContent>
        
        <TabsContent value="payments" className="space-y-4">
          <ProtectedFinancialRoute requiredPermission="financial_write">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Διαχείριση Εισπράξεων</span>
                    <Button 
                      onClick={paymentModal.openModal}
                      className="flex items-center gap-2"
                    >
                      <DollarSign className="h-4 w-4" />
                      Προσθήκη Νέας Εισπράξεως
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Εδώ μπορείτε να δείτε και να διαχειριστείτε όλες τις εισπράξεις του κτιρίου.
                  </p>
                </CardContent>
              </Card>
              
              <PaymentList 
                ref={paymentListRef}
                buildingId={activeBuildingId}
                selectedMonth={selectedMonth}
                onPaymentSelect={(payment) => {
                  console.log('Selected payment:', payment);
                  // Here you could open a payment detail modal or navigate to payment details
                }}
                showActions={true}
              />
            </div>
          </ProtectedFinancialRoute>
        </TabsContent>
        
        <TabsContent value="meters" className="space-y-4">
          <ProtectedFinancialRoute requiredPermission="financial_write">
            <div className="space-y-6">
              <MeterReadingList buildingId={activeBuildingId} selectedMonth={selectedMonth} />
              <BulkImportWizard />
            </div>
          </ProtectedFinancialRoute>
        </TabsContent>
        
        <TabsContent value="charts" className="space-y-4">
          <ProtectedFinancialRoute requiredPermission="financial_read">
            <ChartsContainer buildingId={activeBuildingId} selectedMonth={selectedMonth} />
          </ProtectedFinancialRoute>
        </TabsContent>
        
        <TabsContent value="history" className="space-y-4">
          <ProtectedFinancialRoute requiredPermission="financial_read">
            <TransactionHistory buildingId={activeBuildingId} limit={20} selectedMonth={selectedMonth} />
          </ProtectedFinancialRoute>
        </TabsContent>
      </Tabs>
      
      {/* Expense Form Modal */}
      <ConditionalRender permission="expense_manage">
        {expenseModal.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Νέα Δαπάνη</h2>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleExpenseCancel}
                >
                  ✕
                </Button>
              </div>
              <ExpenseForm 
                buildingId={activeBuildingId}
                onSuccess={handleExpenseSuccess}
                onCancel={handleExpenseCancel}
              />
            </div>
          </div>
        )}
      </ConditionalRender>
      
      {/* Payment Form Modal */}
      <ConditionalRender permission="financial_write">
        {paymentModal.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Νέα Είσπραξη</h2>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handlePaymentCancel}
                >
                  ✕
                </Button>
              </div>
              <PaymentForm 
                buildingId={activeBuildingId}
                onSuccess={handlePaymentSuccess}
                onCancel={handlePaymentCancel}
                apartments={apartments}
              />
            </div>
          </div>
        )}
      </ConditionalRender>
    </div>
  );
}; 
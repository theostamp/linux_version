import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FinancialDashboard, 
  CommonExpenseCalculator, 
  ExpenseForm, 
  TransactionHistory,
  ChartsContainer,
  BulkImportWizard
} from './index';
import { MeterReadingList } from './MeterReadingList';
import { 
  BarChart3, 
  Calculator, 
  Plus, 
  History,
  DollarSign,
  TrendingUp,
  PieChart
} from 'lucide-react';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { ProtectedFinancialRoute, ConditionalRender, PermissionButton } from './ProtectedFinancialRoute';

interface FinancialPageProps {
  buildingId: number;
}

export const FinancialPage: React.FC<FinancialPageProps> = ({ buildingId }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const { canCreateExpense, canAccessReports, canCalculateCommonExpenses } = useFinancialPermissions();
  
  const handleExpenseSuccess = () => {
    setShowExpenseForm(false);
    // Εδώ θα μπορούσε να γίνει refresh των δεδομένων
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Οικονομική Διαχείριση</h1>
          <p className="text-muted-foreground">
            Διαχείριση δαπανών, κοινοχρήστων και πληρωμών
          </p>
        </div>
        <ConditionalRender permission="expense_manage">
          <Button 
            onClick={() => setShowExpenseForm(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Νέα Δαπάνη
          </Button>
        </ConditionalRender>
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Τρέχον Αποθεματικό</p>
                <p className="text-2xl font-bold">--</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calculator className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Ανέκδοτες Δαπάνες</p>
                <p className="text-2xl font-bold">--</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Τελευταίες Κινήσεις</p>
                <p className="text-2xl font-bold">--</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Συνολικές Οφειλές</p>
                <p className="text-2xl font-bold text-red-600">--</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
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
          <FinancialDashboard buildingId={buildingId} />
        </TabsContent>
        
        <TabsContent value="calculator" className="space-y-4">
          <ProtectedFinancialRoute requiredPermission="financial_write">
            <CommonExpenseCalculator buildingId={buildingId} />
          </ProtectedFinancialRoute>
        </TabsContent>
        
        <TabsContent value="expenses" className="space-y-4">
          <ProtectedFinancialRoute requiredPermission="expense_manage">
            <Card>
              <CardHeader>
                <CardTitle>Διαχείριση Δαπανών</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Εδώ μπορείτε να δείτε και να διαχειριστείτε όλες τις δαπάνες του κτιρίου.
                </p>
                <Button 
                  onClick={() => setShowExpenseForm(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Προσθήκη Νέας Δαπάνης
                </Button>
              </CardContent>
            </Card>
          </ProtectedFinancialRoute>
        </TabsContent>
        
        <TabsContent value="meters" className="space-y-4">
          <ProtectedFinancialRoute requiredPermission="financial_write">
            <div className="space-y-6">
              <MeterReadingList buildingId={buildingId} />
              <BulkImportWizard />
            </div>
          </ProtectedFinancialRoute>
        </TabsContent>
        
        <TabsContent value="charts" className="space-y-4">
          <ProtectedFinancialRoute requiredPermission="financial_read">
            <ChartsContainer buildingId={buildingId} />
          </ProtectedFinancialRoute>
        </TabsContent>
        
        <TabsContent value="history" className="space-y-4">
          <ProtectedFinancialRoute requiredPermission="financial_read">
            <TransactionHistory buildingId={buildingId} limit={20} />
          </ProtectedFinancialRoute>
        </TabsContent>
      </Tabs>
      
      {/* Expense Form Modal */}
      <ConditionalRender permission="expense_manage">
        {showExpenseForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Νέα Δαπάνη</h2>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowExpenseForm(false)}
                >
                  ✕
                </Button>
              </div>
              <ExpenseForm 
                buildingId={buildingId}
                onSuccess={handleExpenseSuccess}
                onCancel={() => setShowExpenseForm(false)}
              />
            </div>
          </div>
        )}
      </ConditionalRender>
    </div>
  );
}; 
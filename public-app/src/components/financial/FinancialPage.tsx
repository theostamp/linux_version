'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, AlertCircle, Calculator, History, PieChart, Plus, TrendingUp } from 'lucide-react';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';

interface FinancialPageProps {
  buildingId: number;
}

/**
 * FinancialPage Component
 * 
 * Main component for financial management.
 * Currently shows a placeholder message indicating that full implementation is pending.
 * 
 * TODO: Implement full FinancialPage with:
 * - CommonExpenseCalculatorNew
 * - ExpenseForm
 * - TransactionHistory
 * - ChartsContainer
 * - BulkImportWizard
 * - ExpenseList
 * - BuildingOverviewSection
 * - ApartmentBalancesTab
 * - MeterReadingList
 * - MonthSelector
 */
export const FinancialPage: React.FC<FinancialPageProps> = ({ buildingId }) => {
  const { canCreateExpense, canAccessReports, canCalculateCommonExpenses } = useFinancialPermissions();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DollarSign className="w-8 h-8 text-green-600" />
          <h1 className="text-3xl font-bold">💰 Οικονομικά</h1>
        </div>
      </div>

      {/* Placeholder Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            FinancialPage Component - Under Development
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700">
            Το FinancialPage component βρίσκεται υπό ανάπτυξη. Η πλήρης υλοποίηση θα περιλαμβάνει:
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Required Components */}
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900">Required Components:</h3>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>CommonExpenseCalculatorNew</li>
                <li>ExpenseForm</li>
                <li>TransactionHistory</li>
                <li>ChartsContainer</li>
                <li>BulkImportWizard</li>
                <li>ExpenseList</li>
                <li>BuildingOverviewSection</li>
                <li>ApartmentBalancesTab</li>
                <li>MeterReadingList</li>
                <li>MonthSelector</li>
              </ul>
            </div>

            {/* Required Hooks */}
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900">Required Hooks:</h3>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li className="text-green-600">✅ useFinancialPermissions</li>
                <li className="text-green-600">✅ useFinancialAutoRefresh</li>
                <li className="text-green-600">✅ useModalState</li>
              </ul>
            </div>
          </div>

          {/* Permissions Info */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">Current Permissions:</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className={canCreateExpense() ? 'text-green-600' : 'text-gray-400'}>
                  {canCreateExpense() ? '✓' : '✗'}
                </span>
                <span>Create Expense</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={canAccessReports() ? 'text-green-600' : 'text-gray-400'}>
                  {canAccessReports() ? '✓' : '✗'}
                </span>
                <span>Access Reports</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={canCalculateCommonExpenses() ? 'text-green-600' : 'text-gray-400'}>
                  {canCalculateCommonExpenses() ? '✓' : '✗'}
                </span>
                <span>Calculate Common Expenses</span>
              </div>
            </div>
          </div>

          {/* Building Info */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
            <p className="text-sm font-medium text-gray-700">
              Building ID: <span className="font-mono">{buildingId}</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};


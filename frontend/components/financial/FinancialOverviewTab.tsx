'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { 
  TrendingUp, 
  Building2, 
  PiggyBank, 
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3
} from 'lucide-react';

interface FinancialOverviewData {
  totalIncome: number;
  managementExpenses: number;
  buildingExpenses: number;
  reserveFundTarget: number;
  reserveFundCurrent: number;
  surplus: number;
}

interface FinancialOverviewTabProps {
  buildingId: number;
  selectedMonth: string;
}

export const FinancialOverviewTab: React.FC<FinancialOverviewTabProps> = ({
  buildingId,
  selectedMonth
}) => {
  const [data, setData] = useState<FinancialOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOverviewData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await api.get(`/financial/overview/`, {
          params: {
            building_id: buildingId,
            selected_month: selectedMonth
          }
        });

        if (response.data.status === 'success') {
          setData(response.data.data);
        } else {
          throw new Error(response.data.message || 'Σφάλμα φόρτωσης δεδομένων');
        }
      } catch (err) {
        setError('Σφάλμα φόρτωσης δεδομένων');
        console.error('Error fetching overview data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOverviewData();
  }, [buildingId, selectedMonth]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <span>{error || 'Δεν βρέθηκαν δεδομένα'}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate percentages based on total income
  const totalIncome = data.totalIncome || 0;
  const managementExpenses = data.managementExpenses || 0;
  const buildingExpenses = data.buildingExpenses || 0;
  const reserveFundTarget = data.reserveFundTarget || 0;
  const surplus = data.surplus || 0;

  // Calculate percentages for the horizontal progress bar
  const managementPercentage = totalIncome > 0 ? (managementExpenses / totalIncome) * 100 : 0;
  const buildingPercentage = totalIncome > 0 ? (buildingExpenses / totalIncome) * 100 : 0;
  const reservePercentage = totalIncome > 0 ? (reserveFundTarget / totalIncome) * 100 : 0;
  const surplusPercentage = totalIncome > 0 ? (surplus / totalIncome) * 100 : 0;

  // Ensure percentages don't exceed 100% total
  const totalPercentage = managementPercentage + buildingPercentage + reservePercentage + surplusPercentage;
  const normalizedManagementPercentage = totalPercentage > 100 ? (managementPercentage / totalPercentage) * 100 : managementPercentage;
  const normalizedBuildingPercentage = totalPercentage > 100 ? (buildingPercentage / totalPercentage) * 100 : buildingPercentage;
  const normalizedReservePercentage = totalPercentage > 100 ? (reservePercentage / totalPercentage) * 100 : reservePercentage;
  const normalizedSurplusPercentage = totalPercentage > 100 ? (surplusPercentage / totalPercentage) * 100 : surplusPercentage;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <TrendingUp className="h-6 w-6" />
            Συνοπτική Εικόνα Οικονομικής Διαχείρισης
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-700">€{totalIncome.toLocaleString('el-GR')}</div>
              <div className="text-sm text-blue-600">Συνολικές Εισπράξεις</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-700">€{managementExpenses.toLocaleString('el-GR')}</div>
              <div className="text-sm text-green-600">Δαπάνες Διαχείρισης</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-700">€{buildingExpenses.toLocaleString('el-GR')}</div>
              <div className="text-sm text-orange-600">Δαπάνες Πολυκατοικίας</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-700">€{surplus.toLocaleString('el-GR')}</div>
              <div className="text-sm text-purple-600">Πλεόνασμα</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Horizontal Progress Bar Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Καλυψη Εισπραξεων κατά Προτεραιότητα
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Horizontal Progress Bar */}
          <div className="relative">
            {/* Progress Bar Container */}
            <div className="w-full h-12 bg-gray-200 rounded-lg overflow-hidden flex">
              {/* Management Expenses - Light Yellow */}
              <div 
                className="bg-yellow-300 h-full flex items-center justify-center text-xs font-medium text-gray-800 border-r border-white"
                style={{ width: `${normalizedManagementPercentage}%` }}
              >
                {normalizedManagementPercentage > 5 && (
                  <span className="px-1">Διαχείριση</span>
                )}
              </div>
              
              {/* Building Expenses - Dark Yellow/Orange */}
              <div 
                className="bg-yellow-600 h-full flex items-center justify-center text-xs font-medium text-white border-r border-white"
                style={{ width: `${normalizedBuildingPercentage}%` }}
              >
                {normalizedBuildingPercentage > 5 && (
                  <span className="px-1">Πολυκατοικία</span>
                )}
              </div>
              
              {/* Reserve Fund - Green */}
              <div 
                className="bg-green-500 h-full flex items-center justify-center text-xs font-medium text-white border-r border-white"
                style={{ width: `${normalizedReservePercentage}%` }}
              >
                {normalizedReservePercentage > 5 && (
                  <span className="px-1">Αποθεματικό</span>
                )}
              </div>
              
              {/* Surplus - White/Empty */}
              <div 
                className="bg-white h-full flex items-center justify-center text-xs font-medium text-gray-600 border border-gray-300"
                style={{ width: `${normalizedSurplusPercentage}%` }}
              >
                {normalizedSurplusPercentage > 5 && (
                  <span className="px-1">Πλεόνασμα</span>
                )}
              </div>
            </div>

            {/* Labels above the progress bar */}
            <div className="flex justify-between mt-2 text-xs text-gray-600">
              <span>δαπάνες διαχείρισης</span>
              <span>Τρέχουσες δαπάνες μήνα</span>
              <span>αποθεματικό</span>
              <span>πλεόνασμα</span>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {/* Management Expenses */}
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-yellow-300 rounded"></div>
                <span className="font-medium text-sm">Δαπάνες Διαχείρισης</span>
              </div>
              <div className="text-lg font-bold text-gray-800">
                {normalizedManagementPercentage.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">
                €{managementExpenses.toLocaleString('el-GR')}
              </div>
            </div>

            {/* Building Expenses */}
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-yellow-600 rounded"></div>
                <span className="font-medium text-sm">Δαπάνες Πολυκατοικίας</span>
              </div>
              <div className="text-lg font-bold text-gray-800">
                {normalizedBuildingPercentage.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">
                €{buildingExpenses.toLocaleString('el-GR')}
              </div>
            </div>

            {/* Reserve Fund */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="font-medium text-sm">Αποθεματικό</span>
              </div>
              <div className="text-lg font-bold text-gray-800">
                {normalizedReservePercentage.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">
                €{reserveFundTarget.toLocaleString('el-GR')}
              </div>
            </div>

            {/* Surplus */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-white border border-gray-300 rounded"></div>
                <span className="font-medium text-sm">Πλεόνασμα</span>
              </div>
              <div className="text-lg font-bold text-gray-800">
                {normalizedSurplusPercentage.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">
                €{surplus.toLocaleString('el-GR')}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="font-medium text-blue-900">Συνολική Καλυψη:</span>
              <Badge variant="secondary" className="text-lg bg-blue-100 text-blue-800">
                {(normalizedManagementPercentage + normalizedBuildingPercentage + normalizedReservePercentage).toFixed(1)}%
              </Badge>
            </div>
            <div className="mt-2 text-sm text-blue-700">
              {totalIncome > 0 ? (
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Εισπράξεις διαθέσιμες για κάλυψη: €{totalIncome.toLocaleString('el-GR')}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-yellow-600">
                  <AlertTriangle className="h-4 w-4" />
                  Δεν υπάρχουν εισπράξεις για τον επιλεγμένο μήνα
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Στατιστικά Μήνα</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Μέση Εισπραξη/Μήνα</span>
                <span className="font-medium">€{(totalIncome / 12).toLocaleString('el-GR', { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Αποθεματικό/Μήνα</span>
                <span className="font-medium">€{(reserveFundTarget / 12).toLocaleString('el-GR', { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Καλυψη Αποθεματικου</span>
                <span className="font-medium">{reserveFundTarget > 0 ? ((data.reserveFundCurrent || 0) / reserveFundTarget * 100).toFixed(1) : 0}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Απόδοση Εισπράξεων</span>
                <span className="font-medium">{totalIncome > 0 ? (((totalIncome - surplus) / totalIncome) * 100).toFixed(1) : 0}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Πληροφορίες Περιόδου</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Επιλεγμένος Μήνας</span>
                <span className="font-medium">{selectedMonth || 'Τρέχων μήνας'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Κατασταση Δεδομένων</span>
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  Ενημερωμένα
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Πολυκατοικία</span>
                <span className="font-medium">ID: {buildingId}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import {
  Building2,
  Users,
  Thermometer,
  ArrowUpDown,
  Package,
  Target,
  TrendingUp,
  Euro,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  PiggyBank,
  Calculator,
  CreditCard,
  Receipt,
  BarChart3,
  PieChart as PieChartIcon
} from 'lucide-react';
import { CalculatorState } from './types/financial';
import { ApartmentWithFinancialData } from '@/hooks/useApartmentsWithFinancialData';

interface StatisticsSectionProps {
  state: CalculatorState;
  buildingName?: string;
  apartmentsCount?: number;
  expenseBreakdown: any;
  reserveFundInfo: any;
  managementFeeInfo: any;
  aptWithFinancial: ApartmentWithFinancialData[];
}

// Colors for different expense categories
const EXPENSE_COLORS = {
  general_expenses: '#3B82F6',      // Blue - Γενικές δαπάνες
  elevator_expenses: '#10B981',     // Green - Ανελκυστήρας
  heating_expenses: '#F59E0B',      // Orange - Θέρμανση
  equal_share_expenses: '#8B5CF6',  // Purple - Ισόποσα
  individual_expenses: '#EF4444',   // Red - Ατομικές
  reserve_fund_contribution: '#6B7280', // Gray - Αποθεματικό
  management_fee: '#EC4899'         // Pink - Διαχείριση
};

const CATEGORY_LABELS = {
  general_expenses: 'Γενικές Δαπάνες',
  elevator_expenses: 'Ανελκυστήρας',
  heating_expenses: 'Θέρμανση',
  equal_share_expenses: 'Ισόποσες Δαπάνες',
  individual_expenses: 'Ατομικές Δαπάνες',
  reserve_fund_contribution: 'Εισφορά Αποθεματικού',
  management_fee: 'Αμοιβή Διαχείρισης'
};

const CATEGORY_ICONS = {
  general_expenses: Building2,
  elevator_expenses: ArrowUpDown,
  heating_expenses: Thermometer,
  equal_share_expenses: Users,
  individual_expenses: Package,
  reserve_fund_contribution: Target,
  management_fee: Calculator
};

export const StatisticsSection: React.FC<StatisticsSectionProps> = ({
  state,
  buildingName = 'Άγνωστο Κτίριο',
  apartmentsCount = 0,
  expenseBreakdown,
  reserveFundInfo,
  managementFeeInfo,
  aptWithFinancial
}) => {
  // Helper functions for period info
  const getPeriodInfo = () => {
    const selectedMonth = state.customPeriod?.startDate ? state.customPeriod.startDate.substring(0, 7) : undefined;
    return state.customPeriod.periodName || 'Άγνωστη Περίοδος';
  };

  const getPeriodInfoWithBillingCycle = () => {
    const periodName = getPeriodInfo();

    // Extract month and year from period name (e.g., "Σεπτέμβριος 2025")
    const monthMatch = periodName.match(/(\w+)\s+(\d{4})/);
    if (!monthMatch) return periodName;

    const [, monthName, year] = monthMatch;

    // Greek month names mapping for previous month calculation
    const monthNames = [
      'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος',
      'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'
    ];

    const currentMonthIndex = monthNames.indexOf(monthName);
    if (currentMonthIndex === -1) return periodName;

    // Calculate previous month (usage month) - επιλεγμένος μήνας - 1
    let usageMonthIndex = currentMonthIndex - 1;
    let usageYear = parseInt(year);

    if (usageMonthIndex < 0) {
      usageMonthIndex = 11; // December
      usageYear -= 1;
    }

    const usageMonthName = monthNames[usageMonthIndex];

    // Return format: "Αύγουστος 2025 (Χρήση: Ιούλιος 2025 → Χρέωση: Αύγουστος 2025)"
    return `${usageMonthName} ${usageYear} (Χρήση: ${usageMonthName} ${usageYear} → Χρέωση: ${monthName} ${year})`;
  };
  // Helper to safely convert values to numbers
  const toNumber = (value: any): number => {
    const num = typeof value === 'string' ? parseFloat(value) : Number(value || 0);
    return isNaN(num) ? 0 : num;
  };

  // Calculate expense distribution for pie chart
  const expenseDistribution = useMemo(() => {
    const data = [];

    if (expenseBreakdown.common > 0) {
      data.push({
        name: 'Κοινόχρηστα',
        value: expenseBreakdown.common,
        color: '#3B82F6',
        icon: Building2
      });
    }

    if (expenseBreakdown.elevator > 0) {
      data.push({
        name: 'Ανελκυστήρας',
        value: expenseBreakdown.elevator,
        color: '#10B981',
        icon: ArrowUpDown
      });
    }

    if (expenseBreakdown.heating > 0) {
      data.push({
        name: 'Θέρμανση',
        value: expenseBreakdown.heating,
        color: '#F59E0B',
        icon: Thermometer
      });
    }

    if (expenseBreakdown.other > 0) {
      data.push({
        name: 'Λοιπά Έξοδα',
        value: expenseBreakdown.other,
        color: '#8B5CF6',
        icon: Users
      });
    }

    if (expenseBreakdown.coownership > 0) {
      data.push({
        name: 'Συνιδιοκτησία',
        value: expenseBreakdown.coownership,
        color: '#EF4444',
        icon: Package
      });
    }

    if (managementFeeInfo.totalFee > 0) {
      data.push({
        name: 'Διαχείριση',
        value: managementFeeInfo.totalFee,
        color: '#EC4899',
        icon: Calculator
      });
    }

    if (reserveFundInfo.monthlyAmount > 0) {
      data.push({
        name: 'Αποθεματικό',
        value: reserveFundInfo.monthlyAmount,
        color: '#6B7280',
        icon: PiggyBank
      });
    }

    return data;
  }, [expenseBreakdown, managementFeeInfo, reserveFundInfo]);

  // Calculate apartment payment status
  const apartmentPaymentStatus = useMemo(() => {
    return Object.values(state.shares).map((share: any) => {
      const apartmentData = aptWithFinancial.find(apt => apt.id === share.apartment_id);
      const previousBalance = toNumber(apartmentData?.previous_balance || 0);
      const breakdown = share.breakdown || {};
      const totalDue = toNumber(breakdown.general_expenses || 0) +
                      toNumber(breakdown.elevator_expenses || 0) +
                      toNumber(breakdown.heating_expenses || 0) +
                      toNumber(breakdown.equal_share_expenses || 0) +
                      toNumber(breakdown.individual_expenses || 0) +
                      toNumber(breakdown.reserve_fund_contribution || 0) +
                      toNumber(managementFeeInfo.feePerApartment || 0);

      const status = previousBalance > 0 ? 'overdue' : totalDue > 0 ? 'pending' : 'paid';

      return {
        apartment: share.identifier || share.apartment_number,
        owner: share.owner_name || 'Μη καταχωρημένος',
        previousBalance,
        totalDue,
        status,
        color: status === 'overdue' ? '#EF4444' : status === 'pending' ? '#F59E0B' : '#10B981'
      };
    });
  }, [state.shares, aptWithFinancial, managementFeeInfo]);

  // Calculate payment statistics
  const paymentStats = useMemo(() => {
    const stats = {
      total: apartmentPaymentStatus.length,
      paid: apartmentPaymentStatus.filter(apt => apt.status === 'paid').length,
      pending: apartmentPaymentStatus.filter(apt => apt.status === 'pending').length,
      overdue: apartmentPaymentStatus.filter(apt => apt.status === 'overdue').length,
      totalAmount: apartmentPaymentStatus.reduce((sum, apt) => sum + apt.totalDue, 0),
      overdueAmount: apartmentPaymentStatus.reduce((sum, apt) => sum + (apt.status === 'overdue' ? apt.previousBalance : 0), 0)
    };

    return {
      ...stats,
      paidPercentage: stats.total > 0 ? (stats.paid / stats.total) * 100 : 0,
      pendingPercentage: stats.total > 0 ? (stats.pending / stats.total) * 100 : 0,
      overduePercentage: stats.total > 0 ? (stats.overdue / stats.total) * 100 : 0
    };
  }, [apartmentPaymentStatus]);

  // Calculate monthly trends (mock data for now)
  const monthlyTrends = useMemo(() => {
    const months = ['Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μάι', 'Ιουν', 'Ιουλ', 'Αυγ', 'Σεπ', 'Οκτ', 'Νοε', 'Δεκ'];
    const currentMonth = new Date().getMonth();

    return months.map((month, index) => ({
      month,
      expenses: Math.random() * 5000 + 2000, // Mock data
      payments: Math.random() * 4000 + 1500, // Mock data
      balance: Math.random() * 1000 - 500 // Mock data
    }));
  }, []);

  // Calculate total previous balance from all apartments
  const getTotalPreviousBalance = () => {
    return Object.values(state.shares).reduce((sum: number, s: any) => {
      const apartmentData = aptWithFinancial.find(apt => apt.id === s.apartment_id);
      return sum + toNumber(apartmentData?.previous_balance ?? 0);
    }, 0);
  };

  // Calculate final total expenses
  const getFinalTotalExpenses = () => {
    const totalExpenses = expenseBreakdown.common + expenseBreakdown.elevator + expenseBreakdown.heating + expenseBreakdown.other + expenseBreakdown.coownership;
    const totalManagementFee = managementFeeInfo.totalFee;
    const totalReserveFund = reserveFundInfo.monthlyAmount;
    const totalPreviousBalance = getTotalPreviousBalance();

    return totalExpenses + totalManagementFee + totalReserveFund + totalPreviousBalance;
  };

  const formatAmount = (amount: number) => {
    if (isNaN(amount) || !isFinite(amount)) {
      return '0,00';
    }
    return new Intl.NumberFormat('el-GR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Period Information */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardContent className="p-4">
          <div className="text-center">
            <h3 className="font-bold text-blue-800 text-lg mb-2">📊 Στατιστικά & Ανάλυση</h3>
            <div className="text-sm text-blue-700">
              <p>💡 Πληρωτέο ποσό για {getPeriodInfo()}:</p>
              <p className="text-xs text-blue-600 ml-2">
                • Δαπάνες {getPeriodInfoWithBillingCycle()}
              </p>
              <p className="text-xs text-blue-600 ml-2">
                • Παλαιότερες οφειλές (αν υπάρχουν)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Συμπαγής Αναλυση Δαπανών για Α4 */}
      <Card className="border-2 border-slate-200 bg-white">
        <CardContent className="p-3">
          <h3 className="text-sm font-bold text-gray-800 mb-3 text-center">
            ΑΝΑΛΥΣΗ ΔΑΠΑΝΩΝ ΠΟΛΥΚΑΤΟΙΚΙΑΣ
          </h3>

          <div className="space-y-2">
            {/* 1. Λειτουργικές Δαπάνες */}
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
                  <span className="text-gray-600 text-xs font-bold">1</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">Λειτουργικές Δαπάνες</p>
                  <p className="text-xs text-gray-600">Ρεύμα, νερό, καθαρισμός, κλπ.</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-base font-bold text-gray-800">
                  {formatAmount(expenseBreakdown.common + expenseBreakdown.elevator + expenseBreakdown.heating + expenseBreakdown.other + expenseBreakdown.coownership)}€
                </p>
              </div>
            </div>

            {/* 2. Κόστος διαχείρισης */}
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
                  <span className="text-gray-600 text-xs font-bold">2</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">Κόστος διαχείρισης</p>
                  <p className="text-xs text-gray-600">Αμοιβή διαχειριστή</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-base font-bold text-gray-800">
                  {formatAmount(managementFeeInfo.totalFee)}€
                </p>
              </div>
            </div>

            {/* 3. Αποθεματικό Ταμείο */}
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
                  <span className="text-gray-600 text-xs font-bold">3</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">Αποθεματικό Ταμείο</p>
                  <p className="text-xs text-gray-600">Μηνιαία εισφορά</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-base font-bold text-gray-800">
                  {formatAmount(reserveFundInfo.monthlyAmount)}€
                </p>
              </div>
            </div>

            {/* 4. Παλαιότερες οφειλές */}
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
                  <span className="text-gray-600 text-xs font-bold">4</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">Παλαιότερες οφειλές</p>
                  <p className="text-xs text-gray-600">Οφειλές προηγούμενων μηνών</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-base font-bold text-gray-800">
                  {formatAmount(getTotalPreviousBalance())}€
                </p>
              </div>
            </div>

            {/* ΣΥΝΟΛΟ */}
            <div className="flex items-center justify-between p-3 bg-gray-800 rounded border-2 border-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                  <span className="text-gray-800 text-sm font-bold">Σ</span>
                </div>
                <div>
                  <p className="font-bold text-white text-base">ΣΥΝΟΛΟ</p>
                  <p className="text-xs text-gray-300">Όλες οι δαπάνες + παλαιότερες οφειλές</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-white">
                  {formatAmount(getFinalTotalExpenses())}€
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Euro className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-600">Σύνολο Δαπανών</p>
                <p className="text-2xl font-bold text-blue-800">
                  {formatAmount(expenseDistribution.reduce((sum, item) => sum + item.value, 0))}€
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Building2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-600">Διαμερίσματα</p>
                <p className="text-2xl font-bold text-green-800">{apartmentsCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-orange-600">Πληρωμένες</p>
                <p className="text-2xl font-bold text-orange-800">
                  {paymentStats.paid}/{paymentStats.total}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <PiggyBank className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-purple-600">Αποθεματικό</p>
                <p className="text-2xl font-bold text-purple-800">
                  {formatAmount(reserveFundInfo.monthlyAmount || 0)}€
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Κατανομή Δαπανών
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expenseDistribution.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: any) => `${name} ${((percent as number) * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {expenseDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => `${formatAmount(value)}€`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-500">
                Δεν υπάρχουν δεδομένα για γράφημα
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Status Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Κατάσταση Πληρωμών
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={apartmentPaymentStatus.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="apartment" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => `${formatAmount(value)}€`} />
                  <Bar dataKey="totalDue" fill="#3B82F6" name="Πληρωτέο Ποσό" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Στατιστικά Πληρωμών
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Payment Progress */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-800">Πρόοδος Πληρωμών</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-green-600">Πληρωμένες</span>
                    <span className="font-medium">{paymentStats.paidPercentage.toFixed(1)}%</span>
                  </div>
                  <Progress value={paymentStats.paidPercentage} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-orange-600">Εκκρεμείς</span>
                    <span className="font-medium">{paymentStats.pendingPercentage.toFixed(1)}%</span>
                  </div>
                  <Progress value={paymentStats.pendingPercentage} className="h-2 bg-orange-100" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-red-600">Καθυστερημένες</span>
                    <span className="font-medium">{paymentStats.overduePercentage.toFixed(1)}%</span>
                  </div>
                  <Progress value={paymentStats.overduePercentage} className="h-2 bg-red-100" />
                </div>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-800">Σύνοψη Πληρωμών</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Συνολικό Ποσό:</span>
                  <span className="font-medium">{formatAmount(paymentStats.totalAmount)}€</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Καθυστερημένες:</span>
                  <span className="font-medium text-red-600">{formatAmount(paymentStats.overdueAmount)}€</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Πληρωμένες:</span>
                  <span className="font-medium text-green-600">{paymentStats.paid}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Εκκρεμείς:</span>
                  <span className="font-medium text-orange-600">{paymentStats.pending}</span>
                </div>
              </div>
            </div>

            {/* Reserve Fund Progress */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-800">Αποθεματικό Ταμείο</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-purple-600">Πρόοδος</span>
                    <span className="font-medium">{reserveFundInfo.progressPercentage?.toFixed(1) || 0}%</span>
                  </div>
                  <Progress value={reserveFundInfo.progressPercentage || 0} className="h-2 bg-purple-100" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Στόχος:</span>
                    <span className="font-medium">{formatAmount(reserveFundInfo.goal || 0)}€</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Μαζεμένα:</span>
                    <span className="font-medium">{formatAmount(reserveFundInfo.actualReserveCollected || 0)}€</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Μήνες Απομένουν:</span>
                    <span className="font-medium">{reserveFundInfo.monthsRemaining || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Μηνιαίες Τάσεις
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: any) => `${formatAmount(value)}€`} />
                <Legend />
                <Area type="monotone" dataKey="expenses" stackId="1" stroke="#EF4444" fill="#FEE2E2" name="Δαπάνες" />
                <Area type="monotone" dataKey="payments" stackId="1" stroke="#10B981" fill="#D1FAE5" name="Πληρωμές" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Apartment Payment Status Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Κατάσταση Διαμερισμάτων
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Διαμέρισμα</th>
                  <th className="text-left py-2">Ιδιοκτήτης</th>
                  <th className="text-right py-2">Παλαιότερες Οφειλές</th>
                  <th className="text-right py-2">Πληρωτέο Ποσό</th>
                  <th className="text-center py-2">Κατάσταση</th>
                </tr>
              </thead>
              <tbody>
                {apartmentPaymentStatus.map((apt, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-2 font-medium">{apt.apartment}</td>
                    <td className="py-2">{apt.owner}</td>
                    <td className="py-2 text-right">
                      <span className={apt.previousBalance > 0 ? 'text-red-600' : 'text-green-600'}>
                        {formatAmount(apt.previousBalance)}€
                      </span>
                    </td>
                    <td className="py-2 text-right font-medium">{formatAmount(apt.totalDue)}€</td>
                    <td className="py-2 text-center">
                      <Badge
                        variant={apt.status === 'paid' ? 'default' : apt.status === 'pending' ? 'secondary' : 'destructive'}
                        className="text-xs"
                      >
                        {apt.status === 'paid' ? 'Πληρωμένο' : apt.status === 'pending' ? 'Εκκρεμεί' : 'Καθυστέρηση'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

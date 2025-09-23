'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Legend
} from 'recharts';
import { 
  Building2, 
  Users, 
  Thermometer,
  ArrowUpDown,
  Package,
  Target,
  TrendingUp,
  Download,
  Eye,
  Calculator
} from 'lucide-react';
import { CalculatorState } from './CalculatorWizard';

interface ExpenseBreakdownSectionProps {
  state: CalculatorState;
  buildingName?: string;
  apartmentsCount?: number;
  onViewDetails?: (categoryId: string) => void;
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

export const ExpenseBreakdownSection: React.FC<ExpenseBreakdownSectionProps> = ({
  state,
  buildingName = 'Άγνωστο Κτίριο',
  apartmentsCount = 0,
  onViewDetails
}) => {
  const [activeView, setActiveView] = useState<'overview' | 'categories' | 'apartments'>('overview');

  // Helper to safely convert values to numbers
  const toNumber = (value: any): number => {
    const num = typeof value === 'string' ? parseFloat(value) : Number(value || 0);
    return isNaN(num) ? 0 : num;
  };

  // Calculate totals by category from all apartment shares
  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    
    Object.values(state.shares).forEach((share: any) => {
      const breakdown = share.breakdown || {};
      
      Object.keys(CATEGORY_LABELS).forEach(category => {
        if (!totals[category]) totals[category] = 0;
        totals[category] += toNumber(breakdown[category]);
      });
    });

    return totals;
  }, [state.shares]);

  // Calculate total expenses
  const totalExpenses = useMemo(() => {
    return Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);
  }, [categoryTotals]);

  // Prepare data for pie chart
  const pieChartData = useMemo(() => {
    return Object.entries(categoryTotals)
      .filter(([_, amount]) => amount > 0)
      .map(([category, amount]) => ({
        name: CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS],
        value: amount,
        percentage: totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : '0',
        color: EXPENSE_COLORS[category as keyof typeof EXPENSE_COLORS]
      }));
  }, [categoryTotals, totalExpenses]);

  // Prepare data for bar chart (apartment comparison)
  const apartmentData = useMemo(() => {
    return Object.values(state.shares).map((share: any) => {
      const breakdown = share.breakdown || {};
      return {
        apartment: `Διαμ. ${share.apartment_number || share.apartment_id}`,
        general: toNumber(breakdown.general_expenses),
        elevator: toNumber(breakdown.elevator_expenses),
        heating: toNumber(breakdown.heating_expenses),
        equal_share: toNumber(breakdown.equal_share_expenses),
        individual: toNumber(breakdown.individual_expenses),
        reserve: toNumber(breakdown.reserve_fund_contribution),
        management: toNumber(breakdown.management_fee),
        total: toNumber(share.total_amount)
      };
    }).sort((a, b) => parseInt(a.apartment.replace('Διαμ. ', '')) - parseInt(b.apartment.replace('Διαμ. ', '')));
  }, [state.shares]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('el-GR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-l-4 border-l-purple-500">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-lg">
            <PieChart className="h-6 w-6 text-purple-600" />
            <span>Ανάλυση Κατανομής Δαπανών - {buildingName}</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-purple-700 border-purple-300">
              {apartmentsCount} Διαμερίσματα
            </Badge>
            <Badge variant="default" className="bg-purple-600">
              Σύνολο: {formatCurrency(totalExpenses)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeView} onValueChange={(value) => setActiveView(value as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Επισκόπηση
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Κατηγορίες
            </TabsTrigger>
            <TabsTrigger value="apartments" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Διαμερίσματα
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Κατανομή Δαπανών ανά Κατηγορία</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name}: ${percentage}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Summary Cards */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Σύνοψη Δαπανών</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(categoryTotals)
                      .filter(([_, amount]) => amount > 0)
                      .sort(([_a, amountA], [_b, amountB]) => amountB - amountA)
                      .map(([category, amount]) => {
                        const IconComponent = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS];
                        const percentage = totalExpenses > 0 ? ((amount / totalExpenses) * 100) : 0;
                        
                        return (
                          <div key={category} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <IconComponent 
                                className="h-5 w-5" 
                                style={{ color: EXPENSE_COLORS[category as keyof typeof EXPENSE_COLORS] }}
                              />
                              <div>
                                <p className="font-medium text-sm">
                                  {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {percentage.toFixed(1)}% του συνόλου
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-sm">{formatCurrency(amount)}</p>
                              <p className="text-xs text-gray-600">
                                {apartmentsCount > 0 ? formatCurrency(amount / apartmentsCount) : '0,00 €'}/διαμ.
                              </p>
                            </div>
                          </div>
                        );
                      })}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(categoryTotals)
                .filter(([_, amount]) => amount > 0)
                .map(([category, amount]) => {
                  const IconComponent = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS];
                  const color = EXPENSE_COLORS[category as keyof typeof EXPENSE_COLORS];
                  const percentage = totalExpenses > 0 ? ((amount / totalExpenses) * 100) : 0;
                  
                  return (
                    <Card key={category} className="border-l-4" style={{ borderLeftColor: color }}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <IconComponent className="h-6 w-6" style={{ color }} />
                          <h3 className="font-semibold text-sm">
                            {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
                          </h3>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="text-xl font-bold" style={{ color }}>
                            {formatCurrency(amount)}
                          </div>
                          
                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <span>{percentage.toFixed(1)}% του συνόλου</span>
                            <span>{formatCurrency(amount / apartmentsCount || 0)}/διαμ.</span>
                          </div>
                          
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full" 
                              style={{ 
                                width: `${Math.min(100, percentage)}%`, 
                                backgroundColor: color 
                              }}
                            ></div>
                          </div>
                        </div>
                        
                        {onViewDetails && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full mt-3"
                            onClick={() => onViewDetails(category)}
                            title="Λεπτομέρειες"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </TabsContent>

          {/* Apartments Tab */}
          <TabsContent value="apartments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Σύγκριση Δαπανών ανά Διαμέρισμα</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={apartmentData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="apartment" />
                    <YAxis tickFormatter={(value) => `${value}€`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="general" stackId="a" fill={EXPENSE_COLORS.general_expenses} name="Γενικές" />
                    <Bar dataKey="elevator" stackId="a" fill={EXPENSE_COLORS.elevator_expenses} name="Ανελκυστήρας" />
                    <Bar dataKey="heating" stackId="a" fill={EXPENSE_COLORS.heating_expenses} name="Θέρμανση" />
                    <Bar dataKey="equal_share" stackId="a" fill={EXPENSE_COLORS.equal_share_expenses} name="Ισόποσες" />
                    <Bar dataKey="individual" stackId="a" fill={EXPENSE_COLORS.individual_expenses} name="Ατομικές" />
                    <Bar dataKey="reserve" stackId="a" fill={EXPENSE_COLORS.reserve_fund_contribution} name="Αποθεματικό" />
                    <Bar dataKey="management" stackId="a" fill={EXPENSE_COLORS.management_fee} name="Διαχείριση" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            {/* Apartment Details Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Αναλυτικός Πίνακας Δαπανών</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Διαμέρισμα</th>
                        <th className="text-right p-2">Γενικές</th>
                        <th className="text-right p-2">Ανελκυστήρας</th>
                        <th className="text-right p-2">Θέρμανση</th>
                        <th className="text-right p-2">Ισόποσες</th>
                        <th className="text-right p-2">Ατομικές</th>
                        <th className="text-right p-2">Αποθεματικό</th>
                        <th className="text-right p-2">Διαχείριση</th>
                        <th className="text-right p-2 font-bold">Σύνολο</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apartmentData.map((apt, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="p-2 font-medium">{apt.apartment}</td>
                          <td className="p-2 text-right">{formatCurrency(apt.general)}</td>
                          <td className="p-2 text-right">{formatCurrency(apt.elevator)}</td>
                          <td className="p-2 text-right">{formatCurrency(apt.heating)}</td>
                          <td className="p-2 text-right">{formatCurrency(apt.equal_share)}</td>
                          <td className="p-2 text-right">{formatCurrency(apt.individual)}</td>
                          <td className="p-2 text-right">{formatCurrency(apt.reserve)}</td>
                          <td className="p-2 text-right">{formatCurrency(apt.management)}</td>
                          <td className="p-2 text-right font-bold">{formatCurrency(apt.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 font-bold">
                        <td className="p-2">ΣΥΝΟΛΑ</td>
                        <td className="p-2 text-right">{formatCurrency(categoryTotals.general_expenses || 0)}</td>
                        <td className="p-2 text-right">{formatCurrency(categoryTotals.elevator_expenses || 0)}</td>
                        <td className="p-2 text-right">{formatCurrency(categoryTotals.heating_expenses || 0)}</td>
                        <td className="p-2 text-right">{formatCurrency(categoryTotals.equal_share_expenses || 0)}</td>
                        <td className="p-2 text-right">{formatCurrency(categoryTotals.individual_expenses || 0)}</td>
                        <td className="p-2 text-right">{formatCurrency(categoryTotals.reserve_fund_contribution || 0)}</td>
                        <td className="p-2 text-right">{formatCurrency(categoryTotals.management_fee || 0)}</td>
                        <td className="p-2 text-right text-lg">{formatCurrency(totalExpenses)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface CashFlowData {
  date: string;
  inflow: number;
  outflow: number;
  net_flow: number;
}

interface CashFlowChartProps {
  buildingId: string;
}

export default function CashFlowChart({ buildingId }: CashFlowChartProps) {
  const [cashFlowData, setCashFlowData] = useState<CashFlowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [period, setPeriod] = useState('30');

  // Φόρτωση δεδομένων ταμειακής ροής
  const loadCashFlowData = async (days: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/financial/reports/cash_flow/?building_id=${buildingId}&days=${days}`);
      if (response.ok) {
        const data = await response.json();
        setCashFlowData(data);
      }
    } catch (error) {
      console.error('Σφάλμα φόρτωσης δεδομένων ταμειακής ροής:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCashFlowData(period);
  }, [buildingId, period]);

  // Προετοιμασία δεδομένων για το γράφημα
  const chartData = {
    labels: cashFlowData.map(item => new Date(item.date).toLocaleDateString('el-GR')),
    datasets: [
      {
        label: 'Εισροές (Πληρωμές)',
        data: cashFlowData.map(item => item.inflow),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Εκροές (Δαπάνες)',
        data: cashFlowData.map(item => item.outflow),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Καθαρή Ροή',
        data: cashFlowData.map(item => item.net_flow),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: false,
        tension: 0.4,
        borderDash: [5, 5],
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Ταμειακή Ροή',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return '€' + value.toLocaleString('el-GR');
          },
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  // Υπολογισμός στατιστικών
  const totalInflow = cashFlowData.reduce((sum, item) => sum + item.inflow, 0);
  const totalOutflow = cashFlowData.reduce((sum, item) => sum + item.outflow, 0);
  const netFlow = totalInflow - totalOutflow;
  const averageInflow = cashFlowData.length > 0 ? totalInflow / cashFlowData.length : 0;
  const averageOutflow = cashFlowData.length > 0 ? totalOutflow / cashFlowData.length : 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Ταμειακή Ροή
          </CardTitle>
          <div className="flex gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 ημέρες</SelectItem>
                <SelectItem value="30">30 ημέρες</SelectItem>
                <SelectItem value="90">90 ημέρες</SelectItem>
                <SelectItem value="365">1 έτος</SelectItem>
              </SelectContent>
            </Select>
            <Select value={chartType} onValueChange={(value: 'line' | 'bar') => setChartType(value)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">Γραμμή</SelectItem>
                <SelectItem value="bar">Ράβδος</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : cashFlowData.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Δεν υπάρχουν δεδομένα ταμειακής ροής
          </div>
        ) : (
          <>
            {/* Στατιστικές κάρτες */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-green-50 p-4 rounded-lg border">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Συνολικές Εισροές</span>
                </div>
                <div className="text-2xl font-bold text-green-900 mt-1">
                  €{totalInflow.toLocaleString('el-GR', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-sm text-green-600">
                  Μέσος όρος: €{averageInflow.toLocaleString('el-GR', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="bg-red-50 p-4 rounded-lg border">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-medium text-red-800">Συνολικές Εκροές</span>
                </div>
                <div className="text-2xl font-bold text-red-900 mt-1">
                  €{totalOutflow.toLocaleString('el-GR', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-sm text-red-600">
                  Μέσος όρος: €{averageOutflow.toLocaleString('el-GR', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className={`p-4 rounded-lg border ${
                netFlow >= 0 ? 'bg-blue-50' : 'bg-orange-50'
              }`}>
                <div className="flex items-center gap-2">
                  <DollarSign className={`h-5 w-5 ${
                    netFlow >= 0 ? 'text-blue-600' : 'text-orange-600'
                  }`} />
                  <span className={`text-sm font-medium ${
                    netFlow >= 0 ? 'text-blue-800' : 'text-orange-800'
                  }`}>
                    Καθαρή Ροή
                  </span>
                </div>
                <div className={`text-2xl font-bold mt-1 ${
                  netFlow >= 0 ? 'text-blue-900' : 'text-orange-900'
                }`}>
                  €{netFlow.toLocaleString('el-GR', { minimumFractionDigits: 2 })}
                </div>
                <div className={`text-sm ${
                  netFlow >= 0 ? 'text-blue-600' : 'text-orange-600'
                }`}>
                  {netFlow >= 0 ? 'Θετική' : 'Αρνητική'} ροή
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-800">Περίοδος</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 mt-1">
                  {cashFlowData.length}
                </div>
                <div className="text-sm text-gray-600">
                  ημέρες δεδομένων
                </div>
              </div>
            </div>

            {/* Γράφημα */}
            <div className="h-80">
              {chartType === 'line' ? (
                <Line data={chartData} options={chartOptions} />
              ) : (
                <Bar data={chartData} options={chartOptions} />
              )}
            </div>

            {/* Πίνακας δεδομένων */}
            <div className="mt-6">
              <h4 className="font-medium mb-3">Λεπτομέρειες ανά ημέρα</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Ημερομηνία</th>
                      <th className="text-right py-2">Εισροές</th>
                      <th className="text-right py-2">Εκροές</th>
                      <th className="text-right py-2">Καθαρή Ροή</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashFlowData.slice(-10).reverse().map((item, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="py-2">
                          {new Date(item.date).toLocaleDateString('el-GR')}
                        </td>
                        <td className="text-right py-2 text-green-600">
                          €{item.inflow.toLocaleString('el-GR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="text-right py-2 text-red-600">
                          €{item.outflow.toLocaleString('el-GR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className={`text-right py-2 font-medium ${
                          item.net_flow >= 0 ? 'text-blue-600' : 'text-orange-600'
                        }`}>
                          €{item.net_flow.toLocaleString('el-GR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
} 
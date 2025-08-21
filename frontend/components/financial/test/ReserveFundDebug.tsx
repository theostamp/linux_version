'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';

/**
 * Debug component για το Reserve Fund isolation
 * Ελέγχει αν το API επιστρέφει σωστά month-specific reserve fund values
 */
const ReserveFundDebug: React.FC<{ buildingId: number }> = ({ buildingId }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [apiResults, setApiResults] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateTestMonths = () => {
    const months = [];
    const currentDate = new Date();
    
    for (let i = -6; i <= 3; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      const monthStr = date.toISOString().substring(0, 7);
      const displayName = date.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });
      months.push({ value: monthStr, label: displayName });
    }
    
    return months;
  };

  const testMonths = generateTestMonths();

  const fetchSummaryForMonth = async (month?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        building_id: buildingId.toString(),
        ...(month && { month })
      });
      
      console.log(`🔍 ReserveFundDebug: Fetching summary for month ${month || 'current'}`);
      console.log(`📡 API URL: /financial/dashboard/summary/?${params}`);
      
      const response = await api.get(`/financial/dashboard/summary/?${params}`);
      
      console.log(`📊 ReserveFundDebug: Response for ${month || 'current'}:`, response.data);
      
      setApiResults(prev => ({
        ...prev,
        [month || 'current']: {
          current_reserve: response.data.current_reserve,
          total_balance: response.data.total_balance,
          reserve_fund_contribution: response.data.reserve_fund_contribution,
          reserve_fund_goal: response.data.reserve_fund_goal,
          reserve_fund_monthly_target: response.data.reserve_fund_monthly_target,
          has_monthly_activity: response.data.has_monthly_activity,
          timestamp: new Date().toISOString()
        }
      }));
      
    } catch (err: any) {
      console.error(`❌ ReserveFundDebug: Error fetching ${month || 'current'}:`, err);
      setError(`Error fetching ${month || 'current'}: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testAllMonths = async () => {
    setApiResults({});
    
    // Test current month first
    await fetchSummaryForMonth();
    
    // Then test specific months
    for (const month of ['2025-05', '2025-06', '2025-07', '2025-08']) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay
      await fetchSummaryForMonth(month);
    }
  };

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔍 Reserve Fund Debug Tool
          <span className="text-sm font-normal text-gray-500">
            (Building ID: {buildingId})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">
              Επιλογή Μήνα:
            </label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger>
                <SelectValue placeholder="Επιλέξτε μήνα" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Τρέχων μήνας</SelectItem>
                {testMonths.map(month => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex flex-col gap-2">
            <Button 
              onClick={() => fetchSummaryForMonth(selectedMonth || undefined)}
              disabled={isLoading}
              size="sm"
            >
              {isLoading ? 'Loading...' : 'Test Selected Month'}
            </Button>
            
            <Button 
              onClick={testAllMonths}
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              Test All Months
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <p className="text-red-600 text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {Object.keys(apiResults).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">API Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 p-2 text-left">Month</th>
                      <th className="border border-gray-300 p-2 text-center">Activity</th>
                      <th className="border border-gray-300 p-2 text-right">Current Reserve</th>
                      <th className="border border-gray-300 p-2 text-right">Total Balance</th>
                      <th className="border border-gray-300 p-2 text-right">Reserve Contribution</th>
                      <th className="border border-gray-300 p-2 text-center">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(apiResults)
                      .sort(([a], [b]) => {
                        if (a === 'current') return 1;
                        if (b === 'current') return -1;
                        return a.localeCompare(b);
                      })
                      .map(([month, data]: [string, any]) => {
                        const monthDisplay = month === 'current' 
                          ? 'Current' 
                          : new Date(month + '-01').toLocaleDateString('el-GR', { 
                              month: 'long', 
                              year: 'numeric' 
                            });
                        
                        return (
                          <tr key={month} className={month === 'current' ? 'bg-blue-50' : ''}>
                            <td className="border border-gray-300 p-2 font-medium">
                              {monthDisplay}
                            </td>
                            <td className="border border-gray-300 p-2 text-center">
                              {data.has_monthly_activity === true ? (
                                <span className="text-green-600 font-bold">✓</span>
                              ) : data.has_monthly_activity === false ? (
                                <span className="text-gray-400">—</span>
                              ) : (
                                <span className="text-blue-600">?</span>
                              )}
                            </td>
                            <td className={`border border-gray-300 p-2 text-right font-mono ${
                              data.has_monthly_activity === false 
                                ? 'text-gray-400' 
                                : data.current_reserve < 0 
                                ? 'text-red-600' 
                                : 'text-green-600'
                            }`}>
                              {data.has_monthly_activity === false ? '—' : `${Number(data.current_reserve).toFixed(2)}€`}
                            </td>
                            <td className={`border border-gray-300 p-2 text-right font-mono ${
                              data.total_balance < 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {Number(data.total_balance).toFixed(2)}€
                            </td>
                            <td className="border border-gray-300 p-2 text-right font-mono">
                              {Number(data.reserve_fund_contribution).toFixed(2)}€
                            </td>
                            <td className="border border-gray-300 p-2 text-center text-xs">
                              {new Date(data.timestamp).toLocaleTimeString('el-GR')}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Analysis */}
        {Object.keys(apiResults).length > 1 && (
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg text-blue-700">📊 Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {(() => {
                  const reserves = Object.values(apiResults).map((data: any) => data.current_reserve);
                  const uniqueReserves = [...new Set(reserves)];
                  
                  if (uniqueReserves.length === 1) {
                    return (
                      <div className="text-orange-700">
                        ⚠️ <strong>PROBLEM DETECTED:</strong> All months return the same reserve value ({uniqueReserves[0]}€)
                        <br />
                        This indicates the month filtering is not working correctly.
                      </div>
                    );
                  } else {
                    return (
                      <div className="text-green-700">
                        ✅ <strong>WORKING CORRECTLY:</strong> Reserve values differ across months
                        <br />
                        Found {uniqueReserves.length} different values: {uniqueReserves.map(v => `${v}€`).join(', ')}
                      </div>
                    );
                  }
                })()}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="bg-gray-50 border-gray-200">
          <CardHeader>
            <CardTitle className="text-sm text-gray-700">📋 Instructions</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">
            <ol className="list-decimal list-inside space-y-1">
              <li>Use "Test All Months" to quickly check all historical data</li>
              <li>Compare Current Reserve values across different months</li>
              <li>If all values are the same, there's a month filtering issue</li>
              <li>If values differ, the backend is working correctly</li>
              <li>Check browser console for detailed API logs</li>
            </ol>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};

export default ReserveFundDebug;

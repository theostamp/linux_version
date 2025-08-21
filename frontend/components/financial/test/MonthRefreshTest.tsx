'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApartmentsWithFinancialData } from '@/hooks/useApartmentsWithFinancialData';
import { useMonthRefresh } from '@/hooks/useMonthRefresh';

/**
 * Test component για το automatic refresh functionality
 * Χρησιμοποιείται για debugging και επιβεβαίωση ότι τα δεδομένα ενημερώνονται σωστά
 */
const MonthRefreshTest: React.FC<{ buildingId: number }> = ({ buildingId }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [refreshCount, setRefreshCount] = useState(0);
  
  const { apartments, isLoading, error, forceRefresh } = useApartmentsWithFinancialData(
    buildingId, 
    selectedMonth || undefined
  );

  // Auto-refresh when month changes
  useMonthRefresh(selectedMonth || undefined, () => {
    setRefreshCount(prev => prev + 1);
    forceRefresh();
  }, 'MonthRefreshTest');

  const generateTestMonths = () => {
    const months = [];
    const currentDate = new Date();
    
    for (let i = -6; i <= 6; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      const monthStr = date.toISOString().substring(0, 7);
      const displayName = date.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });
      months.push({ value: monthStr, label: displayName });
    }
    
    return months;
  };

  const testMonths = generateTestMonths();

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🧪 Month Refresh Test Component
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
          
          <div className="flex flex-col items-center gap-2">
            <Button 
              onClick={() => {
                setRefreshCount(prev => prev + 1);
                forceRefresh();
              }}
              variant="outline"
              size="sm"
            >
              Manual Refresh
            </Button>
            <span className="text-xs text-gray-500">
              Refreshes: {refreshCount}
            </span>
          </div>
        </div>

        {/* Status Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Selected Month</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-mono">
                {selectedMonth || 'current'}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Loading Status</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-lg ${isLoading ? 'text-orange-600' : 'text-green-600'}`}>
                {isLoading ? '🔄 Loading...' : '✅ Ready'}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Apartments Loaded</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-mono">
                {error ? '❌ Error' : apartments.length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-red-700">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Apartments Data */}
        {apartments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Apartment Balances 
                <span className="ml-2 text-xs font-normal text-gray-500">
                  (for {selectedMonth || 'current month'})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {apartments.map((apt) => (
                  <div 
                    key={apt.id} 
                    className="flex justify-between items-center p-2 border rounded-lg"
                  >
                    <div>
                      <span className="font-medium">Διαμ. {apt.number}</span>
                      <span className="ml-2 text-sm text-gray-500">
                        {apt.owner_name || 'Unknown'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`font-mono ${
                        apt.current_balance < 0 ? 'text-red-600' : 
                        apt.current_balance > 0 ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {apt.current_balance.toFixed(2)}€
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-700">📋 Test Instructions</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-600">
            <ol className="list-decimal list-inside space-y-1">
              <li>Αλλάξτε τον επιλεγμένο μήνα χρησιμοποιώντας το dropdown</li>
              <li>Παρατηρήστε ότι τα δεδομένα ενημερώνονται αυτόματα</li>
              <li>Ελέγξτε το console για debug logs</li>
              <li>Δοκιμάστε διαφορετικούς μήνες (π.χ. Ιούνιος 2025 vs Αύγουστος 2025)</li>
              <li>Επιβεβαιώστε ότι τα υπόλοιπα αλλάζουν σωστά</li>
            </ol>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};

export default MonthRefreshTest;

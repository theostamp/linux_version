'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Play, Pause, Settings } from 'lucide-react';
import useFinancialAutoRefresh from '@/hooks/useFinancialAutoRefresh';

/**
 * Test component για το automatic refresh functionality
 * Χρησιμοποιείται για debugging και επιβεβαίωση ότι το auto-refresh λειτουργεί σωστά
 */
const AutoRefreshTest: React.FC<{ buildingId: number }> = ({ buildingId }) => {
  const [refreshCount, setRefreshCount] = useState(0);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [isEnabled, setIsEnabled] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(10000); // 10 seconds
  const [testMode, setTestMode] = useState<'auto' | 'manual'>('auto');

  // Mock refresh functions for testing
  const mockLoadSummary = () => {
    console.log('🔄 AutoRefreshTest: Mock loadSummary called');
    setRefreshCount(prev => prev + 1);
    setLastRefreshTime(new Date());
    return Promise.resolve();
  };

  const mockLoadExpenses = () => {
    console.log('🔄 AutoRefreshTest: Mock loadExpenses called');
    return Promise.resolve();
  };

  const mockLoadPayments = () => {
    console.log('🔄 AutoRefreshTest: Mock loadPayments called');
    return Promise.resolve();
  };

  // Use the auto-refresh hook
  const { manualRefresh, isRefreshing, lastRefresh } = useFinancialAutoRefresh(
    {
      loadSummary: mockLoadSummary,
      loadExpenses: mockLoadExpenses,
      loadPayments: mockLoadPayments,
    },
    {
      buildingId,
    },
    {
      enableAutoRefresh: isEnabled,
      refreshInterval,
      componentName: 'AutoRefreshTest'
    }
  );

  const handleManualRefresh = async () => {
    console.log('🔄 AutoRefreshTest: Manual refresh triggered');
    await manualRefresh();
  };

  const toggleAutoRefresh = () => {
    setIsEnabled(!isEnabled);
    console.log(`🔄 AutoRefreshTest: Auto refresh ${!isEnabled ? 'enabled' : 'disabled'}`);
  };

  const changeInterval = (newInterval: number) => {
    setRefreshInterval(newInterval);
    console.log(`🔄 AutoRefreshTest: Refresh interval changed to ${newInterval}ms`);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Auto Refresh Test
          <Badge variant={isEnabled ? 'default' : 'secondary'}>
            {isEnabled ? 'Ενεργό' : 'Ανενεργό'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">Στατιστικά</h3>
            <div className="space-y-1 text-sm">
              <div>Αριθμός ενημερώσεων: <span className="font-bold">{refreshCount}</span></div>
              <div>Τελευταία ενημέρωση: <span className="font-bold">
                {lastRefreshTime ? lastRefreshTime.toLocaleTimeString('el-GR') : 'Δεν έχει γίνει'}
              </span></div>
              <div>Κατάσταση: <span className={`font-bold ${isRefreshing ? 'text-orange-600' : 'text-green-600'}`}>
                {isRefreshing ? 'Ενημερώνεται...' : 'Έτοιμο'}
              </span></div>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">Ρυθμίσεις</h3>
            <div className="space-y-1 text-sm">
              <div>Auto Refresh: <span className="font-bold">{isEnabled ? 'Ενεργό' : 'Ανενεργό'}</span></div>
              <div>Διάστημα: <span className="font-bold">{refreshInterval / 1000} δευτερόλεπτα</span></div>
              <div>Λειτουργία: <span className="font-bold">{testMode === 'auto' ? 'Αυτόματη' : 'Χειροκίνητη'}</span></div>
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-800 mb-2">Δοκιμές</h3>
            <div className="space-y-1 text-sm">
              <div>Building ID: <span className="font-bold">{buildingId}</span></div>
              <div>Hook Status: <span className="font-bold text-green-600">Ενεργό</span></div>
              <div>Last Hook Refresh: <span className="font-bold">
                {lastRefresh ? new Date(lastRefresh).toLocaleTimeString('el-GR') : 'N/A'}
              </span></div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-4">
          <Button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Χειροκίνητη Ενημέρωση
          </Button>

          <Button
            onClick={toggleAutoRefresh}
            variant={isEnabled ? 'destructive' : 'default'}
            className="flex items-center gap-2"
          >
            {isEnabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isEnabled ? 'Διακοπή' : 'Ενεργοποίηση'} Auto Refresh
          </Button>

          <Button
            onClick={() => setTestMode(testMode === 'auto' ? 'manual' : 'auto')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Εναλλαγή Λειτουργίας
          </Button>
        </div>

        {/* Interval Controls */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-3">Ρύθμιση Διαστήματος</h3>
          <div className="flex flex-wrap gap-2">
            {[5, 10, 15, 30, 60].map((seconds) => (
              <Button
                key={seconds}
                onClick={() => changeInterval(seconds * 1000)}
                variant={refreshInterval === seconds * 1000 ? 'default' : 'outline'}
                size="sm"
              >
                {seconds}s
              </Button>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <h3 className="font-semibold text-yellow-800 mb-2">Οδηγίες Δοκιμής</h3>
          <div className="text-sm text-yellow-700 space-y-1">
            <p>1. <strong>Αυτόματη ενημέρωση:</strong> Το σύστημα θα ενημερώνει τα δεδομένα κάθε {refreshInterval / 1000} δευτερόλεπτα</p>
            <p>2. <strong>Χειροκίνητη ενημέρωση:</strong> Πατήστε το κουμπί για άμεση ενημέρωση</p>
            <p>3. <strong>Παρακολούθηση:</strong> Δείτε τα console logs για λεπτομέρειες</p>
            <p>4. <strong>Notifications:</strong> Θα εμφανιστούν διακριτικά notifications για κάθε ενημέρωση</p>
          </div>
        </div>

        {/* Console Log Preview */}
        <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm">
          <div className="mb-2 text-white">Console Logs Preview:</div>
          <div className="space-y-1">
            <div>🔄 AutoRefreshTest: Starting automatic refresh interval (10000ms)</div>
            <div>🔄 AutoRefreshTest: Executing automatic refresh...</div>
            <div>🔄 AutoRefreshTest: Mock loadSummary called</div>
            <div>✅ AutoRefreshTest: Automatic refresh completed successfully</div>
            <div>🔄 AutoRefreshTest: Manual refresh triggered</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AutoRefreshTest;

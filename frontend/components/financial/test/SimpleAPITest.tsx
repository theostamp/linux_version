'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

/**
 * Simple test component to verify API integration
 */
const SimpleAPITest: React.FC<{ buildingId: number }> = ({ buildingId }) => {
  const [testResults, setTestResults] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testAPI = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Test March 2025 (should have no activity)
      console.log('🔍 Testing March 2025...');
      const marchResponse = await api.get(`/financial/dashboard/summary/?building_id=${buildingId}&month=2025-03`);
      const marchData = marchResponse.data;
      
      console.log('📅 March 2025 API Response:', marchData);
      
      // Test August 2025 (should have activity)
      console.log('🔍 Testing August 2025...');
      const augustResponse = await api.get(`/financial/dashboard/summary/?building_id=${buildingId}&month=2025-08`);
      const augustData = augustResponse.data;
      
      console.log('📅 August 2025 API Response:', augustData);
      
      // Test current month
      console.log('🔍 Testing Current Month...');
      const currentResponse = await api.get(`/financial/dashboard/summary/?building_id=${buildingId}`);
      const currentData = currentResponse.data;
      
      console.log('📅 Current Month API Response:', currentData);
      
      setTestResults({
        march: marchData,
        august: augustData,
        current: currentData
      });
      
    } catch (err: any) {
      console.error('❌ Error testing API:', err);
      setError(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔍 Simple API Test
          <span className="text-sm font-normal text-gray-500">
            (Building ID: {buildingId})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="flex gap-4 items-center">
          <Button 
            onClick={testAPI}
            disabled={isLoading}
            size="sm"
          >
            {isLoading ? 'Testing...' : 'Test API Integration'}
          </Button>
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
        {Object.keys(testResults).length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Test Results:</h3>
            
            {Object.entries(testResults).map(([month, data]: [string, any]) => (
              <Card key={month} className="border-gray-200">
                <CardHeader>
                  <CardTitle className="text-md">
                    {month === 'current' ? 'Current Month' : 
                     month === 'march' ? 'March 2025' : 'August 2025'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>has_monthly_activity:</strong> 
                      <span className={`ml-2 ${data.has_monthly_activity === true ? 'text-green-600' : 
                                        data.has_monthly_activity === false ? 'text-red-600' : 'text-gray-600'}`}>
                        {String(data.has_monthly_activity)}
                      </span>
                    </div>
                    <div>
                      <strong>reserve_fund_contribution:</strong> 
                      <span className="ml-2">{data.reserve_fund_contribution}€</span>
                    </div>
                    <div>
                      <strong>current_reserve:</strong> 
                      <span className="ml-2">{data.current_reserve}€</span>
                    </div>
                    <div>
                      <strong>total_balance:</strong> 
                      <span className="ml-2">{data.total_balance}€</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SimpleAPITest;

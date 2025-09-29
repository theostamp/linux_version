'use client';

import { useState } from 'react';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock, 
  BarChart3,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TestRunner, TestSuite, TestResult } from '@/lib/testing-utils';

interface TestingDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TestingDashboard({ isOpen, onClose }: TestingDashboardProps) {
  const [testResults, setTestResults] = useState<TestSuite[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedSuite, setSelectedSuite] = useState<string | null>(null);

  const runTests = async () => {
    setIsRunning(true);
    try {
      const runner = new TestRunner();
      const results = await runner.runTests();
      setTestResults(results);
    } catch (error) {
      console.error('Failed to run tests:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    );
  };

  const getStatusColor = (passed: boolean) => {
    return passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  };

  const getOverallStatus = () => {
    if (testResults.length === 0) return null;
    
    const totalTests = testResults.reduce((sum, suite) => sum + suite.tests.length, 0);
    const passedTests = testResults.reduce((sum, suite) => sum + suite.passedTests, 0);
    
    if (passedTests === totalTests) return 'all-passed';
    if (passedTests > totalTests / 2) return 'mostly-passed';
    return 'failed';
  };

  const overallStatus = getOverallStatus();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden bg-white dark:bg-gray-800">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-6 h-6" />
            <span>Testing Dashboard</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              onClick={runTests}
              disabled={isRunning}
              size="sm"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run Tests
                </>
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <XCircle className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-y-auto">
          {testResults.length === 0 ? (
            <div className="p-8 text-center">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No Test Results</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Click "Run Tests" to execute the test suite and view results.
              </p>
              <Button onClick={runTests} disabled={isRunning}>
                <Play className="w-4 h-4 mr-2" />
                Run Tests
              </Button>
            </div>
          ) : (
            <div className="space-y-6 p-6">
              {/* Overall Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className={`border-l-4 ${
                  overallStatus === 'all-passed' ? 'border-l-green-500 bg-green-50 dark:bg-green-900/20' :
                  overallStatus === 'mostly-passed' ? 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' :
                  'border-l-red-500 bg-red-50 dark:bg-red-900/20'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      {overallStatus === 'all-passed' ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : overallStatus === 'mostly-passed' ? (
                        <AlertTriangle className="w-5 h-5 text-yellow-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <span className="font-semibold">Overall Status</span>
                    </div>
                    <p className="text-sm mt-1">
                      {overallStatus === 'all-passed' ? 'All tests passed' :
                       overallStatus === 'mostly-passed' ? 'Most tests passed' :
                       'Some tests failed'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="font-semibold">Passed</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">
                      {testResults.reduce((sum, suite) => sum + suite.passedTests, 0)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <XCircle className="w-5 h-5 text-red-500" />
                      <span className="font-semibold">Failed</span>
                    </div>
                    <p className="text-2xl font-bold text-red-600">
                      {testResults.reduce((sum, suite) => sum + suite.failedTests, 0)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Test Suites */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Test Suites</h3>
                
                {testResults.map((suite, index) => (
                  <Card key={index} className="overflow-hidden">
                    <CardHeader 
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                      onClick={() => setSelectedSuite(
                        selectedSuite === suite.name ? null : suite.name
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center space-x-2">
                          {getStatusIcon(suite.passedTests === suite.tests.length)}
                          <span>{suite.name}</span>
                        </CardTitle>
                        <div className="flex items-center space-x-4 text-sm">
                          <span className={getStatusColor(suite.passedTests === suite.tests.length)}>
                            {suite.passedTests}/{suite.tests.length} passed
                          </span>
                          <span className="text-gray-500">
                            <Clock className="w-4 h-4 inline mr-1" />
                            {suite.totalDuration}ms
                          </span>
                        </div>
                      </div>
                    </CardHeader>

                    {selectedSuite === suite.name && (
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          {suite.tests.map((test, testIndex) => (
                            <div 
                              key={testIndex}
                              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                            >
                              <div className="flex items-center space-x-3">
                                {getStatusIcon(test.passed)}
                                <div>
                                  <p className="font-medium">{test.testName}</p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {test.message}
                                  </p>
                                </div>
                              </div>
                              <div className="text-sm text-gray-500">
                                {test.duration}ms
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>

              {/* Recommendations */}
              {testResults.some(suite => suite.failedTests > 0) && (
                <Card className="border-l-4 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-yellow-800 dark:text-yellow-200">
                      <AlertTriangle className="w-5 h-5" />
                      <span>Recommendations</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-yellow-700 dark:text-yellow-300">
                      <li>• Review failed tests and address the underlying issues</li>
                      <li>• Consider adding more comprehensive error handling</li>
                      <li>• Verify that all accessibility requirements are met</li>
                      <li>• Check performance metrics and optimize if needed</li>
                      <li>• Run tests regularly during development</li>
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

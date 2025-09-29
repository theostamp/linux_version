'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  TestTube2,
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  RefreshCw,
  Building,
  Euro,
  Scale,
  PieChart,
  Shield,
  Clock,
  Activity,
  Terminal,
  FileCheck,
  Zap,
  PlayCircle,
  StopCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface TestResult {
  test_name: string;
  status: 'passed' | 'failed' | 'warning' | 'running' | 'pending';
  duration?: number;
  message?: string;
  details?: string;
  error?: string;
}

interface TestSuiteResult {
  suite_name: string;
  status: 'passed' | 'failed' | 'warning' | 'running' | 'pending';
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  duration?: number;
  tests: TestResult[];
}

interface FinancialTestsResult {
  timestamp: string;
  status: 'completed' | 'running' | 'failed' | 'pending';
  total_duration?: number;
  overall_status: 'passed' | 'failed' | 'warning';
  summary: {
    total_suites: number;
    total_tests: number;
    passed_tests: number;
    failed_tests: number;
    success_rate: number;
  };
  suites: TestSuiteResult[];
  logs?: string[];
}

const FinancialTests: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [currentTest, setCurrentTest] = useState<string>('');

  const {
    data: testResults,
    isLoading,
    error,
    refetch
  } = useQuery<{ status: string; data: FinancialTestsResult; message: string }>({
    queryKey: ['financial-tests'],
    queryFn: async () => {
      const response = await api.get('/financial/tests/status/');
      return response.data;
    },
    enabled: false, // Don't run automatically
    refetchInterval: isRunning ? 2000 : false, // Poll every 2 seconds when running
  });

  const runTestsMutation = useMutation({
    mutationFn: async (testType: 'backend' | 'integration' | 'all') => {
      const response = await api.post('/financial/tests/run/', { 
        test_type: testType,
        detailed: true 
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Τα τεστ ξεκίνησαν επιτυχώς');
      setIsRunning(true);
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Σφάλμα εκκίνησης τεστ: ${error.message}`);
    }
  });

  const stopTestsMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/financial/tests/stop/');
      return response.data;
    },
    onSuccess: () => {
      toast.info('Τα τεστ διακόπηκαν');
      setIsRunning(false);
    }
  });

  // Update progress based on test results
  useEffect(() => {
    if (testResults?.data) {
      const data = testResults.data;
      if (data.status === 'completed') {
        setIsRunning(false);
        setCurrentProgress(100);
        setCurrentTest('Ολοκληρώθηκε');
      } else if (data.status === 'running') {
        // Calculate progress based on completed tests
        const totalTests = data.summary.total_tests;
        const completedTests = data.summary.passed_tests + data.summary.failed_tests;
        const progress = totalTests > 0 ? (completedTests / totalTests) * 100 : 0;
        setCurrentProgress(progress);
        
        // Find current running test
        const runningTest = data.suites
          .flatMap(suite => suite.tests)
          .find(test => test.status === 'running');
        setCurrentTest(runningTest ? runningTest.test_name : 'Εκτέλεση τεστ...');
      }
    }
  }, [testResults]);

  const runTests = async (testType: 'backend' | 'integration' | 'all') => {
    setCurrentProgress(0);
    setCurrentTest('Προετοιμασία...');
    runTestsMutation.mutate(testType);
  };

  const stopTests = async () => {
    stopTestsMutation.mutate();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'running':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'passed':
        return 'Επιτυχία';
      case 'failed':
        return 'Αποτυχία';
      case 'warning':
        return 'Προειδοποίηση';
      case 'running':
        return 'Εκτέλεση...';
      default:
        return 'Αναμονή';
    }
  };

  const renderTestSuite = (suite: TestSuiteResult) => {
    const successRate = suite.total_tests > 0 ? (suite.passed_tests / suite.total_tests) * 100 : 0;
    
    return (
      <Card key={suite.suite_name} className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            {getSuiteIcon(suite.suite_name)}
            {getSuiteName(suite.suite_name)}
            <Badge className={`ml-auto text-xs ${getStatusColor(suite.status)}`}>
              {suite.passed_tests}/{suite.total_tests}
            </Badge>
          </CardTitle>
          {suite.duration && (
            <p className="text-sm text-muted-foreground">
              Διάρκεια: {(suite.duration / 1000).toFixed(2)}s
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Progress bar for this suite */}
          {suite.status === 'running' && (
            <Progress value={successRate} className="h-2" />
          )}
          
          {/* Individual test results */}
          <div className="space-y-2">
            {suite.tests.map((test, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  {getStatusIcon(test.status)}
                  <span className="text-sm font-medium">{getTestDisplayName(test.test_name)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {test.duration && (
                    <span className="text-xs text-muted-foreground">
                      {(test.duration / 1000).toFixed(2)}s
                    </span>
                  )}
                  <Badge variant="outline" className={getStatusColor(test.status)}>
                    {getStatusText(test.status)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          {/* Suite-level issues */}
          {suite.status === 'failed' && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Αποτυχίες στο {getSuiteName(suite.suite_name)}:</strong>
                {suite.tests
                  .filter(test => test.status === 'failed')
                  .map((test, index) => (
                    <div key={index} className="mt-1 text-xs">
                      • {getTestDisplayName(test.test_name)}: {test.error || test.message}
                    </div>
                  ))}
              </AlertDescription>
            </Alert>
          )}

          {suite.status === 'warning' && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Προειδοποιήσεις στο {getSuiteName(suite.suite_name)}:</strong>
                {suite.tests
                  .filter(test => test.status === 'warning')
                  .map((test, index) => (
                    <div key={index} className="mt-1 text-xs">
                      • {getTestDisplayName(test.test_name)}: {test.message}
                    </div>
                  ))}
              </AlertDescription>
            </Alert>
          )}

          {suite.status === 'passed' && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Όλα τα τεστ του {getSuiteName(suite.suite_name)} πέτυχαν επιτυχώς
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  const getSuiteIcon = (suiteName: string) => {
    if (suiteName.includes('calculator')) return <PieChart className="h-5 w-5" />;
    if (suiteName.includes('dashboard')) return <Euro className="h-5 w-5" />;
    if (suiteName.includes('balance')) return <Scale className="h-5 w-5" />;
    if (suiteName.includes('distribution')) return <Building className="h-5 w-5" />;
    return <TestTube2 className="h-5 w-5" />;
  };

  const getSuiteName = (suiteName: string) => {
    const names: { [key: string]: string } = {
      'test_advanced_calculator': '🧮 Προηγμένος Υπολογιστής Κοινοχρήστων',
      'test_dashboard_service': '📊 Υπηρεσία Οικονομικού Dashboard',
      'test_balance_scenarios': '⚖️ Σενάρια Μεταφοράς Υπολοίπου',
      'test_distribution_algorithms': '📈 Αλγόριθμοι Κατανομής Δαπανών'
    };
    
    return names[suiteName] || suiteName.replace(/_/g, ' ').replace(/test /g, '');
  };

  const getTestDisplayName = (testName: string) => {
    // Convert test method names to readable Greek
    return testName
      .replace(/test_/g, '')
      .replace(/_/g, ' ')
      .replace(/calculator/g, 'υπολογιστή')
      .replace(/service/g, 'υπηρεσία')
      .replace(/balance/g, 'υπόλοιπο')
      .replace(/distribution/g, 'κατανομή')
      .replace(/algorithm/g, 'αλγόριθμο')
      .replace(/scenario/g, 'σενάριο');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🧪 Automated Tests Οικονομικού Πυρήνα</h1>
          <p className="text-muted-foreground mt-2">
            Ολοκληρωμένος έλεγχος της business logic με automated unit και integration tests
          </p>
        </div>
        <div className="flex gap-2">
          {!isRunning ? (
            <>
              <Button 
                onClick={() => runTests('backend')} 
                disabled={runTestsMutation.isPending}
                className="flex items-center gap-2"
                variant="outline"
              >
                <TestTube2 className="h-4 w-4" />
                Backend Tests
              </Button>
              <Button 
                onClick={() => runTests('integration')} 
                disabled={runTestsMutation.isPending}
                className="flex items-center gap-2"
                variant="outline"
              >
                <Building className="h-4 w-4" />
                Integration Tests
              </Button>
              <Button 
                onClick={() => runTests('all')} 
                disabled={runTestsMutation.isPending}
                className="flex items-center gap-2"
              >
                <PlayCircle className="h-4 w-4" />
                {runTestsMutation.isPending ? 'Εκκίνηση...' : 'Εκτέλεση Όλων'}
              </Button>
            </>
          ) : (
            <Button 
              onClick={stopTests}
              disabled={stopTestsMutation.isPending}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <StopCircle className="h-4 w-4" />
              Διακοπή
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            Σφάλμα κατά τη σύνδεση με το σύστημα τεστ: {error.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Progress Section */}
      {isRunning && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
                <span className="font-semibold text-blue-800">Εκτέλεση τεστ σε εξέλιξη...</span>
              </div>
              <Progress value={currentProgress} className="h-3" />
              <div className="text-sm text-blue-700">
                Τρέχον τεστ: <span className="font-medium">{currentTest}</span>
              </div>
              <div className="text-xs text-blue-600">
                Πρόοδος: {currentProgress.toFixed(1)}%
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {testResults?.data && (
        <div className="space-y-6">
          {/* Overall Results Summary */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(testResults.data.overall_status)}
                Συνολικά Αποτελέσματα Tests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <Badge className={`${getStatusColor(testResults.data.overall_status)} text-lg px-4 py-2`}>
                    {getStatusText(testResults.data.overall_status)}
                  </Badge>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {testResults.data.summary.total_suites}
                  </div>
                  <div className="text-sm text-muted-foreground">Test Suites</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {testResults.data.summary.total_tests}
                  </div>
                  <div className="text-sm text-muted-foreground">Συνολικά Tests</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {testResults.data.summary.passed_tests}
                  </div>
                  <div className="text-sm text-muted-foreground">Επιτυχίες</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {testResults.data.summary.failed_tests}
                  </div>
                  <div className="text-sm text-muted-foreground">Αποτυχίες</div>
                </div>
              </div>
              
              <div className="mt-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Ποσοστό Επιτυχίας</span>
                      <span>{testResults.data.summary.success_rate.toFixed(1)}%</span>
                    </div>
                    <Progress value={testResults.data.summary.success_rate} className="h-2" />
                  </div>
                </div>
              </div>
              
              {testResults.data.total_duration && (
                <div className="mt-4">
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Συνολική διάρκεια: {(testResults.data.total_duration / 1000).toFixed(2)}s
                  </div>
                </div>
              )}
              
              <div className="mt-4 text-sm text-muted-foreground">
                <Activity className="h-4 w-4 inline mr-1" />
                Τελευταία εκτέλεση: {new Date(testResults.data.timestamp).toLocaleString('el-GR')}
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Test Suites Results */}
          <div>
            <h2 className="text-xl font-semibold mb-4">📊 Λεπτομερή Αποτελέσματα</h2>
            
            {testResults.data.suites.map(suite => renderTestSuite(suite))}
          </div>

          {/* Logs Section */}
          {testResults.data.logs && testResults.data.logs.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Αρχείο Καταγραφής (Logs)</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLogs(!showLogs)}
                  className="flex items-center gap-2"
                >
                  {showLogs ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showLogs ? 'Απόκρυψη' : 'Εμφάνιση'} Logs
                </Button>
              </div>
              
              {showLogs && (
                <Card>
                  <CardContent className="p-4">
                    <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
                      {testResults.data.logs.map((log, index) => (
                        <div key={index} className="mb-1">
                          {log}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Test Coverage Information */}
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3 text-blue-800">🎯 Test Coverage Περιοχές</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span>Financial Calculation Accuracy</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span>Balance Transfer Logic</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span>Expense Distribution Algorithms</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span>Greek Language & Currency</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span>Multi-tenant Isolation</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-3 text-purple-800">🔍 Tested Business Logic</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Shield className="h-3 w-3 text-blue-500" />
                      <span>Common Expense Calculations</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="h-3 w-3 text-blue-500" />
                      <span>Reserve Fund Contributions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="h-3 w-3 text-blue-500" />
                      <span>Participation Mills Distribution</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="h-3 w-3 text-blue-500" />
                      <span>Previous Balance Transfers</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="h-3 w-3 text-blue-500" />
                      <span>Decimal Precision & Rounding</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!testResults && !isLoading && !error && (
        <Card>
          <CardContent className="text-center py-12">
            <TestTube2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Financial Core Automated Tests</h3>
            <p className="text-muted-foreground mb-4">
              Εκτελέστε comprehensive tests για να ελέγξετε την ακεραιότητα του οικονομικού πυρήνα.
            </p>
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                  <div>
                    <strong>Backend Tests:</strong>
                    <ul className="mt-1 space-y-1">
                      <li>• Unit tests για services</li>
                      <li>• Balance transfer tests</li>  
                      <li>• Distribution algorithm tests</li>
                    </ul>
                  </div>
                  <div>
                    <strong>Integration Tests:</strong>
                    <ul className="mt-1 space-y-1">
                      <li>• End-to-end calculations</li>
                      <li>• Database consistency</li>
                      <li>• Multi-tenant isolation</li>
                    </ul>
                  </div>
                  <div>
                    <strong>Edge Cases:</strong>
                    <ul className="mt-1 space-y-1">
                      <li>• Greek characters handling</li>
                      <li>• Decimal precision</li>
                      <li>• Large dataset performance</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="pt-4">
                <Button onClick={() => runTests('all')} className="w-auto">
                  <Zap className="h-4 w-4 mr-2" />
                  Ξεκινήστε τα Tests
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FinancialTests;
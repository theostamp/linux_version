'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  RefreshCw,
  Building,
  Home,
  Euro,
  Scale,
  PiggyBank,
  BarChart3,
  Shield,
  FileText,
  Clock,
  Wrench
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface HealthCheckResult {
  timestamp: string;
  building: any;
  checks: {
    building_data?: {
      building_exists: boolean;
      apartments_count: number;
      apartments_with_mills: number;
      total_mills: number;
      expected_mills: number;
    };
    financial_data?: {
      expenses_count: number;
      transactions_count: number;
      payments_count: number;
      total_expenses: number;
      total_transactions: number;
      total_payments: number;
      months_with_data: number;
    };
    balance_transfer?: {
      apartments_checked: number;
      months_checked: number;
      balance_issues: number;
      transfer_issues: number;
    };
    duplicate_charges?: {
      expense_duplicates: number;
      payment_duplicates: number;
      total_duplicates: number;
    };
    data_integrity?: {
      orphaned_expenses: number;
      orphaned_payments: number;
      invalid_amounts: number;
      missing_titles: number;
    };
  };
  summary: {
    total_checks: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  status: 'healthy' | 'issues_found';
  success_rate: number;
  output: string;
}

const SystemHealthCheck: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);

  const {
    data: healthData,
    isLoading,
    error,
    refetch
  } = useQuery<{ status: string; data: HealthCheckResult; message: string }>({
    queryKey: ['system-health'],
    queryFn: async () => {
      const response = await api.post('/financial/system-health/', {
        detailed: true,
        auto_fix: false
      });
      return response.data;
    },
    enabled: false, // Don't run automatically
  });

  const runHealthCheck = async () => {
    setIsRunning(true);
    try {
      await refetch();
    } finally {
      setIsRunning(false);
    }
  };

  const runAutoFix = async () => {
    setIsRunning(true);
    try {
      // Call auto-fix API
      const response = await api.post('/financial/auto-fix/');
      
      if (response.data.status === 'success') {
        console.log('Auto fix completed:', response.data.message);
        // After auto-fix, refresh health check
        await refetch();
      } else {
        console.error('Auto fix failed:', response.data.message);
      }
    } catch (error) {
      console.error('Error during auto fix:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getHealthStatusIcon = (status: string, successRate: number) => {
    if (status === 'healthy' || successRate === 100) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (successRate >= 80) {
      return <CheckCircle className="h-5 w-5 text-yellow-500" />;
    } else if (successRate >= 60) {
      return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    } else {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getHealthStatusColor = (status: string, successRate: number) => {
    if (status === 'healthy' || successRate === 100) {
      return 'bg-green-100 text-green-800 border-green-200';
    } else if (successRate >= 80) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    } else if (successRate >= 60) {
      return 'bg-orange-100 text-orange-800 border-orange-200';
    } else {
      return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const getHealthStatusText = (status: string, successRate: number) => {
    if (status === 'healthy' || successRate === 100) {
      return 'Άριστη';
    } else if (successRate >= 80) {
      return 'Καλή';
    } else if (successRate >= 60) {
      return 'Μέτρια';
    } else {
      return 'Κακή';
    }
  };

  const renderCheckSection = (
    title: string,
    icon: React.ReactNode,
    data: any,
    key: string
  ) => {
    if (!data) return null;

    // Προσαρμογή για το νέο format
    let issues: string[] = [];
    let warnings: string[] = [];
    let successes = 0;
    let total = 0;

    if (key === 'building_data') {
      if (data.total_mills !== data.expected_mills) {
        issues.push(`Λάθος χιλιοστά: ${data.total_mills} αντί για ${data.expected_mills}`);
      } else {
        successes = 1;
      }
      total = 1;
    } else if (key === 'financial_data') {
      const balance = data.total_payments - data.total_expenses;
      if (Math.abs(balance) > 0.01) {
        issues.push(`Ανισορροπία: ${balance.toFixed(2)}€`);
      } else {
        successes = 1;
      }
      total = 1;
    } else if (key === 'balance_transfer') {
      if (data.transfer_issues > 0) {
        issues.push(`${data.transfer_issues} προβλήματα μεταφοράς υπολοίπων`);
      } else {
        successes = 1;
      }
      total = 1;
    } else if (key === 'duplicate_charges') {
      if (data.total_duplicates > 0) {
        issues.push(`${data.total_duplicates} διπλές χρεώσεις`);
      } else {
        successes = 1;
      }
      total = 1;
    } else if (key === 'data_integrity') {
      const totalIssues = data.orphaned_expenses + data.orphaned_payments + data.invalid_amounts + data.missing_titles;
      if (totalIssues > 0) {
        issues.push(`${totalIssues} προβλήματα ακεραιότητας`);
      } else {
        successes = 1;
      }
      total = 1;
    }

    return (
      <Card key={key} className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            {icon}
            {title}
            <Badge variant="outline" className="ml-auto">
              {successes}/{total}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {issues.length > 0 && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Προβλήματα ({issues.length}):</strong>
                <ul className="mt-2 space-y-1">
                  {issues.map((issue: string, index: number) => (
                    <li key={index} className="text-sm">• {issue}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          
          {warnings.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Προειδοποιήσεις ({warnings.length}):</strong>
                <ul className="mt-2 space-y-1">
                  {warnings.map((warning: string, index: number) => (
                    <li key={index} className="text-sm">• {warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          
          {issues.length === 0 && warnings.length === 0 && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Όλα τα ελέγχους πέτυχαν!
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🏥 Έλεγχος Υγείας Συστήματος</h1>
          <p className="text-muted-foreground mt-2">
            Συνολικός έλεγχος υγείας του συστήματος με αυτόματη ανάλυση και αναφορές
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={runHealthCheck} 
            disabled={isRunning || isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Εκτέλεση...' : 'Εκτέλεση Ελέγχου'}
          </Button>
          
          {healthData && healthData.data.summary.failed > 0 && (
            <Button 
              onClick={runAutoFix}
              disabled={isRunning || isLoading}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <Wrench className="h-4 w-4" />
              Αυτόματη Διόρθωση
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            Σφάλμα κατά τον έλεγχο: {error.message}
          </AlertDescription>
        </Alert>
      )}

      {healthData && (
        <div className="space-y-6">
          {/* Overall Health Status */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getHealthStatusIcon(healthData.data.status, healthData.data.success_rate)}
                Συνολική Κατάσταση Υγείας
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <Badge className={`${getHealthStatusColor(healthData.data.status, healthData.data.success_rate)} text-lg px-4 py-2`}>
                    {getHealthStatusText(healthData.data.status, healthData.data.success_rate)}
                  </Badge>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {healthData.data.summary.total_checks}
                  </div>
                  <div className="text-sm text-muted-foreground">Ελέγχοι</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {healthData.data.summary.failed}
                  </div>
                  <div className="text-sm text-muted-foreground">Προβλήματα</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {healthData.data.summary.passed}
                  </div>
                  <div className="text-sm text-muted-foreground">Επιτυχίες</div>
                </div>
              </div>
              
              <div className="mt-4">
                <h4 className="font-semibold mb-2">📊 Στατιστικά:</h4>
                <div className="text-sm space-y-1">
                  <div>• Ποσοστό επιτυχίας: {healthData.data.success_rate.toFixed(1)}%</div>
                  <div>• Προειδοποιήσεις: {healthData.data.summary.warnings}</div>
                </div>
              </div>
              
              <div className="mt-4 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 inline mr-1" />
                Τελευταία ενημέρωση: {new Date(healthData.data.timestamp).toLocaleString('el-GR')}
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Detailed Checks */}
          <div>
            <h2 className="text-xl font-semibold mb-4">📊 Λεπτομερείς Έλεγχοι</h2>
            
            {renderCheckSection(
              '🏢 Δεδομένα Κτιρίων',
              <Building className="h-5 w-5" />,
              healthData.data.checks.building_data,
              'building_data'
            )}
            
            {renderCheckSection(
              '💰 Οικονομικά Δεδομένα',
              <Euro className="h-5 w-5" />,
              healthData.data.checks.financial_data,
              'financial_data'
            )}
            
            {renderCheckSection(
              '🔄 Μεταφορά Υπολοίπων',
              <Scale className="h-5 w-5" />,
              healthData.data.checks.balance_transfer,
              'balance_transfer'
            )}
            
            {renderCheckSection(
              '🔍 Διπλές Χρεώσεις',
              <Shield className="h-5 w-5" />,
              healthData.data.checks.duplicate_charges,
              'duplicate_charges'
            )}
            
            {renderCheckSection(
              '🔒 Ακεραιότητα Δεδομένων',
              <FileText className="h-5 w-5" />,
              healthData.data.checks.data_integrity,
              'data_integrity'
            )}
            
            {/* Raw Output */}
            <div className="mt-6">
              <h2 className="text-xl font-semibold mb-4">📄 Λεπτομερής Έξοδος</h2>
              <Card>
                <CardContent className="p-4">
                  <pre className="text-sm bg-gray-50 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
                    {healthData.data.output}
                  </pre>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {!healthData && !isLoading && !error && (
        <Card>
          <CardContent className="text-center py-12">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Έλεγχος Υγείας Συστήματος</h3>
            <p className="text-muted-foreground mb-4">
              Πατήστε το κουμπί παραπάνω για να εκτελέσετε έναν πλήρη έλεγχο υγείας του συστήματος.
            </p>
            <Button onClick={runHealthCheck}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Ξεκινήστε τον Έλεγχο
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SystemHealthCheck;

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
  overall_health: 'excellent' | 'good' | 'fair' | 'poor';
  checks_performed: number;
  issues_found: number;
  warnings: number;
  successes: number;
  timestamp: string;
  recommendations: string[];
  details: {
    buildings?: {
      total: number;
      issues: string[];
      warnings: string[];
      successes: number;
    };
    apartments?: {
      total: number;
      issues: string[];
      warnings: string[];
      successes: number;
    };
    financial?: {
      expenses: number;
      payments: number;
      transactions: number;
      issues: string[];
      warnings: string[];
      successes: number;
    };
    balance_consistency?: {
      total_apartments: number;
      issues: string[];
      warnings: string[];
      successes: number;
    };
    reserve_funds?: {
      total_buildings: number;
      issues: string[];
      warnings: string[];
      successes: number;
    };
    participation_mills?: {
      total_buildings: number;
      issues: string[];
      warnings: string[];
      successes: number;
    };
    transaction_integrity?: {
      total_transactions: number;
      issues: string[];
      warnings: string[];
      successes: number;
    };
    data_completeness?: {
      total_records: number;
      issues: string[];
      warnings: string[];
      successes: number;
    };
  };
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
      const response = await api.get('/financial/system-health/');
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

  const getHealthStatusIcon = (health: string) => {
    switch (health) {
      case 'excellent':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'good':
        return <CheckCircle className="h-5 w-5 text-yellow-500" />;
      case 'fair':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'poor':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getHealthStatusColor = (health: string) => {
    switch (health) {
      case 'excellent':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'good':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'fair':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'poor':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getHealthStatusText = (health: string) => {
    switch (health) {
      case 'excellent':
        return 'Άριστη';
      case 'good':
        return 'Καλή';
      case 'fair':
        return 'Μέτρια';
      case 'poor':
        return 'Κακή';
      default:
        return 'Άγνωστη';
    }
  };

  const renderCheckSection = (
    title: string,
    icon: React.ReactNode,
    data: any,
    key: string
  ) => {
    if (!data) return null;

    const issues = data.issues || [];
    const warnings = data.warnings || [];
    const successes = data.successes || 0;
    const total = data.total || data.total_buildings || data.total_apartments || data.total_transactions || data.total_records || 0;

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
                  {issues.slice(0, 3).map((issue: string, index: number) => (
                    <li key={index} className="text-sm">• {issue}</li>
                  ))}
                  {issues.length > 3 && (
                    <li className="text-sm text-muted-foreground">
                      ... και {issues.length - 3} ακόμα
                    </li>
                  )}
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
                  {warnings.slice(0, 3).map((warning: string, index: number) => (
                    <li key={index} className="text-sm">• {warning}</li>
                  ))}
                  {warnings.length > 3 && (
                    <li className="text-sm text-muted-foreground">
                      ... και {warnings.length - 3} ακόμα
                    </li>
                  )}
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
          
          {healthData && healthData.data.issues_found > 0 && (
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
                {getHealthStatusIcon(healthData.data.overall_health)}
                Συνολική Κατάσταση Υγείας
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <Badge className={`${getHealthStatusColor(healthData.data.overall_health)} text-lg px-4 py-2`}>
                    {getHealthStatusText(healthData.data.overall_health)}
                  </Badge>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {healthData.data.checks_performed}
                  </div>
                  <div className="text-sm text-muted-foreground">Ελέγχοι</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {healthData.data.issues_found}
                  </div>
                  <div className="text-sm text-muted-foreground">Προβλήματα</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {healthData.data.successes}
                  </div>
                  <div className="text-sm text-muted-foreground">Επιτυχίες</div>
                </div>
              </div>
              
              {healthData.data.recommendations.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">💡 Συστάσεις:</h4>
                  <ul className="space-y-1">
                    {healthData.data.recommendations.map((rec, index) => (
                      <li key={index} className="text-sm">• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}
              
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
              healthData.data.details.buildings,
              'buildings'
            )}
            
            {renderCheckSection(
              '🏠 Δεδομένα Διαμερισμάτων',
              <Home className="h-5 w-5" />,
              healthData.data.details.apartments,
              'apartments'
            )}
            
            {renderCheckSection(
              '💰 Οικονομικά Δεδομένα',
              <Euro className="h-5 w-5" />,
              healthData.data.details.financial,
              'financial'
            )}
            
            {renderCheckSection(
              '⚖️ Συνέπεια Υπολοίπων',
              <Scale className="h-5 w-5" />,
              healthData.data.details.balance_consistency,
              'balance_consistency'
            )}
            
            {renderCheckSection(
              '🏦 Αποθεματικά Ταμεία',
              <PiggyBank className="h-5 w-5" />,
              healthData.data.details.reserve_funds,
              'reserve_funds'
            )}
            
            {renderCheckSection(
              '📊 Χιλιόστιμα Συμμετοχής',
              <BarChart3 className="h-5 w-5" />,
              healthData.data.details.participation_mills,
              'participation_mills'
            )}
            
            {renderCheckSection(
              '🔒 Ακεραιότητα Συναλλαγών',
              <Shield className="h-5 w-5" />,
              healthData.data.details.transaction_integrity,
              'transaction_integrity'
            )}
            
            {renderCheckSection(
              '📋 Πληρότητα Δεδομένων',
              <FileText className="h-5 w-5" />,
              healthData.data.details.data_completeness,
              'data_completeness'
            )}
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

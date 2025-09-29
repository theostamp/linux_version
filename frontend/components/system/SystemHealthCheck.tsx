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
  Wrench,
  Filter,
  Eye,
  EyeOff
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
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);

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
    const issues: string[] = [];
    const warnings: string[] = [];
    let successes = 0;
    let total = 0;

    if (key === 'building_data') {
      if (data.total_mills !== data.expected_mills) {
        const difference = data.total_mills - data.expected_mills;
        const scaling_factor = data.total_mills / data.expected_mills;
        
        // Έλεγχος για scaling issue
        if (data.apartments_with_mills === data.apartments_count && scaling_factor > 1.5) {
          // Πιθανό scaling issue - όλα τα διαμερίσματα έχουν διπλάσια/τριπλάσια χιλιοστά
          issues.push(`Scaling Factor: Όλα τα διαμερίσματα έχουν ${scaling_factor.toFixed(1)}x περισσότερα χιλιοστά`);
          issues.push(`• Τρέχον σύνολο: ${data.total_mills} (${scaling_factor.toFixed(1)}x το αναμενόμενο)`);
          issues.push(`• Αναμενόμενο σύνολο: ${data.expected_mills}`);
          issues.push(`• Διαμερίσματα με χιλιοστά: ${data.apartments_with_mills}/${data.apartments_count}`);
          
          warnings.push(`Σύστημα: Το σύστημα λειτουργεί κανονικά με οποιοδήποτε σύνολο χιλιοστών`);
          warnings.push(`Σύστημα: Προαιρετικά μπορείτε να χρησιμοποιήσετε "Αυτόματη Διόρθωση"`);
          warnings.push(`Σύστημα: Αυτό θα εφαρμόσει scaling factor ${(1/scaling_factor).toFixed(2)}`);
        } else {
          // Κανονικό πρόβλημα
          const explanation = difference > 0 
            ? `Υπάρχουν ${difference} επιπλέον χιλιοστά. Αυτό μπορεί να οφείλεται σε:`
            : `Λείπουν ${Math.abs(difference)} χιλιοστά. Αυτό μπορεί να οφείλεται σε:`;
          
          issues.push(`Λάθος χιλιοστά: ${data.total_mills} αντί για ${data.expected_mills}`);
          issues.push(explanation);
          issues.push(`• Διαμερίσματα χωρίς χιλιοστά: ${data.apartments_count - data.apartments_with_mills}`);
          issues.push(`• Συνολικά διαμερίσματα: ${data.apartments_count}`);
          issues.push(`• Διαμερίσματα με χιλιοστά: ${data.apartments_with_mills}`);
          
          warnings.push(`Σύστημα: Ελέγξτε τα χιλιοστά σε κάθε διαμέρισμα`);
          warnings.push(`Σύστημα: Το σύνολο πρέπει να είναι ακριβώς 1000`);
          warnings.push(`Σύστημα: Χρησιμοποιήστε τη λειτουργία επεξεργασίας διαμερισμάτων`);
        }
      } else {
        successes = 1;
      }
      total = 1;
    } else if (key === 'financial_data') {
      // Χρήση της νέας λογικής από το backend
      const expenseBalance = data.expense_balance || 0;
      const paymentBalance = data.payment_balance || 0;
      
      if (Math.abs(expenseBalance) > 0.01) {
        issues.push(`Ανισορροπία δαπανών: ${expenseBalance.toFixed(2)}€`);
        issues.push(`• Συνολικές δαπάνες: ${data.total_expenses.toFixed(2)}€`);
        issues.push(`• Συναλλαγές δαπανών: ${(data.total_expenses + expenseBalance).toFixed(2)}€`);
        issues.push(`• Διαφορά: ${expenseBalance > 0 ? 'Περισσότερες συναλλαγές' : 'Λιγότερες συναλλαγές'}`);
        
        warnings.push(`Σύστημα: Ελέγξτε τις καταχωρήσεις δαπανών και συναλλαγών`);
        warnings.push(`Σύστημα: Βεβαιωθείτε ότι όλες οι δαπάνες έχουν αντίστοιχες συναλλαγές`);
      } else {
        successes = 1;
      }
      
      if (paymentBalance > 0.01) {
        warnings.push(`Πληρωμές χωρίς συναλλαγές: ${paymentBalance.toFixed(2)}€`);
        warnings.push(`• Συνολικές πληρωμές: ${data.total_payments.toFixed(2)}€`);
        warnings.push(`• Συναλλαγές πληρωμών: ${(data.total_payments - paymentBalance).toFixed(2)}€`);
        warnings.push(`• Σύστημα: Αυτό είναι φυσιολογικό για πληρωμές που μόλις καταχωρήθηκαν`);
      } else {
        successes += 1;
      }
      
      total = 2; // Δύο ελέγχους: δαπάνες και πληρωμές
    } else if (key === 'balance_transfer') {
      if (data.transfer_issues > 0) {
        issues.push(`${data.transfer_issues} προβλήματα μεταφοράς υπολοίπων`);
        issues.push(`• Ελεγχθέντα διαμερίσματα: ${data.apartments_checked}`);
        issues.push(`• Μήνες με δεδομένα: ${data.months_checked}`);
        issues.push(`• Προβλήματα μεταφοράς: ${data.transfer_issues}`);
        
        warnings.push(`Σύστημα: Ελέγξτε τη μεταφορά υπολοίπων μεταξύ μηνών`);
        warnings.push(`Σύστημα: Βεβαιωθείτε ότι τα previous_balance υπολογίζονται σωστά`);
      } else {
        successes = 1;
      }
      total = 1;
    } else if (key === 'duplicate_charges') {
      if (data.total_duplicates > 0) {
        issues.push(`${data.total_duplicates} διπλές χρεώσεις`);
        issues.push(`• Διπλές δαπάνες: ${data.expense_duplicates}`);
        issues.push(`• Διπλές πληρωμές: ${data.payment_duplicates}`);
        issues.push(`• Συνολικές διπλές: ${data.total_duplicates}`);
        
        warnings.push(`Σύστημα: Ελέγξτε για διπλές καταχωρήσεις`);
        warnings.push(`Σύστημα: Χρησιμοποιήστε τη λειτουργία αναζήτησης για διπλές εγγραφές`);
      } else {
        successes = 1;
      }
      total = 1;
    } else if (key === 'data_integrity') {
      const totalIssues = data.orphaned_expenses + data.orphaned_payments + data.invalid_amounts + data.missing_titles;
      if (totalIssues > 0) {
        issues.push(`${totalIssues} προβλήματα ακεραιότητας`);
        issues.push(`• Δαπάνες χωρίς κτίριο: ${data.orphaned_expenses}`);
        issues.push(`• Πληρωμές χωρίς διαμέρισμα: ${data.orphaned_payments}`);
        issues.push(`• Λάθος ποσά: ${data.invalid_amounts}`);
        issues.push(`• Λείπουσες περιγραφές: ${data.missing_titles}`);
        
        warnings.push(`Σύστημα: Ελέγξτε τις σχέσεις μεταξύ εγγραφών`);
        warnings.push(`Σύστημα: Βεβαιωθείτε ότι όλες οι εγγραφές έχουν σωστές αναφορές`);
      } else {
        successes = 1;
      }
      total = 1;
    }

    return (
      <Card key={key} className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            {icon}
            {title}
            <Badge variant="outline" className="ml-auto text-xs">
              {successes}/{total}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {issues.length > 0 && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <strong className="text-sm">Προβλήματα ({issues.length}):</strong>
                <ul className="mt-2 space-y-1">
                  {issues.map((issue: string, index: number) => (
                    <li key={index} className="text-xs">• {issue}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          
          {warnings.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong className="text-sm">Προειδοποιήσεις ({warnings.length}):</strong>
                <ul className="mt-2 space-y-1">
                  {warnings.map((warning: string, index: number) => (
                    <li key={index} className="text-xs">• {warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          
          {issues.length === 0 && warnings.length === 0 && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Ολοι οι έλεγχοι πέτυχαν
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
              
              <div className="mt-4">
                <h4 className="font-semibold mb-2 text-sm">Γενικές Συστάσεις:</h4>
                <div className="text-sm space-y-1">
                  <div>• Εκτελέστε τον έλεγχο τακτικά (τουλάχιστον μία φορά την εβδομάδα)</div>
                  <div>• Ελέγξτε τα αποτελέσματα μετά από κάθε μεγάλη αλλαγή δεδομένων</div>
                  <div>• Χρησιμοποιήστε το "Αυτόματη Διόρθωση" μόνο μετά από backup</div>
                  <div>• Επικοινωνήστε με τον διαχειριστή για κρίσιμα προβλήματα</div>
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
            
            {/* Χιλιοστά Επεξήγηση */}
            {healthData.data.checks.building_data && 
             healthData.data.checks.building_data.total_mills !== healthData.data.checks.building_data.expected_mills && (
              <div className="mt-6">
                <h2 className="text-lg font-semibold mb-4">Επεξήγηση Χιλιοστών</h2>
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-red-600 mb-2 text-sm">Τι σημαίνει αυτό το πρόβλημα;</h4>
                        <p className="text-sm text-gray-700 mb-3">
                          Τα χιλιοστά (mills) είναι το σύστημα κατανομής κοινόχρηστων εξόδων. 
                          Το σύνολο των χιλιοστών σε όλα τα διαμερίσματα πρέπει να είναι ακριβώς 1000.
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-blue-600 mb-2 text-sm">Τρέχουσα κατάσταση:</h4>
                        <div className="text-sm space-y-1">
                          <div>• Συνολικά χιλιοστά: <strong>{healthData.data.checks.building_data.total_mills}</strong></div>
                          <div>• Αναμενόμενα χιλιοστά: <strong>{healthData.data.checks.building_data.expected_mills}</strong></div>
                          <div>• Διαφορά: <strong className="text-red-600">
                            {healthData.data.checks.building_data.total_mills > healthData.data.checks.building_data.expected_mills ? '+' : ''}
                            {healthData.data.checks.building_data.total_mills - healthData.data.checks.building_data.expected_mills}
                          </strong></div>
                          <div>• Συνολικά διαμερίσματα: <strong>{healthData.data.checks.building_data.apartments_count}</strong></div>
                          <div>• Διαμερίσματα με χιλιοστά: <strong>{healthData.data.checks.building_data.apartments_with_mills}</strong></div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-green-600 mb-2 text-sm">Πώς να το διορθώσετε:</h4>
                        <div className="text-sm space-y-2">
                          <div>1. <strong>Ελέγξτε τα διαμερίσματα:</strong> Πηγαίνετε στη λίστα διαμερισμάτων</div>
                          <div>2. <strong>Επιβεβαιώστε τα χιλιοστά:</strong> Βεβαιωθείτε ότι κάθε διαμέρισμα έχει χιλιοστά</div>
                          <div>3. <strong>Υπολογίστε το σύνολο:</strong> Το σύνολο πρέπει να είναι ακριβώς 1000</div>
                          <div>4. <strong>Διορθώστε αν χρειάζεται:</strong> Αλλάξτε τα χιλιοστά στα διαμερίσματα</div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-orange-600 mb-2 text-sm">Προσοχή:</h4>
                        <div className="text-sm space-y-1">
                          <div>• Η αλλαγή χιλιοστών επηρεάζει τη κατανομή κοινόχρηστων</div>
                          <div>• Κάντε backup πριν από αλλαγές</div>
                          <div>• Ενημερώστε τους ιδιοκτήτες για αλλαγές</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Raw Output */}
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-4">Λεπτομερής Έξοδος</h2>
              
              {/* Summary of Issues */}
              {(() => {
                const lines = healthData.data.output.split('\n');
                const errorLines = lines.filter(line => 
                  line.includes('❌') || 
                  line.includes('ΠΡΟΒΛΗΜΑ') || 
                  line.includes('ΛΑΘΟΣ') ||
                  line.includes('ΑΠΟΤΥΧΙΑ') ||
                  line.includes('ΣΦΑΛΜΑ')
                );
                
                if (errorLines.length > 0) {
                  return (
                                  <div className="mb-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="text-red-800 font-semibold mb-2 text-xs">
                    Σύνοψη Προβλημάτων ({errorLines.length} γραμμές)
                  </h3>
                        <div className="space-y-1">
                          {errorLines.slice(0, 5).map((line, index) => (
                            <div key={index} className="text-red-700 text-sm">
                              • {line.trim()}
                            </div>
                          ))}
                          {errorLines.length > 5 && (
                            <div className="text-red-600 text-sm italic">
                              ... και {errorLines.length - 5} ακόμα προβλήματα
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
              
              {/* Filter Toggle */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button
                    variant={showOnlyErrors ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowOnlyErrors(!showOnlyErrors)}
                    className="flex items-center space-x-2 text-sm"
                  >
                    {showOnlyErrors ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span>{showOnlyErrors ? "Εμφάνιση Όλων" : "Μόνο Προβλήματα"}</span>
                  </Button>
                  
                  {showOnlyErrors && (
                    <Badge variant="destructive" className="ml-2 text-xs">
                      Φιλτραρισμένο
                    </Badge>
                  )}
                </div>
                
                <div className="text-sm text-gray-500">
                  {(() => {
                    const lines = healthData.data.output.split('\n');
                    const errorLines = lines.filter(line => 
                      line.includes('❌') || 
                      line.includes('ΠΡΟΒΛΗΜΑ') || 
                      line.includes('ΛΑΘΟΣ') ||
                      line.includes('ΑΠΟΤΥΧΙΑ') ||
                      line.includes('ΣΦΑΛΜΑ')
                    );
                    return `${errorLines.length} προβλήματα από ${lines.length} γραμμές`;
                  })()}
                </div>
              </div>
              
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm bg-gray-50 p-4 rounded-lg overflow-x-auto max-h-96 overflow-y-auto">
                    {(() => {
                      const lines = healthData.data.output.split('\n');
                      const filteredLines = showOnlyErrors 
                        ? lines.filter(line => 
                            line.includes('❌') || 
                            line.includes('ΠΡΟΒΛΗΜΑ') || 
                            line.includes('ΛΑΘΟΣ') ||
                            line.includes('ΑΠΟΤΥΧΙΑ') ||
                            line.includes('ΣΦΑΛΜΑ') ||
                            line.includes('🚨') ||
                            line.includes('⚠️')
                          )
                        : lines;
                      
                      return filteredLines.map((line, index) => {
                      // Έλεγχος για αποτυχημένες γραμμές
                      const isError = line.includes('❌') || 
                                    line.includes('ΠΡΟΒΛΗΜΑ') || 
                                    line.includes('ΛΑΘΟΣ') ||
                                    line.includes('ΑΠΟΤΥΧΙΑ') ||
                                    line.includes('ΣΦΑΛΜΑ');
                      
                      // Έλεγχος για επιτυχημένες γραμμές
                      const isSuccess = line.includes('✅') || 
                                      line.includes('ΕΠΙΤΥΧΙΑ') ||
                                      line.includes('ΣΩΣΤΑ') ||
                                      line.includes('ΕΠΙΛΥΘΗΚΕ');
                      
                      // Έλεγχος για προειδοποιήσεις
                      const isWarning = line.includes('⚠️') || 
                                      line.includes('ΠΡΟΕΙΔΟΠΟΙΗΣΗ') ||
                                      line.includes('ΠΡΟΣΟΧΗ');
                      
                      // Έλεγχος για headers/sections
                      const isHeader = line.includes('===') || 
                                     line.includes('---') ||
                                     line.includes('🔍') ||
                                     line.includes('📊') ||
                                     line.includes('💰') ||
                                     line.includes('🏢') ||
                                     line.includes('⚖️') ||
                                     line.includes('🔍') ||
                                     line.includes('📋');
                      
                      // Έλεγχος για bullet points
                      const isBullet = line.trim().startsWith('•') || 
                                     line.trim().startsWith('-') ||
                                     line.trim().startsWith('*');
                      
                      // Έλεγχος για αριθμημένες λίστες
                      const isNumbered = /^\d+\./.test(line.trim());
                      
                      // Προσδιορισμός CSS classes
                      let className = 'py-1';
                      
                      if (isError) {
                        className += ' text-red-700 bg-red-50 border-l-4 border-red-500 pl-3 font-semibold';
                      } else if (isSuccess) {
                        className += ' text-green-700 bg-green-50 border-l-4 border-green-500 pl-3';
                      } else if (isWarning) {
                        className += ' text-orange-700 bg-orange-50 border-l-4 border-orange-500 pl-3';
                      } else if (isHeader) {
                        className += ' text-blue-700 bg-blue-50 border-l-4 border-blue-500 pl-3 font-bold text-base';
                      } else if (isBullet || isNumbered) {
                        className += ' pl-6 text-gray-700';
                      } else if (line.trim() === '') {
                        className += ' h-2'; // Empty line spacing
                      } else {
                        className += ' text-gray-800';
                      }
                      
                      return (
                        <div key={index} className={className}>
                          {line || '\u00A0'} {/* Non-breaking space for empty lines */}
                        </div>
                      );
                      });
                    })()}
                  </div>
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

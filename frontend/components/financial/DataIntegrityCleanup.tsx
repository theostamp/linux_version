'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

interface DataIntegrityCleanupProps {
  buildingId: number;
  onCleanupComplete?: () => void;
}

interface CleanupResult {
  success: boolean;
  message: string;
  cleanup_performed: boolean;
  cleanup_result?: {
    orphaned_transactions_found: number;
    orphaned_transactions_deleted: any[];
    total_orphaned_amount: number;
    apartments_updated: number;
    balance_updates: Record<string, { old: number; new: number }>;
  };
  final_integrity_check?: {
    orphaned_transactions: number;
    inconsistent_balances: number;
    needs_cleanup: boolean;
  };
}

export const DataIntegrityCleanup: React.FC<DataIntegrityCleanupProps> = ({
  buildingId,
  onCleanupComplete
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CleanupResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCleanup = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await api.post('/financial/payments/cleanup_data_integrity/', {
        building_id: buildingId
      });

      setResult(response.data);
      
      if (response.data.cleanup_performed) {
        onCleanupComplete?.();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Σφάλμα κατά τον καθαρισμό');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (result?.success) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (error) return <AlertTriangle className="h-4 w-4 text-red-600" />;
    return <RefreshCw className="h-4 w-4 text-blue-600" />;
  };

  const getStatusText = () => {
    if (isLoading) return 'Εκτέλεση καθαρισμού...';
    if (result?.success) {
      if (result.cleanup_performed) {
        return 'Καθαρισμός ολοκληρώθηκε';
      } else {
        return 'Δεδομένα ήδη καθαρά';
      }
    }
    if (error) return 'Σφάλμα κατά τον καθαρισμό';
    return 'Έτοιμο για καθαρισμό';
  };

  const getStatusColor = () => {
    if (isLoading) return 'bg-blue-100 text-blue-800';
    if (result?.success) return 'bg-green-100 text-green-800';
    if (error) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Καθαρισμός Ακεραιότητας Δεδομένων
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor()}>
              {getStatusText()}
            </Badge>
          </div>
          <Button
            onClick={handleCleanup}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Καθαρισμός...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Εκτέλεση Καθαρισμού
              </>
            )}
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="space-y-3">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>

            {result.cleanup_performed && result.cleanup_result && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Αποτελέσματα Καθαρισμού:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Orphaned Transactions:</span>
                    <span className="ml-2">{result.cleanup_result.orphaned_transactions_found}</span>
                  </div>
                  <div>
                    <span className="font-medium">Συνολικό Ποσό:</span>
                    <span className="ml-2">{result.cleanup_result.total_orphaned_amount.toFixed(2)}€</span>
                  </div>
                  <div>
                    <span className="font-medium">Διαμερίσματα Ενημερωμένα:</span>
                    <span className="ml-2">{result.cleanup_result.apartments_updated}</span>
                  </div>
                </div>

                {Object.keys(result.cleanup_result.balance_updates).length > 0 && (
                  <div className="mt-3">
                    <h5 className="font-medium text-sm mb-2">Ενημερώσεις Υπολοίπων:</h5>
                    <div className="space-y-1">
                      {Object.entries(result.cleanup_result.balance_updates).map(([apartment, update]) => (
                        <div key={apartment} className="text-sm">
                          <span className="font-medium">Διαμέρισμα {apartment}:</span>
                          <span className="ml-2">
                            {update.old.toFixed(2)}€ → {update.new.toFixed(2)}€
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {result.final_integrity_check && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Τελικός Έλεγχος Ακεραιότητας:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Orphaned Transactions:</span>
                    <span className="ml-2">{result.final_integrity_check.orphaned_transactions}</span>
                  </div>
                  <div>
                    <span className="font-medium">Ασυνεπή Υπόλοιπα:</span>
                    <span className="ml-2">{result.final_integrity_check.inconsistent_balances}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-gray-500 mt-4">
          <p>Ο καθαρισμός εκτελείται αυτόματα με κάθε συναλλαγή, αλλά μπορείτε να τον εκτελέσετε χειροκίνητα εδώ.</p>
        </div>
      </CardContent>
    </Card>
  );
};


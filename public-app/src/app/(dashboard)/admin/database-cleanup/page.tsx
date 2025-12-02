'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  AlertTriangle, 
  Database, 
  Trash2, 
  RefreshCw, 
  Shield,
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  ArrowLeft
} from 'lucide-react';

interface CleanupOperation {
  id: string;
  name: string;
  description: string;
  danger_level: 'low' | 'medium' | 'high' | 'critical';
  affects: string;
}

interface ScanResult {
  orphan_transactions: {
    count: number;
    total_amount: number;
    items: Array<{
      id: number;
      description: string;
      amount: number;
      date: string;
      apartment: string;
      building: string;
    }>;
  };
  balance_mismatches: {
    count: number;
    items: Array<{
      apartment_id: number;
      number: string;
      building: string;
      stored_balance: number;
    }>;
  };
}

interface CleanupResult {
  status: string;
  operation?: string;
  message: string;
  deleted_count?: number;
  total_amount_removed?: number;
  balance_updates?: Array<{
    apartment_number: string;
    old_balance: number;
    new_balance: number;
  }>;
}

export default function DatabaseCleanupPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  const [isScanning, setIsScanning] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult | null>(null);
  const [operations, setOperations] = useState<CleanupOperation[]>([]);
  const [selectedOperation, setSelectedOperation] = useState<string | null>(null);
  const [confirmStep, setConfirmStep] = useState(0);
  const [confirmText, setConfirmText] = useState('');
  const [result, setResult] = useState<CleanupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Check admin access
  useEffect(() => {
    if (!authLoading && user) {
      const isAdmin = user.role === 'admin' || user.is_superuser || user.is_staff;
      if (!isAdmin) {
        router.push('/dashboard');
      }
    }
  }, [user, authLoading, router]);

  // Initial scan
  const scanDatabase = async () => {
    setIsScanning(true);
    setError(null);
    
    try {
      const response = await fetch('/api/financial/admin/database-cleanup/', {
        method: 'GET',
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.status === 'preview') {
        setScanResults(data.scan_results);
        setOperations(data.available_operations || []);
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      setError('Σφάλμα σύνδεσης με τον server');
    } finally {
      setIsScanning(false);
    }
  };

  // Execute cleanup
  const executeCleanup = async () => {
    if (!selectedOperation || confirmText !== 'CONFIRM_DELETE') return;
    
    setIsExecuting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/financial/admin/database-cleanup/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          operation: selectedOperation,
          confirm: 'CONFIRM_DELETE',
          search_term: searchTerm || undefined
        })
      });
      
      const data = await response.json();
      setResult(data);
      
      if (data.status === 'success') {
        // Reset form
        setSelectedOperation(null);
        setConfirmStep(0);
        setConfirmText('');
        // Rescan
        await scanDatabase();
      }
    } catch (err) {
      setError('Σφάλμα κατά την εκτέλεση');
    } finally {
      setIsExecuting(false);
    }
  };

  const getDangerColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Πίσω
        </button>
        
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-100 rounded-xl">
            <Database className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              🔧 Εκκαθάριση Βάσης Δεδομένων
            </h1>
            <p className="text-gray-500">
              Διαχείριση και καθαρισμός δεδομένων - Μόνο για διαχειριστές
            </p>
          </div>
        </div>
      </div>

      {/* Critical Warning Banner */}
      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 mb-8">
        <div className="flex items-start gap-4">
          <AlertTriangle className="w-8 h-8 text-red-600 flex-shrink-0 mt-1" />
          <div>
            <h2 className="text-lg font-bold text-red-800 mb-2">
              ⚠️ ΠΡΟΕΙΔΟΠΟΙΗΣΗ - ΚΡΙΣΙΜΗ ΛΕΙΤΟΥΡΓΙΑ
            </h2>
            <ul className="space-y-2 text-red-700">
              <li className="flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Οι ενέργειες εκκαθάρισης είναι <strong>ΜΗ ΑΝΑΣΤΡΕΨΙΜΕΣ</strong>
              </li>
              <li className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Συνιστάται <strong>BACKUP</strong> πριν από κάθε ενέργεια
              </li>
              <li className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Βεβαιωθείτε ότι γνωρίζετε τι κάνετε
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Scan Button */}
      {!scanResults && (
        <div className="text-center py-12">
          <button
            onClick={scanDatabase}
            disabled={isScanning}
            className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 text-lg font-medium shadow-lg"
          >
            {isScanning ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Σάρωση σε εξέλιξη...
              </>
            ) : (
              <>
                <Database className="w-6 h-6" />
                Σάρωση Βάσης Δεδομένων
              </>
            )}
          </button>
          <p className="text-gray-500 mt-4">
            Κάντε κλικ για να σαρώσετε τη βάση δεδομένων για προβλήματα
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 text-red-700">
            <XCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Scan Results */}
      {scanResults && (
        <div className="space-y-6">
          {/* Rescan Button */}
          <div className="flex justify-end">
            <button
              onClick={scanDatabase}
              disabled={isScanning}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              Επανάληψη Σάρωσης
            </button>
          </div>

          {/* Results Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border rounded-xl p-4">
              <div className="text-sm text-gray-500 mb-1">Ορφανά Transactions</div>
              <div className="text-2xl font-bold text-orange-600">
                {scanResults.orphan_transactions?.count || 0}
              </div>
              <div className="text-sm text-gray-400">
                Σύνολο: €{(scanResults.orphan_transactions?.total_amount || 0).toFixed(2)}
              </div>
            </div>
            
            <div className="bg-white border rounded-xl p-4">
              <div className="text-sm text-gray-500 mb-1">Αποκλίσεις Υπολοίπων</div>
              <div className="text-2xl font-bold text-yellow-600">
                {scanResults.balance_mismatches?.count || 0}
              </div>
              <div className="text-sm text-gray-400">
                Διαμερίσματα με διαφορές
              </div>
            </div>
            
            <div className="bg-white border rounded-xl p-4">
              <div className="text-sm text-gray-500 mb-1">Κατάσταση</div>
              <div className="text-2xl font-bold text-green-600">
                {(scanResults.orphan_transactions?.count || 0) === 0 ? '✓ OK' : '⚠️ Θέματα'}
              </div>
            </div>
          </div>

          {/* Orphan Transactions Preview */}
          {scanResults.orphan_transactions?.items?.length > 0 && (
            <div className="bg-white border rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-orange-50 border-b">
                <h3 className="font-semibold text-orange-800">
                  📋 Ορφανά Transactions (προεπισκόπηση)
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">ID</th>
                      <th className="px-4 py-2 text-left">Περιγραφή</th>
                      <th className="px-4 py-2 text-right">Ποσό</th>
                      <th className="px-4 py-2 text-left">Διαμέρισμα</th>
                      <th className="px-4 py-2 text-left">Κτίριο</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scanResults.orphan_transactions.items.slice(0, 5).map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="px-4 py-2 text-gray-500">#{item.id}</td>
                        <td className="px-4 py-2">{item.description}</td>
                        <td className="px-4 py-2 text-right font-medium">€{item.amount.toFixed(2)}</td>
                        <td className="px-4 py-2">{item.apartment || '-'}</td>
                        <td className="px-4 py-2">{item.building || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {scanResults.orphan_transactions.items.length > 5 && (
                  <div className="px-4 py-2 bg-gray-50 text-gray-500 text-sm">
                    ... και {scanResults.orphan_transactions.items.length - 5} ακόμα
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Available Operations */}
          <div className="bg-white border rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b">
              <h3 className="font-semibold">🔧 Διαθέσιμες Ενέργειες</h3>
            </div>
            <div className="p-4 space-y-3">
              {operations.map((op) => (
                <div
                  key={op.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedOperation === op.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'hover:border-gray-300'
                  }`}
                  onClick={() => {
                    setSelectedOperation(op.id);
                    setConfirmStep(1);
                    setConfirmText('');
                    setResult(null);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {op.name}
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${getDangerColor(op.danger_level)}`}>
                          {op.danger_level.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{op.description}</p>
                      <p className="text-xs text-gray-400 mt-1">Επηρεάζει: {op.affects}</p>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      selectedOperation === op.id 
                        ? 'border-blue-500 bg-blue-500' 
                        : 'border-gray-300'
                    }`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Confirmation Steps */}
          {selectedOperation && confirmStep >= 1 && (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6">
              <h3 className="font-bold text-yellow-800 mb-4">
                ⚠️ Επιβεβαίωση Εκκαθάρισης
              </h3>
              
              {/* Optional Search Term */}
              {selectedOperation === 'orphan_transactions' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Όρος αναζήτησης (προαιρετικό)
                  </label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="π.χ. Στεγανοποίηση"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              )}
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="confirm1"
                    checked={confirmStep >= 2}
                    onChange={(e) => setConfirmStep(e.target.checked ? 2 : 1)}
                    className="mt-1"
                  />
                  <label htmlFor="confirm1" className="text-sm">
                    Κατανοώ ότι αυτή η ενέργεια είναι <strong>μη αναστρέψιμη</strong>
                  </label>
                </div>
                
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="confirm2"
                    checked={confirmStep >= 3}
                    onChange={(e) => setConfirmStep(e.target.checked ? 3 : 2)}
                    disabled={confirmStep < 2}
                    className="mt-1"
                  />
                  <label htmlFor="confirm2" className="text-sm">
                    Έχω κάνει <strong>backup</strong> της βάσης δεδομένων
                  </label>
                </div>
                
                {confirmStep >= 3 && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <label className="block text-sm font-medium text-red-800 mb-2">
                      Για να συνεχίσετε, πληκτρολογήστε: <code className="bg-red-100 px-2 py-0.5 rounded">CONFIRM_DELETE</code>
                    </label>
                    <input
                      type="text"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="CONFIRM_DELETE"
                      className="w-full px-3 py-2 border border-red-300 rounded-lg focus:border-red-500 focus:ring-red-500"
                    />
                  </div>
                )}
                
                {confirmText === 'CONFIRM_DELETE' && (
                  <button
                    onClick={executeCleanup}
                    disabled={isExecuting}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                  >
                    {isExecuting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Εκτέλεση σε εξέλιξη...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-5 h-5" />
                        🗑️ ΕΚΤΕΛΕΣΗ ΕΚΚΑΘΑΡΙΣΗΣ
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Result Display */}
          {result && (
            <div className={`border-2 rounded-xl p-6 ${
              result.status === 'success' 
                ? 'bg-green-50 border-green-200' 
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-start gap-3">
                {result.status === 'success' ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <h3 className={`font-bold ${
                    result.status === 'success' ? 'text-green-800' : 'text-yellow-800'
                  }`}>
                    {result.message}
                  </h3>
                  
                  {result.deleted_count !== undefined && (
                    <p className="text-sm mt-2">
                      Διαγράφηκαν: <strong>{result.deleted_count}</strong> εγγραφές
                    </p>
                  )}
                  
                  {result.total_amount_removed !== undefined && (
                    <p className="text-sm">
                      Συνολικό ποσό: <strong>€{result.total_amount_removed.toFixed(2)}</strong>
                    </p>
                  )}
                  
                  {result.balance_updates && result.balance_updates.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">Ενημερώσεις υπολοίπων:</p>
                      <div className="bg-white rounded-lg p-3 text-sm">
                        {result.balance_updates.map((update, idx) => (
                          <div key={idx} className="flex justify-between py-1 border-b last:border-0">
                            <span>Δ.{update.apartment_number}</span>
                            <span>
                              €{update.old_balance.toFixed(2)} → €{update.new_balance.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


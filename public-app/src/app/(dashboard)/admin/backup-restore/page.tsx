'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { 
  Download, 
  Upload, 
  Database, 
  Shield,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowLeft,
  FileJson,
  Calendar,
  Building2,
  AlertTriangle,
  HardDrive,
  RefreshCw,
  Eye
} from 'lucide-react';

interface BackupType {
  id: string;
  name: string;
  description: string;
  estimated_size: string;
}

interface BuildingOption {
  id: number;
  name: string;
  apartments_count: number;
}

interface RestoreMode {
  id: string;
  name: string;
  description: string;
  danger_level: string;
}

export default function BackupRestorePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Backup state
  const [backupTypes, setBackupTypes] = useState<BackupType[]>([]);
  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [selectedBackupType, setSelectedBackupType] = useState('full');
  const [selectedBuildings, setSelectedBuildings] = useState<number[]>([]);
  const [includeTransactions, setIncludeTransactions] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isBackingUp, setIsBackingUp] = useState(false);
  
  // Restore state
  const [restoreModes, setRestoreModes] = useState<RestoreMode[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [backupData, setBackupData] = useState<any>(null);
  const [selectedRestoreMode, setSelectedRestoreMode] = useState('preview');
  const [confirmText, setConfirmText] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restorePreview, setRestorePreview] = useState<any>(null);
  
  // Common state
  const [activeTab, setActiveTab] = useState<'backup' | 'restore'>('backup');
  const [result, setResult] = useState<{ status: string; message: string; data?: any } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check admin access
  useEffect(() => {
    if (!authLoading && user) {
      const isAdmin = user.role === 'admin' || user.is_superuser || user.is_staff;
      if (!isAdmin) {
        router.push('/dashboard');
      }
    }
  }, [user, authLoading, router]);

  // Load initial data
  useEffect(() => {
    loadBackupOptions();
    loadRestoreOptions();
  }, []);

  const loadBackupOptions = async () => {
    try {
      const response = await fetch('/api/financial/admin/backup/', {
        method: 'GET',
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.backup_types) {
        setBackupTypes(data.backup_types);
      }
      if (data.available_buildings) {
        setBuildings(data.available_buildings);
      }
    } catch (err) {
      console.error('Error loading backup options:', err);
    }
  };

  const loadRestoreOptions = async () => {
    try {
      const response = await fetch('/api/financial/admin/restore/', {
        method: 'GET',
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.restore_modes) {
        setRestoreModes(data.restore_modes);
      }
    } catch (err) {
      console.error('Error loading restore options:', err);
    }
  };

  // Handle backup download
  const handleBackup = async () => {
    setIsBackingUp(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await fetch('/api/financial/admin/backup/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          backup_type: selectedBackupType,
          building_ids: selectedBuildings.length > 0 ? selectedBuildings : undefined,
          include_transactions: includeTransactions,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined
        })
      });
      
      if (response.ok) {
        // Download the file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const contentDisposition = response.headers.get('Content-Disposition');
        const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || 'backup.json';
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setResult({
          status: 'success',
          message: `✅ Backup ολοκληρώθηκε! Αρχείο: ${filename}`
        });
      } else {
        const data = await response.json();
        setError(data.error || 'Σφάλμα κατά το backup');
      }
    } catch (err) {
      setError('Σφάλμα σύνδεσης με τον server');
    } finally {
      setIsBackingUp(false);
    }
  };

  // Handle file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setSelectedFile(file);
    setError(null);
    setRestorePreview(null);
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!data.meta || !data.data) {
        setError('Μη έγκυρη μορφή αρχείου backup');
        setBackupData(null);
        return;
      }
      
      setBackupData(data);
    } catch (err) {
      setError('Σφάλμα ανάγνωσης αρχείου. Βεβαιωθείτε ότι είναι έγκυρο JSON.');
      setBackupData(null);
    }
  };

  // Handle restore preview
  const handlePreview = async () => {
    if (!backupData) return;
    
    setIsRestoring(true);
    setError(null);
    
    try {
      const response = await fetch('/api/financial/admin/restore/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          backup_data: backupData,
          mode: 'preview'
        })
      });
      
      const data = await response.json();
      
      if (data.status === 'preview') {
        setRestorePreview(data);
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      setError('Σφάλμα κατά την προεπισκόπηση');
    } finally {
      setIsRestoring(false);
    }
  };

  // Handle restore execute
  const handleRestore = async () => {
    if (!backupData || confirmText !== 'CONFIRM_RESTORE') return;
    
    setIsRestoring(true);
    setError(null);
    
    try {
      const response = await fetch('/api/financial/admin/restore/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          backup_data: backupData,
          mode: selectedRestoreMode,
          confirm: 'CONFIRM_RESTORE'
        })
      });
      
      const data = await response.json();
      
      if (data.status === 'success') {
        setResult({
          status: 'success',
          message: data.message,
          data: data.result
        });
        // Reset form
        setSelectedFile(null);
        setBackupData(null);
        setRestorePreview(null);
        setConfirmText('');
      } else {
        setError(data.error || 'Σφάλμα κατά την επαναφορά');
      }
    } catch (err) {
      setError('Σφάλμα σύνδεσης με τον server');
    } finally {
      setIsRestoring(false);
    }
  };

  const getDangerColor = (level: string) => {
    switch (level) {
      case 'safe': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
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
          <div className="p-3 bg-blue-100 rounded-xl">
            <HardDrive className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              💾 Backup & Restore
            </h1>
            <p className="text-gray-500">
              Δημιουργία αντιγράφων ασφαλείας και επαναφορά δεδομένων
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'backup'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-white border hover:border-blue-300'
          }`}
        >
          <Download className="w-5 h-5" />
          Backup
        </button>
        <button
          onClick={() => setActiveTab('restore')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'restore'
              ? 'bg-orange-600 text-white shadow-lg'
              : 'bg-white border hover:border-orange-300'
          }`}
        >
          <Upload className="w-5 h-5" />
          Restore
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 text-red-700">
            <XCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Result Display */}
      {result && (
        <div className={`border-2 rounded-xl p-6 mb-6 ${
          result.status === 'success' 
            ? 'bg-green-50 border-green-200' 
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-green-800">{result.message}</p>
              {result.data && (
                <pre className="mt-2 text-sm bg-white p-3 rounded-lg overflow-auto">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BACKUP TAB */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          {/* Backup Type Selection */}
          <div className="bg-white border rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-blue-50 border-b">
              <h3 className="font-semibold text-blue-800">📦 Τύπος Backup</h3>
            </div>
            <div className="p-4 space-y-3">
              {backupTypes.map((type) => (
                <div
                  key={type.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedBackupType === type.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedBackupType(type.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{type.name}</div>
                      <p className="text-sm text-gray-500">{type.description}</p>
                    </div>
                    <div className="text-sm text-gray-400">{type.estimated_size}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Building Selection */}
          <div className="bg-white border rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Κτίρια (προαιρετικό)
              </h3>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-500 mb-3">
                Αφήστε κενό για backup όλων των κτιρίων
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {buildings.map((building) => (
                  <label
                    key={building.id}
                    className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer ${
                      selectedBuildings.includes(building.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedBuildings.includes(building.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedBuildings([...selectedBuildings, building.id]);
                        } else {
                          setSelectedBuildings(selectedBuildings.filter(id => id !== building.id));
                        }
                      }}
                    />
                    <span className="text-sm">{building.name}</span>
                    <span className="text-xs text-gray-400">({building.apartments_count})</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="bg-white border rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b">
              <h3 className="font-semibold">⚙️ Επιλογές</h3>
            </div>
            <div className="p-4 space-y-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeTransactions}
                  onChange={(e) => setIncludeTransactions(e.target.checked)}
                />
                <span>Συμπερίληψη ιστορικού κινήσεων (transactions)</span>
              </label>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Από ημερομηνία
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Έως ημερομηνία
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Backup Button */}
          <button
            onClick={handleBackup}
            disabled={isBackingUp}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium text-lg shadow-lg"
          >
            {isBackingUp ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Δημιουργία backup...
              </>
            ) : (
              <>
                <Download className="w-6 h-6" />
                📥 Λήψη Backup
              </>
            )}
          </button>
        </div>
      )}

      {/* RESTORE TAB */}
      {activeTab === 'restore' && (
        <div className="space-y-6">
          {/* Warning Banner */}
          <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-8 h-8 text-orange-600 flex-shrink-0" />
              <div>
                <h2 className="text-lg font-bold text-orange-800 mb-2">
                  ⚠️ Προσοχή - Επαναφορά Δεδομένων
                </h2>
                <ul className="space-y-1 text-orange-700 text-sm">
                  <li>• Η επαναφορά μπορεί να αλλάξει ή διαγράψει υπάρχοντα δεδομένα</li>
                  <li>• Συνιστάται να κάνετε backup πριν την επαναφορά</li>
                  <li>• Χρησιμοποιήστε πρώτα την προεπισκόπηση</li>
                </ul>
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div className="bg-white border rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-orange-50 border-b">
              <h3 className="font-semibold text-orange-800">📁 Επιλογή Αρχείου Backup</h3>
            </div>
            <div className="p-6">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-all"
              >
                {selectedFile ? (
                  <div>
                    <FileJson className="w-12 h-12 text-orange-600 mx-auto mb-2" />
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">Κάντε κλικ ή σύρετε το αρχείο backup (.json)</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Backup Info */}
          {backupData && (
            <div className="bg-white border rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b">
                <h3 className="font-semibold">📋 Πληροφορίες Backup</h3>
              </div>
              <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Έκδοση</p>
                  <p className="font-medium">{backupData.meta?.version}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Ημερομηνία</p>
                  <p className="font-medium">
                    {backupData.meta?.created_at 
                      ? new Date(backupData.meta.created_at).toLocaleString('el-GR')
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Τύπος</p>
                  <p className="font-medium">{backupData.meta?.backup_type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Δημιουργός</p>
                  <p className="font-medium">{backupData.meta?.created_by}</p>
                </div>
              </div>
              
              {/* Data Preview */}
              {backupData.meta?.statistics && (
                <div className="px-4 pb-4">
                  <p className="text-sm text-gray-500 mb-2">Περιεχόμενα:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(backupData.meta.statistics).map(([key, count]) => (
                      <span key={key} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                        {key}: <strong>{String(count)}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Preview Button */}
          {backupData && !restorePreview && (
            <button
              onClick={handlePreview}
              disabled={isRestoring}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 disabled:opacity-50 font-medium"
            >
              {isRestoring ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Φόρτωση προεπισκόπησης...
                </>
              ) : (
                <>
                  <Eye className="w-5 h-5" />
                  Προεπισκόπηση
                </>
              )}
            </button>
          )}

          {/* Restore Preview */}
          {restorePreview && (
            <div className="bg-white border rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-blue-50 border-b">
                <h3 className="font-semibold text-blue-800">👁️ Προεπισκόπηση Επαναφοράς</h3>
              </div>
              <div className="p-4">
                {restorePreview.preview && Object.entries(restorePreview.preview).map(([key, value]: [string, any]) => (
                  <div key={key} className="mb-4">
                    <p className="font-medium">{key}: {value.count} εγγραφές</p>
                    {value.sample && value.sample.length > 0 && (
                      <div className="mt-2 bg-gray-50 p-2 rounded text-sm overflow-auto max-h-32">
                        <pre>{JSON.stringify(value.sample, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Restore Mode Selection */}
          {restorePreview && (
            <div className="bg-white border rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b">
                <h3 className="font-semibold">🔧 Τρόπος Επαναφοράς</h3>
              </div>
              <div className="p-4 space-y-3">
                {restoreModes.filter(m => m.id !== 'preview').map((mode) => (
                  <div
                    key={mode.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedRestoreMode === mode.id 
                        ? 'border-orange-500 bg-orange-50' 
                        : 'hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedRestoreMode(mode.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {mode.name}
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${getDangerColor(mode.danger_level)}`}>
                            {mode.danger_level.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">{mode.description}</p>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        selectedRestoreMode === mode.id 
                          ? 'border-orange-500 bg-orange-500' 
                          : 'border-gray-300'
                      }`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Confirmation */}
          {restorePreview && selectedRestoreMode !== 'preview' && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
              <h3 className="font-bold text-red-800 mb-4">
                ⚠️ Επιβεβαίωση Επαναφοράς
              </h3>
              <p className="text-sm text-red-700 mb-4">
                Για να συνεχίσετε, πληκτρολογήστε: <code className="bg-red-100 px-2 py-0.5 rounded">CONFIRM_RESTORE</code>
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="CONFIRM_RESTORE"
                className="w-full px-3 py-2 border border-red-300 rounded-lg focus:border-red-500 focus:ring-red-500 mb-4"
              />
              
              {confirmText === 'CONFIRM_RESTORE' && (
                <button
                  onClick={handleRestore}
                  disabled={isRestoring}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                >
                  {isRestoring ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Επαναφορά σε εξέλιξη...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-5 h-5" />
                      🔄 ΕΚΤΕΛΕΣΗ ΕΠΑΝΑΦΟΡΑΣ
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


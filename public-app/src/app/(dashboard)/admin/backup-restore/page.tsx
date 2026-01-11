'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost, apiDelete, getApiUrl } from '@/lib/api';
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
  Eye,
  Cloud,
  Laptop,
  Server,
  History,
  Trash2,
  Clock
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

interface StorageLocation {
  id: 'local' | 'server' | 'google_drive' | 'dropbox' | 'onedrive';
  name: string;
  icon: React.ReactNode;
  description: string;
  available: boolean;
  configured?: boolean;
}

interface BackupHistory {
  id: string;
  filename: string;
  created_at: string;
  backup_type: string;
  size_kb: number;
  storage: string;
  can_restore: boolean;
}

// Storage locations configuration
const STORAGE_LOCATIONS: StorageLocation[] = [
  {
    id: 'local',
    name: 'Τοπική Αποθήκευση',
    icon: <Laptop className="w-6 h-6" />,
    description: 'Λήψη αρχείου στον υπολογιστή σας',
    available: true,
    configured: true
  },
  {
    id: 'server',
    name: 'Server',
    icon: <Server className="w-6 h-6" />,
    description: 'Αποθήκευση στον server της εφαρμογής',
    available: true,
    configured: true
  },
  {
    id: 'google_drive',
    name: 'Google Drive',
    icon: <Cloud className="w-6 h-6 text-blue-500" />,
    description: 'Αποθήκευση στο Google Drive σας',
    available: true,
    configured: false
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    icon: <Cloud className="w-6 h-6 text-blue-600" />,
    description: 'Αποθήκευση στο Dropbox σας',
    available: true,
    configured: false
  },
  {
    id: 'onedrive',
    name: 'OneDrive',
    icon: <Cloud className="w-6 h-6 text-sky-500" />,
    description: 'Αποθήκευση στο OneDrive σας',
    available: true,
    configured: false
  }
];

export default function BackupRestorePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = !!user && (user.role === 'admin' || user.is_superuser || user.is_staff);

  // Backup state
  const [backupTypes, setBackupTypes] = useState<BackupType[]>([]);
  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [selectedBackupType, setSelectedBackupType] = useState('full');
  const [selectedBuildings, setSelectedBuildings] = useState<number[]>([]);
  const [includeTransactions, setIncludeTransactions] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isBackingUp, setIsBackingUp] = useState(false);

  // Storage selection
  const [selectedStorage, setSelectedStorage] = useState<StorageLocation['id']>('local');
  const [backupHistory, setBackupHistory] = useState<BackupHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [restoreSource, setRestoreSource] = useState<'file' | 'server'>('file');

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
    if (authLoading || !user || !isAdmin) return;
    loadBackupOptions();
    loadRestoreOptions();
    loadBackupHistory();
  }, [authLoading, isAdmin, user]);

  const loadBackupHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const data = await apiGet<{ backups?: BackupHistory[] }>('/financial/admin/backup/history/');

      if (data.backups) {
        setBackupHistory(data.backups);
      }
    } catch (err) {
      console.error('Error loading backup history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const loadBackupOptions = async () => {
    try {
      const data = await apiGet<{ backup_types?: BackupType[]; available_buildings?: BuildingOption[] }>('/financial/admin/backup/');

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
      const data = await apiGet<{ restore_modes?: RestoreMode[] }>('/financial/admin/restore/');

      if (data.restore_modes) {
        setRestoreModes(data.restore_modes);
      }
    } catch (err) {
      console.error('Error loading restore options:', err);
    }
  };

  // Handle backup
  const handleBackup = async () => {
    setIsBackingUp(true);
    setError(null);
    setResult(null);

    try {
      // For local storage, we need raw fetch to handle blob download
      if (selectedStorage === 'local') {
        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') || localStorage.getItem('access_token') || localStorage.getItem('access') : null;
        const response = await fetch(getApiUrl('/financial/admin/backup/'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          credentials: 'include',
          body: JSON.stringify({
            backup_type: selectedBackupType,
            building_ids: selectedBuildings.length > 0 ? selectedBuildings : undefined,
            include_transactions: includeTransactions,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
            storage: selectedStorage
          })
        });

        if (response.ok) {
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
      } else {
        // For server/cloud storage, use apiPost
        const data = await apiPost<{ message?: string; error?: string }>('/financial/admin/backup/', {
          backup_type: selectedBackupType,
          building_ids: selectedBuildings.length > 0 ? selectedBuildings : undefined,
          include_transactions: includeTransactions,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          storage: selectedStorage
        });

        setResult({
          status: 'success',
          message: data.message || '✅ Backup αποθηκεύτηκε επιτυχώς!',
          data: data
        });
        // Refresh history
        loadBackupHistory();
      }
    } catch (err) {
      console.error('[Backup] Error:', err);
      setError('Σφάλμα σύνδεσης με τον server');
    } finally {
      setIsBackingUp(false);
    }
  };

  // Handle restore from server backup
  const handleRestoreFromServer = async (backupId: string) => {
    setIsRestoring(true);
    setError(null);

    try {
      const data = await apiGet<{ backup_data?: unknown }>(`/financial/admin/backup/history/${backupId}/`);

      if (data.backup_data) {
        setBackupData(data.backup_data);
        setRestoreSource('server');
        setActiveTab('restore');
        // Auto-preview
        handlePreview();
      } else {
        setError('Δεν βρέθηκε το backup');
      }
    } catch (err) {
      console.error('[Restore] Error loading backup:', err);
      setError('Σφάλμα φόρτωσης backup');
    } finally {
      setIsRestoring(false);
    }
  };

  // Handle delete server backup
  const handleDeleteBackup = async (backupId: string) => {
    if (!confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το backup;')) return;

    try {
      await apiDelete(`/financial/admin/backup/history/${backupId}/`);
      loadBackupHistory();
      setResult({
        status: 'success',
        message: '✅ Το backup διαγράφηκε'
      });
    } catch (err) {
      console.error('[Backup] Delete error:', err);
      setError('Σφάλμα διαγραφής');
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
      const data = await apiPost<{ status?: string; error?: string }>('/financial/admin/restore/', {
        backup_data: backupData,
        mode: 'preview'
      });

      if (data.status === 'preview') {
        setRestorePreview(data);
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      console.error('[Restore] Preview error:', err);
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
      const data = await apiPost<{ status?: string; message?: string; error?: string; result?: unknown }>('/financial/admin/restore/', {
        backup_data: backupData,
        mode: selectedRestoreMode,
        confirm: 'CONFIRM_RESTORE'
      });

      if (data.status === 'success') {
        setResult({
          status: 'success',
          message: data.message || 'Επαναφορά ολοκληρώθηκε',
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
      console.error('[Restore] Execute error:', err);
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
            <h1 className="page-title-sm">
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
          {/* Storage Location Selection */}
          <div className="bg-white border rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 border-b">
              <h3 className="font-semibold text-gray-800">📍 Τοποθεσία Αποθήκευσης</h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {STORAGE_LOCATIONS.map((storage) => (
                  <div
                    key={storage.id}
                    className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all text-center ${
                      selectedStorage === storage.id
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : storage.configured
                          ? 'hover:border-gray-300 hover:shadow-sm'
                          : 'opacity-60 cursor-not-allowed'
                    }`}
                    onClick={() => storage.configured && setSelectedStorage(storage.id)}
                  >
                    <div className="flex justify-center mb-2">
                      {storage.icon}
                    </div>
                    <div className="font-medium text-sm">{storage.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{storage.description}</div>

                    {!storage.configured && (
                      <div className="absolute top-2 right-2">
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                          Soon
                        </span>
                      </div>
                    )}

                    {selectedStorage === storage.id && (
                      <div className="absolute top-2 left-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Cloud setup hint */}
              {(selectedStorage === 'google_drive' || selectedStorage === 'dropbox' || selectedStorage === 'onedrive') && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <AlertTriangle className="w-4 h-4" />
                    <span>
                      Η σύνδεση με cloud υπηρεσίες θα είναι διαθέσιμη σύντομα.
                      Προς το παρόν, χρησιμοποιήστε Τοπική Αποθήκευση ή Server.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

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
            disabled={isBackingUp || !STORAGE_LOCATIONS.find(s => s.id === selectedStorage)?.configured}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium text-lg shadow-lg"
          >
            {isBackingUp ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Δημιουργία backup...
              </>
            ) : (
              <>
                {selectedStorage === 'local' ? <Download className="w-6 h-6" /> : <Cloud className="w-6 h-6" />}
                {selectedStorage === 'local' ? '📥 Λήψη Backup' : '☁️ Αποθήκευση Backup'}
              </>
            )}
          </button>

          {/* Backup History (Server) */}
          {backupHistory.length > 0 && (
            <div className="bg-white border rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Ιστορικό Backup (Server)
                </h3>
                <button
                  onClick={loadBackupHistory}
                  disabled={isLoadingHistory}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <div className="divide-y max-h-64 overflow-y-auto">
                {backupHistory.map((backup) => (
                  <div key={backup.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <FileJson className="w-8 h-8 text-blue-500" />
                      <div>
                        <p className="font-medium text-sm">{backup.filename}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          {new Date(backup.created_at).toLocaleString('el-GR')}
                          <span className="bg-gray-100 px-2 py-0.5 rounded">{backup.backup_type}</span>
                          <span>{backup.size_kb} KB</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRestoreFromServer(backup.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Επαναφορά"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteBackup(backup.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Διαγραφή"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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

          {/* Restore Source Selection */}
          <div className="bg-white border rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-orange-50 border-b">
              <h3 className="font-semibold text-orange-800">📍 Πηγή Επαναφοράς</h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div
                  className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                    restoreSource === 'file'
                      ? 'border-orange-500 bg-orange-50'
                      : 'hover:border-gray-300'
                  }`}
                  onClick={() => setRestoreSource('file')}
                >
                  <div className="flex items-center gap-3">
                    <Laptop className="w-6 h-6 text-orange-600" />
                    <div>
                      <div className="font-medium">Τοπικό Αρχείο</div>
                      <div className="text-sm text-gray-500">Ανεβάστε αρχείο από τον υπολογιστή</div>
                    </div>
                  </div>
                </div>
                <div
                  className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                    restoreSource === 'server'
                      ? 'border-orange-500 bg-orange-50'
                      : 'hover:border-gray-300'
                  }`}
                  onClick={() => setRestoreSource('server')}
                >
                  <div className="flex items-center gap-3">
                    <Server className="w-6 h-6 text-orange-600" />
                    <div>
                      <div className="font-medium">Server Backup</div>
                      <div className="text-sm text-gray-500">Επιλέξτε από αποθηκευμένα backups</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* File Upload (when source is file) */}
          {restoreSource === 'file' && (
            <div className="bg-white border rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b">
                <h3 className="font-semibold">📁 Επιλογή Αρχείου Backup</h3>
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
          )}

          {/* Server Backups List (when source is server) */}
          {restoreSource === 'server' && (
            <div className="bg-white border rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
                <h3 className="font-semibold">🗄️ Διαθέσιμα Backups</h3>
                <button
                  onClick={loadBackupHistory}
                  disabled={isLoadingHistory}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <div className="divide-y max-h-80 overflow-y-auto">
                {isLoadingHistory ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                  </div>
                ) : backupHistory.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Server className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>Δεν υπάρχουν αποθηκευμένα backups</p>
                    <p className="text-sm">Δημιουργήστε ένα backup με αποθήκευση στον Server</p>
                  </div>
                ) : (
                  backupHistory.map((backup) => (
                    <div
                      key={backup.id}
                      className="p-4 flex items-center justify-between hover:bg-orange-50 cursor-pointer"
                      onClick={() => handleRestoreFromServer(backup.id)}
                    >
                      <div className="flex items-center gap-3">
                        <FileJson className="w-10 h-10 text-orange-500" />
                        <div>
                          <p className="font-medium">{backup.filename}</p>
                          <p className="text-sm text-gray-500 flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            {new Date(backup.created_at).toLocaleString('el-GR')}
                            <span className="bg-gray-100 px-2 py-0.5 rounded">{backup.backup_type}</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-orange-600">
                        <RefreshCw className="w-5 h-5" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

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

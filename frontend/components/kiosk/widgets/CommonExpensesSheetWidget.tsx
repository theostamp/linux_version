// components/kiosk/widgets/CommonExpensesSheetWidget.tsx
'use client';

import { useState, useEffect } from 'react';
import { FileText, Calendar, RefreshCw, AlertCircle } from 'lucide-react';

interface CommonExpensesSheetWidgetProps {
  data?: any;
  settings?: {
    title?: string;
    showTitle?: boolean;
    backgroundColor?: string;
    refreshInterval?: number;
    imageQuality?: number;
    fitMode?: 'contain' | 'cover';
  };
  buildingId?: number | null;
}

interface BillData {
  success: boolean;
  image_data?: string;
  filename?: string;
  metadata?: {
    period?: string;
    building_name?: string;
    timestamp?: string;
    uploaded_at?: string;
    file_size?: number;
  };
  error?: string;
}

export default function CommonExpensesSheetWidget({
  data,
  settings = {},
  buildingId
}: CommonExpensesSheetWidgetProps) {
  const [billData, setBillData] = useState<BillData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const {
    title = 'Φύλλο Κοινοχρήστων',
    showTitle = true,
    backgroundColor = '#ffffff',
    refreshInterval = 3600000, // 1 hour
    imageQuality = 95,
    fitMode = 'contain'
  } = settings;

  const fetchLatestBill = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Call the backend API to get latest bill
      const response = await fetch(`/api/kiosk/latest-common-expense-bill/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-Host': 'demo.localhost',
        },
        body: JSON.stringify({
          building_id: buildingId || 1
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data: BillData = await response.json();
      
      if (data.success && data.image_data) {
        setBillData(data);
        setLastRefresh(new Date());
        console.log(`✅ [CommonExpensesSheet] Loaded bill: ${data.filename}`);
      } else {
        setError(data.error || 'Δεν βρέθηκε φύλλο κοινοχρήστων');
      }
    } catch (err: any) {
      console.error('[CommonExpensesSheet] Error:', err);
      setError('Σφάλμα φόρτωσης φύλλου κοινοχρήστων');
    } finally {
      setIsLoading(false);
    }
  };

  // Load on mount
  useEffect(() => {
    fetchLatestBill();
  }, [buildingId]);

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(() => {
        fetchLatestBill();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  // Loading state
  if (isLoading) {
    return (
      <div 
        className="h-full w-full flex items-center justify-center"
        style={{ backgroundColor }}
      >
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Φόρτωση φύλλου κοινοχρήστων...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !billData?.image_data) {
    return (
      <div 
        className="h-full w-full flex items-center justify-center p-8"
        style={{ backgroundColor }}
      >
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            Δεν υπάρχει διαθέσιμο φύλλο
          </h3>
          <p className="text-gray-600 mb-4">
            {error || 'Το φύλλο κοινοχρήστων δεν έχει δημιουργηθεί ακόμα για αυτόν τον μήνα.'}
          </p>
          <div className="text-sm text-gray-500">
            <FileText className="w-5 h-5 inline mr-2" />
            Το φύλλο θα εμφανιστεί αυτόματα όταν δημιουργηθεί
          </div>
        </div>
      </div>
    );
  }

  // Success - Display the bill
  return (
    <div 
      className="h-full w-full flex flex-col"
      style={{ backgroundColor }}
    >
      {/* Header */}
      {showTitle && (
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="w-6 h-6" />
              <div>
                <h2 className="text-xl font-bold">{title}</h2>
                {billData.metadata?.period && (
                  <p className="text-sm text-blue-100">
                    Περίοδος: {billData.metadata.period}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right text-sm text-blue-100">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>
                  {billData.metadata?.uploaded_at 
                    ? new Date(billData.metadata.uploaded_at).toLocaleDateString('el-GR')
                    : 'Σήμερα'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bill Image */}
      <div className="flex-1 overflow-hidden relative bg-gray-50">
        <img
          src={billData.image_data}
          alt="Φύλλο Κοινοχρήστων"
          className={`w-full h-full ${
            fitMode === 'contain' ? 'object-contain' : 'object-cover'
          }`}
          style={{
            imageRendering: 'auto' as any,
          }}
        />
        
        {/* Metadata overlay (bottom right) */}
        <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4" />
            <span>{billData.filename}</span>
          </div>
          {billData.metadata?.file_size && (
            <div className="text-xs text-gray-300 mt-1">
              Μέγεθος: {(billData.metadata.file_size / 1024).toFixed(1)} KB
            </div>
          )}
        </div>
      </div>

      {/* Footer with refresh info */}
      <div className="flex-shrink-0 bg-gray-100 px-4 py-2 text-center text-sm text-gray-600 border-t">
        <div className="flex items-center justify-center space-x-2">
          <RefreshCw className="w-4 h-4" />
          <span>
            Τελευταία ενημέρωση: {lastRefresh.toLocaleTimeString('el-GR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        </div>
      </div>
    </div>
  );
}




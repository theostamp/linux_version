'use client';

import { BaseWidgetProps } from '@/types/kiosk';
import { FileText, Image, Calendar, Euro } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function CommonExpenseBillWidget({ data, isLoading, error }: BaseWidgetProps) {
  const [billImageUrl, setBillImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  // Check for latest common expense bill from kiosk API
  useEffect(() => {
    const fetchLatestBill = async () => {
      try {
        setImageLoading(true);
        console.log('[CommonExpenseBill] Fetching latest bill...');
        
        // Use Next.js API route proxy (better for CORS and Docker network)
        const response = await fetch('/api/kiosk-latest-bill', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.image_data) {
            console.log('Latest bill found:', result.filename);
            setBillImageUrl(result.image_data);
            setImageError(false);
          } else {
            console.log('No bill found in kiosk API');
            setImageError(true);
          }
        } else {
          console.warn('Failed to fetch latest bill from kiosk API:', response.status);
          setImageError(true);
        }
      } catch (err) {
        console.error('Error fetching latest bill from kiosk API:', err);
        setImageError(true);
      } finally {
        setImageLoading(false);
      }
    };

    fetchLatestBill();
  }, []);

  if (isLoading || imageLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-300"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-300">
        <div className="text-center">
          <div className="text-2xl mb-2">⚠️</div>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden">
      {/* NO HEADER - Direct display for scene mode */}
      <div className="h-full overflow-y-auto">
        {imageLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-300 mx-auto mb-3"></div>
              <p className="text-emerald-300 text-sm">Φόρτωση φύλλου κοινόχρηστων...</p>
            </div>
          </div>
        ) : billImageUrl && !imageError ? (
          // Display the actual common expense bill image - FULL CONTAINER FIT
          // Blue theme background matching the scene palette
          <div className="bg-gradient-to-br from-slate-800 via-slate-750 to-blue-900 rounded-lg h-full w-full flex items-center justify-center p-3 overflow-hidden">
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={billImageUrl}
                alt="Φύλλο Κοινόχρηστων"
                className="w-full h-full object-contain drop-shadow-2xl"
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  imageRendering: 'auto' as any,
                  filter: 'drop-shadow(0 10px 30px rgba(0, 0, 0, 0.5))'
                }}
                onError={() => setImageError(true)}
              />
              {/* Minimal badge overlay - matching blue theme */}
              <div className="absolute top-3 left-3 bg-blue-500/80 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-lg shadow-xl flex items-center space-x-1.5 border border-blue-400/30">
                <FileText className="w-3.5 h-3.5" />
                <span className="font-semibold tracking-wide">Φύλλο Κοινοχρήστων</span>
              </div>
            </div>
          </div>
        ) : (
          // Fallback: Common expense information with export instructions
          <div className="bg-white rounded-lg p-4 h-full flex items-center justify-center">
            <div className="text-center max-w-full">
              <div className="bg-gradient-to-br from-emerald-100 to-green-100 rounded-xl p-6 border-2 border-emerald-200 shadow-lg">
                <div className="text-6xl mb-4">🧾</div>
                <h3 className="text-xl font-bold text-emerald-800 mb-2">Φύλλο Κοινόχρηστων</h3>
                <p className="text-emerald-600 text-sm mb-4">
                  Για να εμφανιστεί το φύλλο κοινόχρηστων, εξάγετέ το πρώτα από το Dashboard
                </p>
                
                
                {/* Instructions */}
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 mb-4">
                  <div className="text-xs text-emerald-700">
                    <p className="font-semibold mb-1">Οδηγίες εξαγωγής:</p>
                    <ol className="list-decimal list-inside space-y-1 text-left">
                      <li>Συνδεθείτε στο Dashboard</li>
                      <li>Πηγαίνετε στα Οικονομικά</li>
                      <li>Επιλέξτε "Εξαγωγή Φύλλου Κοινόχρηστων"</li>
                      <li>Το φύλλο θα εμφανιστεί εδώ</li>
                    </ol>
                  </div>
                </div>
                
                
                    {/* Refresh button */}
                    <button 
                      onClick={async () => {
                        setImageLoading(true);
                        setImageError(false);
                        
                        try {
                          const response = await fetch('/api/kiosk-latest-bill', {
                            cache: 'no-store',
                          });
                          const result = await response.json();
                          
                          if (result.success && result.image_data) {
                            setBillImageUrl(result.image_data);
                            setImageError(false);
                          } else {
                            setImageError(true);
                          }
                        } catch (err) {
                          console.error('Error refreshing bill:', err);
                          setImageError(true);
                        } finally {
                          setImageLoading(false);
                        }
                      }}
                      className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                      Ανανέωση
                    </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

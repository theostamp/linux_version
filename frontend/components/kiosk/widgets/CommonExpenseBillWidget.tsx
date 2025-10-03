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
        console.log('Fetching latest common expense bill from kiosk API...');
        
        // Get the correct API base URL
        const apiBaseUrl = typeof window !== 'undefined' 
          ? `http://${window.location.hostname}:18000/api`
          : 'http://localhost:18000/api';
        
        const response = await fetch(`${apiBaseUrl}/kiosk/latest-bill/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
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
      <div className="flex items-center space-x-2 mb-4 pb-2 border-b border-emerald-500/20">
        <FileText className="w-6 h-6 text-emerald-300" />
        <h2 className="text-lg font-bold text-white">Φύλλο Κοινόχρηστων</h2>
      </div>
      
      <div className="h-full overflow-y-auto">
        {imageLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-300 mx-auto mb-3"></div>
              <p className="text-emerald-300 text-sm">Φόρτωση φύλλου κοινόχρηστων...</p>
            </div>
          </div>
        ) : billImageUrl && !imageError ? (
          // Display the actual common expense bill image
          <div className="bg-white rounded-lg p-4 h-full flex items-center justify-center">
            <div className="relative max-w-full max-h-full">
              <img
                src={billImageUrl}
                alt="Φύλλο Κοινόχρηστων"
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                onError={() => setImageError(true)}
              />
              <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                <FileText className="w-3 h-3 inline mr-1" />
                Κοινόχρηστα
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
                
                {/* Current month info */}
                <div className="bg-white p-4 rounded-lg border border-emerald-200 mb-4 text-left">
                  <h4 className="font-semibold text-emerald-700 mb-2">Δεκέμβριος 2024</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Συνολικό ποσό:</span>
                      <span className="font-semibold">€2,450.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Μερίδιο ανά διαμέρισμα:</span>
                      <span className="font-semibold text-emerald-600">€122.50</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Προθεσμία πληρωμής:</span>
                      <span className="text-emerald-600">31/01/2025</span>
                    </div>
                  </div>
                </div>
                
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
                
                {/* Additional info */}
                <div className="space-y-2 text-sm text-emerald-700">
                  <div className="flex items-center justify-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date().toLocaleDateString('el-GR')}</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <Euro className="w-4 h-4" />
                    <span>IBAN: GR12 3456 7890 1234 5678 9012 345</span>
                  </div>
                </div>
                
                    {/* Refresh button */}
                    <button 
                      onClick={() => {
                        setImageLoading(true);
                        setImageError(false);
                        // Get the correct API base URL
                        const apiBaseUrl = typeof window !== 'undefined' 
                          ? `http://${window.location.hostname}:18000/api`
                          : 'http://localhost:18000/api';
                        
                        // Re-fetch the latest bill
                        fetch(`${apiBaseUrl}/kiosk/latest-bill/`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                        })
                        .then(response => response.json())
                        .then(result => {
                          if (result.success && result.image_data) {
                            setBillImageUrl(result.image_data);
                            setImageError(false);
                          } else {
                            setImageError(true);
                          }
                        })
                        .catch(err => {
                          console.error('Error refreshing bill:', err);
                          setImageError(true);
                        })
                        .finally(() => {
                          setImageLoading(false);
                        });
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

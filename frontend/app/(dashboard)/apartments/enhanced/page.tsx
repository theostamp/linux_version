'use client';

import { useState, useEffect } from 'react';
import { ApartmentList, fetchApartments } from '@/lib/api';
import ApartmentTableEnhanced from '@/components/ApartmentTableEnhanced';
import { Button } from '@/components/ui/button';
import { RefreshCw, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function EnhancedApartmentsPage() {
  const [apartments, setApartments] = useState<ApartmentList[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadApartments = async () => {
    try {
      setLoading(true);
      const data = await fetchApartments();
      setApartments(data);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Σφάλμα κατά τη φόρτωση διαμερισμάτων');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadApartments();
    setRefreshing(false);
    toast.success('Ενημερώθηκαν τα δεδομένα');
  };

  useEffect(() => {
    loadApartments();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Φόρτωση διαμερισμάτων...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Διαμερίσματα - Βελτιωμένη Προβολή
        </h1>
        <p className="text-gray-600">
          Προβολή όλων των διαμερισμάτων με ευέλικτο πλάτος στηλών και κάθετους τίτλους χιλιοστών
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-gray-800">
                Λίστα Διαμερισμάτων
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {apartments.length} διαμερίσματα συνολικά
              </p>
            </div>
            <div className="flex space-x-3">
              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Ανανέωση
              </Button>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Νέο Διαμέρισμα
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6">
          <ApartmentTableEnhanced
            apartments={apartments}
            onRefresh={loadApartments}
          />
        </div>
      </div>

      {/* Στατιστικά */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Συνολικά Χιλιοστά Συμμετοχής</h3>
          <p className="text-2xl font-bold text-blue-600">
            {apartments.reduce((sum, apt) => sum + (apt.participation_mills || 0), 0)}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Συνολικά Χιλιοστά Θέρμανσης</h3>
          <p className="text-2xl font-bold text-orange-600">
            {apartments.reduce((sum, apt) => sum + (apt.heating_mills || 0), 0)}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Συνολικά Χιλιοστά Ανελκυστήρα</h3>
          <p className="text-2xl font-bold text-purple-600">
            {apartments.reduce((sum, apt) => sum + (apt.elevator_mills || 0), 0)}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Ενοικιασμένα</h3>
          <p className="text-2xl font-bold text-green-600">
            {apartments.filter(apt => apt.is_rented).length}
          </p>
        </div>
      </div>
    </div>
  );
}

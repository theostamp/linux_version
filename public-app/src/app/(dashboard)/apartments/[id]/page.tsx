'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  ArrowLeft,
  Building2,
  User,
  Phone,
  Mail,
  Euro,
  Home,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface Apartment {
  id: number;
  name: string;
  floor: number;
  area: number;
  ratio: number;
  building: number;
  building_name?: string;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  resident_name?: string;
  resident_email?: string;
  resident_phone?: string;
  balance?: number;
  is_rented?: boolean;
  notes?: string;
}

export default function ApartmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apartmentId = params.id as string;

  useEffect(() => {
    const fetchApartment = async () => {
      try {
        setIsLoading(true);
        const response = await api.get(`/api/apartments/${apartmentId}/`);
        setApartment(response.data || response);
      } catch (err) {
        console.error('Error fetching apartment:', err);
        setError('Δεν βρέθηκε το διαμέρισμα');
      } finally {
        setIsLoading(false);
      }
    };

    if (apartmentId) {
      fetchApartment();
    }
  }, [apartmentId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !apartment) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-red-800 mb-2">{error || 'Σφάλμα'}</h2>
          <button
            onClick={() => router.push('/apartments')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Επιστροφή στα Διαμερίσματα
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/apartments')}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{apartment.name}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            {apartment.building_name || `Κτίριο #${apartment.building}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Βασικές Πληροφορίες */}
        <div className="bg-card rounded-xl border border-secondary p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Home className="w-5 h-5 text-primary" />
            Στοιχεία Διαμερίσματος
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-secondary">
              <span className="text-muted-foreground">Όροφος</span>
              <span className="font-medium text-foreground">{apartment.floor}ος</span>
            </div>
            <div className="flex justify-between py-2 border-b border-secondary">
              <span className="text-muted-foreground">Εμβαδόν</span>
              <span className="font-medium text-foreground">{apartment.area} τ.μ.</span>
            </div>
            <div className="flex justify-between py-2 border-b border-secondary">
              <span className="text-muted-foreground">Χιλιοστά</span>
              <span className="font-medium text-foreground">{apartment.ratio}‰</span>
            </div>
            <div className="flex justify-between py-2 border-b border-secondary">
              <span className="text-muted-foreground">Κατάσταση</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                apartment.is_rented
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-teal-100 text-teal-700'
              }`}>
                {apartment.is_rented ? 'Ενοικιαζόμενο' : 'Ιδιοκατοίκηση'}
              </span>
            </div>
            {apartment.balance !== undefined && (
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Υπόλοιπο</span>
                <span className={`font-semibold ${
                  apartment.balance > 0 ? 'text-rose-600' : 'text-teal-600'
                }`}>
                  {apartment.balance.toLocaleString('el-GR', { style: 'currency', currency: 'EUR' })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Ιδιοκτήτης */}
        <div className="bg-card rounded-xl border border-secondary p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Ιδιοκτήτης
          </h2>
          {apartment.owner_name ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 py-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium text-foreground">{apartment.owner_name}</span>
              </div>
              {apartment.owner_email && (
                <div className="flex items-center gap-3 py-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <a href={`mailto:${apartment.owner_email}`} className="text-primary hover:underline">
                    {apartment.owner_email}
                  </a>
                </div>
              )}
              {apartment.owner_phone && (
                <div className="flex items-center gap-3 py-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <a href={`tel:${apartment.owner_phone}`} className="text-primary hover:underline">
                    {apartment.owner_phone}
                  </a>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Δεν έχει οριστεί ιδιοκτήτης</p>
          )}
        </div>

        {/* Ένοικος (αν είναι ενοικιαζόμενο) */}
        {apartment.is_rented && (
          <div className="bg-card rounded-xl border border-secondary p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-amber-500" />
              Ένοικος
            </h2>
            {apartment.resident_name ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 py-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">{apartment.resident_name}</span>
                </div>
                {apartment.resident_email && (
                  <div className="flex items-center gap-3 py-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <a href={`mailto:${apartment.resident_email}`} className="text-primary hover:underline">
                      {apartment.resident_email}
                    </a>
                  </div>
                )}
                {apartment.resident_phone && (
                  <div className="flex items-center gap-3 py-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <a href={`tel:${apartment.resident_phone}`} className="text-primary hover:underline">
                      {apartment.resident_phone}
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Δεν έχει οριστεί ένοικος</p>
            )}
          </div>
        )}

        {/* Σημειώσεις */}
        {apartment.notes && (
          <div className="bg-card rounded-xl border border-secondary p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground mb-4">Σημειώσεις</h2>
            <p className="text-muted-foreground whitespace-pre-wrap">{apartment.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

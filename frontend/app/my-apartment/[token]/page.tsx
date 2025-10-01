'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Building2, Euro, FileText, Wrench, TrendingUp, Calendar } from 'lucide-react';

interface ApartmentData {
  apartment: {
    id: number;
    number: string;
    building: {
      id: number;
      name: string;
      address: string;
    };
    owner_name: string;
    floor: number;
    square_meters: number;
  };
  common_expenses: {
    period: string;
    amount: number;
    previous_balance: number;
    total_due: number;
    due_date: string;
    breakdown: any;
  } | null;
  current_balance: number;
  announcements: Array<{
    id: number;
    title: string;
    description: string;
    is_urgent: boolean;
    priority: string;
    created_at: string;
  }>;
  transactions: Array<{
    id: number;
    date: string;
    description: string;
    amount: number;
    type: string;
    balance_after: number | null;
  }>;
  maintenance_requests: Array<{
    id: number;
    title: string;
    description: string;
    status: string;
    created_at: string;
  }>;
}

export default function MyApartmentPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<ApartmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(
          `${apiUrl}/api/personal/${token}/dashboard/`
        );

        if (!response.ok) {
          throw new Error('Invalid access token');
        }

        const json = await response.json();
        setData(json);
      } catch (err: any) {
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Φόρτωση...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Σφάλμα Πρόσβασης</h1>
          <p className="text-gray-600 mb-4">{error || 'Μη έγκυρο QR code'}</p>
          <p className="text-sm text-gray-500">
            Παρακαλώ χρησιμοποιήστε το σωστό QR code του διαμερίσματός σας.
          </p>
        </Card>
      </div>
    );
  }

  const { apartment, common_expenses, current_balance, announcements, transactions, maintenance_requests } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-8 px-4 shadow-lg">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Το Διαμέρισμά μου</h1>
          </div>
          <p className="text-indigo-100 text-lg">
            {apartment.building.name} - Διαμέρισμα {apartment.number}
          </p>
          {apartment.owner_name && (
            <p className="text-indigo-200 text-sm mt-1">{apartment.owner_name}</p>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-4 space-y-6 py-8">
        {/* Common Expenses Card */}
        {common_expenses && (
          <Card className="p-6 bg-white shadow-xl border-t-4 border-indigo-500">
            <div className="flex items-center gap-3 mb-4">
              <Euro className="w-6 h-6 text-indigo-600" />
              <h2 className="text-2xl font-bold text-gray-800">
                Κοινόχρηστα {common_expenses.period}
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Κοινόχρηστα Μήνα</p>
                <p className="text-2xl font-bold text-blue-600">
                  {common_expenses.amount.toFixed(2)}€
                </p>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Προηγούμενο Υπόλοιπο</p>
                <p className="text-2xl font-bold text-orange-600">
                  {common_expenses.previous_balance.toFixed(2)}€
                </p>
              </div>

              <div className="bg-indigo-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Σύνολο Πληρωμής</p>
                <p className="text-3xl font-bold text-indigo-600">
                  {common_expenses.total_due.toFixed(2)}€
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded">
              <Calendar className="w-4 h-4" />
              <span>Καταβολή έως: {common_expenses.due_date}</span>
            </div>
          </Card>
        )}

        {/* Balance Card */}
        <Card className="p-6 bg-white shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-bold text-gray-800">Τρέχον Υπόλοιπο</h2>
          </div>

          <div className={`text-3xl font-bold ${current_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {current_balance >= 0 ? '+' : ''}{current_balance.toFixed(2)}€
          </div>

          <p className="text-sm text-gray-500 mt-2">
            {current_balance >= 0 ? 'Πιστωτικό υπόλοιπο' : 'Οφειλή'}
          </p>
        </Card>

        {/* Announcements */}
        {announcements.length > 0 && (
          <Card className="p-6 bg-white shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-purple-600" />
              <h2 className="text-xl font-bold text-gray-800">
                Ανακοινώσεις ({announcements.length})
              </h2>
            </div>

            <div className="space-y-3">
              {announcements.slice(0, 5).map((ann) => (
                <div
                  key={ann.id}
                  className={`p-4 rounded-lg border-l-4 ${
                    ann.is_urgent ? 'border-red-500 bg-red-50' : 'border-blue-500 bg-blue-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 mb-1">{ann.title}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2">{ann.description}</p>
                    </div>
                    {ann.is_urgent && (
                      <span className="text-xs bg-red-500 text-white px-2 py-1 rounded">
                        ΕΠΕΙΓΟΝ
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(ann.created_at).toLocaleDateString('el-GR')}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Maintenance Requests */}
        {maintenance_requests.length > 0 && (
          <Card className="p-6 bg-white shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <Wrench className="w-6 h-6 text-orange-600" />
              <h2 className="text-xl font-bold text-gray-800">
                Αιτήματα Συντήρησης ({maintenance_requests.length})
              </h2>
            </div>

            <div className="space-y-3">
              {maintenance_requests.map((req) => (
                <div key={req.id} className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 mb-1">{req.title}</h3>
                      <p className="text-sm text-gray-600">{req.description}</p>
                    </div>
                    <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded">
                      {req.status === 'open' ? 'ΑΝΟΙΧΤΟ' : 'ΣΕ ΕΞΕΛΙΞΗ'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center py-8 text-gray-500 text-sm">
          <p>Powered by New Concierge</p>
          <p className="mt-2">Για περισσότερες πληροφορίες, επικοινωνήστε με τη διαχείριση</p>
        </div>
      </div>
    </div>
  );
}

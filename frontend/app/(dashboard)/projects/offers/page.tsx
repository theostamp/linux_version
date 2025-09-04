'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { makeRequestWithRetry } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Award, Filter } from 'lucide-react';

interface Offer {
  id: number;
  project: number;
  contractor: number;
  amount: number;
  description: string;
  status: string;
  submitted_date: string;
}

export default function OffersListPage() {
  const { selectedBuilding } = useBuilding();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    const fetchOffers = async () => {
      if (!selectedBuilding) return;
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, string | number> = { project__building: selectedBuilding.id };
        if (status) params['status'] = status;
        const resp = await makeRequestWithRetry({ method: 'get', url: '/projects/offers/', params });
        const data = resp.data;
        const rows = Array.isArray(data) ? data : data.results ?? data.data ?? [];
        setOffers(rows);
      } catch (err: any) {
        setError(err?.message ?? 'Αποτυχία φόρτωσης προσφορών');
      } finally {
        setLoading(false);
      }
    };
    fetchOffers();
  }, [selectedBuilding, status]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Προσφορές</h1>
          <p className="text-muted-foreground">Λίστα προσφορών ανά κτίριο</p>
        </div>
        <Button asChild>
          <Link href="/projects/offers/new">
            <Award className="w-4 h-4 mr-2" /> Νέα Προσφορά
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4" />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
        >
          <option value="">Όλες οι καταστάσεις</option>
          <option value="pending">Εκκρεμεί</option>
          <option value="under_review">Υπό Αξιολόγηση</option>
          <option value="accepted">Αποδεκτή</option>
          <option value="rejected">Απορριφθείσα</option>
          <option value="withdrawn">Αποσυρθείσα</option>
        </select>
      </div>

      {loading && <div>Φόρτωση...</div>}
      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {offers.map((offer) => (
          <Card key={offer.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Προσφορά #{offer.id}</span>
                <Badge variant="outline">{offer.status}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-1">
                <div>Ποσό: €{offer.amount.toLocaleString()}</div>
                <div>Υποβλήθηκε: {new Date(offer.submitted_date).toLocaleDateString()}</div>
                <div className="line-clamp-2 text-muted-foreground">{offer.description}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}


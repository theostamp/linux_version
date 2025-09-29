'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileCheck, Filter } from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';

interface Contract {
  id: number;
  contract_number: string;
  title: string;
  amount: number;
  status: string;
  start_date: string;
  end_date: string;
}

export default function ContractsListPage() {
  const { selectedBuilding } = useBuilding();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('active');

  useEffect(() => {
    const fetchContracts = async () => {
      if (!selectedBuilding) return;
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, string> = { project__building: String(selectedBuilding.id) } as any;
        if (status) params.status = status;
        const { data } = await api.get('/projects/contracts/', { params });
        setContracts(data?.results ?? data ?? []);
      } catch (err: any) {
        setError(err?.message ?? 'Αποτυχία φόρτωσης συμβολαίων');
      } finally {
        setLoading(false);
      }
    };
    fetchContracts();
  }, [selectedBuilding, status]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Συμβόλαια</h1>
          <p className="text-muted-foreground">Λίστα συμβολαίων ανά κτίριο</p>
        </div>
        <div className="flex items-center gap-2">
          <BackButton href="/projects" />
          <Button asChild variant="outline">
            <Link href="/projects/contracts/new">
              <FileCheck className="w-4 h-4 mr-2" /> Νέο Συμβόλαιο
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4" />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
        >
          <option value="">Όλες οι καταστάσεις</option>
          <option value="draft">Πρόχειρο</option>
          <option value="active">Ενεργό</option>
          <option value="completed">Ολοκληρωμένο</option>
          <option value="terminated">Λυμένο</option>
          <option value="expired">Ληγμένο</option>
        </select>
      </div>

      {loading && <div>Φόρτωση...</div>}
      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {contracts.map((contract) => (
          <Card key={contract.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{contract.contract_number} — {contract.title}</span>
                <Badge variant="outline">{contract.status}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-1">
                <div>Ποσό: €{contract.amount.toLocaleString()}</div>
                <div>Από {new Date(contract.start_date).toLocaleDateString()} μέχρι {new Date(contract.end_date).toLocaleDateString()}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}


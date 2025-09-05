'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { makeRequestWithRetry } from '@/lib/api';
import { useRole } from '@/lib/auth';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { BackButton } from '@/components/ui/BackButton';

interface ProjectOption { id: number; title: string; }
interface ContractorOption { id: number; name: string; }

export default function NewOfferPage() {
  const { isAdmin, isManager, isLoading } = useRole();
  const { selectedBuilding } = useBuilding();
  const router = useRouter();

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [contractors, setContractors] = useState<ContractorOption[]>([]);

  const [projectId, setProjectId] = useState<string>('');
  const [contractorId, setContractorId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState('');
  const [deliveryTime, setDeliveryTime] = useState<string>('');
  const [warrantyPeriod, setWarrantyPeriod] = useState<string>('');
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!selectedBuilding) return;
      try {
        const [projectsResp, contractorsResp] = await Promise.all([
          makeRequestWithRetry({ method: 'get', url: '/projects/projects/', params: { building: selectedBuilding.id } }),
          makeRequestWithRetry({ method: 'get', url: '/maintenance/contractors/' }),
        ]);
        setProjects(((projectsResp.data?.results ?? projectsResp.data) || []).map((p: any) => ({ id: p.id, title: p.title })));
        setContractors(((contractorsResp.data?.results ?? contractorsResp.data) || []).map((c: any) => ({ id: c.id, name: c.name })));
      } catch (e) {
        console.error('Failed to load select data', e);
      }
    };
    loadData();
  }, [selectedBuilding]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBuilding) return;
    setLoading(true);
    setError(null);
    try {
      const payload: any = {
        project: parseInt(projectId),
        contractor: parseInt(contractorId),
        amount: parseFloat(amount),
        description,
        delivery_time: parseInt(deliveryTime),
        warranty_period: parseInt(warrantyPeriod),
        status,
      };

      const resp = await makeRequestWithRetry({ method: 'post', url: '/projects/offers/', data: payload });
      if (!(resp?.status && resp.status >= 200 && resp.status < 300)) {
        throw new Error('Failed to create offer');
      }
      router.push('/projects/offers');
    } catch (err: any) {
      setError(err?.message ?? 'Αποτυχία δημιουργίας προσφοράς');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      {isLoading ? null : !(isAdmin || isManager) ? (
        <div className="text-sm text-red-600 mb-4">Δεν έχετε δικαίωμα δημιουργίας προσφοράς.</div>
      ) : null}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Νέα Προσφορά</CardTitle>
            <BackButton />
          </div>
        </CardHeader>
        <CardContent>
          {!selectedBuilding && (
            <div className="text-sm text-red-600 mb-4">Επιλέξτε κτίριο πρώτα.</div>
          )}
          {error && <div className="text-sm text-red-600 mb-4">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Έργο</label>
                <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="border rounded px-3 py-2 text-sm w-full" required>
                  <option value="" disabled>Επιλέξτε έργο</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Συνεργείο</label>
                <select value={contractorId} onChange={(e) => setContractorId(e.target.value)} className="border rounded px-3 py-2 text-sm w-full" required>
                  <option value="" disabled>Επιλέξτε συνεργείο</option>
                  {contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Ποσό (€)</label>
                <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Χρόνος Παράδοσης (ημέρες)</label>
                <Input type="number" value={deliveryTime} onChange={(e) => setDeliveryTime(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Περίοδος Εγγύησης (μήνες)</label>
                <Input type="number" value={warrantyPeriod} onChange={(e) => setWarrantyPeriod(e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Περιγραφή</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Κατάσταση</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="border rounded px-3 py-2 text-sm w-full">
                <option value="pending">Εκκρεμεί</option>
                <option value="under_review">Υπό Αξιολόγηση</option>
                <option value="accepted">Αποδεκτή</option>
                <option value="rejected">Απορριφθείσα</option>
                <option value="withdrawn">Αποσυρθείσα</option>
              </select>
            </div>
            <div className="pt-2">
              <Button type="submit" disabled={!selectedBuilding || loading}>
                {loading ? 'Δημιουργία...' : 'Δημιουργία'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


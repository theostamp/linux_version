'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface ProjectOption { id: number; title: string; }
interface ContractorOption { id: number; name: string; }

export default function NewContractPage() {
  const { selectedBuilding } = useBuilding();
  const router = useRouter();

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [contractors, setContractors] = useState<ContractorOption[]>([]);

  const [projectId, setProjectId] = useState<string>('');
  const [contractorId, setContractorId] = useState<string>('');
  const [offerId, setOfferId] = useState<string>('');
  const [contractType, setContractType] = useState('service');
  const [contractNumber, setContractNumber] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('draft');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [warrantyTerms, setWarrantyTerms] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!selectedBuilding) return;
      try {
        const qs = new URLSearchParams();
        qs.set('buildingId', String(selectedBuilding.id));
        const [projectsRes, contractorsRes] = await Promise.all([
          fetch(`/api/projects?${qs.toString()}`),
          fetch(`/api/maintenance/contractors`),
        ]);
        const [projectsJson, contractorsJson] = await Promise.all([
          projectsRes.json(),
          contractorsRes.json(),
        ]);
        if (projectsRes.ok && projectsJson?.success) {
          setProjects((projectsJson.data || []).map((p: any) => ({ id: p.id, title: p.title })));
        }
        if (contractorsRes.ok && contractorsJson?.success) {
          setContractors((contractorsJson.data || []).map((c: any) => ({ id: c.id, name: c.name })));
        }
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
        offer: offerId ? parseInt(offerId) : null,
        contract_type: contractType,
        contract_number: contractNumber,
        title,
        description,
        amount: parseFloat(amount),
        start_date: startDate,
        end_date: endDate,
        status,
        payment_terms: paymentTerms,
        warranty_terms: warrantyTerms,
      };

      const res = await fetch('/api/projects/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to create contract');
      router.push('/projects/contracts');
    } catch (err: any) {
      setError(err?.message ?? 'Αποτυχία δημιουργίας συμβολαίου');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Νέο Συμβόλαιο</CardTitle>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Αριθμός Συμβολαίου</label>
                <Input value={contractNumber} onChange={(e) => setContractNumber(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Τύπος Συμβολαίου</label>
                <select value={contractType} onChange={(e) => setContractType(e.target.value)} className="border rounded px-3 py-2 text-sm w-full">
                  <option value="service">Υπηρεσίες</option>
                  <option value="construction">Κατασκευή</option>
                  <option value="maintenance">Συντήρηση</option>
                  <option value="consulting">Σύμβουλος</option>
                  <option value="other">Άλλο</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Τίτλος</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Περιγραφή</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Ποσό (€)</label>
                <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Έναρξη</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Λήξη</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Κατάσταση</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="border rounded px-3 py-2 text-sm w-full">
                  <option value="draft">Πρόχειρο</option>
                  <option value="active">Ενεργό</option>
                  <option value="completed">Ολοκληρωμένο</option>
                  <option value="terminated">Λυμένο</option>
                  <option value="expired">Ληγμένο</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Όροι Εισπράξεως</label>
              <Textarea value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Όροι Εγγύησης</label>
              <Textarea value={warrantyTerms} onChange={(e) => setWarrantyTerms(e.target.value)} />
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


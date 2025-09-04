'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';

export default function NewProjectPage() {
  const { selectedBuilding } = useBuilding();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectType, setProjectType] = useState('maintenance');
  const [status, setStatus] = useState('planning');
  const [budget, setBudget] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBuilding) return;
    setLoading(true);
    setError(null);
    try {
      const payload: any = {
        title,
        description,
        building: selectedBuilding.id,
        project_type: projectType,
        status,
      };
      if (budget) payload.budget = parseFloat(budget);

      const { data } = await api.post('/projects/projects/', payload);
      router.push('/projects');
    } catch (err: any) {
      setError(err?.message ?? 'Αποτυχία δημιουργίας έργου');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Νέο Έργο</CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedBuilding && (
            <div className="text-sm text-red-600 mb-4">Επιλέξτε κτίριο πρώτα.</div>
          )}
          {error && <div className="text-sm text-red-600 mb-4">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Τίτλος</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Περιγραφή</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Τύπος Έργου</label>
                <select value={projectType} onChange={(e) => setProjectType(e.target.value)} className="border rounded px-3 py-2 text-sm w-full">
                  <option value="maintenance">Συντήρηση</option>
                  <option value="renovation">Ανακαίνιση</option>
                  <option value="construction">Κατασκευή</option>
                  <option value="installation">Εγκατάσταση</option>
                  <option value="repair">Επισκευή</option>
                  <option value="upgrade">Αναβάθμιση</option>
                  <option value="other">Άλλο</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Κατάσταση</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="border rounded px-3 py-2 text-sm w-full">
                  <option value="planning">Σχεδιασμός</option>
                  <option value="bidding">Διαγωνισμός</option>
                  <option value="awarded">Ανατεθειμένο</option>
                  <option value="in_progress">Σε Εξέλιξη</option>
                  <option value="completed">Ολοκληρωμένο</option>
                  <option value="cancelled">Ακυρώθηκε</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Προϋπολογισμός (€)</label>
              <Input type="number" step="0.01" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="π.χ. 10000" />
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


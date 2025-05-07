// frontend/components/CreateBuildingForm.tsx

'use client';

import { useState } from 'react';
import { Building, createBuilding, updateBuilding } from '@/lib/api';
import { useRouter } from 'next/navigation';
import useCsrf from '@/hooks/useCsrf';

interface Props {
  initialData?: Partial<Building>;
  onSuccessPath?: string;
  submitText: string;
  buildingId?: number;
}

export default function CreateBuildingForm({ initialData = {}, onSuccessPath = '/buildings', submitText, buildingId }: Props) {
  useCsrf();
  const router = useRouter();
  const [form, setForm] = useState<Partial<Building>>(initialData);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name === 'apartments_count' ? Number(value) : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (buildingId) {
        await updateBuilding(buildingId, form);
      } else {
        await createBuilding(form);
      }
      router.push(onSuccessPath);
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white shadow rounded">
      {error && <p className="text-red-500">{error}</p>}
      <div>
        <label className="block">Όνομα</label>
        <input
          name="name"
          value={form.name || ''}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />
      </div>
      <div>
        <label className="block">Διεύθυνση</label>
        <input
          name="address"
          value={form.address || ''}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block">Πόλη</label>
          <input
            name="city"
            value={form.city || ''}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
          />
        </div>
        <div>
          <label className="block">Τ.Κ.</label>
          <input
            name="postal_code"
            value={form.postal_code || ''}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
          />
        </div>
      </div>
      <div>
        <label className="block">Αριθμός Διαμερισμάτων</label>
        <select
          name="apartments_count"
          value={form.apartments_count || ''}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        >
          <option value="">Επιλέξτε</option>
          {Array.from({ length: 100 }, (_, i) => i + 1).map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block">Υπεύθυνος Εσωτερικά Όνομα</label>
          <input
            name="internal_manager_name"
            value={form.internal_manager_name || ''}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />
        </div>
        <div>
          <label className="block">Τηλέφωνο Εσωτερικού Υπευθ.</label>
          <input
            name="internal_manager_phone"
            value={form.internal_manager_phone || ''}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />
        </div>
      </div>
      <button type="submit" className="btn btn-primary">
        {submitText}
      </button>
    </form>
  );
}
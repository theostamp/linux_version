// frontend/app/buildings/[id]/edit/page.tsx

'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import CreateBuildingForm from '@/components/CreateBuildingForm';
import { fetchBuilding, Building } from '@/lib/api';

export default function EditBuildingPage() {
  const params = useParams();
  const id = Number(params.id);
  const [initialData, setInitialData] = useState<Building | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await fetchBuilding(id);
      setInitialData(data);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <p className="p-6">Φόρτωση...</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Επεξεργασία Κτιρίου</h1>
      <CreateBuildingForm
        initialData={initialData}
        buildingId={id}
        submitText="Ενημέρωση Κτιρίου"
      />
    </div>
  );
}

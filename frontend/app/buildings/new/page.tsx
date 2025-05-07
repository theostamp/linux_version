
// frontend/app/buildings/new/page.tsx

'use client';
import CreateBuildingForm from '@/components/CreateBuildingForm';

export default function NewBuildingPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Νέο Κτίριο</h1>
      <CreateBuildingForm submitText="Δημιουργία Κτιρίου" />
    </div>
  );
}
//     />
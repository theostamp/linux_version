'use client';
import CreateResidentForm from '@/components/CreateResidentForm';

export default function NewResidentPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Προσθήκη Κατοίκου</h1>
      <CreateResidentForm submitText="Δημιουργία Κατοίκου" />
    </div>
  );
}

// frontend/app/residents/assign/page.tsx

'use client';

import AuthGate from '@/components/AuthGate';
import AssignResidentForm from '@/components/AssignResidentForm';

export default function AssignResidentPage() {
  return (
    <AuthGate>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Αντιστοίχιση Κατοίκου σε Κτίριο</h1>
        <p className="text-sm text-gray-600 mb-6">
          Πληκτρολογήστε το email του κατοίκου που θέλετε να αντιστοιχίσετε στο επιλεγμένο κτίριο.
        </p>
        <AssignResidentForm />
      </div>
    </AuthGate>
  );
}

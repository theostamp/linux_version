// frontend/app/buildings/assign-resident/page.tsx

"use client";

import AssignResidentForm from "@/components/AssignResidentForm";
import AuthGate from "@/components/AuthGate";


export default function AssignResidentPage() {
  return (
    <AuthGate>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Αντιστοίχιση Κατοίκου σε Κτίριο</h1>
        <AssignResidentForm />
      </div>
    </AuthGate>
  );
}

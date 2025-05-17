'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/contexts/AuthContext';
import { useBuilding } from '@/components/contexts/BuildingContext';
import NewAnnouncementForm from '@/components/NewAnnouncementForm';

export default function NewAnnouncementPage() {
  const { user, isLoading } = useAuth();
  const { currentBuilding } = useBuilding();
  const router = useRouter();

  useEffect(() => {
    if (
      !isLoading &&
      (!user ||
        ((!('role' in user) || user.role !== 'manager') && !user.is_superuser))
    ) {
      router.push('/unauthorized');
    }
  }, [user, isLoading, router]);

  if (isLoading) return <p>Φόρτωση…</p>;
  if (!currentBuilding) return <p>Δεν έχει επιλεγεί κτήριο.</p>;

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">➕ Νέα Ανακοίνωση</h1>
      <NewAnnouncementForm buildingId={currentBuilding.id} />
    </div>
  );
}

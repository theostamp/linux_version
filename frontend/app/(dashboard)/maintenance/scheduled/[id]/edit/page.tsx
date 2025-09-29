'use client';
import { useParams } from 'next/navigation';
import ScheduledMaintenanceForm from '@/components/maintenance/ScheduledMaintenanceForm';

export default function EditScheduledMaintenancePage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  return <ScheduledMaintenanceForm heading="Επεξεργασία Προγραμματισμένου Έργου" maintenanceId={id} />;
}

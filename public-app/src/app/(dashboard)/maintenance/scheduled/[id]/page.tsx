import { notFound } from 'next/navigation';
import ScheduledMaintenanceForm from '@/components/maintenance/ScheduledMaintenanceForm';

interface ScheduledMaintenancePageProps {
  params: { id: string };
}

export default function EditScheduledMaintenancePage({ params }: ScheduledMaintenancePageProps) {
  const maintenanceId = Number(params.id);

  if (!maintenanceId || Number.isNaN(maintenanceId)) {
    notFound();
  }

  return <ScheduledMaintenanceForm heading="Επεξεργασία Προγραμματισμένης Εργασίας" maintenanceId={maintenanceId} />;
}


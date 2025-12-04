'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import ScheduledMaintenanceForm from '@/components/maintenance/ScheduledMaintenanceForm';

interface ScheduledMaintenancePageProps {
  params: Promise<{ id: string }>;
}

export default function EditScheduledMaintenancePage({ params }: ScheduledMaintenancePageProps) {
  // Next.js 15+ requires awaiting params
  const resolvedParams = use(params);
  const maintenanceId = Number(resolvedParams.id);

  if (!maintenanceId || Number.isNaN(maintenanceId)) {
    notFound();
  }

  return <ScheduledMaintenanceForm heading="Επεξεργασία Προγραμματισμένης Εργασίας" maintenanceId={maintenanceId} />;
}


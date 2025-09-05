'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { fetchWorkOrder } from '@/lib/api';
import { withAuth } from '@/lib/auth';
import { getActiveBuildingId } from '@/lib/api';
import { useBuildingEvents } from '@/lib/useBuildingEvents';
import { BackButton } from '@/components/ui/BackButton';

function WorkOrderDetailInner() {
  const params = useParams();
  const id = Number(params?.id);
  const buildingId = getActiveBuildingId();
  useBuildingEvents(buildingId, { events: ['workorder.updated'] });

  const { data, isLoading, error } = useQuery({
    queryKey: ['workOrder', id],
    queryFn: () => fetchWorkOrder(id),
    enabled: Number.isFinite(id),
  });

  if (isLoading) return <div>Loading work order…</div>;
  if (error || !data) return <div>Failed to load work order</div>;

  const w = data;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BackButton href="/maintenance/work-orders" size="sm" />
          <h1 className="text-xl font-semibold">WO#{w.id}</h1>
        </div>
        <Link className="text-blue-600" href={`/(dashboard)/maintenance/tickets/${w.ticket}`
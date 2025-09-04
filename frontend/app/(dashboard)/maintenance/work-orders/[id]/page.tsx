'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { fetchWorkOrder } from '@/lib/api';
import { withAuth } from '@/lib/auth';
import { getActiveBuildingId } from '@/lib/api';
import { useBuildingEvents } from '@/lib/useBuildingEvents';

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
        <h1 className="text-xl font-semibold">WO#{w.id}</h1>
        <Link className="text-blue-600" href={`/(dashboard)/maintenance/tickets/${w.ticket}`}>Προς Ticket</Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="col-span-2 space-y-2">
          <div className="rounded border p-4">
            <div className="text-sm text-gray-500">Κατάσταση</div>
            <div className="font-medium">{w.status}</div>
          </div>
          <div className="rounded border p-4">
            <div className="text-sm text-gray-500">Προγραμματισμένη</div>
            <div className="font-medium">{w.scheduled_at ? new Date(w.scheduled_at).toLocaleString() : '-'}</div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="rounded border p-4">
            <div className="text-sm text-gray-500">Ticket</div>
            <div className="font-medium">
              <Link href={`/(dashboard)/maintenance/tickets/${w.ticket}`}>#{w.ticket}</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuth(WorkOrderDetailInner, ['admin', 'manager']);



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
  useBuildingEvents(buildingId);

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
        <Link className="text-blue-600" href={`/(dashboard)/maintenance/tickets/${w.ticket}`}>
          View Ticket #{w.ticket}
        </Link>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-semibold tracking-tight text-gray-800 mb-4">Work Order Details</h2>
        <div className="space-y-2">
          <p><strong>Status:</strong> {w.status}</p>
          <p><strong>Assigned To:</strong> {w.assigned_to || 'Unassigned'}</p>
          <p><strong>Created:</strong> {new Date(w.created_at).toLocaleDateString()}</p>
          {w.finished_at && (
            <p><strong>Completed:</strong> {new Date(w.finished_at).toLocaleDateString()}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default withAuth(WorkOrderDetailInner, ['admin', 'manager']);
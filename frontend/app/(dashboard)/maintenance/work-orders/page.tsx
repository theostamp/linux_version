'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { fetchWorkOrders, WorkOrder } from '@/lib/api';
import { getActiveBuildingId } from '@/lib/api';
import { useBuildingEvents } from '@/lib/useBuildingEvents';
import { withAuth } from '@/lib/auth';

function WorkOrdersListInner() {
  const buildingId = getActiveBuildingId();
  useBuildingEvents(buildingId, { events: ['workorder.updated'] });

  const { data, isLoading, error } = useQuery({
    queryKey: ['workOrders', buildingId],
    queryFn: () => fetchWorkOrders({ building: buildingId }),
  });

  if (isLoading) return <div>Loading work orders…</div>;
  if (error) return <div>Failed to load work orders</div>;

  const rows: WorkOrder[] = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Εντολές Εργασίας</h1>
        <Link className="text-blue-600" href="/(dashboard)/maintenance/work-orders/new">Νέα Εντολή</Link>
      </div>
      <div className="rounded border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Ticket</th>
              <th className="px-3 py-2 text-left">Κατάσταση</th>
              <th className="px-3 py-2 text-left">Προγραμματισμένη</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w) => (
              <tr key={w.id} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2">
                  <Link href={`/(dashboard)/maintenance/work-orders/${w.id}`}>WO#{w.id}</Link>
                </td>
                <td className="px-3 py-2">
                  <Link href={`/(dashboard)/maintenance/tickets/${w.ticket}`}>#{w.ticket}</Link>
                </td>
                <td className="px-3 py-2">{w.status}</td>
                <td className="px-3 py-2">{w.scheduled_at ? new Date(w.scheduled_at).toLocaleString() : '-'}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-gray-500" colSpan={4}>Δεν υπάρχουν εντολές</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default withAuth(WorkOrdersListInner, ['admin', 'manager']);



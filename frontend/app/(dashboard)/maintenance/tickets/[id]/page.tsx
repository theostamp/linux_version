'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { fetchMaintenanceTicket, fetchWorkOrders, WorkOrder } from '@/lib/api';
import { withAuth } from '@/lib/auth';
import { useBuildingEvents } from '@/lib/useBuildingEvents';
import { getActiveBuildingId } from '@/lib/api';
import { BackButton } from '@/components/ui/BackButton';

function TicketDetailInner() {
  const params = useParams();
  const id = Number(params?.id);
  const buildingId = getActiveBuildingId();
  useBuildingEvents(buildingId, { events: ['ticket.updated', 'workorder.updated'] });

  const ticketQuery = useQuery({
    queryKey: ['maintenanceTicket', id],
    queryFn: () => fetchMaintenanceTicket(id),
    enabled: Number.isFinite(id),
  });
  const workOrdersQuery = useQuery({
    queryKey: ['workOrdersForTicket', id],
    queryFn: () => fetchWorkOrders({ ticket: id }),
    enabled: Number.isFinite(id),
  });

  if (ticketQuery.isLoading) return <div>Loading ticket…</div>;
  if (ticketQuery.error || !ticketQuery.data) return <div>Failed to load ticket</div>;

  const t = ticketQuery.data;
  const workOrders: WorkOrder[] = workOrdersQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BackButton href="/maintenance/tickets" size="sm" />
          <h1 className="text-xl font-semibold">{t.title}</h1>
        </div>
        <Link className="text-blue-600" href={`/(dashboard)/maintenance/work-orders/new?ticket=${t.id}`}>Νέα Εντολή Εργασίας</Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="col-span-2 space-y-2">
          <div className="rounded border p-4">
            <div className="text-sm text-gray-500">Κατάσταση</div>
            <div className="font-medium">{t.status}</div>
          </div>
          <div className="rounded border p-4">
            <div className="text-sm text-gray-500">Προτεραιότητα</div>
            <div className="font-medium">{t.priority}</div>
          </div>
          <div className="rounded border p-4">
            <div className="text-sm text-gray-500">Περιγραφή</div>
            <div className="whitespace-pre-wrap">{t.description}</div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="rounded border p-4">
            <div className="text-sm text-gray-500">SLA Due</div>
            <div className="font-medium">{t.sla_due_at ? new Date(t.sla_due_at).toLocaleString() : '-'}</div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Εντολές Εργασίας</h2>
        <div className="rounded border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">ID</th>
                <th className="px-3 py-2 text-left">Κατάσταση</th>
                <th className="px-3 py-2 text-left">Προγραμματισμένη</th>
              </tr>
            </thead>
            <tbody>
              {workOrders.map(w => (
                <tr key={w.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <Link href={`/(dashboard)/maintenance/work-orders/${w.id}`}>WO#{w.id}</Link>
                  </td>
                  <td className="px-3 py-2">{w.status}</td>
                  <td className="px-3 py-2">{w.scheduled_at ? new Date(w.scheduled_at).toLocaleString() : '-'}</td>
                </tr>
              ))}
              {workOrders.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-center text-gray-500" colSpan={3}>Δεν υπάρχουν εντολές</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default withAuth(TicketDetailInner, ['admin', 'manager', 'tenant']);



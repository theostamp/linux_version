'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { fetchMaintenanceTickets, MaintenanceTicket } from '@/lib/api';
import { getActiveBuildingId } from '@/lib/api';
import { useBuildingEvents } from '@/lib/useBuildingEvents';
import { withAuth } from '@/lib/auth';
import { BackButton } from '@/components/ui/BackButton';
import { typography } from '@/lib/typography';

function TicketsListInner() {
  const buildingId = getActiveBuildingId();
  useBuildingEvents(buildingId);

  const { data, isLoading, error } = useQuery({
    queryKey: ['maintenanceTickets', buildingId],
    queryFn: () => fetchMaintenanceTickets({ building: buildingId }),
  });

  if (isLoading) return <div>Loading tickets…</div>;
  if (error) return <div>Failed to load tickets</div>;

  const rows: MaintenanceTicket[] = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BackButton href="/maintenance" size="sm" />
          <h1 className="text-xl font-semibold">Αιτήματα Συντήρησης</h1>
        </div>
        <Link className="text-blue-600" href="/(dashboard)/maintenance/tickets/new">Νέο Αίτημα</Link>
      </div>
      <div className="rounded border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className={`px-3 py-2 text-left ${typography.tableHeader}`}>Τίτλος</th>
              <th className={`px-3 py-2 text-left ${typography.tableHeader}`}>Κατάσταση</th>
              <th className={`px-3 py-2 text-left ${typography.tableHeader}`}>Προτεραιότητα</th>
              <th className={`px-3 py-2 text-left ${typography.tableHeader}`}>Ημ/νία</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2">
                  <Link href={`/(dashboard)/maintenance/tickets/${t.id}`}>{t.title}</Link>
                </td>
                <td className="px-3 py-2">{t.status}</td>
                <td className="px-3 py-2">{t.priority}</td>
                <td className="px-3 py-2">{new Date(t.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-gray-500" colSpan={4}>Δεν βρέθηκαν αιτήματα</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Note: 'tenant' is NOT a CustomUser.role - only 'admin' and 'manager' are valid
export default withAuth(TicketsListInner, ['admin', 'manager']);



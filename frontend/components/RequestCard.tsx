'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { UserRequest, toggleSupportRequest } from '@/lib/api';
import { useState } from 'react';
import { toast } from 'sonner';

type Props = {
  request: UserRequest;
};

export default function RequestCard({ request }: Readonly<Props>) {
  const {
    id,
    title,
    description,
    status,
    supporter_count,
    is_urgent,
    created_at,
    type,
  } = request;

  const [supporting, setSupporting] = useState(false);
  const [supportCount, setSupportCount] = useState(supporter_count);

  const statusLabel = {
    open: 'Ανοιχτό',
    in_progress: 'Σε εξέλιξη',
    resolved: 'Ολοκληρωμένο',
  }[status] ?? status;

  const handleSupport = async (e: React.MouseEvent) => {
    e.preventDefault();
    setSupporting(true);
    try {
      const result = await toggleSupportRequest(id);
      toast.success(result.status);
      setSupportCount((prev) =>
        result.status.includes('αφαιρέθηκε') ? prev - 1 : prev + 1
      );
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSupporting(false);
    }
  };

  return (
    <Link
      href={`/requests/${id}`}
      className="block border rounded-lg p-4 shadow hover:shadow-md transition bg-white"
    >
      <div className="flex justify-between items-start">
        <h2 className="text-lg font-semibold text-blue-800">
          {title} {is_urgent && <span className="text-red-600">🔥</span>}
        </h2>
        <span className="text-sm text-gray-500">
          {format(new Date(created_at), 'd MMM yyyy, HH:mm', { locale: el })}
        </span>
      </div>

      <p className="mt-2 text-gray-700 line-clamp-3">{description}</p>

      <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
        <span>
          🏷️ Κατάσταση: <strong>{statusLabel}</strong>
        </span>
        {type && (
          <span>
            📂 Τύπος: <strong>{type}</strong>
          </span>
        )}
        <span>
          🤝 Υποστηρικτές: <strong>{supportCount}</strong>
        </span>
      </div>

      <button
        onClick={handleSupport}
        disabled={supporting}
        className="mt-3 inline-block text-sm text-blue-600 hover:underline"
      >
        {supporting ? 'Επεξεργασία...' : '✅ Υποστήριξη'}
      </button>
    </Link>
  );
}

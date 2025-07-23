'use client';

import { Announcement } from '@/lib/api';
import Link from 'next/link';

interface Props {
  announcements: Announcement[];
}

export default function AnnouncementsFallback({ announcements }: Props) {
  const latest = announcements[0];
  if (!latest) return null;

  const start = new Date(latest.start_date);
  const end = new Date(latest.end_date);
  const now = new Date();

  let statusLabel = '';
  let statusColor = '';

  if (now < start) {
    statusLabel = 'Προσεχώς';
    statusColor = 'bg-blue-200 text-blue-800';
  } else if (now > end) {
    statusLabel = 'Ληγμένη';
    statusColor = 'bg-gray-300 text-gray-700';
  } else {
    statusLabel = 'Ενεργή';
    statusColor = 'bg-green-200 text-green-800';
  }

  return (
    <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl font-bold text-blue-800 dark:text-blue-200">{latest.title}</h3>
        <span className={`text-xs font-semibold px-2 py-1 rounded ${statusColor}`}>
          {statusLabel}
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        Από {start.toLocaleDateString('el-GR')} έως {end.toLocaleDateString('el-GR')}
      </p>
      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
        {latest.description}
      </p>
      <Link
        href={`/announcements/${latest.id}`}
        className="text-sm text-blue-600 dark:text-blue-400 underline mt-3 inline-block"
      >
        Δες περισσότερα →
      </Link>
    </div>
  );
}

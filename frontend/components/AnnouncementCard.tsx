// frontend/components/AnnouncementCard.tsx
'use client';

import { motion } from 'framer-motion';
import React from 'react';
import Link from 'next/link';

export type Announcement = {
  id: number;
  title: string;
  description: string;
  file: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  is_currently_active?: boolean;
  days_remaining?: number | null;
  status_display?: string;
  created_at: string;
  updated_at?: string;
};

export default function AnnouncementCard({ announcement }: { readonly announcement: Announcement }) {
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return isNaN(date.getTime())
      ? '—'
      : date.toLocaleDateString('el-GR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
  };

  // Use the backend is_currently_active property directly
  // Backend already handles all the logic for published, is_active, and date checks
  const isCurrentlyActive = announcement.is_currently_active === true;

  return (
    <motion.div
      className="p-4 rounded-2xl shadow bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold">{announcement.title}</h2>
        <span
          className={`text-xs font-medium px-3 py-1 rounded-full border ${
            isCurrentlyActive
              ? 'bg-green-100 text-green-700 border-green-300'
              : 'bg-gray-200 text-gray-600 border-gray-300'
          }`}
        >
          {announcement.status_display ? announcement.status_display : isCurrentlyActive ? '✅ Ενεργή' : '⏸ Ανενεργή'}
        </span>
      </div>

      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line line-clamp-3">
        {announcement.description}
      </p>

      <div className="mt-4 flex justify-between items-center">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Ενεργό από <strong>{formatDate(announcement.start_date)}</strong> έως{' '}
          <strong>{formatDate(announcement.end_date)}</strong>
        </div>
        
        <Link 
          href={`/announcements/${announcement.id}`}
          className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline"
        >
          Περισσότερα →
        </Link>
      </div>

      {announcement.file && (
        <div className="mt-2">
          <a
            href={announcement.file}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 underline text-sm font-medium"
          >
            📎 Προβολή Επισύναψης
          </a>
        </div>
      )}
    </motion.div>
  );
}

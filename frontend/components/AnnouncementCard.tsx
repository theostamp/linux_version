// components/AnnouncementCard.tsx
'use client';

import { motion } from 'framer-motion';
import React from 'react';


export type Announcement = {
  id: number;
  title: string;
  description: string;
  file: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
};


export default function AnnouncementCard({ announcement }: { readonly announcement: Announcement }) {
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('el-GR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  return (
    <motion.div
      className="p-4 rounded-2xl shadow-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h2 className="text-lg font-semibold">{announcement.title}</h2>
      <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 whitespace-pre-line">
        {announcement.description}
      </p>

      {announcement.file && (
        <div className="mt-4">
          <a
            href={announcement.file}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-blue-600 dark:text-blue-400 underline text-sm font-medium"
          >
            📎 Προβολή Επισύναψης
          </a>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        Ενεργό από {formatDate(announcement.start_date)} έως {formatDate(announcement.end_date)}
      </div>
    </motion.div>
  );
}

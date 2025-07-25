// frontend/components/AnnouncementCard.tsx
'use client';

import { motion } from 'framer-motion';
import React, { useState } from 'react';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { deleteAnnouncement } from '@/lib/api';
import { useAuth } from '@/components/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { useBuilding } from '@/components/contexts/BuildingContext';

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
  building?: number;
  building_name?: string;
};

export default function AnnouncementCard({ announcement }: { readonly announcement: Announcement }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const { selectedBuilding } = useBuilding();
  
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

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation if card is clickable
    
    if (!confirm(`Είστε σίγουροι ότι θέλετε να διαγράψετε την ανακοίνωση "${announcement.title}";`)) {
      return;
    }
    
    setIsDeleting(true);
    try {
      await deleteAnnouncement(announcement.id);
      toast.success('Η ανακοίνωση διαγράφηκε επιτυχώς');
      // Invalidate the announcements query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast.error('Σφάλμα κατά τη διαγραφή της ανακοίνωσης');
    } finally {
      setIsDeleting(false);
    }
  };

  // Show delete button only for superusers and managers
  const canDelete = user?.is_superuser || user?.is_staff;

  return (
    <motion.div
      className="p-4 rounded-2xl shadow bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 relative"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Building badge - show only when viewing all buildings */}
      {!selectedBuilding && announcement.building_name && (
        <div className="absolute top-3 left-3 z-10">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-xs font-medium shadow-sm">
            🏢 {announcement.building_name}
          </span>
        </div>
      )}
      
      {canDelete && (
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="absolute top-3 right-3 p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
          title="Διαγραφή ανακοίνωσης"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
      
      <div className="flex justify-between items-center mb-2 pr-10 pt-6">
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

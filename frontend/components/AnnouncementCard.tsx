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
import { typography } from '@/lib/typography';

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
  
  // Check if this is an assembly announcement
  const isAssembly = announcement.title?.includes('Συνέλευση') || 
                     announcement.title?.includes('Σύγκληση') ||
                     announcement.description?.includes('ΘΕΜΑΤΑ ΗΜΕΡΗΣΙΑΣ ΔΙΑΤΑΞΗΣ');
  
  // Extract assembly topics
  const extractAssemblyTopics = () => {
    if (!isAssembly) return [];
    
    const topicsSection = announcement.description.match(/\*\*ΘΕΜΑΤΑ ΗΜΕΡΗΣΙΑΣ ΔΙΑΤΑΞΗΣ:\*\*([\s\S]*?)\*\*Σημαντικό:\*\*/);
    if (!topicsSection) return [];
    
    const topicsContent = topicsSection[1];
    const topicMatches = topicsContent.match(/###\s*Θέμα:\s*([^\n]+)/g);
    
    return topicMatches ? topicMatches.map(match => 
      match.replace(/###\s*Θέμα:\s*/, '').trim()
    ) : [];
  };
  
  const assemblyTopics = extractAssemblyTopics();
  
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

  const formatTimestamp = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return isNaN(date.getTime())
      ? ''
      : date.toLocaleString('el-GR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
  };

  // Use the backend is_currently_active property directly
  // Backend already handles all the logic for published, is_active, and date checks
  const isCurrentlyActive = announcement.is_currently_active === true;

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation if card is clickable
    
    const isGlobal = announcement.building_name === "Όλα τα κτίρια";
    const confirmMessage = isGlobal 
      ? `Είστε σίγουροι ότι θέλετε να διαγράψετε την ΚΑΘΟΛΙΚΗ ανακοίνωση "${announcement.title}" από όλα τα κτίρια;`
      : `Είστε σίγουροι ότι θέλετε να διαγράψετε την ανακοίνωση "${announcement.title}";`;
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    setIsDeleting(true);
    try {
      const message = await deleteAnnouncement(announcement.id);
      toast.success(message);
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
      className={`p-4 rounded-2xl shadow text-gray-900 dark:text-gray-100 relative ${
        isAssembly 
          ? 'bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200' 
          : 'bg-white dark:bg-gray-800'
      }`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Timestamp at the top */}
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        {formatTimestamp(announcement.created_at)}
      </div>

      {/* Building badge - show only when viewing all buildings */}
      {!selectedBuilding && announcement.building_name && (
        <div className="absolute top-3 left-3 z-10">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium shadow-sm ${
            isAssembly 
              ? 'bg-purple-100 border border-purple-300 text-purple-700'
              : 'bg-blue-50 border border-blue-200 text-blue-700'
          }`}>
            🏢 {announcement.building_name}
          </span>
        </div>
      )}

      {/* Assembly badge */}
      {isAssembly && (
        <div className="absolute top-3 right-16 z-10">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-100 border border-purple-300 text-purple-700 rounded-full text-xs font-medium shadow-sm">
            🏛️ Συνέλευση
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

      <div className="flex justify-between items-center mb-2 pr-10">
        <h2 className={typography.cardTitle}>{announcement.title}</h2>
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

      {/* Assembly Topics Preview */}
      {isAssembly && assemblyTopics.length > 0 && (
        <div className="mb-4 p-3 bg-white/70 rounded-lg border border-purple-200">
          <h4 className="text-sm font-semibold text-purple-800 mb-2">
            Θέματα Συνέλευσης ({assemblyTopics.length}):
          </h4>
          <div className="space-y-1">
            {assemblyTopics.slice(0, 3).map((topic, index) => (
              <div key={index} className="text-xs text-purple-700 flex items-start">
                <span className="font-medium mr-2">{index + 1}.</span>
                <span className="line-clamp-2">{topic}</span>
              </div>
            ))}
            {assemblyTopics.length > 3 && (
              <div className="text-xs text-purple-600 italic">
                ...και {assemblyTopics.length - 3} ακόμα
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 flex justify-between items-center">
        <div className={typography.small}>
          Ενεργό από <strong>{formatDate(announcement.start_date)}</strong> έως{' '}
          <strong>{formatDate(announcement.end_date)}</strong>
        </div>
        
        <Link 
          href={`/announcements/${announcement.id}`}
          className={typography.linkText}
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
            className={`inline-flex items-center gap-1 ${typography.linkText}`}
          >
            📎 Προβολή Επισύναψης
          </a>
        </div>
      )}
    </motion.div>
  );
}

'use client';

import { motion } from 'framer-motion';
import React, { useState } from 'react';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { deleteAnnouncement } from '@/lib/api';
import { useAuth } from '@/components/contexts/AuthContext';
import { hasOfficeAdminAccess } from '@/lib/roleUtils';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { typography } from '@/lib/typography';
import type { Announcement } from '@/lib/api';

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
  const isCurrentlyActive = announcement.is_currently_active === true;

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();

    const isGlobal = (announcement as { building_name?: string }).building_name === "Όλα τα κτίρια";
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
      // ✅ Invalidate AND explicitly refetch for immediate UI update
      await queryClient.invalidateQueries({ queryKey: ['announcements'] });
      await queryClient.refetchQueries({ queryKey: ['announcements'] });
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast.error('Σφάλμα κατά τη διαγραφή της ανακοίνωσης');
    } finally {
      setIsDeleting(false);
    }
  };

  // Show delete button only for office-level admins
  const canDelete = hasOfficeAdminAccess(user);

  return (
    <motion.div
      className={`p-4 rounded-xl shadow-sm text-foreground relative ${
        isAssembly
          ? 'bg-purple-500/5 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-900'
          : 'bg-card border border-border'
      }`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Timestamp at the top */}
      <div className="text-xs text-muted-foreground mb-3">
        {formatTimestamp(announcement.created_at)}
      </div>

      {/* Building badge - show only when viewing all buildings */}
      {!selectedBuilding && (announcement as { building_name?: string }).building_name && (
        <div className="absolute top-3 left-3 z-10">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium shadow-sm ${
            isAssembly
              ? 'bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-300'
              : 'bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-300'
          }`}>
            🏢 {(announcement as { building_name?: string }).building_name}
          </span>
        </div>
      )}

      {/* Assembly badge */}
      {isAssembly && (
        <div className="absolute top-3 right-16 z-10">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium shadow-sm">
            🏛️ Συνέλευση
          </span>
        </div>
      )}

      {canDelete && (
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="absolute top-3 right-3 p-2 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive hover:text-destructive transition-colors disabled:opacity-50"
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
              ? 'bg-accent-secondary/15 text-accent-secondary border-accent-secondary/30'
              : 'bg-muted text-muted-foreground border-border'
          }`}
        >
          {isCurrentlyActive ? '✅ Ενεργή' : '⏸ Ανενεργή'}
        </span>
      </div>

      {/* Assembly Topics Preview */}
      {isAssembly && assemblyTopics.length > 0 && (
        <div className="mb-4 p-3 bg-background/50 rounded-lg border border-purple-200 dark:border-purple-900">
          <h4 className="text-sm font-semibold text-purple-800 dark:text-purple-300 mb-2">
            Θέματα Συνέλευσης ({assemblyTopics.length}):
          </h4>
          <div className="space-y-1">
            {assemblyTopics.slice(0, 3).map((topic, index) => (
              <div key={index} className="text-xs text-purple-700 dark:text-purple-400 flex items-start">
                <span className="font-medium mr-2">{index + 1}.</span>
                <span className="line-clamp-2">{topic}</span>
              </div>
            ))}
            {assemblyTopics.length > 3 && (
              <div className="text-xs text-purple-600 dark:text-purple-500 italic">
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


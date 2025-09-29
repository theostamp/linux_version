// 📄 frontend/app/announcements/page.tsx
'use client';

import { useEffect } from 'react'; // ✅ προσθήκη useEffect
import type { Announcement } from '@/components/AnnouncementCard';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import AnnouncementCard from '@/components/AnnouncementCard';
import AnnouncementSkeleton from '@/components/AnnouncementSkeleton';
import ErrorMessage from '@/components/ErrorMessage';
import { motion } from 'framer-motion';
import BuildingFilterIndicator from '@/components/BuildingFilterIndicator';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AnnouncementsPage() {
  const { currentBuilding, selectedBuilding, isLoading: buildingLoading } = useBuilding();

  // Χρησιμοποιούμε το selectedBuilding για φιλτράρισμα
  // Αν είναι null, σημαίνει "όλα τα κτίρια" και περνάμε null στο API
  const buildingId = selectedBuilding?.id ?? null;

  // ✅ Καλείται πάντα — ανεξαρτήτως αν έχει φορτώσει το building
  const {
    data: announcements = [],
    isLoading,
    isError,
  } = useAnnouncements(buildingId);

  // ✅ DEBUG LOG για currentBuilding και selectedBuilding
  useEffect(() => {
    console.log('[AnnouncementsPage] currentBuilding:', currentBuilding);
    console.log('[AnnouncementsPage] selectedBuilding:', selectedBuilding);
    console.log('[AnnouncementsPage] buildingId used:', buildingId);
    console.log('[AnnouncementsPage] announcements received:', announcements);
    console.log('[AnnouncementsPage] announcements count:', announcements.length);
    announcements.forEach((a, i) => {
      console.log(`[Announcement ${i}]:`, {
        title: a.title,
        is_active: a.is_active,
        published: a.published,
        is_currently_active: a.is_currently_active,
        start_date: a.start_date,
        end_date: a.end_date
      });
    });
  }, [currentBuilding, selectedBuilding, buildingId, announcements]);

  if (buildingLoading || !currentBuilding || isLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">📢 Ανακοινώσεις</h1>
          <Button asChild>
            <Link href="/announcements/new">
              {selectedBuilding 
                ? `Νέα Ανακοίνωση για το κτίριο ${selectedBuilding.name}`
                : "Νέα Ανακοίνωση"
              }
            </Link>
          </Button>
        </div>
        <BuildingFilterIndicator className="mb-4" />
        {[...Array(3)].map(() => {
          const uuid = crypto.randomUUID();
          return <AnnouncementSkeleton key={uuid} />;
        })}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">📢 Ανακοινώσεις</h1>
          <Button asChild>
            <Link href="/announcements/new">
              {selectedBuilding 
                ? `Νέα Ανακοίνωση για το κτίριο ${selectedBuilding.name}`
                : "Νέα Ανακοίνωση"
              }
            </Link>
          </Button>
        </div>
        <BuildingFilterIndicator className="mb-4" />
        <ErrorMessage message="Αδυναμία φόρτωσης ανακοινώσεων. Παρακαλώ δοκιμάστε ξανά αργότερα." />
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">📢 Ανακοινώσεις</h1>
          <Button asChild>
            <Link href="/announcements/new">
              {selectedBuilding 
                ? `Νέα Ανακοίνωση για το κτίριο ${selectedBuilding.name}`
                : "Νέα Ανακοίνωση"
              }
            </Link>
          </Button>
        </div>
        <BuildingFilterIndicator className="mb-4" />
        <p className="text-gray-500 text-center">
          Δεν υπάρχουν ενεργές ανακοινώσεις αυτή τη στιγμή.
        </p>
      </div>
    );
  }

  const container = {
    hidden: { opacity: 1 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
  };
  const item = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">📢 Ανακοινώσεις</h1>
        <Button asChild>
          <Link href="/announcements/new">
            {selectedBuilding 
              ? `Νέα Ανακοίνωση για το κτίριο ${selectedBuilding.name}`
              : "Νέα Ανακοίνωση"
            }
          </Link>
        </Button>
      </div>
      <BuildingFilterIndicator className="mb-4" />
      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {announcements
          // Temporarily removing filter to see all announcements
          .map((a: Announcement) => (
            <motion.div key={a.id} variants={item}>
              <AnnouncementCard announcement={a} />
            </motion.div>
          ))}
      </motion.div>
    </div>
  );
}

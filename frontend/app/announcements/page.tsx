// 📄 frontend/app/announcements/page.tsx
'use client';

import { useEffect } from 'react';
import type { Announcement } from '@/components/AnnouncementCard';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import AnnouncementsCarousel from '@/components/AnnouncementsCarousel';
import AnnouncementSkeleton from '@/components/AnnouncementSkeleton';
import ErrorMessage from '@/components/ErrorMessage';
import { motion } from 'framer-motion';
import BuildingFilterIndicator from '@/components/BuildingFilterIndicator';
import BuildingGuard from '@/components/Guards/BuildingGuard';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function AnnouncementsPage() {
  const router = useRouter();
  const { currentBuilding, selectedBuilding, isLoading: buildingLoading } = useBuilding();

  // Χρησιμοποιούμε το selectedBuilding για φιλτράρισμα, ή το currentBuilding αν δεν έχει επιλεγεί κάτι
  const buildingId = selectedBuilding?.id || currentBuilding?.id;

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
  }, [currentBuilding, selectedBuilding, buildingId]);

  const handleCreateNew = () => {
    router.push('/announcements/new');
  };

  if (buildingLoading || !currentBuilding || isLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">📢 Ανακοινώσεις</h1>
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
        <h1 className="text-3xl font-bold mb-6">📢 Ανακοινώσεις</h1>
        <BuildingFilterIndicator className="mb-4" />
        <ErrorMessage message="Αδυναμία φόρτωσης ανακοινώσεων. Παρακαλώ δοκιμάστε ξανά αργότερα." />
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">📢 Ανακοινώσεις</h1>
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
    <BuildingGuard>
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">📢 Ανακοινώσεις</h1>
          <Button 
            onClick={handleCreateNew}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            + Νέα Ανακοίνωση
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
            .filter((a: Announcement) => a.is_active)
            .map((a: Announcement) => (
              <motion.div key={a.id} variants={item}>
                <AnnouncementsCarousel announcements={[a]} />
              </motion.div>
            ))}
        </motion.div>
      </div>
    </BuildingGuard>
  );
}

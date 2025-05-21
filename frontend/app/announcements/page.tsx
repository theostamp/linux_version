// frontend/app/announcements/page.tsx
'use client';

import type { Announcement } from '@/components/AnnouncementCard';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import AnnouncementCard from '@/components/AnnouncementCard';
import AnnouncementSkeleton from '@/components/AnnouncementSkeleton';
import ErrorMessage from '@/components/ErrorMessage';
import { motion } from 'framer-motion';

export default function AnnouncementsPage() {
  const { currentBuilding, isLoading: buildingLoading } = useBuilding();

  // ✅ Καλείται πάντα — ανεξαρτήτως αν έχει φορτώσει το building
  const {
    data: announcements = [],
    isLoading,
    isError,
  } = useAnnouncements(currentBuilding?.id);

  // 👇 Ασφαλές conditional rendering μετά τα hooks
  if (buildingLoading || !currentBuilding || isLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">📢 Ανακοινώσεις</h1>
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
        <ErrorMessage message="Αδυναμία φόρτωσης ανακοινώσεων. Παρακαλώ δοκιμάστε ξανά αργότερα." />
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">📢 Ανακοινώσεις</h1>
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
      <h1 className="text-3xl font-bold mb-6">📢 Ανακοινώσεις</h1>
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
              <AnnouncementCard announcement={a} />
            </motion.div>
          ))}
      </motion.div>
    </div>
  );
}

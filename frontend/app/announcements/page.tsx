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
  const {
    data: announcements = [], // <-- Ασφαλές default value
    isLoading,
    isError,
  } = useAnnouncements(currentBuilding?.id);

  const container = {
    hidden: { opacity: 1 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
  };
  const item = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } };

  let content;
  if (buildingLoading || isLoading) {
    content = (
      <div className="space-y-4">
        {[...Array(3)].map(() => {
          const uuid = crypto.randomUUID();
          return <AnnouncementSkeleton key={uuid} />;
        })}
      </div>
    );
  } else if (isError) {
    content = (
      <ErrorMessage message="Αδυναμία φόρτωσης ανακοινώσεων. Παρακαλώ δοκιμάστε ξανά αργότερα." />
    );
  } else if (Array.isArray(announcements) && announcements.length > 0) {
    content = (
      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {announcements
          .filter((a) => a.is_active)
          .map((a) => (
            <motion.div key={a.id} variants={item}>
              <AnnouncementCard announcement={a} />
            </motion.div>
          ))}
      </motion.div>
    );
  } else {
    content = (
      <p className="text-gray-500 text-center">
        Δεν υπάρχουν ενεργές ανακοινώσεις αυτή τη στιγμή.
      </p>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">📢 Ανακοινώσεις</h1>
      {content}
    </div>
  );
}

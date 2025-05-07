'use client';

import { useEffect, useState } from 'react';
import { fetchAnnouncements } from '@/lib/api';
import AnnouncementCard from '@/components/AnnouncementCard';
import AnnouncementSkeleton from '@/components/AnnouncementSkeleton';
import ErrorMessage from '@/components/ErrorMessage';
import { motion } from 'framer-motion';

import type { Announcement } from '@/components/AnnouncementCard';


export default function AnnouncementsPage() {
  /* -- όλα τα hooks ΜΕΣΑ στο component -- */
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  async function loadAnnouncements() {
    try {
      const data = await fetchAnnouncements();
      setAnnouncements(Array.isArray(data) ? data.filter(a => a.is_active) : []);
      setError(false);
      setLastUpdated(
        new Date().toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })
      );
    } catch (err) {
      console.error(err);
      setError(true);
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnnouncements();
    const i = setInterval(loadAnnouncements, 60_000);
    return () => clearInterval(i);
  }, []);

  /* animation variants */
  const container = {
    hidden: { opacity: 1 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
  };
  const item = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } };

  let content;
  if (loading) {
    content = (
      <div className="space-y-4">
        {[...Array(3)].map(() => {
          const uuid = crypto.randomUUID();
          return <AnnouncementSkeleton key={uuid} />;
        })}
      </div>
    );
  } else if (error) {
    content = (
      <ErrorMessage message="Αδυναμία φόρτωσης ανακοινώσεων. Παρακαλώ δοκιμάστε ξανά αργότερα." />
    );
  } else if (announcements.length) {
    content = (
      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {announcements.map(a => (
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

      {!loading && lastUpdated && (
        <p className="text-xs text-gray-400 text-center mt-8">
          Τελευταία ενημέρωση: {lastUpdated}
        </p>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { fetchAnnouncements } from '@/lib/api';
import AnnouncementCard from '@/components/AnnouncementCard';
import AnnouncementSkeleton from '@/components/AnnouncementSkeleton';
import ErrorMessage from '@/components/ErrorMessage';
import { motion } from 'framer-motion';
import type { Announcement } from '@/components/AnnouncementCard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function BuildingAnnouncementsPage() {
  const params = useParams();
  const buildingId = parseInt(params.id as string, 10);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function loadAnnouncements() {
    if (!buildingId) return;
    try {
      const data = await fetchAnnouncements(buildingId);
      setAnnouncements(Array.isArray(data) ? data.filter(a => a.is_active) : []);
      setError(false);
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
  }, [buildingId]);

  const container = {
    hidden: { opacity: 1 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
  };
  const item = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href={`/buildings/${buildingId}`}>
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Επιστροφή
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">📢 Ανακοινώσεις Κτιρίου</h1>
        <div></div>
      </div>

      {loading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <AnnouncementSkeleton key={i} />
          ))}
        </div>
      )}

      {error && (
        <ErrorMessage message="Αδυναμία φόρτωσης ανακοινώσεων. Παρακαλώ δοκιμάστε ξανά αργότερα." />
      )}

      {!loading && !error && announcements.length > 0 && (
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
      )}

      {!loading && !error && announcements.length === 0 && (
        <div className="text-center text-gray-500 py-12">
          <p>Δεν υπάρχουν ενεργές ανακοινώσεις για αυτό το κτίριο.</p>
        </div>
      )}
    </div>
  );
}


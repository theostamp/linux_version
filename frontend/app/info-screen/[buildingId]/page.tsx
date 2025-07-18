'use client';

import { use } from 'react';
import { usePublicInfo } from '@/hooks/usePublicInfo';
import AnnouncementsCarousel from '@/components/AnnouncementsCarousel';
import PublicInfoSidebar from '@/components/PublicInfoSidebar';

export default function InfoScreenPage({
  params,
}: {
  params: Promise<{ buildingId: string }>;
}) {
  const { buildingId } = use(params);
  const numericId = Number(buildingId);
  const { data } = usePublicInfo(numericId);
  const announcements = data?.announcements ?? [];

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 p-4 flex items-center justify-center">
        {announcements.length > 0 ? (
          <AnnouncementsCarousel announcements={announcements} />
        ) : (
          <p className="text-gray-700 dark:text-gray-300">Δεν υπάρχουν ανακοινώσεις.</p>
        )}
      </div>
      <PublicInfoSidebar />
    </div>
  );
}
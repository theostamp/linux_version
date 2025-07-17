'use client';

import { usePublicInfo } from '@/hooks/usePublicInfo';
import AnnouncementsCarousel from '@/components/AnnouncementsCarousel';
import PublicInfoSidebar from '@/components/PublicInfoSidebar';

export default function InfoScreenPage({ params }: any) {
  const buildingId = Number(params.buildingId);
  const { data } = usePublicInfo(buildingId);
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
'use client';

import { useParams } from 'next/navigation';
import { usePublicInfo } from '@/hooks/usePublicInfo';
import AnnouncementsCarousel from '@/components/AnnouncementsCarousel';
import PublicInfoSidebar from '@/components/PublicInfoSidebar';
import ErrorMessage from '@/components/ErrorMessage';

export default function InfoScreenPage() {
  const { buildingId: buildingIdParam } = useParams<{ buildingId: string }>();
  const buildingId = Number(buildingIdParam);
  const { data, isLoading, isError } = usePublicInfo(buildingId);
  const announcements = data?.announcements ?? [];

  if (!buildingId) return <p className="p-4">Μη έγκυρο κτήριο.</p>;
  if (isLoading) return <p className="p-4">Φόρτωση...</p>;
  if (isError || !data) return <ErrorMessage message="Αποτυχία φόρτωσης" />;

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
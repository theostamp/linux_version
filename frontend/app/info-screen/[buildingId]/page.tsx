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
  const votes = data?.votes ?? [];

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 p-4 flex flex-col items-center justify-center">
        {announcements.length > 0 ? (
          <AnnouncementsCarousel announcements={announcements} />
        ) : (
          <p className="text-gray-700 dark:text-gray-300 mb-4">Δεν υπάρχουν ανακοινώσεις.</p>
        )}
        
        {votes.length > 0 && (
          <div className="mt-8 w-full max-w-2xl">
            <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-4">
              🗳️ Ενεργές Ψηφοφορίες
            </h2>
            <div className="space-y-3">
              {votes.map((vote: any) => (
                <div
                  key={vote.id}
                  className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md"
                >
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                    {vote.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {vote.description}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                    Λήξη: {new Date(vote.end_date).toLocaleDateString('el-GR')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <PublicInfoSidebar />
    </div>
  );
}
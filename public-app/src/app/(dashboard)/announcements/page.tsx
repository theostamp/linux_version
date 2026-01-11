'use client';

import { useEffect } from 'react';
import type { Announcement } from '@/lib/api';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { useAuth } from '@/components/contexts/AuthContext';
import AnnouncementCard from '@/components/AnnouncementCard';
import AnnouncementSkeleton from '@/components/AnnouncementSkeleton';
import ErrorMessage from '@/components/ErrorMessage';
import { motion } from 'framer-motion';
import BuildingFilterIndicator from '@/components/BuildingFilterIndicator';
import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus, Building2, Megaphone } from 'lucide-react';
import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';
import { hasInternalManagerAccess } from '@/lib/roleUtils';

function AnnouncementsPageContent() {
  const { currentBuilding, selectedBuilding, buildingContext, isLoading: buildingLoading } = useBuilding();
  const { user } = useAuth();

  // Έλεγχος αν ο χρήστης μπορεί να δημιουργήσει ανακοινώσεις
  const canCreateAnnouncement = hasInternalManagerAccess(user, buildingContext ?? selectedBuilding);

  // Χρησιμοποιούμε το currentBuilding με fallback στο selectedBuilding για φιλτράρισμα
  const buildingId =
    selectedBuilding === null ? null : (selectedBuilding?.id ?? currentBuilding?.id ?? null);

  const {
    data: announcements = [],
    isLoading,
    isError,
  } = useAnnouncements(buildingId);

  useEffect(() => {
    console.log('[AnnouncementsPage] currentBuilding:', currentBuilding);
    console.log('[AnnouncementsPage] selectedBuilding:', selectedBuilding);
    console.log('[AnnouncementsPage] buildingId used:', buildingId);
    console.log('[AnnouncementsPage] announcements received:', announcements);
    console.log('[AnnouncementsPage] announcements count:', announcements.length);
  }, [currentBuilding, selectedBuilding, buildingId, announcements]);

  if (buildingLoading || isLoading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="page-title">📢 Ανακοινώσεις</h1>
          {canCreateAnnouncement && (
            <Button asChild>
              <Link href="/announcements/new">
                {selectedBuilding
                  ? `Νέα Ανακοίνωση για το κτίριο ${selectedBuilding.name}`
                  : "Νέα Ανακοίνωση"
                }
              </Link>
            </Button>
          )}
        </div>
        <BuildingFilterIndicator className="mb-4" />
        {[...Array(3)].map((_, i) => (
          <AnnouncementSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="page-title">📢 Ανακοινώσεις</h1>
          {canCreateAnnouncement && (
            <Button asChild>
              <Link href="/announcements/new">
                {selectedBuilding
                  ? `Νέα Ανακοίνωση για το κτίριο ${selectedBuilding.name}`
                  : "Νέα Ανακοίνωση"
                }
              </Link>
            </Button>
          )}
        </div>
        <BuildingFilterIndicator className="mb-4" />
        <ErrorMessage message="Αδυναμία φόρτωσης ανακοινώσεων. Παρακαλώ δοκιμάστε ξανά αργότερα." />
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="page-title">📢 Ανακοινώσεις</h1>
          {canCreateAnnouncement && (
            <Button asChild>
              <Link href="/announcements/new">
                {selectedBuilding
                  ? `Νέα Ανακοίνωση για το κτίριο ${selectedBuilding.name}`
                  : "Νέα Ανακοίνωση"
                }
              </Link>
            </Button>
          )}
        </div>
        <BuildingFilterIndicator className="mb-4" />
        <p className="text-muted-foreground text-center">
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">📢 Ανακοινώσεις</h1>
          <p className="text-muted-foreground mt-1">Ενημερώσεις και νέα για το κτίριο</p>
        </div>
        {canCreateAnnouncement && (
          <div className="flex gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href="/announcements/new-assembly">
                <Building2 className="w-4 h-4 mr-2" />
                Νέα Συνέλευση
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/announcements/new">
                <Plus className="w-4 h-4 mr-2" />
                {selectedBuilding ? "Νέα Ανακοίνωση" : "Νέα Ανακοίνωση"}
              </Link>
            </Button>
          </div>
        )}
      </div>

      <BuildingFilterIndicator className="mb-2" />

      {announcements.length === 0 ? (
        <div className="bg-card rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          <Megaphone className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="font-medium mb-4">Δεν υπάρχουν ενεργές ανακοινώσεις.</p>
          {canCreateAnnouncement && (
            <Button asChild>
              <Link href="/announcements/new">Δημιουργία πρώτης ανακοίνωσης</Link>
            </Button>
          )}
        </div>
      ) : (
        <BentoGrid className="max-w-[1920px] auto-rows-auto gap-4">
          {announcements.map((a: Announcement) => (
            <BentoGridItem
              key={a.id}
              className="md:col-span-1"
              header={<AnnouncementCard announcement={a} className="h-full border-0 shadow-none bg-transparent p-0" />}
            />
          ))}
        </BentoGrid>
      )}
    </div>
  );
}

export default function AnnouncementsPage() {
  return (
    <AuthGate role="any">
      <SubscriptionGate requiredStatus="any">
        <AnnouncementsPageContent />
      </SubscriptionGate>
    </AuthGate>
  );
}

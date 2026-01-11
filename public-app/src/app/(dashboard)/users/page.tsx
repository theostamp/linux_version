'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import InviteUserModal from '@/components/InviteUserModal';
import InvitationsList from '@/components/InvitationsList';
import UsersList from '@/components/UsersList';
import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid';
import { cn } from '@/lib/utils';
import { UserPlus, Mail, Users } from 'lucide-react';
import { useAuth } from '@/components/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { hasOfficeAdminAccess } from '@/lib/roleUtils';

export default function UsersPage() {
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [initialEmail, setInitialEmail] = useState<string | null>(null);
  const [initialBuildingId, setInitialBuildingId] = useState<number | null>(null);
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // Check if user has permission (manager, staff, or superuser)
  const hasPermission = hasOfficeAdminAccess(user);

  // Check for query parameters on mount
  useEffect(() => {
    const inviteEmail = searchParams.get('invite');
    const buildingId = searchParams.get('building');

    if (inviteEmail) {
      setInitialEmail(decodeURIComponent(inviteEmail));
      if (buildingId) {
        setInitialBuildingId(Number(buildingId));
      }
      setInviteModalOpen(true);
    }
  }, [searchParams]);

    if (!hasPermission) {
    return (
      <div className="container mx-auto py-6">
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
          Δεν έχετε δικαίωμα πρόσβασης σε αυτή τη σελίδα. Μόνο οι διαχειριστές μπορούν να προσκαλούν χρήστες.
        </div>
      </div>
    );
  }

  return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Διαχείριση Χρηστών</h1>
            <p className="text-muted-foreground mt-2">
              Προσκαλέστε νέους χρήστες και διαχειριστείτε τις προσκλήσεις
            </p>
          </div>
          <Button onClick={() => {
            setInitialEmail(null);
            setInitialBuildingId(null);
            setInviteModalOpen(true);
          }}>
            <UserPlus className="h-4 w-4 mr-2" />
            Προσκάλεσε Χρήστη
          </Button>
        </div>

        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold text-foreground">Καταχωρημένοι Χρήστες</h2>
          </div>
          <UsersList />
        </div>

        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold text-foreground">Προσκλήσεις</h2>
          </div>
          <InvitationsList />
        </div>

        <InviteUserModal
          open={inviteModalOpen}
          onOpenChange={(open) => {
            setInviteModalOpen(open);
            if (!open) {
              setInitialEmail(null);
              setInitialBuildingId(null);
            }
          }}
          defaultEmail={initialEmail || undefined}
          defaultBuildingId={initialBuildingId || undefined}
        />
      </div>
  );
}

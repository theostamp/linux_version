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
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          Δεν έχετε δικαίωμα πρόσβασης σε αυτή τη σελίδα. Μόνο οι διαχειριστές μπορούν να προσκαλούν χρήστες.
        </div>
      </div>
    );
  }

  return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Διαχείριση Χρηστών</h1>
            <p className="text-gray-600 mt-2">
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

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">Καταχωρημένοι Χρήστες</h2>
          </div>
          <UsersList />
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="h-5 w-5 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">Προσκλήσεις</h2>
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


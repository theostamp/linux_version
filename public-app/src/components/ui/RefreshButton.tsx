/**
 * RefreshButton Component
 *
 * A button that triggers global refresh of data.
 * Can be placed anywhere in the app for manual refresh capability.
 */

'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGlobalRefresh } from '@/hooks/useGlobalRefresh';
import { toast } from 'sonner';

interface RefreshButtonProps {
  scope?: 'all' | 'financial' | 'buildings' | 'projects' | 'announcements' | 'requests' | 'votes' | 'community';
  label?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showToast?: boolean;
}

export function RefreshButton({
  scope = 'all',
  label,
  variant = 'outline',
  size = 'sm',
  className,
  showToast = true,
}: RefreshButtonProps) {
  const {
    refreshFinancial,
    refreshBuildings,
    refreshProjects,
    refreshAnnouncements,
    refreshRequests,
    refreshVotes,
    refreshCommunity,
    refreshAll
  } = useGlobalRefresh();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);

    try {
      switch (scope) {
        case 'financial':
          await refreshFinancial();
          if (showToast) toast.success('Τα οικονομικά δεδομένα ανανεώθηκαν');
          break;
        case 'buildings':
          await refreshBuildings();
          if (showToast) toast.success('Τα δεδομένα κτιρίων ανανεώθηκαν');
          break;
        case 'projects':
          await refreshProjects();
          if (showToast) toast.success('Τα έργα και οι προσφορές ανανεώθηκαν');
          break;
        case 'announcements':
          await refreshAnnouncements();
          if (showToast) toast.success('Οι ανακοινώσεις ανανεώθηκαν');
          break;
        case 'requests':
          await refreshRequests();
          if (showToast) toast.success('Τα αιτήματα ανανεώθηκαν');
          break;
        case 'votes':
          await refreshVotes();
          if (showToast) toast.success('Οι ψηφοφορίες ανανεώθηκαν');
          break;
        case 'community':
          await refreshCommunity();
          if (showToast) toast.success('Τα δεδομένα κοινότητας ανανεώθηκαν');
          break;
        case 'all':
        default:
          await refreshAll();
          if (showToast) toast.success('Όλα τα δεδομένα ανανεώθηκαν');
          break;
      }
    } catch (error) {
      console.error('[RefreshButton] Refresh failed:', error);
      if (showToast) toast.error('Αποτυχία ανανέωσης δεδομένων');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Button
      onClick={handleRefresh}
      disabled={isRefreshing}
      variant={variant}
      size={size}
      className={className}
    >
      <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''} ${label ? 'mr-2' : ''}`} />
      {label && <span>{label}</span>}
    </Button>
  );
}

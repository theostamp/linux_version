'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { fetchAnnouncement, fetchAnnouncements } from '@/lib/api';
import type { Announcement } from '@/components/AnnouncementCard';
import ErrorMessage from '@/components/ErrorMessage';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/components/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import AnnouncementContent from '@/components/AnnouncementContent';

export default function AnnouncementDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, isAuthReady } = useAuth();

  const { 
    data: announcement, 
    isLoading, 
    error 
  } = useQuery<Announcement, Error>({
    queryKey: ['announcement', id],
    queryFn: () => fetchAnnouncement(id),
    enabled: isAuthReady && isAuthenticated, // Run query only when user is authenticated
    retry: 1, // Retry once on failure
  });

  useEffect(() => {
    if (isAuthReady && !isAuthenticated) {
      toast.error('Παρακαλώ συνδεθείτε για να δείτε αυτή τη σελίδα.');
      setTimeout(() => {
        router.push('/login');
      }, 1000);
    }

    // Handle specific API errors from useQuery
    if (error) {
      const err = error as any;
      if (err?.response?.status === 404) {
        toast.error('Η ανακοίνωση δεν βρέθηκε. Πιθανώς διαγράφηκε.');
      }
    }
  }, [isAuthReady, isAuthenticated, router, error]);

  if (authLoading || (!isAuthReady && !error)) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-6">Έλεγχος πρόσβασης...</h1>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6 mb-2"></div>
        </div>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-6">Φόρτωση ανακοίνωσης...</h1>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6 mb-2"></div>
        </div>
      </div>
    );
  }
  
  if (error || !announcement) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-6">Σφάλμα</h1>
        <ErrorMessage message={error?.message || 'Η ανακοίνωση δεν βρέθηκε'} />
        <div className="mt-4">
          <Button asChild>
            <Link href="/announcements">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Επιστροφή στις ανακοινώσεις
            </Link>
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-4">
        <Button variant="outline" asChild>
          <Link href="/announcements">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Πίσω στις ανακοινώσεις
          </Link>
        </Button>
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">{announcement.title}</h1>
        
        <AnnouncementContent
          title={announcement.title}
          description={announcement.description}
          startDate={announcement.start_date || undefined}
          endDate={announcement.end_date || undefined}
        />
        
        {announcement.file && (
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">Συνημμένο αρχείο</h3>
            <a 
              href={announcement.file} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              Προβολή / Λήψη αρχείου
            </a>
          </div>
        )}
      </div>
    </div>
  );
} 
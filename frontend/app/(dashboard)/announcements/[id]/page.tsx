'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { fetchAnnouncement, fetchAnnouncements } from '@/lib/api';
import type { Announcement } from '@/components/AnnouncementCard';
import ErrorMessage from '@/components/ErrorMessage';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/components/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function AnnouncementDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasShownAuthError, setHasShownAuthError] = useState(false);
  
  // Check authentication
  useEffect(() => {
    if (!authLoading && !isAuthenticated && !hasShownAuthError) {
      console.log('[AnnouncementDetailPage] User not authenticated, redirecting to login');
      toast.error('Παρακαλώ συνδεθείτε για να δείτε την ανακοίνωση');
      setHasShownAuthError(true);
      
      // Μικρή καθυστέρηση για να προλάβει να εμφανιστεί το toast
      setTimeout(() => {
        router.push('/login');
      }, 1000);
    }
  }, [isAuthenticated, authLoading, router, hasShownAuthError]);
  
  useEffect(() => {
    const fetchAnnouncementData = async () => {
      if (!isAuthenticated || authLoading) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await fetchAnnouncement(id);
        setAnnouncement(data);
      } catch (err: any) {
        console.error('[AnnouncementDetail] Error fetching announcement:', err);
        
        // Handle authentication errors
        if (err?.response?.status === 401 && !hasShownAuthError) {
          toast.error('Η συνεδρία σας έληξε. Παρακαλώ συνδεθείτε ξανά.');
          setHasShownAuthError(true);
          
          setTimeout(() => {
            router.push('/login');
          }, 1000);
          return;
        }
        
        // Enhanced 404 handling
        if (err?.response?.status === 404) {
          setError('Η ανακοίνωση δεν βρέθηκε. Πιθανώς διαγράφηκε ή μετακινήθηκε.');
          
                     // Try to fetch available announcements to suggest alternatives
           try {
             const availableAnnouncements = await fetchAnnouncements();
             if (availableAnnouncements.length > 0) {
               const firstAnnouncement = availableAnnouncements[0];
               toast.error(
                 `Η ανακοίνωση δεν βρέθηκε. Δοκιμάστε την: "${firstAnnouncement.title}"`,
                 { duration: 5000 }
               );
             }
           } catch (fallbackError) {
             console.error('[AnnouncementDetail] Error fetching fallback announcements:', fallbackError);
           }
        } else {
          setError(err?.response?.data?.detail || 'Αδυναμία φόρτωσης ανακοίνωσης');
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAnnouncementData();
  }, [id, isAuthenticated, authLoading, router, hasShownAuthError]);
  
  if (authLoading || (!isAuthenticated && !error)) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Έλεγχος πρόσβασης...</h1>
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
        <h1 className="text-3xl font-bold mb-6">Φόρτωση ανακοίνωσης...</h1>
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
        <h1 className="text-3xl font-bold mb-6">Σφάλμα</h1>
        <ErrorMessage message={error || 'Η ανακοίνωση δεν βρέθηκε'} />
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
        <h1 className="text-3xl font-bold mb-2">{announcement.title}</h1>
        
        <div className="flex items-center text-sm text-gray-500 mb-4">
          <span>Ημ/νία έναρξης: {announcement.start_date ? new Date(announcement.start_date).toLocaleDateString('el-GR') : 'Μη καθορισμένη'}</span>
          <span className="mx-2">•</span>
          <span>Ημ/νία λήξης: {announcement.end_date ? new Date(announcement.end_date).toLocaleDateString('el-GR') : 'Μη καθορισμένη'}</span>
        </div>
        
        <div className="prose max-w-none">
          <p className="whitespace-pre-wrap">{announcement.description}</p>
        </div>
        
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
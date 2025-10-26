'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/contexts/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Bell, 
  Plus, 
  Search, 
  Calendar, 
  User, 
  Building,
  Loader2,
  AlertCircle,
  RefreshCw,
  Clock,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface Announcement {
  id: number;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  created_at: string;
  created_by: {
    id: number;
    first_name: string;
    last_name: string;
  };
  building?: {
    id: number;
    name: string;
  };
}

export default function AnnouncementsPage() {
  const { user, isAuthReady } = useAuth();
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!isAuthReady) return;
    
    if (!user) {
      router.push('/login');
      return;
    }

    fetchAnnouncements();
  }, [user, isAuthReady]);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/announcements/');
      setAnnouncements(data);
    } catch (err: any) {
      console.error('Failed to fetch announcements:', err);
      setError('Αποτυχία φόρτωσης ανακοινώσεων');
      toast.error('Αποτυχία φόρτωσης ανακοινώσεων');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    fetchAnnouncements();
  };

  const getAnnouncementStatus = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (now < start) {
      return { status: 'upcoming', text: 'Προσεχώς', color: 'text-blue-600 bg-blue-100' };
    } else if (now > end) {
      return { status: 'expired', text: 'Ληγμένη', color: 'text-gray-600 bg-gray-100' };
    } else {
      return { status: 'active', text: 'Ενεργή', color: 'text-green-600 bg-green-100' };
    }
  };

  const filteredAnnouncements = announcements.filter(announcement =>
    announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    announcement.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Φόρτωση ανακοινώσεων...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Σφάλμα</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <Button onClick={handleRetry} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Προσπάθεια Ξανά
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Ανακοινώσεις</h1>
              <p className="mt-2 text-gray-600">Πρόσφατες ανακοινώσεις και ενημερώσεις</p>
            </div>
            {user?.is_staff && (
              <Button onClick={() => router.push('/announcements/new')}>
                <Plus className="w-4 h-4 mr-2" />
                Νέα Ανακοίνωση
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Αναζήτηση ανακοινώσεων..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Ενεργές</p>
                  <p className="text-2xl font-bold text-green-600">
                    {announcements.filter(a => {
                      const now = new Date();
                      const start = new Date(a.start_date);
                      const end = new Date(a.end_date);
                      return now >= start && now <= end;
                    }).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Προσεχώς</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {announcements.filter(a => {
                      const now = new Date();
                      const start = new Date(a.start_date);
                      return now < start;
                    }).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Bell className="w-8 h-8 text-gray-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Σύνολο</p>
                  <p className="text-2xl font-bold text-gray-600">
                    {announcements.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Announcements List */}
        <div className="space-y-4">
          {filteredAnnouncements.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {searchTerm ? 'Δεν βρέθηκαν ανακοινώσεις' : 'Δεν υπάρχουν ανακοινώσεις'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm 
                    ? 'Δοκιμάστε να αλλάξετε τους όρους αναζήτησης'
                    : 'Δεν έχουν δημοσιευτεί ανακοινώσεις ακόμα'
                  }
                </p>
                {user?.is_staff && (
                  <Button onClick={() => router.push('/announcements/new')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Νέα Ανακοίνωση
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredAnnouncements.map((announcement) => {
              const status = getAnnouncementStatus(announcement.start_date, announcement.end_date);
              
              return (
                <Card key={announcement.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {announcement.title}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                            {status.text}
                          </span>
                        </div>
                        
                        <p className="text-gray-600 mb-4 line-clamp-3">
                          {announcement.description}
                        </p>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-1" />
                            {announcement.created_by.first_name} {announcement.created_by.last_name}
                          </div>
                          {announcement.building && (
                            <div className="flex items-center">
                              <Building className="w-4 h-4 mr-1" />
                              {announcement.building.name}
                            </div>
                          )}
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {new Date(announcement.start_date).toLocaleDateString('el-GR')} - {new Date(announcement.end_date).toLocaleDateString('el-GR')}
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-4">
                        <Link href={`/announcements/${announcement.id}`}>
                          <Button variant="outline" size="sm">
                            <Bell className="w-4 h-4 mr-2" />
                            Προβολή
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

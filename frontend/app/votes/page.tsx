'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/contexts/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  Plus, 
  Search, 
  Calendar, 
  User, 
  Building,
  Loader2,
  AlertCircle,
  RefreshCw,
  Clock,
  Vote,
  Users
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface Vote {
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
  total_votes: number;
  user_voted: boolean;
}

export default function VotesPage() {
  const { user, isAuthReady } = useAuth();
  const router = useRouter();
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!isAuthReady) return;
    
    if (!user) {
      router.push('/login');
      return;
    }

    fetchVotes();
  }, [user, isAuthReady]);

  const fetchVotes = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/votes/');
      setVotes(data);
    } catch (err: any) {
      console.error('Failed to fetch votes:', err);
      setError('Αποτυχία φόρτωσης ψηφοφοριών');
      toast.error('Αποτυχία φόρτωσης ψηφοφοριών');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    fetchVotes();
  };

  const getVoteStatus = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (now < start) {
      return { status: 'upcoming', text: 'Προσεχώς', color: 'text-blue-600 bg-blue-100' };
    } else if (now > end) {
      return { status: 'ended', text: 'Ολοκληρώθηκε', color: 'text-gray-600 bg-gray-100' };
    } else {
      return { status: 'active', text: 'Ενεργή', color: 'text-green-600 bg-green-100' };
    }
  };

  const filteredVotes = votes.filter(vote =>
    vote.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vote.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Φόρτωση ψηφοφοριών...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Ψηφοφορίες</h1>
              <p className="mt-2 text-gray-600">Διαχείριση ψηφοφοριών και αποφάσεων</p>
            </div>
            {user?.is_staff && (
              <Button onClick={() => router.push('/votes/new')}>
                <Plus className="w-4 h-4 mr-2" />
                Νέα Ψηφοφορία
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
                placeholder="Αναζήτηση ψηφοφοριών..."
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
                    {votes.filter(v => {
                      const now = new Date();
                      const start = new Date(v.start_date);
                      const end = new Date(v.end_date);
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
                    {votes.filter(v => {
                      const now = new Date();
                      const start = new Date(v.start_date);
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
                <Vote className="w-8 h-8 text-gray-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Σύνολο</p>
                  <p className="text-2xl font-bold text-gray-600">
                    {votes.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Votes List */}
        <div className="space-y-4">
          {filteredVotes.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Vote className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {searchTerm ? 'Δεν βρέθηκαν ψηφοφορίες' : 'Δεν υπάρχουν ψηφοφορίες'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm 
                    ? 'Δοκιμάστε να αλλάξετε τους όρους αναζήτησης'
                    : 'Δεν έχουν δημιουργηθεί ψηφοφορίες ακόμα'
                  }
                </p>
                {user?.is_staff && (
                  <Button onClick={() => router.push('/votes/new')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Νέα Ψηφοφορία
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredVotes.map((vote) => {
              const status = getVoteStatus(vote.start_date, vote.end_date);
              
              return (
                <Card key={vote.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {vote.title}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                            {status.text}
                          </span>
                          {vote.user_voted && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium text-blue-600 bg-blue-100">
                              Έχετε ψηφίσει
                            </span>
                          )}
                        </div>
                        
                        <p className="text-gray-600 mb-4 line-clamp-3">
                          {vote.description}
                        </p>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-1" />
                            {vote.created_by.first_name} {vote.created_by.last_name}
                          </div>
                          {vote.building && (
                            <div className="flex items-center">
                              <Building className="w-4 h-4 mr-1" />
                              {vote.building.name}
                            </div>
                          )}
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {new Date(vote.start_date).toLocaleDateString('el-GR')} - {new Date(vote.end_date).toLocaleDateString('el-GR')}
                          </div>
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-1" />
                            {vote.total_votes} ψήφοι
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-4">
                        <Link href={`/votes/${vote.id}`}>
                          <Button variant="outline" size="sm">
                            <Vote className="w-4 h-4 mr-2" />
                            {status.status === 'active' ? 'Ψήφισε' : 'Προβολή'}
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

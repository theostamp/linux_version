'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/contexts/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Building, 
  Plus, 
  Search, 
  MapPin, 
  Users, 
  Home,
  Loader2,
  AlertCircle,
  RefreshCw,
  Calendar,
  Phone,
  Mail
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface Building {
  id: number;
  name: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  total_apartments: number;
  total_residents: number;
  created_at: string;
  manager?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
}

export default function BuildingsPage() {
  const { user, isAuthReady } = useAuth();
  const router = useRouter();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!isAuthReady) return;
    
    if (!user) {
      router.push('/login');
      return;
    }

    fetchBuildings();
  }, [user, isAuthReady]);

  const fetchBuildings = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/buildings/');
      setBuildings(data);
    } catch (err: any) {
      console.error('Failed to fetch buildings:', err);
      setError('Αποτυχία φόρτωσης κτιρίων');
      toast.error('Αποτυχία φόρτωσης κτιρίων');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    fetchBuildings();
  };

  const filteredBuildings = buildings.filter(building =>
    building.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    building.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    building.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Φόρτωση κτιρίων...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Κτίρια</h1>
              <p className="mt-2 text-gray-600">Διαχείριση κτιρίων και πολυκατοικιών</p>
            </div>
            {user?.is_staff && (
              <Button onClick={() => router.push('/buildings/new')}>
                <Plus className="w-4 h-4 mr-2" />
                Νέο Κτίριο
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
                placeholder="Αναζήτηση κτιρίων..."
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
                <Building className="w-8 h-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Σύνολο Κτιρίων</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {buildings.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Home className="w-8 h-8 text-green-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Σύνολο Διαμερισμάτων</p>
                  <p className="text-2xl font-bold text-green-600">
                    {buildings.reduce((sum, building) => sum + building.total_apartments, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-purple-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Σύνολο Κατοίκων</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {buildings.reduce((sum, building) => sum + building.total_residents, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Buildings List */}
        <div className="space-y-4">
          {filteredBuildings.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {searchTerm ? 'Δεν βρέθηκαν κτίρια' : 'Δεν υπάρχουν κτίρια'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm 
                    ? 'Δοκιμάστε να αλλάξετε τους όρους αναζήτησης'
                    : 'Δεν έχουν προστεθεί κτίρια ακόμα'
                  }
                </p>
                {user?.is_staff && (
                  <Button onClick={() => router.push('/buildings/new')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Νέο Κτίριο
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredBuildings.map((building) => (
              <Card key={building.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {building.name}
                        </h3>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          {building.address}, {building.city} {building.postal_code}
                        </div>
                        <div className="flex items-center">
                          <Home className="w-4 h-4 mr-1" />
                          {building.total_apartments} διαμερίσματα
                        </div>
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          {building.total_residents} κάτοικοι
                        </div>
                      </div>

                      {building.manager && (
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                          <h4 className="font-medium text-gray-900 mb-2">Διαχειριστής</h4>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center">
                              <Users className="w-4 h-4 mr-1" />
                              {building.manager.first_name} {building.manager.last_name}
                            </div>
                            <div className="flex items-center">
                              <Mail className="w-4 h-4 mr-1" />
                              {building.manager.email}
                            </div>
                            {building.manager.phone && (
                              <div className="flex items-center">
                                <Phone className="w-4 h-4 mr-1" />
                                {building.manager.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="w-4 h-4 mr-1" />
                        Προστέθηκε: {new Date(building.created_at).toLocaleDateString('el-GR')}
                      </div>
                    </div>
                    
                    <div className="ml-4">
                      <Link href={`/buildings/${building.id}`}>
                        <Button variant="outline" size="sm">
                          <Building className="w-4 h-4 mr-2" />
                          Προβολή
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

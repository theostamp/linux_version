'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/contexts/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Mail, 
  Calendar, 
  Building, 
  Shield, 
  ArrowRight,
  Loader2,
  AlertCircle,
  RefreshCw,
  Edit
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface UserProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  date_joined: string;
  is_staff: boolean;
  role: string;
  tenant?: {
    schema_name: string;
    name: string;
  };
}

export default function MyProfilePage() {
  const { user, isAuthReady, refreshUser } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthReady) return;
    
    if (!user) {
      router.push('/login');
      return;
    }

    fetchProfile();
  }, [user, isAuthReady]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/users/me/');
      setProfile(data);
    } catch (err: any) {
      console.error('Failed to fetch profile:', err);
      setError('Αποτυχία φόρτωσης προφίλ');
      toast.error('Αποτυχία φόρτωσης προφίλ');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    fetchProfile();
  };

  const handleRefresh = async () => {
    try {
      await refreshUser();
      await fetchProfile();
      toast.success('Προφίλ ενημερώθηκε');
    } catch (err) {
      toast.error('Αποτυχία ενημέρωσης προφίλ');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Φόρτωση προφίλ...</p>
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

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card>
            <CardContent className="p-8 text-center">
              <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Προφίλ Δεν Βρέθηκε</h2>
              <p className="text-gray-600 mb-6">
                Δεν ήταν δυνατή η φόρτωση των στοιχείων του προφίλ σας.
              </p>
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

  const getRoleText = (role: string) => {
    switch (role) {
      case 'manager':
        return 'Διαχειριστής';
      case 'resident':
        return 'Κατοίκος';
      case 'admin':
        return 'Διαχειριστής Συστήματος';
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'manager':
        return 'text-blue-600 bg-blue-100';
      case 'resident':
        return 'text-green-600 bg-green-100';
      case 'admin':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Το Προφίλ Μου</h1>
          <p className="mt-2 text-gray-600">Προσωπικά στοιχεία και ρυθμίσεις</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Προσωπικά Στοιχεία
                </div>
                <Button variant="outline" size="sm" onClick={handleRefresh}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Ενημέρωση
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Όνομα:</span>
                <span className="font-semibold">{profile.first_name}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Επώνυμο:</span>
                <span className="font-semibold">{profile.last_name}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Email:</span>
                <span className="font-semibold">{profile.email}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Μέλος από:</span>
                <span className="font-semibold">
                  {new Date(profile.date_joined).toLocaleDateString('el-GR')}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Πληροφορίες Λογαριασμού
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Ρόλος:</span>
                <span className={`px-2 py-1 rounded-full text-sm font-medium ${getRoleColor(profile.role)}`}>
                  {getRoleText(profile.role)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Staff:</span>
                <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                  profile.is_staff ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100'
                }`}>
                  {profile.is_staff ? 'Ναι' : 'Όχι'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">ID:</span>
                <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                  {profile.id}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tenant Information */}
        {profile.tenant && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="w-5 h-5 mr-2" />
                  Χώρος Εργασίας
                </CardTitle>
                <CardDescription>
                  Ο χώρος εργασίας που διαχειρίζεστε
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Όνομα:</span>
                  <span className="font-semibold">{profile.tenant.name}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Schema:</span>
                  <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                    {profile.tenant.schema_name}
                  </span>
                </div>

                <div className="pt-4">
                  <Link href={`http://${profile.tenant.schema_name}.localhost:8080/dashboard`} className="block">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      <Building className="w-4 h-4 mr-2" />
                      Πήγαινε στην Εφαρμογή
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Actions */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Ενέργειες</CardTitle>
              <CardDescription>
                Διαχείριση λογαριασμού και ρυθμίσεις
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button variant="outline" className="w-full">
                  <Edit className="w-4 h-4 mr-2" />
                  Επεξεργασία Προφίλ
                </Button>
                
                <Link href="/my-subscription" className="block">
                  <Button variant="outline" className="w-full">
                    <Shield className="w-4 h-4 mr-2" />
                    Η Συνδρομή Μου
                  </Button>
                </Link>
                
                <Link href="/dashboard" className="block">
                  <Button variant="outline" className="w-full">
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Επιστροφή στο Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Help */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Χρειάζεστε βοήθεια;{' '}
            <a href="mailto:support@example.com" className="text-blue-600 hover:underline">
              Επικοινωνήστε μαζί μας
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit3,
  Save,
  X,
  Shield,
  CreditCard,
  Bell,
  Key,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle,
  Building2,
  Home,
  Trash2,
  ArrowRight,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/components/contexts/AuthContext';
import AuthGate from '@/components/AuthGate';
import { userProfileApi, userSubscriptionApi, type UserProfile } from '@/lib/api/user';
import { toast } from '@/hooks/use-toast';

// Helper function to get user role label in Greek
// Note: Uses system_role (CustomUser.SystemRole) and optionally resident_role (Resident.Role)
// SystemRole values: 'superuser', 'admin' (Ultra Admin), or 'manager' (Django Tenant Owner)
// Resident.Role values: 'manager' (Εσωτερικός Διαχειριστής), 'owner' (Ιδιοκτήτης), 'tenant' (Ένοικος)
const getUserRoleLabel = (profile: any): string => {
  if (!profile) return 'Χρήστης';
  
  // Use system_role if available, fallback to role (backward compat)
  const systemRole = profile.system_role ?? profile.role;
  
  // SystemRole: 'superuser' or 'admin' = Ultra Admin
  if (systemRole === 'superuser' || systemRole === 'admin') {
    return 'Ultra Admin';
  }
  
  // SystemRole: 'manager' = Django Tenant Owner
  if (systemRole === 'manager') {
    return 'Διαχειριστής'; // Office Manager = Django Tenant Owner
  }
  
  // Check resident_role if no system_role (for residents without SystemRole)
  if (profile.resident_role && !systemRole) {
    switch (profile.resident_role) {
      case 'manager':
        return 'Εσωτερικός Διαχειριστής';
      case 'owner':
        return 'Ιδιοκτήτης';
      case 'tenant':
        return 'Ένοικος';
      default:
        return 'Χρήστης';
    }
  }
  
  return 'Χρήστης';
};

// Helper to get resident role label
const getResidentRoleLabel = (residentRole?: string): string => {
  if (!residentRole) return '';
  
  switch (residentRole) {
    case 'manager':
      return 'Εσωτερικός Διαχειριστής';
    case 'owner':
      return 'Ιδιοκτήτης';
    case 'tenant':
      return 'Ένοικος';
    default:
      return residentRole;
  }
};

interface NotificationSettings {
  email_notifications: boolean;
  payment_reminders: boolean;
  maintenance_notices: boolean;
  community_updates: boolean;
  emergency_alerts: boolean;
}

export default function MyProfilePage() {
  const { user: authUser, refreshUser } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [notifications, setNotifications] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'subscription' | 'notifications' | 'security'>('profile');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    password: '',
    confirmText: '',
    understood: false
  });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    // Initialize profile with authUser immediately to prevent showing "Χρήστης"
    if (authUser && !profile) {
      console.log('[MyProfile] Setting initial profile from authUser:', authUser);
      setProfile(authUser as any);
    }
    
    // Fetch fresh profile data from API to get all fields including email_verified and date_joined
    fetchProfile();
    fetchNotificationSettings();
  }, [authUser]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      // Fetch fresh profile from API to ensure we have all fields
      const profileData = await userProfileApi.getProfile();
      
      console.log('[MyProfile] API profileData:', profileData);
      console.log('[MyProfile] Profile system_role:', profileData.system_role, 'role:', profileData.role);
      
      // If profile doesn't have subscription, try to fetch subscription directly as fallback
      if (!profileData.subscription) {
        try {
          const subscriptionResponse = await userSubscriptionApi.getCurrentSubscription();
          if (subscriptionResponse.subscription) {
            // Merge subscription data into profile
            profileData.subscription = {
              plan_name: subscriptionResponse.subscription.plan?.name || 'Unknown Plan',
              status: subscriptionResponse.subscription.status,
              current_period_end: subscriptionResponse.subscription.current_period_end,
              price: subscriptionResponse.subscription.price,
              currency: subscriptionResponse.subscription.currency,
            };
            console.log('[MyProfile] Found subscription via direct fetch:', profileData.subscription);
          }
        } catch (subError) {
          console.warn('[MyProfile] Could not fetch subscription directly:', subError);
        }
      }
      
      setProfile(profileData);
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Fallback to authUser if API fails
      if (authUser) {
        setProfile(authUser as any);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchNotificationSettings = async () => {
    try {
      // Set default notification settings since we don't have this endpoint yet
      setNotifications({
        email_notifications: true,
        payment_reminders: true,
        maintenance_notices: true,
        community_updates: true,
        emergency_alerts: true
      });
    } catch (error) {
      console.error('Error fetching notification settings:', error);
    }
  };

  const saveProfile = async () => {
    if (!profile) return;
    
    try {
      setSaving(true);
      const updatedProfile = await userProfileApi.updateProfile({
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone,
          address: profile.address,
      });
      
      // Refresh user data in AuthContext
      await refreshUser();
      
      // Update local profile state with the response
      if (updatedProfile?.user) {
        setProfile({ ...profile, ...updatedProfile.user });
      }
      
      setEditing(false);
      toast({
        title: 'Επιτυχία',
        description: 'Το προφίλ ενημερώθηκε επιτυχώς',
      });
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Σφάλμα',
        description: error?.response?.data?.error || 'Σφάλμα κατά την ενημέρωση του προφίλ',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const saveNotificationSettings = async () => {
    if (!notifications) return;
    
    try {
      setSaving(true);
      const response = await fetch('/api/user/notifications/', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notifications),
      });

      if (response.ok) {
        alert('Notification settings updated successfully!');
      }
    } catch (error) {
      console.error('Error saving notification settings:', error);
      alert('Error updating notification settings');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/user/change-password/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(passwordForm),
      });

      if (response.ok) {
        setShowPasswordForm(false);
        setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
        alert('Password changed successfully!');
      } else {
        const error = await response.json();
        alert(error.message || 'Error changing password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      alert('Error changing password');
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    if (!deleteConfirmation.understood) {
      alert('Παρακαλώ επιβεβαιώστε ότι καταλαβαίνετε τις συνέπειες');
      return;
    }

    if (deleteConfirmation.confirmText !== 'ΔΙΑΓΡΑΦΗ') {
      alert('Παρακαλώ πληκτρολογήστε "ΔΙΑΓΡΑΦΗ" για επιβεβαίωση');
      return;
    }

    if (!deleteConfirmation.password) {
      alert('Παρακαλώ εισάγετε τον κωδικό σας');
      return;
    }

    try {
      setDeleting(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18000'}/api/users/delete-account/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: deleteConfirmation.password
        }),
      });

      if (response.ok) {
        // Clear all user data
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        localStorage.removeItem('user');

        alert('Ο λογαριασμός σας διαγράφηκε επιτυχώς');

        // Redirect to home page
        window.location.href = '/';
      } else {
        const error = await response.json();
        alert(error.message || error.detail || 'Σφάλμα κατά τη διαγραφή λογαριασμού');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Σφάλμα κατά τη διαγραφή λογαριασμού');
    } finally {
      setDeleting(false);
    }
  };

  const updateProfileField = (field: keyof UserProfile, value: any) => {
    if (!profile) return;
    setProfile({ ...profile, [field]: value });
  };

  const updateNotificationSetting = (field: keyof NotificationSettings, value: boolean) => {
    if (!notifications) return;
    setNotifications({ ...notifications, [field]: value });
  };

  const getSubscriptionStatusBadge = (status: string) => {
    const statusConfig = {
      'active': { variant: 'default' as const, label: 'Ενεργή', icon: CheckCircle },
      'trial': { variant: 'secondary' as const, label: 'Trial', icon: Calendar },
      'past_due': { variant: 'destructive' as const, label: 'Καθυστέρηση', icon: AlertTriangle },
      'canceled': { variant: 'secondary' as const, label: 'Ακυρωμένη', icon: X },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <config.icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('el-GR', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Φόρτωση προφίλ...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthGate>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Το Προφίλ μου</h1>
            <p className="text-gray-600 mt-2">Διαχείριση προσωπικών στοιχείων και ρυθμίσεων</p>
          </div>
          {activeTab === 'profile' && (
            <div className="flex gap-2">
              {editing ? (
                <>
                  <Button variant="outline" onClick={() => setEditing(false)} className="flex items-center gap-2">
                    <X className="w-4 h-4" />
                    Ακύρωση
                  </Button>
                  <Button onClick={saveProfile} disabled={saving} className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    {saving ? 'Αποθήκευση...' : 'Αποθήκευση'}
                  </Button>
                </>
              ) : (
                <Button onClick={() => setEditing(true)} className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4" />
                  Επεξεργασία
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'profile', label: 'Προφίλ', icon: User },
              { id: 'subscription', label: 'Συνδρομή', icon: CreditCard },
              { id: 'notifications', label: 'Ειδοποιήσεις', icon: Bell },
              { id: 'security', label: 'Ασφάλεια', icon: Shield },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Overview */}
          <div className="lg:col-span-1">
            <Card className="p-6">
              <div className="text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold">
                  {profile?.first_name} {profile?.last_name}
                </h3>
                <p className="text-gray-500">{profile?.email}</p>
                {profile?.email_verified ? (
                  <Badge variant="default" className="mt-2">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Επιβεβαιωμένος
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="mt-2">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Μη Επιβεβαιωμένος
                  </Badge>
                )}
              </div>
              
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">Μέλος από</p>
                    <p className="text-xs text-gray-500">
                      {profile?.date_joined ? new Date(profile.date_joined).toLocaleDateString('el-GR') : '-'}
                    </p>
                  </div>
                </div>
                
                {profile?.last_login && (
                  <div className="flex items-center gap-3">
                    <Eye className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">Τελευταία σύνδεση</p>
                      <p className="text-xs text-gray-500">
                        {new Date(profile.last_login).toLocaleDateString('el-GR')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-6">Προσωπικά Στοιχεία</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="first_name">Όνομα</Label>
                    <Input
                      id="first_name"
                      value={profile?.first_name || ''}
                      onChange={(e) => updateProfileField('first_name', e.target.value)}
                      disabled={!editing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Επώνυμο</Label>
                    <Input
                      id="last_name"
                      value={profile?.last_name || ''}
                      onChange={(e) => updateProfileField('last_name', e.target.value)}
                      disabled={!editing}
                    />
                  </div>
                </div>
                
                <div className="mt-6">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={profile?.email || ''}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Το email δεν μπορεί να αλλάξει. Επικοινωνήστε με την υποστήριξη αν χρειάζεται αλλαγή.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div>
                    <Label htmlFor="phone">Τηλέφωνο</Label>
                    <Input
                      id="phone"
                      value={profile?.phone || ''}
                      onChange={(e) => updateProfileField('phone', e.target.value)}
                      disabled={!editing}
                      placeholder="+30 210 123 4567"
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Ρόλος Συστήματος</Label>
                    <Input
                      id="role"
                      value={loading && !profile ? 'Φόρτωση...' : getUserRoleLabel(profile)}
                      disabled
                      className="bg-gray-50"
                    />
                    {profile?.resident_role && (
                      <div className="mt-4">
                        <Label htmlFor="resident-role">Ρόλος Κατοίκου</Label>
                        <Input
                          id="resident-role"
                          value={getResidentRoleLabel(profile.resident_role)}
                          disabled
                          className="bg-gray-50"
                        />
                        {profile?.resident_profile && (
                          <p className="mt-1 text-sm text-gray-500">
                            Διαμέρισμα: {profile.resident_profile.apartment} | Κτίριο: {profile.resident_profile.building_name}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-6">
                  <Label htmlFor="address">Διεύθυνση</Label>
                  <Textarea
                    id="address"
                    value={profile?.address || ''}
                    onChange={(e) => updateProfileField('address', e.target.value)}
                    disabled={!editing}
                    rows={3}
                    placeholder="Οδός, Αριθμός, Πόλη, ΤΚ"
                  />
                </div>

                {/* Office Information for Managers */}
                {profile?.role === 'manager' && profile?.office_name && (
                  <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Στοιχεία Γραφείου Διαχείρισης
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-blue-800">Όνομα Γραφείου</p>
                        <p className="text-blue-700">{profile.office_name}</p>
                      </div>
                      {profile.office_phone && (
                        <div>
                          <p className="font-medium text-blue-800">Τηλέφωνο</p>
                          <p className="text-blue-700">{profile.office_phone}</p>
                        </div>
                      )}
                      {profile.office_address && (
                        <div className="md:col-span-2">
                          <p className="font-medium text-blue-800">Διεύθυνση</p>
                          <p className="text-blue-700">{profile.office_address}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* My Apartments */}
                {profile?.apartments && profile.apartments.length > 0 && (
                  <div className="mt-8">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Home className="w-4 h-4" />
                      Τα Διαμερίσματά μου
                    </h4>
                    <div className="space-y-2">
                      {profile.apartments.map((apt) => (
                        <div key={apt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">{apt.building_name}</p>
                            <p className="text-sm text-gray-500">Διαμέρισμα {apt.apartment_number}</p>
                          </div>
                          <Badge variant="outline">{apt.role}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Subscription Tab */}
            {activeTab === 'subscription' && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-6">Συνδρομή</h3>
                
                {/* Warning for managers without subscription */}
                {!profile?.subscription && (profile?.role === 'manager' || profile?.system_role === 'manager') && (
                  <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-yellow-800 mb-1">Προσοχή: Λείπει η Συνδρομή</h4>
                        <p className="text-sm text-yellow-700 mb-3">
                          Ως διαχειριστής κτιρίου, θα πρέπει να έχετε ενεργή συνδρομή. Εάν δεν εμφανίζεται η συνδρομή σας, παρακαλώ επικοινωνήστε με την υποστήριξη ή ανανεώστε τη σελίδα.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            fetchProfile();
                            toast({
                              title: 'Ανανέωση...',
                              description: 'Ανανέωση δεδομένων συνδρομής...',
                            });
                          }}
                          className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Ανανέωση Συνδρομής
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                
                {profile?.subscription ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Plan</p>
                        <p className="text-lg font-semibold">{profile.subscription.plan_name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Status</p>
                        {getSubscriptionStatusBadge(profile.subscription.status)}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Τιμή</p>
                        <p className="text-lg font-semibold">
                          {formatCurrency(profile.subscription.price, profile.subscription.currency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Λήξη Περιόδου</p>
                        <p className="text-lg font-semibold">
                          {new Date(profile.subscription.current_period_end).toLocaleDateString('el-GR')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 flex-wrap">
                      <Link href="/plans">
                        <Button variant="outline" className="flex items-center gap-2">
                          Αλλαγή Plan
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Link href="/my-subscription">
                        <Button variant="outline" className="flex items-center gap-2">
                          Ιστορικό Πληρωμών
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Link href="/my-subscription">
                        <Button variant="outline" className="flex items-center gap-2">
                          Διαχείριση Πληρωμών
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* No Subscription Message */}
                    <div className="text-center py-12">
                      <div className="max-w-md mx-auto">
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                          <CreditCard className="w-12 h-12 text-blue-500" />
                        </div>
                        <h4 className="text-2xl font-bold mb-3 text-gray-900">Δεν έχετε συνδρομή</h4>
                        <p className="text-gray-600 mb-2 max-w-sm mx-auto text-base">
                          Δημιουργήστε μια συνδρομή για να αποκτήσετε πρόσβαση σε όλες τις δυνατότητες του συστήματος.
                        </p>
                        <p className="text-sm text-gray-500 mb-8 max-w-sm mx-auto">
                          Επιλέξτε ένα πλάνο που ταιριάζει στις ανάγκες σας και ξεκινήστε να απολαμβάνετε όλα τα features.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                          <Link href="/plans" className="w-full sm:w-auto">
                            <Button className="w-full sm:w-auto flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-base">
                              <CreditCard className="w-5 h-5" />
                              Επιλογή Plan
                              <ArrowRight className="w-5 h-5" />
                            </Button>
                          </Link>
                          <Link href="/my-subscription" className="w-full sm:w-auto">
                            <Button variant="outline" className="w-full sm:w-auto flex items-center gap-2 px-6 py-3 text-base border-gray-300 hover:bg-gray-50">
                              Δες τις Επιλογές
                              <ExternalLink className="w-5 h-5" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>

                    {/* Additional Help Section */}
                    <div className="border-t pt-6 mt-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <div className="p-4 rounded-lg bg-gray-50">
                          <div className="text-2xl font-bold text-blue-600 mb-2">29€</div>
                          <p className="text-sm text-gray-600">Ξεκινά από /μήνα</p>
                        </div>
                        <div className="p-4 rounded-lg bg-gray-50">
                          <div className="text-2xl font-bold text-green-600 mb-2">Δωρεάν</div>
                          <p className="text-sm text-gray-600">Δοκιμαστική περίοδος</p>
                        </div>
                        <div className="p-4 rounded-lg bg-gray-50">
                          <div className="text-2xl font-bold text-purple-600 mb-2">Άμεσα</div>
                          <p className="text-sm text-gray-600">Ενεργοποίηση</p>
                        </div>
                      </div>
                      
                      <div className="mt-6 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            fetchProfile();
                            toast({
                              title: 'Ανανέωση...',
                              description: 'Ελέγχοντας συνδρομή...',
                            });
                          }}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Ανανέωση Συνδρομής
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && notifications && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-6">Ρυθμίσεις Ειδοποιήσεων</h3>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Email Ειδοποιήσεις</p>
                      <p className="text-sm text-gray-500">Λάβετε ειδοποιήσεις μέσω email</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications.email_notifications}
                      onChange={(e) => updateNotificationSetting('email_notifications', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Υπενθυμίσεις Πληρωμών</p>
                      <p className="text-sm text-gray-500">Ειδοποιήσεις για επόμενες πληρωμές</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications.payment_reminders}
                      onChange={(e) => updateNotificationSetting('payment_reminders', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Ανακοινώσεις Συντήρησης</p>
                      <p className="text-sm text-gray-500">Ενημερώσεις για εργασίες συντήρησης</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications.maintenance_notices}
                      onChange={(e) => updateNotificationSetting('maintenance_notices', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Ενημερώσεις Κοινού</p>
                      <p className="text-sm text-gray-500">Ανακοινώσεις από τη διαχείριση</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications.community_updates}
                      onChange={(e) => updateNotificationSetting('community_updates', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Επείγουσες Ειδοποιήσεις</p>
                      <p className="text-sm text-gray-500">Σημαντικές ειδοποιήσεις ασφαλείας</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications.emergency_alerts}
                      onChange={(e) => updateNotificationSetting('emergency_alerts', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div className="mt-6">
                  <Button onClick={saveNotificationSettings} disabled={saving}>
                    {saving ? 'Αποθήκευση...' : 'Αποθήκευση Ρυθμίσεων'}
                  </Button>
                </div>
              </Card>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-6">Ασφάλεια</h3>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Κωδικός Πρόσβασης</p>
                      <p className="text-sm text-gray-500">Αλλάξτε τον κωδικό πρόσβασής σας</p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowPasswordForm(!showPasswordForm)}
                    >
                      {showPasswordForm ? 'Ακύρωση' : 'Αλλαγή Κωδικού'}
                    </Button>
                  </div>
                  
                  {showPasswordForm && (
                    <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                      <div>
                        <Label htmlFor="current_password">Τρέχων Κωδικός</Label>
                        <Input
                          id="current_password"
                          type="password"
                          value={passwordForm.current_password}
                          onChange={(e) => setPasswordForm({...passwordForm, current_password: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="new_password">Νέος Κωδικός</Label>
                        <Input
                          id="new_password"
                          type="password"
                          value={passwordForm.new_password}
                          onChange={(e) => setPasswordForm({...passwordForm, new_password: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="confirm_password">Επιβεβαίωση Νέου Κωδικού</Label>
                        <Input
                          id="confirm_password"
                          type="password"
                          value={passwordForm.confirm_password}
                          onChange={(e) => setPasswordForm({...passwordForm, confirm_password: e.target.value})}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={changePassword} disabled={saving}>
                          {saving ? 'Αλλαγή...' : 'Αλλαγή Κωδικού'}
                        </Button>
                        <Button variant="outline" onClick={() => setShowPasswordForm(false)}>
                          Ακύρωση
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Two-Factor Authentication</p>
                      <p className="text-sm text-gray-500">Πρόσθετη ασφάλεια για τον λογαριασμό σας</p>
                    </div>
                    <Button variant="outline" disabled>
                      Ενεργοποίηση (Σύντομα)
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Ενεργές Συνδέσεις</p>
                      <p className="text-sm text-gray-500">Δείτε όλες τις ενεργές συνδέσεις</p>
                    </div>
                    <Button variant="outline">
                      Προβολή
                    </Button>
                  </div>

                  {/* Danger Zone - Delete Account */}
                  <div className="mt-8 pt-6 border-t border-red-200">
                    <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
                      <div className="flex items-start gap-3 mb-4">
                        <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                        <div>
                          <h4 className="font-semibold text-red-900 mb-2">Ζώνη Κινδύνου</h4>
                          <p className="text-sm text-red-700 mb-4">
                            Η διαγραφή του λογαριασμού σας είναι <strong>μόνιμη και μη αναστρέψιμη</strong>.
                            Όλα τα δεδομένα σας, συμπεριλαμβανομένων των ρυθμίσεων, προφίλ και ιστορικού, θα διαγραφούν οριστικά.
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="destructive"
                        onClick={() => setShowDeleteDialog(true)}
                        className="flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Διαγραφή Λογαριασμού
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Delete Account Confirmation Dialog */}
                {showDeleteDialog && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                          <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">Διαγραφή Λογαριασμού</h3>
                          <p className="text-sm text-gray-600">Αυτή η ενέργεια είναι μόνιμη</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <p className="text-sm text-red-800 font-medium mb-2">Τι θα διαγραφεί:</p>
                          <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                            <li>Όλα τα προσωπικά σας δεδομένα</li>
                            <li>Ιστορικό δραστηριότητας</li>
                            <li>Ρυθμίσεις και προτιμήσεις</li>
                            <li>Συνδεδεμένα διαμερίσματα και κτίρια</li>
                          </ul>
                        </div>

                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            id="delete-understood"
                            checked={deleteConfirmation.understood}
                            onChange={(e) => setDeleteConfirmation({...deleteConfirmation, understood: e.target.checked})}
                            className="mt-1 w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                          />
                          <label htmlFor="delete-understood" className="text-sm text-gray-700">
                            Καταλαβαίνω ότι αυτή η ενέργεια είναι μόνιμη και δεν μπορεί να αναιρεθεί
                          </label>
                        </div>

                        <div>
                          <Label htmlFor="confirm-text" className="text-sm font-medium">
                            Πληκτρολογήστε <span className="font-bold text-red-600">ΔΙΑΓΡΑΦΗ</span> για επιβεβαίωση
                          </Label>
                          <Input
                            id="confirm-text"
                            value={deleteConfirmation.confirmText}
                            onChange={(e) => setDeleteConfirmation({...deleteConfirmation, confirmText: e.target.value})}
                            placeholder="ΔΙΑΓΡΑΦΗ"
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label htmlFor="delete-password" className="text-sm font-medium">
                            Εισάγετε τον κωδικό σας για επιβεβαίωση
                          </Label>
                          <Input
                            id="delete-password"
                            type="password"
                            value={deleteConfirmation.password}
                            onChange={(e) => setDeleteConfirmation({...deleteConfirmation, password: e.target.value})}
                            placeholder="Κωδικός πρόσβασης"
                            className="mt-1"
                          />
                        </div>

                        <div className="flex gap-3 pt-4">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowDeleteDialog(false);
                              setDeleteConfirmation({ password: '', confirmText: '', understood: false });
                            }}
                            className="flex-1"
                            disabled={deleting}
                          >
                            Ακύρωση
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={deleteAccount}
                            className="flex-1"
                            disabled={deleting || !deleteConfirmation.understood || deleteConfirmation.confirmText !== 'ΔΙΑΓΡΑΦΗ'}
                          >
                            {deleting ? 'Διαγραφή...' : 'Οριστική Διαγραφή'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>
    </AuthGate>
  );
}



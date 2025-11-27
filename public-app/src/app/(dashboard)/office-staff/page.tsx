'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/contexts/AuthContext';
import { api } from '@/lib/api';
import { 
  UserPlus, 
  Users, 
  Shield, 
  Eye,
  EyeOff,
  X,
  Pencil,
  Key,
  Activity,
  AlertCircle,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
interface StaffPermissions {
  id: number;
  job_title: string;
  can_view_financials: boolean;
  can_record_payments: boolean;
  can_create_expenses: boolean;
  can_edit_expenses: boolean;
  can_create_announcements: boolean;
  can_send_notifications: boolean;
  can_manage_requests: boolean;
  can_manage_maintenance: boolean;
  can_view_apartments: boolean;
  can_edit_apartments: boolean;
  can_view_residents: boolean;
  can_invite_residents: boolean;
  can_upload_documents: boolean;
  can_delete_documents: boolean;
  is_active: boolean;
}

interface StaffMember {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
  permissions: StaffPermissions | null;
}

interface ActivityLogEntry {
  id: number;
  user_email: string;
  action: string;
  action_display: string;
  action_description: string;
  target_description: string;
  building_name: string;
  severity: string;
  created_at: string;
}

// Permission groups for the UI
const permissionGroups = [
  {
    title: 'Οικονομικά',
    icon: '💰',
    permissions: [
      { key: 'can_view_financials', label: 'Προβολή Οικονομικών', description: 'Μπορεί να βλέπει οικονομικά στοιχεία' },
      { key: 'can_record_payments', label: 'Καταχώρηση Πληρωμών', description: 'Μπορεί να καταχωρεί πληρωμές' },
      { key: 'can_create_expenses', label: 'Δημιουργία Δαπανών', description: 'Μπορεί να δημιουργεί δαπάνες' },
      { key: 'can_edit_expenses', label: 'Επεξεργασία Δαπανών', description: 'Μπορεί να επεξεργάζεται δαπάνες' },
    ]
  },
  {
    title: 'Επικοινωνία',
    icon: '📢',
    permissions: [
      { key: 'can_create_announcements', label: 'Ανακοινώσεις', description: 'Μπορεί να δημιουργεί ανακοινώσεις' },
      { key: 'can_send_notifications', label: 'Ειδοποιήσεις', description: 'Μπορεί να στέλνει ειδοποιήσεις' },
    ]
  },
  {
    title: 'Αιτήματα & Συντήρηση',
    icon: '🔧',
    permissions: [
      { key: 'can_manage_requests', label: 'Διαχείριση Αιτημάτων', description: 'Μπορεί να διαχειρίζεται αιτήματα' },
      { key: 'can_manage_maintenance', label: 'Διαχείριση Συντήρησης', description: 'Μπορεί να διαχειρίζεται συντήρηση' },
    ]
  },
  {
    title: 'Κτίρια & Ένοικοι',
    icon: '🏢',
    permissions: [
      { key: 'can_view_apartments', label: 'Προβολή Διαμερισμάτων', description: 'Μπορεί να βλέπει διαμερίσματα' },
      { key: 'can_edit_apartments', label: 'Επεξεργασία Διαμερισμάτων', description: 'Μπορεί να επεξεργάζεται διαμερίσματα' },
      { key: 'can_view_residents', label: 'Προβολή Ενοίκων', description: 'Μπορεί να βλέπει ενοίκους' },
      { key: 'can_invite_residents', label: 'Πρόσκληση Ενοίκων', description: 'Μπορεί να προσκαλεί ενοίκους' },
    ]
  },
  {
    title: 'Έγγραφα',
    icon: '📄',
    permissions: [
      { key: 'can_upload_documents', label: 'Ανέβασμα Εγγράφων', description: 'Μπορεί να ανεβάζει έγγραφα' },
      { key: 'can_delete_documents', label: 'Διαγραφή Εγγράφων', description: 'Μπορεί να διαγράφει έγγραφα' },
    ]
  },
];

export default function OfficeStaffPage() {
  const { user, isLoading: authLoading } = useAuth();
  
  // State
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    job_title: '',
    // Default permissions
    can_view_financials: true,
    can_record_payments: false,
    can_create_expenses: false,
    can_edit_expenses: false,
    can_create_announcements: false,
    can_send_notifications: false,
    can_manage_requests: true,
    can_manage_maintenance: false,
    can_view_apartments: true,
    can_edit_apartments: false,
    can_view_residents: true,
    can_invite_residents: false,
    can_upload_documents: false,
    can_delete_documents: false,
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'logs'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Fetch data
  useEffect(() => {
    if (user && !authLoading) {
      fetchStaffMembers();
      fetchActivityLogs();
    }
  }, [user, authLoading]);
  
  const fetchStaffMembers = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/api/office/staff/');
      setStaffMembers(response.data.results || response.data);
    } catch (err: unknown) {
      console.error('Error fetching staff:', err);
      setError('Σφάλμα κατά τη φόρτωση των υπαλλήλων');
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchActivityLogs = async () => {
    try {
      const response = await api.get('/api/office/activity-logs/');
      setActivityLogs(response.data.results || response.data);
    } catch (err: unknown) {
      console.error('Error fetching logs:', err);
    }
  };
  
  // Create staff member
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/office/staff/', formData);
      setShowCreateModal(false);
      resetForm();
      fetchStaffMembers();
      fetchActivityLogs();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      console.error('Error creating staff:', err);
      setError(error.response?.data?.error || 'Σφάλμα κατά τη δημιουργία υπαλλήλου');
    }
  };
  
  // Update staff member
  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    
    try {
      await api.patch(`/api/office/staff/${selectedStaff.id}/`, formData);
      setShowEditModal(false);
      setSelectedStaff(null);
      resetForm();
      fetchStaffMembers();
      fetchActivityLogs();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      console.error('Error updating staff:', err);
      setError(error.response?.data?.error || 'Σφάλμα κατά την ενημέρωση υπαλλήλου');
    }
  };
  
  // Toggle active status
  const handleToggleActive = async (staff: StaffMember) => {
    try {
      await api.post(`/api/office/staff/${staff.id}/toggle_active/`);
      fetchStaffMembers();
      fetchActivityLogs();
    } catch (err: unknown) {
      console.error('Error toggling status:', err);
    }
  };
  
  // Reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff || !newPassword) return;
    
    try {
      await api.post(`/api/office/staff/${selectedStaff.id}/reset_password/`, {
        password: newPassword
      });
      setShowPasswordModal(false);
      setSelectedStaff(null);
      setNewPassword('');
      fetchActivityLogs();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      console.error('Error resetting password:', err);
      setError(error.response?.data?.error || 'Σφάλμα κατά την αλλαγή κωδικού');
    }
  };
  
  const resetForm = () => {
    setFormData({
      email: '',
      first_name: '',
      last_name: '',
      password: '',
      job_title: '',
      can_view_financials: true,
      can_record_payments: false,
      can_create_expenses: false,
      can_edit_expenses: false,
      can_create_announcements: false,
      can_send_notifications: false,
      can_manage_requests: true,
      can_manage_maintenance: false,
      can_view_apartments: true,
      can_edit_apartments: false,
      can_view_residents: true,
      can_invite_residents: false,
      can_upload_documents: false,
      can_delete_documents: false,
    });
  };
  
  const openEditModal = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setFormData({
      email: staff.email,
      first_name: staff.first_name,
      last_name: staff.last_name,
      password: '',
      job_title: staff.permissions?.job_title || '',
      can_view_financials: staff.permissions?.can_view_financials ?? true,
      can_record_payments: staff.permissions?.can_record_payments ?? false,
      can_create_expenses: staff.permissions?.can_create_expenses ?? false,
      can_edit_expenses: staff.permissions?.can_edit_expenses ?? false,
      can_create_announcements: staff.permissions?.can_create_announcements ?? false,
      can_send_notifications: staff.permissions?.can_send_notifications ?? false,
      can_manage_requests: staff.permissions?.can_manage_requests ?? true,
      can_manage_maintenance: staff.permissions?.can_manage_maintenance ?? false,
      can_view_apartments: staff.permissions?.can_view_apartments ?? true,
      can_edit_apartments: staff.permissions?.can_edit_apartments ?? false,
      can_view_residents: staff.permissions?.can_view_residents ?? true,
      can_invite_residents: staff.permissions?.can_invite_residents ?? false,
      can_upload_documents: staff.permissions?.can_upload_documents ?? false,
      can_delete_documents: staff.permissions?.can_delete_documents ?? false,
    });
    setShowEditModal(true);
  };
  
  // Filter staff
  const filteredStaff = staffMembers.filter(staff => 
    staff.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.permissions?.job_title?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Υπάλληλοι Γραφείου</h1>
                <p className="text-sm text-slate-500 mt-1">
                  Διαχείριση υπαλλήλων και δικαιωμάτων πρόσβασης
                </p>
              </div>
              <button
                onClick={() => {
                  resetForm();
                  setShowCreateModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/25"
              >
                <UserPlus className="w-4 h-4" />
                Νέος Υπάλληλος
              </button>
            </div>
          </div>
          
          {/* Error display */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              {error}
              <button onClick={() => setError(null)} className="ml-auto">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('list')}
              className={cn(
                "px-4 py-2 rounded-lg font-medium transition-colors",
                activeTab === 'list'
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-100"
              )}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Υπάλληλοι ({staffMembers.length})
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={cn(
                "px-4 py-2 rounded-lg font-medium transition-colors",
                activeTab === 'logs'
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-100"
              )}
            >
              <Activity className="w-4 h-4 inline mr-2" />
              Ιστορικό Δραστηριοτήτων
            </button>
          </div>
          
          {activeTab === 'list' ? (
            <>
              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Αναζήτηση υπαλλήλου..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              
              {/* Staff list */}
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
                </div>
              ) : filteredStaff.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                  <Users className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                  <h3 className="text-lg font-medium text-slate-900">Δεν υπάρχουν υπάλληλοι</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Δημιουργήστε τον πρώτο υπάλληλο του γραφείου σας
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredStaff.map((staff) => (
                    <div
                      key={staff.id}
                      className={cn(
                        "bg-white rounded-xl border p-4 transition-all hover:shadow-md",
                        staff.is_active ? "border-slate-200" : "border-red-200 bg-red-50/50"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          {/* Avatar */}
                          <div className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg",
                            staff.is_active ? "bg-indigo-600" : "bg-slate-400"
                          )}>
                            {staff.first_name?.[0]}{staff.last_name?.[0]}
                          </div>
                          
                          {/* Info */}
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-slate-900">{staff.full_name}</h3>
                              {!staff.is_active && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                                  Ανενεργός
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-500">{staff.email}</p>
                            {staff.permissions?.job_title && (
                              <p className="text-sm text-indigo-600 font-medium mt-1">
                                {staff.permissions.job_title}
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                              <span>
                                Εγγραφή: {new Date(staff.date_joined).toLocaleDateString('el-GR')}
                              </span>
                              {staff.last_login && (
                                <span>
                                  Τελ. σύνδεση: {new Date(staff.last_login).toLocaleDateString('el-GR')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(staff)}
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Επεξεργασία"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedStaff(staff);
                              setShowPasswordModal(true);
                            }}
                            className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Αλλαγή κωδικού"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(staff)}
                            className={cn(
                              "p-2 rounded-lg transition-colors",
                              staff.is_active
                                ? "text-slate-500 hover:text-red-600 hover:bg-red-50"
                                : "text-slate-500 hover:text-green-600 hover:bg-green-50"
                            )}
                            title={staff.is_active ? "Απενεργοποίηση" : "Ενεργοποίηση"}
                          >
                            {staff.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      
                      {/* Permissions preview */}
                      {staff.permissions && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                          <p className="text-xs text-slate-500 mb-2">Δικαιώματα:</p>
                          <div className="flex flex-wrap gap-1">
                            {staff.permissions.can_record_payments && (
                              <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">Πληρωμές</span>
                            )}
                            {staff.permissions.can_create_expenses && (
                              <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">Δαπάνες</span>
                            )}
                            {staff.permissions.can_create_announcements && (
                              <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">Ανακοινώσεις</span>
                            )}
                            {staff.permissions.can_manage_requests && (
                              <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">Αιτήματα</span>
                            )}
                            {staff.permissions.can_manage_maintenance && (
                              <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">Συντήρηση</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Activity Logs Tab */
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Ημερομηνία</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Χρήστης</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Ενέργεια</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Περιγραφή</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activityLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {new Date(log.created_at).toLocaleString('el-GR')}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900">
                          {log.user_email}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "px-2 py-1 text-xs font-medium rounded-full",
                            log.severity === 'info' && "bg-blue-100 text-blue-700",
                            log.severity === 'warning' && "bg-amber-100 text-amber-700",
                            log.severity === 'error' && "bg-red-100 text-red-700",
                            log.severity === 'critical' && "bg-red-200 text-red-800",
                          )}>
                            {log.action_display}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {log.action_description || log.target_description}
                        </td>
                      </tr>
                    ))}
                    {activityLogs.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                          Δεν υπάρχουν καταγραφές δραστηριοτήτων
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
      
      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Δημιουργία Νέου Υπαλλήλου</h2>
              <p className="text-sm text-slate-500 mt-1">Συμπληρώστε τα στοιχεία του υπαλλήλου</p>
            </div>
            
            <form onSubmit={handleCreateStaff}>
              <div className="p-6 space-y-6">
                {/* Basic info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Όνομα *</label>
                    <input
                      type="text"
                      required
                      value={formData.first_name}
                      onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Επώνυμο *</label>
                    <input
                      type="text"
                      required
                      value={formData.last_name}
                      onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Κωδικός *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Τουλάχιστον 8 χαρακτήρες</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Θέση Εργασίας</label>
                  <input
                    type="text"
                    placeholder="π.χ. Λογιστήριο, Γραμματεία"
                    value={formData.job_title}
                    onChange={(e) => setFormData({...formData, job_title: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                {/* Permissions */}
                <div>
                  <h3 className="text-sm font-medium text-slate-900 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Δικαιώματα Πρόσβασης
                  </h3>
                  
                  <div className="space-y-4">
                    {permissionGroups.map((group) => (
                      <div key={group.title} className="border border-slate-200 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-slate-700 mb-2">
                          {group.icon} {group.title}
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {group.permissions.map((perm) => (
                            <label key={perm.key} className="flex items-center gap-2 text-sm cursor-pointer">
                              <input
                                type="checkbox"
                                checked={formData[perm.key as keyof typeof formData] as boolean}
                                onChange={(e) => setFormData({...formData, [perm.key]: e.target.checked})}
                                className="w-4 h-4 text-indigo-600 rounded"
                              />
                              <span className="text-slate-600">{perm.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Ακύρωση
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Δημιουργία
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Edit Modal */}
      {showEditModal && selectedStaff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Επεξεργασία Υπαλλήλου</h2>
              <p className="text-sm text-slate-500 mt-1">{selectedStaff.email}</p>
            </div>
            
            <form onSubmit={handleUpdateStaff}>
              <div className="p-6 space-y-6">
                {/* Basic info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Όνομα</label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Επώνυμο</label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Θέση Εργασίας</label>
                  <input
                    type="text"
                    value={formData.job_title}
                    onChange={(e) => setFormData({...formData, job_title: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                {/* Permissions */}
                <div>
                  <h3 className="text-sm font-medium text-slate-900 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Δικαιώματα Πρόσβασης
                  </h3>
                  
                  <div className="space-y-4">
                    {permissionGroups.map((group) => (
                      <div key={group.title} className="border border-slate-200 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-slate-700 mb-2">
                          {group.icon} {group.title}
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {group.permissions.map((perm) => (
                            <label key={perm.key} className="flex items-center gap-2 text-sm cursor-pointer">
                              <input
                                type="checkbox"
                                checked={formData[perm.key as keyof typeof formData] as boolean}
                                onChange={(e) => setFormData({...formData, [perm.key]: e.target.checked})}
                                className="w-4 h-4 text-indigo-600 rounded"
                              />
                              <span className="text-slate-600">{perm.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedStaff(null);
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Ακύρωση
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Αποθήκευση
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Password Reset Modal */}
      {showPasswordModal && selectedStaff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Αλλαγή Κωδικού</h2>
              <p className="text-sm text-slate-500 mt-1">{selectedStaff.full_name}</p>
            </div>
            
            <form onSubmit={handleResetPassword}>
              <div className="p-6">
                <label className="block text-sm font-medium text-slate-700 mb-1">Νέος Κωδικός</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">Τουλάχιστον 8 χαρακτήρες</p>
              </div>
              
              <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setSelectedStaff(null);
                    setNewPassword('');
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Ακύρωση
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                >
                  Αλλαγή Κωδικού
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


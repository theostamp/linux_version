'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  Search, 
  Filter, 
  UserPlus, 
  UserCheck, 
  UserX, 
  Mail, 
  Shield,
  Building2,
  Calendar,
  MoreVertical,
  Download
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useSuperUserGuard } from '@/hooks/useSuperUserGuard';
import { adminUsersApi, type User } from '@/lib/api/admin';
import { getStatusBadgeVariant } from '@/lib/api/user';
import { toast } from '@/hooks/use-toast';

interface UserStats {
  total_users: number;
  active_users: number;
  verified_users: number;
  staff_users: number;
  superusers: number;
  managers: number;
  residents: number;
  recent_registrations: number;
}

export default function AdminUsersPage() {
  const { isAccessAllowed, isLoading } = useSuperUserGuard();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'unverified'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'superuser' | 'staff' | 'manager' | 'resident'>('all');

  useEffect(() => {
    if (isAccessAllowed) {
      fetchUsers();
      fetchStats();
    }
  }, [isAccessAllowed]);

  // Refetch users when filters change
  useEffect(() => {
    if (isAccessAllowed) {
      fetchUsers();
    }
  }, [searchTerm, statusFilter, roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await adminUsersApi.getUsers({
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
      });
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Σφάλμα",
        description: "Αποτυχία φόρτωσης χρηστών",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await adminUsersApi.getUserStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({
        title: "Σφάλμα",
        description: "Αποτυχία φόρτωσης στατιστικών",
        variant: "destructive",
      });
    }
  };

  const handleUserAction = async (userId: number, action: string) => {
    try {
      let result;
      switch (action) {
        case 'activate':
          result = await adminUsersApi.activateUser(userId);
          break;
        case 'deactivate':
          result = await adminUsersApi.deactivateUser(userId);
          break;
        case 'verify_email':
          result = await adminUsersApi.verifyUserEmail(userId);
          break;
        case 'reset_password':
          result = await adminUsersApi.resetUserPassword(userId);
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }
      
      toast({
        title: "Επιτυχία",
        description: result.message || `Ενέργεια ${action} ολοκληρώθηκε`,
      });
      
      await fetchUsers();
      await fetchStats();
    } catch (error) {
      console.error(`Error ${action} user:`, error);
      toast({
        title: "Σφάλμα",
        description: `Αποτυχία ενέργειας ${action}`,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (user: User) => {
    if (!user.is_active) {
      return <Badge variant="destructive">Ανενεργός</Badge>;
    }
    if (!user.email_verified) {
      return <Badge variant="secondary">Μη Επιβεβαιωμένος</Badge>;
    }
    return <Badge variant="default">Ενεργός</Badge>;
  };

  const getRoleBadge = (user: User) => {
    // Use system_role if available, fallback to role (backward compat)
    const systemRole = user.system_role ?? user.role;
    
    // SystemRole: 'superuser' or 'admin' = Ultra Admin
    if (user.is_superuser || systemRole === 'superuser' || systemRole === 'admin') {
      return <Badge variant="default" className="bg-purple-600">Ultra Admin</Badge>;
    }
    
    // SystemRole: 'manager' = Django Tenant Owner
    if (systemRole === 'manager') {
      // Check if user also has Resident.Role
      if (user.resident_role) {
        return (
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-green-600">Manager</Badge>
            <Badge variant="outline" className="text-xs">
              {user.resident_role === 'manager' ? 'Εσωτ. Διαχ.' :
               user.resident_role === 'owner' ? 'Ιδιοκτήτης' :
               user.resident_role === 'tenant' ? 'Ένοικος' : user.resident_role}
            </Badge>
          </div>
        );
      }
      return <Badge variant="default" className="bg-green-600">Manager</Badge>;
    }
    
    // Check resident_role if no system_role (for residents without SystemRole)
    if (user.resident_role && !systemRole) {
      return (
        <Badge variant="outline">
          {user.resident_role === 'manager' ? 'Εσωτερικός Διαχειριστής' :
           user.resident_role === 'owner' ? 'Ιδιοκτήτης' :
           user.resident_role === 'tenant' ? 'Ένοικος' : user.resident_role}
        </Badge>
      );
    }
    
    return <Badge variant="outline">Χρήστης</Badge>;
  };

  const filteredUsers = users.filter(user => {
    // Search filter - handle null/undefined values
    const matchesSearch = !searchTerm || 
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.last_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && user.is_active && user.email_verified) ||
                         (statusFilter === 'inactive' && !user.is_active) ||
                         (statusFilter === 'unverified' && !user.email_verified);
    
    // Role filter - use system_role if available, fallback to role (backward compat)
    const systemRole = user.system_role ?? user.role;
    
    const matchesRole = roleFilter === 'all' ||
                       (roleFilter === 'superuser' && (user.is_superuser || systemRole === 'superuser' || systemRole === 'admin')) ||
                       (roleFilter === 'staff' && user.is_staff && !user.is_superuser && systemRole !== 'manager') ||
                       (roleFilter === 'manager' && systemRole === 'manager') ||
                       (roleFilter === 'resident' && !user.is_staff && !user.is_superuser && !systemRole && user.resident_role);

    return matchesSearch && matchesStatus && matchesRole;
  });

  if (isLoading || loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Φόρτωση χρηστών...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAccessAllowed) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          <Shield className="w-16 h-16 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Πρόσβαση Αρνημένη</h2>
          <p>Δεν έχετε τα απαραίτητα δικαιώματα για πρόσβαση σε αυτή τη σελίδα.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Διαχείριση Χρηστών</h1>
          <p className="text-gray-600 mt-2">Διαχείριση όλων των χρηστών του συστήματος</p>
        </div>
        <Button className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Εξαγωγή Αναφοράς
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Σύνολο Χρηστών</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_users}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ενεργοί Χρήστες</p>
                <p className="text-2xl font-bold text-green-600">{stats.active_users}</p>
              </div>
              <UserCheck className="w-8 h-8 text-green-600" />
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Managers</p>
                <p className="text-2xl font-bold text-orange-600">{stats.managers}</p>
              </div>
              <Building2 className="w-8 h-8 text-orange-600" />
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Νέες Εγγραφές (30η)</p>
                <p className="text-2xl font-bold text-purple-600">{stats.recent_registrations}</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-600" />
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Αναζήτηση χρηστών..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Όλα τα Status</option>
              <option value="active">Ενεργοί</option>
              <option value="inactive">Ανενεργοί</option>
              <option value="unverified">Μη Επιβεβαιωμένοι</option>
            </select>
            
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Όλοι οι Ρόλοι</option>
              <option value="superuser">Ultra Admin</option>
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
              <option value="resident">Κάτοικος</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Λίστα Χρηστών ({filteredUsers.length})</h3>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Χρήστης</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ρόλος</TableHead>
                  <TableHead>Γραφείο</TableHead>
                  <TableHead>Ημερομηνία Εγγραφής</TableHead>
                  <TableHead>Τελευταία Σύνδεση</TableHead>
                  <TableHead className="text-right">Ενέργειες</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(user)}</TableCell>
                    <TableCell>{getRoleBadge(user)}</TableCell>
                    <TableCell>
                      {user.office_name ? (
                        <span className="text-sm">{user.office_name}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {new Date(user.date_joined).toLocaleDateString('el-GR')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {user.last_login 
                          ? new Date(user.last_login).toLocaleDateString('el-GR')
                          : 'Ποτέ'
                        }
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!user.is_active && (
                            <DropdownMenuItem
                              onClick={() => handleUserAction(user.id, 'activate')}
                            >
                              <UserCheck className="w-4 h-4 mr-2" />
                              Ενεργοποίηση
                            </DropdownMenuItem>
                          )}
                          {user.is_active && (
                            <DropdownMenuItem
                              onClick={() => handleUserAction(user.id, 'deactivate')}
                            >
                              <UserX className="w-4 h-4 mr-2" />
                              Απενεργοποίηση
                            </DropdownMenuItem>
                          )}
                          {!user.email_verified && (
                            <DropdownMenuItem
                              onClick={() => handleUserAction(user.id, 'verify_email')}
                            >
                              <Mail className="w-4 h-4 mr-2" />
                              Επιβεβαίωση Email
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleUserAction(user.id, 'reset_password')}
                          >
                            <Shield className="w-4 h-4 mr-2" />
                            Reset Password
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Δεν βρέθηκαν χρήστες με τα επιλεγμένα κριτήρια</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Search, Mail, Trash2, User, CheckCircle, XCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/components/contexts/AuthContext';
import { toast } from 'sonner';
import { listInvitations, deleteInvitation as apiDeleteInvitation } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AuthGate from '@/components/AuthGate';
import ErrorMessage from '@/components/ErrorMessage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface TenantInvitation {
  id: string;
  email: string;
  invited_role: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
  invited_by: {
    id: number;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  invited_at: string;
  accepted_at?: string;
  expires_at: string;
  created_user?: {
    id: number;
    email: string;
    first_name?: string;
    last_name?: string;
    is_active: boolean;
  };
  message?: string;
}

// Using existing API helpers from lib/api.ts

const getStatusBadge = (status: string) => {
  const statusMap: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    pending: {
      label: 'Εκκρεμής',
      className: 'bg-amber-100 text-amber-800',
      icon: <Clock className="w-3 h-3" />,
    },
    accepted: {
      label: 'Αποδεκτή',
      className: 'bg-green-100 text-green-800',
      icon: <CheckCircle className="w-3 h-3" />,
    },
    declined: {
      label: 'Απορριφθείσα',
      className: 'bg-red-100 text-red-800',
      icon: <XCircle className="w-3 h-3" />,
    },
    expired: {
      label: 'Λήξασα',
      className: 'bg-gray-100 text-gray-800',
      icon: <AlertCircle className="w-3 h-3" />,
    },
    cancelled: {
      label: 'Ακυρωμένη',
      className: 'bg-gray-100 text-gray-800',
      icon: <XCircle className="w-3 h-3" />,
    },
  };

  const statusInfo = statusMap[status] || statusMap.pending;
  return (
    <Badge className={statusInfo.className} variant="outline">
      <span className="flex items-center gap-1">
        {statusInfo.icon}
        {statusInfo.label}
      </span>
    </Badge>
  );
};

const formatDate = (dateString: string) => {
  if (!dateString) return '—';
  try {
    return new Date(dateString).toLocaleDateString('el-GR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
};

export default function InvitationsPage() {
  const { user, token } = useAuth();
  const [invitations, setInvitations] = useState<TenantInvitation[]>([]);
  const [filteredInvitations, setFilteredInvitations] = useState<TenantInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invitationToDelete, setInvitationToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadInvitations();
  }, []);

  useEffect(() => {
    filterInvitations();
  }, [invitations, searchQuery, statusFilter]);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listInvitations();
      // Map to TenantInvitation format if needed
      setInvitations(data as unknown as TenantInvitation[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Σφάλμα φόρτωσης προσκλήσεων');
      toast.error('Αποτυχία φόρτωσης προσκλήσεων');
    } finally {
      setLoading(false);
    }
  };

  const filterInvitations = () => {
    let filtered = [...invitations];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (inv) =>
          inv.email.toLowerCase().includes(query) ||
          inv.invited_by.email.toLowerCase().includes(query) ||
          inv.created_user?.email.toLowerCase().includes(query) ||
          inv.created_user?.first_name?.toLowerCase().includes(query) ||
          inv.created_user?.last_name?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((inv) => inv.status === statusFilter);
    }

    setFilteredInvitations(filtered);
  };

  const handleDelete = async () => {
    if (!invitationToDelete) return;

    try {
      await apiDeleteInvitation(invitationToDelete);
      toast.success('Η πρόσκληση διαγράφηκε επιτυχώς');
      setInvitations(invitations.filter((inv) => inv.id !== invitationToDelete));
      setDeleteDialogOpen(false);
      setInvitationToDelete(null);
    } catch (err) {
      toast.error('Αποτυχία διαγραφής πρόσκλησης');
    }
  };

  const openDeleteDialog = (invitationId: string) => {
    setInvitationToDelete(invitationId);
    setDeleteDialogOpen(true);
  };

  const stats = {
    total: invitations.length,
    pending: invitations.filter((inv) => inv.status === 'pending').length,
    accepted: invitations.filter((inv) => inv.status === 'accepted').length,
    activeUsers: invitations.filter((inv) => inv.status === 'accepted' && inv.created_user?.is_active).length,
  };

  return (
    <AuthGate requiredRoles={['manager', 'staff', 'superuser', 'office_staff']}>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Προσκλήσεις</h1>
            <p className="text-muted-foreground mt-1">
              Προβολή και διαχείριση προσκλήσεων χρηστών
            </p>
          </div>
          <Button onClick={loadInvitations} variant="outline" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Ανανέωση
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Σύνολο</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Εκκρεμείς</CardTitle>
              <Clock className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Αποδεκτές</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.accepted}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ενεργοί Χρήστες</CardTitle>
              <User className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeUsers}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Φίλτρα</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Αναζήτηση με email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-full md:w-48">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="all">Όλα τα Status</option>
                  <option value="pending">Εκκρεμής</option>
                  <option value="accepted">Αποδεκτή</option>
                  <option value="declined">Απορριφθείσα</option>
                  <option value="expired">Λήξασα</option>
                  <option value="cancelled">Ακυρωμένη</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && <ErrorMessage message={error} />}

        {/* Invitations Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredInvitations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {invitations.length === 0
                  ? 'Δεν υπάρχουν προσκλήσεις'
                  : 'Δεν βρέθηκαν προσκλήσεις με τα επιλεγμένα φίλτρα'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Λίστα Προσκλήσεων ({filteredInvitations.length})</CardTitle>
              <CardDescription>
                Οι χρήστες που δημιουργήθηκαν από προσκλήσεις παραμένουν στη βάση
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Ρόλος</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Στάλθηκε από</TableHead>
                      <TableHead>Ημερομηνία</TableHead>
                      <TableHead>Δημιουργημένος Χρήστης</TableHead>
                      <TableHead className="text-right">Ενέργειες</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvitations.map((invitation) => (
                      <TableRow key={invitation.id}>
                        <TableCell className="font-medium">{invitation.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{invitation.invited_role}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(invitation.status)}</TableCell>
                        <TableCell>{invitation.invited_by.email}</TableCell>
                        <TableCell>{formatDate(invitation.invited_at)}</TableCell>
                        <TableCell>
                          {invitation.created_user ? (
                            <div className="flex flex-col">
                              <span className="font-medium">{invitation.created_user.email}</span>
                              <span className="text-xs text-muted-foreground">
                                {invitation.created_user.first_name} {invitation.created_user.last_name}
                              </span>
                              <Badge
                                className={`mt-1 w-fit ${
                                  invitation.created_user.is_active
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {invitation.created_user.is_active ? 'Ενεργός' : 'Ανενεργός'}
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(invitation.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Επιβεβαίωση Διαγραφής</AlertDialogTitle>
              <AlertDialogDescription>
                Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την πρόσκληση; Ο χρήστης που
                δημιουργήθηκε από αυτή την πρόσκληση (αν υπάρχει) θα παραμείνει στη βάση.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                Διαγραφή
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AuthGate>
  );
}


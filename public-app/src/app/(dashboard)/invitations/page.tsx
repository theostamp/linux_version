'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import {
  Search,
  Mail,
  Trash2,
  User,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Plus,
  Copy,
  Send,
  Building2,
  Home,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  listInvitations,
  deleteInvitation,
  resendInvitation,
  UserInvitation,
} from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AuthGate from '@/components/AuthGate';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import InviteUserModal from '@/components/InviteUserModal';

// Status configuration
const statusConfig: Record<
  string,
  { label: string; icon: typeof Clock; className: string }
> = {
  pending: {
    label: 'Εκκρεμής',
    icon: Clock,
    className: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  accepted: {
    label: 'Αποδεκτή',
    icon: CheckCircle,
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  expired: {
    label: 'Ληγμένη',
    icon: AlertCircle,
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  cancelled: {
    label: 'Ακυρωμένη',
    icon: XCircle,
    className: 'bg-gray-100 text-gray-600 border-gray-200',
  },
};

// Role labels
const roleLabels: Record<string, string> = {
  resident: 'Ένοικος',
  internal_manager: 'Εσωτ. Διαχειριστής',
  manager: 'Office Manager',
  staff: 'Staff',
};

// Role colors
const roleColors: Record<string, string> = {
  resident: 'bg-blue-100 text-blue-800',
  internal_manager: 'bg-purple-100 text-purple-800',
  manager: 'bg-indigo-100 text-indigo-800',
  staff: 'bg-teal-100 text-teal-800',
};

export default function InvitationsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invitationToDelete, setInvitationToDelete] = useState<UserInvitation | null>(null);
  const [resendingId, setResendingId] = useState<number | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  // Fetch invitations with TanStack Query
  const {
    data: invitations = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['invitations'],
    queryFn: listInvitations,
  });

  // Filter invitations
  const filteredInvitations = invitations.filter((inv) => {
    // Status filter
    if (statusFilter !== 'all' && inv.status !== statusFilter) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        inv.email.toLowerCase().includes(query) ||
        (inv.first_name && inv.first_name.toLowerCase().includes(query)) ||
        (inv.last_name && inv.last_name.toLowerCase().includes(query)) ||
        (inv.building_name && inv.building_name.toLowerCase().includes(query)) ||
        (inv.invited_by_name && inv.invited_by_name.toLowerCase().includes(query))
      );
    }

    return true;
  });

  // Stats
  const stats = {
    total: invitations.length,
    pending: invitations.filter((inv) => inv.status === 'pending').length,
    accepted: invitations.filter((inv) => inv.status === 'accepted').length,
    expired: invitations.filter((inv) => inv.status === 'expired').length,
  };

  // Handle delete
  const handleDelete = async () => {
    if (!invitationToDelete) return;

    try {
      await deleteInvitation(invitationToDelete.id);
      toast.success('Η πρόσκληση διαγράφηκε επιτυχώς');
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      setDeleteDialogOpen(false);
      setInvitationToDelete(null);
    } catch (err) {
      toast.error('Αποτυχία διαγραφής πρόσκλησης');
    }
  };

  // Handle resend
  const handleResend = async (invitation: UserInvitation) => {
    setResendingId(invitation.id);
    try {
      await resendInvitation({ invitation_id: invitation.id });
      toast.success(`Η πρόσκληση στάλθηκε ξανά στο ${invitation.email}`);
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    } catch (err) {
      toast.error('Αποτυχία επαναποστολής πρόσκλησης');
    } finally {
      setResendingId(null);
    }
  };

  // Copy invitation link
  const copyInvitationLink = (invitation: UserInvitation) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/accept-invitation?token=${invitation.token}`;
    navigator.clipboard.writeText(link);
    toast.success('Ο σύνδεσμος αντιγράφηκε');
  };

  // Format date helper
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: el });
    } catch {
      return dateString;
    }
  };

  // Check if expired
  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  return (
    <AuthGate requiredRoles={['manager', 'staff', 'superuser', 'office_staff', 'internal_manager']}>
      <TooltipProvider>
        <div className="container mx-auto py-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Προσκλήσεις</h1>
              <p className="text-muted-foreground mt-1">
                Διαχείριση προσκλήσεων χρηστών στην εφαρμογή
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => refetch()} variant="outline" disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Ανανέωση
              </Button>
              <Button onClick={() => setInviteModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Νέα Πρόσκληση
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('all')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Σύνολο</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('pending')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Εκκρεμείς</CardTitle>
                <Clock className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('accepted')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Αποδεκτές</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('expired')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ληγμένες</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Αναζήτηση με email, όνομα, κτίριο..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                {/* Status Tabs */}
                <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full md:w-auto">
                  <TabsList className="grid grid-cols-5 w-full md:w-auto">
                    <TabsTrigger value="all" className="text-xs">Όλες</TabsTrigger>
                    <TabsTrigger value="pending" className="text-xs">Εκκρεμείς</TabsTrigger>
                    <TabsTrigger value="accepted" className="text-xs">Αποδεκτές</TabsTrigger>
                    <TabsTrigger value="expired" className="text-xs">Ληγμένες</TabsTrigger>
                    <TabsTrigger value="cancelled" className="text-xs">Ακυρωμένες</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardContent>
          </Card>

          {/* Error State */}
          {error && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <div className="text-center text-destructive">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                  <p>Σφάλμα φόρτωσης προσκλήσεων</p>
                  <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-2">
                    Δοκιμή Ξανά
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && filteredInvitations.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  {invitations.length === 0
                    ? 'Δεν υπάρχουν προσκλήσεις'
                    : 'Δεν βρέθηκαν προσκλήσεις με τα επιλεγμένα φίλτρα'}
                </p>
                {invitations.length === 0 && (
                  <Button onClick={() => setInviteModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Αποστολή Πρώτης Πρόσκλησης
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Invitations Table */}
          {!isLoading && !error && filteredInvitations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Λίστα Προσκλήσεων
                  <Badge variant="secondary" className="ml-2">
                    {filteredInvitations.length}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {statusFilter !== 'all'
                    ? `Εμφάνιση ${statusConfig[statusFilter]?.label.toLowerCase() || statusFilter} προσκλήσεων`
                    : 'Όλες οι προσκλήσεις'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Χρήστης</TableHead>
                        <TableHead>Ρόλος</TableHead>
                        <TableHead>Κτίριο</TableHead>
                        <TableHead>Κατάσταση</TableHead>
                        <TableHead>Αποστολέας</TableHead>
                        <TableHead>Ημερομηνία</TableHead>
                        <TableHead>Λήξη</TableHead>
                        <TableHead className="text-right">Ενέργειες</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvitations.map((invitation) => {
                        const status = statusConfig[invitation.status] || statusConfig.pending;
                        const StatusIcon = status.icon;
                        const expired = isExpired(invitation.expires_at);
                        const canResend = invitation.status === 'pending' || invitation.status === 'expired';

                        return (
                          <TableRow key={invitation.id}>
                            {/* User Info */}
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{invitation.email}</span>
                                {(invitation.first_name || invitation.last_name) && (
                                  <span className="text-xs text-muted-foreground">
                                    {`${invitation.first_name || ''} ${invitation.last_name || ''}`.trim()}
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            {/* Role */}
                            <TableCell>
                              {invitation.assigned_role ? (
                                <Badge
                                  variant="outline"
                                  className={roleColors[invitation.assigned_role] || ''}
                                >
                                  {roleLabels[invitation.assigned_role] || invitation.assigned_role}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>

                            {/* Building */}
                            <TableCell>
                              {invitation.building_name ? (
                                <div className="flex items-center gap-1">
                                  <Building2 className="w-3 h-3 text-muted-foreground" />
                                  <span className="text-sm">{invitation.building_name}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>

                            {/* Status */}
                            <TableCell>
                              <Badge className={status.className}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {status.label}
                              </Badge>
                            </TableCell>

                            {/* Invited By */}
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {invitation.invited_by_name || `ID: ${invitation.invited_by}`}
                              </span>
                            </TableCell>

                            {/* Created At */}
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(invitation.created_at)}
                            </TableCell>

                            {/* Expires At */}
                            <TableCell>
                              <span
                                className={`text-sm ${
                                  expired && invitation.status === 'pending'
                                    ? 'text-destructive font-medium'
                                    : 'text-muted-foreground'
                                }`}
                              >
                                {formatDate(invitation.expires_at)}
                              </span>
                            </TableCell>

                            {/* Actions */}
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {/* Copy Link */}
                                {invitation.status === 'pending' && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => copyInvitationLink(invitation)}
                                      >
                                        <Copy className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Αντιγραφή συνδέσμου</TooltipContent>
                                  </Tooltip>
                                )}

                                {/* Resend */}
                                {canResend && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => handleResend(invitation)}
                                        disabled={resendingId === invitation.id}
                                      >
                                        {resendingId === invitation.id ? (
                                          <RefreshCw className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <Send className="w-4 h-4" />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Επαναποστολή</TooltipContent>
                                  </Tooltip>
                                )}

                                {/* Delete */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                      onClick={() => {
                                        setInvitationToDelete(invitation);
                                        setDeleteDialogOpen(true);
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Διαγραφή</TooltipContent>
                                </Tooltip>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Invite User Modal */}
          <InviteUserModal open={inviteModalOpen} onOpenChange={setInviteModalOpen} />

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Διαγραφή Πρόσκλησης</AlertDialogTitle>
                <AlertDialogDescription>
                  Είστε σίγουροι ότι θέλετε να διαγράψετε την πρόσκληση για{' '}
                  <strong>{invitationToDelete?.email}</strong>;
                  <br />
                  <br />
                  Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Διαγραφή
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TooltipProvider>
    </AuthGate>
  );
}

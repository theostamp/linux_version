'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listInvitations, deleteInvitation, resendInvitation, cancelInvitation, UserInvitation } from '@/lib/api';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { 
  Mail, Clock, CheckCircle, XCircle, AlertCircle, Trash2, 
  Send, Copy, RefreshCw, Info, Ban 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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

const statusConfig: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  pending: { label: 'Εκκρεμής', icon: Clock, color: 'bg-amber-100 text-amber-800 border-amber-200' },
  accepted: { label: 'Αποδεκτή', icon: CheckCircle, color: 'bg-green-100 text-green-800 border-green-200' },
  expired: { label: 'Ληγμένη', icon: AlertCircle, color: 'bg-red-100 text-red-800 border-red-200' },
  cancelled: { label: 'Ακυρωμένη', icon: XCircle, color: 'bg-gray-100 text-gray-600 border-gray-200' },
};

const roleLabels: Record<string, string> = {
  resident: 'Ένοικος',
  internal_manager: 'Εσωτ. Διαχειριστής',
  manager: 'Office Manager',
  staff: 'Staff',
};

export default function InvitationsList() {
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invitationToDelete, setInvitationToDelete] = useState<UserInvitation | null>(null);
  const [resendingId, setResendingId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const { data: invitations = [], isLoading, error, refetch } = useQuery({
    queryKey: ['invitations'],
    queryFn: listInvitations,
  });

  // Stats
  const stats = {
    total: invitations.length,
    pending: invitations.filter((inv) => inv.status === 'pending').length,
    accepted: invitations.filter((inv) => inv.status === 'accepted').length,
    expired: invitations.filter((inv) => inv.status === 'expired').length,
  };

  const handleDelete = async () => {
    if (!invitationToDelete) return;
    
    try {
      await deleteInvitation(invitationToDelete.id);
      toast.success('Η πρόσκληση διαγράφηκε');
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      setDeleteDialogOpen(false);
      setInvitationToDelete(null);
    } catch (error) {
      console.error('Error deleting invitation:', error);
      toast.error('Σφάλμα κατά τη διαγραφή');
    }
  };

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

  const handleCancel = async (invitation: UserInvitation) => {
    setCancellingId(invitation.id);
    try {
      await cancelInvitation(invitation.id);
      toast.success(`Η πρόσκληση για ${invitation.email} ακυρώθηκε`);
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    } catch (err) {
      toast.error('Αποτυχία ακύρωσης πρόσκλησης');
    } finally {
      setCancellingId(null);
    }
  };

  const copyInvitationLink = (invitation: UserInvitation) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/accept-invitation?token=${invitation.token}`;
    navigator.clipboard.writeText(link);
    toast.success('Ο σύνδεσμος αντιγράφηκε στο clipboard');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Φόρτωση προσκλήσεων...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
        <p className="text-destructive">Σφάλμα φόρτωσης προσκλήσεων</p>
        <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-2">
          Δοκιμή Ξανά
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Info Box - Τι είναι οι προσκλήσεις */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Τι είναι οι Προσκλήσεις;</p>
              <p className="text-blue-700">
                Οι προσκλήσεις επιτρέπουν σε νέους χρήστες να εγγραφούν στην εφαρμογή. 
                Όταν στέλνετε πρόσκληση, ο χρήστης λαμβάνει email με σύνδεσμο για να δημιουργήσει λογαριασμό.
                Μετά την αποδοχή, εμφανίζεται στους "Καταχωρημένους Χρήστες" παραπάνω.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {invitations.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-gradient-to-br from-slate-50 to-slate-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Σύνολο</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <Mail className="h-8 w-8 text-slate-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-amber-700 uppercase tracking-wide">Εκκρεμείς</p>
                    <p className="text-2xl font-bold text-amber-800">{stats.pending}</p>
                  </div>
                  <Clock className="h-8 w-8 text-amber-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-green-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-green-700 uppercase tracking-wide">Αποδεκτές</p>
                    <p className="text-2xl font-bold text-green-800">{stats.accepted}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-red-50 to-red-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-red-700 uppercase tracking-wide">Ληγμένες</p>
                    <p className="text-2xl font-bold text-red-800">{stats.expired}</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-red-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Empty State */}
        {invitations.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-lg">
            <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-muted-foreground mb-2">Δεν υπάρχουν προσκλήσεις</p>
            <p className="text-sm text-muted-foreground">
              Χρησιμοποιήστε το κουμπί "Προσκάλεσε Χρήστη" για να στείλετε την πρώτη πρόσκληση.
            </p>
          </div>
        ) : (
          /* Invitations Table */
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Email</TableHead>
                  <TableHead>Όνομα</TableHead>
                  <TableHead>Ρόλος</TableHead>
                  <TableHead>Κτίριο</TableHead>
                  <TableHead>Κατάσταση</TableHead>
                  <TableHead>Αποστολή</TableHead>
                  <TableHead>Λήξη</TableHead>
                  <TableHead className="text-right">Ενέργειες</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation: UserInvitation) => {
                  const statusInfo = statusConfig[invitation.status] || statusConfig.pending;
                  const StatusIcon = statusInfo.icon;
                  const isExpired = new Date(invitation.expires_at) < new Date();
                  const canResend = invitation.status === 'pending' || invitation.status === 'expired';

                  return (
                    <TableRow key={invitation.id}>
                      <TableCell className="font-medium">{invitation.email}</TableCell>
                      <TableCell>
                        {invitation.first_name || invitation.last_name
                          ? `${invitation.first_name || ''} ${invitation.last_name || ''}`.trim()
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {invitation.assigned_role ? (
                          <Badge variant="outline" className="text-xs">
                            {roleLabels[invitation.assigned_role] || invitation.assigned_role}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {invitation.building_name ? (
                          <span className="text-sm">{invitation.building_name}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusInfo.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(invitation.created_at), 'dd/MM/yy HH:mm', { locale: el })}
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className={isExpired && invitation.status === 'pending' ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                          {format(new Date(invitation.expires_at), 'dd/MM/yy HH:mm', { locale: el })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Copy Link */}
                          {invitation.status === 'pending' && invitation.token && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => copyInvitationLink(invitation)}
                                >
                                  <Copy className="h-4 w-4" />
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
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Send className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Επαναποστολή email</TooltipContent>
                            </Tooltip>
                          )}

                          {/* Cancel */}
                          {invitation.status === 'pending' && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-orange-600"
                                  onClick={() => handleCancel(invitation)}
                                  disabled={cancellingId === invitation.id}
                                >
                                  {cancellingId === invitation.id ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Ban className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ακύρωση πρόσκλησης</TooltipContent>
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
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Διαγραφή πρόσκλησης</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Refresh Button */}
        {invitations.length > 0 && (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Ανανέωση
            </Button>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Διαγραφή Πρόσκλησης</AlertDialogTitle>
              <AlertDialogDescription>
                Είστε σίγουροι ότι θέλετε να διαγράψετε την πρόσκληση για{' '}
                <strong>{invitationToDelete?.email}</strong>;
                <br /><br />
                <span className="text-muted-foreground">
                  Η πρόσκληση θα ακυρωθεί και ο σύνδεσμος δεν θα λειτουργεί πλέον.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setInvitationToDelete(null)}>
                Ακύρωση
              </AlertDialogCancel>
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
  );
}

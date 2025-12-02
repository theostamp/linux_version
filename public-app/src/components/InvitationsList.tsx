'use client';

import { useQuery } from '@tanstack/react-query';
import { listInvitations, deleteInvitation, UserInvitation } from '@/lib/api';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { Mail, Clock, CheckCircle, XCircle, AlertCircle, Trash2 } from 'lucide-react';
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
import { Loader2 } from 'lucide-react';

const statusConfig = {
  pending: { label: 'Εκκρεμής', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
  accepted: { label: 'Αποδεκτή', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  expired: { label: 'Ληγμένη', icon: AlertCircle, color: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Ακυρωμένη', icon: XCircle, color: 'bg-muted text-muted-foreground' },
};

const roleLabels = {
  resident: 'Ένοικος',
  internal_manager: 'Εσωτερικός Διαχειριστής',
  manager: 'Office Manager',
  staff: 'Staff',
};

export default function InvitationsList() {
  const { data: invitations, isLoading, error, refetch } = useQuery({
    queryKey: ['invitations'],
    queryFn: listInvitations,
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την πρόσκληση;')) return;
    
    try {
      await deleteInvitation(id);
      toast.success('Η πρόσκληση διαγράφηκε');
      refetch();
    } catch (error) {
      console.error('Error deleting invitation:', error);
      toast.error('Σφάλμα κατά τη διαγραφή');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Φόρτωση προσκλήσεων...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 border-0 rounded-none shadow-sm">
        <p className="text-destructive">Σφάλμα φόρτωσης προσκλήσεων</p>
        <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-2">
          Δοκιμή Ξανά
        </Button>
      </div>
    );
  }

  if (!invitations || invitations.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
        <p>Δεν υπάρχουν προσκλήσεις</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Όνομα</TableHead>
              <TableHead>Ρόλος</TableHead>
              <TableHead>Κτίριο</TableHead>
              <TableHead>Κατάσταση</TableHead>
              <TableHead>Ημερομηνία</TableHead>
              <TableHead>Λήξη</TableHead>
              <TableHead className="text-right">Ενέργειες</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitations.map((invitation: UserInvitation) => {
              const statusInfo = statusConfig[invitation.status] || statusConfig.pending;
              const StatusIcon = statusInfo.icon;
              const isExpired = new Date(invitation.expires_at) < new Date();

              return (
                <TableRow key={invitation.id}>
                  <TableCell className="font-medium">{invitation.email}</TableCell>
                  <TableCell>
                    {invitation.first_name || invitation.last_name
                      ? `${invitation.first_name || ''} ${invitation.last_name || ''}`.trim()
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {invitation.assigned_role ? (
                      <Badge variant="outline">
                        {roleLabels[invitation.assigned_role] || invitation.assigned_role}
                      </Badge>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {invitation.building_name || invitation.building_id ? (
                      <span className="text-sm">
                        {invitation.building_name || `ID: ${invitation.building_id}`}
                      </span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusInfo.color}>
                      <StatusIcon className="h-3 w-3 mr-1 inline" />
                      {statusInfo.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(invitation.created_at), 'dd/MM/yyyy HH:mm', { locale: el })}
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className={isExpired ? 'text-destructive' : 'text-muted-foreground'}>
                      {format(new Date(invitation.expires_at), 'dd/MM/yyyy HH:mm', { locale: el })}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(invitation.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      title="Διαγραφή πρόσκλησης"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}


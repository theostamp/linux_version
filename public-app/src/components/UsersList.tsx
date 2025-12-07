'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchUsers, User, deactivateUser, activateUser, removeUserFromBuilding } from '@/lib/api';
import { Edit, Mail, UserCheck, UserX, Loader2, AlertCircle, Building2, RefreshCw, UserMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useState } from 'react';
import EditUserModal from './users/EditUserModal';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/components/contexts/AuthContext';
import { useBuilding } from '@/components/contexts/BuildingContext';

const roleLabels = {
  resident: 'Ένοικος',
  internal_manager: 'Εσωτερικός Διαχειριστής',
  manager: 'Office Manager',
  staff: 'Staff',
  admin: 'Admin',
};

export default function UsersList() {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [togglingUserId, setTogglingUserId] = useState<number | null>(null);
  const [removingUserId, setRemovingUserId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const { selectedBuilding } = useBuilding();

  const { data: users, isLoading, error } = useQuery({
    queryKey: ['users', selectedBuilding?.id],
    queryFn: () => fetchUsers(selectedBuilding?.id),
    enabled: !!selectedBuilding?.id, // Only fetch when building is selected
  });

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setEditModalOpen(true);
  };

  // Remove user from current building only (keeps access to other buildings)
  const handleRemoveFromBuilding = async (user: User) => {
    if (!selectedBuilding) {
      toast.error('Παρακαλώ επιλέξτε κτίριο πρώτα');
      return;
    }
    
    setRemovingUserId(user.id);
    try {
      const result = await removeUserFromBuilding(user.id, selectedBuilding.id);
      toast.success(result.message);
      if (result.remaining_buildings > 0) {
        toast.info(`Ο χρήστης έχει ακόμα πρόσβαση σε ${result.remaining_buildings} κτίρι${result.remaining_buildings === 1 ? 'ο' : 'α'}`);
      }
      queryClient.invalidateQueries({ queryKey: ['users', selectedBuilding?.id] });
    } catch (err) {
      const error = err as { message?: string };
      toast.error(error?.message || 'Αποτυχία αφαίρεσης χρήστη από κτίριο');
    } finally {
      setRemovingUserId(null);
    }
  };

  // Global deactivate - user cannot login anywhere
  const handleToggleUserStatus = async (user: User) => {
    setTogglingUserId(user.id);
    try {
      if (user.is_active !== false) {
        await deactivateUser(user.id);
        toast.success(`Ο χρήστης ${user.email} απενεργοποιήθηκε (σε όλα τα κτίρια)`);
      } else {
        await activateUser(user.id);
        toast.success(`Ο χρήστης ${user.email} ενεργοποιήθηκε`);
      }
      queryClient.invalidateQueries({ queryKey: ['users', selectedBuilding?.id] });
    } catch (err) {
      const error = err as { message?: string };
      toast.error(error?.message || 'Αποτυχία αλλαγής κατάστασης χρήστη');
    } finally {
      setTogglingUserId(null);
    }
  };

  // Check if user can be toggled (not current user, not admin/superuser)
  const canToggleUser = (user: User): boolean => {
    // Can't toggle yourself
    if (currentUser && user.id === currentUser.id) return false;
    // Can't toggle admins/superusers
    if (user.role === 'admin' || user.is_superuser) return false;
    // Managers can toggle residents and internal_managers
    return true;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Φόρτωση χρηστών...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 border-0 rounded-none shadow-sm text-destructive">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>Σφάλμα κατά τη φόρτωση των χρηστών. Παρακαλώ δοκιμάστε ξανά.</span>
        </div>
      </div>
    );
  }

  if (!users || users.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <UserX className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
        <p>Δεν υπάρχουν καταχωρημένοι χρήστες.</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Όνομα</TableHead>
              <TableHead>Επώνυμο</TableHead>
              <TableHead>Ρόλος</TableHead>
              <TableHead>Κατάσταση</TableHead>
              <TableHead className="text-right">Ενέργειες</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">{user.email}</span>
                  </div>
                </TableCell>
                <TableCell>{user.first_name || '—'}</TableCell>
                <TableCell>{user.last_name || '—'}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {roleLabels[user.role as keyof typeof roleLabels] || user.role || '—'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {user.is_active !== false ? (
                    <Badge className="bg-green-100 text-green-800">
                      <UserCheck className="h-3 w-3 mr-1" />
                      Ενεργός
                    </Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-800">
                      <UserX className="h-3 w-3 mr-1" />
                      Ανενεργός
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {/* Remove from Building Button (per-building action) */}
                    {canToggleUser(user) && selectedBuilding && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleRemoveFromBuilding(user)}
                            disabled={removingUserId === user.id}
                          >
                            {removingUserId === user.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <UserMinus className="h-4 w-4 mr-1" />
                                Αφαίρεση
                              </>
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Αφαίρεση από: <strong>{selectedBuilding.name}</strong></p>
                          <p className="text-xs text-muted-foreground">Ο χρήστης θα διατηρήσει πρόσβαση σε άλλα κτίρια</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {/* Global Deactivate Button (affects all buildings) */}
                    {canToggleUser(user) && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className={user.is_active !== false 
                              ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50' 
                              : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                            }
                            onClick={() => handleToggleUserStatus(user)}
                            disabled={togglingUserId === user.id}
                          >
                            {togglingUserId === user.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : user.is_active !== false ? (
                              <>
                                <UserX className="h-4 w-4 mr-1" />
                                Απενεργοποίηση
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-4 w-4 mr-1" />
                                Ενεργοποίηση
                              </>
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {user.is_active !== false 
                            ? <><p>Απενεργοποίηση <strong>παντού</strong></p><p className="text-xs text-muted-foreground">Ο χρήστης δεν θα μπορεί να συνδεθεί σε κανένα κτίριο</p></>
                            : 'Ο χρήστης θα μπορεί ξανά να συνδεθεί'}
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(user)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Επεξεργασία
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <Link href="/apartments">
                        <Building2 className="h-4 w-4 mr-1" />
                        Διαμερίσματα
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EditUserModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        user={selectedUser}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['users'] });
        }}
      />
    </TooltipProvider>
  );
}


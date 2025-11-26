'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchUsers, deleteUser, User } from '@/lib/api';
import { Edit, Trash2, Mail, UserCheck, UserX, Loader2, AlertCircle } from 'lucide-react';
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
import { toast } from 'sonner';
import { useState } from 'react';
import EditUserModal from './users/EditUserModal';
import DeleteUserDialog from './users/DeleteUserDialog';

const roleLabels = {
  resident: 'Ένοικος',
  internal_manager: 'Εσωτερικός Διαχειριστής',
  manager: 'Office Manager',
  staff: 'Staff',
  admin: 'Admin',
};

export default function UsersList() {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const queryClient = useQueryClient();

  const { data: users, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setEditModalOpen(true);
  };

  const handleDelete = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;

    try {
      await deleteUser(selectedUser.id);
      toast.success('Ο χρήστης διαγράφηκε επιτυχώς');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeleteDialogOpen(false);
      setSelectedUser(null);
    } catch (err) {
      const error = err as { message?: string; response?: { data?: { error?: string } } };
      const errorMessage = error?.response?.data?.error || error?.message || 'Αποτυχία διαγραφής χρήστη';
      toast.error(errorMessage);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">Φόρτωση χρηστών...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>Σφάλμα κατά τη φόρτωση των χρηστών. Παρακαλώ δοκιμάστε ξανά.</span>
        </div>
      </div>
    );
  }

  if (!users || users.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <UserX className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>Δεν υπάρχουν καταχωρημένοι χρήστες.</p>
      </div>
    );
  }

  return (
    <>
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
                      onClick={() => handleDelete(user)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Διαγραφή
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

      <DeleteUserDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        user={selectedUser}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}


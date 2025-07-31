'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ErrorMessage from '@/components/ErrorMessage';
import { useAuth } from '@/components/contexts/AuthContext';
import { deleteUserRequest, toggleSupportRequest } from '@/lib/api';
import type { UserRequest } from '@/types/userRequests';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Trash2, Edit } from 'lucide-react';
import PhotoGallery from '@/components/PhotoGallery';

const statusLabels: Record<string, string> = {
  open: 'Ανοιχτό',
  pending: 'Σε Εκκρεμότητα',
  in_progress: 'Σε Εξέλιξη',
  completed: 'Ολοκληρώθηκε',
  resolved: 'Ολοκληρώθηκε',
  rejected: 'Απορρίφθηκε',
};

function formatDate(dateString: string): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  };
  return new Date(dateString).toLocaleDateString('el-GR', options);
}

export default function RequestDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, isAuthReady } = useAuth();
  const [request, setRequest] = useState<UserRequest | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [supporting, setSupporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  const isOwner = request?.created_by_username === user?.username;
  const canDelete = user?.is_superuser || user?.is_staff || isOwner;
  const canChangeStatus = user?.is_superuser || user?.is_staff;

  async function fetchRequest() {
    try {
      const { api } = await import('@/lib/api');
      const res = await api.get(`/user-requests/${id}/`);
      setRequest(res.data);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Δεν έχετε δικαίωμα πρόσβασης σε αυτό το αίτημα.');
      } else if (err.response?.status === 404) {
        setError('Το αίτημα δεν βρέθηκε.');
      } else {
        setError('Αποτυχία φόρτωσης αιτήματος');
      }
      console.error('Error fetching request:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSupport() {
    if (!request) return;
    setSupporting(true);
    try {
      const result = await toggleSupportRequest(request.id);
      toast.success(result.status);
      // Update the request with new supporter count
      setRequest(prev => prev ? {
        ...prev,
        supporter_count: result.supporter_count,
        is_supported: result.supported
      } : null);
    } catch (err: any) {
      const message = err.response?.data?.detail || err.message || 'Αποτυχία υποστήριξης';
      toast.error(message);
      setError(message);
    } finally {
      setSupporting(false);
    }
  }

  async function handleDelete() {
    if (!request) return;
    if (!confirm(`Είστε σίγουρος ότι θέλετε να διαγράψετε το αίτημα "${request.title}";`)) return;
    
    setDeleting(true);
    try {
      await deleteUserRequest(request.id);
      toast.success('Το αίτημα διαγράφηκε επιτυχώς');
      router.push('/requests');
    } catch (err: any) {
      const message = err.response?.data?.detail || err.message || 'Αποτυχία διαγραφής';
      toast.error(message);
      setError(message);
    } finally {
      setDeleting(false);
    }
  }

  async function handleStatusChange(newStatus: string) {
    if (!request) return;
    setChangingStatus(true);
    try {
      const { api } = await import('@/lib/api');
      const res = await api.post(`/user-requests/${request.id}/change_status/`, {
        status: newStatus
      });
      setRequest(res.data);
      toast.success('Η κατάσταση ενημερώθηκε επιτυχώς');
    } catch (err: any) {
      const message = err.response?.data?.detail || err.message || 'Αποτυχία αλλαγής κατάστασης';
      toast.error(message);
      setError(message);
    } finally {
      setChangingStatus(false);
    }
  }

  useEffect(() => {
    if (isAuthReady) {
      fetchRequest();
    }
  }, [id, isAuthReady]);

  if (!isAuthReady || loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-300 rounded w-3/4"></div>
          <div className="h-20 bg-gray-300 rounded"></div>
          <div className="h-4 bg-gray-300 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Link href="/requests">
          <Button variant="secondary" className="mb-4">⬅ Επιστροφή στα Αιτήματα</Button>
        </Link>
        <ErrorMessage message={error} />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Link href="/requests">
          <Button variant="secondary" className="mb-4">⬅ Επιστροφή στα Αιτήματα</Button>
        </Link>
        <p>Δεν βρέθηκε το αίτημα.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Navigation */}
      <Link href="/requests">
        <Button variant="secondary">⬅ Επιστροφή στα Αιτήματα</Button>
      </Link>

      {/* Header with actions */}
      <div className="flex justify-between items-start">
        <h1 className="text-2xl font-bold text-gray-900">
          {request.title}
          {request.is_urgent && <span className="ml-2 text-red-600">🚨</span>}
        </h1>
        
        <div className="flex gap-2">
          {isOwner && (
            <Link href={`/requests/${request.id}/edit`}>
              <Button variant="secondary" size="sm">
                <Edit className="w-4 h-4 mr-1" />
                Επεξεργασία
              </Button>
            </Link>
          )}
          
          {canDelete && (
            <Button
              onClick={handleDelete}
              disabled={deleting}
              variant="destructive"
              size="sm"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              {deleting ? 'Διαγραφή...' : 'Διαγραφή'}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
          {request.description}
        </p>

        {/* Photos Section */}
        <PhotoGallery photos={request.photos || []} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 border-t pt-4">
          <div>
            <strong>Υποβλήθηκε από:</strong> {request.created_by_username}
          </div>
          <div>
            <strong>Ημερομηνία:</strong> {formatDate(request.created_at)}
          </div>
          <div>
            <strong>Κατάσταση:</strong> 
            <span className={`ml-1 px-2 py-1 rounded text-xs font-medium ${
              request.status === 'completed' || request.status === 'resolved' 
                ? 'bg-green-100 text-green-800'
                : request.status === 'in_progress'
                ? 'bg-blue-100 text-blue-800'
                : request.status === 'rejected'
                ? 'bg-red-100 text-red-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {statusLabels[request.status] || request.status}
            </span>
          </div>
          <div>
            <strong>Κατηγορία:</strong> {request.type || '—'}
          </div>
          <div>
            <strong>Επείγον:</strong> {request.is_urgent ? 'Ναι' : 'Όχι'}
          </div>
          <div>
            <strong>Υποστηρικτές:</strong> {request.supporter_count}
          </div>
          {request.location && (
            <div>
              <strong>Τοποθεσία:</strong> {request.location}
            </div>
          )}
          {request.apartment_number && (
            <div>
              <strong>Διαμέρισμα:</strong> {request.apartment_number}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-4">
        {user && user.username !== request.created_by_username && (
          <Button
            onClick={handleSupport}
            disabled={supporting}
            className="bg-green-600 hover:bg-green-700"
          >
            {supporting ? 'Επεξεργασία...' : request.is_supported ? 'Ανάκληση Υποστήριξης' : '👍 Υποστηρίζω'}
          </Button>
        )}
      </div>

      {/* Status change actions for staff */}
      {canChangeStatus && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">Ενέργειες Διαχειριστή:</p>
          <div className="flex flex-wrap gap-2">
            {request.status !== 'in_progress' && (
              <Button
                onClick={() => handleStatusChange('in_progress')}
                disabled={changingStatus}
                variant="secondary"
                size="sm"
              >
                🔄 Σε Εξέλιξη
              </Button>
            )}
            {request.status !== 'completed' && (
              <Button
                onClick={() => handleStatusChange('completed')}
                disabled={changingStatus}
                className="bg-green-600 hover:bg-green-700"
                size="sm"
              >
                ✅ Ολοκληρώθηκε
              </Button>
            )}
            {request.status !== 'rejected' && (
              <Button
                onClick={() => handleStatusChange('rejected')}
                disabled={changingStatus}
                variant="destructive"
                size="sm"
              >
                ❌ Απόρριψη
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Supporters list */}
      {request.supporter_usernames && request.supporter_usernames.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-900 mb-2">Υποστηρικτές:</p>
          <p className="text-sm text-blue-800">
            {request.supporter_usernames.join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}

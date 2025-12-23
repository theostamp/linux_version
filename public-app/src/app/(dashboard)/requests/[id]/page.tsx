'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ErrorMessage from '@/components/ErrorMessage';
import { useAuth } from '@/components/contexts/AuthContext';
import { deleteUserRequest, toggleSupportRequest, fetchRequest } from '@/lib/api';
import type { UserRequest } from '@/types/userRequests';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Trash2, Edit } from 'lucide-react';
import { hasOfficeAdminAccess } from '@/lib/roleUtils';
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
  const { selectedBuilding, currentBuilding } = useBuilding();
  const [request, setRequest] = useState<UserRequest | null>(null);
  
  const buildingId = selectedBuilding?.id || currentBuilding?.id;

  const isOwner = request?.created_by_username === user?.username;
  const isAdmin = hasOfficeAdminAccess(user);
  const canDelete = isAdmin || isOwner;
  const canChangeStatus = isAdmin;

  async function loadRequest() {
    try {
      const data = await fetchRequest(Number(id), buildingId);
      setRequest(data);
      setError('');
    } catch (err: unknown) {
      const error = err as { response?: { status?: number }; message?: string };
      if (error?.response?.status === 401) {
        setError('Δεν έχετε δικαίωμα πρόσβασης σε αυτό το αίτημα.');
      } else if (error?.response?.status === 404) {
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
      setRequest(prev => prev ? {
        ...prev,
        supporter_count: result.supporter_count,
        is_supported: result.supported
      } : null);
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error.message || 'Αποτυχία υποστήριξης');
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
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error.message || 'Αποτυχία διαγραφής');
    } finally {
      setDeleting(false);
    }
  }

  async function handleStatusChange(newStatus: string) {
    if (!request) return;
    setChangingStatus(true);
    try {
      const updatedRequest = await fetchRequest(request.id, buildingId);
      setRequest(updatedRequest);
      toast.success('Η κατάσταση ενημερώθηκε επιτυχώς');
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error.message || 'Αποτυχία αλλαγής κατάστασης');
    } finally {
      setChangingStatus(false);
    }
  }

  useEffect(() => {
    if (isAuthReady) {
      loadRequest();
    }
  }, [id, isAuthReady]);

  if (!isAuthReady || loading) {
    return (
      <div>
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
      <div>
        <Link href="/requests">
          <Button variant="secondary" className="mb-4">⬅ Επιστροφή στα Αιτήματα</Button>
        </Link>
        <ErrorMessage message={error} />
      </div>
    );
  }

  if (!request) {
    return (
      <div>
        <Link href="/requests">
          <Button variant="secondary" className="mb-4">⬅ Επιστροφή στα Αιτήματα</Button>
        </Link>
        <p>Δεν βρέθηκε το αίτημα.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
        {request.photos && request.photos.length > 0 && (
          <PhotoGallery photos={request.photos} />
        )}

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
            <strong>Υποστηρικτές:</strong> {request.supporter_count || 0}
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
            {supporting ? 'Επεξεργασία...' : (request as { is_supported?: boolean }).is_supported ? 'Ανάκληση Υποστήριξης' : '👍 Υποστηρίζω'}
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
      {(request as { supporter_usernames?: string[] }).supporter_usernames && 
       (request as { supporter_usernames?: string[] }).supporter_usernames!.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-900 mb-2">Υποστηρικτές:</p>
          <p className="text-sm text-blue-800">
            {(request as { supporter_usernames?: string[] }).supporter_usernames!.join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}


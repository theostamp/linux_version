'use client';

import Link from 'next/link';
import { UserRequest, MAINTENANCE_CATEGORIES, PRIORITY_LEVELS, REQUEST_STATUSES } from '@/types/userRequests';
import { safeFormatDate, isValidDate } from '@/lib/utils';
import { toggleSupportRequest } from '@/lib/api';
import { useState } from 'react';
import { toast } from 'sonner';
import { Calendar, MapPin, User, Clock, AlertTriangle, CheckCircle, UserPlus } from 'lucide-react';
import { typography } from '@/lib/typography';

type Props = {
  request: UserRequest;
};

export default function RequestCard({ request }: Readonly<Props>) {
  const {
    id,
    title,
    description,
    status,
    supporter_count,
    is_urgent,
    created_at,
    type,
    priority,
    assigned_to_username,
    estimated_completion,
    completed_at,
    location,
    apartment_number,
    maintenance_category,
    created_by_username,
    photos,
  } = request;

  const [supporting, setSupporting] = useState(false);
  const [supportCount, setSupportCount] = useState(supporter_count || 0);

  // Get status info
  const statusInfo = REQUEST_STATUSES.find(s => s.value === status) || 
    { label: status, icon: '📋', color: 'text-gray-600' };

  // Get priority info
  const priorityInfo = PRIORITY_LEVELS.find(p => p.value === priority) || 
    { label: 'Μέτρια', icon: '🟡', color: 'text-yellow-600' };

  // Get maintenance category info
  const categoryInfo = MAINTENANCE_CATEGORIES.find(c => c.value === maintenance_category) || 
    MAINTENANCE_CATEGORIES.find(c => c.value === type) || 
    { label: type || 'Άλλο', icon: '📋', color: 'text-gray-500' };

  const handleSupport = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSupporting(true);
    try {
      const result = await toggleSupportRequest(id);
      toast.success(result.status);
      setSupportCount(result.supporter_count);
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error.message || 'Σφάλμα υποστήριξης');
    } finally {
      setSupporting(false);
    }
  };

  // Check if overdue
  const isOverdue = estimated_completion && 
    isValidDate(estimated_completion) &&
    new Date(estimated_completion) < new Date() && 
    status !== 'completed' && 
    status !== 'cancelled';

  return (
    <Link
      href={`/requests/${id}`}
      className="block border rounded-lg p-4 shadow hover:shadow-md transition-all duration-200 bg-white hover:bg-gray-50"
    >
      {/* Header with priority and status */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <span className={`${typography.cardTitle} ${categoryInfo.color}`}>
            {categoryInfo.icon}
          </span>
          <h2 className={typography.cardTitle}>
            {title}
            {is_urgent && <span className="ml-2 text-red-600">🔥</span>}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm px-2 py-1 rounded-full ${priorityInfo.color} bg-opacity-10`}>
            {priorityInfo.icon} {priorityInfo.label}
          </span>
          <span className={`text-sm px-2 py-1 rounded-full ${statusInfo.color} bg-opacity-10`}>
            {statusInfo.icon} {statusInfo.label}
          </span>
        </div>
      </div>

      {/* Photos Preview */}
      {photos && photos.length > 0 && (
        <div className="mb-3">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {photos.slice(0, 3).map((photo, index) => (
              <div key={index} className="flex-shrink-0">
                <img
                  src={photo}
                  alt={`Photo ${index + 1}`}
                  className="w-16 h-16 object-cover rounded-lg border"
                />
              </div>
            ))}
            {photos.length > 3 && (
              <div className={`flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg border flex items-center justify-center ${typography.small}`}>
                +{photos.length - 3}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Description */}
      <p className={`${typography.body} line-clamp-2 mb-3`}>{description}</p>

      {/* Location and apartment info */}
      {(location || apartment_number) && (
        <div className={`flex items-center gap-4 ${typography.bodySmall} mb-3`}>
          {location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {location}
            </span>
          )}
          {apartment_number && (
            <span className="flex items-center gap-1">
              <User className="w-4 h-4" />
              Διαμέρισμα {apartment_number}
            </span>
          )}
        </div>
      )}

      {/* Assignment and dates */}
      <div className={`flex items-center justify-between ${typography.bodySmall} mb-3`}>
        <div className="flex items-center gap-4">
          {created_by_username && (
            <span className="flex items-center gap-1 text-blue-600">
              <UserPlus className="w-4 h-4" />
              {created_by_username}
            </span>
          )}
          {assigned_to_username && (
            <span className="flex items-center gap-1">
              <User className="w-4 h-4" />
              {assigned_to_username}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {safeFormatDate(created_at, 'd MMM yyyy, HH:mm')}
          </span>
        </div>
        
        {estimated_completion && (
          <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
            <Clock className="w-4 h-4" />
            {isOverdue ? (
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                Οφειλή
              </span>
            ) : (
              safeFormatDate(estimated_completion, 'd MMM')
            )}
          </div>
        )}
      </div>

      {completed_at && (
        <div className={`flex items-center gap-1 ${typography.bodySmall} text-green-600 mb-3`}>
          <CheckCircle className="w-4 h-4" />
          Ολοκληρώθηκε: {safeFormatDate(completed_at, 'd MMM yyyy')}
        </div>
      )}

      {/* Footer with supporters */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <span className={typography.bodySmall}>
          🤝 Υποστηρικτές: <strong>{supportCount}</strong>
        </span>
        
        <button
          onClick={handleSupport}
          disabled={supporting}
          className={`${typography.linkText} disabled:opacity-50`}
        >
          {supporting ? 'Επεξεργασία...' : '✅ Υποστήριξη'}
        </button>
      </div>
    </Link>
  );
}


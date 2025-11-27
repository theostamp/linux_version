'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, User, Check } from 'lucide-react';
import { fetchApartments, type ApartmentList } from '@/lib/api';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface RecipientSelectorProps {
  buildingId: number | null;
  sendToAll: boolean;
  onSendToAllChange: (value: boolean) => void;
  selectedIds: number[];
  onSelectedIdsChange: (ids: number[]) => void;
}

export default function RecipientSelector({
  buildingId,
  sendToAll,
  onSendToAllChange,
  selectedIds,
  onSelectedIdsChange,
}: RecipientSelectorProps) {
  const { data: apartments = [], isLoading } = useQuery<ApartmentList[]>({
    queryKey: ['apartments', buildingId],
    queryFn: () => (buildingId ? fetchApartments(buildingId) : Promise.resolve([])),
    enabled: !!buildingId,
  });

  const handleToggleApartment = (id: number) => {
    if (selectedIds.includes(id)) {
      onSelectedIdsChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectedIdsChange([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === apartments.length) {
      onSelectedIdsChange([]);
    } else {
      onSelectedIdsChange(apartments.map((a) => a.id));
    }
  };

  const recipientCount = sendToAll ? apartments.length : selectedIds.length;

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Παραλήπτες</Label>
      
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onSendToAllChange(true)}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all',
            sendToAll
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-200 hover:border-gray-300 text-gray-600'
          )}
        >
          <Users className="h-5 w-5" />
          <span className="font-medium">Όλοι οι ένοικοι</span>
          {sendToAll && <Check className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={() => onSendToAllChange(false)}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all',
            !sendToAll
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-200 hover:border-gray-300 text-gray-600'
          )}
        >
          <User className="h-5 w-5" />
          <span className="font-medium">Επιλογή</span>
          {!sendToAll && <Check className="h-4 w-4" />}
        </button>
      </div>

      {!sendToAll && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          {isLoading ? (
            <div className="text-center py-4 text-gray-500">Φόρτωση...</div>
          ) : apartments.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              Δεν βρέθηκαν διαμερίσματα
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-2 border-b">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {selectedIds.length === apartments.length ? 'Αποεπιλογή όλων' : 'Επιλογή όλων'}
                </button>
                <Badge variant="outline" className="text-xs">
                  {selectedIds.length} / {apartments.length}
                </Badge>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {apartments.map((apt) => (
                  <label
                    key={apt.id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-white cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedIds.includes(apt.id)}
                      onCheckedChange={() => handleToggleApartment(apt.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900">
                        Διαμέρισμα {apt.number}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {apt.owner_name || apt.tenant_name || 'Χωρίς όνομα'}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="text-sm text-gray-600">
        Θα σταλεί σε <span className="font-semibold">{recipientCount}</span>{' '}
        {recipientCount === 1 ? 'παραλήπτη' : 'παραλήπτες'}
      </div>
    </div>
  );
}


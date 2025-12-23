'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ErrorMessage from '@/components/ErrorMessage';
import { createUserRequest } from '@/lib/api';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useAuth } from '@/components/contexts/AuthContext';
import BuildingFilterIndicator from '@/components/BuildingFilterIndicator';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { toast } from 'sonner';
import { MAINTENANCE_CATEGORIES, PRIORITY_LEVELS, LOCATION_TYPES } from '@/types/userRequests';
import { MapPin, User, AlertTriangle, Wrench } from 'lucide-react';
import PhotoUpload from '@/components/PhotoUpload';

export default function NewRequestPage() {
  const router = useRouter();
  const { currentBuilding, selectedBuilding } = useBuilding();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const buildingToUse = selectedBuilding || currentBuilding;
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [maintenanceCategory, setMaintenanceCategory] = useState('');
  const [priority, setPriority] = useState('medium');
  const [location, setLocation] = useState('');
  const [apartmentNumber, setApartmentNumber] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!buildingToUse) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">📋 Αναφορά Βλάβης</h1>
        <p className="text-red-600">Παρακαλώ επιλέξτε κτίριο για να συνεχίσετε.</p>
        <Link href="/requests">
          <Button variant="secondary" className="mt-4">⬅ Επιστροφή</Button>
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !description.trim()) {
      setError('Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία.');
      return;
    }

    if (maintenanceCategory && !MAINTENANCE_CATEGORIES.some((c) => c.value === maintenanceCategory)) {
      setError('Μη έγκυρη κατηγορία συντήρησης.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        building: buildingToUse.id,
        type: maintenanceCategory || undefined,
        priority: priority,
        location: location || undefined,
        apartment_number: apartmentNumber || undefined,
        is_urgent: isUrgent || undefined,
        photos: photos.length > 0 ? photos : undefined,
      };
      
      await createUserRequest(payload);
      
      // ✅ Invalidate AND explicitly refetch for immediate UI update
      await queryClient.invalidateQueries({ queryKey: ['requests'] });
      await queryClient.refetchQueries({ queryKey: ['requests'] });
      toast.success('Το αίτημα δημιουργήθηκε επιτυχώς!');
      router.push('/requests');
    } catch (err: unknown) {
      const error = err as { response?: { data?: unknown }; message?: string };
      const msg = error.response?.data
        ? JSON.stringify(error.response.data)
        : error.message || 'Σφάλμα δημιουργίας αιτήματος';
      setError(`Σφάλμα: ${msg}`);
      console.error('CreateUserRequest failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link href="/requests">
        <Button variant="outline" className="gap-2">
          ⬅ Επιστροφή στις Αναφορές
        </Button>
      </Link>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-border p-6 md:p-8 max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
            <Wrench className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold font-condensed">Αναφορά Νέας Βλάβης</h1>
          <p className="text-muted-foreground mt-2">
            Συμπληρώστε τα παρακάτω στοιχεία για να ενημερώσετε τη διαχείριση
          </p>
        </div>
        
        <BuildingFilterIndicator className="mb-6" />
        
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-8 bg-secondary/30 py-2 px-4 rounded-full w-fit mx-auto">
          <MapPin className="w-4 h-4" />
          <span>Κτίριο: <strong>{buildingToUse.name}</strong></span>
        </div>

        {user && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-sm text-blue-800">
              <User className="w-4 h-4" />
              <span>Δημιουργηθηκε απο: <strong>{user.first_name} {user.last_name}</strong> ({user.email})</span>
            </div>
          </div>
        )}

        {error && <ErrorMessage message={error} />}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Τίτλος * <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Συνοπτική περιγραφή του προβλήματος"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Περιγραφή * <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              className="w-full border border-slate-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Αναλυτική περιγραφή του προβλήματος, συμπτώματα, κλπ."
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
              Κατηγορία Συντήρησης
            </label>
            <select
              id="category"
              value={maintenanceCategory}
              onChange={(e) => setMaintenanceCategory(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">-- Επιλέξτε κατηγορία --</option>
              {MAINTENANCE_CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.icon} {category.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
              Προτεραιότητα
            </label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {PRIORITY_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.icon} {level.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              Τοποθεσία
            </label>
            <select
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">-- Επιλέξτε τοποθεσία --</option>
              {LOCATION_TYPES.map((loc) => (
                <option key={loc.value} value={loc.value}>
                  {loc.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="apartment" className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Αριθμός Διαμερίσματος (αν ισχύει)
            </label>
            <input
              id="apartment"
              type="text"
              value={apartmentNumber}
              onChange={(e) => setApartmentNumber(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="π.χ. Α1, 2ος όροφος, κλπ."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Φωτογραφίες του Προβλήματος (προαιρετικό)
            </label>
            <PhotoUpload
              photos={photos}
              onPhotosChange={setPhotos}
              maxPhotos={5}
              maxSizeMB={5}
            />
          </div>

          <div className="flex items-center space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <input
              id="urgent"
              type="checkbox"
              checked={isUrgent}
              onChange={() => setIsUrgent(!isUrgent)}
              className="w-5 h-5 text-red-600 border-slate-200 rounded focus:ring-red-500"
            />
            <label htmlFor="urgent" className="text-sm font-medium text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              🚨 Επείγον αίτημα (απαιτεί άμεση προσοχή)
            </label>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-medium"
          >
            {submitting ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Δημιουργία...
              </div>
            ) : (
              '✅ Δημιουργία Αιτήματος Συντήρησης'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}


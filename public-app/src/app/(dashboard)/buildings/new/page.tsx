'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Building as BuildingIcon, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ErrorMessage from '@/components/ErrorMessage';
import CreateBuildingForm from '@/components/buildings/CreateBuildingForm';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useAuth } from '@/components/contexts/AuthContext';
import type { Building } from '@/lib/api';
import { hasOfficeAdminAccess } from '@/lib/roleUtils';

export default function NewBuildingPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const {
    buildings,
    isLoading: buildingsLoading,
    error,
    setBuildings,
    setCurrentBuilding,
    setSelectedBuilding,
    refreshBuildings,
  } = useBuilding();

  const canManage = hasOfficeAdminAccess(user);
  const isLoading = authLoading || buildingsLoading;

  const handleSuccess = (building: Building) => {
    setBuildings((prev) => {
      const exists = prev.some((item) => item.id === building.id);
      if (exists) {
        return prev.map((item) => (item.id === building.id ? building : item));
      }
      return [building, ...prev];
    });

    setCurrentBuilding(building);
    setSelectedBuilding(building);

    refreshBuildings().catch((refreshError: unknown) => {
      console.error('[Buildings/New] Failed to refresh buildings after creation', refreshError);
    });

    router.push(`/buildings/${building.id}`);
  };

  const handleCancel = () => {
    router.push('/buildings');
  };

  if (!canManage && !authLoading) {
    return (
      <div className="space-y-4">
        <Link href="/buildings">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Επιστροφή
          </Button>
        </Link>
        <ErrorMessage message="Δεν έχετε δικαιώματα για δημιουργία κτιρίων." />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
          <p className="ml-3 text-gray-600">Φόρτωση...</p>
        </div>
      </div>
    );
  }

  if (error && buildings.length === 0) {
    return (
      <div className="space-y-4">
        <Link href="/buildings">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Επιστροφή
          </Button>
        </Link>
        <ErrorMessage message={error} />
      </div>
    );
  }

  if (!authLoading && user && !user.tenant) {
    return (
      <div className="space-y-4">
        <Link href="/buildings">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Επιστροφή
          </Button>
        </Link>
        <ErrorMessage message="Ο λογαριασμός δεν έχει tenant. Επικοινωνήστε με τον διαχειριστή για να ενεργοποιηθεί πριν δημιουργήσετε κτίρια." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center space-x-4">
          <Link href="/buildings">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Επιστροφή
            </Button>
          </Link>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="page-title">Νέο Κτίριο</h1>
              <p className="text-gray-600">Συμπληρώστε τα στοιχεία για να δημιουργήσετε νέα διαχείριση</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <BuildingIcon className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-900 space-y-1">
            <p className="font-medium">Το CreateBuildingForm υποστηρίζει:</p>
            <ul className="list-disc pl-5 space-y-1 text-blue-800">
              <li>AddressAutocomplete για εύκολη εισαγωγή διεύθυνσης</li>
              <li>StreetViewImage για άμεση προεπισκόπηση</li>
              <li>Αυτόματη αποθήκευση συντεταγμένων & αριθμού διαμερισμάτων</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <CreateBuildingForm onSuccess={handleSuccess} onCancel={handleCancel} />
        <div className="mt-4 flex items-center text-sm text-gray-500">
          <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
          Μετά τη δημιουργία, το νέο κτίριο επιλέγεται αυτόματα και φορτώνεται στο dashboard.
        </div>
      </div>
    </div>
  );
}

'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Building as BuildingIcon } from 'lucide-react';
import Link from 'next/link';
import ErrorMessage from '@/components/ErrorMessage';

export default function NewBuildingPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
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
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">Νέο Κτίριο</h1>
              <p className="text-gray-600">Δημιουργία νέου κτιρίου στο σύστημα</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <BuildingIcon className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-900 mb-2">⚠️ Component Missing</h3>
            <p className="text-sm text-yellow-800">
              Το CreateBuildingForm component λείπει. Χρειάζεται να δημιουργηθεί για να λειτουργήσει αυτή η σελίδα.
            </p>
            <p className="text-xs text-yellow-700 mt-2">
              Το component χρειάζεται: AddressAutocomplete, StreetViewImage, και fetchBuildingResidents/fetchApartments API functions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


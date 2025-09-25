
// frontend/app/buildings/new/page.tsx

'use client';

import CreateBuildingForm from '@/components/CreateBuildingForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Building as BuildingIcon } from 'lucide-react';
import Link from 'next/link';

export default function NewBuildingPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
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

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <BuildingIcon className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">Οδηγίες Δημιουργίας</h3>
            <p className="text-sm text-blue-800 mt-1">
              Συμπληρώστε τα παρακάτω στοιχεία για να δημιουργήσετε ένα νέο κτίριο. 
              Τα πεδία με αστερίσκο (*) είναι υποχρεωτικά.
            </p>
          </div>
        </div>
      </div>

      {/* Form Container */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          <CreateBuildingForm 
            submitText="Δημιουργία Κτιρίου"
            onSuccessPath="/buildings"
          />
        </div>
      </div>
    </div>
  );
}
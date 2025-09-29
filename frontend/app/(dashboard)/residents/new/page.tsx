'use client';
import CreateResidentForm from '@/components/CreateResidentForm';
import { useBuilding } from '@/components/contexts/BuildingContext';
import BuildingSelectorButton from '@/components/BuildingSelectorButton';
import Link from 'next/link';

export default function NewResidentPage() {
  const { currentBuilding, selectedBuilding, setSelectedBuilding } = useBuilding();
  
  // Χρησιμοποιούμε το selectedBuilding αν υπάρχει, αλλιώς το currentBuilding
  const buildingToUse = selectedBuilding || currentBuilding;

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Προσθήκη Κατοίκου</h1>
          <Link 
            href="/residents/list"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Επιστροφή στη λίστα
          </Link>
        </div>
        
        {!buildingToUse && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
              <span className="text-yellow-800 font-medium">
                Προσοχή: Δεν έχει επιλεγεί κτίριο
              </span>
            </div>
            <p className="text-yellow-700 mt-2 ml-6">
              Πρέπει να επιλέξετε κτίριο πρώτα για να μπορέσετε να προσθέσετε κάτοικο.
            </p>
            <div className="mt-4 ml-6">
              <BuildingSelectorButton
                onBuildingSelect={setSelectedBuilding}
                selectedBuilding={buildingToUse}
              />
            </div>
          </div>
        )}
        
        {buildingToUse && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span className="text-green-800 font-medium">
                  Επιλεγμένο κτίριο: {buildingToUse.name}
                </span>
              </div>
              <BuildingSelectorButton
                onBuildingSelect={setSelectedBuilding}
                selectedBuilding={buildingToUse}
              />
            </div>
          </div>
        )}
      </div>
      
      <CreateResidentForm submitText="Δημιουργία Κατοίκου" />
    </div>
  );
}

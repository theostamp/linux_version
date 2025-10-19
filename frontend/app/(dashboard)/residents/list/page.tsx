"use client";

import { useResidents } from "@/hooks/useResidents";
import { useBuilding } from "@/components/contexts/BuildingContext";
import BuildingFilterIndicator from "@/components/BuildingFilterIndicator";
import Link from "next/link";
import { Resident } from "@/lib/api";
import { useState, useMemo } from "react";
import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';

function ResidentsListPageContent() {
  const { currentBuilding, selectedBuilding } = useBuilding();
  const [searchTerm, setSearchTerm] = useState("");
  
  // Χρησιμοποιούμε το selectedBuilding για φιλτράρισμα, ή το currentBuilding αν δεν έχει επιλεγεί κάτι
  const buildingId = selectedBuilding?.id || currentBuilding?.id;
  const buildingToUse = selectedBuilding || currentBuilding;
  
  console.log('[ResidentsListPage] Debug:', {
    selectedBuilding: selectedBuilding?.id,
    currentBuilding: currentBuilding?.id,
    buildingId,
    buildingToUse: buildingToUse?.name
  });
  
  const { data: residents, isLoading, error } = useResidents(buildingId);

  // Φιλτράρισμα και ταξινόμηση των κατοίκων
  const filteredAndSortedResidents = useMemo(() => {
    if (!residents || !Array.isArray(residents)) return [];
    
    let filtered = residents;
    
    // Φιλτράρισμα με βάση το search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = residents.filter((resident: Resident) => 
        resident.user_first_name.toLowerCase().includes(term) ||
        resident.user_last_name.toLowerCase().includes(term) ||
        resident.user_email.toLowerCase().includes(term) ||
        resident.apartment.toLowerCase().includes(term) ||
        resident.phone?.toLowerCase().includes(term) ||
        resident.role.toLowerCase().includes(term)
      );
    }
    
    // Ταξινόμηση αλφαβητικά (πρώτα επώνυμο, μετά όνομα)
    return filtered.sort((a: Resident, b: Resident) => {
      const lastNameA = a.user_last_name.toLowerCase();
      const lastNameB = b.user_last_name.toLowerCase();
      
      if (lastNameA !== lastNameB) {
        return lastNameA.localeCompare(lastNameB);
      }
      
      // Αν τα επώνυμα είναι ίδια, ταξινόμηση με βάση το όνομα
      return a.user_first_name.toLowerCase().localeCompare(b.user_first_name.toLowerCase());
    });
  }, [residents, searchTerm]);

  if (!buildingToUse) return <p>Δεν έχει επιλεγεί κάποιο κτίριο.</p>;
  if (isLoading) return <p>Φόρτωση...</p>;
  if (error) return <p>Σφάλμα φόρτωσης.</p>;

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'manager': return 'Διαχειριστής';
      case 'owner': return 'Ιδιοκτήτης';
      case 'tenant': return 'Ένοικος';
      default: return role;
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Κάτοικοι</h1>
        <Link 
          href="/residents/new"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors"
        >
          Προσθήκη Κατοίκου
        </Link>
      </div>
      
      <BuildingFilterIndicator className="mb-4" />
      
      {/* Ετικέτα Κτιρίου */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-500 rounded-full"></div>
          <span className="text-sm font-medium text-gray-700">
            Εμφάνιση κατοίκων για το κτίριο:
          </span>
          <span className="text-lg font-bold text-gray-900">
            {buildingToUse.name}
          </span>
        </div>
        {buildingToUse.address && (
          <p className="text-sm text-gray-600 mt-1 ml-6">
            {buildingToUse.address}
          </p>
        )}
        <div className="mt-2 ml-6">
          <span className="text-xs text-gray-500">
            Σύνολο κατοίκων: <strong>{filteredAndSortedResidents.length}</strong>
            {searchTerm && residents && Array.isArray(residents) && (
              <span className="ml-2">
                (από {residents.length} συνολικά)
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Πεδίο Αναζήτησης */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Αναζήτηση κατοίκων (όνομα, επώνυμο, email, διαμέρισμα, τηλέφωνο, ρόλος)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {filteredAndSortedResidents.length === 0 ? (
        <div className="text-center py-8">
          {searchTerm ? (
            <>
              <p className="text-gray-500 mb-4">
                Δεν βρέθηκαν κάτοικοι που να ταιριάζουν με την αναζήτηση &quot;{searchTerm}&quot;.
              </p>
              <button
                onClick={() => setSearchTerm("")}
                className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded transition-colors"
              >
                Καθαρισμός Αναζήτησης
              </button>
            </>
          ) : (
            <>
              <p className="text-gray-500 mb-4">Δεν υπάρχουν κάτοικοι σε αυτό το κτίριο.</p>
              <Link 
                href="/residents/new"
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition-colors"
              >
                Προσθήκη Πρώτου Κατοίκου
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse bg-white shadow-sm rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="border px-4 py-3 text-left font-semibold">Όνομα</th>
                <th className="border px-4 py-3 text-left font-semibold">Email</th>
                <th className="border px-4 py-3 text-left font-semibold">Διαμέρισμα</th>
                <th className="border px-4 py-3 text-left font-semibold">Ρόλος</th>
                <th className="border px-4 py-3 text-left font-semibold">Τηλέφωνο</th>
                <th className="border px-4 py-3 text-left font-semibold">Ημ/νία Αντιστοίχισης</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedResidents.map((res: Resident) => (
                <tr key={res.id} className="hover:bg-gray-50">
                  <td className="border px-4 py-3">
                    {res.user_first_name} {res.user_last_name}
                  </td>
                  <td className="border px-4 py-3">{res.user_email}</td>
                  <td className="border px-4 py-3 font-medium">{res.apartment}</td>
                  <td className="border px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      res.role === 'manager' ? 'bg-red-100 text-red-800' :
                      res.role === 'owner' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {getRoleLabel(res.role)}
                    </span>
                  </td>
                  <td className="border px-4 py-3">{res.phone || '-'}</td>
                  <td className="border px-4 py-3 text-sm text-gray-600">
                    {new Date(res.created_at).toLocaleDateString("el-GR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ResidentsListPage() {
  return (
    <AuthGate role="any">
      <SubscriptionGate requiredStatus="any">
        <ResidentsListPageContent />
      </SubscriptionGate>
    </AuthGate>
  );
}

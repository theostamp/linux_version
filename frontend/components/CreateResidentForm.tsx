// frontend/components/CreateResidentForm.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreateResidentPayload } from '@/lib/api';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useCreateResident } from '@/hooks/useCreateResident';

interface Props {
  readonly submitText?: string;
}

export default function CreateResidentForm({ submitText = 'Καταχώριση Κατοίκου' }: Props) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [apartment, setApartment] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'manager' | 'owner' | 'tenant'>('tenant');
  const router = useRouter();
  const { currentBuilding, selectedBuilding } = useBuilding();
  const createResidentMutation = useCreateResident();

  // Χρησιμοποιούμε το selectedBuilding αν υπάρχει, αλλιώς το currentBuilding
  const buildingToUse = selectedBuilding || currentBuilding;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!buildingToUse) {
      return;
    }

    const payload: CreateResidentPayload = {
      email,
      first_name: firstName,
      last_name: lastName,
      password,
      apartment,
      building_id: buildingToUse.id,
      role,
      phone,
    };

    createResidentMutation.mutate(payload, {
      onSuccess: () => {
        router.push('/residents/list');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Ετικέτα Κτιρίου */}
      {buildingToUse && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium text-blue-800">
              Δημιουργία κατοίκου για το κτίριο:
            </span>
            <span className="text-lg font-bold text-blue-900">
              {buildingToUse.name}
            </span>
          </div>
          {buildingToUse.address && (
            <p className="text-sm text-blue-700 mt-1 ml-5">
              {buildingToUse.address}
            </p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label htmlFor="email" className="block mb-1 font-semibold">Email *</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <div>
          <label htmlFor="firstName" className="block mb-1 font-semibold">Όνομα *</label>
          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <div>
          <label htmlFor="lastName" className="block mb-1 font-semibold">Επώνυμο *</label>
          <input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block mb-1 font-semibold">Κωδικός Πρόσβασης *</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            required
            minLength={6}
          />
        </div>
        
        <div>
          <label htmlFor="apartment" className="block mb-1 font-semibold">Διαμέρισμα *</label>
          <input
            id="apartment"
            type="text"
            value={apartment}
            onChange={(e) => setApartment(e.target.value)}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            placeholder="π.χ. Α1, Β2, 3ος όροφος"
            required
          />
        </div>
        
        <div>
          <label htmlFor="phone" className="block mb-1 font-semibold">Τηλέφωνο</label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            placeholder="π.χ. 6971234567"
          />
        </div>
        
        <div>
          <label htmlFor="role" className="block mb-1 font-semibold">Ρόλος *</label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as 'manager' | 'owner' | 'tenant')}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="tenant">Ένοικος</option>
            <option value="owner">Ιδιοκτήτης</option>
            <option value="manager">Διαχειριστής</option>
          </select>
        </div>
        
        <button
          type="submit"
          disabled={createResidentMutation.isPending || !buildingToUse}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded transition-colors"
        >
          {createResidentMutation.isPending ? 'Δημιουργία...' : submitText}
        </button>
        
        {!buildingToUse && (
          <p className="text-red-600 text-sm">Πρέπει να επιλέξετε κτίριο πρώτα</p>
        )}
      </form>
    </div>
  );
}

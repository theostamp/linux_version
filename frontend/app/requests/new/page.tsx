'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ErrorMessage from '@/components/ErrorMessage';
import { createUserRequest } from '@/lib/api';
import { useBuilding } from '@/components/contexts/BuildingContext';
import BuildingFilterIndicator from '@/components/BuildingFilterIndicator';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

const TYPE_CHOICES = [
  { value: 'maintenance', label: 'Συντήρηση' },
  { value: 'cleaning', label: 'Καθαριότητα' },
  { value: 'technical', label: 'Τεχνικό' },
  { value: 'security', label: 'Ασφάλεια' },
  { value: 'noise', label: 'Θόρυβος' },
  { value: 'other', label: 'Άλλο' },
];

export default function NewRequestPage() {
  const router = useRouter();
  const { currentBuilding, selectedBuilding } = useBuilding();
  const queryClient = useQueryClient();
  
  // Χρησιμοποιούμε το selectedBuilding ή το currentBuilding
  const buildingToUse = selectedBuilding || currentBuilding;
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!buildingToUse) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">📋 Νέο Αίτημα</h1>
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

    if (type && !TYPE_CHOICES.some((t) => t.value === type)) {
      setError('Μη έγκυρος τύπος αιτήματος.');
      return;
    }

    setSubmitting(true);
    try {
      await createUserRequest({
        title: title.trim(),
        description: description.trim(),
        building: buildingToUse.id,
        type: type || undefined,
        is_urgent: isUrgent || undefined,
      });
      
      // Invalidate queries and show success
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      toast.success('Το αίτημα δημιουργήθηκε επιτυχώς!');
      router.push('/requests');
    } catch (err: any) {
      const msg = err.response?.data
        ? JSON.stringify(err.response.data)
        : err.message;
      setError(`Σφάλμα: ${msg}`);
      console.error('CreateUserRequest failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      {/* Navigation */}
      <Link href="/requests">
        <Button variant="secondary">⬅ Επιστροφή στα Αιτήματα</Button>
      </Link>

      {/* Form */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 text-center">📋 Νέο Αίτημα</h1>
        
        <BuildingFilterIndicator className="mb-6" />
        
        <div className="text-sm text-gray-600 mb-6 text-center">
          Κτίριο: <strong>{buildingToUse.name}</strong>
          {selectedBuilding && (
            <span className="block text-xs text-blue-600 mt-1">
              Φιλτράρισμα ενεργό
            </span>
          )}
        </div>

        {error && <ErrorMessage message={error} />}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Τίτλος *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Συνοπτική περιγραφή του αιτήματος"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Περιγραφή *
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Αναλυτική περιγραφή του προβλήματος ή αιτήματος"
            />
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
              Κατηγορία (προαιρετικό)
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">-- Επιλέξτε κατηγορία --</option>
              {TYPE_CHOICES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-3">
            <input
              id="urgent"
              type="checkbox"
              checked={isUrgent}
              onChange={() => setIsUrgent(!isUrgent)}
              className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
            />
            <label htmlFor="urgent" className="text-sm font-medium text-gray-700">
              🚨 Επείγον αίτημα
            </label>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
          >
            {submitting ? 'Δημιουργία...' : '✅ Δημιουργία Αιτήματος'}
          </Button>
        </form>
      </div>
    </div>
  );
}

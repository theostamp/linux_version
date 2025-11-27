'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft, UserPlus } from 'lucide-react';
import Link from 'next/link';

export default function AssignResidentPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/buildings">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Επιστροφή
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">👤 Ανάθεση Ενοίκου</h1>
        <div></div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <UserPlus className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-900 mb-2">⚠️ Page Under Construction</h3>
            <p className="text-sm text-yellow-800">
              Αυτή η σελίδα είναι υπό κατασκευή. Χρειάζεται να δημιουργηθεί το AssignResidentForm component.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


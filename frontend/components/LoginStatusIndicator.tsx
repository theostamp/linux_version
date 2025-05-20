'use client';

import { useAuth } from '@/components/contexts/AuthContext';
import Link from 'next/link';

export default function LoginStatusIndicator() {
  const { user, isLoading: loading } = useAuth();

  if (loading) {
    return (
      <p className="text-sm text-gray-400 italic">
        Έλεγχος σύνδεσης...
      </p>
    );
  }

  return (
    <div className="text-sm text-gray-600 dark:text-gray-300">
      {user ? (
        <p>
          👋 Συνδεδεμένος ως <strong>{user.username}</strong>{' '}
          <Link href="/logout" className="ml-2 underline text-red-500 hover:text-red-700">
            Αποσύνδεση
          </Link>
        </p>
                ) : (
        <p>
          Δεν είστε συνδεδεμένος –{' '}
          <Link href="/login" className="underline text-blue-600 hover:text-blue-800">
            Σύνδεση
          </Link>
        </p>
      )}
    </div>
  );
}

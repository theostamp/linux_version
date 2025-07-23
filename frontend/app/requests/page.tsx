'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RequestsPage() {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/requests/list');
    }, 100);

    return () => clearTimeout(timer);
  }, [router]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsRedirecting(false);
    }, 2000);

    return () => clearTimeout(timeout);
  }, []);

  if (!isRedirecting) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500 mb-4">Η ανακατεύθυνση δεν ολοκληρώθηκε.</p>
        <button 
          onClick={() => router.push('/requests/list')}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Πάτησε εδώ για να συνεχίσεις
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p>Ανακατεύθυνση στη λίστα αιτημάτων...</p>
    </div>
  );
}

// frontend/app/unauthorized/page.tsx
'use client';

import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="p-8 max-w-xl mx-auto text-center space-y-6">
      <h1 className="text-3xl font-bold text-red-600">🚫 Μη εξουσιοδοτημένη Πρόσβαση</h1>
      <p>Δεν έχετε δικαίωμα πρόσβασης στη συγκεκριμένη σελίδα ή ενέργεια.</p>
      <Link href="/" className="btn-secondary">Επιστροφή στην αρχική</Link>
    </div>
  );
}

import { ReactNode } from 'react';
import { isUnifiedProjectsEnabled } from '@/lib/featureFlags';
import Link from 'next/link';

export default function ProjectsSectionLayout({ children }: { children: ReactNode }) {
  if (!isUnifiedProjectsEnabled()) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-xl font-semibold">Περιοχή Έργων</h1>
        <p className="text-sm text-muted-foreground">
          Η ενοποιημένη ροή έργων/συντήρησης είναι απενεργοποιημένη. Ενεργοποιήστε το flag
          <code className="mx-1">NEXT_PUBLIC_FEATURE_PROJECTS_UNIFIED</code> για πρόσβαση.
        </p>
        <Link href="/dashboard" className="text-blue-600 underline text-sm">Επιστροφή στον πίνακα</Link>
      </div>
    );
  }
  return <>{children}</>;
}



'use client';

import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function OnlinePaymentsSuccessPage() {
  const params = useSearchParams();
  const sessionId = params.get('session_id');

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Η πληρωμή ξεκίνησε/ολοκληρώθηκε
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Η κατάσταση της οφειλής ενημερώνεται από το Stripe webhook. Αν δεν δείτε άμεσα “Πληρώθηκε”,
            ανανεώστε τη σελίδα σε λίγα δευτερόλεπτα.
          </p>
          {sessionId ? (
            <p className="text-xs text-muted-foreground">Session: {sessionId}</p>
          ) : null}
          <Link href="/online-payments">
            <Button>Επιστροφή στις Online Πληρωμές</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

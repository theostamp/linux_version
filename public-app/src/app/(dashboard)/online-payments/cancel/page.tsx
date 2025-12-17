'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OnlinePaymentsCancelPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            Η πληρωμή ακυρώθηκε
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Δεν έγινε χρέωση. Μπορείτε να δοκιμάσετε ξανά από τη λίστα οφειλών.
          </p>
          <Link href="/online-payments">
            <Button variant="outline">Επιστροφή</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}



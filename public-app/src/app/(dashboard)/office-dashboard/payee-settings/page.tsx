'use client';

import { useEffect, useState } from 'react';
import AuthGate from '@/components/AuthGate';
import { apiGet, apiPut } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type PayeeSettings = {
  id: string;
  mode: 'two_iban' | 'one_iban';
  client_funds_iban?: string | null;
  office_fees_iban?: string | null;
  provider: 'stripe';
  updated_at: string;
};

async function fetchPayeeSettings(): Promise<PayeeSettings> {
  return apiGet<PayeeSettings>('/online-payments/settings/payee/');
}

export default function PayeeSettingsPage() {
  const [data, setData] = useState<PayeeSettings | null>(null);
  const [clientIban, setClientIban] = useState('');
  const [officeIban, setOfficeIban] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPayeeSettings().then((d) => {
      setData(d);
      setClientIban(d.client_funds_iban || '');
      setOfficeIban(d.office_fees_iban || '');
    });
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await apiPut<PayeeSettings>('/online-payments/settings/payee/', {
        mode: 'two_iban',
        client_funds_iban: clientIban,
        office_fees_iban: officeIban,
        provider: 'stripe',
      });
      setData(updated);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthGate role="any">
      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Two‑IBAN Ρυθμίσεις (Online Payments)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              MVP: τα IBANs χρησιμοποιούνται για λογιστική κατηγοριοποίηση (reconciliation/exports), όχι για split payout.
            </div>

            <div className="space-y-2">
              <Label>IBAN “Client Funds” (operational + reserve)</Label>
              <Input value={clientIban} onChange={(e) => setClientIban(e.target.value)} placeholder="GR…" />
            </div>

            <div className="space-y-2">
              <Label>IBAN “Office Fees” (fee)</Label>
              <Input value={officeIban} onChange={(e) => setOfficeIban(e.target.value)} placeholder="GR…" />
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={save} disabled={saving}>
                {saving ? 'Αποθήκευση…' : 'Αποθήκευση'}
              </Button>
              <div className="text-xs text-muted-foreground">
                Τελευταία ενημέρωση: {data?.updated_at ? new Date(data.updated_at).toLocaleString('el-GR') : '—'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthGate>
  );
}

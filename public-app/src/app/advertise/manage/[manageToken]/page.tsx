'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type PlacementCode = 'ticker' | 'banner' | 'interstitial';

type ManageResponse = {
  contract_id: number;
  tenant_schema: string;
  building_id: number;
  placement_code: PlacementCode;
  monthly_price_eur: string;
  status: string;
  trial_ends_at: string | null;
  active_until: string | null;
  creative: {
    id: number;
    status: string;
    headline: string;
    body: string;
    ticker_text: string;
    image_url: string;
    cta_url: string;
    updated_at: string;
  } | null;
};

function formatEur(value: string) {
  const n = Number(value);
  if (Number.isFinite(n)) return new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR' }).format(n);
  return `${value}€`;
}

function daysLeft(iso: string | null) {
  if (!iso) return null;
  const end = new Date(iso).getTime();
  const now = Date.now();
  const diff = end - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function AdvertiseManagePage() {
  const params = useParams<{ manageToken?: string | string[] }>();
  const manageToken = useMemo(() => {
    const raw = params?.manageToken;
    if (Array.isArray(raw)) return raw[0] || '';
    return raw || '';
  }, [params]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ManageResponse | null>(null);

  const [headline, setHeadline] = useState('');
  const [body, setBody] = useState('');
  const [tickerText, setTickerText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [isStartingCheckout, setIsStartingCheckout] = useState<'subscription' | 'manual' | null>(null);

  useEffect(() => {
    if (!manageToken) return;
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/ad-portal/manage/${manageToken}/`, {
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || `HTTP ${res.status}`);
        }
        const json = (await res.json()) as ManageResponse;
        if (!mounted) return;
        setData(json);

        setHeadline(json.creative?.headline ?? '');
        setBody(json.creative?.body ?? '');
        setTickerText(json.creative?.ticker_text ?? '');
        setImageUrl(json.creative?.image_url ?? '');
        setCtaUrl(json.creative?.cta_url ?? '');
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : 'Σφάλμα φόρτωσης');
      } finally {
        if (!mounted) return;
        setIsLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [manageToken]);

  const saveCreative = async () => {
    if (!manageToken) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/ad-portal/manage/${manageToken}/creative/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline,
          body,
          ticker_text: tickerText,
          image_url: imageUrl,
          cta_url: ctaUrl,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as ManageResponse;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Αποτυχία αποθήκευσης');
    } finally {
      setIsSaving(false);
    }
  };

  const startCheckout = async (mode: 'subscription' | 'manual') => {
    if (!manageToken) return;
    setIsStartingCheckout(mode);
    setError(null);
    try {
      const res = await fetch(`/api/ad-portal/manage/${manageToken}/checkout/${mode}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as { checkout_url?: string };
      if (json?.checkout_url) {
        window.location.href = json.checkout_url;
        return;
      }
      throw new Error('No checkout URL received');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Αποτυχία checkout');
    } finally {
      setIsStartingCheckout(null);
    }
  };

  const dLeft = data?.trial_ends_at ? daysLeft(data.trial_ends_at) : null;
  const isTrial = data?.status === 'trial_active';
  const isExpired = data?.status === 'trial_expired';

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Ad Portal</h1>
        <p className="text-sm text-muted-foreground">
          Διαχείριση δημιουργικού και ανανέωση μετά το trial.
        </p>
      </div>

      {isLoading ? (
        <Card>
          <CardHeader>
            <CardTitle>Φόρτωση…</CardTitle>
          </CardHeader>
        </Card>
      ) : error ? (
        <Card>
          <CardHeader>
            <CardTitle>Σφάλμα</CardTitle>
            <CardDescription className="break-all">{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : !data ? (
        <Card>
          <CardHeader>
            <CardTitle>Δεν βρέθηκαν δεδομένα</CardTitle>
          </CardHeader>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                Placement: <span className="font-semibold">{data.placement_code}</span>
              </CardTitle>
              <CardDescription>
                Κτίριο #{data.building_id} • {formatEur(data.monthly_price_eur)}/μήνα • Status: {data.status}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {isTrial ? (
                <div className="text-muted-foreground">
                  Trial λήγει σε <span className="font-medium">{dLeft ?? '—'}</span> ημέρες.
                </div>
              ) : null}
              {isExpired ? (
                <div className="text-red-600">
                  Το trial έληξε. Για να συνεχίσει η προβολή, ολοκληρώστε πληρωμή.
                </div>
              ) : null}
              {data.active_until ? (
                <div className="text-muted-foreground">
                  Ενεργό έως: <span className="font-medium">{new Date(data.active_until).toLocaleString('el-GR')}</span>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Δημιουργικό</CardTitle>
              <CardDescription>Αλλάξτε κείμενα/εικόνα/CTA. Με την αποθήκευση περνάει σε “pending”.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Τίτλος (headline)</Label>
                <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Π.χ. -20% σε καφέ" />
              </div>
              <div className="space-y-2">
                <Label>Κείμενο (body)</Label>
                <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Σύντομη περιγραφή..." />
              </div>
              <div className="space-y-2">
                <Label>Κείμενο ticker</Label>
                <Input value={tickerText} onChange={(e) => setTickerText(e.target.value)} placeholder="Σύντομο (ιδανικά < 80 χαρακ.)" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Image URL (προαιρετικό)</Label>
                  <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label>CTA URL (προαιρετικό)</Label>
                  <Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://..." />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  Creative status: <span className="font-medium">{data.creative?.status ?? '—'}</span>
                </div>
                <Button onClick={saveCreative} disabled={isSaving}>
                  {isSaving ? 'Αποθήκευση…' : 'Αποθήκευση'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Συνέχεια μετά το trial</CardTitle>
              <CardDescription>
                Επιλέξτε **αυτόματη συνδρομή** (προτεινόμενο) ή **χειροκίνητη μηνιαία ανανέωση**.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row gap-3">
              <Button
                className="w-full"
                onClick={() => startCheckout('subscription')}
                disabled={isStartingCheckout !== null}
              >
                {isStartingCheckout === 'subscription' ? 'Μετάβαση…' : 'Αυτόματη συνδρομή'}
              </Button>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => startCheckout('manual')}
                disabled={isStartingCheckout !== null}
              >
                {isStartingCheckout === 'manual' ? 'Μετάβαση…' : 'Χειροκίνητη ανανέωση'}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}



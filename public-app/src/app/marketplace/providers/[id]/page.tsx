'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BadgeCheck, ChevronLeft, Mail, MapPin, Phone, Star } from 'lucide-react';

import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';
import { Button } from '@/components/ui/button';
import { apiPost } from '@/lib/api';
import { useMarketplaceProvider } from '@/hooks/useMarketplaceProviders';
import { useActiveBuildingId } from '@/hooks/useActiveBuildingId';

export default function MarketplaceProviderPage({ params }: { params: { id: string } }) {
  return (
    <AuthGate role="any">
      <SubscriptionGate requiredStatus="any">
        <MarketplaceProviderContent id={params.id} />
      </SubscriptionGate>
    </AuthGate>
  );
}

function MarketplaceProviderContent({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeBuildingId = useActiveBuildingId();

  const buildingId = useMemo(() => {
    const raw = searchParams.get('building_id') || searchParams.get('building');
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : activeBuildingId;
  }, [searchParams, activeBuildingId]);

  const returnTo = searchParams.get('return_to');
  const projectId = searchParams.get('project_id');
  const { data: provider, isLoading } = useMarketplaceProvider(id, buildingId);
  const [isRequestingOffer, setIsRequestingOffer] = useState(false);
  const [requestOfferError, setRequestOfferError] = useState<string | null>(null);
  const [requestOfferSuccessUrl, setRequestOfferSuccessUrl] = useState<string | null>(null);

  const backHref = returnTo || `/marketplace?building_id=${buildingId}`;

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="rounded-3xl border border-gray-200 bg-white p-10 text-text-secondary">Φόρτωση…</div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-4">
        <Button variant="ghost" className="text-text-primary hover:text-accent-primary hover:bg-bg-app-main" asChild>
          <Link href={backHref}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Πίσω
          </Link>
        </Button>
        <div className="rounded-3xl border border-gray-200 bg-white p-10 text-text-secondary">
          Δεν βρέθηκε συνεργάτης.
        </div>
      </div>
    );
  }

  const rating = typeof provider.rating === 'string' ? parseFloat(provider.rating) : provider.rating;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <div className="sticky top-0 z-40 -mx-4 px-4 pt-4 pb-4 backdrop-blur-md bg-white/80 border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          className="text-text-primary hover:text-accent-primary hover:bg-bg-app-main"
          onClick={() => (returnTo ? router.push(returnTo) : router.back())}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Πίσω
        </Button>
        </div>
      </div>

      <div className="rounded-[2.5rem] border border-gray-200 bg-white overflow-hidden shadow-card-soft">
        <div className="p-8 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="page-title truncate">{provider.name}</h1>
                {provider.is_verified ? <BadgeCheck className="w-6 h-6 text-accent-primary" /> : null}
              </div>
              <div className="text-text-secondary mt-1">{provider.service_type_display || provider.service_type}</div>

              {typeof provider.distance_km === 'number' ? (
                <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-bg-app-main px-3 py-2 text-sm text-text-secondary">
                  <MapPin className="w-4 h-4" />
                  Απόσταση: <span className="font-semibold">{provider.distance_km} km</span>
                </div>
              ) : null}
            </div>

            <div className="shrink-0 flex items-center gap-1 rounded-2xl bg-bg-app-main px-3 py-2">
              <Star className="w-5 h-5 text-amber-300 fill-amber-300" />
              <span className="text-lg font-extrabold text-text-primary">{Number.isFinite(rating) ? rating.toFixed(1) : '—'}</span>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Button variant="secondary" className="rounded-2xl" asChild>
              <a href={provider.phone ? `tel:${provider.phone}` : '#'} onClick={(e) => { if (!provider.phone) e.preventDefault(); }}>
                <Phone className="w-4 h-4 mr-2" />
                Κλήση
              </a>
            </Button>
            <Button variant="secondary" className="rounded-2xl" asChild>
              <a href={provider.email ? `mailto:${provider.email}` : '#'} onClick={(e) => { if (!provider.email) e.preventDefault(); }}>
                <Mail className="w-4 h-4 mr-2" />
                Email
              </a>
            </Button>
          </div>

          {projectId ? (
            <div className="space-y-3">
              <Button
                className="w-full rounded-2xl"
                onClick={() => {
                  const qs = new URLSearchParams();
                  qs.set('project', projectId);
                  qs.set('contractor_name', provider.name);
                  if (provider.phone) qs.set('contractor_phone', provider.phone);
                  if (provider.email) qs.set('contractor_email', provider.email);
                  if (provider.address) qs.set('contractor_address', provider.address);
                  qs.set('marketplace_provider_id', provider.id);
                  router.push(`/projects/offers/new?${qs.toString()}`);
                }}
              >
                Χρήση στοιχείων στην προσφορά (χειροκίνητα)
              </Button>

              <Button
                variant="secondary"
                className="w-full rounded-2xl border border-accent-primary/20 bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/15"
                disabled={isRequestingOffer || !provider.email}
                onClick={async () => {
                  try {
                    setIsRequestingOffer(true);
                    setRequestOfferError(null);
                    setRequestOfferSuccessUrl(null);

                    const res = await apiPost<{ provider_form_url?: string }>(`/marketplace/offer-requests/`, {
                      provider_id: provider.id,
                      project_id: projectId,
                    });

                    setRequestOfferSuccessUrl(res.provider_form_url || null);
                  } catch (e: unknown) {
                    setRequestOfferError(
                      (e as { message?: string })?.message || 'Αποτυχία αποστολής αιτήματος προσφοράς.',
                    );
                  } finally {
                    setIsRequestingOffer(false);
                  }
                }}
              >
                {isRequestingOffer ? 'Αποστολή…' : 'Ζήτα επίσημη προσφορά (email)'}
              </Button>

              {requestOfferError ? (
                <div className="text-sm text-rose-700 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                  {requestOfferError}
                </div>
              ) : null}

              {requestOfferSuccessUrl ? (
                <div className="text-sm text-accent-primary rounded-2xl border border-accent-primary/20 bg-accent-primary/10 p-4">
                  Στάλθηκε email στον συνεργάτη. Θα υποβάλει την προσφορά του από το link.
                  <div className="mt-2 text-xs text-text-secondary break-all">
                    Link (debug): {requestOfferSuccessUrl}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {provider.website ? (
            <div className="text-sm text-text-secondary">
              Website:{' '}
              <a className="underline underline-offset-4" href={provider.website} target="_blank" rel="noreferrer">
                {provider.website}
              </a>
            </div>
          ) : null}

          {provider.address ? (
            <div className="text-sm text-text-secondary">
              Διεύθυνση: <span className="text-text-primary">{provider.address}</span>
            </div>
          ) : null}

          <div className="space-y-3">
            <h2 className="text-lg font-extrabold">Περιγραφή</h2>
            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
              {provider.detailed_description || provider.short_description || '—'}
            </p>
          </div>

          {(provider.special_offers || provider.coupon_code) ? (
            <div className="rounded-3xl border border-accent-primary/20 bg-accent-primary/10 p-5">
              <div className="font-extrabold text-accent-primary">Προσφορές / Εκπτώσεις</div>
              <div className="mt-2 text-sm text-text-secondary whitespace-pre-line">
                {provider.special_offers || provider.coupon_description || '—'}
              </div>
              {provider.coupon_code ? (
                <div className="mt-3 inline-block font-mono text-text-primary bg-white border border-gray-200 px-3 py-2 rounded-2xl">
                  {provider.coupon_code}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

'use client';

export const dynamic = 'force-dynamic';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BadgeCheck, ChevronRight, Mail, MapPin, Phone, Search, Star } from 'lucide-react';

import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useActiveBuildingId } from '@/hooks/useActiveBuildingId';
import { useProject } from '@/hooks/useProjects';
import { useMarketplaceProviders } from '@/hooks/useMarketplaceProviders';

const SERVICE_TYPES: Array<{ value: string; label: string }> = [
  { value: 'repair', label: 'Επισκευές' },
  { value: 'cleaning', label: 'Καθαριότητα' },
  { value: 'security', label: 'Ασφάλεια' },
  { value: 'electrical', label: 'Ηλεκτρολογικά' },
  { value: 'plumbing', label: 'Υδραυλικά' },
  { value: 'heating', label: 'Θέρμανση/Κλιματισμός' },
  { value: 'elevator', label: 'Ανελκυστήρες' },
  { value: 'landscaping', label: 'Κηπουρική' },
  { value: 'painting', label: 'Βαψίματα' },
  { value: 'technical', label: 'Τεχνικές Υπηρεσίες' },
  { value: 'maintenance', label: 'Συντήρηση' },
  { value: 'emergency', label: 'Επείγοντα' },
  { value: 'other', label: 'Άλλο' },
];

function MarketplaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeBuildingId = useActiveBuildingId();

  const buildingId = useMemo(() => {
    const raw = searchParams.get('building_id') || searchParams.get('building');
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : activeBuildingId;
  }, [searchParams, activeBuildingId]);

  const projectId = searchParams.get('project_id');
  const returnTo = searchParams.get('return_to');

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [serviceType, setServiceType] = useState(searchParams.get('service_type') || '');
  const [distanceEnabled, setDistanceEnabled] = useState<boolean>(() => {
    // Default: enabled (gives immediate "nearby first" + practical filtering)
    return true;
  });
  const [distanceKm, setDistanceKm] = useState<number>(() => {
    const raw = searchParams.get('max_distance_km');
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : 30;
  });

  const { data: project } = useProject(projectId);

  const { providers, isLoading } = useMarketplaceProviders({
    buildingId,
    search: search || undefined,
    serviceType: serviceType || undefined,
    maxDistanceKm: distanceEnabled ? distanceKm : undefined,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-10">
      {/* Top actions */}
      <div className="sticky top-0 z-40 -mx-4 px-4 pt-4 pb-4 backdrop-blur-md bg-white/80 border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          {returnTo ? (
            <Button
              variant="ghost"
              className="text-text-primary hover:text-accent-primary hover:bg-bg-app-main"
              onClick={() => router.push(returnTo)}
            >
              Πίσω
            </Button>
          ) : (
            <span className="text-text-secondary">Marketplace</span>
          )}
        </div>
        <div className="text-xs text-text-secondary">
          Building ID: <span className="font-mono">{buildingId}</span>
        </div>
        </div>
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-[2.5rem] border border-accent-primary/20 bg-gradient-to-br from-accent-primary/10 via-white to-white p-10 md:p-14 shadow-card-soft">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent-primary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-secondary/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-md border border-accent-primary/20 text-accent-primary text-sm font-bold">
            <BadgeCheck className="w-4 h-4" />
            ΠΙΣΤΟΠΟΙΗΜΕΝΟΙ ΣΥΝΕΡΓΑΤΕΣ
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-[1.1] text-text-primary">
              Βρείτε επαγγελματίες κοντά στο κτίριό σας.
            </h1>
            <p className="text-text-secondary text-base md:text-lg font-medium leading-relaxed">
              Προτεραιότητα εμφανίζονται όσοι ταιριάζουν χωρικά (geolocation). Μπορείτε να φιλτράρετε ανά κατηγορία και απόσταση.
            </p>
          </div>

          {project ? (
            <div className="rounded-2xl bg-white/80 border border-gray-200 p-4 text-sm text-text-secondary">
              <div className="font-bold">Για το έργο:</div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="font-semibold">{project.title}</span>
                <span className="opacity-70">•</span>
                <span className="opacity-90">Προτεραιότητα: {project.priority ?? '—'}</span>
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-2 relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-text-secondary group-focus-within:text-accent-primary transition-colors" />
              </div>
              <Input
                placeholder="Αναζήτηση (π.χ. υδραυλικός, εταιρεία)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 h-12 rounded-2xl border border-gray-200 bg-white text-text-primary placeholder:text-text-secondary font-medium focus-visible:ring-2 focus-visible:ring-accent-primary/20 focus-visible:border-accent-primary shadow-sm"
              />
            </div>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="h-12 rounded-2xl bg-white text-text-primary font-medium px-4 border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary"
            >
              <option value="">Όλες οι κατηγορίες</option>
              {SERVICE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-text-secondary">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span className="font-semibold">Απόσταση</span>
                <span className="opacity-80">
                  {distanceEnabled ? `έως ${distanceKm} km` : 'χωρίς όριο'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs opacity-90">Φίλτρο</span>
                <Switch checked={distanceEnabled} onCheckedChange={setDistanceEnabled} />
              </div>
            </div>

            <div className={cn('rounded-2xl bg-bg-app-main border border-gray-200 px-4 py-3', !distanceEnabled && 'opacity-60')}>
              <input
                type="range"
                min={5}
                max={100}
                step={5}
                value={distanceKm}
                onChange={(e) => setDistanceKm(Number(e.target.value))}
                disabled={!distanceEnabled}
                className="w-full accent-accent-primary"
              />
              <div className="mt-2 flex items-center justify-between text-xs text-text-secondary">
                <span>5 km</span>
                <span>50 km</span>
                <span>100 km</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl md:text-2xl font-black tracking-tight text-text-primary">Διαθέσιμοι επαγγελματίες</h2>
          <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">
            {isLoading ? 'ΦΟΡΤΩΣΗ…' : `${providers.length} ΑΠΟΤΕΛΕΣΜΑΤΑ`}
          </span>
        </div>

        {isLoading ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-10 text-text-secondary">
            Φόρτωση Marketplace…
          </div>
        ) : providers.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-14 text-center text-text-secondary">
            Δεν βρέθηκαν συνεργάτες με αυτά τα φίλτρα.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {providers.map((p) => {
              const rating = typeof p.rating === 'string' ? parseFloat(p.rating) : p.rating;
              return (
                <div
                  key={p.id}
                  className={cn(
                    'rounded-3xl border border-gray-200 bg-white overflow-hidden shadow-card-soft transition hover:-translate-y-0.5 hover:shadow-lg hover:border-accent-primary/30',
                    p.is_featured && 'ring-2 ring-accent-primary/30',
                  )}
                >
                  <div className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-extrabold truncate">{p.name}</h3>
                          {p.is_verified ? (
                            <BadgeCheck className="w-5 h-5 text-accent-primary" />
                          ) : null}
                        </div>
                        <div className="text-sm text-text-secondary">{p.service_type_display || p.service_type}</div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1 rounded-xl bg-bg-app-main px-2 py-1 text-sm">
                        <Star className="w-4 h-4 text-amber-300 fill-amber-300" />
                        <span className="font-bold text-text-primary">{Number.isFinite(rating) ? rating.toFixed(1) : '—'}</span>
                      </div>
                    </div>

                    {typeof p.distance_km === 'number' ? (
                      <div className="text-sm text-text-secondary">
                        Απόσταση: <span className="font-semibold">{p.distance_km} km</span>
                      </div>
                    ) : null}

                    <p className="text-sm text-text-secondary line-clamp-3">
                      {p.short_description || p.detailed_description || '—'}
                    </p>

                    {(p.special_offers || p.coupon_code) ? (
                      <div className="rounded-2xl border border-accent-primary/20 bg-accent-primary/10 p-3 text-sm">
                        <div className="font-bold text-accent-primary">Προσφορά</div>
                        <div className="text-text-secondary mt-1">
                          {p.special_offers || p.coupon_description || '—'}
                        </div>
                        {p.coupon_code ? (
                          <div className="mt-2 font-mono text-text-primary bg-white inline-block px-2 py-1 rounded-lg border border-gray-200">
                            {p.coupon_code}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="secondary" className="rounded-xl" asChild>
                        <a href={p.phone ? `tel:${p.phone}` : '#'} onClick={(e) => { if (!p.phone) e.preventDefault(); }}>
                          <Phone className="w-4 h-4 mr-2" />
                          Κλήση
                        </a>
                      </Button>
                      <Button variant="secondary" className="rounded-xl" asChild>
                        <a href={p.email ? `mailto:${p.email}` : '#'} onClick={(e) => { if (!p.email) e.preventDefault(); }}>
                          <Mail className="w-4 h-4 mr-2" />
                          Email
                        </a>
                      </Button>
                    </div>

                    {projectId ? (
                      <Button
                        className="w-full rounded-xl"
                        onClick={() => {
                          const qs = new URLSearchParams();
                          qs.set('project', projectId);
                          qs.set('contractor_name', p.name);
                          if (p.phone) qs.set('contractor_phone', p.phone);
                          if (p.email) qs.set('contractor_email', p.email);
                          if (p.address) qs.set('contractor_address', p.address);
                          qs.set('marketplace_provider_id', p.id);
                          router.push(`/projects/offers/new?${qs.toString()}`);
                        }}
                      >
                        Επιλογή για προσφορά
                      </Button>
                    ) : null}
                  </div>

                  <Link
                    href={{
                      pathname: `/marketplace/providers/${p.id}`,
                      query: {
                        building_id: String(buildingId),
                        project_id: projectId || undefined,
                        return_to: returnTo || undefined,
                      },
                    }}
                    className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-bg-app-main hover:bg-white transition"
                  >
                    <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">Λεπτομέρειες</span>
                    <ChevronRight className="w-4 h-4 text-text-secondary" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <AuthGate role="any">
      <SubscriptionGate requiredStatus="any">
        <MarketplaceContent />
      </SubscriptionGate>
    </AuthGate>
  );
}

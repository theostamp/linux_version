'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';

type PlacementCode = 'ticker' | 'banner' | 'interstitial';

type Competitor = {
  place_id: string;
  name: string;
  distance_m: number | null;
};

type LandingPackage = {
  code: PlacementCode;
  display_name: string;
  description: string;
  monthly_price_eur: string;
  max_slots_per_building: number;
  active_slots: number;
  remaining_slots: number;
  is_available: boolean;
};

type LandingResponse = {
  token: string;
  tenant_schema: string;
  building_id: number;
  token_valid: boolean;
  token_expires_at: string | null;
  building: {
    id: number;
    name: string;
    address: string;
    city: string;
    postal_code: string;
    latitude?: number | null;
    longitude?: number | null;
  };
  packages: LandingPackage[];
};

type StartTrialResponse = {
  contract_id: number;
  manage_token: string;
  status: string;
  trial_ends_at: string | null;
};

function formatEur(value: string) {
  const n = Number(value);
  if (Number.isFinite(n)) return new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR' }).format(n);
  return `${value}€`;
}

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sin1 = Math.sin(dLat / 2);
  const sin2 = Math.sin(dLng / 2);
  const x = sin1 * sin1 + Math.cos(lat1) * Math.cos(lat2) * sin2 * sin2;
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return Math.round(R * c);
}

export default function AdvertiseLandingPage() {
  const params = useParams<{ token?: string | string[] }>();
  const token = useMemo(() => {
    const raw = params?.token;
    if (Array.isArray(raw)) return raw[0] || '';
    return raw || '';
  }, [params]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [landing, setLanding] = useState<LandingResponse | null>(null);

  const packages = landing?.packages ?? [];
  const [selectedPlacement, setSelectedPlacement] = useState<PlacementCode>('ticker');

  // Lead data
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [placeId, setPlaceId] = useState('');
  const [category, setCategory] = useState('');
  const [consentTerms, setConsentTerms] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);

  // Creative
  const [tickerText, setTickerText] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');

  const [isStarting, setIsStarting] = useState(false);
  const [startResult, setStartResult] = useState<StartTrialResponse | null>(null);

  // Maps
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const buildingMarkerRef = useRef<google.maps.Marker | null>(null);
  const businessMarkerRef = useRef<google.maps.Marker | null>(null);
  const competitorMarkersRef = useRef<google.maps.Marker[]>([]);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);

  const businessInputRef = useRef<HTMLInputElement | null>(null);
  const businessAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [competitorCount, setCompetitorCount] = useState<number>(0);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const selectedPackage = useMemo(
    () => packages.find((p) => p.code === selectedPlacement) || null,
    [packages, selectedPlacement]
  );

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      setLanding(null);
      setStartResult(null);
      try {
        const res = await fetch(`/api/ad-portal/landing/${token}/`, {
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || `HTTP ${res.status}`);
        }
        const json = (await res.json()) as LandingResponse;
        if (!mounted) return;
        setLanding(json);

        // Default selected placement: first available package, else ticker.
        const firstAvail = (json.packages || []).find((p) => p.is_available);
        if (firstAvail) setSelectedPlacement(firstAvail.code);
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
  }, [token]);

  // Initialize Map when landing loaded and Google Maps exists
  useEffect(() => {
    if (!landing) return;
    if (!mapDivRef.current) return;
    if (typeof window === 'undefined' || !window.google?.maps) return;

    const lat = landing.building.latitude ?? null;
    const lng = landing.building.longitude ?? null;
    const hasCoords = typeof lat === 'number' && typeof lng === 'number';
    const center = hasCoords ? { lat, lng } : { lat: 37.9838, lng: 23.7275 };

    if (!mapRef.current) {
      mapRef.current = new window.google.maps.Map(mapDivRef.current, {
        center,
        zoom: hasCoords ? 17 : 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      placesServiceRef.current = new window.google.maps.places.PlacesService(mapRef.current);
    } else {
      mapRef.current.setCenter(center);
      mapRef.current.setZoom(hasCoords ? 17 : 12);
    }

    // Building marker + 300m circle
    if (hasCoords && mapRef.current) {
      const pos = new window.google.maps.LatLng(lat, lng);
      if (!buildingMarkerRef.current) {
        buildingMarkerRef.current = new window.google.maps.Marker({
          map: mapRef.current,
          position: pos,
          title: landing.building.name,
        });
      } else {
        buildingMarkerRef.current.setPosition(pos);
      }

      if (!circleRef.current) {
        circleRef.current = new window.google.maps.Circle({
          map: mapRef.current,
          center: pos,
          radius: 300,
          strokeOpacity: 0.4,
          strokeWeight: 1,
          fillOpacity: 0.08,
        });
      } else {
        circleRef.current.setCenter(pos);
        circleRef.current.setRadius(300);
      }
    }
  }, [landing]);

  // Init business autocomplete
  useEffect(() => {
    if (!landing) return;
    if (typeof window === 'undefined' || !window.google?.maps?.places) return;
    const input = businessInputRef.current;
    if (!input) return;
    if (businessAutocompleteRef.current) return;

    const ac = new window.google.maps.places.Autocomplete(input, {
      types: ['establishment'],
      componentRestrictions: { country: 'gr' },
    });
    // @ts-expect-error setFields is still supported on v3
    ac.setFields?.(['place_id', 'name', 'types', 'geometry']);
    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      const pid = place.place_id || '';
      const name = place.name || '';
      const types = Array.isArray(place.types) ? place.types : [];
      const cat =
        types.find((t) => t !== 'point_of_interest' && t !== 'establishment') ||
        types[0] ||
        '';
      const loc = place.geometry?.location;

      setPlaceId(pid);
      setBusinessName(name);
      setCategory(cat);

      if (name && !tickerText) {
        setTickerText(`${name} — κοντά σας`);
      }

      // Marker on map
      if (mapRef.current && loc) {
        if (!businessMarkerRef.current) {
          businessMarkerRef.current = new window.google.maps.Marker({
            map: mapRef.current,
            position: loc,
            title: name,
          });
        } else {
          businessMarkerRef.current.setPosition(loc);
        }
      }

      // Find competitors around the building within 300m (simple heuristic)
      try {
        const bLat = landing.building.latitude ?? null;
        const bLng = landing.building.longitude ?? null;
        if (typeof bLat !== 'number' || typeof bLng !== 'number') return;
        if (!placesServiceRef.current) return;

        competitorMarkersRef.current.forEach((m) => m.setMap(null));
        competitorMarkersRef.current = [];
        setCompetitorCount(0);
        setCompetitors([]);

        const location = new window.google.maps.LatLng(bLat, bLng);
        const keyword = cat || name;
        placesServiceRef.current.nearbySearch(
          {
            location,
            radius: 300,
            keyword,
          },
          (results, status) => {
            if (status !== window.google.maps.places.PlacesServiceStatus.OK || !results) return;
            const filtered = results.filter((r) => r.place_id && r.place_id !== pid).slice(0, 12);
            setCompetitorCount(filtered.length);
            try {
              const origin = { lat: bLat, lng: bLng };
              const list: Competitor[] = filtered.map((r) => {
                const loc2 = r.geometry?.location;
                const pos = loc2 ? { lat: loc2.lat(), lng: loc2.lng() } : null;
                return {
                  place_id: String(r.place_id || ''),
                  name: String(r.name || 'Ανταγωνιστής'),
                  distance_m: pos ? haversineMeters(origin, pos) : null,
                };
              });
              list.sort((a, b) => (a.distance_m ?? 1e9) - (b.distance_m ?? 1e9));
              setCompetitors(list);
            } catch {
              // ignore
            }
            if (!mapRef.current) return;
            filtered.forEach((r) => {
              if (!r.geometry?.location) return;
              const marker = new window.google.maps.Marker({
                map: mapRef.current!,
                position: r.geometry.location,
                title: r.name || 'Ανταγωνιστής',
                icon: {
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 5,
                  fillColor: '#ef4444',
                  fillOpacity: 0.9,
                  strokeColor: '#991b1b',
                  strokeOpacity: 0.9,
                  strokeWeight: 1,
                },
              });
              competitorMarkersRef.current.push(marker);
            });
          }
        );
      } catch {
        // ignore competitor errors
      }
    });

    businessAutocompleteRef.current = ac;

    return () => {
      try {
        if (businessAutocompleteRef.current) {
          window.google?.maps?.event?.clearInstanceListeners?.(businessAutocompleteRef.current);
        }
      } catch {
        // ignore
      }
      businessAutocompleteRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landing]);

  const handleCopyManageLink = async () => {
    if (!startResult) return;
    const url = `${window.location.origin}/advertise/manage/${startResult.manage_token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      setCopyState('failed');
      setTimeout(() => setCopyState('idle'), 2000);
    }
  };

  const startTrial = async () => {
    if (!landing) return;
    if (!selectedPackage?.is_available) {
      setError('Δεν υπάρχουν διαθέσιμες θέσεις για αυτό το πακέτο.');
      return;
    }
    if (!email || !businessName) {
      setError('Συμπληρώστε email και όνομα επιχείρησης.');
      return;
    }
    if (!consentTerms) {
      setError('Πρέπει να αποδεχτείτε τους όρους.');
      return;
    }

    setIsStarting(true);
    setError(null);
    try {
      const res = await fetch('/api/ad-portal/trial/start/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: landing.token,
          placement_code: selectedPlacement,
          email,
          business_name: businessName,
          place_id: placeId,
          category,
          consent_terms: consentTerms,
          consent_marketing: consentMarketing,
          ticker_text: tickerText,
          cta_url: ctaUrl,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as StartTrialResponse;
      setStartResult(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Αποτυχία εκκίνησης trial');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Διαφήμιση στο InfoPoint</h1>
        <p className="text-sm text-muted-foreground">
          1 μήνας δωρεάν δοκιμή (χωρίς κάρτα). Μετά επιλέγετε αν θέλετε αυτόματη συνδρομή ή χειροκίνητη ανανέωση.
        </p>
        <div className="text-xs text-muted-foreground">
          Βήματα: <span className="font-medium">1)</span> Βρες το μαγαζί σου <span className="font-medium">2)</span> Διάλεξε θέση <span className="font-medium">3)</span> Ξεκίνα δωρεάν
        </div>
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
      ) : !landing ? (
        <Card>
          <CardHeader>
            <CardTitle>Δεν βρέθηκαν δεδομένα</CardTitle>
          </CardHeader>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{landing.building.name}</CardTitle>
              <CardDescription>
                {landing.building.address}, {landing.building.city} {landing.building.postal_code}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>1) Βρες το μαγαζί σου (Google)</Label>
                  <Input ref={businessInputRef} placeholder="Πληκτρολόγησε και διάλεξε από τη λίστα (π.χ. καφέ, φούρνος…)" />
                  {placeId ? (
                    <p className="text-sm text-muted-foreground">
                      Επιλέχθηκε: <span className="font-medium">{businessName || '—'}</span>
                      {category ? <span className="text-muted-foreground"> • {category}</span> : null}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Δείξε μας την επιχείρησή σου για να δεις τον ανταγωνισμό κοντά στο κτίριο.</p>
                  )}

                  {placeId && competitorCount > 0 ? (
                    <div className="rounded-md border p-3 bg-muted/20">
                      <div className="text-sm font-medium">
                        Βλέπεις <span className="font-semibold">{competitorCount}</span> ανταγωνιστές σε ακτίνα 300μ.
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Θες να κλειδώσεις εσύ το κτίριο; Διάλεξε θέση και ξεκίνα δωρεάν.
                      </div>
                      {competitors.length > 0 ? (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Ενδεικτικά:
                          <ul className="list-disc pl-4 mt-1 space-y-0.5">
                            {competitors.slice(0, 5).map((c) => (
                              <li key={c.place_id}>
                                {c.name}
                                {typeof c.distance_m === 'number' ? ` • ~${c.distance_m}m` : ''}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <div className="rounded-md border overflow-hidden">
                  <div ref={mapDivRef} className="h-[280px] w-full" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Διάλεξε θέση</CardTitle>
              <CardDescription>Η τιμή εξαρτάται από το placement (ticker, banner, whole page).</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {packages.map((p) => (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => setSelectedPlacement(p.code)}
                  disabled={!p.is_available}
                  className={[
                    'text-left rounded-md border p-4 transition',
                    selectedPlacement === p.code ? 'border-primary ring-1 ring-primary' : 'hover:border-muted-foreground/30',
                    !p.is_available ? 'opacity-50 cursor-not-allowed' : '',
                  ].join(' ')}
                >
                  <div className="font-medium">{p.display_name}</div>
                  <div className="text-sm text-muted-foreground">{p.description}</div>
                  <div className="mt-3 text-sm">
                    <span className="font-semibold">{formatEur(p.monthly_price_eur)}</span>
                    <span className="text-muted-foreground"> / μήνα</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Διαθεσιμότητα: {p.remaining_slots}/{p.max_slots_per_building}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3) Ξεκίνα δωρεάν</CardTitle>
              <CardDescription>
                Θα ενεργοποιηθεί trial 30 ημερών (χωρίς κάρτα). Πριν λήξει, θα σας ζητήσουμε πληρωμή για να συνεχίσει.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@business.gr" />
                </div>
                <div className="space-y-2">
                  <Label>Όνομα επιχείρησης</Label>
                  <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Επωνυμία" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Κείμενο ticker (προτείνεται σύντομο)</Label>
                <Textarea value={tickerText} onChange={(e) => setTickerText(e.target.value)} placeholder="Π.χ. -20% για κατοίκους" />
              </div>

              <div className="space-y-2">
                <Label>CTA link (προαιρετικό)</Label>
                <Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://..." />
              </div>

              <div className="flex items-start gap-2">
                <Checkbox id="terms" checked={consentTerms} onCheckedChange={(v) => setConsentTerms(Boolean(v))} />
                <Label htmlFor="terms" className="leading-5">
                  Αποδέχομαι τους όρους χρήσης και την πολιτική απορρήτου.
                </Label>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="mkt"
                  checked={consentMarketing}
                  onCheckedChange={(v) => setConsentMarketing(Boolean(v))}
                />
                <Label htmlFor="mkt" className="leading-5">
                  Θέλω να λαμβάνω ενημερώσεις/προσφορές (προαιρετικό).
                </Label>
              </div>

              <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                <div className="text-sm text-muted-foreground">
                  Επιλογή: <span className="font-medium">{selectedPackage?.display_name ?? selectedPlacement}</span>
                  {selectedPackage ? (
                    <>
                      {' '}
                      • <span className="font-medium">{formatEur(selectedPackage.monthly_price_eur)}</span>/μήνα μετά το trial
                    </>
                  ) : null}
                </div>
                <Button onClick={startTrial} disabled={isStarting}>
                  {isStarting ? 'Εκκίνηση…' : 'Έναρξη δωρεάν trial'}
                </Button>
              </div>

              {startResult ? (
                <div className="rounded-md border p-4 bg-muted/30">
                  <div className="font-medium">Έτοιμο!</div>
                  <div className="text-sm text-muted-foreground">
                    Trial έως:{' '}
                    {startResult.trial_ends_at
                      ? new Date(startResult.trial_ends_at).toLocaleString('el-GR')
                      : '—'}
                  </div>
                  <div className="mt-2 flex flex-col md:flex-row md:items-center gap-2 text-sm">
                    <div>
                      Διαχείριση:{' '}
                      <Link className="underline" href={`/advertise/manage/${startResult.manage_token}`}>
                        Άνοιγμα portal
                      </Link>
                    </div>
                    <Button type="button" variant="outline" onClick={handleCopyManageLink}>
                      {copyState === 'copied' ? 'Αντιγράφηκε' : copyState === 'failed' ? 'Αποτυχία αντιγραφής' : 'Αντιγραφή link'}
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}



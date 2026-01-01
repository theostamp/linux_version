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
import {
  Sparkles,
  Target,
  TrendingUp,
  CheckCircle2,
  MousePointerClick,
  Megaphone,
  Building2,
  MapPin,
  Zap,
  ShieldCheck,
  ChevronRight,
  Info,
  ArrowRight,
  Store,
  Map as MapIcon,
  Layout,
  Play,
  Search,
  Users,
  AlertTriangle,
  Check,
  Globe,
  Smartphone
} from 'lucide-react';

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
    latitude?: number | string | null;
    longitude?: number | string | null;
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

function parseCoord(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function KioskPreview({
  placement,
  text,
  businessName
}: {
  placement: PlacementCode;
  text: string;
  businessName: string
}) {
  return (
    <div className="relative mx-auto w-full max-w-[300px] aspect-[9/16] bg-slate-900 rounded-[2rem] border-[6px] border-slate-800 shadow-2xl overflow-hidden flex flex-col">
      {/* Kiosk Header */}
      <div className="bg-slate-800 p-4 flex items-center gap-2 border-b border-slate-700">
        <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center">
          <Building2 className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          <div className="h-2 w-16 bg-slate-600 rounded mb-1" />
          <div className="h-1.5 w-10 bg-slate-700 rounded" />
        </div>
        <div className="w-6 h-6 rounded-full bg-slate-700" />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-3 space-y-3 relative overflow-hidden">
        {/* Mock Widgets */}
        <div className="grid grid-cols-2 gap-2">
          <div className="h-16 bg-slate-800/50 rounded-lg border border-slate-700/50 p-2">
            <div className="h-2 w-8 bg-slate-600 rounded mb-2" />
            <div className="h-4 w-12 bg-primary/20 rounded" />
          </div>
          <div className="h-16 bg-slate-800/50 rounded-lg border border-slate-700/50 p-2">
            <div className="h-2 w-8 bg-slate-600 rounded mb-2" />
            <div className="h-4 w-12 bg-slate-600 rounded" />
          </div>
        </div>

        <div className="h-24 bg-slate-800/50 rounded-lg border border-slate-700/50 p-2">
          <div className="h-2 w-12 bg-slate-600 rounded mb-2" />
          <div className="space-y-1.5">
            <div className="h-1.5 w-full bg-slate-700 rounded" />
            <div className="h-1.5 w-4/5 bg-slate-700 rounded" />
            <div className="h-1.5 w-5/6 bg-slate-700 rounded" />
          </div>
        </div>

        {/* Banner Placeholder if selected */}
        {placement === 'banner' && (
          <div className="absolute inset-x-3 bottom-12 h-32 bg-primary/10 border-2 border-dashed border-primary/30 rounded-lg flex flex-col items-center justify-center p-4 animate-pulse">
            <Megaphone className="w-6 h-6 text-primary mb-2 opacity-50" />
            <div className="text-[10px] text-primary font-bold text-center uppercase tracking-wider">Your Banner Here</div>
            <div className="text-[8px] text-primary/70 mt-1">{businessName}</div>
          </div>
        )}

        {/* Interstitial Placeholder if selected */}
        {placement === 'interstitial' && (
          <div className="absolute inset-0 bg-slate-900/95 z-10 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <div className="text-sm font-bold text-white mb-2 uppercase tracking-widest">{businessName}</div>
            <div className="text-xs text-slate-300 line-clamp-3">{text || 'Η διαφήμισή σας σε πλήρη οθόνη...'}</div>
            <div className="mt-4 px-4 py-1.5 bg-primary rounded text-[10px] font-bold text-white">ΜΑΘΕΤΕ ΠΕΡΙΣΣΟΤΕΡΑ</div>
          </div>
        )}
      </div>

      {/* Ticker Section */}
      <div className="bg-slate-950 h-10 border-t border-slate-800 flex items-center overflow-hidden whitespace-nowrap px-4">
        {placement === 'ticker' ? (
          <div className="flex items-center gap-4 animate-marquee">
            <span className="text-primary font-bold text-[10px] uppercase tracking-tighter shrink-0 flex items-center gap-1">
              <Zap className="w-3 h-3 fill-primary" /> NEWS & OFFERS:
            </span>
            <span className="text-slate-100 text-xs font-medium">
              {text || 'Εδώ θα εμφανίζεται το κείμενο της διαφήμισής σας...'} — {businessName || 'Η Επιχείρησή σας'}
            </span>
            <span className="text-slate-500 text-xs opacity-50">•</span>
            <span className="text-slate-100 text-xs font-medium">
              {text || 'Εδώ θα εμφανίζεται το κείμενο της διαφήμισής σας...'}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 bg-slate-800 rounded" />
            <div className="h-1.5 w-24 bg-slate-800 rounded" />
          </div>
        )}
      </div>

      {/* Bottom Speaker/Detail */}
      <div className="h-8 bg-slate-900 flex items-center justify-center">
        <div className="w-12 h-1 bg-slate-800 rounded-full" />
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: flex;
          animation: marquee 15s linear infinite;
        }
      `}</style>
    </div>
  );
}

function LargeKioskShowcase({
  placement,
  text,
  businessName,
  radiusM
}: {
  placement: PlacementCode;
  text: string;
  businessName: string;
  radiusM: number;
}) {
  return (
    <div className="relative w-full py-24 px-4 overflow-hidden bg-slate-950 rounded-[4rem] border border-white/10 shadow-2xl my-16">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 blur-[150px] rounded-full" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/10 blur-[150px] rounded-full" />

      <div className="relative z-10 max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-4">

        {/* Left Side Info Points (25%) */}
        <div className="hidden lg:flex flex-col gap-12 w-[25%] relative">
          {/* Connecting Lines & Dots */}
          <div className="absolute top-[20%] -right-12 w-24 h-[1px] bg-gradient-to-r from-primary/40 to-transparent" />
          <div className="absolute top-[20%] -right-12 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] z-20" />

          <div className="absolute bottom-[20%] -right-8 w-16 h-[1px] bg-gradient-to-r from-green-400/40 to-transparent" />
          <div className="absolute bottom-[20%] -right-8 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] z-20" />

          <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 animate-float shadow-2xl transform hover:scale-105 transition-all duration-500 relative -left-12">
            <div className="flex items-center gap-3 mb-2 text-primary font-bold text-sm uppercase">
              <Zap className="w-5 h-5" /> 24/7 ΕΚΘΕΣΗ
            </div>
            <p className="text-slate-400 text-sm italic leading-relaxed">Το μήνυμά σας δεν σταματά ποτέ. Μόνιμη παρουσία στην είσοδο.</p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 animate-float-delayed shadow-2xl transform hover:scale-105 transition-all duration-500 relative -left-8">
            <div className="flex items-center gap-3 mb-2 text-green-400 font-bold text-sm uppercase">
              <TrendingUp className="w-5 h-5" /> SMART DATA
            </div>
            <p className="text-slate-400 text-sm italic leading-relaxed">Στατιστικά εμφανίσεων και engagement σε πραγματικό χρόνο.</p>
          </div>
        </div>

        {/* Center: The Kiosk Screen (50%) */}
        <div className="w-full lg:w-[50%] flex justify-center relative scale-90 lg:scale-110">
          <div className="relative group transition-transform duration-1000">
            <div className="absolute -inset-10 bg-primary/20 rounded-[4rem] blur-[100px] opacity-40 group-hover:opacity-60 transition-opacity" />
            <KioskPreview placement={placement} text={text} businessName={businessName} />

            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap px-6 py-2 bg-primary rounded-full text-[11px] font-black text-white uppercase tracking-widest shadow-2xl">
              InfoPoint Physical Screen (43")
            </div>
          </div>
        </div>

        {/* Right Side Info Points (25%) */}
        <div className="hidden lg:flex flex-col gap-12 w-[25%] relative">
          {/* Connecting Lines & Dots */}
          <div className="absolute top-[20%] -left-12 w-24 h-[1px] bg-gradient-to-l from-orange-400/40 to-transparent" />
          <div className="absolute top-[20%] -left-12 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] z-20" />

          <div className="absolute bottom-[20%] -left-8 w-16 h-[1px] bg-gradient-to-l from-blue-400/40 to-transparent" />
          <div className="absolute bottom-[20%] -left-8 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] z-20" />

          <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 animate-float shadow-2xl transform hover:scale-105 transition-all duration-500 relative -right-12">
            <div className="flex items-center gap-3 mb-2 text-orange-400 font-bold text-sm uppercase">
              <Target className="w-5 h-5" /> HYPER-LOCAL
            </div>
            <p className="text-slate-400 text-sm italic leading-relaxed">Στοχεύστε ακριβώς στη γειτονιά σας (ακτίνα {radiusM}μ).</p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 animate-float-delayed shadow-2xl transform hover:scale-105 transition-all duration-500 relative -right-8">
            <div className="flex items-center gap-3 mb-2 text-blue-400 font-bold text-sm uppercase">
              <Smartphone className="w-5 h-5" /> WEB SYNC
            </div>
            <p className="text-slate-400 text-sm italic leading-relaxed">Αυτόματη εμφάνιση και στα κινητά των ενοίκων.</p>
          </div>
        </div>

        {/* Mobile View Indicators (for small screens) */}
        <div className="grid grid-cols-2 gap-4 lg:hidden w-full mt-12">
           <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-center">
              <Zap className="w-5 h-5 text-primary mx-auto mb-2" />
              <div className="text-[10px] font-bold text-white uppercase">24/7 PROMO</div>
           </div>
           <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-center">
              <Target className="w-5 h-5 text-orange-400 mx-auto mb-2" />
              <div className="text-[10px] font-bold text-white uppercase">HYPER-LOCAL</div>
           </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float 6s ease-in-out infinite;
          animation-delay: 3s;
        }
      `}</style>
    </div>
  );
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
  const [radiusM, setRadiusM] = useState<number>(300);

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

  // Prefill from URL params (useful for outreach letters)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const qs = new URLSearchParams(window.location.search);
      const prefillName = (qs.get('utm_content') || qs.get('business_name') || '').trim();
      const prefillCategory = (qs.get('utm_term') || qs.get('category') || '').trim();
      const radiusRaw = (qs.get('radius_m') || '').trim();
      const r = radiusRaw ? Number(radiusRaw) : NaN;
      if (Number.isFinite(r)) {
        setRadiusM(Math.max(100, Math.min(2000, Math.round(r))));
      }
      if (prefillName && !businessName) setBusinessName(prefillName);
      if (prefillCategory && !category) setCategory(prefillCategory);
      if (prefillName && !tickerText) setTickerText(`${prefillName} — κοντά σας`);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    const lat = parseCoord(landing.building.latitude);
    const lng = parseCoord(landing.building.longitude);
    const hasCoords = lat !== null && lng !== null;
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

    // Building marker + radius circle
    if (hasCoords && mapRef.current) {
      const pos = new window.google.maps.LatLng(lat!, lng!);
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
          radius: radiusM,
          strokeOpacity: 0.4,
          strokeWeight: 1,
          fillOpacity: 0.08,
        });
      } else {
        circleRef.current.setCenter(pos);
        circleRef.current.setRadius(radiusM);
      }
    }
  }, [landing, radiusM]);

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

      // Find competitors around the building within radiusM (simple heuristic)
      try {
        const bLat = parseCoord(landing.building.latitude);
        const bLng = parseCoord(landing.building.longitude);
        if (bLat === null || bLng === null) return;
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
            radius: radiusM,
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
  }, [landing, radiusM]);

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
    <div className="min-h-screen bg-slate-50/50">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-lg">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">New Concierge <span className="text-primary">InfoPoint</span></span>
          </div>
          <div className="hidden sm:flex items-center gap-4">
            <div className="px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-100 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> 30 ΗΜΕΡΕΣ ΔΩΡΕΑΝ TRIAL
            </div>
          </div>
        </div>
      </nav>

      {/* FOMO / Urgency Banner */}
      <div className="bg-amber-500 py-3 overflow-hidden border-y border-amber-400/50 shadow-inner">
        <div className="flex items-center gap-12 animate-marquee-top whitespace-nowrap">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-6 text-white text-[11px] font-black uppercase tracking-[0.2em]">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-900/40" />
                Περιορισμένη διαθεσιμότητα: 1 επιχείρηση ανά κατηγορία
              </div>
              <span className="text-amber-700/50 font-light">•</span>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-900/40" />
                Κλειδώστε το κτίριο πριν από τον ανταγωνισμό σας
              </div>
              <span className="text-amber-700/50 font-light">•</span>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-900/40" />
                Τοπική αποκλειστικότητα στη γειτονιά σας
              </div>
              <span className="text-amber-700/50 font-light">•</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-24 sm:pt-24 sm:pb-32 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col items-center">

          {/* Centered Top Headings */}
          <div className="text-center max-w-4xl mx-auto space-y-6">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[11px] font-black tracking-[0.2em] uppercase animate-pulse">
              <Sparkles className="w-3.5 h-3.5" /> ΝΕΑ ΥΠΗΡΕΣΙΑ ΤΟΠΙΚΗΣ ΠΡΟΒΟΛΗΣ
            </span>
            <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl md:text-7xl">
              Φτάστε στην <span className="text-primary underline decoration-primary/30 underline-offset-8">καρδιά</span> της γειτονιάς σας.
            </h1>
            <div className="flex flex-col items-center gap-2">
              <p className="text-2xl font-bold text-slate-400 uppercase tracking-widest">Γρήγορα αναπτυσσόμενο δίκτυο τοπικής προβολής</p>
              <p className="text-xl font-black text-red-500 animate-bounce mt-2 uppercase tracking-tighter italic">Εσείς θα μείνετε απέξω;</p>
            </div>
          </div>

          {/* New Full Width Showcase Image/Mockup */}
          <LargeKioskShowcase
            placement={selectedPlacement}
            text={tickerText}
            businessName={businessName || 'Η Επιχείρησή σας'}
            radiusM={radiusM}
          />

          {/* Bottom Content Row (Omnichannel) */}
          <div className="lg:grid lg:grid-cols-12 lg:gap-16 items-center w-full mt-24">
            <div className="lg:col-span-6 space-y-10">
              <div>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black tracking-widest uppercase mb-4">
                  <Smartphone className="w-3.5 h-3.5" /> Mobile Synchronization
                </span>
                <h2 className="text-4xl font-extrabold text-slate-900 leading-tight">Το μήνυμά σας, στην τσέπη κάθε ενοίκου.</h2>
                <p className="mt-6 text-xl text-slate-600 leading-relaxed italic">
                  Η προβολή σας δεν περιορίζεται στην είσοδο. Κάθε φορά που ένας ένοικος ανοίγει την εφαρμογή της πολυκατοικίας για να δει τα κοινόχρηστα ή τις ανακοινώσεις, η επιχείρησή σας είναι εκεί.
                </p>
              </div>

              <div className="space-y-4">
                {[
                  { icon: Target, title: 'Hyper-Local Targeting', desc: 'Εμφάνιση μόνο στους ενοίκους της συγκεκριμένης πολυκατοικίας.' },
                  { icon: MousePointerClick, title: 'Direct Engagement', desc: 'Δυνατότητα click-through στο site ή τα social media σας.' },
                  { icon: Zap, title: 'Instant Updates', desc: 'Αλλάξτε το μήνυμά σας και ενημερώστε ακαριαία οθόνη και κινητά.' }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                    <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center shrink-0">
                      <item.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{item.title}</h4>
                      <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <Button size="lg" className="h-16 px-10 text-xl font-black rounded-2xl shadow-xl shadow-primary/20 hover:shadow-2xl transition-all uppercase tracking-tight" onClick={() => document.getElementById('steps')?.scrollIntoView({ behavior: 'smooth' })}>
                  Ξεκινήστε Δωρεάν <ArrowRight className="ml-2 w-6 h-6" />
                </Button>
                <div className="flex items-center gap-3 px-6 py-2 rounded-2xl border bg-slate-50 text-slate-500 text-sm font-bold uppercase tracking-widest">
                  <CheckCircle2 className="w-5 h-5 text-green-500" /> Χωρίς Πιστωτική Κάρτα
                </div>
              </div>
            </div>

            <div className="mt-16 lg:mt-0 lg:col-span-6 flex justify-center lg:justify-end relative">
              <div className="relative scale-110">
                <div className="absolute -inset-20 bg-primary/10 rounded-full blur-[120px] opacity-60" />

                {/* Reverting to the more informative Phone Mockup with floating labels */}
                <div className="relative w-72 aspect-[9/19] bg-slate-950 rounded-[3rem] border-[10px] border-slate-800 shadow-[0_50px_100px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col p-1">
                   <div className="h-7 w-full flex justify-center items-center">
                     <div className="w-20 h-5 bg-slate-800 rounded-b-2xl" />
                   </div>
                   <div className="flex-1 bg-white rounded-[2.2rem] overflow-hidden flex flex-col relative">
                      <div className="bg-primary pt-10 pb-4 px-6">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/20" />
                            <div className="space-y-1">
                               <div className="h-2 w-20 bg-white/40 rounded" />
                               <div className="h-1.5 w-12 bg-white/20 rounded" />
                            </div>
                         </div>
                      </div>

                      <div className="p-6 space-y-6">
                         {/* The Ad Block on Mobile */}
                         <div className="p-4 rounded-2xl bg-slate-50 border-2 border-dashed border-primary/30 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 px-2 py-0.5 bg-primary text-white text-[8px] font-black uppercase tracking-widest rounded-bl-lg">Ad Sync</div>
                            <div className="flex items-center gap-3 mb-3">
                               <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
                                  <Store className="w-5 h-5 text-primary" />
                               </div>
                               <div className="font-black text-xs text-slate-900 uppercase tracking-tight">{businessName || 'Η Επιχείρησή σας'}</div>
                            </div>
                            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                               {tickerText || 'Η διαφήμισή σας εμφανίζεται αυτόματα στα κινητά των ενοίκων...'}
                            </p>
                            <div className="mt-4 w-full py-2 bg-primary rounded-lg text-white text-[10px] font-black text-center uppercase tracking-widest">Μάθετε Περισσότερα</div>
                         </div>

                         <div className="space-y-4 opacity-20">
                            <div className="h-4 w-1/2 bg-slate-200 rounded" />
                            <div className="space-y-2">
                               <div className="h-2 w-full bg-slate-100 rounded" />
                               <div className="h-2 w-5/6 bg-slate-100 rounded" />
                            </div>
                         </div>
                      </div>
                   </div>
                </div>

                {/* Floating Informative Labels for Mobile */}
                <div className="absolute -left-12 top-1/4 p-4 bg-white rounded-2xl shadow-xl border border-slate-100 animate-float">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <Smartphone className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Mobile App</div>
                      <div className="text-xs font-bold text-slate-800">100% Sync</div>
                    </div>
                  </div>
                </div>

                <div className="absolute -right-12 bottom-1/3 p-4 bg-white rounded-2xl shadow-xl border border-slate-100 animate-float-delayed">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Engagement</div>
                      <div className="text-xs font-bold text-slate-800">Direct Clicks</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Advantage Cards */}
      <section className="py-20 bg-slate-50/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">Γιατί να διαφημιστείτε στο InfoPoint;</h2>
            <p className="mt-4 text-slate-600">Μια νέα εποχή στην τοπική διαφήμιση.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-8">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-6">
                  <Zap className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold mb-3">24/7 Παρουσία</h3>
                <p className="text-slate-600 leading-relaxed">
                  Η διαφήμισή σας παίζει ασταμάτητα στην μεγάλη οθόνη υψηλής ευκρίνειας στην είσοδο της πολυκατοικίας.
                </p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-8">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mb-6">
                  <Smartphone className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold mb-3">Και στο Κινητό</h3>
                <p className="text-slate-600 leading-relaxed">
                  Το μήνυμά σας εμφανίζεται και στην web εφαρμογή των ενοίκων, ακολουθώντας τους παντού.
                </p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-8">
                <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mb-6">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold mb-3">Καθημερινή Επαφή</h3>
                <p className="text-slate-600 leading-relaxed">
                  Οι ένοικοι βλέπουν την οθόνη τουλάχιστον 2-4 φορές την ημέρα. Η επανάληψη χτίζει εμπιστοσύνη.
                </p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-8">
                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mb-6">
                  <ShieldCheck className="w-6 h-6 text-amber-600" />
                </div>
                <h3 className="text-xl font-bold mb-3">Αποκλειστικότητα</h3>
                <p className="text-slate-600 leading-relaxed">
                  Μόνο μία επιχείρηση ανά κατηγορία. Μην αφήσετε τον ανταγωνισμό να πάρει τη θέση σας.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Main Interactive Flow */}
      <section id="steps" className="py-24 bg-white border-t scroll-mt-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-20">

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-slate-500 font-medium">Φορτώνουμε τα δεδομένα του κτιρίου...</p>
            </div>
          ) : error ? (
            <Card className="border-red-100 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-800">Σφάλμα</CardTitle>
                <CardDescription className="text-red-600">{error}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={() => window.location.reload()}>Δοκιμάστε ξανά</Button>
              </CardContent>
            </Card>
          ) : !landing ? (
            <div className="text-center py-20">
              <Info className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h2 className="text-xl font-bold">Δεν βρέθηκαν δεδομένα</h2>
              <p className="text-slate-500 mt-2">Το link που χρησιμοποιήσατε φαίνεται να μην είναι έγκυρο.</p>
            </div>
          ) : (
            <>
              {/* Header Info */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-12 border-b border-slate-100">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                    Επιλεγμένο Κτίριο
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900">{landing.building.name}</h2>
                  <div className="flex items-center gap-2 text-slate-500">
                    <MapPin className="w-4 h-4" />
                    {landing.building.address}, {landing.building.city} {landing.building.postal_code}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center overflow-hidden">
                        <img src={`https://i.pravatar.cc/100?u=${i + landing.building.id}`} alt="User" />
                      </div>
                    ))}
                  </div>
                  <div className="text-sm font-medium text-slate-600">
                    <span className="text-slate-900 font-bold">30+</span> ένοικοι βλέπουν την οθόνη
                  </div>
                </div>
              </div>

              {/* Step 1: Business Discovery */}
              <div className="space-y-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-primary/20">1</div>
                  <h3 className="text-2xl font-bold">Βρείτε την επιχείρησή σας</h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                  <Card className="border-slate-100 shadow-sm overflow-hidden">
                    <CardHeader className="bg-slate-50/50">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Search className="w-5 h-5 text-primary" /> Αναζήτηση στην Google
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                      <div className="space-y-3">
                        <Label htmlFor="biz-search" className="text-slate-700 font-semibold">Όνομα Επιχείρησης</Label>
                        <div className="relative">
                          <Store className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                          <Input
                            id="biz-search"
                            ref={businessInputRef}
                            placeholder="Πληκτρολογήστε (π.χ. My Cafe, Φούρνος Παπαδόπουλος)"
                            className="pl-10 h-12 border-slate-200 focus:ring-primary/20"
                          />
                        </div>
                        {placeId ? (
                          <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg text-green-700 text-sm animate-in zoom-in-95">
                            <CheckCircle2 className="w-4 h-4" />
                            Επιλέχθηκε: <span className="font-bold">{businessName}</span>
                          </div>
                        ) : (
                          <p className="text-[13px] text-slate-500 leading-relaxed">
                            Επιλέξτε την επιχείρησή σας για να αναλύσουμε τον ανταγωνισμό στη γειτονιά του κτιρίου.
                          </p>
                        )}
                      </div>

                      {placeId && competitorCount > 0 && (
                        <div className="p-4 bg-orange-50/50 border border-orange-100 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-4">
                          <div className="flex items-center gap-2 text-orange-800 font-bold text-sm uppercase tracking-wide">
                            <AlertTriangle className="w-4 h-4" /> Ανάλυση Γειτονιάς
                          </div>
                          <p className="text-sm text-orange-900/80 leading-relaxed">
                            Βρέθηκαν <span className="font-bold">{competitorCount} παρόμοιες επιχειρήσεις</span> σε ακτίνα {radiusM}μ.
                          </p>
                          <div className="bg-white/60 p-3 rounded-lg border border-orange-200">
                            <div className="text-[10px] font-black text-orange-600 uppercase mb-1 tracking-tighter">Κίνδυνος Απώλειας</div>
                            <p className="text-xs text-orange-900 font-medium">
                              Αν κάποιος από αυτούς ξεκινήσει trial, η κατηγορία σας θα "κλειδώσει" και δεν θα μπορείτε να προβληθείτε σε αυτό το κτίριο.
                            </p>
                          </div>
                          <div className="pt-2">
                            <ul className="space-y-2">
                              {competitors.slice(0, 3).map((c) => (
                                <li key={c.place_id} className="flex items-center justify-between text-xs text-orange-900/60 bg-white/50 p-2 rounded-lg">
                                  <span>{c.name}</span>
                                  <span className="font-medium">~{c.distance_m}m</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="rounded-2xl border-4 border-white shadow-xl overflow-hidden bg-slate-100 aspect-video lg:aspect-square group relative">
                    <div ref={mapDivRef} className="h-full w-full grayscale-[0.2] group-hover:grayscale-0 transition-all duration-500" />
                    <div className="absolute top-4 left-4 p-2 bg-white/90 backdrop-blur rounded-lg shadow-sm text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 border">
                      <MapIcon className="w-3 h-3 text-primary" /> Live Γειτονιά
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Placement Selection */}
              <div className="space-y-10 pt-10 border-t border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-primary/20">2</div>
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h3 className="text-2xl font-bold">Επιλέξτε θέση προβολής</h3>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-100 border border-orange-200 text-orange-700 text-[10px] font-black uppercase tracking-widest animate-pulse">
                      <ShieldCheck className="w-3.5 h-3.5" /> Εγγύηση Αποκλειστικότητας Κατηγορίας
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {packages.map((p) => {
                    const isSelected = selectedPlacement === p.code;
                    const Icon = p.code === 'ticker' ? Zap : p.code === 'banner' ? Megaphone : Layout;

                    return (
                      <button
                        key={p.code}
                        type="button"
                        onClick={() => setSelectedPlacement(p.code)}
                        disabled={!p.is_available}
                        className={`relative text-left flex flex-col p-6 rounded-2xl border-2 transition-all duration-300 group ${
                          isSelected
                            ? 'border-primary bg-primary/5 ring-4 ring-primary/10 shadow-lg'
                            : 'border-slate-100 bg-white hover:border-slate-300 hover:shadow-md'
                        } ${!p.is_available ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                      >
                        {isSelected && (
                          <div className="absolute -top-3 -right-3 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center shadow-lg animate-in zoom-in">
                            <Check className="w-5 h-5" />
                          </div>
                        )}

                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-colors ${
                          isSelected ? 'bg-primary text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'
                        }`}>
                          <Icon className="w-6 h-6" />
                        </div>

                        <h4 className="font-bold text-lg mb-2 text-slate-900">{p.display_name}</h4>
                        <p className="text-xs text-slate-500 mb-6 leading-relaxed min-h-[40px]">{p.description}</p>

                        <div className="mt-auto space-y-4">
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-slate-900">{formatEur(p.monthly_price_eur)}</span>
                            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">/ μήνα</span>
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Διαθεσιμότητα</span>
                            <div className="flex flex-col items-end">
                              <span className={`text-xs font-bold ${p.remaining_slots > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {p.remaining_slots}/{p.max_slots_per_building}
                              </span>
                              {p.remaining_slots === 1 && (
                                <span className="text-[9px] font-bold text-red-500 animate-pulse">ΜΟΝΟ 1 ΘΕΣΗ ΕΜΕΙΝΕ!</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Creative & Finalize */}
              <div className="space-y-10 pt-10 border-t border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-primary/20">3</div>
                  <h3 className="text-2xl font-bold">Στοιχεία & Έναρξη</h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                  <div className="lg:col-span-7 space-y-8">
                    <Card className="border-slate-100">
                      <CardContent className="pt-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label className="text-slate-700 font-semibold">Email Επικοινωνίας</Label>
                            <Input
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="you@business.gr"
                              className="h-11 border-slate-200"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-slate-700 font-semibold">Όνομα Επιχείρησης</Label>
                            <Input
                              value={businessName}
                              onChange={(e) => setBusinessName(e.target.value)}
                              placeholder="Επωνυμία"
                              className="h-11 border-slate-200"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-slate-700 font-semibold">Κείμενο Προβολής (Ticker)</Label>
                          <div className="relative">
                            <Textarea
                              value={tickerText}
                              onChange={(e) => setTickerText(e.target.value)}
                              placeholder="Π.χ. -20% για τους κατοίκους της πολυκατοικίας!"
                              className="min-h-[100px] border-slate-200 resize-none"
                              maxLength={150}
                            />
                            <div className="absolute bottom-2 right-2 text-[10px] font-bold text-slate-400">
                              {tickerText.length}/150
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-400 italic">Αυτό το κείμενο θα κυλάει στο κάτω μέρος της οθόνης.</p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-slate-700 font-semibold">Link Ιστοσελίδας / Facebook (Προαιρετικό)</Label>
                          <div className="relative">
                            <Globe className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                            <Input
                              value={ctaUrl}
                              onChange={(e) => setCtaUrl(e.target.value)}
                              placeholder="https://facebook.com/mybusiness"
                              className="pl-10 h-11 border-slate-200"
                            />
                          </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-100">
                          <div className="flex items-start gap-3">
                            <Checkbox id="terms" checked={consentTerms} onCheckedChange={(v) => setConsentTerms(Boolean(v))} className="mt-1" />
                            <Label htmlFor="terms" className="text-sm text-slate-600 leading-relaxed cursor-pointer">
                              Αποδέχομαι τους <Link href="/terms" className="text-primary font-bold hover:underline">Όρους Χρήσης</Link> και την Πολιτική Απορρήτου.
                            </Label>
                          </div>
                          <div className="flex items-start gap-3">
                            <Checkbox id="mkt" checked={consentMarketing} onCheckedChange={(v) => setConsentMarketing(Boolean(v))} className="mt-1" />
                            <Label htmlFor="mkt" className="text-sm text-slate-600 leading-relaxed cursor-pointer font-medium">
                              Θέλω να λαμβάνω ενημερώσεις για νέες δυνατότητες προβολής.
                            </Label>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex flex-col gap-4">
                      <Button
                        size="lg"
                        className="h-16 text-lg font-black uppercase tracking-wider shadow-xl shadow-primary/20 hover:shadow-2xl hover:-translate-y-0.5 transition-all bg-primary hover:bg-primary/90"
                        onClick={startTrial}
                        disabled={isStarting}
                      >
                        {isStarting ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mr-3" />
                            ΚΛΕΙΔΩΜΑ ΘΕΣΗΣ...
                          </>
                        ) : (
                          <>
                            ΚΛΕΙΔΩΣΤΕ ΤΗ ΘΕΣΗ ΣΑΣ ΤΩΡΑ <ChevronRight className="ml-2 w-6 h-6" />
                          </>
                        )}
                      </Button>
                      <div className="flex items-center justify-center gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> SECURE SETUP</span>
                        <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-orange-400" /> INSTANT ACTIVATION</span>
                        <span className="flex items-center gap-1.5"><MousePointerClick className="w-3.5 h-3.5" /> NO CREDIT CARD</span>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-5 space-y-6">
                    <div className="sticky top-24">
                      <div className="flex items-center justify-between mb-4">
                        <Label className="text-slate-900 font-bold uppercase tracking-widest text-xs">Live Preview</Label>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-red-500 uppercase">
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" /> LIVE
                        </div>
                      </div>

                      <KioskPreview
                        placement={selectedPlacement}
                        text={tickerText}
                        businessName={businessName || 'Η Επιχείρησή σας'}
                      />

                      <div className="mt-8 p-6 bg-primary/5 border border-primary/10 rounded-2xl space-y-4">
                        <h5 className="font-bold text-slate-900">Τι περιλαμβάνει το trial;</h5>
                        <ul className="space-y-3">
                          {[
                            '30 ημέρες δωρεάν προβολή',
                            '24/7 προβολή στην οθόνη εισόδου',
                            'Προβολή στην εφαρμογή των ενοίκων',
                            'Πρόσβαση στο διαχειριστικό portal',
                            'Δυνατότητα αλλαγής κειμένου ανά πάσα στιγμή',
                          ].map((text, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                              {text}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Success Result */}
              {startResult && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                  <Card className="max-w-md w-full shadow-2xl border-none animate-in zoom-in-95 duration-300">
                    <CardHeader className="text-center pb-2">
                      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-10 h-10 text-green-600" />
                      </div>
                      <CardTitle className="text-2xl font-black uppercase tracking-tight">Συγχαρητήρια!</CardTitle>
                      <CardDescription className="text-slate-600 text-lg">Η δοκιμή σας ξεκίνησε.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-4">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ημερομηνία Λήξης Trial</div>
                        <div className="text-xl font-bold text-slate-900">
                          {startResult.trial_ends_at
                            ? new Date(startResult.trial_ends_at).toLocaleDateString('el-GR', { day: 'numeric', month: 'long', year: 'numeric' })
                            : '—'}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Button className="w-full h-12 font-bold" asChild>
                          <Link href={`/advertise/manage/${startResult.manage_token}`}>
                            ΕΙΣΟΔΟΣ ΣΤΟ PORTAL <Play className="ml-2 w-4 h-4 fill-current" />
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full h-12 font-bold border-slate-200"
                          onClick={handleCopyManageLink}
                        >
                          {copyState === 'copied' ? (
                            <>ΑΝΤΙΓΡΑΦΗΚΕ! <Check className="ml-2 w-4 h-4" /></>
                          ) : (
                            <>ΑΝΤΙΓΡΑΦΗ LINK ΔΙΑΧΕΙΡΙΣΗΣ <ChevronRight className="ml-2 w-4 h-4" /></>
                          )}
                        </Button>
                      </div>

                      <p className="text-[11px] text-center text-slate-400 leading-relaxed uppercase tracking-wider font-bold">
                        Κρατήστε το link διαχείρισης για να βλέπετε στατιστικά και να αλλάζετε το κείμενο της διαφήμισης.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Final Footer */}
      <footer className="bg-slate-900 text-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div className="space-y-6 lg:col-span-2">
              <div className="flex items-center gap-2">
                <div className="bg-primary p-1.5 rounded-lg">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold tracking-tight text-white">New Concierge <span className="text-primary">InfoPoint</span></span>
              </div>
              <p className="text-slate-400 max-w-sm leading-relaxed">
                Η πιο σύγχρονη πλατφόρμα ψηφιακής διαχείρισης και τοπικής προβολής για πολυκατοικίες στην Ελλάδα.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-6 uppercase tracking-widest text-xs text-slate-500">Νομικά</h4>
              <ul className="space-y-4 text-sm text-slate-400 font-medium">
                <li><Link href="/terms" className="hover:text-white transition-colors">Όροι Χρήσης</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Πολιτική Απορρήτου</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6 uppercase tracking-widest text-xs text-slate-500">Επικοινωνία</h4>
              <ul className="space-y-4 text-sm text-slate-400 font-medium">
                <li>support@newconcierge.app</li>
                <li>+30 210 1234567</li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 text-center text-xs text-slate-500 font-bold uppercase tracking-widest">
            © {new Date().getFullYear()} New Concierge. All rights reserved.
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes marquee-top {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee-top {
          display: flex;
          animation: marquee-top 40s linear infinite;
        }
        .animate-marquee-top:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}

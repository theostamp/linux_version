'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/contexts/AuthContext';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { getEffectiveRole } from '@/lib/roleUtils';
import { api } from '@/lib/api';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useRef } from 'react';

type PlacementRow = {
  code: string;
  display_name: string;
  description: string;
  monthly_price_eur: string;
  max_slots_per_building: number;
  is_active: boolean;
  updated_at: string;
};

export default function AdPortalAdminPage() {
  const { user } = useAuth();
  const role = getEffectiveRole(user);
  const isUltraAdmin = Boolean(user?.role?.toLowerCase() === 'admin' && user?.is_superuser && user?.is_staff);

  const { buildings, selectedBuilding } = useBuilding();
  const buildingId = selectedBuilding?.id ?? null;

  const [placements, setPlacements] = useState<PlacementRow[]>([]);
  const [isLoadingPlacements, setIsLoadingPlacements] = useState(false);
  const [placementsError, setPlacementsError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState<string | null>(null);

  const [expiresDays, setExpiresDays] = useState('60');
  const [campaignSource, setCampaignSource] = useState('ui');
  const [utmSource, setUtmSource] = useState('letter');
  const [utmMedium, setUtmMedium] = useState('qr');
  const [utmCampaign, setUtmCampaign] = useState('local_ads');

  const [isCreatingToken, setIsCreatingToken] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [createdLandingUrl, setCreatedLandingUrl] = useState<string | null>(null);

  // Bulk outreach (CSV -> ZIP)
  const [radiusM, setRadiusM] = useState('300');
  const [csvText, setCsvText] = useState('');
  const [isGeneratingOutreach, setIsGeneratingOutreach] = useState(false);
  const [outreachError, setOutreachError] = useState<string | null>(null);

  // V2: auto-discovery (Google Places via client-side JS API already loaded in layout)
  type DiscoveredPlace = {
    place_id: string;
    name: string;
    vicinity?: string;
    types?: string[];
    lat?: number;
    lng?: number;
    distance_m?: number;
  };
  const DISCOVERY_KEYWORD_SUGGESTIONS: Array<{ value: string; label: string }> = [
    { value: 'καφέ', label: 'Καφέ' },
    { value: 'φούρνος', label: 'Φούρνος' },
    { value: 'ζαχαροπλαστείο', label: 'Ζαχαροπλαστείο' },
    { value: 'εστιατόριο', label: 'Εστιατόριο' },
    { value: 'σουβλάκι', label: 'Σουβλάκι' },
    { value: 'πιτσαρία', label: 'Πιτσαρία' },
    { value: 'φαρμακείο', label: 'Φαρμακείο' },
    { value: 'σούπερ μάρκετ', label: 'Σούπερ μάρκετ' },
    { value: 'mini market', label: 'Mini market' },
    { value: 'κομμωτήριο', label: 'Κομμωτήριο' },
    { value: 'barber', label: 'Barber' },
    { value: 'γυμναστήριο', label: 'Γυμναστήριο' },
    { value: 'ξενοδοχείο', label: 'Ξενοδοχείο' },
    { value: 'οδοντίατρος', label: 'Οδοντίατρος' },
    { value: 'ιατρείο', label: 'Ιατρείο' },
    { value: 'κτηνίατρος', label: 'Κτηνίατρος' },
    { value: 'λογιστής', label: 'Λογιστής' },
    { value: 'δικηγόρος', label: 'Δικηγόρος' },
    { value: 'ηλεκτρολόγος', label: 'Ηλεκτρολόγος' },
    { value: 'υδραυλικός', label: 'Υδραυλικός' },
    { value: 'car repair', label: 'Car repair' },
    { value: 'parking', label: 'Parking' },
    { value: 'ATM', label: 'ATM' },
    { value: 'bank', label: 'Bank' },
    { value: 'cafe', label: 'Cafe' },
    { value: 'bakery', label: 'Bakery' },
    { value: 'pharmacy', label: 'Pharmacy' },
    { value: 'restaurant', label: 'Restaurant' },
  ];
  const [discoverKeyword, setDiscoverKeyword] = useState('cafe');
  const [discoverRadiusM, setDiscoverRadiusM] = useState('300');
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const [discovered, setDiscovered] = useState<DiscoveredPlace[]>([]);
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<Record<string, boolean>>({});
  const placesMapDivRef = useRef<HTMLDivElement | null>(null);
  // NOTE: Google Maps typings in this repo are partial; keep these runtime-only to avoid TS conflicts.
  const placesMapRef = useRef<any>(null);
  const placesServiceRef = useRef<any>(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [mapModalError, setMapModalError] = useState<string | null>(null);
  const modalMapDivRef = useRef<HTMLDivElement | null>(null);
  const modalMapRef = useRef<any>(null);
  const modalMarkersRef = useRef<any[]>([]);
  const modalCircleRef = useRef<any>(null);
  const modalInfoWindowRef = useRef<any>(null);
  const modalHasFitBoundsRef = useRef<boolean>(false);
  const [recentKeywords, setRecentKeywords] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('ad_discovery_recent_keywords') || '[]';
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string' && x.trim()).slice(0, 15) : [];
    } catch {
      return [];
    }
  });

  const buildingOptions = useMemo(() => (Array.isArray(buildings) ? buildings : []), [buildings]);

  const parseCoord = (v: unknown): number | null => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
    return null;
  };

  const haversineMeters = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    // https://en.wikipedia.org/wiki/Haversine_formula
    const R = 6371000; // meters
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Tenant context switching (Ultra Admin platform tool)
  type TenantRow = {
    id: number;
    schema_name: string;
    name: string;
    primary_domain: string;
    is_primary_domain: boolean;
  };
  const [tenantRows, setTenantRows] = useState<TenantRow[]>([]);
  const [tenantError, setTenantError] = useState<string | null>(null);
  const [isLoadingTenants, setIsLoadingTenants] = useState(false);
  const [tenantHostOverride, setTenantHostOverride] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('ultra_admin_tenant_host_override') || '';
  });

  const effectiveTenantHost = useMemo(() => {
    // If override is set, we operate on that tenant regardless of URL host.
    if (tenantHostOverride?.trim()) return tenantHostOverride.trim();
    const schema = (user as any)?.tenant?.schema_name;
    if (schema && typeof schema === 'string') return `${schema}.newconcierge.app`;
    return typeof window !== 'undefined' ? window.location.hostname : '';
  }, [tenantHostOverride, user]);

  const fetchTenants = async () => {
    if (!isUltraAdmin) return;
    setIsLoadingTenants(true);
    setTenantError(null);
    try {
      const res = await api.get<{ tenants: TenantRow[] }>(`/ad-portal/admin/tenants/`);
      setTenantRows(Array.isArray(res?.tenants) ? res.tenants : []);
    } catch (e) {
      setTenantError(e instanceof Error ? e.message : 'Σφάλμα φόρτωσης tenants');
    } finally {
      setIsLoadingTenants(false);
    }
  };

  useEffect(() => {
    fetchTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUltraAdmin]);

  // Global overview across all tenants/buildings (Ultra Admin)
  type GlobalOverviewRow = {
    tenant_schema: string;
    tenant_domain: string;
    building_id: number;
    building_name?: string;
    building_address?: string;
    building_city?: string;
    building_postal_code?: string;
    building_latitude?: any;
    building_longitude?: any;

    contracts_total: number;
    contracts_active_paid: number;
    contracts_trial_active: number;
    contracts_paused: number;
    contracts_cancelled: number;
    contracts_trial_expired: number;

    leads_total: number;
    creatives_total: number;
    creatives_live: number;
    creatives_approved: number;

    last_activity_at?: string | null;
  };
  const [globalRows, setGlobalRows] = useState<GlobalOverviewRow[]>([]);
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');

  const fetchGlobalOverview = async () => {
    if (!isUltraAdmin) return;
    setIsLoadingGlobal(true);
    setGlobalError(null);
    try {
      const res = await api.get<{ rows: GlobalOverviewRow[] }>(`/ad-portal/admin/global/overview/`);
      setGlobalRows(Array.isArray(res?.rows) ? res.rows : []);
    } catch (e) {
      setGlobalError(e instanceof Error ? e.message : 'Σφάλμα φόρτωσης global overview');
    } finally {
      setIsLoadingGlobal(false);
    }
  };

  useEffect(() => {
    fetchGlobalOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUltraAdmin]);

  const applyTenantOverride = (host: string) => {
    const trimmed = (host || '').trim();
    if (typeof window !== 'undefined') {
      if (trimmed) localStorage.setItem('ultra_admin_tenant_host_override', trimmed);
      else localStorage.removeItem('ultra_admin_tenant_host_override');
    }
    setTenantHostOverride(trimmed);
    // Hard refresh to ensure all contexts refetch under the new tenant host
    if (typeof window !== 'undefined') window.location.reload();
  };

  const switchToTenantAndBuilding = (host: string, buildingId: number) => {
    const trimmed = (host || '').trim();
    if (typeof window !== 'undefined') {
      if (trimmed) localStorage.setItem('ultra_admin_tenant_host_override', trimmed);
      else localStorage.removeItem('ultra_admin_tenant_host_override');
      localStorage.setItem('selectedBuildingId', String(buildingId));
      localStorage.setItem('activeBuildingId', String(buildingId));
      window.location.reload();
    }
  };

  const fetchPlacements = async () => {
    if (!isUltraAdmin) return;
    setIsLoadingPlacements(true);
    setPlacementsError(null);
    try {
      const res = await api.get<{ placements: PlacementRow[] }>(`/ad-portal/admin/placements/`);
      setPlacements(Array.isArray(res?.placements) ? res.placements : []);
    } catch (e) {
      setPlacementsError(e instanceof Error ? e.message : 'Σφάλμα φόρτωσης');
    } finally {
      setIsLoadingPlacements(false);
    }
  };

  useEffect(() => {
    fetchPlacements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUltraAdmin]);

  const updatePlacement = async (code: string, patch: Partial<PlacementRow>) => {
    if (!isUltraAdmin) return;
    setIsSaving(code);
    setPlacementsError(null);
    try {
      const res = await api.patch<PlacementRow>(`/ad-portal/admin/placements/${code}/`, patch);
      setPlacements((prev) => prev.map((p) => (p.code === code ? { ...p, ...res } : p)));
    } catch (e) {
      setPlacementsError(e instanceof Error ? e.message : 'Αποτυχία ενημέρωσης');
    } finally {
      setIsSaving(null);
    }
  };

  const createToken = async () => {
    if (!isUltraAdmin) return;
    if (!buildingId) {
      setTokenError('Επιλέξτε κτίριο.');
      return;
    }
    setIsCreatingToken(true);
    setTokenError(null);
    setCreatedLandingUrl(null);
    try {
      const res = await api.post<{ landing_url: string }>(`/ad-portal/admin/tokens/`, {
        building_id: buildingId,
        expires_days: Number(expiresDays) || 60,
        campaign_source: campaignSource,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
      });
      setCreatedLandingUrl(res?.landing_url ?? null);
    } catch (e) {
      setTokenError(e instanceof Error ? e.message : 'Αποτυχία δημιουργίας token');
    } finally {
      setIsCreatingToken(false);
    }
  };

  const downloadOutreachZip = async (overrideCsvText?: string) => {
    if (!isUltraAdmin) return;
    if (!buildingId) {
      setOutreachError('Επιλέξτε κτίριο.');
      return;
    }
    const effectiveCsv = (overrideCsvText ?? csvText).trim();
    if (!effectiveCsv) {
      setOutreachError('Βάλτε CSV (τουλάχιστον μία γραμμή).');
      return;
    }
    setIsGeneratingOutreach(true);
    setOutreachError(null);
    try {
      // Build headers similar to api.ts (auth + tenant host)
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (typeof window !== 'undefined') {
        const token =
          localStorage.getItem('access_token') || localStorage.getItem('access') || localStorage.getItem('accessToken');
        if (token) headers.Authorization = `Bearer ${token}`;
        try {
          const cached = localStorage.getItem('user');
          if (cached) {
            const parsed = JSON.parse(cached) as {
              tenant?: { schema_name?: string } | null;
              role?: string;
              is_superuser?: boolean;
              is_staff?: boolean;
            };
            const isUltraAdmin =
              String(parsed?.role || '').toLowerCase() === 'admin' && Boolean(parsed?.is_superuser) && Boolean(parsed?.is_staff);
            const override = localStorage.getItem('ultra_admin_tenant_host_override') || '';
            if (isUltraAdmin && override.trim()) {
              headers['X-Tenant-Host'] = override.trim();
            } else {
              const schema = parsed?.tenant?.schema_name;
              if (schema && typeof schema === 'string' && schema.trim()) {
                headers['X-Tenant-Host'] = `${schema}.newconcierge.app`;
              }
            }
          }
        } catch {
          // ignore
        }
      }

      const res = await fetch('/api/ad-portal/admin/outreach/bulk/', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          building_id: buildingId,
          expires_days: Number(expiresDays) || 60,
          campaign_source: 'bulk_csv',
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
          radius_m: Number(radiusM) || 300,
          csv_text: effectiveCsv,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeName = (selectedBuilding?.name || 'building').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-_]/g, '');
      a.href = url;
      a.download = `ad-outreach-${safeName || 'building'}-${buildingId}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setOutreachError(e instanceof Error ? e.message : 'Αποτυχία δημιουργίας ZIP');
    } finally {
      setIsGeneratingOutreach(false);
    }
  };

  const discoverBusinesses = async () => {
    if (!buildingId) {
      setDiscoverError('Επιλέξτε κτίριο.');
      return;
    }
    const lat = parseCoord((selectedBuilding as any)?.latitude);
    const lng = parseCoord((selectedBuilding as any)?.longitude);
    if (lat === null || lng === null) {
      setDiscoverError('Το κτίριο δεν έχει latitude/longitude. Βάλε συντεταγμένες στο κτίριο για να δουλέψει το discovery.');
      return;
    }
    if (typeof window === 'undefined' || !(window as any).google?.maps?.places) {
      setDiscoverError('Google Maps/Places δεν είναι διαθέσιμο (λείπει NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ή δεν φόρτωσε το script).');
      return;
    }
    const r = Number(discoverRadiusM) || 300;
    // nearbySearch supports larger radii, but keep it sane for UI
    const radius = Math.max(50, Math.min(10000, Math.round(r)));
    const keyword = discoverKeyword.trim();
    if (!keyword) {
      setDiscoverError('Βάλε keyword/κατηγορία (π.χ. cafe, bakery, pharmacy).');
      return;
    }

    // Store recent keywords for faster future selection
    try {
      const next = [keyword, ...recentKeywords].map((x) => x.trim()).filter(Boolean);
      const deduped = Array.from(new Set(next)).slice(0, 15);
      setRecentKeywords(deduped);
      if (typeof window !== 'undefined') {
        localStorage.setItem('ad_discovery_recent_keywords', JSON.stringify(deduped));
      }
    } catch {
      // ignore
    }
    if (!placesMapDivRef.current) {
      setDiscoverError('Internal error: map container not ready.');
      return;
    }

    setIsDiscovering(true);
    setDiscoverError(null);
    try {
      // IMPORTANT: start fresh on each search, otherwise old results from a bigger radius remain visible.
      setDiscovered([]);
      setSelectedPlaceIds({});

      const gmaps: any = (window as any).google?.maps;
      const center = new gmaps.LatLng(lat, lng);
      if (!placesMapRef.current) {
        placesMapRef.current = new gmaps.Map(placesMapDivRef.current, {
          center,
          zoom: 16,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        const placesLib: any = gmaps?.places;
        const PlacesService = placesLib?.PlacesService;
        placesServiceRef.current = PlacesService ? new PlacesService(placesMapRef.current) : null;
      } else {
        placesMapRef.current.setCenter(center);
      }
      if (!placesServiceRef.current) {
        setDiscoverError('Places service init failed.');
        return;
      }

      // nearbySearch returns up to ~20 results per page. Use pagination to fetch more (up to ~60 total).
      const results = await new Promise<any[]>((resolve, reject) => {
        const collected: any[] = [];
        let pageCount = 0;

        const callback = (res: any[] | null, status: any, pagination?: any) => {
          const placesLib: any = (gmaps as any)?.places;
          const OK = placesLib?.PlacesServiceStatus?.OK;
          if (status !== OK || !res) {
            reject(new Error(`Places error: ${status}`));
            return;
          }
          collected.push(...res);
          pageCount += 1;

          // Fetch next page if available (Google may require a short delay)
          if (pagination?.hasNextPage && pageCount < 3) {
            setTimeout(() => pagination.nextPage(), 1200);
            return;
          }
          resolve(collected);
        };

        placesServiceRef.current!.nearbySearch(
          {
            location: center,
            radius,
            keyword,
          },
          callback
        );
      });

      const mapped: DiscoveredPlace[] = (results || [])
        .filter((p) => p.place_id && p.name)
        .map((p) => {
          const plat = typeof p.geometry?.location?.lat === 'function' ? p.geometry.location.lat() : undefined;
          const plng = typeof p.geometry?.location?.lng === 'function' ? p.geometry.location.lng() : undefined;
          const distance_m =
            typeof plat === 'number' && typeof plng === 'number' ? haversineMeters(lat, lng, plat, plng) : undefined;
          return {
            place_id: String(p.place_id),
            name: String(p.name),
            vicinity: (p.vicinity as string | undefined) || undefined,
            types: Array.isArray(p.types) ? (p.types as string[]) : undefined,
            lat: plat,
            lng: plng,
            distance_m,
          };
        })
        // Extra safety: keep only within radius (Google can return borderline out-of-radius)
        .filter((p) => typeof p.distance_m !== 'number' || p.distance_m <= radius);

      // Deduplicate within this run
      const byId = new Map<string, DiscoveredPlace>();
      mapped.forEach((p) => byId.set(p.place_id, p));
      const finalList = Array.from(byId.values()).sort((a, b) => {
        const da = typeof a.distance_m === 'number' ? a.distance_m : Number.POSITIVE_INFINITY;
        const db = typeof b.distance_m === 'number' ? b.distance_m : Number.POSITIVE_INFINITY;
        if (da !== db) return da - db;
        return a.name.localeCompare(b.name, 'el');
      });
      setDiscovered(finalList);
      setSelectedPlaceIds(() => {
        const next: Record<string, boolean> = {};
        finalList.forEach((p) => (next[p.place_id] = false));
        return next;
      });
    } catch (e) {
      setDiscoverError(e instanceof Error ? e.message : 'Αποτυχία discovery');
    } finally {
      setIsDiscovering(false);
    }
  };

  const selectAllDiscovered = (value: boolean) => {
    setSelectedPlaceIds((prev) => {
      const next = { ...prev };
      discovered.forEach((p) => (next[p.place_id] = value));
      return next;
    });
  };

  const downloadZipForSelectedDiscovered = async () => {
    const selected = discovered.filter((p) => selectedPlaceIds[p.place_id]);
    if (selected.length === 0) {
      setOutreachError('Δεν έχεις επιλέξει επιχειρήσεις.');
      return;
    }
    const keyword = discoverKeyword.trim();
    const csv = [
      'business_name,category,address',
      ...selected.map((p) => {
        const name = `"${String(p.name).replace(/"/g, '""')}"`;
        const cat = `"${String(keyword).replace(/"/g, '""')}"`;
        const addr = `"${String(p.vicinity || '').replace(/"/g, '""')}"`;
        return `${name},${cat},${addr}`;
      }),
    ].join('\n');
    await downloadOutreachZip(csv);
  };

  const clearModalOverlays = () => {
    modalMarkersRef.current.forEach((m) => m.setMap(null));
    modalMarkersRef.current = [];
    if (modalCircleRef.current) {
      modalCircleRef.current.setMap(null);
      modalCircleRef.current = null;
    }
  };

  useEffect(() => {
    if (!isMapModalOpen) return;

    setMapModalError(null);
    modalHasFitBoundsRef.current = false;

    let cancelled = false;
    let tries = 0;

    const tick = () => {
      if (cancelled) return;

      const lat = parseCoord((selectedBuilding as any)?.latitude);
      const lng = parseCoord((selectedBuilding as any)?.longitude);
      if (lat === null || lng === null) {
        setMapModalError('Λείπουν συντεταγμένες (latitude/longitude) για το κτίριο.');
        return;
      }
      if (typeof window === 'undefined' || !(window as any).google?.maps) {
        setMapModalError('Google Maps δεν είναι διαθέσιμο (δεν φόρτωσε το script / API key).');
        return;
      }
      const el = modalMapDivRef.current;
      if (!el) {
        if (tries++ < 120) requestAnimationFrame(tick);
        return;
      }
      const rect = el.getBoundingClientRect();
      if (rect.width < 50 || rect.height < 50) {
        // Dialog animation/layout not settled yet
        if (tries++ < 120) requestAnimationFrame(tick);
        return;
      }

      try {
        const gmaps: any = (window as any).google.maps;
        const center = new gmaps.LatLng(lat, lng);
        if (!modalMapRef.current) {
          modalMapRef.current = new gmaps.Map(el, {
            center,
            zoom: 15,
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true,
          });
        } else {
          modalMapRef.current.setCenter(center);
        }
        if (!modalInfoWindowRef.current) {
          modalInfoWindowRef.current = new gmaps.InfoWindow();
        }

        // Resize event (safe even if not needed)
        try {
          const evt: any = (gmaps as any)?.event;
          if (evt?.trigger) evt.trigger(modalMapRef.current, 'resize');
        } catch {
          // ignore
        }

        clearModalOverlays();

        const r = Number(discoverRadiusM) || 300;
        const radius = Math.max(100, Math.min(2000, Math.round(r)));

        // Building marker
        const buildingMarker = new (gmaps as any).Marker(
          ({
          position: center,
          map: modalMapRef.current,
          title: selectedBuilding?.name ? `Κτίριο: ${selectedBuilding.name}` : 'Κτίριο',
          label: { text: 'Κ', color: '#ffffff', fontWeight: '700' },
          } as any)
        );
        modalMarkersRef.current.push(buildingMarker);

        // Radius circle
        const CircleCtor: any = (gmaps as any).Circle;
        modalCircleRef.current = CircleCtor
          ? new CircleCtor({
          map: modalMapRef.current,
          center,
          radius,
          strokeColor: '#2563eb',
          strokeOpacity: 0.7,
          strokeWeight: 2,
          fillColor: '#2563eb',
          fillOpacity: 0.08,
          clickable: false,
            })
          : null;

        const bounds = new (gmaps as any).LatLngBounds();
        bounds.extend(center);

        // Place markers
        discovered.forEach((p) => {
          if (typeof p.lat !== 'number' || typeof p.lng !== 'number') return;
          const pos = new gmaps.LatLng(p.lat, p.lng);
          bounds.extend(pos);
          const isSelected = Boolean(selectedPlaceIds[p.place_id]);
          const SymbolPath: any = (gmaps as any).SymbolPath;
          const marker = new (gmaps as any).Marker({
            position: pos,
            map: modalMapRef.current!,
            title: p.name,
            icon: {
              path: SymbolPath?.CIRCLE,
              scale: 7,
              fillColor: isSelected ? '#16a34a' : '#dc2626',
              fillOpacity: 0.95,
              strokeColor: '#ffffff',
              strokeOpacity: 1,
              strokeWeight: 2,
            } as any,
          } as any);
          marker.addListener('click', () => {
            const html = `
              <div style="font-size:13px;line-height:1.35">
                <div style="font-weight:700;margin-bottom:4px">${p.name}</div>
                <div style="color:#475569">${p.vicinity || ''}</div>
                <div style="color:#64748b;margin-top:6px">${Boolean(selectedPlaceIds[p.place_id]) ? 'Selected' : 'Not selected'}</div>
              </div>
            `;
            modalInfoWindowRef.current!.setContent(html);
            // Typings differ across Google Maps versions; use the classic signature
            try {
              (modalInfoWindowRef.current as any).open(modalMapRef.current!, marker);
            } catch {
              (modalInfoWindowRef.current as any).open();
            }
          });
          modalMarkersRef.current.push(marker);
        });

        // Fit bounds only once per open (avoid fighting user pan/zoom on selection toggles)
        if (!modalHasFitBoundsRef.current) {
          modalHasFitBoundsRef.current = true;
          try {
            modalMapRef.current!.fitBounds(bounds);
          } catch {
            // ignore
          }
        }
      } catch (e) {
        setMapModalError(e instanceof Error ? e.message : 'Αποτυχία αρχικοποίησης χάρτη');
      }
    };

    requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      clearModalOverlays();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMapModalOpen, discovered, selectedPlaceIds, discoverRadiusM, selectedBuilding?.id]);

  if (!isUltraAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Μη εξουσιοδοτημένη πρόσβαση</CardTitle>
            <CardDescription>Το Ad Portal admin είναι διαθέσιμο μόνο για Ultra Admin.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ad Portal — Ρυθμίσεις (Ultra Admin)</CardTitle>
          <CardDescription>Ρύθμιση πακέτων (ticker/banner/whole page) και δημιουργία QR tokens.</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Global Overview (All Tenants)</CardTitle>
          <CardDescription>Συνολική εποπτεία διαφημίσεων ανά tenant + κτίριο (public schema aggregation).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div className="text-sm text-muted-foreground">
              {isLoadingGlobal ? 'Φόρτωση…' : `Γραμμές: ${globalRows.length}`}
            </div>
            <div className="flex gap-2">
              <Input
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search tenant / building..."
                className="w-[260px]"
              />
              <Button variant="outline" onClick={fetchGlobalOverview} disabled={isLoadingGlobal}>
                Ανανέωση
              </Button>
            </div>
          </div>
          {globalError ? <div className="text-sm text-red-600 break-all">{globalError}</div> : null}

          {globalRows.length > 0 ? (
            <div className="rounded-md border overflow-hidden">
              <div className="max-h-[420px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background border-b">
                    <tr>
                      <th className="p-2 text-left">Tenant</th>
                      <th className="p-2 text-left">Κτίριο</th>
                      <th className="p-2 text-right">Paid</th>
                      <th className="p-2 text-right">Trial</th>
                      <th className="p-2 text-right">Paused</th>
                      <th className="p-2 text-right">Leads</th>
                      <th className="p-2 text-right">Live creatives</th>
                      <th className="p-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {globalRows
                      .filter((r) => {
                        const q = globalSearch.trim().toLowerCase();
                        if (!q) return true;
                        const hay = `${r.tenant_schema} ${r.tenant_domain} ${r.building_id} ${r.building_name || ''} ${
                          r.building_address || ''
                        }`
                          .toLowerCase()
                          .trim();
                        return hay.includes(q);
                      })
                      .map((r) => (
                        <tr key={`${r.tenant_schema}:${r.building_id}`} className="border-b last:border-b-0">
                          <td className="p-2 align-top">
                            <div className="font-medium">{r.tenant_schema}</div>
                            <div className="text-xs text-muted-foreground font-mono">{r.tenant_domain}</div>
                          </td>
                          <td className="p-2 align-top">
                            <div className="font-medium">{r.building_name || `Building #${r.building_id}`}</div>
                            <div className="text-xs text-muted-foreground">
                              #{r.building_id}
                              {r.building_address ? ` • ${r.building_address}` : ''}
                            </div>
                          </td>
                          <td className="p-2 align-top text-right tabular-nums">{r.contracts_active_paid}</td>
                          <td className="p-2 align-top text-right tabular-nums">{r.contracts_trial_active}</td>
                          <td className="p-2 align-top text-right tabular-nums">{r.contracts_paused}</td>
                          <td className="p-2 align-top text-right tabular-nums">{r.leads_total}</td>
                          <td className="p-2 align-top text-right tabular-nums">{r.creatives_live}</td>
                          <td className="p-2 align-top">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => switchToTenantAndBuilding(r.tenant_domain, r.building_id)}
                            >
                              Open context
                            </Button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tenant Context (Ultra Admin)</CardTitle>
          <CardDescription>
            Τρέχον context: <span className="font-mono">{effectiveTenantHost || '—'}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tenant (domain)</Label>
              <Select
                value={tenantHostOverride?.trim() ? tenantHostOverride.trim() : '__default__'}
                onValueChange={(v) => {
                  if (v === '__default__') applyTenantOverride('');
                  else applyTenantOverride(v);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Επιλογή" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default__">Default (user tenant)</SelectItem>
                  {tenantRows.map((t) => (
                    <SelectItem key={t.schema_name} value={t.primary_domain}>
                      {t.schema_name} — {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                Αυτό επηρεάζει **όλα** τα API calls (buildings, ad tokens κλπ). Χρησιμοποιείται μόνο για platform ops.
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Tenants</Label>
              <div className="flex gap-2">
                <Button variant="outline" onClick={fetchTenants} disabled={isLoadingTenants}>
                  {isLoadingTenants ? 'Φόρτωση…' : 'Ανανέωση λίστας'}
                </Button>
                <Button variant="outline" onClick={() => applyTenantOverride('')} disabled={!tenantHostOverride}>
                  Clear override
                </Button>
              </div>
              {tenantError ? <div className="text-sm text-red-600 break-all">{tenantError}</div> : null}
              <div className="text-xs text-muted-foreground">Σύνολο: {tenantRows.length}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Πακέτα / Pricing</CardTitle>
          <CardDescription>Τα packages είναι global (public schema) και εφαρμόζονται σε όλα τα κτίρια.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {isLoadingPlacements ? 'Φόρτωση…' : `Πακέτα: ${placements.length}`}
            </div>
            <Button variant="outline" onClick={fetchPlacements} disabled={isLoadingPlacements}>
              Ανανέωση
            </Button>
          </div>

          {placementsError ? <div className="text-sm text-red-600">{placementsError}</div> : null}

          <div className="space-y-2">
            {placements.map((p) => (
              <div key={p.code} className="rounded-md border p-4 space-y-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div className="font-medium">{p.code}</div>
                  <div className="text-xs text-muted-foreground">updated: {new Date(p.updated_at).toLocaleString('el-GR')}</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Όνομα</Label>
                    <Input
                      defaultValue={p.display_name}
                      onBlur={(e) => updatePlacement(p.code, { display_name: e.target.value })}
                      disabled={isSaving === p.code}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Τιμή / μήνα (€)</Label>
                    <Input
                      defaultValue={p.monthly_price_eur}
                      onBlur={(e) => updatePlacement(p.code, { monthly_price_eur: e.target.value })}
                      disabled={isSaving === p.code}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Max slots ανά κτίριο</Label>
                    <Input
                      type="number"
                      defaultValue={String(p.max_slots_per_building)}
                      onBlur={(e) => updatePlacement(p.code, { max_slots_per_building: Number(e.target.value) })}
                      disabled={isSaving === p.code}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Ενεργό</Label>
                    <Select
                      defaultValue={p.is_active ? 'true' : 'false'}
                      onValueChange={(v) => updatePlacement(p.code, { is_active: v === 'true' })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Επιλογή" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Ναι</SelectItem>
                        <SelectItem value="false">Όχι</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Περιγραφή</Label>
                  <Input
                    defaultValue={p.description}
                    onBlur={(e) => updatePlacement(p.code, { description: e.target.value })}
                    disabled={isSaving === p.code}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Δημιουργία QR Token (ανά κτίριο)</CardTitle>
          <CardDescription>Φτιάχνει ένα landing link ` /advertise/{'{token}'} ` για εκτύπωση/QR.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Επιλεγμένο κτίριο: <span className="font-medium">{selectedBuilding?.name ?? '—'}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>expires_days</Label>
              <Input value={expiresDays} onChange={(e) => setExpiresDays(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>campaign_source</Label>
              <Input value={campaignSource} onChange={(e) => setCampaignSource(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>utm_source</Label>
              <Input value={utmSource} onChange={(e) => setUtmSource(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>utm_medium</Label>
              <Input value={utmMedium} onChange={(e) => setUtmMedium(e.target.value)} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>utm_campaign</Label>
              <Input value={utmCampaign} onChange={(e) => setUtmCampaign(e.target.value)} />
            </div>
          </div>

          {tokenError ? <div className="text-sm text-red-600">{tokenError}</div> : null}

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <Button onClick={createToken} disabled={isCreatingToken || !buildingId}>
              {isCreatingToken ? 'Δημιουργία…' : 'Δημιουργία Token'}
            </Button>
            {createdLandingUrl ? (
              <div className="text-sm break-all">
                Link: <span className="font-mono">{createdLandingUrl}</span>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Outreach — Bulk CSV → ZIP (PDF + QR)</CardTitle>
          <CardDescription>
            Φτιάχνει <span className="font-medium">unique QR ανά επιχείρηση</span> και κατεβάζει ZIP με PDF letters.
            Το όνομα/κατηγορία περνάνε στο landing ως <span className="font-mono">utm_content / utm_term</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Επιλεγμένο κτίριο: <span className="font-medium">{selectedBuilding?.name ?? '—'}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>radius_m (ανταγωνισμός στο landing)</Label>
              <Input value={radiusM} onChange={(e) => setRadiusM(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>CSV format</Label>
              <Input
                value="Με headers: business_name,category,address  ή χωρίς headers: name,category,address"
                readOnly
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>CSV</Label>
            <textarea
              className="w-full min-h-[180px] rounded-md border bg-background px-3 py-2 text-sm"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={`business_name,category,address\n\"Το Καφέ του Νίκου\",cafe,\"Βουλής 4, Αθήνα\"\n\"Φούρνος Γιώργος\",bakery,\"Σταδίου 10, Αθήνα\"`}
            />
          </div>

          {outreachError ? <div className="text-sm text-red-600 break-all">{outreachError}</div> : null}

          <Button onClick={() => downloadOutreachZip()} disabled={isGeneratingOutreach || !buildingId}>
            {isGeneratingOutreach ? 'Δημιουργία ZIP…' : 'Download ZIP (PDF + QR)'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>V2 — Auto Discovery (Google Places)</CardTitle>
          <CardDescription>
            Βρίσκει επιχειρήσεις γύρω από το κτίριο με βάση radius + keyword, μετά διαλέγεις ποιες θες και βγάζει ZIP.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Επιλεγμένο κτίριο: <span className="font-medium">{selectedBuilding?.name ?? '—'}</span>
            {parseCoord((selectedBuilding as any)?.latitude) !== null && parseCoord((selectedBuilding as any)?.longitude) !== null ? (
              <span className="text-muted-foreground"> • coords OK</span>
            ) : (
              <span className="text-red-600"> • λείπουν coords</span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>radius_m</Label>
              <Input value={discoverRadiusM} onChange={(e) => setDiscoverRadiusM(e.target.value)} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>keyword / category (autocomplete)</Label>
              <Input
                value={discoverKeyword}
                onChange={(e) => setDiscoverKeyword(e.target.value)}
                placeholder="Π.χ. καφέ, φαρμακείο, bakery..."
                list="ad-places-keywords"
              />
              <datalist id="ad-places-keywords">
                {recentKeywords.map((k) => (
                  <option key={`recent-${k}`} value={k} />
                ))}
                {DISCOVERY_KEYWORD_SUGGESTIONS.map((k) => (
                  <option key={k.value} value={k.value} />
                ))}
              </datalist>
              <div className="text-xs text-muted-foreground">
                Tips: γράψε 2-3 γράμματα για dropdown προτάσεις. Κρατάει και recent keywords.
              </div>
            </div>
          </div>

          {discoverError ? <div className="text-sm text-red-600 break-all">{discoverError}</div> : null}

          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            <Button onClick={discoverBusinesses} disabled={isDiscovering || !buildingId}>
              {isDiscovering ? 'Αναζήτηση…' : 'Αναζήτηση επιχειρήσεων'}
            </Button>
            <Button variant="outline" onClick={() => selectAllDiscovered(true)} disabled={discovered.length === 0}>
              Select all
            </Button>
            <Button variant="outline" onClick={() => selectAllDiscovered(false)} disabled={discovered.length === 0}>
              Clear
            </Button>
            <Button onClick={downloadZipForSelectedDiscovered} disabled={discovered.length === 0 || isGeneratingOutreach}>
              Download ZIP για επιλεγμένα
            </Button>
            <Button variant="outline" onClick={() => setIsMapModalOpen(true)} disabled={discovered.length === 0}>
              Χάρτης (pins)
            </Button>
          </div>

          {/* Offscreen 1x1 container for PlacesService initialization (avoid display:none/hidden quirks) */}
          <div
            ref={placesMapDivRef}
            className="pointer-events-none absolute left-[-9999px] top-[-9999px] h-px w-px opacity-0"
            aria-hidden="true"
          />

          <div className="text-sm text-muted-foreground">Αποτελέσματα: {discovered.length}</div>
          {discovered.length > 0 ? (
            <div className="rounded-md border overflow-hidden">
              <div className="max-h-[360px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background border-b">
                    <tr>
                      <th className="p-2 text-left w-[48px]">OK</th>
                      <th className="p-2 text-left">Όνομα</th>
                      <th className="p-2 text-left">Περιοχή</th>
                    </tr>
                  </thead>
                  <tbody>
                    {discovered.map((p) => (
                      <tr key={p.place_id} className="border-b last:border-b-0">
                        <td className="p-2 align-top">
                          <Checkbox
                            checked={Boolean(selectedPlaceIds[p.place_id])}
                            onCheckedChange={(v) =>
                              setSelectedPlaceIds((prev) => ({ ...prev, [p.place_id]: Boolean(v) }))
                            }
                          />
                        </td>
                        <td className="p-2 align-top">{p.name}</td>
                        <td className="p-2 align-top text-muted-foreground">{p.vicinity || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <Dialog open={isMapModalOpen} onOpenChange={setIsMapModalOpen}>
            <DialogContent className="w-[95vw] max-w-5xl h-[85vh] p-0 overflow-hidden">
              <div className="p-5 pb-3">
                <DialogHeader>
                  <DialogTitle>Χάρτης — Επιχειρήσεις γύρω από το κτίριο</DialogTitle>
                  <DialogDescription>
                    Pins: <span className="font-medium">Κ</span> = κτίριο,{' '}
                    <span className="font-medium text-green-700">πράσινο</span> = selected,{' '}
                    <span className="font-medium text-red-700">κόκκινο</span> = not selected.
                  </DialogDescription>
                </DialogHeader>
              </div>
              <div className="px-5 pb-4">
                <div className="text-sm text-muted-foreground">
                  Κτίριο: <span className="font-medium">{selectedBuilding?.name ?? '—'}</span> • Αποτελέσματα: {discovered.length}
                </div>
                {mapModalError ? <div className="mt-2 text-sm text-red-600 break-all">{mapModalError}</div> : null}
              </div>
              <div className="h-[calc(85vh-140px)] w-full">
                <div ref={modalMapDivRef} className="h-full w-full" />
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}



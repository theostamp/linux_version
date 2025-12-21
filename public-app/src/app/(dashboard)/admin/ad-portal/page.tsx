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

  const buildingOptions = useMemo(() => (Array.isArray(buildings) ? buildings : []), [buildings]);

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

  const downloadOutreachZip = async () => {
    if (!isUltraAdmin) return;
    if (!buildingId) {
      setOutreachError('Επιλέξτε κτίριο.');
      return;
    }
    if (!csvText.trim()) {
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
            const parsed = JSON.parse(cached) as { tenant?: { schema_name?: string } | null };
            const schema = parsed?.tenant?.schema_name;
            if (schema && typeof schema === 'string' && schema.trim()) {
              headers['X-Tenant-Host'] = `${schema}.newconcierge.app`;
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
          csv_text: csvText,
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

          <Button onClick={downloadOutreachZip} disabled={isGeneratingOutreach || !buildingId}>
            {isGeneratingOutreach ? 'Δημιουργία ZIP…' : 'Download ZIP (PDF + QR)'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}



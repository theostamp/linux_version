// frontend/components/KioskDataSyncController.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { loadKioskSyncSettings } from "@/lib/kioskSyncSettings";
import { getNetworkUsageTracker } from "@/lib/networkUsage";

// Αν έχεις ήδη api axios instance, μπορείς να το χρησιμοποιήσεις.
// Εδώ χρησιμοποιώ fetch για να είναι 100% συμβατό με ETag/If-None-Match.
type Props = {
  buildingId: number;
  // optional callback για να "περάσεις" τα data στο UI του kiosk
  onState?: (payload: any) => void;
};

export default function KioskDataSyncController({ buildingId, onState }: Props) {
  const etagRef = useRef<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const [settings, setSettings] = useState(loadKioskSyncSettings());

  // Start network meter automatically (μπορείς να το κάνεις μόνο σε admin σελίδα αν προτιμάς)
  useEffect(() => {
    getNetworkUsageTracker().start();
    return () => getNetworkUsageTracker().stop();
  }, []);

  // Παρακολούθηση αλλαγών settings από άλλα tabs (admin UI)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key.includes("kiosk_sync_settings_v1")) {
        setSettings(loadKioskSyncSettings());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  async function tick() {
    const s = loadKioskSyncSettings();
    if (!s.enabled) return;

    const url = `/api/kiosk/state/?building=${encodeURIComponent(buildingId)}`;
    const headers: HeadersInit = {};
    if (etagRef.current) headers["If-None-Match"] = etagRef.current;

    try {
      const res = await fetch(url, {
        method: "GET",
        headers,
        cache: "no-store",
        credentials: "include",
      });

      const newEtag = res.headers.get("ETag");
      if (newEtag) etagRef.current = newEtag;

      if (res.status === 304) {
        // No changes
        return;
      }

      if (!res.ok) {
        console.warn("Kiosk state fetch failed:", res.status);
        return;
      }

      const data = await res.json();
      onState?.(data);

      // Για debugging:
      // console.log("Kiosk state updated:", data);
    } catch (err) {
      console.warn("Kiosk state fetch error:", err);
    }
  }

  useEffect(() => {
    // clear old timer
    if (timerRef.current) window.clearInterval(timerRef.current);

    // start new timer
    const ms = Math.max(1, settings.intervalMinutes) * 60_000;

    // immediate tick once
    tick();

    timerRef.current = window.setInterval(() => tick(), ms);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.intervalMinutes, settings.enabled, buildingId]);

  return null;
}

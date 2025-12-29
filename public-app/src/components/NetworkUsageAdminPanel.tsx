// frontend/components/NetworkUsageAdminPanel.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { formatMB, getNetworkUsageTracker, UsageSnapshot } from "@/lib/networkUsage";
import { loadKioskSyncSettings, saveKioskSyncSettings } from "@/lib/kioskSyncSettings";

// Προσαρμόζεις αυτό στο δικό σου auth context
// Θεωρώ ότι έχεις useAuth() και currentUser/role.
import { useAuth } from "@/components/contexts/AuthContext";
import { hasOfficeAdminAccess } from "@/lib/roleUtils";

function downloadJson(filename: string, data: any) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function NetworkUsageAdminPanel() {
  const { user, isAuthenticated } = useAuth();

  // TODO: Προσαρμογή "Ultra User" check στη δική σου λογική ρόλων
  const isUltra = isAuthenticated && hasOfficeAdminAccess(user);

  const tracker = useMemo(() => getNetworkUsageTracker(), []);
  const [snap, setSnap] = useState<UsageSnapshot>(tracker.snapshot());
  const [settings, setSettings] = useState(loadKioskSyncSettings());

  useEffect(() => {
    tracker.start();
    const id = window.setInterval(() => setSnap(tracker.snapshot()), 1000);
    return () => {
      window.clearInterval(id);
      tracker.stop();
    };
  }, [tracker]);

  useEffect(() => {
    const onStorage = () => setSettings(loadKioskSyncSettings());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (!isAuthenticated) {
    return <div className="p-6">Πρέπει να συνδεθείτε.</div>;
  }

  if (!isUltra) {
    return <div className="p-6">Δεν έχετε πρόσβαση σε αυτό το εργαλείο.</div>;
  }

  const endpoints = Object.entries(snap.byEndpoint)
    .sort((a, b) => b[1].bytes - a[1].bytes)
    .slice(0, 50);

  const applySettings = (next: typeof settings) => {
    setSettings(next);
    saveKioskSyncSettings(next);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Network Usage Meter (Kiosk / API)</h1>
          <p className="text-sm opacity-70">Μετράει πραγματικό transferSize από Resource Timing για /api/*.</p>
        </div>

        <div className="flex gap-2">
          <button
            className="px-3 py-2 rounded-lg border"
            onClick={() => {
              tracker.reset();
              setSnap(tracker.snapshot());
            }}
          >
            Reset meter
          </button>
          <button
            className="px-3 py-2 rounded-lg border"
            onClick={() => downloadJson(`network-usage-${new Date().toISOString()}.json`, { snapshot: snap, settings })}
          >
            Export JSON
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border">
          <div className="text-sm opacity-70">Total</div>
          <div className="text-3xl font-semibold">{formatMB(snap.totalBytes)} MB</div>
        </div>
        <div className="p-4 rounded-xl border">
          <div className="text-sm opacity-70">Last 5 min</div>
          <div className="text-3xl font-semibold">{formatMB(snap.last5MinBytes)} MB</div>
        </div>
        <div className="p-4 rounded-xl border">
          <div className="text-sm opacity-70">Last 60 min</div>
          <div className="text-3xl font-semibold">{formatMB(snap.last60MinBytes)} MB</div>
        </div>
      </div>

      <div className="p-4 rounded-xl border space-y-3">
        <h2 className="text-lg font-semibold">Sync Controls</h2>

        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => applySettings({ ...settings, enabled: e.target.checked })}
            />
            <span>Enable kiosk sync</span>
          </label>

          <label className="flex items-center gap-2">
            <span className="text-sm opacity-70">Interval (minutes)</span>
            <input
              className="px-2 py-1 rounded border w-24"
              type="number"
              min={1}
              max={60}
              value={settings.intervalMinutes}
              onChange={(e) => applySettings({ ...settings, intervalMinutes: Number(e.target.value || 5) })}
            />
          </label>

          <div className="text-sm opacity-70">
            Tip: για tests βάλε 1–2 λεπτά, για production 5–15 λεπτά.
          </div>
        </div>

        <div className="text-sm opacity-70">
          Με ETag/304, όταν δεν αλλάζει κάτι, το payload δεν κατεβαίνει (μένουν μόνο headers).
        </div>
      </div>

      <div className="p-4 rounded-xl border">
        <h2 className="text-lg font-semibold mb-3">Top API endpoints</h2>
        <div className="overflow-auto">
          <table className="min-w-[800px] w-full text-sm">
            <thead className="text-left opacity-70">
              <tr>
                <th className="py-2 pr-3">Endpoint</th>
                <th className="py-2 pr-3">Count</th>
                <th className="py-2 pr-3">MB</th>
                <th className="py-2 pr-3">Last</th>
              </tr>
            </thead>
            <tbody>
              {endpoints.map(([k, st]) => (
                <tr key={k} className="border-t">
                  <td className="py-2 pr-3 font-mono">{k}</td>
                  <td className="py-2 pr-3">{st.count}</td>
                  <td className="py-2 pr-3">{formatMB(st.bytes)}</td>
                  <td className="py-2 pr-3">{st.lastAt ? new Date(st.lastAt).toLocaleTimeString() : "-"}</td>
                </tr>
              ))}
              {endpoints.length === 0 && (
                <tr>
                  <td className="py-3 opacity-70" colSpan={4}>
                    Δεν υπάρχουν ακόμη καταγραφές. Κάνε μερικά API calls.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


// frontend/lib/kioskSyncSettings.ts
export type KioskSyncSettings = {
  enabled: boolean;
  intervalMinutes: number; // default 5
};

const KEY = "kiosk_sync_settings_v1";

export function loadKioskSyncSettings(): KioskSyncSettings {
  if (typeof window === "undefined") return { enabled: true, intervalMinutes: 5 };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { enabled: true, intervalMinutes: 5 };
    const parsed = JSON.parse(raw);
    return {
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : true,
      intervalMinutes:
        typeof parsed.intervalMinutes === "number" && parsed.intervalMinutes >= 1 && parsed.intervalMinutes <= 60
          ? parsed.intervalMinutes
          : 5,
    };
  } catch {
    return { enabled: true, intervalMinutes: 5 };
  }
}

export function saveKioskSyncSettings(s: KioskSyncSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
}


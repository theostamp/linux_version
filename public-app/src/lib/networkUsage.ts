// frontend/lib/networkUsage.ts
export type EndpointStats = {
  count: number;
  bytes: number; // transferSize (headers + compressed body)
  lastAt?: number;
};

export type UsageSnapshot = {
  startedAt: number;
  totalBytes: number;
  last5MinBytes: number;
  last60MinBytes: number;
  byEndpoint: Record<string, EndpointStats>;
};

type Sample = { t: number; bytes: number };

function now() {
  return Date.now();
}

function toKey(url: string) {
  try {
    const u = new URL(url);
    return u.pathname + (u.search ? "" : ""); // κρατάμε endpoint χωρίς query για grouping
  } catch {
    return url;
  }
}

export class NetworkUsageTracker {
  private observer?: PerformanceObserver;
  private startedAt = now();
  private totalBytes = 0;
  private byEndpoint: Record<string, EndpointStats> = {};
  private samples: Sample[] = [];
  private enabled = false;

  constructor(private apiPathPrefix = "/api/") {}

  start() {
    if (this.enabled) return;
    this.enabled = true;
    this.startedAt = now();

    // Καθάρισε παλιά entries ώστε να μην "πιάσεις" ιστορικά resources
    performance.clearResourceTimings?.();

    this.observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const e = entry as PerformanceResourceTiming;

        // Φιλτράρουμε μόνο fetch/xhr
        const initiator = (e as any).initiatorType;
        if (initiator !== "fetch" && initiator !== "xmlhttprequest") continue;

        // Φιλτράρουμε μόνο /api/
        if (!e.name.includes(this.apiPathPrefix)) continue;

        // transferSize: πραγματικά bytes στο wire (αν είναι διαθέσιμο)
        // Σε ορισμένες περιπτώσεις μπορεί να είναι 0 (cache/cors constraints).
        const transferSize = (e as any).transferSize ?? 0;
        if (transferSize <= 0) continue;

        const key = toKey(e.name);
        this.totalBytes += transferSize;

        if (!this.byEndpoint[key]) this.byEndpoint[key] = { count: 0, bytes: 0 };
        this.byEndpoint[key].count += 1;
        this.byEndpoint[key].bytes += transferSize;
        this.byEndpoint[key].lastAt = now();

        this.samples.push({ t: now(), bytes: transferSize });
        this.compactSamples();
      }
    });

    // buffered: true => πιάνει και entries που έγιναν λίγο πριν το mount (χρήσιμο σε dev)
    this.observer.observe({ type: "resource", buffered: true as any });
  }

  stop() {
    this.enabled = false;
    this.observer?.disconnect();
    this.observer = undefined;
  }

  reset() {
    this.totalBytes = 0;
    this.byEndpoint = {};
    this.samples = [];
    this.startedAt = now();
    performance.clearResourceTimings?.();
  }

  private compactSamples() {
    const cutoff = now() - 60 * 60 * 1000; // κρατάμε 60 λεπτά
    while (this.samples.length && this.samples[0].t < cutoff) this.samples.shift();
  }

  private sumSince(msAgo: number) {
    const cutoff = now() - msAgo;
    let s = 0;
    for (const sample of this.samples) if (sample.t >= cutoff) s += sample.bytes;
    return s;
  }

  snapshot(): UsageSnapshot {
    this.compactSamples();
    return {
      startedAt: this.startedAt,
      totalBytes: this.totalBytes,
      last5MinBytes: this.sumSince(5 * 60 * 1000),
      last60MinBytes: this.sumSince(60 * 60 * 1000),
      byEndpoint: this.byEndpoint,
    };
  }
}

// Singleton
let tracker: NetworkUsageTracker | null = null;
export function getNetworkUsageTracker() {
  if (!tracker) tracker = new NetworkUsageTracker("/api/");
  return tracker;
}

export function formatMB(bytes: number) {
  return (bytes / (1024 * 1024)).toFixed(2);
}


"use client";

import React from 'react';

type CompileState = "idle" | "building" | "built";

// Dev-only indicator that listens to Next.js HMR build messages
export default function DevCompileIndicator(): JSX.Element | null {
  const [state, setState] = React.useState<CompileState>("idle");
  const [visible, setVisible] = React.useState<boolean>(false);
  const [initialized, setInitialized] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    let es: EventSource | null = null;

    const isLocalNextDev =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") &&
      window.location.port === "3000";

    const envFlag = process.env.NEXT_PUBLIC_DEV_COMPILE_INDICATOR;
    const shouldEnable = envFlag === "true" || (envFlag !== "false" && isLocalNextDev);

    if (!shouldEnable) {
      setInitialized(true);
      return;
    }

    // If not Next dev or explicitly disabled, we won't connect to HMR endpoints

    const probe = async (url: string): Promise<boolean> => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 400);
        const res = await fetch(url, {
          method: "GET",
          headers: { Accept: "text/event-stream" },
          signal: controller.signal,
          cache: "no-store",
        });
        clearTimeout(timeoutId);
        // Accept 200 or 204 as available; 404/other -> not available
        return res.ok;
      } catch {
        return false;
      }
    };

    const connect = async () => {
      if (typeof window === "undefined" || typeof EventSource === "undefined") {
        return;
      }

      // Skip if explicitly disabled
      if (process.env.NEXT_PUBLIC_DEV_COMPILE_INDICATOR === "false") {
        setInitialized(true);
        return;
      }

      const endpoints = ["/_next/webpack-hmr", "/_next/static/webpack-hmr"];
      let endpointToUse: string | null = null;
      for (const endpoint of endpoints) {
        // Only connect if endpoint looks reachable to avoid console 404 noise
        // We probe with a fast-abort fetch so it won't hang
        // eslint-disable-next-line no-await-in-loop
        const ok = await probe(endpoint);
        if (ok) {
          endpointToUse = endpoint;
          break;
        }
      }

      if (!endpointToUse) {
        setInitialized(true);
        return;
      }

      try {
        es = new EventSource(endpointToUse);
        es.onmessage = (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            if (data && data.action === "building") {
              setState("building");
              setVisible(true);
            } else if (data && (data.action === "built" || data.action === "sync")) {
              setState("built");
              setTimeout(() => setVisible(false), 600);
            }
          } catch {
            // ignore keep-alive messages
          }
        };
        es.onerror = () => {
          // On error, stop listening silently to avoid repeated network noise
          if (es) {
            es.close();
            es = null;
          }
        };
      } catch {
        // ignore
      } finally {
        setInitialized(true);
      }
    };

    void connect();

    return () => {
      if (es) {
        es.close();
      }
    };
  }, []);

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  if (!initialized || !visible) {
    return null;
  }

  const label = state === "building" ? "Γίνεται μεταγλώττιση…" : "Ολοκληρώθηκε";

  return (
    <div
      style={{
        position: "fixed",
        top: 12,
        right: 12,
        zIndex: 9999,
        background: "rgba(17,17,17,0.9)",
        color: "#fff",
        borderRadius: 12,
        padding: "10px 14px",
        display: "flex",
        gap: 10,
        alignItems: "center",
        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
        border: "1px solid rgba(255,255,255,0.1)",
        backdropFilter: "blur(6px)",
      }}
      aria-live="polite"
      aria-label={label}
    >
      <span
        style={{
          width: 14,
          height: 14,
          borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.5)",
          borderTopColor: "#fff",
          animation: "spin 0.8s linear infinite",
          display: "inline-block",
        }}
      />
      <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}



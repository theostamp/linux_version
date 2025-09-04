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

    // Vite detection: if running under Vite, import.meta.hot will exist at runtime
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const viteHot: any | undefined = (import.meta as any)?.hot;
    const isLocalViteDev =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") &&
      (window.location.port === "5173" || window.location.port === "5174");

    const envFlag = process.env.NEXT_PUBLIC_DEV_COMPILE_INDICATOR;
    const shouldEnable = envFlag === "true" || (envFlag !== "false" && (isLocalNextDev || isLocalViteDev || Boolean(viteHot)));

    if (!shouldEnable) {
      setInitialized(true);
      return;
    }

    // If Vite HMR is available, listen to its lifecycle events; no network probes needed
    if (viteHot) {
      const onBeforeUpdate = () => {
        setState("building");
        setVisible(true);
      };
      const onAfterUpdate = () => {
        setState("built");
        setTimeout(() => setVisible(false), 600);
      };
      const onError = () => {
        setState("building");
        setVisible(true);
      };

      try {
        viteHot.on?.("vite:beforeUpdate", onBeforeUpdate);
        viteHot.on?.("vite:afterUpdate", onAfterUpdate);
        viteHot.on?.("vite:error", onError);
        viteHot.on?.("full-reload", onBeforeUpdate);
      } catch {
        // ignore
      }

      setInitialized(true);

      return () => {
        try {
          viteHot.off?.("vite:beforeUpdate", onBeforeUpdate);
          viteHot.off?.("vite:afterUpdate", onAfterUpdate);
          viteHot.off?.("vite:error", onError);
          viteHot.off?.("full-reload", onBeforeUpdate);
        } catch {
          // ignore
        }
      };
    }

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



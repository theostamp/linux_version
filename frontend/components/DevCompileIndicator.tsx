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
  const isBuilding = state === "building";

  return (
    <div
      style={{
        position: "fixed",
        top: 12,
        right: 12,
        zIndex: 9999,
        background: isBuilding 
          ? "linear-gradient(135deg, rgba(59, 130, 246, 0.95), rgba(147, 51, 234, 0.95))"
          : "linear-gradient(135deg, rgba(34, 197, 94, 0.95), rgba(59, 130, 246, 0.95))",
        color: "#fff",
        borderRadius: 16,
        padding: "12px 16px",
        display: "flex",
        gap: 12,
        alignItems: "center",
        boxShadow: isBuilding 
          ? "0 10px 30px rgba(59, 130, 246, 0.4), 0 4px 15px rgba(0,0,0,0.2)"
          : "0 10px 30px rgba(34, 197, 94, 0.4), 0 4px 15px rgba(0,0,0,0.2)",
        border: "1px solid rgba(255,255,255,0.2)",
        backdropFilter: "blur(10px)",
        transform: visible ? "scale(1) translateY(0)" : "scale(0.9) translateY(-10px)",
        opacity: visible ? 1 : 0,
        transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        animation: visible ? "slideInFromTop 0.3s ease-out" : undefined,
      }}
      aria-live="polite"
      aria-label={label}
    >
      {isBuilding ? (
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            border: "2px solid rgba(255,255,255,0.3)",
            borderTop: "2px solid #fff",
            borderRight: "2px solid #fff",
            animation: "spin 1s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite",
            display: "inline-block",
          }}
        />
      ) : (
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            backgroundColor: "#22c55e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "checkmarkBounce 0.6s ease-out",
          }}
        >
          <svg 
            width="10" 
            height="8" 
            viewBox="0 0 10 8" 
            fill="none"
            style={{ animation: "drawCheckmark 0.3s ease-out 0.2s both" }}
          >
            <path 
              d="M1 4L3.5 6.5L9 1" 
              stroke="white" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
      
      <span style={{ 
        fontSize: 14, 
        fontWeight: 600,
        textShadow: "0 1px 2px rgba(0,0,0,0.3)"
      }}>
        {label}
      </span>
      
      <style>{`
        @keyframes spin { 
          from { transform: rotate(0deg); } 
          to { transform: rotate(360deg); } 
        }
        @keyframes slideInFromTop {
          from { 
            transform: translateY(-20px) scale(0.95); 
            opacity: 0; 
          }
          to { 
            transform: translateY(0) scale(1); 
            opacity: 1; 
          }
        }
        @keyframes checkmarkBounce {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        @keyframes drawCheckmark {
          from { 
            stroke-dasharray: 0 12; 
          }
          to { 
            stroke-dasharray: 12 0; 
          }
        }
      `}</style>
    </div>
  );
}



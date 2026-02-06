'use client';

import { useEffect, useRef, useState } from 'react';

const SHOW_DELAY_MS = 700;
const MIN_VISIBLE_MS = 400;

export default function GlobalLoadingOverlay() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const showTimeoutRef = useRef<number | null>(null);
  const hideTimeoutRef = useRef<number | null>(null);
  const visibleSinceRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const w = window as any;
    if (w.__ncFetchWrapped) return;

    const originalFetch = window.fetch.bind(window);
    w.__ncFetchWrapped = true;
    w.__ncOriginalFetch = originalFetch;

    window.fetch = async (...args) => {
      setPendingCount((count) => count + 1);
      try {
        return await originalFetch(...args);
      } finally {
        setPendingCount((count) => Math.max(0, count - 1));
      }
    };
  }, []);

  useEffect(() => {
    if (pendingCount > 0) {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }

      if (!isVisible && !showTimeoutRef.current && typeof window !== 'undefined') {
        showTimeoutRef.current = window.setTimeout(() => {
          showTimeoutRef.current = null;
          if (pendingCount > 0) {
            setIsVisible(true);
            visibleSinceRef.current = Date.now();
          }
        }, SHOW_DELAY_MS);
      }
      return;
    }

    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }

    if (isVisible && typeof window !== 'undefined') {
      const visibleFor = Date.now() - (visibleSinceRef.current ?? Date.now());
      const remaining = Math.max(0, MIN_VISIBLE_MS - visibleFor);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      hideTimeoutRef.current = window.setTimeout(() => {
        setIsVisible(false);
        visibleSinceRef.current = null;
        hideTimeoutRef.current = null;
      }, remaining);
    }
  }, [pendingCount, isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/90 px-5 py-4 text-white shadow-2xl">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        <span className="text-sm font-medium">Φόρτωση...</span>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getActiveBuildingId } from './api';

type EventPayload = {
  type?: string;
  event?: string;
  payload?: Record<string, unknown>;
};

export function useBuildingEvents(buildingIdParam?: number) {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // TEMPORARILY DISABLED - WebSocket connection causing hanging issues
    console.log('[useBuildingEvents] WebSocket connection temporarily disabled to debug hanging issue');
    return;

    const buildingId = buildingIdParam ?? getActiveBuildingId();
    // Avoid connecting in development if backend WS isn't available
    if (typeof window === 'undefined') return;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = `${window.location.hostname}:18000`;
    const wsUrl = `${protocol}://${host}/ws/chat/${buildingId}/`;

    // Guard: try a quick HEAD to backend HTTP root to infer availability
    // If it fails quickly, skip opening WS to prevent console spam
    let aborted = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);

    fetch(`http://${host}/health/`, { method: 'GET', signal: controller.signal })
      .then((res) => {
        return res && res.ok;
      })
      .catch(() => false)
      .finally((ok?: boolean) => {
        if (aborted) return;
        clearTimeout(timer);
        if (!ok) {
          // Skip opening WS when backend health is not OK to avoid console noise in dev
          return;
        }
        try {
          const ws = new WebSocket(wsUrl);
          wsRef.current = ws;

          ws.onopen = () => {
            // connected
          };
          ws.onmessage = (event) => {
            try {
              const data: EventPayload = JSON.parse(event.data);
              const eventType = data.event || data.type;
              if (!eventType) return;

              if (eventType === 'event') {
                const inner = data as unknown as { event: string; payload?: Record<string, unknown> };
                handleEvent(inner.event, inner.payload);
                return;
              }
              handleEvent(eventType, (data as any).payload);
            } catch {}
          };
          ws.onerror = () => {
            // silence errors in dev
          };
          ws.onclose = () => {
            // no retry to avoid noise
          };
        } catch {}
      });

    return () => {
      aborted = true;
      try { wsRef.current?.close(); } catch {}
      wsRef.current = null;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingIdParam]);

  const handleEvent = (name?: string, _payload?: Record<string, unknown>) => {
    switch (name) {
      case 'ticket.updated':
        queryClient.invalidateQueries({ queryKey: ['tickets'] });
        queryClient.invalidateQueries({ queryKey: ['scheduled-maintenance'] });
        break;
      case 'workorder.updated':
        queryClient.invalidateQueries({ queryKey: ['workOrders'] });
        break;
      case 'project.updated':
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        queryClient.invalidateQueries({ queryKey: ['contracts'] });
        break;
      case 'milestone.updated':
        queryClient.invalidateQueries({ queryKey: ['milestones'] });
        break;
      case 'maintenance.expense_deleted': {
        // Invalidate maintenance related lists
        queryClient.invalidateQueries({ queryKey: ['scheduled-maintenance'] });
        queryClient.invalidateQueries({ queryKey: ['maintenance-payment-history'] });
        // Try to show a toast if hook exists in window (light coupling)
        try {
          const payload = _payload || {};
          const msg = (payload as any).message || 'Διαγράφηκε σχετική δαπάνη συντήρησης';
          (window as any).__app_toast?.({ title: 'Ειδοποίηση', description: msg });
        } catch {}
        break;
      }
      default:
        // Generic invalidate for safety
        queryClient.invalidateQueries({ queryKey: ['tickets'] });
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        break;
    }
  };
}



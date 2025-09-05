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
    const buildingId = buildingIdParam ?? getActiveBuildingId();
    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss' : 'ws';
    // Always target backend websocket port on same tenant (demo.localhost:8000)
    const host = typeof window !== 'undefined'
      ? `${window.location.hostname}:8000`
      : 'localhost:8000';
    // Connect with room_name = numeric building id to match server group "chat_{id}"
    const wsUrl = `${protocol}://${host}/ws/chat/${buildingId}/`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data: EventPayload = JSON.parse(event.data);
        const eventType = data.event || data.type;
        if (!eventType) return;

        if (eventType === 'event') {
          // Generic wrapper { type: 'event', event: '...', payload: {...} }
          const inner = data as unknown as { event: string; payload?: Record<string, unknown> };
          handleEvent(inner.event, inner.payload);
          return;
        }

        // Fallback: direct event names
        handleEvent(eventType, (data as any).payload);
      } catch (_e) {
        // ignore malformed
      }
    };

    ws.onerror = () => {
      // best-effort; no-op
    };

    return () => {
      try { ws.close(); } catch {}
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
      default:
        // Generic invalidate for safety
        queryClient.invalidateQueries({ queryKey: ['tickets'] });
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        break;
    }
  };
}



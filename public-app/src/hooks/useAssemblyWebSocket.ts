'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/contexts/AuthContext';
import { getAccessToken } from '@/lib/authTokens';

/**
 * Hook για real-time ενημερώσεις συνελεύσεων μέσω WebSockets.
 * Όταν λαμβάνει ενημέρωση, ακυρώνει τα σχετικά queries του React Query
 * για να προκαλέσει επαναφόρτωση των δεδομένων.
 */
export function useAssemblyWebSocket(assemblyId: string | undefined) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !assemblyId) return;

    const token = getAccessToken();
    if (!token) {
      console.log('[useAssemblyWebSocket] No JWT token found, skipping WebSocket connection');
      return;
    }

    // Optional tenant hints (helps when infra doesn't preserve Host for websockets)
    let schemaHint = '';
    try {
      const cached = localStorage.getItem('user');
      if (cached) {
        const parsed = JSON.parse(cached) as { tenant?: { schema_name?: string } | null };
        schemaHint = parsed?.tenant?.schema_name || '';
      }
    } catch {
      // ignore
    }

    let wsUrl = '';
    const backendWsUrl = process.env.NEXT_PUBLIC_BACKEND_WS_URL;

    if (backendWsUrl) {
      wsUrl = `${backendWsUrl}/ws/assemblies/${assemblyId}/`;
    } else if (process.env.NODE_ENV === 'development') {
      // Στο development χρησιμοποιούμε το localhost:18000 (daphne/gunicorn)
      wsUrl = `ws://localhost:18000/ws/assemblies/${assemblyId}/`;
    } else {
      // Σε production (Vercel) αν δεν υπάρχει NEXT_PUBLIC_BACKEND_WS_URL,
      // δεν συνδεόμαστε και βασιζόμαστε στο REST API polling
      console.log('[useAssemblyWebSocket] WebSockets not available, falling back to polling');
      return;
    }

    const params = new URLSearchParams();
    params.set('token', token);
    if (schemaHint) params.set('schema', schemaHint);
    const wsUrlWithAuth = `${wsUrl}?${params.toString()}`;

    console.log('[useAssemblyWebSocket] Connecting to:', wsUrlWithAuth);

    const connect = () => {
      const ws = new WebSocket(wsUrlWithAuth);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[useAssemblyWebSocket] Connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[useAssemblyWebSocket] Message received:', data.type);

          if (data.type === 'vote_update') {
            // Ενημέρωση αποτελεσμάτων συγκεκριμένου θέματος
            queryClient.invalidateQueries({ queryKey: ['agenda-item-votes', data.agenda_item_id] });
          } else if (data.type === 'item_update') {
            // Ενημέρωση συνολικής κατάστασης συνέλευσης ή αλλαγή θέματος
            queryClient.invalidateQueries({ queryKey: ['assembly-live-status', assemblyId] });
            queryClient.invalidateQueries({ queryKey: ['assembly', assemblyId] });
            queryClient.invalidateQueries({ queryKey: ['agenda-items', assemblyId] });
          }
        } catch (err) {
          console.error('[useAssemblyWebSocket] Error parsing message:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('[useAssemblyWebSocket] WebSocket error:', err);
      };

      ws.onclose = (event) => {
        console.log('[useAssemblyWebSocket] WebSocket closed', event.reason);
        // Προαιρετικά: Implement reconnection logic here αν χρειαστεί
      };
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isAuthenticated, assemblyId, queryClient]);

  return wsRef.current;
}

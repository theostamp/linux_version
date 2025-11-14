'use client';

import { useEffect, useCallback, useRef, useState } from 'react';

interface VoiceCommand {
  type: 'voice_command';
  action: string;
  index?: number;
  name: string;
  timestamp: number;
}

interface OfflineVoiceNavigationOptions {
  onSlideChange: (slideIndex: number) => void;
  onCommand: (command: string) => void;
  totalSlides: number;
  enabled?: boolean;
  websocketUrl?: string;
}

/**
 * Offline Voice Navigation Hook
 *
 * Connects to Python keyword spotter via WebSocket
 * 100% offline - no internet required!
 */
export function useOfflineVoiceNavigation({
  onSlideChange,
  onCommand,
  totalSlides,
  enabled = true,
  websocketUrl = 'ws://localhost:8765'
}: OfflineVoiceNavigationOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_INTERVAL = 3000; // 3 seconds

  // Process voice command
  const processCommand = useCallback((command: VoiceCommand) => {
    console.log('🎤 Voice command received:', command);
    setLastCommand(command.name);
    setError(null);

    switch (command.action) {
      case 'slide':
        if (command.index !== undefined && command.index < totalSlides) {
          onSlideChange(command.index);
          onCommand(`slide_${command.index}`);
        }
        break;

      case 'next':
        onCommand('next');
        break;

      case 'previous':
        onCommand('previous');
        break;

      case 'home':
        onSlideChange(0);
        onCommand('home');
        break;

      case 'pause':
        onCommand('pause');
        break;

      case 'resume':
        onCommand('resume');
        break;

      default:
        console.warn('Unknown action:', command.action);
    }
  }, [onSlideChange, onCommand, totalSlides]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!enabled) return;

    try {
      console.log(`🔌 Connecting to keyword spotter: ${websocketUrl}`);
      const ws = new WebSocket(websocketUrl);

      ws.onopen = () => {
        console.log('✅ Connected to keyword spotter');
        setIsConnected(true);
        setIsListening(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as VoiceCommand;
          if (data.type === 'voice_command') {
            processCommand(data);
          }
        } catch (err) {
          console.error('Failed to parse message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('❌ WebSocket error:', event);
        setError('Σφάλμα σύνδεσης με το σύστημα αναγνώρισης φωνής');
      };

      ws.onclose = () => {
        console.log('📡 Disconnected from keyword spotter');
        setIsConnected(false);
        setIsListening(false);
        wsRef.current = null;

        // Auto-reconnect
        if (enabled && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          console.log(`🔄 Reconnecting... (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, RECONNECT_INTERVAL);
        } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          setError('Δεν είναι δυνατή η σύνδεση με το σύστημα φωνής');
        }
      };

      wsRef.current = ws;

    } catch (err) {
      console.error('Failed to connect:', err);
      setError('Αποτυχία σύνδεσης');
    }
  }, [enabled, websocketUrl, processCommand]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
    setIsListening(false);
  }, []);

  // Connect/disconnect based on enabled state
  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  // Manual control functions
  const startListening = useCallback(() => {
    if (!isConnected) {
      connect();
    }
  }, [isConnected, connect]);

  const stopListening = useCallback(() => {
    disconnect();
  }, [disconnect]);

  return {
    isConnected,
    isListening,
    lastCommand,
    error,
    startListening,
    stopListening
  };
}

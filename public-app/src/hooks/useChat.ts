'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import type {
  ChatRoom,
  ChatMessage,
  ChatParticipant,
  WebSocketIncomingMessage,
  WebSocketOutgoingMessage,
  ChatMessageType,
  SenderRole,
  UseChatReturn,
} from '@/types/chat';

/**
 * Hook για διαχείριση chat σε ένα κτίριο
 * Υποστηρίζει WebSocket real-time messaging και REST API fallback
 */
export function useChat(buildingId: number | null): UseChatReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<number, string>>(new Map());
  const [unreadCount, setUnreadCount] = useState(0);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const typingTimeoutRef = useRef<Map<number, NodeJS.Timeout>>(new Map());

  /**
   * Φόρτωση αρχικών μηνυμάτων από REST API
   */
  const loadMessages = useCallback(async () => {
    if (!buildingId) return;
    
    try {
      // Πρώτα δημιούργησε ή βρες το chat room για το κτίριο
      let room: ChatRoom | null = null;
      
      try {
        // Δοκίμασε να πάρεις ή να δημιουργήσεις το chat room
        const response = await apiPost<{ chat_room: ChatRoom; created: boolean }>(
          '/chat/rooms/get_or_create_for_building/',
          { building_id: buildingId }
        );
        room = response.chat_room;
        console.log('[useChat] Chat room:', response.created ? 'δημιουργήθηκε' : 'βρέθηκε');
      } catch {
        // Fallback: Ψάξε στα υπάρχοντα rooms
        const rooms = await apiGet<ChatRoom[] | { results: ChatRoom[] }>('/chat/rooms/');
        const roomsList = Array.isArray(rooms) ? rooms : rooms.results || [];
        room = roomsList.find(r => r.building.id === buildingId) || null;
      }
      
      if (!room) {
        console.log('[useChat] Δεν βρέθηκε chat room');
        return;
      }
      
      // Φόρτωσε τα μηνύματα
      const messageData = await apiGet<{ results?: ChatMessage[] } | ChatMessage[]>(
        '/chat/messages/',
        { chat_room: room.id, ordering: '-created_at', page_size: 50 }
      );
      
      const loadedMessages = Array.isArray(messageData) 
        ? messageData 
        : messageData.results || [];
      
      // Αντιστροφή για χρονολογική σειρά (παλιότερα πρώτα)
      setMessages(loadedMessages.reverse());
      
      // Φόρτωσε τους συμμετέχοντες
      const participantsData = await apiGet<{ participants: ChatParticipant[] }>(
        `/chat/rooms/${room.id}/participants/`
      );
      setParticipants(participantsData.participants || []);
      
      // Φόρτωσε τις ειδοποιήσεις
      try {
        const notifications = await apiGet<{ unread_count: number }>(
          `/chat/rooms/${room.id}/notifications/`
        );
        setUnreadCount(notifications.unread_count || 0);
      } catch {
        // Ignore notification errors
      }
    } catch (err) {
      console.error('[useChat] Σφάλμα φόρτωσης μηνυμάτων:', err);
      // Don't set error for initial load failures - chat may not exist yet
    }
  }, [buildingId]);

  /**
   * Σύνδεση στο WebSocket
   */
  const connect = useCallback(() => {
    if (!buildingId || wsRef.current?.readyState === WebSocket.OPEN) return;
    
    setIsConnecting(true);
    setError(null);
    
    try {
      // Determine WebSocket URL
      const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss' : 'ws';
      
      // Get the WebSocket host from environment or construct from current location
      let wsHost: string;
      if (typeof window !== 'undefined') {
        // Production: use current host with backend port or specific backend URL
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_WS_URL;
        if (backendUrl) {
          wsHost = backendUrl;
        } else {
          // Default: assume backend is on port 18000 locally or same host in production
          const host = window.location.hostname;
          const port = process.env.NODE_ENV === 'development' ? ':18000' : '';
          wsHost = `${host}${port}`;
        }
      } else {
        wsHost = 'localhost:18000';
      }
      
      const wsUrl = `${protocol}://${wsHost}/ws/chat/${buildingId}/`;
      console.log('[useChat] Σύνδεση στο WebSocket:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log('[useChat] WebSocket συνδέθηκε');
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        reconnectAttemptsRef.current = 0;
        
        // Φόρτωσε τα υπάρχοντα μηνύματα
        loadMessages();
      };
      
      ws.onmessage = (event) => {
        try {
          const data: WebSocketIncomingMessage = JSON.parse(event.data);
          console.log('[useChat] WebSocket μήνυμα:', data.type);
          
          switch (data.type) {
            case 'chat_message':
              const newMessage: ChatMessage = {
                id: data.message_id!,
                sender_id: data.sender_id!,
                sender_name: data.sender_name!,
                sender_role: data.sender_role as SenderRole,
                message_type: (data.message_type || 'text') as ChatMessageType,
                content: data.content!,
                file_url: data.file_url,
                file_name: data.file_name,
                file_size: data.file_size,
                is_edited: false,
                created_at: data.timestamp || new Date().toISOString(),
              };
              setMessages(prev => [...prev, newMessage]);
              setUnreadCount(prev => prev + 1);
              
              // Remove typing indicator for this user
              if (data.sender_id) {
                setTypingUsers(prev => {
                  const newMap = new Map(prev);
                  newMap.delete(data.sender_id!);
                  return newMap;
                });
              }
              break;
              
            case 'user_join':
              // Ενημέρωση λίστας συμμετεχόντων
              console.log('[useChat] Χρήστης εισήλθε:', data.user_name);
              break;
              
            case 'user_leave':
              console.log('[useChat] Χρήστης αποχώρησε:', data.user_name);
              break;
              
            case 'typing_indicator':
              if (data.user_id && data.user_name) {
                if (data.is_typing) {
                  setTypingUsers(prev => {
                    const newMap = new Map(prev);
                    newMap.set(data.user_id!, data.user_name!);
                    return newMap;
                  });
                  
                  // Clear existing timeout
                  const existingTimeout = typingTimeoutRef.current.get(data.user_id);
                  if (existingTimeout) clearTimeout(existingTimeout);
                  
                  // Auto-remove typing indicator after 3 seconds
                  const timeout = setTimeout(() => {
                    setTypingUsers(prev => {
                      const newMap = new Map(prev);
                      newMap.delete(data.user_id!);
                      return newMap;
                    });
                  }, 3000);
                  typingTimeoutRef.current.set(data.user_id, timeout);
                } else {
                  setTypingUsers(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(data.user_id!);
                    return newMap;
                  });
                }
              }
              break;
              
            case 'read_receipt':
              // Ενημέρωση αν ο χρήστης διάβασε τα μηνύματα
              console.log('[useChat] Απόδειξη ανάγνωσης από:', data.user_name);
              break;
          }
        } catch (err) {
          console.error('[useChat] Σφάλμα ανάλυσης μηνύματος:', err);
        }
      };
      
      ws.onerror = (event) => {
        console.error('[useChat] WebSocket σφάλμα:', event);
        setError('Σφάλμα σύνδεσης στο chat');
      };
      
      ws.onclose = (event) => {
        console.log('[useChat] WebSocket αποσυνδέθηκε:', event.code, event.reason);
        setIsConnected(false);
        setIsConnecting(false);
        wsRef.current = null;
        
        // Attempt reconnection with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts && event.code !== 1000) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`[useChat] Επανασύνδεση σε ${delay}ms (απόπειρα ${reconnectAttemptsRef.current + 1})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };
    } catch (err) {
      console.error('[useChat] Σφάλμα δημιουργίας WebSocket:', err);
      setIsConnecting(false);
      setError('Αποτυχία σύνδεσης στο chat');
    }
  }, [buildingId, loadMessages]);

  /**
   * Αποσύνδεση από το WebSocket
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    
    // Clear typing timeouts
    typingTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
    typingTimeoutRef.current.clear();
  }, []);

  /**
   * Αποστολή μηνύματος
   */
  const sendMessage = useCallback((content: string, messageType: ChatMessageType = 'text') => {
    if (!content.trim()) return;
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const outgoingMessage: WebSocketOutgoingMessage = {
        type: 'message',
        message: content.trim(),
        message_type: messageType,
      };
      wsRef.current.send(JSON.stringify(outgoingMessage));
    } else {
      // Fallback: Αποστολή μέσω REST API
      console.log('[useChat] WebSocket δεν είναι συνδεδεμένο, χρήση REST API');
      (async () => {
        try {
          const rooms = await apiGet<ChatRoom[]>('/chat/rooms/', { building: buildingId });
          const room = rooms.find(r => r.building.id === buildingId);
          
          if (room) {
            await apiPost('/chat/messages/', {
              chat_room: room.id,
              content: content.trim(),
              message_type: messageType,
            });
            // Reload messages after sending
            loadMessages();
          }
        } catch (err) {
          console.error('[useChat] Σφάλμα αποστολής μηνύματος:', err);
          setError('Αποτυχία αποστολής μηνύματος');
        }
      })();
    }
  }, [buildingId, loadMessages]);

  /**
   * Αποστολή δείκτη πληκτρολόγησης
   */
  const sendTypingIndicator = useCallback((isTyping: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const outgoingMessage: WebSocketOutgoingMessage = {
        type: 'typing',
        is_typing: isTyping,
      };
      wsRef.current.send(JSON.stringify(outgoingMessage));
    }
  }, []);

  /**
   * Σήμανση μηνυμάτων ως διαβασμένα
   */
  const markAsRead = useCallback((messageId?: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const outgoingMessage: WebSocketOutgoingMessage = {
        type: 'read',
        message_id: messageId,
      };
      wsRef.current.send(JSON.stringify(outgoingMessage));
    }
    
    // Reset local unread count
    setUnreadCount(0);
  }, []);

  // Αυτόματη σύνδεση όταν αλλάζει το buildingId
  useEffect(() => {
    if (buildingId) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [buildingId, connect, disconnect]);

  return {
    isConnected,
    isConnecting,
    error,
    messages,
    participants,
    typingUsers,
    unreadCount,
    sendMessage,
    sendTypingIndicator,
    markAsRead,
    connect,
    disconnect,
  };
}

/**
 * Hook για λήψη όλων των chat rooms του χρήστη
 */
export function useChatRooms() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalUnread, setTotalUnread] = useState(0);

  const loadRooms = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await apiGet<ChatRoom[] | { results: ChatRoom[] }>('/chat/rooms/');
      const roomsList = Array.isArray(data) ? data : data.results || [];
      setRooms(roomsList);
      
      // Calculate total unread
      const total = roomsList.reduce((sum, room) => sum + (room.unread_count || 0), 0);
      setTotalUnread(total);
    } catch (err) {
      console.error('[useChatRooms] Σφάλμα φόρτωσης chat rooms:', err);
      setError('Αποτυχία φόρτωσης chat rooms');
      setRooms([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  return {
    rooms,
    isLoading,
    error,
    totalUnread,
    refetch: loadRooms,
  };
}

/**
 * Hook για συνολικό αριθμό μη διαβασμένων μηνυμάτων
 */
export function useChatUnreadCount() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadUnreadCount = useCallback(async () => {
    try {
      const data = await apiGet<{ unread_count: number }>('/chat/messages/unread_count/');
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      console.error('[useChatUnreadCount] Σφάλμα:', err);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUnreadCount();
    
    // Poll every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [loadUnreadCount]);

  return { unreadCount, isLoading, refetch: loadUnreadCount };
}

export default useChat;


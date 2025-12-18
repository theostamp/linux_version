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
  MessageReaction,
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
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingMode = useRef(false);
  
  // Online users tracking
  const [onlineUsers, setOnlineUsers] = useState<Map<number, { name: string; isOnline: boolean }>>(new Map());

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
      // Get WebSocket URL from environment or use Railway backend directly
      // Note: Vercel doesn't support WebSocket, so we connect directly to Railway backend
      let wsUrl: string;
      
      if (typeof window !== 'undefined') {
        const backendWsUrl = process.env.NEXT_PUBLIC_BACKEND_WS_URL;
        
        if (backendWsUrl) {
          // Use explicit WebSocket URL from environment
          wsUrl = `${backendWsUrl}/ws/chat/${buildingId}/`;
        } else if (process.env.NODE_ENV === 'development') {
          // Development: use local backend
          wsUrl = `ws://localhost:18000/ws/chat/${buildingId}/`;
        } else {
          // Production: WebSocket not available through Vercel
          // Skip WebSocket connection and rely on REST API polling
          console.log('[useChat] WebSocket δεν είναι διαθέσιμο σε production (Vercel). Χρήση REST API polling.');
          setIsConnecting(false);
          setIsConnected(true); // Consider "connected" for UI purposes
          isPollingMode.current = true;
          
          // Load messages via REST API
          loadMessages();
          
          // Start polling every 5 seconds
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
          pollingIntervalRef.current = setInterval(() => {
            loadMessages();
          }, 5000);
          
          // Start heartbeat interval for REST mode (every 20 seconds)
          if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
          }
          heartbeatIntervalRef.current = setInterval(async () => {
            try {
              await apiPost('/chat/online/heartbeat/', {});
            } catch (err) {
              console.log('[useChat] Heartbeat failed:', err);
            }
          }, 20000);
          
          // Send initial heartbeat
          apiPost('/chat/online/heartbeat/', {}).catch(() => {});
          
          return;
        }
      } else {
        wsUrl = `ws://localhost:18000/ws/chat/${buildingId}/`;
      }
      
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
        
        // Start heartbeat interval (every 20 seconds)
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        heartbeatIntervalRef.current = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'heartbeat' }));
          }
        }, 20000);
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
                reply_to: data.reply_to,
                reply_to_data: data.reply_to_data,
                reactions: [],
                is_edited: false,
                is_deleted: false,
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
              
            case 'message_reaction':
              // Ενημέρωση reactions σε μήνυμα
              if (data.message_id && data.reactions) {
                setMessages(prev => prev.map(msg => 
                  msg.id === data.message_id 
                    ? { ...msg, reactions: data.reactions as MessageReaction[] }
                    : msg
                ));
              }
              break;
              
            case 'message_edited':
              // Ενημέρωση περιεχομένου μηνύματος
              if (data.message_id) {
                setMessages(prev => prev.map(msg => 
                  msg.id === data.message_id 
                    ? { ...msg, content: data.content!, is_edited: true, edited_at: data.edited_at }
                    : msg
                ));
              }
              break;
              
            case 'message_deleted':
              // Σήμανση μηνύματος ως διαγραμμένο
              if (data.message_id) {
                setMessages(prev => prev.map(msg => 
                  msg.id === data.message_id 
                    ? { ...msg, is_deleted: true, deleted_at: data.deleted_at }
                    : msg
                ));
              }
              break;
              
            case 'presence_update':
              // Ενημέρωση online status χρήστη
              if (data.user_id) {
                setOnlineUsers(prev => {
                  const newMap = new Map(prev);
                  newMap.set(data.user_id!, {
                    name: data.user_name || 'Unknown',
                    isOnline: data.is_typing !== false // default true
                  });
                  return newMap;
                });
                // Ενημέρωση και του participants list
                setParticipants(prev => prev.map(p => 
                  p.user?.id === data.user_id
                    ? { ...p, is_online: data.is_typing !== false }
                    : p
                ));
              }
              break;
              
            case 'heartbeat_ack':
              // Heartbeat acknowledged - connection is healthy
              console.log('[useChat] Heartbeat acknowledged');
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
    
    // Clear polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    // Clear heartbeat interval
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    // Send go offline signal (fire and forget)
    if (isPollingMode.current) {
      apiPost('/chat/online/go_offline/', {}).catch(() => {});
    }
    
    isPollingMode.current = false;
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    setOnlineUsers(new Map());
    
    // Clear typing timeouts
    typingTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
    typingTimeoutRef.current.clear();
  }, []);

  /**
   * Αποστολή μηνύματος
   */
  const sendMessage = useCallback((content: string, messageType: ChatMessageType = 'text', replyToId?: number) => {
    if (!content.trim()) return;
    
    // In polling mode or when WebSocket is not open, use REST API
    if (isPollingMode.current || wsRef.current?.readyState !== WebSocket.OPEN) {
      // Send via REST API
      console.log('[useChat] Αποστολή μέσω REST API');
      (async () => {
        try {
          // First, ensure we have a chat room
          const response = await apiPost<{ chat_room: ChatRoom }>('/chat/rooms/get_or_create_for_building/', {
            building_id: buildingId,
          });
          
          if (response.chat_room) {
            await apiPost('/chat/messages/', {
              chat_room: response.chat_room.id,
              content: content.trim(),
              message_type: messageType,
              reply_to: replyToId,
            });
            // Reload messages after sending
            loadMessages();
          }
        } catch (err) {
          console.error('[useChat] Σφάλμα αποστολής μηνύματος:', err);
          setError('Αποτυχία αποστολής μηνύματος');
        }
      })();
    } else {
      // Send via WebSocket
      const outgoingMessage: WebSocketOutgoingMessage = {
        type: 'message',
        message: content.trim(),
        message_type: messageType,
        reply_to: replyToId,
      };
      wsRef.current.send(JSON.stringify(outgoingMessage));
    }
  }, [buildingId, loadMessages]);

  /**
   * Toggle reaction σε μήνυμα
   */
  const toggleReaction = useCallback((messageId: number, emoji: string) => {
    if (isPollingMode.current || wsRef.current?.readyState !== WebSocket.OPEN) {
      // Use REST API
      (async () => {
        try {
          await apiPost(`/chat/messages/${messageId}/add_reaction/`, { emoji });
          loadMessages();
        } catch (err) {
          console.error('[useChat] Σφάλμα reaction:', err);
        }
      })();
    } else {
      // Send via WebSocket
      const outgoingMessage: WebSocketOutgoingMessage = {
        type: 'reaction',
        message_id: messageId,
        emoji,
      };
      wsRef.current.send(JSON.stringify(outgoingMessage));
    }
  }, [loadMessages]);

  /**
   * Επεξεργασία μηνύματος
   */
  const editMessage = useCallback((messageId: number, newContent: string) => {
    if (!newContent.trim()) return;
    
    if (isPollingMode.current || wsRef.current?.readyState !== WebSocket.OPEN) {
      // Use REST API
      (async () => {
        try {
          await apiPost(`/chat/messages/${messageId}/edit/`, { content: newContent.trim() });
          loadMessages();
        } catch (err) {
          console.error('[useChat] Σφάλμα επεξεργασίας:', err);
          setError('Αποτυχία επεξεργασίας μηνύματος');
        }
      })();
    } else {
      // Send via WebSocket
      const outgoingMessage: WebSocketOutgoingMessage = {
        type: 'edit',
        message_id: messageId,
        content: newContent.trim(),
      };
      wsRef.current.send(JSON.stringify(outgoingMessage));
    }
  }, [loadMessages]);

  /**
   * Διαγραφή μηνύματος (soft delete)
   */
  const deleteMessage = useCallback((messageId: number) => {
    if (isPollingMode.current || wsRef.current?.readyState !== WebSocket.OPEN) {
      // Use REST API
      (async () => {
        try {
          await apiPost(`/chat/messages/${messageId}/delete_message/`, {});
          loadMessages();
        } catch (err) {
          console.error('[useChat] Σφάλμα διαγραφής:', err);
          setError('Αποτυχία διαγραφής μηνύματος');
        }
      })();
    } else {
      // Send via WebSocket
      const outgoingMessage: WebSocketOutgoingMessage = {
        type: 'delete',
        message_id: messageId,
      };
      wsRef.current.send(JSON.stringify(outgoingMessage));
    }
  }, [loadMessages]);

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
    onlineUsers,
    sendMessage,
    sendTypingIndicator,
    markAsRead,
    toggleReaction,
    editMessage,
    deleteMessage,
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

// =============================================================================
// DIRECT MESSAGING Hooks
// =============================================================================

import type {
  DirectConversation,
  DirectMessage,
  BuildingUser,
  BuildingUsersResponse,
  CreateDirectConversationPayload,
  SendDirectMessagePayload,
} from '@/types/chat';

/**
 * Hook για λίστα online χρηστών ενός κτιρίου
 */
export function useBuildingUsers(buildingId: number | null) {
  const [users, setUsers] = useState<BuildingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);

  const loadUsers = useCallback(async () => {
    if (!buildingId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await apiGet<BuildingUsersResponse>(
        '/chat/online/building_users/',
        { building_id: buildingId }
      );
      setUsers(data.users || []);
      setOnlineCount(data.online_count || 0);
    } catch (err) {
      console.error('[useBuildingUsers] Σφάλμα:', err);
      setError('Αποτυχία φόρτωσης χρηστών');
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [buildingId]);

  useEffect(() => {
    loadUsers();
    
    // Poll every 10 seconds for online status updates (more frequent for real-time feel)
    const interval = setInterval(loadUsers, 10000);
    return () => clearInterval(interval);
  }, [loadUsers]);

  return {
    users,
    onlineUsers: users.filter(u => u.is_online),
    offlineUsers: users.filter(u => !u.is_online),
    onlineCount,
    totalCount: users.length,
    isLoading,
    error,
    refetch: loadUsers,
  };
}

/**
 * Hook για διαχείριση ιδιωτικών συνομιλιών
 */
export function useDirectConversations() {
  const [conversations, setConversations] = useState<DirectConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalUnread, setTotalUnread] = useState(0);

  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await apiGet<DirectConversation[] | { results: DirectConversation[] }>(
        '/chat/direct/'
      );
      const convList = Array.isArray(data) ? data : data.results || [];
      setConversations(convList);
      
      // Calculate total unread
      const unread = convList.reduce((sum, c) => sum + (c.unread_count || 0), 0);
      setTotalUnread(unread);
    } catch (err) {
      console.error('[useDirectConversations] Σφάλμα:', err);
      setError('Αποτυχία φόρτωσης συνομιλιών');
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    
    // Poll every 10 seconds for new messages
    const interval = setInterval(loadConversations, 10000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  const startConversation = useCallback(async (payload: CreateDirectConversationPayload) => {
    try {
      const response = await apiPost<{ conversation: DirectConversation; created: boolean }>(
        '/chat/direct/start_conversation/',
        payload
      );
      
      // Refresh conversations list
      loadConversations();
      
      return response;
    } catch (err) {
      console.error('[useDirectConversations] Σφάλμα έναρξης συνομιλίας:', err);
      throw err;
    }
  }, [loadConversations]);

  return {
    conversations,
    totalUnread,
    isLoading,
    error,
    startConversation,
    refetch: loadConversations,
  };
}

/**
 * Hook για μια συγκεκριμένη ιδιωτική συνομιλία
 */
export function useDirectChat(conversationId: number | null) {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMessages = useCallback(async () => {
    if (!conversationId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await apiGet<{ messages: DirectMessage[]; total: number }>(
        `/chat/direct/${conversationId}/messages/`,
        { page_size: 100 }
      );
      setMessages(data.messages || []);
    } catch (err) {
      console.error('[useDirectChat] Σφάλμα φόρτωσης μηνυμάτων:', err);
      setError('Αποτυχία φόρτωσης μηνυμάτων');
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    loadMessages();
    
    // Poll every 5 seconds for new messages
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  const sendMessage = useCallback(async (payload: SendDirectMessagePayload) => {
    if (!conversationId) return;
    
    setIsSending(true);
    setError(null);
    
    try {
      const newMessage = await apiPost<DirectMessage>(
        `/chat/direct/${conversationId}/send_message/`,
        payload
      );
      
      // Add message to list immediately
      setMessages(prev => [...prev, newMessage]);
      
      return newMessage;
    } catch (err) {
      console.error('[useDirectChat] Σφάλμα αποστολής:', err);
      setError('Αποτυχία αποστολής μηνύματος');
      throw err;
    } finally {
      setIsSending(false);
    }
  }, [conversationId]);

  const markAsRead = useCallback(async () => {
    if (!conversationId) return;
    
    try {
      await apiPost(`/chat/direct/${conversationId}/mark_as_read/`, {});
    } catch (err) {
      console.error('[useDirectChat] Σφάλμα mark as read:', err);
    }
  }, [conversationId]);

  return {
    messages,
    isLoading,
    isSending,
    error,
    sendMessage,
    markAsRead,
    refetch: loadMessages,
  };
}

/**
 * Hook για συνολικά μη διαβασμένα ιδιωτικά μηνύματα
 */
export function useDirectMessagesUnreadCount() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadUnreadCount = useCallback(async () => {
    try {
      const data = await apiGet<{ unread_count: number }>('/chat/direct-messages/unread_count/');
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      console.error('[useDirectMessagesUnreadCount] Σφάλμα:', err);
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


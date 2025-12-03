// Chat Types for the building communication system

import type { User } from './user';

/**
 * Chat Room - Κάθε κτίριο έχει ένα chat room
 */
export type ChatRoom = {
  id: number;
  building: {
    id: number;
    name: string;
    address?: string;
  };
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  participants_count: number;
  unread_count: number;
};

/**
 * Τύποι μηνυμάτων
 */
export type ChatMessageType = 'text' | 'image' | 'file' | 'system';

/**
 * Ρόλος αποστολέα στο κτίριο
 */
export type SenderRole = 'manager' | 'resident' | 'internal_manager' | 'other';

/**
 * Chat Message - Μήνυμα στο chat
 */
export type ChatMessage = {
  id: number;
  chat_room?: ChatRoom;
  sender_id: number;
  sender_name: string;
  sender_role: SenderRole;
  sender?: {
    id: number;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  message_type: ChatMessageType;
  content: string;
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  is_edited: boolean;
  edited_at?: string | null;
  created_at: string;
  updated_at?: string;
};

/**
 * Chat Participant - Συμμετέχων στο chat
 */
export type ChatParticipant = {
  id: number;
  user: User;
  user_name: string;
  user_email: string;
  is_online: boolean;
  last_seen: string;
  joined_at: string;
};

/**
 * Chat Notification - Ειδοποίηση για μη διαβασμένα μηνύματα
 */
export type ChatNotification = {
  id: number;
  chat_room: ChatRoom;
  unread_count: number;
  last_read_at: string;
  updated_at: string;
};

/**
 * WebSocket Message Types
 */
export type WebSocketMessageType = 
  | 'chat_message' 
  | 'user_join' 
  | 'user_leave' 
  | 'typing_indicator' 
  | 'read_receipt'
  | 'event';

/**
 * WebSocket Incoming Message (from server)
 */
export type WebSocketIncomingMessage = {
  type: WebSocketMessageType;
  message_id?: number;
  sender_id?: number;
  sender_name?: string;
  sender_role?: SenderRole;
  content?: string;
  message_type?: ChatMessageType;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  user_id?: number;
  user_name?: string;
  is_typing?: boolean;
  timestamp?: string;
  event?: string;
  payload?: Record<string, unknown>;
};

/**
 * WebSocket Outgoing Message (to server)
 */
export type WebSocketOutgoingMessage = {
  type: 'message' | 'typing' | 'read';
  message?: string;
  message_type?: ChatMessageType;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  is_typing?: boolean;
  message_id?: number;
};

/**
 * Create Chat Room Payload
 */
export type CreateChatRoomPayload = {
  building_id: number;
  name: string;
  is_active?: boolean;
};

/**
 * Create Chat Message Payload
 */
export type CreateChatMessagePayload = {
  chat_room: number;
  content: string;
  message_type?: ChatMessageType;
  file_url?: string;
  file_name?: string;
  file_size?: number;
};

/**
 * Mark Messages as Read Payload
 */
export type MarkAsReadPayload = {
  chat_room_id: number;
  last_message_id?: number;
};

/**
 * Chat State for hooks
 */
export type ChatState = {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  messages: ChatMessage[];
  participants: ChatParticipant[];
  typingUsers: Map<number, string>; // user_id -> user_name
  unreadCount: number;
};

/**
 * Chat Actions
 */
export type ChatActions = {
  sendMessage: (content: string, messageType?: ChatMessageType) => void;
  sendTypingIndicator: (isTyping: boolean) => void;
  markAsRead: (messageId?: number) => void;
  connect: () => void;
  disconnect: () => void;
};

/**
 * Use Chat Return Type
 */
export type UseChatReturn = ChatState & ChatActions;

// =============================================================================
// DIRECT MESSAGING (Private Chat) Types
// =============================================================================

/**
 * Online Status - Κατάσταση σύνδεσης χρήστη
 */
export type OnlineStatus = {
  user_id: number;
  user_name: string;
  user_email: string;
  user_role: 'manager' | 'resident' | 'internal_manager' | 'superuser' | 'other';
  is_online: boolean;
  last_activity: string | null;
  status_message: string | null;
};

/**
 * Building User - Χρήστης κτιρίου με online status
 */
export type BuildingUser = {
  id: number;
  name: string;
  email: string;
  role: 'manager' | 'resident';
  is_online: boolean;
  last_activity: string | null;
  status_message: string | null;
};

/**
 * Building Users Response
 */
export type BuildingUsersResponse = {
  building_id: number;
  building_name: string;
  users: BuildingUser[];
  online_count: number;
  total_count: number;
};

/**
 * Direct Conversation - Ιδιωτική συνομιλία
 */
export type DirectConversation = {
  id: number;
  other_participant: {
    id: number;
    name: string;
    email: string;
  };
  building_name: string;
  last_message: {
    id: number;
    content: string;
    sender_name: string;
    created_at: string;
    is_read: boolean;
  } | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
};

/**
 * Direct Message - Ιδιωτικό μήνυμα
 */
export type DirectMessage = {
  id: number;
  conversation: number;
  sender_id: number;
  sender_name: string;
  sender_email: string;
  recipient_id: number;
  recipient_name: string;
  message_type: 'text' | 'image' | 'file';
  content: string;
  file_url?: string | null;
  file_name?: string | null;
  is_read: boolean;
  read_at: string | null;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * Create Direct Conversation Payload
 */
export type CreateDirectConversationPayload = {
  recipient_id: number;
  building_id: number;
  initial_message?: string;
};

/**
 * Send Direct Message Payload
 */
export type SendDirectMessagePayload = {
  content: string;
  message_type?: 'text' | 'image' | 'file';
  file_url?: string;
  file_name?: string;
};


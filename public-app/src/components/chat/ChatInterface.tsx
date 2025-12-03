'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { el } from 'date-fns/locale';
import {
  MessageCircle,
  MessageSquare,
  Send,
  Users,
  Building2,
  Smile,
  Paperclip,
  MoreVertical,
  Check,
  CheckCheck,
  Clock,
  Wifi,
  WifiOff,
  ChevronLeft,
  Search,
  Phone,
  Video,
  Info,
  Settings,
  User,
  Crown,
  Home,
  Image as ImageIcon,
  File,
  X,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChat, useChatRooms, useDirectMessagesUnreadCount } from '@/hooks/useChat';
import { useAuth } from '@/components/contexts/AuthContext';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { OnlineUsersList } from './OnlineUsersList';
import { DirectChatPanel } from './DirectChatPanel';
import type { ChatMessage, ChatRoom, ChatParticipant, SenderRole, BuildingUser } from '@/types/chat';

// Tab types for the chat interface
type ChatTab = 'group' | 'users' | 'direct';

// Role labels and colors
const roleConfig: Record<SenderRole, { label: string; color: string; icon: React.ReactNode }> = {
  manager: { 
    label: 'Διαχειριστής', 
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: <Crown className="w-3 h-3" />
  },
  internal_manager: { 
    label: 'Εσωτ. Διαχειριστής', 
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: <Settings className="w-3 h-3" />
  },
  resident: { 
    label: 'Κάτοικος', 
    color: 'bg-sky-100 text-sky-800 border-sky-200',
    icon: <Home className="w-3 h-3" />
  },
  other: { 
    label: 'Χρήστης', 
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: <User className="w-3 h-3" />
  },
};

/**
 * Format date for message grouping
 */
function formatMessageDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return 'Σήμερα';
  if (isYesterday(date)) return 'Χθες';
  return format(date, 'EEEE, d MMMM yyyy', { locale: el });
}

/**
 * Format time for message timestamp
 */
function formatMessageTime(dateStr: string): string {
  return format(new Date(dateStr), 'HH:mm');
}

/**
 * Group messages by date
 */
function groupMessagesByDate(messages: ChatMessage[]): Map<string, ChatMessage[]> {
  const groups = new Map<string, ChatMessage[]>();
  
  messages.forEach(message => {
    const dateKey = format(new Date(message.created_at), 'yyyy-MM-dd');
    const existing = groups.get(dateKey) || [];
    groups.set(dateKey, [...existing, message]);
  });
  
  return groups;
}

/**
 * Single Chat Message Component
 */
function ChatMessageItem({ 
  message, 
  isOwn,
  showAvatar,
  isFirstInGroup,
  isLastInGroup,
}: { 
  message: ChatMessage;
  isOwn: boolean;
  showAvatar: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
}) {
  const roleInfo = roleConfig[message.sender_role] || roleConfig.other;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex gap-2',
        isOwn ? 'flex-row-reverse' : 'flex-row',
        !isLastInGroup && 'mb-0.5',
        isLastInGroup && 'mb-3'
      )}
    >
      {/* Avatar */}
      <div className={cn('w-8 h-8 flex-shrink-0', !showAvatar && 'invisible')}>
        {showAvatar && (
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold',
            isOwn 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-slate-200 text-slate-700'
          )}>
            {message.sender_name?.charAt(0).toUpperCase() || '?'}
          </div>
        )}
      </div>
      
      {/* Message Content */}
      <div className={cn(
        'max-w-[70%] flex flex-col',
        isOwn ? 'items-end' : 'items-start'
      )}>
        {/* Sender name and role (only for first in group) */}
        {isFirstInGroup && !isOwn && (
          <div className="flex items-center gap-2 mb-1 px-1">
            <span className="text-xs font-semibold text-slate-700">
              {message.sender_name}
            </span>
            <span className={cn(
              'inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border',
              roleInfo.color
            )}>
              {roleInfo.icon}
              {roleInfo.label}
            </span>
          </div>
        )}
        
        {/* Message bubble */}
        <div className={cn(
          'relative px-3 py-2 shadow-sm',
          isOwn 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-white text-slate-800 border border-slate-200',
          // Border radius based on position in group
          isFirstInGroup && isLastInGroup && 'rounded-2xl',
          isFirstInGroup && !isLastInGroup && (isOwn ? 'rounded-2xl rounded-br-md' : 'rounded-2xl rounded-bl-md'),
          !isFirstInGroup && isLastInGroup && (isOwn ? 'rounded-2xl rounded-tr-md' : 'rounded-2xl rounded-tl-md'),
          !isFirstInGroup && !isLastInGroup && (isOwn ? 'rounded-l-2xl rounded-r-md' : 'rounded-r-2xl rounded-l-md')
        )}>
          {/* File attachment */}
          {message.file_url && (
            <a 
              href={message.file_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className={cn(
                'flex items-center gap-2 mb-1 p-2 rounded-lg',
                isOwn ? 'bg-white/20' : 'bg-slate-100'
              )}
            >
              {message.message_type === 'image' ? (
                <ImageIcon className="w-4 h-4" />
              ) : (
                <File className="w-4 h-4" />
              )}
              <span className="text-xs truncate max-w-[150px]">
                {message.file_name || 'Αρχείο'}
              </span>
            </a>
          )}
          
          {/* Text content */}
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </p>
          
          {/* Time and status */}
          <div className={cn(
            'flex items-center gap-1 mt-1',
            isOwn ? 'justify-end' : 'justify-start'
          )}>
            <span className={cn(
              'text-[10px]',
              isOwn ? 'text-primary-foreground/70' : 'text-slate-400'
            )}>
              {formatMessageTime(message.created_at)}
            </span>
            {message.is_edited && (
              <span className={cn(
                'text-[10px]',
                isOwn ? 'text-primary-foreground/70' : 'text-slate-400'
              )}>
                (επεξεργασμένο)
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Typing Indicator Component
 */
function TypingIndicator({ users }: { users: Map<number, string> }) {
  if (users.size === 0) return null;
  
  const names = Array.from(users.values());
  const text = names.length === 1 
    ? `${names[0]} γράφει...`
    : names.length === 2
    ? `${names[0]} και ${names[1]} γράφουν...`
    : `${names.length} άτομα γράφουν...`;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-2 px-4 py-2"
    >
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-slate-400 rounded-full"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
      <span className="text-xs text-slate-500">{text}</span>
    </motion.div>
  );
}

/**
 * Chat Room List Item
 */
function ChatRoomItem({ 
  room, 
  isActive,
  onClick 
}: { 
  room: ChatRoom; 
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-xl transition-all',
        isActive 
          ? 'bg-primary text-primary-foreground shadow-md' 
          : 'hover:bg-slate-100'
      )}
    >
      <div className={cn(
        'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
        isActive ? 'bg-white/20' : 'bg-slate-100'
      )}>
        <Building2 className="w-6 h-6" />
      </div>
      
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between gap-2">
          <h3 className={cn(
            'font-semibold truncate text-sm',
            !isActive && 'text-slate-800'
          )}>
            {room.building.name}
          </h3>
          {room.unread_count > 0 && (
            <span className={cn(
              'flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center',
              isActive 
                ? 'bg-white text-primary' 
                : 'bg-primary text-white'
            )}>
              {room.unread_count > 99 ? '99+' : room.unread_count}
            </span>
          )}
        </div>
        <p className={cn(
          'text-xs truncate',
          isActive ? 'text-primary-foreground/70' : 'text-slate-500'
        )}>
          {room.participants_count} συμμετέχοντες
        </p>
      </div>
    </button>
  );
}

/**
 * Participants Panel
 */
function ParticipantsPanel({ 
  participants, 
  isOpen, 
  onClose 
}: { 
  participants: ChatParticipant[];
  isOpen: boolean;
  onClose: () => void;
}) {
  const onlineCount = participants.filter(p => p.is_online).length;
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          className="absolute right-0 top-0 bottom-0 w-72 bg-white border-l border-slate-200 shadow-lg z-10"
        >
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800">Συμμετέχοντες</h3>
              <p className="text-xs text-slate-500">
                {onlineCount} online / {participants.length} σύνολο
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
          
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(100% - 73px)' }}>
            {/* Online */}
            {participants.filter(p => p.is_online).length > 0 && (
              <div className="p-3">
                <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                  Συνδεδεμένοι
                </h4>
                {participants.filter(p => p.is_online).map(participant => (
                  <div key={participant.id} className="flex items-center gap-3 py-2">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600">
                        {participant.user_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">
                        {participant.user_name}
                      </p>
                      <p className="text-xs text-green-600">Online</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Offline */}
            {participants.filter(p => !p.is_online).length > 0 && (
              <div className="p-3">
                <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                  Εκτός σύνδεσης
                </h4>
                {participants.filter(p => !p.is_online).map(participant => (
                  <div key={participant.id} className="flex items-center gap-3 py-2">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-400">
                        {participant.user_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-500 truncate">
                        {participant.user_name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatDistanceToNow(new Date(participant.last_seen), { 
                          addSuffix: true, 
                          locale: el 
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Main Chat Interface Component
 */
export default function ChatInterface() {
  const { user } = useAuth();
  const { currentBuilding, buildings } = useBuilding();
  const { rooms, isLoading: roomsLoading, refetch: refetchRooms } = useChatRooms();
  const { unreadCount: directUnread } = useDirectMessagesUnreadCount();
  
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [showParticipants, setShowParticipants] = useState(false);
  const [showRoomList, setShowRoomList] = useState(true);
  
  // Tab navigation for different chat modes
  const [activeTab, setActiveTab] = useState<ChatTab>('group');
  const [selectedUserForDM, setSelectedUserForDM] = useState<BuildingUser | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Use building from context or selected
  const activeBuildingId = selectedBuildingId || currentBuilding?.id || null;

  // Handle starting a DM from online users list
  const handleStartDirectChat = (user: BuildingUser) => {
    setSelectedUserForDM(user);
    setActiveTab('direct');
  };
  
  const {
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
  } = useChat(activeBuildingId);

  // Group messages by date
  const groupedMessages = groupMessagesByDate(messages);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark as read when viewing
  useEffect(() => {
    if (isConnected && messages.length > 0 && unreadCount > 0) {
      markAsRead(messages[messages.length - 1]?.id);
    }
  }, [isConnected, messages, unreadCount, markAsRead]);

  // Handle typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    
    // Send typing indicator
    sendTypingIndicator(true);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator(false);
    }, 2000);
  };

  // Handle send message
  const handleSend = useCallback(() => {
    if (!inputValue.trim()) return;
    
    sendMessage(inputValue);
    setInputValue('');
    sendTypingIndicator(false);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, [inputValue, sendMessage, sendTypingIndicator]);

  // Handle key press (Enter to send)
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Select room
  const handleSelectRoom = (buildingId: number) => {
    setSelectedBuildingId(buildingId);
    if (window.innerWidth < 768) {
      setShowRoomList(false);
    }
  };

  // Find active room
  const activeRoom = rooms.find(r => r.building.id === activeBuildingId);

  return (
    <div className="flex h-[calc(100vh-120px)] bg-slate-50 rounded-2xl overflow-hidden shadow-lg border border-slate-200">
      {/* Room List Sidebar */}
      <AnimatePresence>
        {showRoomList && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className={cn(
              'w-80 bg-white border-r border-slate-200 flex flex-col',
              'max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-20 max-md:shadow-xl'
            )}
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg text-slate-800">Συνομιλίες</h2>
                <button 
                  onClick={refetchRooms}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Ανανέωση"
                >
                  <RefreshCw className="w-4 h-4 text-slate-500" />
                </button>
              </div>
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Αναζήτηση κτιρίου..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-100 rounded-xl text-sm border-0 focus:ring-2 focus:ring-primary/30 focus:bg-white transition-all"
                />
              </div>
            </div>
            
            {/* Room List */}
            <div className="flex-1 overflow-y-auto p-2">
              {roomsLoading ? (
                <div className="flex flex-col gap-2 animate-pulse">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-3 p-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-200" />
                      <div className="flex-1">
                        <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                        <div className="h-3 bg-slate-200 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : rooms.length > 0 ? (
                rooms.map(room => (
                  <ChatRoomItem
                    key={room.id}
                    room={room}
                    isActive={room.building.id === activeBuildingId}
                    onClick={() => handleSelectRoom(room.building.id)}
                  />
                ))
              ) : buildings.length > 0 ? (
                // Show buildings that don't have chat rooms yet
                buildings.map(building => (
                  <button
                    key={building.id}
                    onClick={() => handleSelectRoom(building.id)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-xl transition-all',
                      building.id === activeBuildingId 
                        ? 'bg-primary text-primary-foreground shadow-md' 
                        : 'hover:bg-slate-100'
                    )}
                  >
                    <div className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                      building.id === activeBuildingId ? 'bg-white/20' : 'bg-slate-100'
                    )}>
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <h3 className={cn(
                        'font-semibold truncate text-sm',
                        building.id !== activeBuildingId && 'text-slate-800'
                      )}>
                        {building.name}
                      </h3>
                      <p className={cn(
                        'text-xs truncate',
                        building.id === activeBuildingId 
                          ? 'text-primary-foreground/70' 
                          : 'text-slate-500'
                      )}>
                        {building.address}
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Δεν υπάρχουν διαθέσιμες συνομιλίες</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        {activeBuildingId ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowRoomList(!showRoomList)}
                  className="md:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-600" />
                </button>
                
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-slate-600" />
                </div>
                
                <div>
                  <h2 className="font-semibold text-slate-800">
                    {activeRoom?.building.name || currentBuilding?.name || 'Chat'}
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    {isConnected ? (
                      <>
                        <Wifi className="w-3 h-3 text-green-500" />
                        <span className="text-green-600">Συνδεδεμένος</span>
                      </>
                    ) : isConnecting ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Σύνδεση...</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-3 h-3 text-red-500" />
                        <span className="text-red-600">Αποσυνδεδεμένος</span>
                      </>
                    )}
                    <span className="mx-1">•</span>
                    <span>{participants.length} συμμετέχοντες</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowParticipants(!showParticipants)}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    showParticipants 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-slate-100 text-slate-600'
                  )}
                  title="Συμμετέχοντες"
                >
                  <Users className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center border-b border-slate-200 bg-white px-4">
              <button
                onClick={() => setActiveTab('group')}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative',
                  activeTab === 'group'
                    ? 'text-primary'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                <MessageCircle className="w-4 h-4" />
                <span>Ομαδικό Chat</span>
                {activeTab === 'group' && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  />
                )}
              </button>
              
              <button
                onClick={() => setActiveTab('users')}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative',
                  activeTab === 'users'
                    ? 'text-primary'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                <Users className="w-4 h-4" />
                <span>Χρήστες</span>
                {activeTab === 'users' && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  />
                )}
              </button>
              
              <button
                onClick={() => setActiveTab('direct')}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative',
                  activeTab === 'direct'
                    ? 'text-primary'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Ιδιωτικά</span>
                {directUnread > 0 && (
                  <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full min-w-[18px] text-center">
                    {directUnread > 99 ? '99+' : directUnread}
                  </span>
                )}
                {activeTab === 'direct' && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  />
                )}
              </button>
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              {activeTab === 'users' ? (
                <motion.div
                  key="users"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex-1 overflow-hidden"
                >
                  <OnlineUsersList
                    buildingId={activeBuildingId}
                    onStartChat={handleStartDirectChat}
                  />
                </motion.div>
              ) : activeTab === 'direct' ? (
                <motion.div
                  key="direct"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex-1 overflow-hidden"
                >
                  <DirectChatPanel
                    buildingId={activeBuildingId}
                    selectedUser={selectedUserForDM}
                    onBack={() => setSelectedUserForDM(null)}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="group"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-slate-50 to-white">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    <MessageCircle className="w-10 h-10 text-slate-300" />
                  </div>
                  <h3 className="font-semibold text-slate-600 mb-2">
                    Ξεκινήστε μια συνομιλία
                  </h3>
                  <p className="text-sm text-slate-400 max-w-xs">
                    Επικοινωνήστε με τους διαχειριστές και τους κατοίκους του κτιρίου σε πραγματικό χρόνο.
                  </p>
                </div>
              ) : (
                <>
                  {Array.from(groupedMessages.entries()).map(([dateKey, dayMessages]) => (
                    <div key={dateKey}>
                      {/* Date separator */}
                      <div className="flex items-center justify-center my-4">
                        <div className="px-3 py-1 bg-white rounded-full shadow-sm border border-slate-200 text-xs font-medium text-slate-500">
                          {formatMessageDate(dayMessages[0].created_at)}
                        </div>
                      </div>
                      
                      {/* Messages */}
                      {dayMessages.map((message, index) => {
                        const isOwn = message.sender_id === user?.id;
                        const prevMessage = index > 0 ? dayMessages[index - 1] : null;
                        const nextMessage = index < dayMessages.length - 1 ? dayMessages[index + 1] : null;
                        
                        const isFirstInGroup = !prevMessage || prevMessage.sender_id !== message.sender_id;
                        const isLastInGroup = !nextMessage || nextMessage.sender_id !== message.sender_id;
                        
                        return (
                          <ChatMessageItem
                            key={message.id}
                            message={message}
                            isOwn={isOwn}
                            showAvatar={isLastInGroup}
                            isFirstInGroup={isFirstInGroup}
                            isLastInGroup={isLastInGroup}
                          />
                        );
                      })}
                    </div>
                  ))}
                  
                  <AnimatePresence>
                    <TypingIndicator users={typingUsers} />
                  </AnimatePresence>
                  
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input Area */}
            <div className="bg-white border-t border-slate-200 p-4">
              {error && (
                <div className="mb-3 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}
              
              <div className="flex items-end gap-3">
                {/* Attachment button */}
                <button
                  className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
                  title="Επισύναψη αρχείου"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                
                {/* Input */}
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    placeholder="Γράψτε ένα μήνυμα..."
                    rows={1}
                    className="w-full px-4 py-3 bg-slate-100 rounded-2xl text-sm resize-none focus:ring-2 focus:ring-primary/30 focus:bg-white transition-all border-0 pr-12"
                    style={{ maxHeight: '120px' }}
                  />
                  
                  {/* Emoji button */}
                  <button
                    className="absolute right-3 bottom-3 p-1 hover:bg-slate-200 rounded-lg transition-colors text-slate-400"
                    title="Emoji"
                  >
                    <Smile className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Send button */}
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || !isConnected}
                  className={cn(
                    'p-3 rounded-xl transition-all',
                    inputValue.trim() && isConnected
                      ? 'bg-primary text-primary-foreground shadow-md hover:shadow-lg hover:scale-105'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  )}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Participants Panel */}
            <ParticipantsPanel
              participants={participants}
              isOpen={showParticipants}
              onClose={() => setShowParticipants(false)}
            />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          // No building selected
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6">
              <MessageCircle className="w-12 h-12 text-primary/60" />
            </div>
            <h3 className="font-bold text-xl text-slate-700 mb-3">
              Καλώς ήρθατε στο Chat
            </h3>
            <p className="text-slate-500 max-w-sm mb-6">
              Επιλέξτε ένα κτίριο από τη λίστα για να ξεκινήσετε να επικοινωνείτε με τους διαχειριστές και τους κατοίκους.
            </p>
            <button
              onClick={() => setShowRoomList(true)}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium shadow-md hover:shadow-lg hover:scale-105 transition-all inline-flex items-center gap-2"
            >
              <Building2 className="w-5 h-5" />
              Επιλογή Κτιρίου
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


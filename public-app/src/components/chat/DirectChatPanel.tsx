'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { el } from 'date-fns/locale';
import {
  MessageSquare,
  Send,
  ArrowLeft,
  User,
  Check,
  CheckCheck,
  Circle,
  RefreshCw,
  Paperclip,
  Smile,
  MoreVertical,
  Phone,
  Video,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useDirectConversations,
  useDirectChat,
} from '@/hooks/useChat';
import { useAuth } from '@/components/contexts/AuthContext';
import type { DirectConversation, DirectMessage, BuildingUser } from '@/types/chat';

interface DirectChatPanelProps {
  buildingId: number | null;
  selectedUser?: BuildingUser | null;
  onBack?: () => void;
  className?: string;
}

/**
 * Panel για διαχείριση ιδιωτικών συνομιλιών
 */
export function DirectChatPanel({
  buildingId,
  selectedUser,
  onBack,
  className
}: DirectChatPanelProps) {
  const { user: currentUser } = useAuth();
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [view, setView] = useState<'list' | 'chat'>('list');

  const {
    conversations,
    totalUnread,
    isLoading: loadingConversations,
    startConversation,
    refetch: refetchConversations
  } = useDirectConversations();

  // Start chat with selected user
  useEffect(() => {
    if (selectedUser && buildingId) {
      handleStartConversation(selectedUser);
    }
  }, [selectedUser, buildingId]);

  const handleStartConversation = async (user: BuildingUser) => {
    if (!buildingId) return;

    try {
      const result = await startConversation({
        recipient_id: user.id,
        building_id: buildingId,
      });

      setActiveConversationId(result.conversation.id);
      setView('chat');
    } catch (err) {
      console.error('Σφάλμα έναρξης συνομιλίας:', err);
    }
  };

  const handleSelectConversation = (conversation: DirectConversation) => {
    setActiveConversationId(conversation.id);
    setView('chat');
  };

  const handleBackToList = () => {
    setView('list');
    setActiveConversationId(null);
    onBack?.();
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <AnimatePresence mode="wait">
        {view === 'list' ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col"
          >
            <ConversationsList
              conversations={conversations}
              isLoading={loadingConversations}
              totalUnread={totalUnread}
              onSelect={handleSelectConversation}
              onRefresh={refetchConversations}
            />
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 flex flex-col"
          >
            <DirectChatView
              conversationId={activeConversationId}
              currentUserId={currentUser?.id || 0}
              onBack={handleBackToList}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Λίστα συνομιλιών
 */
function ConversationsList({
  conversations,
  isLoading,
  totalUnread,
  onSelect,
  onRefresh,
}: {
  conversations: DirectConversation[];
  isLoading: boolean;
  totalUnread: number;
  onSelect: (conversation: DirectConversation) => void;
  onRefresh: () => void;
}) {
  return (
    <>
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              Ιδιωτικά Μηνύματα
              {totalUnread > 0 && (
                <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {totalUnread}
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500">
              {conversations.length} συνομιλίες
            </p>
          </div>
          <button
            onClick={onRefresh}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title="Ανανέωση"
          >
            <RefreshCw className={cn('w-4 h-4 text-slate-500', isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && conversations.length === 0 ? (
          <div className="p-4 space-y-3 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-200" />
                <div className="flex-1">
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8">
            <MessageSquare className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-sm text-center">
              Δεν έχετε ιδιωτικές συνομιλίες ακόμα.
              <br />
              <span className="text-xs text-slate-400">
                Επιλέξτε έναν χρήστη για να ξεκινήσετε.
              </span>
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {conversations.map(conversation => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                onSelect={() => onSelect(conversation)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Single Conversation Item
 */
function ConversationItem({
  conversation,
  onSelect
}: {
  conversation: DirectConversation;
  onSelect: () => void;
}) {
  const other = conversation.other_participant;
  const lastMessage = conversation.last_message;
  const hasUnread = conversation.unread_count > 0;

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-3 p-4 text-left',
        'hover:bg-slate-50 transition-colors',
        hasUnread && 'bg-primary/5'
      )}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-semibold">
          {other.name.charAt(0).toUpperCase()}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn(
            'font-medium truncate',
            hasUnread ? 'text-slate-900' : 'text-slate-700'
          )}>
            {other.name}
          </span>
          {lastMessage && (
            <span className="text-xs text-slate-400 flex-shrink-0">
              {formatMessageTime(lastMessage.created_at)}
            </span>
          )}
        </div>

        {lastMessage && (
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <p className={cn(
              'text-sm truncate',
              hasUnread ? 'text-slate-800 font-medium' : 'text-slate-500'
            )}>
              {lastMessage.content}
            </p>
            {hasUnread && (
              <span className="px-2 py-0.5 bg-primary text-white text-xs rounded-full flex-shrink-0">
                {conversation.unread_count}
              </span>
            )}
          </div>
        )}

        <p className="text-xs text-slate-400 mt-0.5">
          {conversation.building_name}
        </p>
      </div>
    </button>
  );
}

/**
 * Direct Chat View - Προβολή ενεργής συνομιλίας
 */
function DirectChatView({
  conversationId,
  currentUserId,
  onBack,
}: {
  conversationId: number | null;
  currentUserId: number;
  onBack: () => void;
}) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isLoading,
    isSending,
    error,
    sendMessage,
    markAsRead,
    refetch
  } = useDirectChat(conversationId);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark as read when opening conversation
  useEffect(() => {
    if (conversationId) {
      markAsRead();
    }
  }, [conversationId, markAsRead]);

  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return;

    const content = inputValue.trim();
    setInputValue('');

    try {
      await sendMessage({ content });
    } catch (err) {
      // Restore input on error
      setInputValue(content);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Get recipient info from first message
  const recipientInfo = messages[0]
    ? (messages[0].sender_id === currentUserId
        ? { name: messages[0].recipient_name, id: messages[0].recipient_id }
        : { name: messages[0].sender_name, id: messages[0].sender_id })
    : null;

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-200">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-800 truncate">
            {recipientInfo?.name || 'Συνομιλία'}
          </h3>
          <p className="text-xs text-slate-500">Ιδιωτική συνομιλία</p>
        </div>

        <button
          onClick={refetch}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          title="Ανανέωση"
        >
          <RefreshCw className={cn('w-4 h-4 text-slate-500', isLoading && 'animate-spin')} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading && messages.length === 0 ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className={cn(
                'flex gap-2',
                i % 2 === 0 ? 'justify-end' : 'justify-start'
              )}>
                <div className={cn(
                  'h-10 rounded-2xl bg-slate-200',
                  i % 2 === 0 ? 'w-48' : 'w-32'
                )} />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">
            <p className="text-sm">{error}</p>
            <button
              onClick={refetch}
              className="mt-2 text-xs text-primary hover:underline"
            >
              Δοκιμάστε ξανά
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <MessageSquare className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-sm">Ξεκινήστε τη συνομιλία!</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <DirectMessageBubble
                key={message.id}
                message={message}
                isOwn={message.sender_id === currentUserId}
                showTime={
                  index === 0 ||
                  new Date(message.created_at).getTime() -
                  new Date(messages[index - 1].created_at).getTime() > 300000
                }
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Γράψτε ένα μήνυμα..."
              rows={1}
              className={cn(
                'w-full px-4 py-3 rounded-2xl resize-none',
                'bg-slate-100 border-0',
                'focus:ring-2 focus:ring-primary/30 focus:bg-white',
                'transition-all'
              )}
              style={{ maxHeight: '120px' }}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isSending}
            className={cn(
              'p-3 rounded-full transition-all',
              inputValue.trim() && !isSending
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'bg-slate-200 text-slate-400'
            )}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </>
  );
}

/**
 * Direct Message Bubble Component
 * Συννεφάκια με διαφορετικά χρώματα για κάθε συνομιλητή
 */
function DirectMessageBubble({
  message,
  isOwn,
  showTime,
}: {
  message: DirectMessage;
  isOwn: boolean;
  showTime: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn('flex flex-col', isOwn ? 'items-end' : 'items-start')}
    >
      {/* Sender name for received messages */}
      {!isOwn && showTime && (
        <span className="text-xs font-medium text-teal-700 mb-1 ml-2">
          {message.sender_name}
        </span>
      )}

      <div className={cn(
        'max-w-[80%] px-4 py-2.5 rounded-2xl shadow-sm',
        'transition-all duration-200',
        isOwn
          ? [
              // Δικά μου μηνύματα - Μπλε gradient
              'bg-gradient-to-br from-blue-500 to-blue-600',
              'text-white',
              'rounded-br-md',
              'shadow-blue-500/20',
            ]
          : [
              // Μηνύματα άλλου - Teal/Cyan
              'bg-gradient-to-br from-teal-50 to-cyan-50',
              'text-slate-800',
              'rounded-bl-md',
              'border border-teal-100',
              'shadow-teal-500/10',
            ]
      )}>
        <p className={cn(
          'text-sm whitespace-pre-wrap break-words leading-relaxed',
          isOwn ? 'text-white' : 'text-slate-800'
        )}>
          {message.content}
        </p>
      </div>

      {/* Time & Read status */}
      <div className={cn(
        'flex items-center gap-1.5 mt-1 px-2',
        isOwn ? 'flex-row-reverse' : ''
      )}>
        {showTime && (
          <span className="text-[10px] text-slate-400 font-medium">
            {formatMessageTime(message.created_at)}
          </span>
        )}
        {isOwn && (
          <span className="flex items-center">
            {message.is_read
              ? <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
              : <Check className="w-3.5 h-3.5 text-slate-300" />
            }
          </span>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Helper: Format message time
 */
function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) {
    return format(date, 'HH:mm');
  }
  if (isYesterday(date)) {
    return `Χθες ${format(date, 'HH:mm')}`;
  }
  return format(date, 'd/M HH:mm');
}

export default DirectChatPanel;

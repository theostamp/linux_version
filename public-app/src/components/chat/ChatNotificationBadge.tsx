'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChatUnreadCount } from '@/hooks/useChat';

interface ChatNotificationBadgeProps {
  className?: string;
  showIcon?: boolean;
  iconClassName?: string;
}

/**
 * Badge που δείχνει τον αριθμό των μη διαβασμένων μηνυμάτων chat
 * Μπορεί να χρησιμοποιηθεί στο Sidebar ή σε οποιοδήποτε μέρος της εφαρμογής
 */
export function ChatNotificationBadge({ 
  className,
  showIcon = false,
  iconClassName,
}: ChatNotificationBadgeProps) {
  const { unreadCount, isLoading } = useChatUnreadCount();
  const [prevCount, setPrevCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Trigger animation when count increases
  useEffect(() => {
    if (unreadCount > prevCount && prevCount > 0) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 500);
    }
    setPrevCount(unreadCount);
  }, [unreadCount, prevCount]);

  if (isLoading || unreadCount === 0) {
    return showIcon ? (
      <MessageCircle className={cn('w-5 h-5', iconClassName)} />
    ) : null;
  }

  const displayCount = unreadCount > 99 ? '99+' : unreadCount;

  return (
    <div className={cn('relative inline-flex', className)}>
      {showIcon && (
        <MessageCircle className={cn('w-5 h-5', iconClassName)} />
      )}
      
      <AnimatePresence mode="wait">
        <motion.span
          key={unreadCount}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ 
            scale: isAnimating ? [1, 1.2, 1] : 1, 
            opacity: 1 
          }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px]',
            'flex items-center justify-center',
            'bg-red-500 text-white text-[10px] font-bold',
            'rounded-full px-1 shadow-sm',
            'border-2 border-white'
          )}
        >
          {displayCount}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

/**
 * Compact version για μικρότερους χώρους (π.χ. collapsed sidebar)
 */
export function ChatNotificationDot({ className }: { className?: string }) {
  const { unreadCount, isLoading } = useChatUnreadCount();

  if (isLoading || unreadCount === 0) return null;

  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={cn(
        'w-2.5 h-2.5 bg-red-500 rounded-full',
        'absolute -top-0.5 -right-0.5',
        'border-2 border-white shadow-sm',
        className
      )}
    />
  );
}

/**
 * Full badge με icon και count για χρήση σε headers
 */
export function ChatNotificationButton({ 
  onClick,
  className,
}: { 
  onClick?: () => void;
  className?: string;
}) {
  const { unreadCount, isLoading } = useChatUnreadCount();

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative p-2 rounded-lg transition-colors',
        'hover:bg-slate-100',
        className
      )}
      title={unreadCount > 0 ? `${unreadCount} νέα μηνύματα` : 'Chat'}
    >
      <MessageCircle className="w-5 h-5 text-slate-600" />
      
      <AnimatePresence>
        {!isLoading && unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className={cn(
              'absolute -top-0.5 -right-0.5',
              'min-w-[18px] h-[18px] px-1',
              'flex items-center justify-center',
              'bg-red-500 text-white text-[10px] font-bold',
              'rounded-full shadow-sm border-2 border-white'
            )}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

export default ChatNotificationBadge;


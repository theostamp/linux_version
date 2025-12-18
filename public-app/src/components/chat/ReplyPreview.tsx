'use client';

import { motion } from 'framer-motion';
import { X, Reply, CornerUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage, ReplyToData } from '@/types/chat';

interface ReplyPreviewProps {
  message: ChatMessage | ReplyToData;
  onCancel?: () => void;
  onClick?: () => void;
  variant?: 'input' | 'message';
  className?: string;
}

/**
 * Reply Preview Component
 * Shows either above the input (when replying) or inside a message (when showing quoted message)
 */
export function ReplyPreview({ 
  message, 
  onCancel, 
  onClick,
  variant = 'input',
  className 
}: ReplyPreviewProps) {
  const isDeleted = 'is_deleted' in message && message.is_deleted;
  const senderName = 'sender_name' in message ? message.sender_name : 'Άγνωστος';
  const content = isDeleted 
    ? 'Αυτό το μήνυμα διαγράφηκε' 
    : message.content;

  if (variant === 'message') {
    // Compact version shown inside a message bubble
    return (
      <button
        onClick={onClick}
        className={cn(
          'w-full text-left mb-2 p-2 rounded-lg transition-colors',
          'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10',
          'border-l-2 border-primary/50',
          className
        )}
      >
        <div className="flex items-center gap-1 text-xs text-primary/80 mb-0.5">
          <CornerUpRight className="w-3 h-3" />
          <span className="font-medium">{senderName}</span>
        </div>
        <p className={cn(
          'text-xs truncate',
          isDeleted ? 'italic text-muted-foreground' : 'text-foreground/70'
        )}>
          {content}
        </p>
      </button>
    );
  }

  // Full version shown above the input
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: 10, height: 0 }}
      className={cn(
        'flex items-start gap-3 p-3 mx-4 mb-2 rounded-xl',
        'bg-muted/50 border border-border',
        className
      )}
    >
      <div className="flex-shrink-0 p-2 rounded-lg bg-primary/10">
        <Reply className="w-4 h-4 text-primary" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-primary mb-0.5">
          Απάντηση σε {senderName}
        </p>
        <p className={cn(
          'text-sm truncate',
          isDeleted ? 'italic text-muted-foreground' : 'text-foreground/80'
        )}>
          {content}
        </p>
      </div>
      
      {onCancel && (
        <button
          onClick={onCancel}
          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      )}
    </motion.div>
  );
}

export default ReplyPreview;


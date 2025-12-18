'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile, X } from 'lucide-react';
import EmojiPickerReact, { EmojiClickData, Theme } from 'emoji-picker-react';
import { cn } from '@/lib/utils';

// Quick reaction emojis
export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉', '👏', '🔥'];

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  className?: string;
}

/**
 * Full Emoji Picker component
 */
export function EmojiPicker({ onEmojiSelect, className }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiSelect(emojiData.emoji);
    setIsOpen(false);
  };

  return (
    <div ref={pickerRef} className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'p-2 rounded-lg transition-colors',
          isOpen 
            ? 'bg-primary/10 text-primary' 
            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
        )}
        title="Emoji"
      >
        <Smile className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="absolute bottom-full right-0 mb-2 z-50"
          >
            <EmojiPickerReact
              onEmojiClick={handleEmojiClick}
              theme={Theme.AUTO}
              lazyLoadEmojis
              searchPlaceHolder="Αναζήτηση emoji..."
              width={350}
              height={400}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface QuickReactionsProps {
  onReact: (emoji: string) => void;
  selectedEmojis?: string[];
  className?: string;
}

/**
 * Quick Reaction bar for messages
 */
export function QuickReactions({ onReact, selectedEmojis = [], className }: QuickReactionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={cn(
        'flex items-center gap-0.5 p-1 bg-popover rounded-full shadow-lg border border-border',
        className
      )}
    >
      {QUICK_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onReact(emoji)}
          className={cn(
            'p-1.5 rounded-full transition-all hover:scale-125 hover:bg-muted',
            selectedEmojis.includes(emoji) && 'bg-primary/20'
          )}
        >
          <span className="text-lg">{emoji}</span>
        </button>
      ))}
    </motion.div>
  );
}

interface MessageReactionsDisplayProps {
  reactions: Array<{
    emoji: string;
    count: number;
    users: Array<{ id: number; name: string }>;
    has_reacted: boolean;
  }>;
  onReactionClick: (emoji: string) => void;
  className?: string;
}

/**
 * Display reactions on a message
 */
export function MessageReactionsDisplay({ 
  reactions, 
  onReactionClick,
  className 
}: MessageReactionsDisplayProps) {
  if (!reactions || reactions.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-1 mt-1', className)}>
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => onReactionClick(reaction.emoji)}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors',
            reaction.has_reacted
              ? 'bg-primary/20 text-primary border border-primary/30'
              : 'bg-muted text-muted-foreground hover:bg-muted/80 border border-transparent'
          )}
          title={reaction.users.map(u => u.name).join(', ')}
        >
          <span>{reaction.emoji}</span>
          <span className="font-medium">{reaction.count}</span>
        </button>
      ))}
    </div>
  );
}

export default EmojiPicker;


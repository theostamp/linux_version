'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Reply, 
  Pencil, 
  Trash2, 
  Copy, 
  MoreHorizontal,
  SmilePlus,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuickReactions } from './EmojiPicker';
import type { ChatMessage, MessageReaction } from '@/types/chat';

interface MessageContextMenuProps {
  message: ChatMessage;
  isOwn: boolean;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
  onCopy: () => void;
  className?: string;
}

/**
 * Context menu for message actions (hover or long-press)
 */
export function MessageContextMenu({
  message,
  isOwn,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onCopy,
  className,
}: MessageContextMenuProps) {
  const [showReactions, setShowReactions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
        setShowReactions(false);
      }
    };

    if (showMenu || showReactions) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu, showReactions]);

  // Get currently selected reactions
  const selectedEmojis = message.reactions
    ?.filter(r => r.has_reacted)
    .map(r => r.emoji) || [];

  const handleReact = (emoji: string) => {
    onReact(emoji);
    setShowReactions(false);
  };

  if (message.is_deleted) {
    return null;
  }

  return (
    <div 
      ref={menuRef}
      className={cn(
        'absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity',
        isOwn ? 'right-full mr-2' : 'left-full ml-2',
        className
      )}
    >
      <div className="flex items-center gap-1">
        {/* Quick actions */}
        <motion.div 
          className="flex items-center bg-popover rounded-lg shadow-lg border border-border overflow-hidden"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          {/* Reactions button */}
          <button
            onClick={() => {
              setShowReactions(!showReactions);
              setShowMenu(false);
            }}
            className="p-2 hover:bg-muted transition-colors"
            title="Αντίδραση"
          >
            <SmilePlus className="w-4 h-4 text-muted-foreground" />
          </button>
          
          {/* Reply button */}
          <button
            onClick={() => {
              onReply();
              setShowMenu(false);
            }}
            className="p-2 hover:bg-muted transition-colors"
            title="Απάντηση"
          >
            <Reply className="w-4 h-4 text-muted-foreground" />
          </button>
          
          {/* More options */}
          <button
            onClick={() => {
              setShowMenu(!showMenu);
              setShowReactions(false);
            }}
            className="p-2 hover:bg-muted transition-colors"
            title="Περισσότερα"
          >
            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
          </button>
        </motion.div>

        {/* Reactions picker */}
        <AnimatePresence>
          {showReactions && (
            <div className="absolute top-full mt-2 z-50">
              <QuickReactions 
                onReact={handleReact} 
                selectedEmojis={selectedEmojis}
              />
            </div>
          )}
        </AnimatePresence>

        {/* Extended menu */}
        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute top-full mt-2 z-50 min-w-[160px] py-1 bg-popover rounded-lg shadow-lg border border-border"
            >
              {/* Reply */}
              <button
                onClick={() => {
                  onReply();
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                <Reply className="w-4 h-4" />
                <span>Απάντηση</span>
              </button>

              {/* Copy */}
              <button
                onClick={() => {
                  onCopy();
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                <Copy className="w-4 h-4" />
                <span>Αντιγραφή</span>
              </button>

              {/* Edit (only for own messages) */}
              {isOwn && (
                <button
                  onClick={() => {
                    onEdit();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  <span>Επεξεργασία</span>
                </button>
              )}

              {/* Delete (only for own messages) */}
              {isOwn && (
                <>
                  <div className="my-1 border-t border-border" />
                  <button
                    onClick={() => {
                      onDelete();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Διαγραφή</span>
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/**
 * Inline edit mode for messages
 */
interface MessageEditModeProps {
  content: string;
  onSave: (newContent: string) => void;
  onCancel: () => void;
  className?: string;
}

export function MessageEditMode({ content, onSave, onCancel, className }: MessageEditModeProps) {
  const [editedContent, setEditedContent] = useState(content);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSave = () => {
    if (editedContent.trim() && editedContent.trim() !== content) {
      onSave(editedContent.trim());
    } else {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <textarea
        ref={inputRef}
        value={editedContent}
        onChange={(e) => setEditedContent(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full p-2 text-sm rounded-lg bg-background border border-primary/50 focus:border-primary focus:ring-1 focus:ring-primary resize-none"
        rows={2}
      />
      <div className="flex items-center gap-2 text-xs">
        <button
          onClick={handleSave}
          disabled={!editedContent.trim() || editedContent.trim() === content}
          className="px-3 py-1 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Αποθήκευση
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1 bg-muted text-muted-foreground rounded-md hover:bg-muted/80"
        >
          Ακύρωση
        </button>
        <span className="text-muted-foreground ml-auto">
          Enter = Αποθήκευση, Esc = Ακύρωση
        </span>
      </div>
    </div>
  );
}

export default MessageContextMenu;


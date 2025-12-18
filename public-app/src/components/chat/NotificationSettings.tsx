'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  BellOff, 
  BellRing,
  Settings,
  Volume2,
  VolumeX,
  Clock,
  Check,
  X,
  Loader2
} from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { cn } from '@/lib/utils';

interface NotificationSettingsProps {
  className?: string;
}

/**
 * Notification Settings Component
 * Allows users to manage their push notification preferences
 */
export function NotificationSettings({ className }: NotificationSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe
  } = usePushNotifications();

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const getStatusInfo = () => {
    if (!isSupported) {
      return {
        icon: BellOff,
        text: 'Ειδοποιήσεις μη διαθέσιμες',
        color: 'text-muted-foreground'
      };
    }
    
    if (permission === 'denied') {
      return {
        icon: BellOff,
        text: 'Ειδοποιήσεις απορρίφθηκαν',
        color: 'text-red-500'
      };
    }
    
    if (isSubscribed) {
      return {
        icon: BellRing,
        text: 'Ειδοποιήσεις ενεργές',
        color: 'text-green-500'
      };
    }
    
    return {
      icon: Bell,
      text: 'Ειδοποιήσεις ανενεργές',
      color: 'text-muted-foreground'
    };
  };

  const status = getStatusInfo();
  const StatusIcon = status.icon;

  return (
    <div className={cn('relative', className)}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'p-2.5 rounded-xl transition-all duration-200',
          isOpen 
            ? 'bg-primary text-primary-foreground shadow-md'
            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
        )}
        title="Ρυθμίσεις ειδοποιήσεων"
      >
        <Bell className="w-5 h-5" />
      </button>

      {/* Settings Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute right-0 top-full mt-2 w-80 z-50 bg-popover rounded-xl shadow-xl border border-border overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-border bg-muted/30">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Ρυθμίσεις Ειδοποιήσεων
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <StatusIcon className={cn('w-5 h-5', status.color)} />
                  <span className="text-sm font-medium">{status.text}</span>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Enable/Disable toggle */}
              {isSupported && permission !== 'denied' && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Push Notifications</p>
                    <p className="text-xs text-muted-foreground">
                      Λήψη ειδοποιήσεων για νέα μηνύματα
                    </p>
                  </div>
                  <button
                    onClick={handleToggle}
                    disabled={isLoading}
                    className={cn(
                      'relative w-12 h-6 rounded-full transition-colors duration-200',
                      isSubscribed ? 'bg-primary' : 'bg-muted',
                      isLoading && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <motion.div
                      className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm flex items-center justify-center"
                      animate={{ left: isSubscribed ? 28 : 4 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    >
                      {isLoading && (
                        <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" />
                      )}
                    </motion.div>
                  </button>
                </div>
              )}

              {/* Permission denied message */}
              {isSupported && permission === 'denied' && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-sm">
                  <p className="font-medium text-amber-700 dark:text-amber-400 mb-1">
                    Οι ειδοποιήσεις έχουν απορριφθεί
                  </p>
                  <p className="text-amber-600/80 dark:text-amber-300/80 text-xs">
                    Για να ενεργοποιήσετε τις ειδοποιήσεις, πρέπει να αλλάξετε τις ρυθμίσεις του browser σας.
                  </p>
                </div>
              )}

              {/* Not supported message */}
              {!isSupported && (
                <div className="p-3 rounded-lg bg-muted text-sm text-muted-foreground">
                  <p>Οι push notifications δεν υποστηρίζονται στο browser σας.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border bg-muted/30 text-xs text-center text-muted-foreground">
              Θα λαμβάνετε ειδοποιήσεις για νέα μηνύματα όταν δεν είστε στην εφαρμογή
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Simple notification toggle button
 */
export function NotificationToggle({ className }: { className?: string }) {
  const { isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();

  const handleClick = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        'p-2.5 rounded-xl transition-all duration-200',
        isSubscribed 
          ? 'bg-primary/10 text-primary' 
          : 'hover:bg-muted text-muted-foreground',
        isLoading && 'opacity-50 cursor-not-allowed',
        className
      )}
      title={isSubscribed ? 'Απενεργοποίηση ειδοποιήσεων' : 'Ενεργοποίηση ειδοποιήσεων'}
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : isSubscribed ? (
        <BellRing className="w-5 h-5" />
      ) : (
        <BellOff className="w-5 h-5" />
      )}
    </button>
  );
}

export default NotificationSettings;


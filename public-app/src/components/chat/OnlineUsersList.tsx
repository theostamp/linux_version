'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { el } from 'date-fns/locale';
import {
  Users,
  User,
  Crown,
  Home,
  MessageSquare,
  X,
  Search,
  Circle,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBuildingUsers } from '@/hooks/useChat';
import type { BuildingUser } from '@/types/chat';

interface OnlineUsersListProps {
  buildingId: number | null;
  onStartChat?: (user: BuildingUser) => void;
  className?: string;
}

/**
 * Λίστα χρηστών κτιρίου με κατάσταση σύνδεσης
 */
export function OnlineUsersList({ buildingId, onStartChat, className }: OnlineUsersListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { 
    users, 
    onlineUsers, 
    offlineUsers, 
    onlineCount, 
    totalCount,
    isLoading, 
    error, 
    refetch 
  } = useBuildingUsers(buildingId);

  // Filter users by search query
  const filteredOnlineUsers = onlineUsers.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredOfflineUsers = offlineUsers.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!buildingId) {
    return (
      <div className={cn('p-4 text-center text-slate-500', className)}>
        <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Επιλέξτε κτίριο για να δείτε τους χρήστες</p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-slate-800">Χρήστες Κτιρίου</h3>
            <p className="text-xs text-slate-500">
              {onlineCount} online / {totalCount} σύνολο
            </p>
          </div>
          <button
            onClick={refetch}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title="Ανανέωση"
          >
            <RefreshCw className={cn('w-4 h-4 text-slate-500', isLoading && 'animate-spin')} />
          </button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Αναζήτηση χρήστη..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-100 rounded-lg text-sm border-0 focus:ring-2 focus:ring-primary/30 focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
            </button>
          )}
        </div>
      </div>

      {/* User List */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading && users.length === 0 ? (
          <div className="flex flex-col gap-2 animate-pulse p-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 p-2">
                <div className="w-10 h-10 rounded-full bg-slate-200" />
                <div className="flex-1">
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                </div>
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
        ) : (
          <>
            {/* Online Users */}
            {filteredOnlineUsers.length > 0 && (
              <div className="mb-4">
                <div className="px-3 py-1.5 text-xs font-medium text-green-600 uppercase tracking-wider flex items-center gap-1">
                  <Circle className="w-2 h-2 fill-green-500" />
                  Online ({filteredOnlineUsers.length})
                </div>
                <div className="space-y-1">
                  {filteredOnlineUsers.map(user => (
                    <UserItem 
                      key={user.id} 
                      user={user} 
                      onStartChat={onStartChat}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Offline Users */}
            {filteredOfflineUsers.length > 0 && (
              <div>
                <div className="px-3 py-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Offline ({filteredOfflineUsers.length})
                </div>
                <div className="space-y-1">
                  {filteredOfflineUsers.map(user => (
                    <UserItem 
                      key={user.id} 
                      user={user} 
                      onStartChat={onStartChat}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* No results */}
            {filteredOnlineUsers.length === 0 && filteredOfflineUsers.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">
                  {searchQuery ? 'Δεν βρέθηκαν χρήστες' : 'Δεν υπάρχουν χρήστες'}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Single User Item Component
 */
function UserItem({ user, onStartChat }: { user: BuildingUser; onStartChat?: (user: BuildingUser) => void }) {
  const roleIcon = user.role === 'manager' 
    ? <Crown className="w-3 h-3 text-amber-600" />
    : <Home className="w-3 h-3 text-sky-600" />;
  
  const roleLabel = user.role === 'manager' ? 'Διαχειριστής' : 'Κάτοικος';
  const roleColor = user.role === 'manager' 
    ? 'bg-amber-50 text-amber-700' 
    : 'bg-sky-50 text-sky-700';

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'flex items-center gap-3 p-2 rounded-lg transition-colors group',
        'hover:bg-slate-100'
      )}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold',
          user.is_online 
            ? 'bg-slate-200 text-slate-700' 
            : 'bg-slate-100 text-slate-400'
        )}>
          {user.name.charAt(0).toUpperCase()}
        </div>
        {/* Online indicator */}
        {user.is_online && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
        )}
      </div>

      {/* User info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            'font-medium text-sm truncate',
            user.is_online ? 'text-slate-800' : 'text-slate-500'
          )}>
            {user.name}
          </span>
          <span className={cn(
            'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium',
            roleColor
          )}>
            {roleIcon}
            {roleLabel}
          </span>
        </div>
        <p className={cn(
          'text-xs truncate',
          user.is_online ? 'text-slate-500' : 'text-slate-400'
        )}>
          {user.is_online 
            ? (user.status_message || 'Διαθέσιμος') 
            : user.last_activity 
              ? `Τελευταία εμφάνιση ${formatDistanceToNow(new Date(user.last_activity), { addSuffix: true, locale: el })}`
              : 'Offline'
          }
        </p>
      </div>

      {/* Action button */}
      {onStartChat && (
        <button
          onClick={() => onStartChat(user)}
          className={cn(
            'p-2 rounded-lg transition-all',
            'opacity-0 group-hover:opacity-100',
            'hover:bg-primary hover:text-primary-foreground',
            'text-slate-400'
          )}
          title={`Συνομιλία με ${user.name}`}
        >
          <MessageSquare className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
}

export default OnlineUsersList;


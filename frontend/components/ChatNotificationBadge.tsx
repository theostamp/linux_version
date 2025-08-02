'use client';

import React, { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

interface ChatNotificationBadgeProps {
  buildingId: number;
  className?: string;
}

export default function ChatNotificationBadge({ buildingId, className }: ChatNotificationBadgeProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Mock unread count - in real implementation this would come from API
    setUnreadCount(Math.floor(Math.random() * 5)); // Random number 0-4 for demo
  }, [buildingId]);

  const handleMarkAsRead = async () => {
    setUnreadCount(0);
  };

  if (unreadCount === 0) {
    return (
      <Button variant="ghost" size="sm" className={className}>
        <MessageCircle className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className="relative">
      <Button 
        variant="ghost" 
        size="sm" 
        className={className}
        onClick={handleMarkAsRead}
      >
        <MessageCircle className="h-4 w-4" />
        <Badge 
          variant="destructive" 
          className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      </Button>
    </div>
  );
} 
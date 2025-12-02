'use client';

import { useState } from 'react';
import { Mail, MessageSquare, Phone, Bell, Info } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { NotificationChannel } from '@/types/notifications';
import { cn } from '@/lib/utils';

interface ChannelConfig {
  id: NotificationChannel;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  available: boolean;
  configurationNote?: string;
}

const CHANNELS: ChannelConfig[] = [
  {
    id: 'email',
    label: 'Email',
    description: 'Αποστολή μέσω MailerSend',
    icon: <Mail className="h-5 w-5" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
    available: true,
    configurationNote: 'Ρυθμισμένο με MailerSend ✓',
  },
  {
    id: 'sms',
    label: 'SMS',
    description: 'Γραπτό μήνυμα στο κινητό',
    icon: <MessageSquare className="h-5 w-5" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200 hover:bg-green-100',
    available: false,
    configurationNote: 'Απαιτείται ρύθμιση παρόχου SMS (Apifon, Yuboto, Twilio)',
  },
  {
    id: 'viber',
    label: 'Viber',
    description: 'Μήνυμα μέσω Viber',
    icon: <Phone className="h-5 w-5" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
    available: false,
    configurationNote: 'Απαιτείται σύνδεση με Viber Business',
  },
  {
    id: 'push',
    label: 'Push',
    description: 'Ειδοποίηση στην εφαρμογή',
    icon: <Bell className="h-5 w-5" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
    available: false,
    configurationNote: 'Απαιτείται ρύθμιση Firebase',
  },
];

interface ChannelSelectorProps {
  selectedChannels: NotificationChannel[];
  onChannelsChange: (channels: NotificationChannel[]) => void;
  showUnavailable?: boolean;
  className?: string;
}

export default function ChannelSelector({
  selectedChannels,
  onChannelsChange,
  showUnavailable = true,
  className,
}: ChannelSelectorProps) {
  const handleToggle = (channelId: NotificationChannel, isAvailable: boolean) => {
    if (!isAvailable) return;
    
    if (selectedChannels.includes(channelId)) {
      // Don't allow deselecting if it's the last one
      if (selectedChannels.length === 1) return;
      onChannelsChange(selectedChannels.filter(c => c !== channelId));
    } else {
      onChannelsChange([...selectedChannels, channelId]);
    }
  };

  const displayChannels = showUnavailable 
    ? CHANNELS 
    : CHANNELS.filter(c => c.available);

  return (
    <div className={cn('space-y-3', className)}>
      <Label className="text-sm font-medium text-gray-700">
        Κανάλια Αποστολής
      </Label>
      
      <div className="grid gap-3 sm:grid-cols-2">
        {displayChannels.map((channel) => {
          const isSelected = selectedChannels.includes(channel.id);
          const isDisabled = !channel.available;
          
          return (
            <TooltipProvider key={channel.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      'relative flex items-center gap-3 rounded-lg border-2 p-3 transition-all cursor-pointer',
                      isSelected && channel.available && channel.bgColor,
                      !isSelected && channel.available && 'border-gray-200 hover:border-gray-300 bg-white',
                      isDisabled && 'opacity-50 cursor-not-allowed border-dashed bg-gray-50'
                    )}
                    onClick={() => handleToggle(channel.id, channel.available)}
                  >
                    <Checkbox
                      id={`channel-${channel.id}`}
                      checked={isSelected}
                      disabled={isDisabled}
                      onCheckedChange={() => handleToggle(channel.id, channel.available)}
                      className="pointer-events-none"
                    />
                    
                    <div className={cn(
                      'flex items-center justify-center rounded-full p-2',
                      isSelected ? 'bg-white shadow-sm' : 'bg-gray-100',
                      channel.color
                    )}>
                      {channel.icon}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {channel.label}
                        </span>
                        {isDisabled && (
                          <Badge variant="outline" className="text-xs">
                            Σύντομα
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {channel.description}
                      </p>
                    </div>
                    
                    {isDisabled && channel.configurationNote && (
                      <Info className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    )}
                  </div>
                </TooltipTrigger>
                {isDisabled && channel.configurationNote && (
                  <TooltipContent>
                    <p>{channel.configurationNote}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
      
      {selectedChannels.length > 0 && (
        <p className="text-xs text-gray-500">
          Επιλεγμένα: {selectedChannels.map(c => 
            CHANNELS.find(ch => ch.id === c)?.label
          ).join(', ')}
        </p>
      )}
    </div>
  );
}

// Compact version for inline use
export function ChannelBadges({ 
  channels 
}: { 
  channels: NotificationChannel[] 
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {channels.map(channelId => {
        const channel = CHANNELS.find(c => c.id === channelId);
        if (!channel) return null;
        
        return (
          <Badge 
            key={channelId} 
            variant="outline"
            className={cn('text-xs gap-1', channel.color)}
          >
            {channel.icon}
            {channel.label}
          </Badge>
        );
      })}
    </div>
  );
}


'use client';

import React, { useState } from 'react';
import { Clock, AlertTriangle, CheckCircle2, Calendar, Phone, Mail, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useEvents, useMarkEventCompleted, useMarkEventInProgress } from '@/hooks/useEvents';
import EventDescription from './EventDescription';

export default function EventList() {
  const { selectedBuilding } = useBuilding();
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'overdue'>('all');
  
  const { data: events = [], isLoading, error } = useEvents({
    building: selectedBuilding?.id,
    filter
  });

  const markCompleted = useMarkEventCompleted();
  const markInProgress = useMarkEventInProgress();

  const handleMarkCompleted = (eventId: number) => {
    markCompleted.mutate(eventId);
  };

  const handleMarkInProgress = (eventId: number) => {
    markInProgress.mutate(eventId);
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-sm text-red-600 dark:text-red-400">
          Σφάλμα κατά τη φόρτωση των συμβάντων
        </p>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'in_progress':
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'cancelled':
        return <div className="w-4 h-4 bg-red-500 rounded-full" />;
      case 'postponed':
        return <div className="w-4 h-4 bg-gray-500 rounded-full" />;
      default:
        return <div className="w-4 h-4 bg-gray-400 rounded-full" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500 bg-red-50 dark:bg-red-900/10';
      case 'high':
        return 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/10';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10';
      case 'low':
        return 'border-l-gray-500 bg-gray-50 dark:bg-gray-900/10';
      default:
        return 'border-l-gray-300 bg-white dark:bg-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const eventDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (eventDate.getTime() === today.getTime()) {
      return `Σήμερα ${date.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (eventDate.getTime() === today.getTime() + 86400000) {
      return `Αύριο ${date.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleString('el-GR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filter Tabs */}
      <div className="flex-shrink-0 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-1">
          {[
            { key: 'all', label: 'Όλα', icon: '📋' },
            { key: 'today', label: 'Σήμερα', icon: '📅' },
            { key: 'week', label: 'Εβδομάδα', icon: '📆' },
            { key: 'overdue', label: 'Εκπρόθεσμα', icon: '⚠️' }
          ].map(({ key, label, icon }) => (
            <Button
              key={key}
              variant={filter === key ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter(key as any)}
              className="text-xs"
            >
              <span className="flex items-center gap-1">
                {icon} {label}
              </span>
            </Button>
          ))}
        </div>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-auto p-4">
        {events.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {filter === 'all' ? 'Δεν υπάρχουν συμβάντα' : `Δεν υπάρχουν ${filter === 'today' ? 'σημερινά' : filter === 'week' ? 'συμβάντα αυτή την εβδομάδα' : 'εκπρόθεσμα'} συμβάντα`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event: any) => {
              const isCompleted = event.status === 'completed';
              
              if (isCompleted) {
                // Compact view for completed events
                return (
                  <div
                    key={event.id}
                    className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800 border-l-4 border-l-green-500 opacity-75"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-lg flex-shrink-0">{event.type_icon}</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-700 dark:text-gray-300 text-sm truncate line-through">
                          {event.title}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Ολοκληρώθηκε • {event.event_type_display}
                        </p>
                      </div>
                      {event.scheduled_date && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                          {formatDate(event.scheduled_date)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
              
              // Full view for active events
              return (
                <div
                  key={event.id}
                  className={`p-3 rounded-lg border-l-4 ${getPriorityColor(event.priority)}`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{event.type_icon}</span>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                          {event.title}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {event.event_type_display}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(event.status)}
                      {event.is_overdue && (
                        <AlertTriangle className="w-3 h-3 text-red-500" />
                      )}
                    </div>
                  </div>

                {/* Description */}
                {event.description && (
                  <EventDescription 
                    description={event.description} 
                    className="text-xs mb-2"
                  />
                )}

                {/* Dates */}
                <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                  {event.scheduled_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>Προγραμματισμένο: {formatDate(event.scheduled_date)}</span>
                    </div>
                  )}
                  {event.due_date && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span className={event.is_overdue ? 'text-red-500 font-medium' : ''}>
                        Λήξη: {formatDate(event.due_date)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Contact Info */}
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {event.contact_phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      <span>{event.contact_phone}</span>
                    </div>
                  )}
                  {event.contact_email && (
                    <div className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      <span>{event.contact_email}</span>
                    </div>
                  )}
                </div>

                {/* Assigned User */}
                {event.assigned_to_name && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <User className="w-3 h-3" />
                    <span>Ανατέθηκε σε: {event.assigned_to_name}</span>
                  </div>
                )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-3">
                    {event.status === 'pending' && (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs"
                          onClick={() => handleMarkInProgress(event.id)}
                          disabled={markInProgress.isPending}
                        >
                          Έναρξη
                        </Button>
                        <Button 
                          size="sm" 
                          variant="default" 
                          className="text-xs bg-green-600 hover:bg-green-700"
                          onClick={() => handleMarkCompleted(event.id)}
                          disabled={markCompleted.isPending}
                        >
                          ✓ Ολοκλήρωση
                        </Button>
                      </>
                    )}
                    {event.status === 'in_progress' && (
                      <Button 
                        size="sm" 
                        variant="default" 
                        className="text-xs bg-green-600 hover:bg-green-700"
                        onClick={() => handleMarkCompleted(event.id)}
                        disabled={markCompleted.isPending}
                      >
                        ✓ Ολοκλήρωση
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-xs">
                      Επεξεργασία
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
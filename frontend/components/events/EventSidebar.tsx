'use client';

import React, { useState } from 'react';
import { X, Plus, Calendar, Clock, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBuilding } from '@/components/contexts/BuildingContext';
import EventList from './EventList';
import EventForm from './EventForm';
import EventCalendarView from './EventCalendarView';

interface EventSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

type ViewMode = 'list' | 'calendar' | 'create';

export default function EventSidebar({ isOpen, onClose }: EventSidebarProps) {
  const { selectedBuilding } = useBuilding();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  if (!isOpen) return null;

  const renderHeader = () => {
    switch (viewMode) {
      case 'create':
        return (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('list')}
                className="p-1"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Νέο Συμβάν
              </h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="p-1">
              <X className="w-4 h-4" />
            </Button>
          </div>
        );
      case 'calendar':
        return (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('list')}
                className="p-1"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Ημερολόγιο
              </h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="p-1">
              <X className="w-4 h-4" />
            </Button>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Συμβάντα
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('calendar')}
                title="Προβολή ημερολογίου"
              >
                <Calendar className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('create')}
                title="Νέο συμβάν"
              >
                <Plus className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose} className="p-1">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );
    }
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'create':
        return (
          <EventForm
            onSuccess={() => setViewMode('list')}
            onCancel={() => setViewMode('list')}
          />
        );
      case 'calendar':
        return (
          <EventCalendarView
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
          />
        );
      default:
        return <EventList />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="absolute right-0 top-0 h-full w-96 bg-white dark:bg-gray-900 shadow-xl transform transition-transform">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            {renderHeader()}
            
            {/* Building Info */}
            {selectedBuilding && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                📍 {selectedBuilding.name}
              </div>
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
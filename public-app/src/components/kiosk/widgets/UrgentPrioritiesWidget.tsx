// frontend/components/kiosk/widgets/UrgentPrioritiesWidget.tsx

'use client';

import React from 'react';
import { AlertTriangle, Clock, Wrench, Phone, Euro, Bell } from 'lucide-react';
import { BaseWidget } from './base/BaseWidget';

interface UrgentPriority {
  id: string;
  title: string;
  description: string;
  type: 'maintenance' | 'financial' | 'emergency' | 'announcement' | 'general';
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
  contact?: string;
  amount?: number;
}

interface UrgentPrioritiesWidgetProps {
  data?: {
    urgent_priorities?: UrgentPriority[];
  };
  settings?: {
    title?: string;
    showTitle?: boolean;
    maxItems?: number;
    showDueDates?: boolean;
    showContact?: boolean;
  };
}

const UrgentPrioritiesWidget: React.FC<UrgentPrioritiesWidgetProps> = ({
  data,
  settings = {}
}) => {
  const {
    title = 'Άμεσες Προτεραιότητες',
    showTitle = true,
    maxItems = 5,
    showDueDates = true,
    showContact = true
  } = settings;

  // Use real data from API - no fallback mock data
  const priorities = data?.urgent_priorities || [];
  const displayPriorities = priorities.slice(0, maxItems);

  const getPriorityIcon = (type: string) => {
    switch (type) {
      case 'maintenance':
        return <Wrench className="w-5 h-5" />;
      case 'financial':
        return <Euro className="w-5 h-5" />;
      case 'emergency':
        return <AlertTriangle className="w-5 h-5" />;
      case 'announcement':
        return <Bell className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-kiosk-error-light bg-kiosk-error/20 border-kiosk-error/30';
      case 'medium':
        return 'text-kiosk-warning-light bg-kiosk-warning/20 border-kiosk-warning/30';
      case 'low':
        return 'text-kiosk-accent-light bg-kiosk-accent/20 border-kiosk-accent/30';
      default:
        return 'text-kiosk-neutral-300 bg-kiosk-neutral-800/20 border-kiosk-neutral-700/30';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'Υψηλή';
      case 'medium':
        return 'Μεσαία';
      case 'low':
        return 'Χαμηλή';
      default:
        return 'Γενική';
    }
  };

  return (
    <div className="h-full">
      {/* Compact Header with #0A7181 Integration */}
      {showTitle && (
        <div className="flex items-center space-x-2 mb-3">
          <AlertTriangle className="w-6 h-6 text-red-300" />
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
      )}

      <div className="h-full flex flex-col">
        {displayPriorities.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center">
            <div className="text-cyan-200">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-lg">Δεν υπάρχουν άμεσες προτεραιότητες</p>
              <p className="text-sm text-cyan-300/60 mt-1">Όλα είναι εντάξει!</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <div className="grid grid-cols-3 gap-3 h-full">
              {displayPriorities.slice(0, 6).map((priority) => (
                <div
                  key={priority.id}
                  className="bg-cyan-800/30 backdrop-blur-sm p-2 rounded-lg border border-cyan-500/30 transition-all duration-300 flex flex-col"
                >
                  <div className="flex items-start space-x-2 mb-2">
                    <div className="flex-shrink-0">
                      <div className={`p-1 rounded-full text-xs ${priority.priority === 'high' ? 'bg-red-500/20 text-red-300' : priority.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-cyan-500/20 text-cyan-300'}`}>
                        {getPriorityIcon(priority.type)}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-white text-xs leading-tight truncate">
                          {priority.title}
                        </h4>
                        {priority.priority === 'high' && (
                          <span className="px-1 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-300">
                            !
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-cyan-200 mb-1 leading-tight line-clamp-2">
                        {priority.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto space-y-1">
                    {showDueDates && priority.dueDate && (
                      <div className="flex items-center text-cyan-300 text-xs">
                        <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
                        <span className="truncate">{priority.dueDate}</span>
                      </div>
                    )}

                    {priority.amount && (
                      <div className="text-yellow-300 font-semibold text-xs">
                        €{priority.amount.toLocaleString()}
                      </div>
                    )}

                    {showContact && priority.contact && (
                      <div className="flex items-center text-cyan-300 truncate text-xs">
                        <Phone className="w-3 h-3 mr-1 flex-shrink-0" />
                        <span className="truncate">{priority.contact}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UrgentPrioritiesWidget;

'use client';

import { BaseWidgetProps } from '@/types/kiosk';
import {
  Phone,
  Shield,
  AlertTriangle,
  Heart,
  Zap,
  Flame,
  Droplets,
  Home
} from 'lucide-react';

export default function EmergencyWidget({ data, isLoading, error }: BaseWidgetProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-300"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-300">
        <div className="text-center">
          <div className="text-2xl mb-2">⚠️</div>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const emergencyContacts = [
    {
      id: 'fire',
      name: 'Πυροσβεστική',
      number: '199',
      icon: Flame,
      color: 'text-red-400',
      bgColor: 'from-red-900/40 to-red-800/40',
      borderColor: 'border-red-500/30'
    },
    {
      id: 'electricity',
      name: 'ΔΕΔΔΗΕ',
      number: '10500',
      icon: Zap,
      color: 'text-yellow-400',
      bgColor: 'from-yellow-900/40 to-yellow-800/40',
      borderColor: 'border-yellow-500/30'
    },
    {
      id: 'water',
      name: 'ΕΥΔΑΠ',
      number: '185',
      icon: Droplets,
      color: 'text-cyan-400',
      bgColor: 'from-cyan-900/40 to-cyan-800/40',
      borderColor: 'border-cyan-500/30'
    }
  ];

  return (
    <div className="h-full overflow-hidden">
      <div className="flex items-center space-x-2 mb-4 pb-2 border-b border-red-500/20">
        <AlertTriangle className="w-6 h-6 text-red-300" />
        <h2 className="text-lg font-bold text-white">Τηλέφωνα Έκτακτης Ανάγκης</h2>
      </div>

      <div className="space-y-3 h-full">
        {emergencyContacts.map((contact) => {
          const IconComponent = contact.icon;

          return (
            <div
              key={contact.id}
              className={`bg-gradient-to-br ${contact.bgColor} backdrop-blur-sm p-4 rounded-xl border ${contact.borderColor} hover:scale-105 transition-all cursor-pointer`}
              onClick={() => window.open(`tel:${contact.number}`, '_self')}
            >
              <div className="flex items-center space-x-3">
                <IconComponent className={`w-6 h-6 ${contact.color}`} />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-white mb-1">
                    {contact.name}
                  </h3>
                  <div className={`text-xl font-bold ${contact.color}`}>
                    {contact.number}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Important Notice */}
      <div className="mt-4 bg-gradient-to-br from-red-900/30 to-red-800/30 backdrop-blur-sm p-3 rounded-xl border border-red-500/20">
        <div className="flex items-center space-x-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-red-300" />
          <h4 className="text-sm font-semibold text-red-100">Σημαντική Παρατήρηση</h4>
        </div>
        <p className="text-xs text-red-200 leading-relaxed">
          Χρησιμοποιήστε αυτά τα τηλέφωνα μόνο σε περίπτωση πραγματικής έκτακτης ανάγκης.
          Για μη επείγουσες υποθέσεις, επικοινωνήστε με τη διοίκηση του κτιρίου.
        </p>
      </div>
    </div>
  );
}

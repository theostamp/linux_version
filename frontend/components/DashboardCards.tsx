'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { typography } from '@/lib/typography';
import { 
  AlertCircle, 
  Clock, 
  CheckCircle, 
  FileText, 
  ArrowRight,
  TrendingUp,
  Monitor,
  Settings
} from 'lucide-react';

type DashboardCardConfig = {
  key: string;
  label: string;
  icon: React.ReactNode;
  bgColor?: string;
  borderColor?: string;
  textColor?: string;
  filter?: Record<string, string>;
  apiCondition?: (item: any) => boolean;
  link?: string;
  description?: string;
};

type Props = {
  data: any[];
  cards: DashboardCardConfig[];
};

export default function DashboardCards({ data, cards }: Props) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const count = card.apiCondition
          ? data.filter(card.apiCondition).length
          : data.length;

        const handleClick = () => {
          if (card.link) {
            router.push(card.link);
          }
        };

        return (
          <div
            key={card.key}
            onClick={handleClick}
            className={`cursor-pointer rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 group hover:scale-105 ${
              card.bgColor || 'bg-white'
            } ${card.borderColor || 'border border-gray-200'}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${card.bgColor ? 'bg-white/20' : 'bg-gray-50'}`}>
                {card.icon}
              </div>
              <ArrowRight className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${
                card.textColor || 'text-gray-400'
              }`} />
            </div>
            <div className={`${typography.dashboardCardValue} mb-1 ${card.textColor || ''}`}>
              {count}
            </div>
            <div className={`${typography.dashboardCardLabel} ${card.textColor || ''}`}>
              {card.label}
            </div>
            {card.description && (
              <div className={`${typography.caption} mt-1 ${card.textColor ? 'opacity-80' : ''}`}>
                {card.description}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Predefined card configurations for common use cases
export const requestStatusCards: DashboardCardConfig[] = [
  {
    key: 'open',
    label: 'Ανοιχτά',
    icon: <AlertCircle className="w-5 h-5 text-red-600" />,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-900',
    apiCondition: (r: any) => r.status === 'open',
    link: '/requests?status=open',
    description: 'Αναμένουν απάντηση'
  },
  {
    key: 'in_progress',
    label: 'Σε Εξέλιξη',
    icon: <Clock className="w-5 h-5 text-yellow-600" />,
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-900',
    apiCondition: (r: any) => r.status === 'in_progress',
    link: '/requests?status=in_progress',
    description: 'Επεξεργάζονται'
  },
  {
    key: 'resolved',
    label: 'Ολοκληρωμένα',
    icon: <CheckCircle className="w-5 h-5 text-green-600" />,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-900',
    apiCondition: (r: any) => r.status === 'resolved',
    link: '/requests?status=resolved',
    description: 'Επιλύθηκαν'
  },
  {
    key: 'total',
    label: 'Σύνολο',
    icon: <FileText className="w-5 h-5 text-blue-600" />,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-900',
    link: '/requests',
    description: 'Όλα τα αιτήματα'
  }
];

export const quickStatsCards: DashboardCardConfig[] = [
  {
    key: 'announcements',
    label: 'Ανακοινώσεις',
    icon: <AlertCircle className="w-5 h-5 text-blue-600" />,
    link: '/announcements',
    description: 'Πρόσφατες ανακοινώσεις'
  },
  {
    key: 'votes',
    label: 'Ψηφοφορίες',
    icon: <CheckCircle className="w-5 h-5 text-green-600" />,
    link: '/votes',
    description: 'Ενεργές ψηφοφορίες'
  },
  {
    key: 'requests',
    label: 'Αιτήματα',
    icon: <FileText className="w-5 h-5 text-orange-600" />,
    link: '/requests',
    description: 'Εκκρεμή αιτήματα'
  },
  {
    key: 'buildings',
    label: 'Κτίρια',
    icon: <TrendingUp className="w-5 h-5 text-purple-600" />,
    link: '/buildings',
    description: 'Διαχείριση κτιρίων'
  }
];

export const kioskCards: DashboardCardConfig[] = [
  {
    key: 'kiosk_display',
    label: 'Kiosk Display',
    icon: <Monitor className="w-5 h-5 text-purple-600" />,
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-900',
    link: '/kiosk',
    description: 'Εμφάνιση κιόσκ'
  },
  {
    key: 'kiosk_preview',
    label: 'Preview Kiosk',
    icon: <Settings className="w-5 h-5 text-purple-600" />,
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-900',
    link: '/kiosk',
    description: 'Προεπισκόπηση κιόσκ'
  }
];

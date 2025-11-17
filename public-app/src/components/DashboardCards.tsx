'use client';

import { useRouter } from 'next/navigation';
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
  apiCondition?: (item: unknown) => boolean;
  link?: string;
  description?: string;
};

type Props = {
  data: unknown[];
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
            className={`cursor-pointer rounded-none p-4 shadow-sm hover:shadow-md transition-all duration-200 group hover:scale-105 ${
              card.bgColor || 'bg-white'
            } ${card.borderColor || 'border-0'}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${card.bgColor ? 'bg-white/20' : 'bg-gray-50'}`}>
                {card.icon}
              </div>
              <ArrowRight className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${
                card.textColor || 'text-gray-400'
              }`} />
            </div>
            <div className={`text-2xl font-bold mb-1 ${card.textColor || ''}`}>
              {count}
            </div>
            <div className={`text-sm font-medium ${card.textColor || ''}`}>
              {card.label}
            </div>
            {card.description && (
              <div className={`text-xs text-gray-500 mt-1 ${card.textColor ? 'opacity-80' : ''}`}>
                {card.description}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}


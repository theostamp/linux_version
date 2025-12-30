'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';

// Kaspersky-inspired category types
export type CategoryType = 'security' | 'performance' | 'privacy' | 'warning' | 'info' | 'success' | 'default';

type DashboardCardConfig = {
  key: string;
  label: string;
  icon: React.ReactNode;
  // Legacy props (for backward compatibility)
  bgColor?: string;
  borderColor?: string;
  textColor?: string;
  // New category prop (Kaspersky-style)
  category?: CategoryType;
  filter?: Record<string, string>;
  apiCondition?: (item: unknown) => boolean;
  link?: string;
  description?: string;
};

type Props = {
  data: unknown[];
  cards: DashboardCardConfig[];
};

// Kaspersky-inspired category styles
const categoryStyles: Record<CategoryType, {
  bg: string;
  border: string;
  text: string;
  icon: string;
  label: string;
}> = {
  security: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border border-blue-200 dark:border-blue-700/30',
    text: 'text-blue-800 dark:text-blue-300',
    icon: 'bg-blue-100 dark:bg-blue-800/30 text-blue-600 dark:text-blue-400',
    label: 'text-blue-700 dark:text-blue-400',
  },
  performance: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border border-purple-200 dark:border-purple-700/30',
    text: 'text-purple-800 dark:text-purple-300',
    icon: 'bg-purple-100 dark:bg-purple-800/30 text-purple-600 dark:text-purple-400',
    label: 'text-purple-700 dark:text-purple-400',
  },
  privacy: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    border: 'border border-orange-200 dark:border-orange-700/30',
    text: 'text-orange-800 dark:text-orange-300',
    icon: 'bg-orange-100 dark:bg-orange-800/30 text-orange-600 dark:text-orange-400',
    label: 'text-orange-700 dark:text-orange-400',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border border-amber-200 dark:border-amber-700/30',
    text: 'text-amber-800 dark:text-amber-300',
    icon: 'bg-amber-100 dark:bg-amber-800/30 text-amber-600 dark:text-amber-400',
    label: 'text-amber-700 dark:text-amber-400',
  },
  info: {
    bg: 'bg-cyan-50 dark:bg-cyan-900/20',
    border: 'border border-cyan-200 dark:border-cyan-700/30',
    text: 'text-cyan-800 dark:text-cyan-300',
    icon: 'bg-cyan-100 dark:bg-cyan-800/30 text-cyan-600 dark:text-cyan-400',
    label: 'text-cyan-700 dark:text-cyan-400',
  },
  success: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border border-green-200 dark:border-green-700/30',
    text: 'text-green-800 dark:text-green-300',
    icon: 'bg-green-100 dark:bg-green-800/30 text-green-600 dark:text-green-400',
    label: 'text-green-700 dark:text-green-400',
  },
  default: {
    bg: 'bg-white dark:bg-slate-800',
    border: 'border border-gray-200 dark:border-slate-700',
    text: 'text-gray-800 dark:text-gray-200',
    icon: 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400',
    label: 'text-gray-600 dark:text-gray-400',
  },
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

        // Use category if provided, otherwise fall back to legacy props or default
        const category = card.category || 'default';
        const styles = categoryStyles[category];

        // Allow legacy props to override category styles
        const bgClass = card.bgColor || styles.bg;
        const borderClass = card.borderColor || styles.border;
        const textClass = card.textColor || styles.text;

        return (
          <div
            key={card.key}
            onClick={handleClick}
            className={`cursor-pointer rounded-3xl p-4 shadow-card-soft hover:shadow-card-soft transition-all duration-200 group hover:scale-[1.02] hover:-translate-y-0.5 ${bgClass}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${styles.icon}`}>
                {card.icon}
              </div>
              <ArrowRight className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${styles.label}`} />
            </div>
            <div className={`text-2xl font-bold mb-1 ${textClass}`}>
              {count}
            </div>
            <div className={`text-sm font-medium text-accent-primary`}>
              {card.label}
            </div>
            {card.description && (
              <div className={`text-xs mt-1 ${styles.label} opacity-70`}>
                {card.description}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

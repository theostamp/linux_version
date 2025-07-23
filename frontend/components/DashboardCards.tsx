'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type DashboardCardConfig = {
  key: string;
  label: string;
  icon: string;
  bgColor?: string;
  filter?: Record<string, string>;
  apiCondition?: (item: any) => boolean;
  link?: string;
};

type Props = {
  data: any[];
  cards: DashboardCardConfig[];
};

export default function DashboardCards({ data, cards }: Props) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
            className={`cursor-pointer rounded-xl p-4 shadow hover:shadow-md transition text-white ${
              card.bgColor || 'bg-blue-600'
            }`}
          >
            <div className="text-3xl">{card.icon}</div>
            <div className="mt-2 text-sm">{card.label}</div>
            <div className="text-2xl font-bold">{count}</div>
          </div>
        );
      })}
    </div>
  );
}

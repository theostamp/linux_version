'use client';

import { useEffect, useState } from 'react';

export default function NewsTicker() {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    // Static headlines for demonstration
    setItems([
      'Ειδήσεις: Η οικονομία ανακάμπτει τον Ιούλιο',
      'Ανακοίνωση: Νέες εκδηλώσεις στην πόλη',
      'Tech News: Κυκλοφορεί το νέο smartphone',
    ]);
  }, []);

  return (
    <div className="overflow-hidden whitespace-nowrap text-sm bg-gray-200 dark:bg-gray-800 py-2">
      <div className="inline-block animate-marquee">
        {items.map((item) => (
          <span key={item} className="mx-4">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
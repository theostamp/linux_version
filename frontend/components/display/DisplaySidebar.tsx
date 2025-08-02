// components/display/DisplaySidebar.tsx
import { useEffect, useState } from 'react';

/**
 * Στατική πλαϊνή μπάρα μόνο για την οθόνη κοινόχρηστου χώρου.
 * Δεν επηρεάζει το υπάρχον Sidebar του dashboard.
 */
export function DisplaySidebar() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1_000);
    return () => clearInterval(t);
  }, []);

  return (
    <aside className="w-64 bg-gray-900 p-6 flex flex-col items-center justify-between shadow-inner">
      <h1 className="text-2xl font-bold tracking-wider text-center">
        POLYKATOIKIA
      </h1>

      <div className="text-center mt-8">
        <div className="text-4xl font-mono leading-none">
          {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="text-sm opacity-70">
          {now.toLocaleDateString('el-GR', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
          })}
        </div>
      </div>
    </aside>
  );
}

'use client';

import { useEffect, useState } from 'react';
import ErrorMessage from '@/components/ErrorMessage';

function codeToText(code: number): string {
  const map: Record<number, string> = {
    0: 'Αίθριος',
    1: 'Κυρίως καθαρός',
    2: 'Λίγα σύννεφα',
    3: 'Συννεφιά',
    45: 'Ομίχλη',
    48: 'Ομίχλη',
    51: 'Ασθενής ψιχάλα',
    53: 'Ψιχάλα',
    55: 'Έντονη ψιχάλα',
    61: 'Ασθενής βροχή',
    63: 'Μέτρια βροχή',
    65: 'Ισχυρή βροχή',
    80: 'Περιστασιακή βροχή',
    95: 'Καταιγίδα',
  };
  return map[code] ?? 'Άγνωστο';
}

export default function PublicInfoSidebar() {
  const [weather, setWeather] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const weatherResp = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=37.98&longitude=23.72&current_weather=true&timezone=Europe%2FAthens'
        );
        if (!weatherResp.ok) throw new Error('weather');
        const wData = await weatherResp.json();
        const { temperature, weathercode } = wData.current_weather;
        setWeather(`${temperature}°C - ${codeToText(weathercode)}`);

        const msgResp = await fetch('/api/quote');
        if (!msgResp.ok) throw new Error('message');
        const msgData = await msgResp.json();
        setMessage(msgData.content);

        setError(null);
      } catch (err) {
        console.error('Failed to load sidebar info', err);
        setError('Αποτυχία φόρτωσης πληροφοριών.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);
  if (loading) {
    return (
      <aside className="w-64 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 p-4 flex items-center justify-center">
        <p className="text-sm text-gray-500">Φόρτωση...</p>
      </aside>
    );
  }

  if (error) {
    return (
      <aside className="w-64 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 p-4">
        <ErrorMessage message={error} />
      </aside>
    );
  }

  return (
    <aside className="w-64 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 p-4 flex flex-col space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Καιρός</h2>
        <p className="text-sm text-gray-700 dark:text-gray-300">{weather}</p>
      </div>
      <div>
        <h2 className="text-lg font-semibold mb-1">Προτροπή</h2>
        <p className="text-sm text-gray-700 dark:text-gray-300">{message}</p>
      </div>
    </aside>
  );
}
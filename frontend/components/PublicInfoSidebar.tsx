'use client';

import { useEffect, useState } from 'react';

export default function PublicInfoSidebar() {
  const [weather, setWeather] = useState('25°C - Ηλιοφάνεια');
  const [message, setMessage] = useState('Εγγραφείτε στην εφαρμογή για περισσότερα νέα!');

  // In a real app, fetch weather or ads here
  useEffect(() => {
    // Placeholder for fetching data
  }, []);

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
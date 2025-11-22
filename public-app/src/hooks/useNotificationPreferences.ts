'use client';

import { useEffect, useState } from 'react';
import type { NotificationCategory } from '@/types/notifications';

export type NotificationPreference = {
  category: NotificationCategory;
  instant: boolean;
  scheduled: boolean;
};

const STORAGE_KEY = 'notification-preferences';

const CATEGORY_ORDER: NotificationCategory[] = [
  'announcement',
  'payment',
  'maintenance',
  'meeting',
  'reminder',
  'emergency',
];

export const DEFAULT_PREFERENCES: NotificationPreference[] = CATEGORY_ORDER.map((category) => ({
  category,
  instant: ['announcement', 'maintenance', 'emergency'].includes(category),
  scheduled: ['payment', 'reminder', 'meeting'].includes(category),
}));

const mergeWithDefaults = (stored?: NotificationPreference[]) => {
  const storedMap = new Map(stored?.map((pref) => [pref.category, pref]));
  return CATEGORY_ORDER.map(
    (category) => storedMap.get(category) || DEFAULT_PREFERENCES.find((pref) => pref.category === category)!
  );
};

const readFromStorage = (): NotificationPreference[] | undefined => {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as NotificationPreference[];
    return mergeWithDefaults(parsed);
  } catch {
    return undefined;
  }
};

export const getPreferenceForCategory = (
  preferences: NotificationPreference[],
  category: NotificationCategory
) => {
  return (
    preferences.find((pref) => pref.category === category) ||
    DEFAULT_PREFERENCES.find((pref) => pref.category === category)!
  );
};

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreference[]>(
    () => readFromStorage() || DEFAULT_PREFERENCES
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  const updatePreference = (
    category: NotificationCategory,
    updates: Partial<Omit<NotificationPreference, 'category'>>
  ) => {
    setPreferences((prev) =>
      mergeWithDefaults(prev).map((pref) =>
        pref.category === category ? { ...pref, ...updates, category } : pref
      )
    );
  };

  const resetPreferences = () => setPreferences(DEFAULT_PREFERENCES);

  return { preferences, updatePreference, resetPreferences };
}

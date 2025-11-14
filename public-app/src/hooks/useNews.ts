'use client';

import { useState, useEffect } from 'react';

interface NewsData {
  items: string[];
  timestamp: string;
  source: string;
  count: number;
  error?: string;
}

export function useNews(refreshInterval: number = 300000) { // 5 minutes default
  const [news, setNews] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchNews = async () => {
    try {
      setError(null);
      console.log('🔄 Fetching news from API...');

      const response = await fetch('/api/news/multiple', {
        cache: 'no-store', // Always get fresh data
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: NewsData = await response.json();
      console.log(`📰 Received ${data.count} news items from ${data.source}`);

      setNews(data.items);
      setLastUpdated(new Date());
      setLoading(false);

      if (data.error) {
        console.warn('⚠️ News API warning:', data.error);
      }

    } catch (err) {
      console.error('❌ Error fetching news:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch news');
      setLoading(false);

      // Set fallback news on error
      setNews([
        'Καλώς ήρθατε στην πολυκατοικία μας! 🏠',
        'Ενημερωθείτε για τα τελευταία νέα της Ελλάδας! 🇬🇷',
        'Συντήρηση και καθαριότητα κτιρίου σε εξέλιξη 🧹',
        'Νέα συστήματα ασφαλείας εγκαταστάθηκαν 🔒',
        'Ενημέρωση για τις κοινόχρηστες δαπάνες 💰'
      ]);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchNews();
  }, []);

  // Set up interval for refreshing news
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(fetchNews, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  return {
    news,
    loading,
    error,
    lastUpdated,
    refresh: fetchNews
  };
}

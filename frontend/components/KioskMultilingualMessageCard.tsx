'use client';

import { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';

interface MultilingualMessage {
  id: number;
  language: string;
  title: string;
  content: string;
}

interface KioskMultilingualMessageCardProps {
  messages: MultilingualMessage[];
  slideDuration?: number; // in seconds
}

const supportedLanguages: Record<string, string> = {
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
  it: 'Italiano',
  el: 'Ελληνικά',
};

export default function KioskMultilingualMessageCard({ messages, slideDuration = 15 }: KioskMultilingualMessageCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (messages.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % messages.length);
    }, slideDuration * 1000);

    return () => clearInterval(interval);
  }, [messages.length, slideDuration]);

  if (!messages || messages.length === 0) {
    return null; // Or a placeholder
  }

  const currentMessage = messages[currentIndex];

  return (
    <div className="bg-gradient-to-br from-purple-900/40 to-violet-900/40 backdrop-blur-sm p-6 rounded-xl border border-purple-500/30 shadow-lg h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-white">
          {currentMessage.title}
        </h3>
        <div className="flex items-center gap-2 px-3 py-1 bg-purple-900/50 rounded-full text-purple-200 text-sm">
          <Globe className="w-4 h-4" />
          <span>{supportedLanguages[currentMessage.language] || currentMessage.language.toUpperCase()}</span>
        </div>
      </div>
      
      <div className="flex-1 text-purple-100 text-sm opacity-90 leading-relaxed whitespace-pre-wrap overflow-y-auto pr-2">
        {currentMessage.content}
      </div>

      {messages.length > 1 && (
        <div className="flex justify-center mt-4 space-x-2">
          {messages.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                index === currentIndex ? 'bg-purple-300' : 'bg-purple-700'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
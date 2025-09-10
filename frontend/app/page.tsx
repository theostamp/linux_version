// frontend/app/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/contexts/AuthContext';
import { IntroAnimation } from '@/components/LoadingAnimation';


export default function Home() {
  const { user, isAuthReady } = useAuth();
  const router = useRouter();
  const [showIntro, setShowIntro] = useState(true);
  const [introCompleted, setIntroCompleted] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    if (user && isAuthReady && !hasRedirected) {
      console.log('Home: User authenticated, redirecting to dashboard');
      setHasRedirected(true);
      router.push('/dashboard');
    }
  }, [user, isAuthReady, router, hasRedirected]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowIntro(false);
      setIntroCompleted(true);
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  // Show loading while redirecting
  if (user || hasRedirected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Μετάβαση στο dashboard...</p>
        </div>
      </div>
    );
  }

  if (showIntro) {
    return <IntroAnimation />;
  }

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen p-6 text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-900 transition-opacity duration-1000 ${introCompleted ? 'opacity-100' : 'opacity-0'}`}>
      <div className="animate-fade-in-up text-center">
        <h1 className="text-4xl font-bold mb-4">Καλώς ήρθατε στον Ψηφιακό Θυρωρό</h1>
        <p className="text-lg mb-6">
          Ξεκινήστε διαμορφώνοντας το περιβάλλον σας ή επιλέξτε από το μενού αριστερά.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
        <a
          href="/dashboard"
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
        >
          Μετάβαση στο Dashboard
        </a>
        <a
          href="/login"
          className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition"
        >
          Σύνδεση
        </a>
        <a
          href="https://nextjs.org/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-gray-200 dark:bg-gray-800 px-6 py-2 rounded hover:bg-gray-300 dark:hover:bg-gray-700 transition"
        >
          Τεκμηρίωση Next.js
        </a>
        </div>
      </div>
    </div>
  );
}

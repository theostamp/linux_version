'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * NavigationLoader Component
 * Εμφανίζει ένα loading indicator όταν ο χρήστης πλοηγείται μεταξύ σελίδων
 * Χρήσιμο για αργές σελίδες όπως το Financial
 */
export default function NavigationLoader() {
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Όταν αλλάζει το pathname ή τα search params, σταμάτα το loading
    setLoading(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    // Intercept link clicks
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      
      if (link && link.href && link.target !== '_blank') {
        const url = new URL(link.href);
        const currentUrl = new URL(window.location.href);
        
        // Μόνο αν πηγαίνουμε σε διαφορετική σελίδα
        if (url.pathname !== currentUrl.pathname || url.search !== currentUrl.search) {
          setLoading(true);
        }
      }
    };

    // Listen for browser back/forward
    const handlePopState = () => {
      setLoading(true);
    };

    document.addEventListener('click', handleLinkClick);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('click', handleLinkClick);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  if (!loading) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[9999] flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4 border-2 border-blue-100 dark:border-blue-900">
        <div className="flex flex-col items-center space-y-6">
          {/* Animated Logo/Icon */}
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-100 dark:border-blue-900 rounded-full animate-spin">
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin"></div>
            </div>
            {/* Building Icon in center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
          </div>
          
          {/* Loading Title */}
          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
              Φόρτωση σελίδας
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Παρακαλώ περιμένετε...
            </p>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 rounded-full animate-pulse relative">
              <div className="absolute inset-0 bg-white/30 animate-shimmer"></div>
            </div>
          </div>
          
          {/* Animated Dots */}
          <div className="flex space-x-2">
            <div className="w-3 h-3 bg-blue-600 dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-3 h-3 bg-blue-600 dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-3 h-3 bg-blue-600 dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          
          {/* Helper Text */}
          <p className="text-xs text-gray-500 dark:text-gray-500 text-center max-w-xs">
            Η σελίδα φορτώνει... Αν η αναμονή διαρκεί πολύ, ελέγξτε τη σύνδεσή σας.
          </p>
        </div>
      </div>
    </div>
  );
}

// Add shimmer animation to global CSS if not exists
// You can add this to your globals.css or tailwind.config.js


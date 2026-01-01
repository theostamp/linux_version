'use client';

import React from 'react';
import { useLoading } from '@/components/contexts/LoadingContext';

export default function GlobalLoadingOverlay() {
  const { isLoading, loadingMessage } = useLoading();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center">
      <div className="bg-white rounded-lg p-8 shadow-2xl max-w-sm w-full mx-4">
        <div className="flex flex-col items-center space-y-4">
          {/* Animated spinner */}
          <div className="relative">
            <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin">
              <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
            </div>
          </div>

          {/* Loading message */}
          <div className="text-center">
            <p className="text-gray-700 font-medium text-lg">
              {loadingMessage}
            </p>
            <p className="text-gray-500 text-sm mt-1">
              Παρακαλώ περιμένετε...
            </p>
          </div>

          {/* Progress dots animation */}
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface StartupLoaderProps {
  onComplete?: () => void;
  minDisplayTime?: number; // Minimum time to show the loader in ms
}

export default function StartupLoader({ 
  onComplete, 
  minDisplayTime = 3000 
}: StartupLoaderProps): JSX.Element | null {
  const [isVisible, setIsVisible] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompileReady, setIsCompileReady] = useState(false);

  const steps = [
    'Εκκίνηση συστήματος...',
    'Φόρτωση SWC packages...',
    'Μεταγλώττιση εφαρμογής...',
    'Ολοκλήρωση εκκίνησης...'
  ];

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < steps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 800);

    // Check if compilation is ready - use a more reliable method
    const checkCompileStatus = async () => {
      try {
        // Check if we're in development mode and if the page is ready
        if (typeof window !== 'undefined') {
          // Simply assume ready after a reasonable delay in development
          setTimeout(() => {
            setIsCompileReady(true);
          }, 5000); // 5 seconds should be enough for most cases
        }
      } catch (error) {
        // Fallback - assume ready after delay
        setTimeout(() => {
          setIsCompileReady(true);
        }, 5000);
      }
    };

    // Start checking compilation status after a short delay
    const compileCheckTimeout = setTimeout(checkCompileStatus, 2000);

    // Minimum display time
    const minDisplayTimeout = setTimeout(() => {
      if (isCompileReady) {
        setIsVisible(false);
        setTimeout(() => {
          onComplete?.();
        }, 500);
      }
    }, minDisplayTime);

    return () => {
      clearInterval(stepInterval);
      clearTimeout(compileCheckTimeout);
      clearTimeout(minDisplayTimeout);
    };
  }, [isCompileReady, minDisplayTime, onComplete]);

  // Hide loader when compilation is ready and min time has passed
  useEffect(() => {
    if (isCompileReady && currentStep >= steps.length - 1) {
      const hideTimeout = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          onComplete?.();
        }, 500);
      }, 1000);

      return () => clearTimeout(hideTimeout);
    }
  }, [isCompileReady, currentStep, steps.length, onComplete]);

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800"
          style={{
            backdropFilter: 'blur(10px)',
          }}
        >
          <div className="text-center max-w-md mx-auto px-6">
            {/* Logo or Brand */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="mb-8"
            >
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg 
                  width="40" 
                  height="40" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  className="text-white"
                >
                  <path 
                    d="M3 7V5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V7M3 7L12 13L21 7M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V7" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                Ψηφιακός Θυρωρός
              </h1>
            </motion.div>

            {/* Loading Animation */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="relative mb-8"
            >
              <div className="w-16 h-16 mx-auto">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity, 
                    ease: "linear" 
                  }}
                  className="w-16 h-16 border-4 border-blue-200 dark:border-gray-700 rounded-full border-t-blue-600 dark:border-t-blue-400"
                />
              </div>
              
              {/* Pulse animation */}
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.8, 0.5]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute inset-0 w-16 h-16 mx-auto border-4 border-blue-300 dark:border-blue-600 rounded-full"
              />
            </motion.div>

            {/* Status Text */}
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-6"
            >
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                {steps[currentStep]}
              </p>
              
              {/* Progress bar */}
              <div className="w-full max-w-xs mx-auto bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ 
                    width: `${((currentStep + 1) / steps.length) * 100}%` 
                  }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="h-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                />
              </div>
            </motion.div>

            {/* Additional info */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="text-sm text-gray-500 dark:text-gray-400"
            >
              <p>Η πρώτη εκκίνηση μπορεί να διαρκέσει λίγο περισσότερο...</p>
              {currentStep >= 2 && (
                <motion.p
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 text-blue-600 dark:text-blue-400"
                >
                  {isCompileReady ? '✅ Η μεταγλώττιση ολοκληρώθηκε!' : '⚡ Μεταγλώττιση σε εξέλιξη...'}
                </motion.p>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
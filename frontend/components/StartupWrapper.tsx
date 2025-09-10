"use client";

import React, { useState, useEffect } from 'react';
import StartupLoader from './StartupLoader';

interface StartupWrapperProps {
  children: React.ReactNode;
}

export default function StartupWrapper({ children }: StartupWrapperProps) {
  const [showStartupLoader, setShowStartupLoader] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    // Only show startup loader in development and on initial load
    if (process.env.NODE_ENV === 'development' && isInitialLoad) {
      // Check if this is actually the first load by looking at session storage
      const hasShownStartup = sessionStorage.getItem('startupLoaderShown');
      
      if (!hasShownStartup) {
        setShowStartupLoader(true);
        sessionStorage.setItem('startupLoaderShown', 'true');
      } else {
        setIsInitialLoad(false);
      }
    } else {
      setIsInitialLoad(false);
    }
  }, [isInitialLoad]);

  const handleStartupComplete = () => {
    setShowStartupLoader(false);
    setIsInitialLoad(false);
  };

  if (showStartupLoader) {
    return (
      <>
        <StartupLoader onComplete={handleStartupComplete} />
        <div style={{ visibility: 'hidden', position: 'absolute' }}>
          {children}
        </div>
      </>
    );
  }

  return <>{children}</>;
}
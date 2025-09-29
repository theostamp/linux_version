"use client";

import React, { useState, useEffect } from 'react';
import EnhancedIntroAnimation from './EnhancedIntroAnimation';

interface IntroWrapperProps {
  children: React.ReactNode;
}

export default function IntroWrapper({ children }: IntroWrapperProps) {
  const [showIntro, setShowIntro] = useState(false);
  const [hasVisited, setHasVisited] = useState(false);

  useEffect(() => {
    // Check if this is the first visit
    const visited = localStorage.getItem('hasVisited');
    
    if (!visited) {
      setShowIntro(true);
      setHasVisited(true);
      
      // Mark as visited
      localStorage.setItem('hasVisited', 'true');
    } else {
      setHasVisited(true);
    }
  }, []);

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  // Don't render anything until we've checked localStorage
  if (!hasVisited) {
    return null;
  }

  return (
    <>
      {showIntro && (
        <EnhancedIntroAnimation onComplete={handleIntroComplete} />
      )}
      {children}
    </>
  );
}




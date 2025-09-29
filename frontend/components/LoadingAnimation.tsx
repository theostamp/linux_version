"use client";

import React from 'react';

interface LoadingAnimationProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'spinner' | 'pulse' | 'wave' | 'building';
}

export default function LoadingAnimation({ 
  message = "Φόρτωση...", 
  size = 'medium',
  variant = 'building'
}: LoadingAnimationProps) {
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-16 h-16', 
    large: 'w-24 h-24'
  };

  const textSizes = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg'
  };

  const SpinnerAnimation = () => (
    <div className={`${sizeClasses[size]} animate-spin rounded-full border-4 border-blue-200 border-t-blue-600`} />
  );

  const PulseAnimation = () => (
    <div className={`${sizeClasses[size]} bg-blue-600 rounded-full animate-pulse`} />
  );

  const WaveAnimation = () => (
    <div className="flex space-x-1">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="w-2 h-8 bg-blue-600 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  );

  const BuildingAnimation = () => (
    <div className="relative">
      <div className="flex space-x-2 mb-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-4 bg-blue-600 rounded-t-lg animate-pulse"
            style={{ 
              height: `${24 + i * 8}px`,
              animationDelay: `${i * 0.3}s`,
              animationDuration: '1.5s'
            }}
          />
        ))}
      </div>
      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );

  const renderAnimation = () => {
    switch (variant) {
      case 'spinner':
        return <SpinnerAnimation />;
      case 'pulse':
        return <PulseAnimation />;
      case 'wave':
        return <WaveAnimation />;
      case 'building':
        return <BuildingAnimation />;
      default:
        return <SpinnerAnimation />;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      {renderAnimation()}
      <p className={`${textSizes[size]} text-gray-600 dark:text-gray-300 font-medium animate-pulse`}>
        {message}
      </p>
    </div>
  );
}

// Intro Animation Component
export function IntroAnimation() {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [isVisible, setIsVisible] = React.useState(true);

  const steps = [
    "Αρχικοποίηση συστήματος...",
    "Φόρτωση δεδομένων...",
    "Σύνδεση με βάση δεδομένων...",
    "Προετοιμασία περιβάλλοντος..."
  ];

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= steps.length - 1) {
          setTimeout(() => setIsVisible(false), 1000);
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 800);

    return () => clearInterval(interval);
  }, [steps.length]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center transition-opacity duration-1000">
      <div className="text-center space-y-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">
            Ψηφιακός Θυρωρός
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Σύστημα Διαχείρισης Κτηρίων
          </p>
        </div>
        
        <LoadingAnimation 
          message={steps[currentStep]} 
          size="large" 
          variant="building"
        />
        
        <div className="flex justify-center space-x-2 mt-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                i <= currentStep ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Compile Animation Component  
export function CompileAnimation({ isBuilding }: { isBuilding: boolean }) {
  if (!isBuilding) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-2xl max-w-sm mx-4">
        <LoadingAnimation 
          message="Γίνεται μεταγλώττιση..." 
          size="medium" 
          variant="wave"
        />
      </div>
    </div>
  );
}
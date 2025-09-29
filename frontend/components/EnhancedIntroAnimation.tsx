"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Wifi, Database, Shield, CheckCircle, Loader2 } from 'lucide-react';
import { GreekBuildingIcon, GreekBorder, GreekLoadingAnimation } from './GreekThemeElements';

interface EnhancedIntroAnimationProps {
  onComplete?: () => void;
  duration?: number;
}

interface LoadingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  duration: number;
}

export default function EnhancedIntroAnimation({ 
  onComplete, 
  duration = 5000 
}: EnhancedIntroAnimationProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(0);

  const steps: LoadingStep[] = [
    {
      id: 'init',
      title: 'Αρχικοποίηση Συστήματος',
      description: 'Προετοιμασία του περιβάλλοντος εργασίας',
      icon: <Building2 className="w-8 h-8" />,
      duration: 1000
    },
    {
      id: 'network',
      title: 'Σύνδεση Δικτύου',
      description: 'Εγκαθίδρυση ασφαλούς σύνδεσης',
      icon: <Wifi className="w-8 h-8" />,
      duration: 1200
    },
    {
      id: 'database',
      title: 'Σύνδεση Βάσης Δεδομένων',
      description: 'Φόρτωση και επαλήθευση δεδομένων',
      icon: <Database className="w-8 h-8" />,
      duration: 1500
    },
    {
      id: 'security',
      title: 'Ενεργοποίηση Ασφαλείας',
      description: 'Ρύθμιση συστήματος ασφαλείας',
      icon: <Shield className="w-8 h-8" />,
      duration: 1000
    },
    {
      id: 'complete',
      title: 'Ολοκλήρωση',
      description: 'Έτοιμο για χρήση!',
      icon: <CheckCircle className="w-8 h-8" />,
      duration: 300
    }
  ];

  useEffect(() => {
    let stepTimer: NodeJS.Timeout;
    let progressTimer: NodeJS.Timeout;
    let currentStepIndex = 0;
    let currentProgress = 0;

    const updateProgress = () => {
      currentProgress += 2;
      setProgress(Math.min(currentProgress, 100));
      
      if (currentProgress < 100) {
        progressTimer = setTimeout(updateProgress, duration / 50);
      }
    };

    const nextStep = () => {
      if (currentStepIndex < steps.length - 1) {
        currentStepIndex++;
        setCurrentStep(currentStepIndex);
        stepTimer = setTimeout(nextStep, steps[currentStepIndex].duration);
      } else {
        // Animation completed
        setTimeout(() => {
          setIsVisible(false);
          onComplete?.();
        }, 500);
      }
    };

    // Start progress animation
    progressTimer = setTimeout(updateProgress, 50);
    
    // Start step progression
    stepTimer = setTimeout(nextStep, steps[0].duration);

    return () => {
      clearTimeout(stepTimer);
      clearTimeout(progressTimer);
    };
  }, [duration, onComplete]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1
      }
    },
    exit: { 
      opacity: 0,
      scale: 0.95,
      transition: {
        duration: 0.5,
        ease: "easeInOut"
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  const stepVariants = {
    hidden: { x: -20, opacity: 0 },
    visible: { 
      x: 0, 
      opacity: 1,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    },
    exit: { 
      x: 20, 
      opacity: 0,
      transition: {
        duration: 0.2
      }
    }
  };

  const iconVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: { 
      scale: 1, 
      rotate: 0,
      transition: {
        duration: 0.5,
        ease: "backOut"
      }
    },
    pulse: {
      scale: [1, 1.1, 1],
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 dark:bg-blue-800 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200 dark:bg-purple-800 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute top-40 left-40 w-80 h-80 bg-pink-200 dark:bg-pink-800 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        <motion.div 
          className="relative z-10 text-center space-y-8 max-w-md mx-4"
          variants={itemVariants}
        >
          {/* Logo/Title Section */}
          <motion.div variants={itemVariants}>
            <motion.div
              className="mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ 
                duration: 0.6, 
                ease: "backOut",
                delay: 0.2 
              }}
            >
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <GreekBuildingIcon size={40} className="text-white" />
              </div>
            </motion.div>
            
            <motion.h1 
              className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2"
              variants={itemVariants}
            >
              Ψηφιακός Θυρωρός
            </motion.h1>
            
            <motion.p 
              className="text-lg text-gray-600 dark:text-gray-300"
              variants={itemVariants}
            >
              Σύστημα Διαχείρισης Κτηρίων
            </motion.p>
          </motion.div>

          {/* Current Step Display */}
          <motion.div 
            className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden"
            variants={itemVariants}
          >
            {/* Greek decorative borders */}
            <GreekBorder variant="meander" className="absolute top-0 left-0 opacity-20" />
            <GreekBorder variant="wave" className="absolute bottom-0 left-0 opacity-20" />
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-4"
              >
                <motion.div
                  className="flex items-center justify-center space-x-3"
                  variants={iconVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <motion.div
                    className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl text-white"
                    variants={iconVariants}
                    animate={currentStep < steps.length - 1 ? "pulse" : "visible"}
                  >
                    {steps[currentStep].icon}
                  </motion.div>
                  
                  {currentStep < steps.length - 1 && (
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                  )}
                </motion.div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-1">
                    {steps[currentStep].title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {steps[currentStep].description}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Progress Bar */}
            <motion.div className="mt-6 space-y-2">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Πρόοδος</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </div>
            </motion.div>
          </motion.div>

          {/* Step Indicators */}
          <motion.div 
            className="flex justify-center space-x-2"
            variants={itemVariants}
          >
            {steps.map((_, index) => (
              <motion.div
                key={index}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index <= currentStep 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 scale-110' 
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
                animate={{
                  scale: index === currentStep ? 1.2 : 1,
                  opacity: index <= currentStep ? 1 : 0.5
                }}
                transition={{ duration: 0.2 }}
              />
            ))}
          </motion.div>

          {/* Loading Steps List */}
          <motion.div 
            className="space-y-2 text-left"
            variants={itemVariants}
          >
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                className={`flex items-center space-x-3 text-sm transition-all duration-300 ${
                  index < currentStep 
                    ? 'text-green-600 dark:text-green-400' 
                    : index === currentStep
                    ? 'text-blue-600 dark:text-blue-400 font-medium'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
                animate={{
                  opacity: index <= currentStep ? 1 : 0.6
                }}
              >
                <div className="w-4 h-4 flex items-center justify-center">
                  {index < currentStep ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : index === currentStep ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <div className="w-2 h-2 bg-current rounded-full" />
                  )}
                </div>
                <span>{step.title}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Compile Detection Hook
export function useCompileDetection() {
  const [isCompiling, setIsCompiling] = useState(false);
  const [hasCompiled, setHasCompiled] = useState(false);

  useEffect(() => {
    // Check if this is the first visit/compile
    const hasVisited = localStorage.getItem('hasVisited');
    
    if (!hasVisited) {
      setIsCompiling(true);
      setHasCompiled(true);
      
      // Mark as visited
      localStorage.setItem('hasVisited', 'true');
      
      // Simulate compile time
      const timer = setTimeout(() => {
        setIsCompiling(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  return { isCompiling, hasCompiled };
}


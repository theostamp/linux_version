"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SmoothTransitionsProps {
  children: React.ReactNode;
  className?: string;
}

// Page transition variants
export const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98
  },
  in: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4
    }
  },
  out: {
    opacity: 0,
    y: -20,
    scale: 0.98,
    transition: {
      duration: 0.3
    }
  }
};

// Stagger animation for lists
export const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

export const staggerItem = {
  hidden: { 
    opacity: 0, 
    y: 20,
    scale: 0.95
  },
  show: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4
    }
  }
};

// Hover animations
export const hoverScale = {
  scale: 1.05,
  transition: {
    duration: 0.2,
    ease: "easeOut"
  }
};

export const hoverLift = {
  y: -5,
  boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
  transition: {
    duration: 0.2,
    ease: "easeOut"
  }
};

// Button animations
export const buttonVariants = {
  rest: { 
    scale: 1,
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
  },
  hover: { 
    scale: 1.02,
    boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
    transition: {
      duration: 0.2
    }
  },
  tap: { 
    scale: 0.98,
    transition: {
      duration: 0.1
    }
  }
};

// Card animations
export const cardVariants = {
  rest: {
    scale: 1,
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
  },
  hover: {
    scale: 1.02,
    boxShadow: "0 8px 25px rgba(0,0,0,0.15)",
    y: -5,
    transition: {
      duration: 0.3
    }
  }
};

// Loading skeleton animation
export const skeletonVariants = {
  initial: {
    opacity: 0.6,
    scale: 1
  },
  animate: {
    opacity: [0.6, 1, 0.6],
    scale: [1, 1.02, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity
    }
  }
};

// Fade in from bottom
export const fadeInUp = {
  initial: {
    opacity: 0,
    y: 30
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5
    }
  }
};

// Slide in from left
export const slideInLeft = {
  initial: {
    opacity: 0,
    x: -30
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4
    }
  }
};

// Slide in from right
export const slideInRight = {
  initial: {
    opacity: 0,
    x: 30
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4
    }
  }
};

// Scale in animation
export const scaleIn = {
  initial: {
    opacity: 0,
    scale: 0.8
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4
    }
  }
};

// Rotate in animation
export const rotateIn = {
  initial: {
    opacity: 0,
    rotate: -180,
    scale: 0.5
  },
  animate: {
    opacity: 1,
    rotate: 0,
    scale: 1,
    transition: {
      duration: 0.6
    }
  }
};

// Page wrapper component
export function PageWrapper({ children, className = "" }: SmoothTransitionsProps) {
  return (
    <motion.div
      className={className}
      variants={pageVariants}
      initial="initial"
      animate="in"
      exit="out"
    >
      {children}
    </motion.div>
  );
}

// Stagger wrapper for lists
export function StaggerWrapper({ children, className = "" }: SmoothTransitionsProps) {
  return (
    <motion.div
      className={className}
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  );
}

// Animated button component
interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function AnimatedButton({ 
  children, 
  variant = 'primary', 
  size = 'md',
  className = "",
  ...props 
}: AnimatedButtonProps) {
  const baseClasses = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600",
    ghost: "text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:ring-gray-500 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800"
  };
  
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg"
  };

  return (
    <motion.button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      variants={buttonVariants}
      initial="rest"
      whileHover="hover"
      whileTap="tap"
      {...(props as any)}
    >
      {children}
    </motion.button>
  );
}

// Animated card component
interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function AnimatedCard({ children, className = "", onClick }: AnimatedCardProps) {
  return (
    <motion.div
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}
      variants={cardVariants}
      initial="rest"
      whileHover="hover"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {children}
    </motion.div>
  );
}

// Loading skeleton component
interface SkeletonProps {
  className?: string;
  lines?: number;
}

export function Skeleton({ className = "", lines = 1 }: SkeletonProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <motion.div
          key={i}
          className="h-4 bg-gray-200 dark:bg-gray-700 rounded"
          variants={skeletonVariants}
          initial="initial"
          animate="animate"
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  );
}

// Fade in wrapper
export function FadeInWrapper({ children, className = "", delay = 0 }: SmoothTransitionsProps & { delay?: number }) {
  return (
    <motion.div
      className={className}
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

// Slide in wrapper
export function SlideInWrapper({ 
  children, 
  className = "", 
  direction = "left",
  delay = 0 
}: SmoothTransitionsProps & { direction?: "left" | "right"; delay?: number }) {
  const variants = direction === "left" ? slideInLeft : slideInRight;
  
  return (
    <motion.div
      className={className}
      variants={variants}
      initial="initial"
      animate="animate"
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

// Scale in wrapper
export function ScaleInWrapper({ children, className = "", delay = 0 }: SmoothTransitionsProps & { delay?: number }) {
  return (
    <motion.div
      className={className}
      variants={scaleIn}
      initial="initial"
      animate="animate"
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

// Rotate in wrapper
export function RotateInWrapper({ children, className = "", delay = 0 }: SmoothTransitionsProps & { delay?: number }) {
  return (
    <motion.div
      className={className}
      variants={rotateIn}
      initial="initial"
      animate="animate"
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}




"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Building2, Home, Users, Shield, Euro, Calendar, FileText, Settings } from 'lucide-react';

// Greek-themed color palette
export const greekColors = {
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6', // Main blue
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  secondary: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b', // Main gray
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  accent: {
    50: '#fefce8',
    100: '#fef9c3',
    200: '#fef08a',
    300: '#fde047',
    400: '#facc15',
    500: '#eab308', // Golden yellow
    600: '#ca8a04',
    700: '#a16207',
    800: '#854d0e',
    900: '#713f12',
  }
};

// Greek architectural patterns
export const greekPatterns = {
  meander: "M0,0 L20,0 L20,20 L40,20 L40,0 L60,0 L60,20 L80,20 L80,0 L100,0 L100,20 L80,20 L80,40 L60,40 L60,20 L40,20 L40,40 L20,40 L20,20 L0,20 Z",
  wave: "M0,20 Q10,0 20,20 T40,20 T60,20 T80,20 T100,20 L100,40 L0,40 Z",
  column: "M10,0 L15,0 L15,100 L10,100 Z M20,0 L25,0 L25,100 L20,100 Z M30,0 L35,0 L35,100 L30,100 Z"
};

// Greek-themed icons with animations
export const GreekIcon = ({ 
  icon, 
  size = 24, 
  className = "",
  animate = false 
}: { 
  icon: React.ReactNode; 
  size?: number; 
  className?: string;
  animate?: boolean;
}) => {
  const iconVariants = {
    rest: { scale: 1, rotate: 0 },
    hover: { 
      scale: 1.1, 
      rotate: 5,
      transition: { duration: 0.2 }
    },
    animate: animate ? {
      rotate: [0, 5, -5, 0],
      transition: { duration: 2, repeat: Infinity }
    } : {}
  };

  return (
    <motion.div
      className={`inline-flex items-center justify-center ${className}`}
      variants={iconVariants}
      initial="rest"
      whileHover="hover"
      animate={animate ? "animate" : "rest"}
    >
      {icon}
    </motion.div>
  );
};

// Greek-themed building icon
export const GreekBuildingIcon = ({ size = 32, className = "" }: { size?: number; className?: string }) => (
  <GreekIcon
    icon={
      <svg width={size} height={size} viewBox="0 0 32 32" className={className}>
        {/* Greek column base */}
        <rect x="4" y="24" width="24" height="4" fill="currentColor" rx="1"/>
        {/* Main building */}
        <rect x="6" y="8" width="20" height="16" fill="currentColor" rx="1"/>
        {/* Greek columns */}
        <rect x="8" y="4" width="2" height="20" fill="currentColor"/>
        <rect x="12" y="4" width="2" height="20" fill="currentColor"/>
        <rect x="16" y="4" width="2" height="20" fill="currentColor"/>
        <rect x="20" y="4" width="2" height="20" fill="currentColor"/>
        {/* Roof */}
        <polygon points="6,8 16,2 26,8" fill="currentColor"/>
        {/* Windows */}
        <rect x="10" y="12" width="3" height="4" fill="white" opacity="0.8"/>
        <rect x="15" y="12" width="3" height="4" fill="white" opacity="0.8"/>
        <rect x="20" y="12" width="3" height="4" fill="white" opacity="0.8"/>
        <rect x="10" y="18" width="3" height="4" fill="white" opacity="0.8"/>
        <rect x="15" y="18" width="3" height="4" fill="white" opacity="0.8"/>
        <rect x="20" y="18" width="3" height="4" fill="white" opacity="0.8"/>
      </svg>
    }
    size={size}
    className={className}
  />
);

// Greek-themed decorative border
export const GreekBorder = ({ 
  variant = "meander", 
  className = "",
  color = "currentColor"
}: { 
  variant?: keyof typeof greekPatterns; 
  className?: string;
  color?: string;
}) => (
  <motion.div
    className={`w-full h-8 ${className}`}
    initial={{ opacity: 0, scaleX: 0 }}
    animate={{ opacity: 1, scaleX: 1 }}
    transition={{ duration: 1, ease: "easeOut" }}
  >
    <svg width="100%" height="100%" viewBox="0 0 100 20" preserveAspectRatio="none">
      <path
        d={greekPatterns[variant]}
        fill={color}
        opacity="0.3"
      />
    </svg>
  </motion.div>
);

// Greek-themed card with architectural elements
interface GreekCardProps {
  children: React.ReactNode;
  title?: string;
  icon?: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'accent';
}

export const GreekCard = ({ 
  children, 
  title, 
  icon, 
  className = "",
  variant = 'primary'
}: GreekCardProps) => {
  const variantClasses = {
    primary: 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 border-blue-200 dark:border-blue-700',
    secondary: 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-gray-200 dark:border-gray-600',
    accent: 'bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900 dark:to-yellow-800 border-yellow-200 dark:border-yellow-700'
  };

  return (
    <motion.div
      className={`relative overflow-hidden rounded-lg border-2 ${variantClasses[variant]} ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
    >
      {/* Decorative top border */}
      <GreekBorder variant="meander" className="absolute top-0 left-0" />
      
      <div className="p-6 pt-10">
        {title && (
          <div className="flex items-center space-x-3 mb-4">
            {icon && (
              <GreekIcon icon={icon} size={24} />
            )}
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
              {title}
            </h3>
          </div>
        )}
        {children}
      </div>
      
      {/* Decorative bottom border */}
      <GreekBorder variant="wave" className="absolute bottom-0 left-0" />
    </motion.div>
  );
};

// Greek-themed button with architectural styling
interface GreekButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const GreekButton = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  icon,
  className = "",
  ...props 
}: GreekButtonProps) => {
  const baseClasses = "relative inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 overflow-hidden";
  
  const variantClasses = {
    primary: "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 focus:ring-blue-500 shadow-lg hover:shadow-xl",
    secondary: "bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-700 hover:to-gray-800 focus:ring-gray-500 shadow-lg hover:shadow-xl",
    accent: "bg-gradient-to-r from-yellow-500 to-yellow-600 text-white hover:from-yellow-600 hover:to-yellow-700 focus:ring-yellow-500 shadow-lg hover:shadow-xl"
  };
  
  const sizeClasses = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg"
  };

  return (
    <motion.button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      {...props}
    >
      {/* Decorative pattern overlay */}
      <div className="absolute inset-0 opacity-10">
        <GreekBorder variant="meander" className="w-full h-full" />
      </div>
      
      <div className="relative flex items-center space-x-2">
        {icon && <GreekIcon icon={icon} size={20} />}
        <span>{children}</span>
      </div>
    </motion.button>
  );
};

// Greek-themed loading animation
export const GreekLoadingAnimation = ({ 
  message = "Φόρτωση...", 
  size = 'medium' 
}: { 
  message?: string; 
  size?: 'small' | 'medium' | 'large';
}) => {
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

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <motion.div
        className={`${sizeClasses[size]} relative`}
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        {/* Greek column animation */}
        <div className="absolute inset-0 flex items-center justify-center">
          <GreekBuildingIcon size={size === 'small' ? 24 : size === 'medium' ? 48 : 72} />
        </div>
        
        {/* Rotating border */}
        <div className={`${sizeClasses[size]} border-4 border-blue-200 border-t-blue-600 rounded-full`} />
      </motion.div>
      
      <motion.p 
        className={`${textSizes[size]} text-gray-600 dark:text-gray-300 font-medium`}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        {message}
      </motion.p>
    </div>
  );
};

// Greek-themed section header
interface GreekSectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
}

export const GreekSectionHeader = ({ 
  title, 
  subtitle, 
  icon, 
  className = "" 
}: GreekSectionHeaderProps) => (
  <motion.div
    className={`text-center space-y-4 ${className}`}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, ease: "easeOut" }}
  >
    {/* Decorative top border */}
    <GreekBorder variant="meander" className="mx-auto w-32" />
    
    <div className="space-y-2">
      {icon && (
        <div className="flex justify-center">
          <GreekIcon icon={icon} size={32} animate />
        </div>
      )}
      
      <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        {title}
      </h2>
      
      {subtitle && (
        <p className="text-lg text-gray-600 dark:text-gray-300">
          {subtitle}
        </p>
      )}
    </div>
    
    {/* Decorative bottom border */}
    <GreekBorder variant="wave" className="mx-auto w-32" />
  </motion.div>
);

// Greek-themed feature grid
interface GreekFeatureGridProps {
  features: Array<{
    icon: React.ReactNode;
    title: string;
    description: string;
  }>;
  className?: string;
}

export const GreekFeatureGrid = ({ features, className = "" }: GreekFeatureGridProps) => (
  <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
    {features.map((feature, index) => (
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        whileHover={{ y: -5, transition: { duration: 0.2 } }}
      >
        <GreekCard
          title={feature.title}
          icon={feature.icon}
          variant="primary"
        >
          <p className="text-gray-600 dark:text-gray-300">
            {feature.description}
          </p>
        </GreekCard>
      </motion.div>
    ))}
  </div>
);




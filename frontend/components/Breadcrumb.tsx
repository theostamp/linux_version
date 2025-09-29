'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

const pathToBreadcrumb: Record<string, BreadcrumbItem[]> = {
  '/dashboard': [
    { label: 'Πίνακας Ελέγχου', href: '/dashboard', icon: <Home className="w-4 h-4" /> }
  ],
  '/teams': [
    { label: 'Πίνακας Ελέγχου', href: '/dashboard', icon: <Home className="w-4 h-4" /> },
    { label: 'Ομάδες', href: '/teams' }
  ],
  '/collaborators': [
    { label: 'Πίνακας Ελέγχου', href: '/dashboard', icon: <Home className="w-4 h-4" /> },
    { label: 'Συνεργάτες', href: '/collaborators' }
  ],
  '/suppliers': [
    { label: 'Πίνακας Ελέγχου', href: '/dashboard', icon: <Home className="w-4 h-4" /> },
    { label: 'Προμηθευτές', href: '/suppliers' }
  ],
  '/maintenance': [
    { label: 'Πίνακας Ελέγχου', href: '/dashboard', icon: <Home className="w-4 h-4" /> },
    { label: 'Υπηρεσίες', href: '/maintenance' }
  ],
  '/financial': [
    { label: 'Πίνακας Ελέγχου', href: '/dashboard', icon: <Home className="w-4 h-4" /> },
    { label: 'Οικονομικά', href: '/financial' }
  ],
  '/projects': [
    { label: 'Πίνακας Ελέγχου', href: '/dashboard', icon: <Home className="w-4 h-4" /> },
    { label: 'Προσφορές & Έργα', href: '/projects' }
  ],
  '/announcements': [
    { label: 'Πίνακας Ελέγχου', href: '/dashboard', icon: <Home className="w-4 h-4" /> },
    { label: 'Ανακοινώσεις', href: '/announcements' }
  ],
  '/votes': [
    { label: 'Πίνακας Ελέγχου', href: '/dashboard', icon: <Home className="w-4 h-4" /> },
    { label: 'Ψηφοφορίες', href: '/votes' }
  ],
  '/requests': [
    { label: 'Πίνακας Ελέγχου', href: '/dashboard', icon: <Home className="w-4 h-4" /> },
    { label: 'Αιτήματα', href: '/requests' }
  ],
  '/chat': [
    { label: 'Πίνακας Ελέγχου', href: '/dashboard', icon: <Home className="w-4 h-4" /> },
    { label: 'Chat', href: '/chat' }
  ],
  '/buildings': [
    { label: 'Πίνακας Ελέγχου', href: '/dashboard', icon: <Home className="w-4 h-4" /> },
    { label: 'Διαχείριση Κτιρίων', href: '/buildings' }
  ],
  '/apartments': [
    { label: 'Πίνακας Ελέγχου', href: '/dashboard', icon: <Home className="w-4 h-4" /> },
    { label: 'Διαχείριση Διαμερισμάτων', href: '/apartments' }
  ],
  '/map-visualization': [
    { label: 'Πίνακας Ελέγχου', href: '/dashboard', icon: <Home className="w-4 h-4" /> },
    { label: 'Οπτικοποίηση Χάρτη', href: '/map-visualization' }
  ],
};

export default function Breadcrumb() {
  const pathname = usePathname();
  
  // Find the matching breadcrumb path
  const breadcrumbItems = pathToBreadcrumb[pathname] || [
    { label: 'Πίνακας Ελέγχου', href: '/dashboard', icon: <Home className="w-4 h-4" /> }
  ];

  if (breadcrumbItems.length <= 1) {
    return null; // Don't show breadcrumb for dashboard
  }

  return (
    <nav className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400 mb-4">
      {breadcrumbItems.map((item, index) => (
        <React.Fragment key={item.href || index}>
          {index > 0 && (
            <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          )}
          {item.href ? (
            <Link
              href={item.href}
              className={cn(
                "flex items-center space-x-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200",
                index === breadcrumbItems.length - 1 
                  ? "text-gray-900 dark:text-gray-100 font-medium" 
                  : "text-gray-500 dark:text-gray-400"
              )}
            >
              {item.icon && <span>{item.icon}</span>}
              <span>{item.label}</span>
            </Link>
          ) : (
            <span className={cn(
              "flex items-center space-x-1",
              index === breadcrumbItems.length - 1 
                ? "text-gray-900 dark:text-gray-100 font-medium" 
                : "text-gray-500 dark:text-gray-400"
            )}>
              {item.icon && <span>{item.icon}</span>}
              <span>{item.label}</span>
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
} 
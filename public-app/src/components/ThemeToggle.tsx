'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/contexts/ThemeContext';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'p-2.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-all duration-200',
        className
      )}
      title={theme === 'light' ? 'Ενεργοποίηση Dark Mode' : 'Ενεργοποίηση Light Mode'}
      aria-label={theme === 'light' ? 'Ενεργοποίηση Dark Mode' : 'Ενεργοποίηση Light Mode'}
    >
      {theme === 'light' ? (
        <Moon className="w-5 h-5" />
      ) : (
        <Sun className="w-5 h-5" />
      )}
    </button>
  );
}


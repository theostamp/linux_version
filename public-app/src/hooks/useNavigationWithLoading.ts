'use client';

import { useRouter } from 'next/navigation';
import { useLoading } from '@/components/contexts/LoadingContext';

export function useNavigationWithLoading() {
  const router = useRouter();
  const { startLoading, stopLoading } = useLoading();

  const navigateWithLoading = async (
    href: string,
    message: string = 'Μετάβαση σε νέα σελίδα...',
    options?: { scroll?: boolean }
  ) => {
    try {
      startLoading(message);

      // Add a small delay to ensure the loading state is visible
      await new Promise(resolve => setTimeout(resolve, 100));

      router.push(href, options);

      // Stop loading after a reasonable delay to allow the new page to load
      setTimeout(() => {
        stopLoading();
      }, 500);
    } catch (error) {
      console.error('Navigation error:', error);
      stopLoading();
    }
  };

  const replaceWithLoading = async (
    href: string,
    message: string = 'Μετάβαση σε νέα σελίδα...',
    options?: { scroll?: boolean }
  ) => {
    try {
      startLoading(message);

      // Add a small delay to ensure the loading state is visible
      await new Promise(resolve => setTimeout(resolve, 100));

      router.replace(href, options);

      // Stop loading after a reasonable delay to allow the new page to load
      setTimeout(() => {
        stopLoading();
      }, 500);
    } catch (error) {
      console.error('Navigation error:', error);
      stopLoading();
    }
  };

  return {
    navigateWithLoading,
    replaceWithLoading,
    router, // Expose the original router for cases where loading is not needed
  };
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost } from '@/lib/api';

type PushPermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported';

interface UsePushNotificationsReturn {
  isSupported: boolean;
  permission: PushPermissionState;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  requestPermission: () => Promise<NotificationPermission>;
}

/**
 * Hook για διαχείριση push notifications
 */
export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<PushPermissionState>('prompt');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      if (typeof window === 'undefined') {
        setIsLoading(false);
        return;
      }

      const supported =
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;

      setIsSupported(supported);

      if (supported) {
        setPermission(Notification.permission as PushPermissionState);

        // Check if already subscribed (avoid waiting forever when no SW is registered yet)
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            const subscription = await registration.pushManager.getSubscription();
            setIsSubscribed(!!subscription);
          } else {
            setIsSubscribed(false);
          }
        } catch (err) {
          console.error('[usePushNotifications] Error checking subscription:', err);
          setIsSubscribed(false);
        }
      } else {
        setPermission('unsupported');
      }

      setIsLoading(false);
    };

    checkSupport();
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      return 'denied';
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result as PushPermissionState);
      return result;
    } catch (err) {
      console.error('[usePushNotifications] Error requesting permission:', err);
      setError('Σφάλμα κατά την αίτηση άδειας');
      return 'denied';
    }
  }, [isSupported]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Push notifications δεν υποστηρίζονται');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Request permission if not granted
      if (Notification.permission !== 'granted') {
        const perm = await requestPermission();
        if (perm !== 'granted') {
          setError('Η άδεια για ειδοποιήσεις απορρίφθηκε');
          setIsLoading(false);
          return false;
        }
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Get VAPID public key from server
      let vapidPublicKey: string;
      try {
        const response = await apiGet<{ public_key: string }>('/chat/push-subscriptions/vapid_public_key/');
        vapidPublicKey = response.public_key;
      } catch (err) {
        // Use a placeholder key for development
        console.warn('[usePushNotifications] Could not get VAPID key, using default');
        vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

        if (!vapidPublicKey) {
          setError('VAPID key δεν έχει ρυθμιστεί');
          setIsLoading(false);
          return false;
        }
      }

      // Convert VAPID key to Uint8Array
      const urlBase64ToUint8Array = (base64String: string) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
          .replace(/-/g, '+')
          .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
      };

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      // Send subscription to server
      const subscriptionData = subscription.toJSON();
      await apiPost('/chat/push-subscriptions/subscribe/', {
        endpoint: subscriptionData.endpoint,
        keys: subscriptionData.keys
      });

      setIsSubscribed(true);
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('[usePushNotifications] Error subscribing:', err);
      setError('Σφάλμα κατά την εγγραφή');
      setIsLoading(false);
      return false;
    }
  }, [isSupported, requestPermission]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Notify server
        try {
          await apiPost('/chat/push-subscriptions/unsubscribe/', {
            endpoint: subscription.endpoint
          });
        } catch (err) {
          console.warn('[usePushNotifications] Server unsubscribe failed:', err);
        }

        // Unsubscribe locally
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('[usePushNotifications] Error unsubscribing:', err);
      setError('Σφάλμα κατά την απεγγραφή');
      setIsLoading(false);
      return false;
    }
  }, [isSupported]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    requestPermission
  };
}

export default usePushNotifications;

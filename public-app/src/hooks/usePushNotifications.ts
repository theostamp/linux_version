// public-app/src/hooks/usePushNotifications.ts
import { useState, useEffect } from 'react';
import { requestForToken, onMessageListener } from '../lib/firebase';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

// Define the API call to register device
const registerDeviceToken = async (token: string) => {
  // Replace with your actual API endpoint
  // Assuming axios instance with auth interceptor is used in real app, 
  // here using plain axios with assumption of global config or adjustment needed.
  // Ideally import your configured axios instance.
  // import api from '@/lib/api'; 
  // return api.post('/notifications/devices/', { token, platform: 'web' });
  
  // Using relative path assuming proxy or base URL set
  const response = await axios.post('/api/notifications/devices/', {
    token,
    platform: 'web',
    device_name: navigator.userAgent
  });
  return response.data;
};

export const usePushNotifications = () => {
  const [notification, setNotification] = useState<any>(null);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<string>('default');

  // Mutation to send token to backend
  const { mutate: sendToken } = useMutation({
    mutationFn: registerDeviceToken,
    onSuccess: () => {
      console.log('Device token registered successfully');
    },
    onError: (error) => {
      console.error('Error registering device token:', error);
    }
  });

  useEffect(() => {
    // Check if supported
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    try {
      const token = await requestForToken();
      if (token) {
        setFcmToken(token);
        // Send token to backend
        sendToken(token);
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onMessageListener().then((payload) => {
      setNotification(payload);
      // You can show a toast here if you want
    });
    
    // Cleanup if necessary (onMessageListener returns a promise that resolves to payload, 
    // real implementation might need a proper unsubscribe if using onMessage directly)
    return () => {
      // Cleanup logic if applicable
    };
  }, []);

  return {
    notification,
    fcmToken,
    requestPermission,
    permission
  };
};


// frontend\components\UserGreeting.tsx

'use client';
import { useAuth } from '@/components/contexts/AuthContext';

export default function UserGreeting() {
  const { user, isLoading: loading } = useAuth();

  if (loading || !user) return null;

  return (
    <p className="text-sm text-gray-600 dark:text-gray-300">
      👋 Καλώς ήρθες, <strong>{user.first_name ?? user.username}</strong>
    </p>
  );
}
  
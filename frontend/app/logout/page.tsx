// frontend/components/LogoutButton.tsx

'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import useEnsureCsrf from '@/hooks/useEnsureCsrf';
import { getBaseUrl } from '@/lib/config';

export default function LogoutButton() {
  const csrfReady = useEnsureCsrf(); // διασφαλίζει ότι CSRF cookie έχει φορτωθεί
  const router = useRouter();

  // Διαβάζει CSRF token από το cookie ως string
  function getCsrfToken(): string {
    return (
      document.cookie
        .split('; ')
        .find((row) => row.startsWith('csrftoken='))
        ?.split('=')[1] || ''
    );
  }

  async function handleLogout() {
    if (!csrfReady) {
      toast.error('Ακύρωση: CSRF token δεν είναι έτοιμο.');
      return;
    }

    try {
      const baseUrl = getBaseUrl(); // παίρνει το σωστό API base URL
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/logout/`, {
        method: 'POST',
        credentials: 'include', // στέλνει cookies
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(), // string τύπος
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.status.toString());
      }

      toast.success('Αποσυνδεθήκατε επιτυχώς');
      router.push('/login'); // ανακατεύθυνση μετά logout
    } catch (err: any) {
      console.error('Logout failed:', err);
      toast.error(`Σφάλμα αποσύνδεσης: ${err.message}`);
    }
  }

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
    >
      Αποσύνδεση
    </button>
  );
}

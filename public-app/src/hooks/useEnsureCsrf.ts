'use client';

import { useEffect, useState } from "react";
import { getApiUrl } from "@/lib/api";

export default function useEnsureCsrf(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchToken() {
      try {
        const res = await fetch(getApiUrl('/csrf/'), {
          credentials: "include",
        });
        if (!res.ok) {
          console.error("CSRF fetch failed:", res.status, await res.text());
          return;
        }

        // (Optional) Επιβεβαίωση ύπαρξης token στο cookie
        const hasToken = document.cookie.includes('csrftoken=');
        if (hasToken && isMounted) {
          setReady(true);
        } else {
          console.warn("CSRF token fetch πέτυχε αλλά το cookie δεν βρέθηκε.");
        }
      } catch (err) {
        console.error("CSRF fetch error:", err);
      }
    }

    fetchToken();

    return () => {
      isMounted = false;
    };
  }, []);

  return ready;
}

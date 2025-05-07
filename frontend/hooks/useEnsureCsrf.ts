// frontend/hooks/useEnsureCsrf.ts
import { useEffect, useState } from "react";
import { getBaseUrl } from "@/lib/config"; // ήδη σωστό

export default function useEnsureCsrf(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function fetchToken() {
      const base = getBaseUrl();           // throws αν δεν υπάρχει
      const res = await fetch(`${base}/csrf/`, {
        credentials: "include",
      });
      if (!res.ok) {
        console.error("CSRF fetch failed:", res.status, await res.text());
        return;
      }
      setReady(true);
    }
    fetchToken().catch(console.error);
  }, []);

  return ready;
}

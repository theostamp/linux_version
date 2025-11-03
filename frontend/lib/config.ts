// frontend/lib/config.ts
// Επιστρέφει το base URL του API, καθαρίζοντας τυχόν trailing slash.

export function getBaseUrl(): string {
  // Χρησιμοποιούμε το ίδιο hostname με το frontend
  const url = process.env.NEXT_PUBLIC_API_URL ?? (typeof window !== 'undefined' 
    ? `http://${window.location.hostname}:18000/api`
    : 'http://localhost:18000/api');
  return url.replace(/\/+$/, '');
}

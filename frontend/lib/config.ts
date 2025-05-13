// frontend/lib/config.ts
// Επιστρέφει το base URL του API, καθαρίζοντας τυχόν trailing slash.

export function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
  return url.replace(/\/+$/, '');
}

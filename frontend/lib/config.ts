// frontend/lib/config.ts

/**
 * Επιστρέφει το base URL του API χωρίς trailing slash,
 * παίρνοντας πρώτα την env var NEXT_PUBLIC_API_URL
 * και fallback στο hard-coded getBaseUrl().
 */
export function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
    'http://localhost:8000' // προσαρμόζεις εδώ αν θες default
  );
}

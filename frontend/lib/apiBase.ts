export function ensureApiUrl(url?: string | null): string {
  if (!url) return '';
  let normalized = url.trim();
  if (!normalized) return '';

  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized.replace(/^\/+/, '')}`;
  }

  normalized = normalized.replace(/\/+$/, '');
  if (!/\/api(?:\/|$)/i.test(normalized)) {
    normalized = `${normalized}/api`;
  }

  return normalized;
}

export function isLocalHostname(hostname?: string | null): boolean {
  if (!hostname) return true;
  const value = hostname.toLowerCase();
  return (
    value === 'localhost' ||
    value === '127.0.0.1' ||
    value.startsWith('localhost:') ||
    value.startsWith('127.0.0.1:') ||
    value.startsWith('192.168.') ||
    value.startsWith('10.') ||
    value.endsWith('.localhost') ||
    value.endsWith('.local')
  );
}

const DEFAULT_REMOTE_API = ensureApiUrl(
  process.env.NEXT_PUBLIC_DEFAULT_API_URL ?? 'https://linuxversion-production.up.railway.app/api'
);

export function getDefaultRemoteApiUrl(): string {
  return DEFAULT_REMOTE_API;
}

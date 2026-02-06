type ProxyErrorPayload = {
  code?: string;
  details?: unknown;
};

const parseMaybeJson = (value: string): any | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
};

export const extractProxyErrorCode = (payload: unknown): string | null => {
  if (!payload || typeof payload !== 'object') return null;

  const data = payload as ProxyErrorPayload;
  if (typeof data.code === 'string' && data.code.trim()) {
    return data.code.trim();
  }

  if (typeof data.details === 'string') {
    const parsed = parseMaybeJson(data.details);
    if (parsed && typeof parsed.code === 'string' && parsed.code.trim()) {
      return parsed.code.trim();
    }
  } else if (data.details && typeof data.details === 'object') {
    const details = data.details as { code?: string };
    if (typeof details.code === 'string' && details.code.trim()) {
      return details.code.trim();
    }
  }

  return null;
};

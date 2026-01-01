export const ensureArray = <T = unknown>(value: unknown, fallback: T[] = []): T[] => {
  if (!value) return fallback;
  if (Array.isArray(value)) return value as T[];

  if (typeof value === "object") {
    const container = value as Record<string, unknown>;
    const candidateKeys = ["results", "data", "items", "records", "apartments", "list", "entries"];

    for (const key of candidateKeys) {
      const maybe = container[key];
      if (Array.isArray(maybe)) {
        return maybe as T[];
      }
    }
  }

  return fallback;
};

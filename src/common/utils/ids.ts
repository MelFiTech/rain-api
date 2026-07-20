import { randomBytes } from 'crypto';

const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateId(prefix: string): string {
  const suffix = randomBytes(6).toString('hex');
  return `${prefix}_${suffix}`;
}

export function generateReference(prefix: string): string {
  const part = (n: number) =>
    Array.from({ length: n }, () =>
      REF_ALPHABET[Math.floor(Math.random() * REF_ALPHABET.length)],
    ).join('');
  return `${prefix}-${part(4)}-${part(4)}`;
}

export function keysToSnakeCase<T extends Record<string, unknown>>(
  obj: T,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snake = key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out[snake] = keysToSnakeCase(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      out[snake] = value.map((item) =>
        item && typeof item === 'object'
          ? keysToSnakeCase(item as Record<string, unknown>)
          : item,
      );
    } else {
      out[snake] = value;
    }
  }
  return out;
}

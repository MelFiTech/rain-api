import { createHash, randomBytes } from 'crypto';

export function generateInviteToken(): { plain: string; hash: string } {
  const plain = randomBytes(32).toString('hex');
  const hash = hashInviteToken(plain);
  return { plain, hash };
}

export function hashInviteToken(plain: string): string {
  return createHash('sha256').update(plain.trim()).digest('hex');
}

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

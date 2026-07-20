import * as bcrypt from 'bcrypt';
import { decryptApiKey, encryptApiKey } from './api-key-cipher';
import type { InstitutionEntity } from '../../domain/types';

export async function applyApiKeyPlaintext(
  institution: InstitutionEntity,
  fullKey: string,
  encryptionSecret: string,
): Promise<void> {
  institution.apiKeyHash = await bcrypt.hash(fullKey, 10);
  institution.apiKeyPrefix = fullKey.slice(0, 16);
  institution.apiKeyCreatedAt = new Date().toISOString();
  institution.apiKeyCiphertext = encryptApiKey(fullKey, encryptionSecret);
}

export function readApiKeyPlaintext(
  institution: InstitutionEntity,
  encryptionSecret: string,
): string | null {
  if (!institution.apiKeyCiphertext) return null;
  try {
    return decryptApiKey(institution.apiKeyCiphertext, encryptionSecret);
  } catch {
    return null;
  }
}

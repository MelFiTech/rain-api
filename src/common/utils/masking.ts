import type { IdentifierType } from '../../domain/types';

export function maskAccountNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 4) return '******';
  return `******${digits.slice(-4)}`;
}

export function maskPhone(value: string): string {
  const cleaned = value.replace(/\s/g, '');
  if (cleaned.startsWith('+234')) {
    const rest = cleaned.slice(4);
    if (rest.length >= 10) {
      return `+234 ${rest.slice(0, 2)}* *** ${rest.slice(-4)}`;
    }
  }
  if (cleaned.startsWith('0') && cleaned.length >= 11) {
    return `+234 ${cleaned.slice(1, 3)}* *** ${cleaned.slice(-4)}`;
  }
  if (cleaned.length >= 4) {
    return `***${cleaned.slice(-4)}`;
  }
  return '****';
}

export function maskEmail(value: string): string {
  const [local, domain] = value.split('@');
  if (!local || !domain) return '***@***';
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}

export function maskBvnOrNin(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 4) return '*******';
  return `*******${digits.slice(-4)}`;
}

export function maskIdentifier(type: IdentifierType, value: string): string {
  switch (type) {
    case 'account_number':
      return maskAccountNumber(value);
    case 'phone':
      return maskPhone(value);
    case 'email':
      return maskEmail(value);
    case 'bvn':
    case 'nin':
      return maskBvnOrNin(value);
    default:
      return '****';
  }
}

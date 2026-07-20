import type { IdentifierType } from '../../domain/types';

export function resolvePrimaryReportIdentifier(input: {
  bvn?: string;
  nin?: string;
  accountNumber?: string;
  phone?: string;
  email?: string;
}): { identifierType: IdentifierType; identifier: string } | null {
  if (input.bvn?.trim()) {
    return { identifierType: 'bvn', identifier: input.bvn.trim() };
  }
  if (input.nin?.trim()) {
    return { identifierType: 'nin', identifier: input.nin.trim() };
  }
  if (input.accountNumber?.trim()) {
    return {
      identifierType: 'account_number',
      identifier: input.accountNumber.replace(/\D/g, ''),
    };
  }
  if (input.phone?.trim()) {
    return {
      identifierType: 'phone',
      identifier: input.phone.replace(/\D/g, ''),
    };
  }
  if (input.email?.trim()) {
    return {
      identifierType: 'email',
      identifier: input.email.trim().toLowerCase(),
    };
  }
  return null;
}

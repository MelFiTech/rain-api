import {
  PLATFORM_INTERNAL_INSTITUTION_EMAIL,
  PLATFORM_INTERNAL_INSTITUTION_ID,
} from '../constants';

/** Legacy seed value before internal tenant used a dedicated email. */
const LEGACY_PLATFORM_INSTITUTION_EMAIL = 'admin@userain.co';

export function isCustomerInstitution(input: {
  id: string;
  email: string;
}): boolean {
  if (input.id === PLATFORM_INTERNAL_INSTITUTION_ID) return false;
  const email = input.email.trim().toLowerCase();
  if (email === PLATFORM_INTERNAL_INSTITUTION_EMAIL.toLowerCase()) return false;
  if (email === LEGACY_PLATFORM_INSTITUTION_EMAIL) return false;
  return true;
}

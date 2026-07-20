import { BadRequestException } from '@nestjs/common';

export const PASSWORD_POLICY_MESSAGE =
  'Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.';

const PASSWORD_POLICY_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export function isPasswordPolicyCompliant(password: string): boolean {
  return PASSWORD_POLICY_REGEX.test(password);
}

export function assertPasswordPolicy(password: string): void {
  if (!isPasswordPolicyCompliant(password)) {
    throw new BadRequestException(PASSWORD_POLICY_MESSAGE);
  }
}

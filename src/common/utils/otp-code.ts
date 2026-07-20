import { randomInt } from 'crypto';

/** Fixed OTP in non-production for local integration testing. */
export function generateOtpCode(nodeEnv: string | undefined): string {
  if (nodeEnv !== 'production') {
    return '123456';
  }
  return String(randomInt(100_000, 999_999));
}

import type { FundSessionEntity } from '../../../domain/types';

export interface CreateFundSessionInput {
  institutionId: string;
  customerEmail: string;
  creditAmount: number;
  fee: number;
  transferAmount: number;
  reference: string;
}

export interface PaymentProvider {
  readonly name: string;
  createFundSession(input: CreateFundSessionInput): Promise<FundSessionEntity>;
  getFundSession(sessionId: string): Promise<FundSessionEntity | null>;
  /** Poll Monnify (or provider) and update session status. */
  syncFundSessionStatus(sessionId: string): Promise<FundSessionEntity | null>;
}

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

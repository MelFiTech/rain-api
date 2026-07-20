import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export class MonnifyApiError extends Error {
  constructor(
    message: string,
    readonly responseCode?: string,
  ) {
    super(message);
    this.name = 'MonnifyApiError';
  }
}

interface MonnifyEnvelope<T> {
  requestSuccessful: boolean;
  responseMessage: string;
  responseCode: string;
  responseBody: T;
}

interface LoginBody {
  accessToken: string;
  expiresIn: number;
}

export interface InitTransactionBody {
  transactionReference: string;
  paymentReference: string;
  merchantName: string;
  apiKey: string;
  checkoutUrl: string;
  enabledPaymentMethod?: string[];
}

export interface BankTransferBody {
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankCode?: string;
  accountDurationSeconds?: number;
  ussdPayment?: string;
}

export interface TransactionStatusBody {
  paymentReference: string;
  transactionReference: string;
  paymentStatus: string;
  amountPaid?: string;
  paidOn?: string;
}

export interface SingleDisbursementBody {
  reference: string;
  status: string;
  amount?: number;
  totalFee?: number;
  destinationAccountName?: string;
  destinationAccountNumber?: string;
  destinationBankCode?: string;
  destinationBankName?: string;
}

export interface SingleDisbursementSummaryBody {
  reference: string;
  status: string;
  amount?: number;
  fee?: number;
  transactionDescription?: string;
  transactionReference?: string;
  destinationAccountName?: string;
  destinationAccountNumber?: string;
  destinationBankCode?: string;
  destinationBankName?: string;
}

export interface DisbursementWalletBalanceBody {
  availableBalance: number;
  ledgerBalance: number;
  accountNumber: string;
  currency: string;
}

export interface ValidateBankAccountBody {
  accountNumber: string;
  accountName: string;
  bankCode: string;
  bankName: string;
}

const DISBURSEMENT_SUCCESS = new Set(['SUCCESS', 'COMPLETED']);
const DISBURSEMENT_FAILED = new Set(['FAILED', 'REVERSED', 'EXPIRED']);
const DISBURSEMENT_PROCESSING = new Set([
  'PENDING',
  'AWAITING_PROCESSING',
  'IN_PROGRESS',
]);
const DISBURSEMENT_MFA = new Set([
  'PENDING_AUTHORIZATION',
  'OTP_EMAIL_DISPATCH_FAILED',
]);

export function classifyMonnifyDisbursementStatus(status: string): {
  terminal: boolean;
  success: boolean;
  requiresOtp: boolean;
  processing: boolean;
} {
  const normalized = status.trim().toUpperCase();
  if (DISBURSEMENT_SUCCESS.has(normalized)) {
    return { terminal: true, success: true, requiresOtp: false, processing: false };
  }
  if (DISBURSEMENT_FAILED.has(normalized)) {
    return { terminal: true, success: false, requiresOtp: false, processing: false };
  }
  if (DISBURSEMENT_MFA.has(normalized)) {
    return { terminal: true, success: false, requiresOtp: true, processing: false };
  }
  if (DISBURSEMENT_PROCESSING.has(normalized)) {
    return { terminal: false, success: false, requiresOtp: false, processing: true };
  }
  return { terminal: false, success: false, requiresOtp: false, processing: true };
}

@Injectable()
export class MonnifyApiClient {
  private readonly logger = new Logger(MonnifyApiClient.name);
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    const apiKey = this.config.get<string>('payments.monnify.apiKey');
    const secretKey = this.config.get<string>('payments.monnify.secretKey');
    const contractCode = this.config.get<string>(
      'payments.monnify.contractCode',
    );
    return Boolean(apiKey && secretKey && contractCode);
  }

  async initWalletCheckout(input: {
    transferAmount: number;
    paymentReference: string;
    customerEmail: string;
    paymentDescription: string;
  }): Promise<{
    transactionReference: string;
    paymentReference: string;
    checkoutUrl: string;
    bankTransfer: BankTransferBody;
  }> {
    const contractCode = this.requireConfig('payments.monnify.contractCode');
    const redirectUrl = this.config.get<string>(
      'payments.monnify.walletRedirectUrl',
    );

    const initBody = await this.post<InitTransactionBody>(
      '/api/v1/merchant/transactions/init-transaction',
      {
        amount: input.transferAmount,
        customerEmail: input.customerEmail,
        paymentReference: input.paymentReference,
        paymentDescription: input.paymentDescription,
        currencyCode: 'NGN',
        contractCode,
        redirectUrl,
        paymentMethods: ['ACCOUNT_TRANSFER', 'CARD', 'USSD'],
      },
    );

    const bankTransfer = await this.post<BankTransferBody>(
      '/api/v1/merchant/bank-transfer/init-payment',
      {
        transactionReference: initBody.transactionReference,
      },
    );

    return {
      transactionReference: initBody.transactionReference,
      paymentReference: initBody.paymentReference,
      checkoutUrl: initBody.checkoutUrl,
      bankTransfer,
    };
  }

  async getTransactionStatus(
    transactionReference: string,
  ): Promise<TransactionStatusBody> {
    const encoded = encodeURIComponent(transactionReference);
    return this.get<TransactionStatusBody>(`/api/v2/transactions/${encoded}`);
  }

  async validateBankAccount(input: {
    accountNumber: string;
    bankCode: string;
  }): Promise<ValidateBankAccountBody> {
    const accountNumber = input.accountNumber.replace(/\D/g, '');
    const bankCode = input.bankCode.trim();
    const query = new URLSearchParams({ accountNumber, bankCode });
    const body = await this.get<ValidateBankAccountBody>(
      `/api/v2/disbursements/account/validate?${query.toString()}`,
    );
    return {
      accountNumber: body.accountNumber ?? accountNumber,
      accountName: body.accountName?.trim() ?? '',
      bankCode: body.bankCode ?? bankCode,
      bankName: body.bankName?.trim() ?? '',
    };
  }

  verifyWebhookSignature(
    rawBody: string | Buffer,
    signatureHeader: string | undefined,
  ): boolean {
    if (!signatureHeader?.trim()) return false;
    const secretKey = this.config.get<string>('payments.monnify.secretKey');
    if (!secretKey?.trim()) return false;

    const computed = createHmac('sha512', secretKey.trim())
      .update(rawBody)
      .digest('hex');

    const expected = Buffer.from(computed, 'utf8');
    const received = Buffer.from(signatureHeader.trim(), 'utf8');
    if (expected.length !== received.length) return false;
    return timingSafeEqual(expected, received);
  }

  /** Legacy Monnify hash: SHA512(secretKey + raw request body). */
  verifyWebhookSignatureLegacyRaw(
    rawBody: string | Buffer,
    signatureHeader: string | undefined,
  ): boolean {
    if (!signatureHeader?.trim()) return false;
    const secretKey = this.config.get<string>('payments.monnify.secretKey');
    if (!secretKey?.trim()) return false;

    const body =
      typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    const computed = createHash('sha512')
      .update(`${secretKey.trim()}${body}`)
      .digest('hex');

    const expected = Buffer.from(computed, 'utf8');
    const received = Buffer.from(signatureHeader.trim(), 'utf8');
    if (expected.length !== received.length) return false;
    return timingSafeEqual(expected, received);
  }

  /** Legacy fallback when body was re-parsed (key order may differ). */
  verifyWebhookSignatureLegacy(
    body: Record<string, unknown>,
    signatureHeader: string | undefined,
  ): boolean {
    if (!signatureHeader?.trim()) return false;
    const secretKey = this.config.get<string>('payments.monnify.secretKey');
    if (!secretKey?.trim()) return false;

    const computed = createHash('sha512')
      .update(`${secretKey}${JSON.stringify(body)}`)
      .digest('hex');

    const expected = Buffer.from(computed, 'utf8');
    const received = Buffer.from(signatureHeader.trim(), 'utf8');
    if (expected.length !== received.length) return false;
    return timingSafeEqual(expected, received);
  }

  isSandboxEnvironment(): boolean {
    const baseUrl =
      this.config.get<string>('payments.monnify.baseUrl') ??
      'https://sandbox.monnify.com';
    return baseUrl.includes('sandbox');
  }

  shouldRequireWebhookSignature(): boolean {
    const override = this.config.get<boolean>(
      'payments.monnify.webhookRequireSignature',
    );
    if (override === true) return true;
    if (override === false) return false;
    if (this.isSandboxEnvironment()) return false;
    return (this.config.get<string>('nodeEnv') ?? 'development') === 'production';
  }

  async initiateSingleDisbursement(input: {
    amount: number;
    reference: string;
    narration: string;
    destinationBankCode: string;
    destinationAccountNumber: string;
    destinationAccountName: string;
    async?: boolean;
  }): Promise<SingleDisbursementBody> {
    const sourceAccountNumber = this.requireConfig(
      'payments.monnify.walletAccountNumber',
    );

    const body = await this.post<SingleDisbursementBody>(
      '/api/v2/disbursements/single',
      {
        amount: input.amount,
        reference: input.reference,
        narration: input.narration,
        destinationBankCode: input.destinationBankCode,
        destinationAccountNumber: input.destinationAccountNumber,
        destinationAccountName: input.destinationAccountName,
        currency: 'NGN',
        sourceAccountNumber,
        ...(input.async ? { async: true } : {}),
      },
    );

    return {
      ...body,
      reference: body.reference ?? input.reference,
      status: body.status ?? 'PENDING',
    };
  }

  async getSingleDisbursementSummary(
    reference: string,
  ): Promise<SingleDisbursementSummaryBody> {
    const encoded = encodeURIComponent(reference);
    return this.get<SingleDisbursementSummaryBody>(
      `/api/v2/disbursements/single/summary?reference=${encoded}`,
    );
  }

  async getDisbursementWalletBalance(): Promise<DisbursementWalletBalanceBody> {
    const accountNumber = this.requireConfig(
      'payments.monnify.walletAccountNumber',
    );
    const encoded = encodeURIComponent(accountNumber);
    return this.get<DisbursementWalletBalanceBody>(
      `/api/v2/disbursements/wallet-balance?accountNumber=${encoded}`,
    );
  }

  async pollSingleDisbursementStatus(
    reference: string,
    options?: { maxAttempts?: number; intervalMs?: number },
  ): Promise<SingleDisbursementSummaryBody & { classified: ReturnType<typeof classifyMonnifyDisbursementStatus> }> {
    const maxAttempts = options?.maxAttempts ?? 10;
    const intervalMs = options?.intervalMs ?? 3000;
    let last: SingleDisbursementSummaryBody | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      last = await this.getSingleDisbursementSummary(reference);
      const classified = classifyMonnifyDisbursementStatus(last.status);
      if (classified.terminal) {
        return { ...last, classified };
      }
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    }

    const status = last?.status ?? 'PENDING';
    return {
      ...(last ?? { reference, status }),
      reference: last?.reference ?? reference,
      status,
      classified: classifyMonnifyDisbursementStatus(status),
    };
  }

  hasDisbursementSource(): boolean {
    const account = this.config.get<string>(
      'payments.monnify.walletAccountNumber',
    );
    return Boolean(account?.trim());
  }

  private requireConfig(path: string): string {
    const value = this.config.get<string>(path);
    if (!value?.trim()) {
      throw new MonnifyApiError(
        `Missing Monnify configuration: ${path}. Update your .env file.`,
      );
    }
    return value.trim();
  }

  private baseUrl(): string {
    return (
      this.config.get<string>('payments.monnify.baseUrl') ??
      'https://sandbox.monnify.com'
    ).replace(/\/$/, '');
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60_000) {
      return this.accessToken;
    }

    const apiKey = this.requireConfig('payments.monnify.apiKey');
    const secretKey = this.requireConfig('payments.monnify.secretKey');
    const credentials = Buffer.from(`${apiKey}:${secretKey}`).toString(
      'base64',
    );

    const url = `${this.baseUrl()}/api/v1/auth/login`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Basic ${credentials}` },
    });

    const payload = (await response.json()) as MonnifyEnvelope<LoginBody>;
    if (!response.ok || !payload.requestSuccessful) {
      throw new MonnifyApiError(
        payload.responseMessage ?? 'Monnify authentication failed.',
        payload.responseCode,
      );
    }

    this.accessToken = payload.responseBody.accessToken;
    this.tokenExpiresAt =
      Date.now() + (payload.responseBody.expiresIn ?? 3600) * 1000;
    return this.accessToken;
  }

  private async get<T>(path: string): Promise<T> {
    const token = await this.getAccessToken();
    const response = await fetch(`${this.baseUrl()}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return this.parseEnvelope<T>(response);
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const token = await this.getAccessToken();
    const response = await fetch(`${this.baseUrl()}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    return this.parseEnvelope<T>(response);
  }

  private async parseEnvelope<T>(response: Response): Promise<T> {
    const payload = (await response.json()) as MonnifyEnvelope<T>;
    if (!response.ok || !payload.requestSuccessful) {
      this.logger.warn(
        `Monnify error ${payload.responseCode}: ${payload.responseMessage}`,
      );
      throw new MonnifyApiError(
        payload.responseMessage ?? 'Monnify request failed.',
        payload.responseCode,
      );
    }
    return payload.responseBody;
  }
}

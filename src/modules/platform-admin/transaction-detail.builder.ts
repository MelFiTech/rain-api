import type {
  FundSession,
  Institution,
  Verification,
  WalletTransaction,
} from '@prisma/client';
import type {
  MonnifyPayerDetails,
  WalletTransactionMetadata,
} from '../../domain/types';

export type PlatformTransactionDetail = {
  id: string;
  institutionId: string;
  institutionName: string;
  institutionEmail: string;
  institutionWalletBalance: number;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  flow: 'inflow' | 'outflow';
  description: string;
  reference: string;
  createdAt: string;
  funding?: {
    creditAmount: number;
    fee: number;
    transferAmount: number;
    fundReference?: string;
    destination?: {
      bankName: string;
      accountNumber: string;
      accountName: string;
    };
    sender?: MonnifyPayerDetails;
    senderAvailable: boolean;
  };
  verification?: {
    reference: string;
    maskedIdentifier: string;
    identifierType: string;
    result: string;
    feeAmount: number;
    recipient: {
      name: string;
      description: string;
    };
  };
  earning?: {
    kind: string;
    withdrawalReference?: string;
    amount: number;
    description: string;
  };
};

function parseMetadata(raw: unknown): WalletTransactionMetadata | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  return raw as WalletTransactionMetadata;
}

function flowForType(type: string, amount: number): 'inflow' | 'outflow' {
  if (type === 'verification_charge') return 'outflow';
  if (amount < 0) return 'outflow';
  return 'inflow';
}

function extractFundReference(description: string, reference: string): string | undefined {
  const fromDesc = description.match(/·\s*(FND-[A-Z0-9]+-[A-Z0-9]+)/i)?.[1];
  if (fromDesc) return fromDesc;
  if (/^FND-/i.test(reference)) return reference;
  return undefined;
}

function extractWithdrawalReference(description: string): string | undefined {
  const match = description.match(/·\s*(ewd_[a-z0-9]+)/i);
  return match?.[1];
}

export function buildPlatformTransactionDetail(input: {
  row: WalletTransaction & {
    institution: Pick<
      Institution,
      'id' | 'name' | 'email' | 'walletBalance'
    >;
  };
  fundSession?: FundSession | null;
  verification?: Verification | null;
}): PlatformTransactionDetail {
  const { row } = input;
  const metadata = parseMetadata(row.metadata);
  const balanceBefore = row.balanceAfter - row.amount;
  const flow =
    metadata?.flow ??
    (row.type === 'funding' || row.type === 'reward_credit' || row.type === 'adjustment'
      ? 'inflow'
      : flowForType(row.type, row.amount));

  const base: PlatformTransactionDetail = {
    id: row.id,
    institutionId: row.institutionId,
    institutionName: row.institution.name,
    institutionEmail: row.institution.email,
    institutionWalletBalance: row.institution.walletBalance,
    type: row.type,
    amount: row.amount,
    balanceBefore,
    balanceAfter: row.balanceAfter,
    flow,
    description: row.description,
    reference: row.reference,
    createdAt: row.createdAt.toISOString(),
  };

  if (row.type === 'funding') {
    const session = input.fundSession;
    const fundingMeta = metadata?.funding;
    const fundReference =
      fundingMeta?.fundReference ??
      session?.reference ??
      extractFundReference(row.description, row.reference);
    const sender =
      fundingMeta?.sender ??
      (session?.payerDetails as MonnifyPayerDetails | null | undefined) ??
      undefined;

    base.funding = {
      creditAmount:
        fundingMeta?.creditAmount ?? session?.creditAmount ?? Math.abs(row.amount),
      fee: fundingMeta?.fee ?? session?.fee ?? 0,
      transferAmount:
        fundingMeta?.transferAmount ?? session?.amount ?? Math.abs(row.amount),
      fundReference,
      destination:
        fundingMeta?.destination ??
        (session
          ? {
              bankName: session.bankName,
              accountNumber: session.accountNumber,
              accountName: session.accountName,
            }
          : undefined),
      sender,
      senderAvailable: !!(
        sender &&
        (sender.customerName ||
          sender.customerEmail ||
          sender.paymentMethod ||
          (sender.sources?.length ?? 0) > 0)
      ),
    };
  }

  if (row.type === 'verification_charge') {
    const verificationMeta = metadata?.verification;
    const verification = input.verification;
    const feeAmount = Math.abs(row.amount);

    base.verification = {
      reference:
        verificationMeta?.reference ??
        verification?.reference ??
        row.description.match(/(VER-[A-Z0-9]+(?:-[A-Z0-9]+)?)/i)?.[1] ??
        row.reference,
      maskedIdentifier:
        verificationMeta?.maskedIdentifier ?? verification?.maskedIdentifier ?? '—',
      identifierType:
        verificationMeta?.identifierType ??
        verification?.identifierType ??
        '—',
      result:
        verificationMeta?.result ?? verification?.result ?? '—',
      feeAmount: verificationMeta?.feeAmount ?? verification?.amountCharged ?? feeAmount,
      recipient: {
        name: 'Rain',
        description: 'Platform verification fee',
      },
    };
  }

  if (row.type === 'reward_credit' || row.type === 'adjustment') {
    const earningMeta = metadata?.earning;
    const withdrawalReference =
      earningMeta?.withdrawalReference ??
      extractWithdrawalReference(row.description);

    base.earning = {
      kind:
        earningMeta?.kind ??
        (withdrawalReference ? 'wallet_withdrawal' : row.type),
      withdrawalReference,
      amount: earningMeta?.amount ?? Math.abs(row.amount),
      description: row.description,
    };
  }

  return base;
}

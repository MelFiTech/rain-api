import type { MonnifyPayerDetails } from '../../domain/types';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseAmount(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value.replace(/,/g, ''));
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function sourceFromRecord(
  row: Record<string, unknown>,
): MonnifyPayerDetails['sources'] extends (infer T)[] | undefined ? T : never {
  return {
    accountName: String(row.accountName ?? row.account_name ?? '').trim() || undefined,
    accountNumber:
      String(row.accountNumber ?? row.account_number ?? '').trim() || undefined,
    bankCode: String(row.bankCode ?? row.bank_code ?? '').trim() || undefined,
    amountPaid: parseAmount(row.amountPaid ?? row.amount_paid),
  };
}

/** Payer / sender fields from Monnify SUCCESSFUL_TRANSACTION eventData. */
export function extractMonnifyPayerFromEventData(
  eventData: Record<string, unknown>,
): MonnifyPayerDetails | null {
  const customer = asRecord(eventData.customer);
  const accountDetails = asRecord(eventData.accountDetails);

  const paymentSources = Array.isArray(eventData.paymentSourceInformation)
    ? eventData.paymentSourceInformation
    : Array.isArray(eventData.accountPayments)
      ? eventData.accountPayments
      : [];

  const sources = paymentSources
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => !!item)
    .map(sourceFromRecord)
    .filter(
      (s) =>
        s.accountName ||
        s.accountNumber ||
        s.bankCode ||
        s.amountPaid != null,
    );

  if (accountDetails) {
    const fromAccountDetails = sourceFromRecord(accountDetails);
    if (
      fromAccountDetails.accountName ||
      fromAccountDetails.accountNumber
    ) {
      sources.unshift(fromAccountDetails);
    }
  }

  const customerName =
    String(customer?.name ?? customer?.customerName ?? '').trim() ||
    undefined;
  const customerEmail =
    String(customer?.email ?? customer?.customerEmail ?? '').trim() ||
    undefined;

  const paymentMethod = String(eventData.paymentMethod ?? '').trim() || undefined;
  const amountPaid = parseAmount(eventData.amountPaid);
  const paidOn = String(eventData.paidOn ?? '').trim() || undefined;
  const transactionReference =
    String(eventData.transactionReference ?? '').trim() || undefined;

  if (
    !customerName &&
    !customerEmail &&
    !paymentMethod &&
    amountPaid == null &&
    !paidOn &&
    sources.length === 0
  ) {
    return null;
  }

  return {
    customerName,
    customerEmail,
    paymentMethod,
    amountPaid,
    paidOn,
    transactionReference,
    sources: sources.length ? sources : undefined,
  };
}

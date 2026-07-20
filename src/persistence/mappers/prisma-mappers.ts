import type {
  EarningRecord as PrismaEarning,
  EarningsWithdrawalRequest as PrismaEarningsWithdrawal,
  FundSession as PrismaFundSession,
  Institution as PrismaInstitution,
  LoginSession as PrismaLoginSession,
  Notification as PrismaNotification,
  OtpRequest as PrismaOtp,
  PlatformCustomer as PrismaPlatformCustomer,
  Report as PrismaReport,
  TeamInvite as PrismaTeamInvite,
  User as PrismaUser,
  Verification as PrismaVerification,
  WalletTransaction as PrismaWalletTxn,
  WebhookEndpoint as PrismaWebhook,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import type {
  ConfidenceInfo,
  EarningRecordEntity,
  EarningsWithdrawalRequestEntity,
  FundSessionEntity,
  InstitutionEntity,
  LoginSessionEntity,
  NotificationEntity,
  NotificationPreferences,
  OtpRequestEntity,
  PlatformCustomerEntity,
  ReportCategory,
  ReportEntity,
  SettlementBankAccountEntity,
  TeamInviteEntity,
  AccessRequestEntity,
  UserEntity,
  VerificationEntity,
  WalletTransactionEntity,
  WebhookEndpointEntity,
  WebhookEventType,
} from '../../domain/types';

function iso(d: Date | string): string {
  return d instanceof Date ? d.toISOString() : d;
}

export function toInstitution(row: PrismaInstitution): InstitutionEntity {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    logoUrl: row.logoUrl ?? undefined,
    phone: row.phone ?? undefined,
    address: row.address ?? undefined,
    contactName: row.contactName ?? undefined,
    walletBalance: row.walletBalance,
    lowBalanceThreshold: row.lowBalanceThreshold,
    apiKeyHash: row.apiKeyHash,
    apiKeyPrefix: row.apiKeyPrefix,
    apiKeyCreatedAt: iso(row.apiKeyCreatedAt),
    apiKeyCiphertext: row.apiKeyCiphertext ?? undefined,
    apiKeyLastUsedAt: row.apiKeyLastUsedAt
      ? iso(row.apiKeyLastUsedAt)
      : undefined,
    notificationPreferences:
      row.notificationPreferences as unknown as NotificationPreferences,
    settlementBank: row.settlementBank as unknown as SettlementBankAccountEntity | null,
  };
}

export function institutionToPrisma(entity: InstitutionEntity) {
  return {
    id: entity.id,
    name: entity.name,
    email: entity.email,
    logoUrl: entity.logoUrl ?? null,
    phone: entity.phone ?? null,
    address: entity.address ?? null,
    contactName: entity.contactName ?? null,
    walletBalance: entity.walletBalance,
    lowBalanceThreshold: entity.lowBalanceThreshold,
    apiKeyHash: entity.apiKeyHash,
    apiKeyPrefix: entity.apiKeyPrefix,
    apiKeyCreatedAt: new Date(entity.apiKeyCreatedAt),
    apiKeyCiphertext: entity.apiKeyCiphertext ?? null,
    apiKeyLastUsedAt: entity.apiKeyLastUsedAt
      ? new Date(entity.apiKeyLastUsedAt)
      : null,
    notificationPreferences:
      entity.notificationPreferences as unknown as Prisma.InputJsonValue,
    settlementBank: entity.settlementBank as unknown as Prisma.InputJsonValue,
  };
}

export function toUser(row: PrismaUser): UserEntity {
  return {
    id: row.id,
    institutionId: row.institutionId,
    email: row.email,
    name: row.name,
    role: row.role as UserEntity['role'],
    passwordHash: row.passwordHash,
    isPlatformAdmin: row.isPlatformAdmin,
  };
}

export function userToPrisma(entity: UserEntity) {
  return {
    id: entity.id,
    institutionId: entity.institutionId,
    email: entity.email,
    name: entity.name,
    role: entity.role,
    passwordHash: entity.passwordHash,
    isPlatformAdmin: entity.isPlatformAdmin,
  };
}

export function toVerification(row: PrismaVerification): VerificationEntity {
  return {
    id: row.id,
    institutionId: row.institutionId,
    reference: row.reference,
    identifierType: row.identifierType as VerificationEntity['identifierType'],
    maskedIdentifier: row.maskedIdentifier,
    result: row.result as VerificationEntity['result'],
    confidence: row.confidence as ConfidenceInfo | null,
    independentSourceCount: row.independentSourceCount,
    totalReports: row.totalReports ?? undefined,
    categories: row.categories as ReportCategory[] | undefined,
    firstReportedAt: row.firstReportedAt
      ? iso(row.firstReportedAt)
      : undefined,
    mostRecentReportAt: row.mostRecentReportAt
      ? iso(row.mostRecentReportAt)
      : undefined,
    amountCharged: row.amountCharged,
    createdAt: iso(row.createdAt),
  };
}

export function verificationToPrisma(entity: VerificationEntity) {
  return {
    id: entity.id,
    institutionId: entity.institutionId,
    reference: entity.reference,
    identifierType: entity.identifierType,
    maskedIdentifier: entity.maskedIdentifier,
    result: entity.result,
    confidence: entity.confidence
      ? (entity.confidence as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull,
    independentSourceCount: entity.independentSourceCount,
    totalReports: entity.totalReports ?? null,
    categories: entity.categories
      ? (entity.categories as Prisma.InputJsonValue)
      : Prisma.JsonNull,
    firstReportedAt: entity.firstReportedAt
      ? new Date(entity.firstReportedAt)
      : null,
    mostRecentReportAt: entity.mostRecentReportAt
      ? new Date(entity.mostRecentReportAt)
      : null,
    amountCharged: entity.amountCharged,
    createdAt: new Date(entity.createdAt),
  };
}

export function toReport(row: PrismaReport): ReportEntity {
  return {
    id: row.id,
    institutionId: row.institutionId,
    reference: row.reference,
    identifierType: row.identifierType as ReportEntity['identifierType'],
    maskedIdentifier: row.maskedIdentifier,
    maskedEmail: row.maskedEmail ?? undefined,
    maskedPhone: row.maskedPhone ?? undefined,
    maskedAccountNumber: row.maskedAccountNumber ?? undefined,
    fullName: row.fullName ?? undefined,
    bank: row.bank ?? undefined,
    category: row.category as ReportCategory,
    description: row.description,
    incidentDate: row.incidentDate,
    amountInvolved: row.amountInvolved ?? undefined,
    independentSourceCount: row.independentSourceCount,
    confidence: row.confidence as unknown as ConfidenceInfo,
    earningsGenerated: row.earningsGenerated,
    submittedAt: iso(row.submittedAt),
    signalKey: row.signalKey,
  };
}

export function reportToPrisma(entity: ReportEntity) {
  return {
    id: entity.id,
    institutionId: entity.institutionId,
    reference: entity.reference,
    identifierType: entity.identifierType,
    maskedIdentifier: entity.maskedIdentifier,
    maskedEmail: entity.maskedEmail ?? null,
    maskedPhone: entity.maskedPhone ?? null,
    maskedAccountNumber: entity.maskedAccountNumber ?? null,
    fullName: entity.fullName ?? null,
    bank: entity.bank ?? null,
    category: entity.category,
    description: entity.description,
    incidentDate: entity.incidentDate,
    amountInvolved: entity.amountInvolved ?? null,
    independentSourceCount: entity.independentSourceCount,
    confidence: entity.confidence as unknown as Prisma.InputJsonValue,
    earningsGenerated: entity.earningsGenerated,
    submittedAt: new Date(entity.submittedAt),
    signalKey: entity.signalKey,
  };
}

export function toWalletTxn(row: PrismaWalletTxn): WalletTransactionEntity {
  return {
    id: row.id,
    institutionId: row.institutionId,
    type: row.type as WalletTransactionEntity['type'],
    amount: row.amount,
    balanceAfter: row.balanceAfter,
    description: row.description,
    reference: row.reference,
    metadata: row.metadata
      ? (row.metadata as WalletTransactionEntity['metadata'])
      : undefined,
    createdAt: iso(row.createdAt),
  };
}

export function toWebhook(row: PrismaWebhook): WebhookEndpointEntity {
  return {
    id: row.id,
    institutionId: row.institutionId,
    url: row.url,
    events: row.events as WebhookEventType[],
    secret: row.secret,
    secretPreview: row.secretPreview,
    enabled: row.enabled,
    lastDeliveryAt: row.lastDeliveryAt
      ? iso(row.lastDeliveryAt)
      : undefined,
    lastDeliveryStatus: row.lastDeliveryStatus as
      | WebhookEndpointEntity['lastDeliveryStatus']
      | undefined,
  };
}

export function webhookToPrisma(entity: WebhookEndpointEntity) {
  return {
    id: entity.id,
    institutionId: entity.institutionId,
    url: entity.url,
    events: entity.events as unknown as Prisma.InputJsonValue,
    secret: entity.secret,
    secretPreview: entity.secretPreview,
    enabled: entity.enabled,
    lastDeliveryAt: entity.lastDeliveryAt
      ? new Date(entity.lastDeliveryAt)
      : null,
    lastDeliveryStatus: entity.lastDeliveryStatus ?? null,
  };
}

export function toFundSession(row: PrismaFundSession): FundSessionEntity {
  return {
    id: row.id,
    institutionId: row.institutionId,
    reference: row.reference,
    amount: row.amount,
    creditAmount: row.creditAmount,
    fee: row.fee,
    bankName: row.bankName,
    accountNumber: row.accountNumber,
    accountName: row.accountName,
    expiresAt: iso(row.expiresAt),
    status: row.status as FundSessionEntity['status'],
    provider: row.provider,
    transactionReference: row.transactionReference ?? undefined,
    checkoutUrl: row.checkoutUrl ?? undefined,
    payerDetails: row.payerDetails
      ? (row.payerDetails as FundSessionEntity['payerDetails'])
      : undefined,
  };
}

export function fundSessionToPrisma(entity: FundSessionEntity) {
  return {
    id: entity.id,
    institutionId: entity.institutionId,
    reference: entity.reference,
    amount: entity.amount,
    creditAmount: entity.creditAmount,
    fee: entity.fee,
    bankName: entity.bankName,
    accountNumber: entity.accountNumber,
    accountName: entity.accountName,
    expiresAt: new Date(entity.expiresAt),
    status: entity.status,
    provider: entity.provider,
    transactionReference: entity.transactionReference ?? null,
    checkoutUrl: entity.checkoutUrl ?? null,
    payerDetails: entity.payerDetails
      ? (entity.payerDetails as Prisma.InputJsonValue)
      : undefined,
  };
}

export function toNotification(row: PrismaNotification): NotificationEntity {
  return {
    id: row.id,
    institutionId: row.institutionId,
    title: row.title,
    message: row.message,
    read: row.read,
    createdAt: iso(row.createdAt),
  };
}

export function toEarning(row: PrismaEarning): EarningRecordEntity {
  return {
    id: row.id,
    institutionId: row.institutionId,
    maskedIdentifier: row.maskedIdentifier,
    reportReference: row.reportReference,
    amount: row.amount,
    status: row.status as EarningRecordEntity['status'],
    payoutReference: row.payoutReference ?? undefined,
    createdAt: iso(row.createdAt),
  };
}

export function earningToPrisma(entity: EarningRecordEntity) {
  return {
    id: entity.id,
    institutionId: entity.institutionId,
    maskedIdentifier: entity.maskedIdentifier,
    reportReference: entity.reportReference,
    amount: entity.amount,
    status: entity.status,
    payoutReference: entity.payoutReference ?? null,
    createdAt: new Date(entity.createdAt),
  };
}

export function toEarningsWithdrawalRequest(
  row: PrismaEarningsWithdrawal,
): EarningsWithdrawalRequestEntity {
  return {
    id: row.id,
    institutionId: row.institutionId,
    reference: row.reference,
    amount: row.amount,
    status: row.status as EarningsWithdrawalRequestEntity['status'],
    processAfterAt: row.processAfterAt ? iso(row.processAfterAt) : undefined,
    monnifyStatus: row.monnifyStatus ?? undefined,
    failureReason: row.failureReason ?? undefined,
    reviewedAt: row.reviewedAt ? iso(row.reviewedAt) : undefined,
    reviewedByEmail: row.reviewedByEmail ?? undefined,
    rejectionReason: row.rejectionReason ?? undefined,
    createdAt: iso(row.createdAt),
    processedAt: row.processedAt ? iso(row.processedAt) : undefined,
  };
}

export function earningsWithdrawalToPrisma(
  entity: EarningsWithdrawalRequestEntity,
) {
  return {
    id: entity.id,
    institutionId: entity.institutionId,
    reference: entity.reference,
    amount: entity.amount,
    status: entity.status,
    processAfterAt: entity.processAfterAt
      ? new Date(entity.processAfterAt)
      : null,
    monnifyStatus: entity.monnifyStatus ?? null,
    failureReason: entity.failureReason ?? null,
    reviewedAt: entity.reviewedAt ? new Date(entity.reviewedAt) : null,
    reviewedByEmail: entity.reviewedByEmail ?? null,
    rejectionReason: entity.rejectionReason ?? null,
    createdAt: new Date(entity.createdAt),
    processedAt: entity.processedAt ? new Date(entity.processedAt) : null,
  };
}

export function toPlatformCustomer(
  row: PrismaPlatformCustomer,
): PlatformCustomerEntity {
  return {
    id: row.id,
    institutionId: row.institutionId,
    customerId: row.customerId,
    displayName: row.displayName,
    matchedField: row.matchedField as PlatformCustomerEntity['matchedField'],
    maskedIdentifier: row.maskedIdentifier,
    signalKey: row.signalKey,
    onboardedAt: iso(row.onboardedAt),
    status: row.status as PlatformCustomerEntity['status'],
  };
}

export function toAccessRequest(row: import('@prisma/client').AccessRequest): AccessRequestEntity {
  return {
    id: row.id,
    companyName: row.companyName,
    email: row.email,
    cacNumber: row.cacNumber,
    passwordHash: row.passwordHash,
    status: row.status as AccessRequestEntity['status'],
    createdAt: iso(row.createdAt),
    reviewedAt: row.reviewedAt ? iso(row.reviewedAt) : undefined,
    reviewedByEmail: row.reviewedByEmail ?? undefined,
    rejectionReason: row.rejectionReason ?? undefined,
    institutionId: row.institutionId ?? undefined,
    onboardingTokenHash: row.onboardingTokenHash ?? undefined,
    onboardingExpiresAt: row.onboardingExpiresAt
      ? iso(row.onboardingExpiresAt)
      : undefined,
  };
}

export function toTeamInvite(row: PrismaTeamInvite): TeamInviteEntity {
  return {
    id: row.id,
    institutionId: row.institutionId,
    name: row.name,
    email: row.email,
    role: row.role as TeamInviteEntity['role'],
    status: row.status as TeamInviteEntity['status'],
    invitedAt: iso(row.invitedAt),
    tokenHash: row.tokenHash ?? undefined,
    expiresAt: row.expiresAt ? iso(row.expiresAt) : new Date(0).toISOString(),
  };
}

export function toLoginSession(row: PrismaLoginSession): LoginSessionEntity {
  return {
    id: row.id,
    userId: row.userId,
    institutionId: row.institutionId,
    device: row.device,
    location: row.location,
    ipAddress: row.ipAddress,
    lastActiveAt: iso(row.lastActiveAt),
    current: row.current,
    tokenId: row.tokenId,
  };
}

export function loginSessionToPrisma(entity: LoginSessionEntity) {
  return {
    id: entity.id,
    userId: entity.userId,
    institutionId: entity.institutionId,
    device: entity.device,
    location: entity.location,
    ipAddress: entity.ipAddress,
    lastActiveAt: new Date(entity.lastActiveAt),
    current: entity.current,
    tokenId: entity.tokenId,
  };
}

export function toOtp(row: PrismaOtp): OtpRequestEntity {
  return {
    id: row.id,
    institutionId: row.institutionId,
    userId: row.userId,
    code: row.code,
    expiresAt: iso(row.expiresAt),
    purpose: row.purpose as OtpRequestEntity['purpose'],
  };
}

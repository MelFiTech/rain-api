export type ConfidenceLevel = 'low' | 'medium' | 'high' | 'very_high';

export type IdentifierType =
  | 'account_number'
  | 'phone'
  | 'email'
  | 'bvn'
  | 'nin';

export type ReportCategory =
  | 'fraud'
  | 'scam'
  | 'mule_account'
  | 'identity_theft'
  | 'chargeback_abuse'
  | 'loan_fraud'
  | 'suspicious_transaction'
  | 'other';

export type TeamRole = 'administrator' | 'developer' | 'analyst' | 'finance';

export type VerificationResult = 'match' | 'no_match';

export type TransactionType =
  | 'funding'
  | 'verification_charge'
  | 'reward_credit'
  | 'adjustment';

export type WebhookEventType =
  | 'verification.completed'
  | 'report.submitted'
  | 'wallet.low_balance';

export interface NotificationPreferences {
  emailVerificationResults: boolean;
  emailEarnings: boolean;
  emailTeamActivity: boolean;
  emailLowBalance: boolean;
  inAppNotifications: boolean;
}

export interface ConfidenceInfo {
  level: ConfidenceLevel;
  independent_source_count: number;
  label: string;
  description: string;
}

export interface InstitutionEntity {
  id: string;
  name: string;
  email: string;
  logoUrl?: string;
  phone?: string;
  address?: string;
  contactName?: string;
  walletBalance: number;
  lowBalanceThreshold: number;
  apiKeyHash: string;
  apiKeyPrefix: string;
  apiKeyCreatedAt: string;
  apiKeyCiphertext?: string;
  apiKeyLastUsedAt?: string;
  notificationPreferences: NotificationPreferences;
  settlementBank: SettlementBankAccountEntity | null;
}

export interface SettlementBankAccountEntity {
  accountName: string;
  bankName: string;
  accountNumber: string;
  updatedAt: string;
}

export interface LoginSessionEntity {
  id: string;
  userId: string;
  institutionId: string;
  device: string;
  location: string;
  ipAddress: string;
  lastActiveAt: string;
  current: boolean;
  tokenId: string;
}

export interface TeamInviteEntity {
  id: string;
  institutionId: string;
  name: string;
  email: string;
  role: TeamRole;
  status: 'invited' | 'deactivated';
  invitedAt: string;
  tokenHash?: string;
  expiresAt: string;
}

export interface NotificationEntity {
  id: string;
  institutionId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface EarningRecordEntity {
  id: string;
  institutionId: string;
  maskedIdentifier: string;
  reportReference: string;
  amount: number;
  status: 'available' | 'pending' | 'paid';
  payoutReference?: string;
  createdAt: string;
}

export type EarningsWithdrawalRequestStatus =
  | 'pending_approval'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'rejected';

export interface EarningsWithdrawalRequestEntity {
  id: string;
  institutionId: string;
  reference: string;
  amount: number;
  status: EarningsWithdrawalRequestStatus;
  processAfterAt?: string;
  monnifyStatus?: string;
  failureReason?: string;
  reviewedAt?: string;
  reviewedByEmail?: string;
  rejectionReason?: string;
  createdAt: string;
  processedAt?: string;
}

export type PlatformAccountStatus = 'active' | 'restricted' | 'dormant';

export interface PlatformCustomerEntity {
  id: string;
  institutionId: string;
  customerId: string;
  displayName: string;
  matchedField: IdentifierType;
  maskedIdentifier: string;
  signalKey: string;
  onboardedAt: string;
  status: PlatformAccountStatus;
}

export interface OtpRequestEntity {
  id: string;
  institutionId: string;
  userId: string;
  code: string;
  expiresAt: string;
  purpose: 'settlement_bank_change' | 'api_key_reveal';
}

export interface AccessRequestEntity {
  id: string;
  companyName: string;
  email: string;
  cacNumber: string;
  passwordHash: string;
  status: 'pending' | 'reviewed' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  reviewedByEmail?: string;
  rejectionReason?: string;
  institutionId?: string;
  onboardingTokenHash?: string;
  onboardingExpiresAt?: string;
}

export interface UserEntity {
  id: string;
  institutionId: string;
  email: string;
  name: string;
  role: TeamRole;
  passwordHash: string;
  isPlatformAdmin: boolean;
}

export interface VerificationEntity {
  id: string;
  institutionId: string;
  reference: string;
  identifierType: IdentifierType;
  maskedIdentifier: string;
  result: VerificationResult;
  confidence: ConfidenceInfo | null;
  independentSourceCount: number;
  totalReports?: number;
  categories?: ReportCategory[];
  firstReportedAt?: string;
  mostRecentReportAt?: string;
  amountCharged: number;
  createdAt: string;
}

export interface ReportEntity {
  id: string;
  institutionId: string;
  reference: string;
  identifierType: IdentifierType;
  maskedIdentifier: string;
  maskedEmail?: string;
  maskedPhone?: string;
  maskedAccountNumber?: string;
  fullName?: string;
  bank?: string;
  category: ReportCategory;
  description: string;
  incidentDate: string;
  amountInvolved?: number;
  independentSourceCount: number;
  confidence: ConfidenceInfo;
  earningsGenerated: number;
  submittedAt: string;
  signalKey: string;
}

export interface WalletTransactionEntity {
  id: string;
  institutionId: string;
  type: TransactionType;
  amount: number;
  balanceAfter: number;
  description: string;
  reference: string;
  createdAt: string;
}

export interface WebhookEndpointEntity {
  id: string;
  institutionId: string;
  url: string;
  events: WebhookEventType[];
  secret: string;
  secretPreview: string;
  enabled: boolean;
  lastDeliveryAt?: string;
  lastDeliveryStatus?: 'success' | 'failed';
}

export interface FundSessionEntity {
  id: string;
  institutionId: string;
  reference: string;
  /** Total transfer amount (credit + fee). */
  amount: number;
  creditAmount: number;
  fee: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  expiresAt: string;
  status: 'pending' | 'paid' | 'expired';
  provider: string;
  transactionReference?: string;
  checkoutUrl?: string;
}

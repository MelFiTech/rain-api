import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { bankCodeForName } from '../../common/nigerian-banks';
import { AppConfigService } from '../app-config/app-config.service';
import { generateId } from '../../common/utils/ids';
import type {
  EarningRecordEntity,
  EarningsWithdrawalRequestEntity,
  ReportEntity,
} from '../../domain/types';
import {
  classifyMonnifyDisbursementStatus,
  MonnifyApiClient,
  MonnifyApiError,
} from '../../providers/payments/monnify/monnify-api.client';
import { EarningsRepository, InstitutionRepository, ReportRepository } from '../../persistence';
import { NotificationsService } from '../notifications/notifications.service';
import { WalletService } from '../wallet/wallet.service';
import { EmailService } from '../../providers/email/email.service';

export type WithdrawPayoutStatus = 'completed' | 'queued' | 'processing' | 'pending_approval';

@Injectable()
export class EarningsService {
  private readonly logger = new Logger(EarningsService.name);

  constructor(
    private readonly earningsRepo: EarningsRepository,
    private readonly institutions: InstitutionRepository,
    private readonly reports: ReportRepository,
    private readonly wallet: WalletService,
    private readonly notifications: NotificationsService,
    private readonly appConfig: AppConfigService,
    private readonly monnify: MonnifyApiClient,
    private readonly config: ConfigService,
    private readonly email: EmailService,
  ) {}

  async getSummary(institutionId: string) {
    const records = await this.earningsRepo.listForInstitution(institutionId);
    const available = records
      .filter((r) => r.status === 'available')
      .reduce((sum, r) => sum + r.amount, 0);
    const pending = records
      .filter((r) => r.status === 'pending')
      .reduce((sum, r) => sum + r.amount, 0);
    const lifetime = records.reduce((sum, r) => sum + r.amount, 0);
    const totalRewardedMatches = records.length;

    return {
      available,
      pending,
      lifetime,
      totalRewardedMatches,
      records: records.map((r) => this.toPlatformRecord(r)),
    };
  }

  async distributeMatchRewards(
    signalKey: string,
    verifyingInstitutionId: string,
  ) {
    const rewardAmount = await this.appConfig.getRewardAmount();
    const reports = await this.reports.listBySignalKey(signalKey);
    const rewardedReportIds = new Set<string>();

    for (const report of reports) {
      if (report.institutionId === verifyingInstitutionId) continue;
      if (rewardedReportIds.has(report.id)) continue;

      const alreadyRewarded = await this.earningsRepo.hasForReport(
        report.institutionId,
        report.reference,
      );
      if (alreadyRewarded) continue;

      rewardedReportIds.add(report.id);
      await this.creditReportReward(report, rewardAmount);
    }
  }

  private async creditReportReward(report: ReportEntity, amount: number) {
    const record: EarningRecordEntity = {
      id: generateId('ern'),
      institutionId: report.institutionId,
      maskedIdentifier: report.maskedIdentifier,
      reportReference: report.reference,
      amount,
      status: 'available',
      createdAt: new Date().toISOString(),
    };
    await this.earningsRepo.save(record);

    report.earningsGenerated += amount;
    await this.reports.save(report);

    await this.notifications.add(
      report.institutionId,
      'Earnings credited',
      `Your report ${report.reference} helped another member verify a match. ₦${amount} is available to withdraw.`,
    );
  }

  async withdraw(
    institutionId: string,
    amount: number,
    destination: 'wallet' | 'bank',
  ): Promise<
    | {
        success: true;
        reference: string;
        amount: number;
        destination: 'wallet' | 'bank';
        payoutStatus?: WithdrawPayoutStatus;
        processAfterAt?: string;
        monnifyStatus?: string;
      }
    | {
        success: false;
        error: string;
        code?:
          | 'no_settlement_bank'
          | 'insufficient'
          | 'insufficient_wallet'
          | 'pending_authorization'
          | 'payout_failed';
      }
  > {
    if (amount <= 0) {
      return { success: false, error: 'Enter a valid amount.', code: 'insufficient' };
    }

    const summary = await this.getSummary(institutionId);
    if (amount > summary.available) {
      return {
        success: false,
        error: 'Amount exceeds available earnings.',
        code: 'insufficient',
      };
    }

    const institution = await this.institutions.findById(institutionId);
    if (!institution) {
      return { success: false, error: 'Institution not found.' };
    }

    if (destination === 'bank' && !institution.settlementBank) {
      return {
        success: false,
        error: 'Add a settlement bank in Settings before withdrawing to bank.',
        code: 'no_settlement_bank',
      };
    }

    const reference = generateId('ewd');

    if (destination === 'wallet') {
      await this.markEarningsWithdrawn(institutionId, amount);
      await this.wallet.credit(
        institutionId,
        amount,
        'reward_credit',
        `Earnings withdrawal to wallet · ${reference}`,
      );
      await this.notifications.add(
        institutionId,
        'Earnings sent to wallet',
        `₦${amount} was added to your Rain wallet.`,
      );
      return {
        success: true,
        reference,
        amount,
        destination,
        payoutStatus: 'completed',
      };
    }

    const bank = institution.settlementBank!;
    const bankCode = bankCodeForName(bank.bankName);
    if (!bankCode) {
      return {
        success: false,
        error: 'Unsupported settlement bank for Monnify payout.',
      };
    }
    if (!this.monnify.isConfigured() || !this.monnify.hasDisbursementSource()) {
      return {
        success: false,
        error:
          'Bank payouts are not configured yet. Contact Rain support if this persists.',
      };
    }

    const reserved = await this.moveEarningsToPending(
      institutionId,
      amount,
      reference,
    );
    if (!reserved) {
      return {
        success: false,
        error: 'Amount exceeds available earnings.',
        code: 'insufficient',
      };
    }

    const request: EarningsWithdrawalRequestEntity = {
      id: generateId('ewr'),
      institutionId,
      reference,
      amount,
      status: 'pending_approval',
      createdAt: new Date().toISOString(),
    };
    await this.earningsRepo.saveWithdrawalRequest(request);

    await this.notifications.add(
      institutionId,
      'Withdrawal submitted for review',
      `₦${amount} bank withdrawal to ${bank.bankName} is awaiting Rain admin approval. After approval, we typically send funds within 1–2 hours.`,
    );

    void this.email.sendToOps(
      'Earnings bank withdrawal awaiting approval',
      `Institution: ${institution.name} (${institution.email})\nAmount: ₦${amount}\nReference: ${reference}\nBank: ${bank.bankName} · ${bank.accountName} · ${bank.accountNumber}\nApprove in Rain admin: ${this.config.get<string>('platform.webAppUrl')}/admin/earnings-withdrawals`,
    );

    return {
      success: true,
      reference,
      amount,
      destination: 'bank',
      payoutStatus: 'pending_approval',
    };
  }

  async listWithdrawalsForAdmin(status?: string) {
    const rows = await this.earningsRepo.listWithdrawals(status);
    return rows.map((r) => ({
      id: r.id,
      reference: r.reference,
      amount: r.amount,
      status: r.status,
      institutionId: r.institutionId,
      institutionName: r.institutionName,
      institutionEmail: r.institutionEmail,
      settlementBank: r.settlementBank,
      processAfterAt: r.processAfterAt,
      createdAt: r.createdAt,
      reviewedAt: r.reviewedAt,
      reviewedByEmail: r.reviewedByEmail,
      rejectionReason: r.rejectionReason,
      monnifyStatus: r.monnifyStatus,
      failureReason: r.failureReason,
      processedAt: r.processedAt,
    }));
  }

  async approveWithdrawalRequest(id: string, adminEmail: string) {
    const request = await this.earningsRepo.findWithdrawalById(id);
    if (!request) {
      return { success: false as const, error: 'Withdrawal request not found.' };
    }
    if (request.status !== 'pending_approval') {
      return {
        success: false as const,
        error: `Request is already ${request.status}.`,
      };
    }

    const processAfterAt = this.computeProcessAfterAt();
    request.status = 'queued';
    request.processAfterAt = processAfterAt.toISOString();
    request.reviewedAt = new Date().toISOString();
    request.reviewedByEmail = adminEmail;
    request.rejectionReason = undefined;
    await this.earningsRepo.saveWithdrawalRequest(request);

    const institution = await this.institutions.findById(request.institutionId);
    await this.notifications.add(
      request.institutionId,
      'Withdrawal approved',
      `Your ₦${request.amount} bank withdrawal was approved. Payout usually completes within 1–2 hours.`,
    );

    void this.email.sendToOps(
      'Earnings withdrawal approved',
      `Admin ${adminEmail} approved ${request.reference} (₦${request.amount}) for ${institution?.name ?? request.institutionId}. Scheduled after ${request.processAfterAt}.`,
    );

    return { success: true as const, reference: request.reference };
  }

  async rejectWithdrawalRequest(
    id: string,
    adminEmail: string,
    reason?: string,
  ) {
    const request = await this.earningsRepo.findWithdrawalById(id);
    if (!request) {
      return { success: false as const, error: 'Withdrawal request not found.' };
    }
    if (request.status !== 'pending_approval') {
      return {
        success: false as const,
        error: `Request is already ${request.status}.`,
      };
    }

    request.status = 'rejected';
    request.reviewedAt = new Date().toISOString();
    request.reviewedByEmail = adminEmail;
    request.rejectionReason = reason?.trim() || 'Rejected by Rain admin.';
    request.processedAt = new Date().toISOString();
    await this.earningsRepo.saveWithdrawalRequest(request);

    await this.revertPendingToAvailable(
      request.institutionId,
      request.reference,
    );

    await this.notifications.add(
      request.institutionId,
      'Withdrawal not approved',
      `Your ₦${request.amount} bank withdrawal was not approved. ${request.rejectionReason} Earnings were returned to your available balance.`,
    );

    return { success: true as const, reference: request.reference };
  }

  async processDueBankWithdrawals() {
    const ready = await this.earningsRepo.listWithdrawalsReadyForProcessing();
    for (const item of ready) {
      const claimed = await this.earningsRepo.claimWithdrawalForProcessing(
        item.id,
      );
      if (!claimed) continue;
      try {
        await this.executeBankWithdrawalPayout(claimed);
      } catch (error) {
        this.logger.error(
          `Payout failed for ${claimed.reference}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }

  private async executeBankWithdrawalPayout(
    request: EarningsWithdrawalRequestEntity,
  ) {
    const institution = await this.institutions.findById(request.institutionId);
    if (!institution?.settlementBank) {
      await this.failWithdrawalRequest(
        request,
        'Settlement bank was removed before payout could run.',
      );
      await this.revertPendingToAvailable(
        request.institutionId,
        request.reference,
      );
      return;
    }

    const bank = institution.settlementBank;
    const bankCode = bankCodeForName(bank.bankName);
    if (!bankCode) {
      await this.failWithdrawalRequest(
        request,
        'Unsupported settlement bank for Monnify payout.',
      );
      await this.revertPendingToAvailable(
        request.institutionId,
        request.reference,
      );
      return;
    }

    if (!this.monnify.isConfigured() || !this.monnify.hasDisbursementSource()) {
      request.status = 'queued';
      await this.earningsRepo.saveWithdrawalRequest(request);
      return;
    }

    try {
      const balance = await this.monnify.getDisbursementWalletBalance();
      if (balance.availableBalance < request.amount) {
        request.status = 'queued';
        request.processAfterAt = new Date(
          Date.now() + 30 * 60 * 1000,
        ).toISOString();
        await this.earningsRepo.saveWithdrawalRequest(request);
        return;
      }
    } catch {
      // Proceed; Monnify may still accept the transfer.
    }

    let initiateStatus: string;
    try {
      const initiated = await this.monnify.initiateSingleDisbursement({
        amount: request.amount,
        reference: request.reference,
        narration: `Rain earnings withdrawal · ${request.reference}`,
        destinationBankCode: bankCode,
        destinationAccountNumber: bank.accountNumber.replace(/\D/g, ''),
        destinationAccountName: bank.accountName.trim(),
      });
      initiateStatus = initiated.status;
    } catch (error) {
      const mapped = this.mapMonnifyWithdrawError(error);
      if (mapped.code === 'insufficient_wallet') {
        request.status = 'queued';
        request.processAfterAt = new Date(
          Date.now() + 30 * 60 * 1000,
        ).toISOString();
        await this.earningsRepo.saveWithdrawalRequest(request);
        await this.notifications.add(
          request.institutionId,
          'Bank payout delayed',
          mapped.error,
        );
        return;
      }
      await this.failWithdrawalRequest(request, mapped.error);
      await this.revertPendingToAvailable(
        request.institutionId,
        request.reference,
      );
      await this.notifications.add(
        request.institutionId,
        'Bank payout issue',
        mapped.error,
      );
      return;
    }

    let classified = classifyMonnifyDisbursementStatus(initiateStatus);
    let finalStatus = initiateStatus;

    if (!classified.terminal) {
      try {
        const polled = await this.monnify.pollSingleDisbursementStatus(
          request.reference,
          { maxAttempts: 10, intervalMs: 3000 },
        );
        finalStatus = polled.status;
        classified = polled.classified;
      } catch {
        classified = classifyMonnifyDisbursementStatus(finalStatus);
      }
    }

    request.monnifyStatus = finalStatus;

    if (classified.requiresOtp) {
      await this.failWithdrawalRequest(
        request,
        'Monnify requires OTP approval for disbursements. Request MFA to be disabled for automated payouts.',
      );
      await this.revertPendingToAvailable(
        request.institutionId,
        request.reference,
      );
      await this.notifications.add(
        request.institutionId,
        'Bank payout needs Monnify setup',
        request.failureReason ?? 'OTP authorization required.',
      );
      return;
    }

    if (classified.success) {
      await this.finalizePendingAsPaid(
        request.institutionId,
        request.reference,
      );
      request.status = 'completed';
      request.processedAt = new Date().toISOString();
      request.failureReason = undefined;
      await this.earningsRepo.saveWithdrawalRequest(request);
      await this.notifications.add(
        request.institutionId,
        'Bank payout completed',
        `₦${request.amount} was sent to ${bank.bankName} (${bank.accountName}).`,
      );
      return;
    }

    if (classified.terminal && !classified.success) {
      await this.failWithdrawalRequest(
        request,
        `Bank payout failed (${finalStatus}).`,
      );
      await this.revertPendingToAvailable(
        request.institutionId,
        request.reference,
      );
      await this.notifications.add(
        request.institutionId,
        'Bank payout failed',
        request.failureReason ?? 'Payout failed.',
      );
      return;
    }

    request.status = 'processing';
    await this.earningsRepo.saveWithdrawalRequest(request);
    await this.notifications.add(
      request.institutionId,
      'Bank payout processing',
      `₦${request.amount} to ${bank.bankName} is still processing at the bank.`,
    );
  }

  async handleDisbursementWebhook(input: {
    eventType: string;
    reference: string;
    monnifyStatus?: string;
    transactionDescription?: string;
  }) {
    const request = await this.earningsRepo.findWithdrawalByReferenceGlobal(
      input.reference,
    );
    if (!request) return;

    if (request.status === 'completed' || request.status === 'rejected') {
      return;
    }

    const eventType = input.eventType.toUpperCase();
    const monnifyStatus =
      input.monnifyStatus?.toUpperCase() ??
      (eventType === 'SUCCESSFUL_DISBURSEMENT'
        ? 'SUCCESS'
        : eventType === 'REVERSED_DISBURSEMENT'
          ? 'REVERSED'
          : 'FAILED');

    if (eventType === 'SUCCESSFUL_DISBURSEMENT') {
      await this.finalizePendingAsPaid(
        request.institutionId,
        request.reference,
      );
      request.status = 'completed';
      request.monnifyStatus = monnifyStatus;
      request.processedAt = new Date().toISOString();
      request.failureReason = undefined;
      await this.earningsRepo.saveWithdrawalRequest(request);
      await this.notifications.add(
        request.institutionId,
        'Bank payout completed',
        `₦${request.amount} bank withdrawal (${request.reference}) completed via Monnify.`,
      );
      return;
    }

    if (
      eventType === 'FAILED_DISBURSEMENT' ||
      eventType === 'REVERSED_DISBURSEMENT'
    ) {
      const reason =
        input.transactionDescription ??
        (eventType === 'REVERSED_DISBURSEMENT'
          ? 'Disbursement reversed.'
          : 'Disbursement failed.');
      request.monnifyStatus = monnifyStatus;
      await this.failWithdrawalRequest(request, reason);
      await this.revertPendingToAvailable(
        request.institutionId,
        request.reference,
      );
      await this.notifications.add(
        request.institutionId,
        eventType === 'REVERSED_DISBURSEMENT'
          ? 'Bank payout reversed'
          : 'Bank payout failed',
        reason,
      );
    }
  }

  async syncBankWithdrawalStatus(institutionId: string, reference: string) {
    const request = await this.earningsRepo.findWithdrawalByReference(
      institutionId,
      reference,
    );

    if (request) {
      if (request.status === 'pending_approval') {
        return {
          reference,
          payoutStatus: 'pending_approval' as const,
          monnifyStatus: 'PENDING_APPROVAL',
          message:
            'Your withdrawal is awaiting Rain admin approval. After approval, payout typically completes within 1–2 hours.',
        };
      }

      if (request.status === 'rejected') {
        return {
          reference,
          payoutStatus: 'failed' as const,
          monnifyStatus: 'REJECTED',
          message:
            request.rejectionReason ??
            'Withdrawal was not approved. Earnings were returned to your available balance.',
        };
      }

      if (request.status === 'queued') {
        return {
          reference,
          payoutStatus: 'scheduled' as const,
          monnifyStatus: 'QUEUED',
          processAfterAt: request.processAfterAt,
          message:
            'Withdrawal approved. We typically send the bank transfer within 1–2 hours of approval.',
        };
      }

      if (request.status === 'completed') {
        return {
          reference,
          payoutStatus: 'completed' as const,
          monnifyStatus: request.monnifyStatus ?? 'SUCCESS',
        };
      }

      if (request.status === 'failed') {
        return {
          reference,
          payoutStatus: 'failed' as const,
          monnifyStatus: request.monnifyStatus ?? 'FAILED',
          message:
            request.failureReason ??
            'Payout failed. Earnings were returned to your available balance.',
        };
      }
    }

    const records = (await this.earningsRepo.listForInstitution(institutionId)).filter(
      (r) => r.payoutReference === reference,
    );
    if (records.length === 0) {
      return {
        reference,
        payoutStatus: 'completed' as const,
        monnifyStatus: 'UNKNOWN',
        message: 'No pending payout found for this reference.',
      };
    }

    const pendingAmount = records
      .filter((r) => r.status === 'pending')
      .reduce((sum, r) => sum + r.amount, 0);

    if (pendingAmount === 0) {
      return {
        reference,
        payoutStatus: 'completed' as const,
        monnifyStatus: 'SUCCESS',
      };
    }

    if (!this.monnify.isConfigured()) {
      return {
        reference,
        payoutStatus: 'processing' as const,
        monnifyStatus: 'PENDING',
        message: 'Monnify is not configured.',
      };
    }

    let summary;
    try {
      summary = await this.monnify.getSingleDisbursementSummary(reference);
    } catch (error) {
      const message =
        error instanceof MonnifyApiError
          ? error.message
          : 'Could not fetch payout status.';
      return {
        reference,
        payoutStatus: 'processing' as const,
        monnifyStatus: 'PENDING',
        message,
      };
    }

    const classified = classifyMonnifyDisbursementStatus(summary.status);

    if (classified.requiresOtp) {
      await this.revertPendingToAvailable(institutionId, reference);
      if (request) {
        await this.failWithdrawalRequest(
          request,
          'Payout requires OTP authorization.',
        );
      }
      return {
        reference,
        payoutStatus: 'failed' as const,
        monnifyStatus: summary.status,
        message:
          'Payout requires OTP authorization. Earnings were returned to your available balance.',
      };
    }

    if (classified.success) {
      await this.finalizePendingAsPaid(institutionId, reference);
      if (request) {
        request.status = 'completed';
        request.monnifyStatus = summary.status;
        request.processedAt = new Date().toISOString();
        await this.earningsRepo.saveWithdrawalRequest(request);
      }
      await this.notifications.add(
        institutionId,
        'Bank payout completed',
        `₦${pendingAmount} bank withdrawal (${reference}) completed.`,
      );
      return {
        reference,
        payoutStatus: 'completed' as const,
        monnifyStatus: summary.status,
      };
    }

    if (classified.terminal && !classified.success) {
      await this.revertPendingToAvailable(institutionId, reference);
      if (request) {
        await this.failWithdrawalRequest(
          request,
          summary.transactionDescription ?? 'Payout failed.',
        );
      }
      return {
        reference,
        payoutStatus: 'failed' as const,
        monnifyStatus: summary.status,
        message: summary.transactionDescription ?? 'Payout failed.',
      };
    }

    if (request) {
      request.monnifyStatus = summary.status;
      await this.earningsRepo.saveWithdrawalRequest(request);
    }

    return {
      reference,
      payoutStatus: 'processing' as const,
      monnifyStatus: summary.status,
    };
  }

  private computeProcessAfterAt(): Date {
    const minMinutes =
      this.config.get<number>('earnings.bankWithdrawMinDelayMinutes') ?? 60;
    const maxMinutes =
      this.config.get<number>('earnings.bankWithdrawMaxDelayMinutes') ?? 120;

    const minMs = Math.max(0, minMinutes) * 60 * 1000;
    const maxMs = Math.max(minMs, maxMinutes * 60 * 1000);
    const delayMs =
      minMs === maxMs
        ? minMs
        : minMs + Math.floor(Math.random() * (maxMs - minMs + 1));

    return new Date(Date.now() + delayMs);
  }

  private async failWithdrawalRequest(
    request: EarningsWithdrawalRequestEntity,
    reason: string,
  ) {
    request.status = 'failed';
    request.failureReason = reason;
    request.processedAt = new Date().toISOString();
    await this.earningsRepo.saveWithdrawalRequest(request);
  }

  private mapMonnifyWithdrawError(error: unknown): {
    success: false;
    error: string;
    code?: 'insufficient_wallet' | 'pending_authorization' | 'payout_failed';
  } {
    if (!(error instanceof MonnifyApiError)) {
      return {
        success: false,
        error: 'Could not initiate bank payout. Try again.',
        code: 'payout_failed',
      };
    }

    const msg = error.message.toLowerCase();
    if (
      error.responseCode === 'D04' ||
      msg.includes('insufficient wallet balance')
    ) {
      return {
        success: false,
        error:
          'Payout wallet has insufficient balance. Top up your Monnify disbursement wallet and try again.',
        code: 'insufficient_wallet',
      };
    }
    if (error.responseCode === 'D06') {
      return {
        success: false,
        error:
          'Payout rejected: server IP is not whitelisted on Monnify. Contact integration-support@monnify.com.',
        code: 'payout_failed',
      };
    }
    if (
      msg.includes('pending_authorization') ||
      msg.includes('authorization')
    ) {
      return {
        success: false,
        error:
          'Monnify requires OTP approval for disbursements. Request MFA to be disabled for automated payouts.',
        code: 'pending_authorization',
      };
    }

    return { success: false, error: error.message, code: 'payout_failed' };
  }

  private async markEarningsWithdrawn(institutionId: string, amount: number) {
    let remaining = amount;
    const records = (await this.earningsRepo.listForInstitution(institutionId)).filter(
      (r) => r.status === 'available',
    );

    for (const record of records) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, record.amount);
      remaining -= take;
      if (take === record.amount) {
        record.status = 'paid';
      } else {
        record.amount -= take;
        const paidPart: EarningRecordEntity = {
          ...record,
          id: generateId('ern'),
          amount: take,
          status: 'paid',
        };
        await this.earningsRepo.save(paidPart);
      }
      await this.earningsRepo.save(record);
    }
  }

  private async moveEarningsToPending(
    institutionId: string,
    amount: number,
    payoutReference: string,
  ): Promise<boolean> {
    let remaining = amount;
    const records = (await this.earningsRepo.listForInstitution(institutionId)).filter(
      (r) => r.status === 'available',
    );
    const available = records.reduce((sum, r) => sum + r.amount, 0);
    if (available < amount) return false;

    for (const record of records) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, record.amount);
      remaining -= take;
      if (take === record.amount) {
        record.status = 'pending';
        record.payoutReference = payoutReference;
      } else {
        record.amount -= take;
        const pendingPart: EarningRecordEntity = {
          ...record,
          id: generateId('ern'),
          amount: take,
          status: 'pending',
          payoutReference,
        };
        await this.earningsRepo.save(pendingPart);
      }
      await this.earningsRepo.save(record);
    }
    return remaining <= 0;
  }

  private async finalizePendingAsPaid(
    institutionId: string,
    payoutReference: string,
  ) {
    const records = (await this.earningsRepo.listForInstitution(institutionId)).filter(
      (r) => r.status === 'pending' && r.payoutReference === payoutReference,
    );
    for (const record of records) {
      record.status = 'paid';
      delete record.payoutReference;
      await this.earningsRepo.save(record);
    }
  }

  private async revertPendingToAvailable(
    institutionId: string,
    payoutReference: string,
  ) {
    const records = (await this.earningsRepo.listForInstitution(institutionId)).filter(
      (r) => r.status === 'pending' && r.payoutReference === payoutReference,
    );
    for (const record of records) {
      record.status = 'available';
      delete record.payoutReference;
      await this.earningsRepo.save(record);
    }
  }

  private toPlatformRecord(r: EarningRecordEntity) {
    return {
      id: r.id,
      maskedIdentifier: r.maskedIdentifier,
      reportReference: r.reportReference,
      amount: r.amount,
      status: r.status,
      createdAt: r.createdAt,
    };
  }
}

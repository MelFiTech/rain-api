import { Injectable, NotFoundException } from '@nestjs/common';
import { buildPlatformTransactionDetail } from './transaction-detail.builder';
import {
  InstitutionRepository,
  ReportRepository,
  UserRepository,
  VerificationRepository,
  WalletRepository,
} from '../../persistence';
import { PrismaService } from '../../prisma/prisma.service';
import { isCustomerInstitution } from '../../common/utils/platform-institution';
import { PLATFORM_INTERNAL_INSTITUTION_ID } from '../../common/constants';

@Injectable()
export class PlatformAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly institutions: InstitutionRepository,
    private readonly users: UserRepository,
    private readonly verifications: VerificationRepository,
    private readonly reports: ReportRepository,
    private readonly wallet: WalletRepository,
  ) {}

  async getDashboard() {
    const [
      totalInstitutions,
      pendingAccessRequests,
      totalVerifications,
      totalReports,
      pendingWithdrawals,
      walletAggregate,
    ] = await Promise.all([
      this.prisma.institution.count({
        where: { id: { not: PLATFORM_INTERNAL_INSTITUTION_ID } },
      }),
      this.prisma.accessRequest.count({ where: { status: 'pending' } }),
      this.prisma.verification.count(),
      this.prisma.report.count(),
      this.prisma.earningsWithdrawalRequest.count({
        where: { status: 'pending_approval' },
      }),
      this.prisma.institution.aggregate({ _sum: { walletBalance: true } }),
    ]);

    return {
      totalInstitutions,
      pendingAccessRequests,
      totalVerifications,
      totalReports,
      pendingWithdrawals,
      totalWalletBalance: walletAggregate._sum.walletBalance ?? 0,
    };
  }

  async listInstitutions() {
    const rows = (await this.institutions.listAll()).filter((inst) =>
      isCustomerInstitution(inst),
    );
    const counts = await Promise.all(
      rows.map(async (inst) => {
        const [users, verificationCount, reportCount] = await Promise.all([
          this.prisma.user.count({ where: { institutionId: inst.id } }),
          this.prisma.verification.count({ where: { institutionId: inst.id } }),
          this.prisma.report.count({ where: { institutionId: inst.id } }),
        ]);
        return {
          id: inst.id,
          name: inst.name,
          email: inst.email,
          walletBalance: inst.walletBalance,
          apiKeyPrefix: inst.apiKeyPrefix,
          apiKeyLastUsedAt: inst.apiKeyLastUsedAt,
          apiKeyCreatedAt: inst.apiKeyCreatedAt,
          contactName: inst.contactName,
          userCount: users,
          verificationCount,
          reportCount,
        };
      }),
    );
    return counts.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getInstitution(id: string) {
    const inst = await this.institutions.findById(id);
    if (!inst || !isCustomerInstitution(inst)) {
      throw new NotFoundException('Institution not found.');
    }

    const [
      team,
      verificationCount,
      reportCount,
      walletTxnCount,
      pendingWithdrawals,
      earningsTotal,
    ] = await Promise.all([
      this.users.listByInstitution(id),
      this.prisma.verification.count({ where: { institutionId: id } }),
      this.prisma.report.count({ where: { institutionId: id } }),
      this.prisma.walletTransaction.count({ where: { institutionId: id } }),
      this.prisma.earningsWithdrawalRequest.count({
        where: { institutionId: id, status: 'pending_approval' },
      }),
      this.prisma.earningRecord.aggregate({
        where: { institutionId: id },
        _sum: { amount: true },
      }),
    ]);

    return {
      institution: {
        id: inst.id,
        name: inst.name,
        email: inst.email,
        walletBalance: inst.walletBalance,
        lowBalanceThreshold: inst.lowBalanceThreshold,
        apiKeyPrefix: inst.apiKeyPrefix,
        apiKeyLastUsedAt: inst.apiKeyLastUsedAt,
        apiKeyCreatedAt: inst.apiKeyCreatedAt,
        contactName: inst.contactName,
        phone: inst.phone,
        address: inst.address,
        settlementBank: inst.settlementBank,
      },
      stats: {
        teamMembers: team.length,
        verifications: verificationCount,
        reports: reportCount,
        walletTransactions: walletTxnCount,
        pendingWithdrawals,
        totalEarnings: earningsTotal._sum.amount ?? 0,
      },
      team: team.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        isPlatformAdmin: u.isPlatformAdmin,
      })),
    };
  }

  async getInstitutionActivity(id: string, page = 1, limit = 10) {
    const inst = await this.institutions.findById(id);
    if (!inst || !isCustomerInstitution(inst)) {
      throw new NotFoundException('Institution not found.');
    }

    const pageSize = Math.min(Math.max(limit, 1), 50);
    const pageNum = Math.max(page, 1);

    const [verifications, reports, walletTxns, withdrawalRows] =
      await Promise.all([
        this.verifications.listForInstitution(id),
        this.reports.listForInstitution(id),
        this.wallet.listTransactions(id),
        this.prisma.earningsWithdrawalRequest.findMany({
          where: { institutionId: id },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

    type ActivityItem = {
      id: string;
      type: 'verification' | 'report' | 'wallet' | 'withdrawal';
      title: string;
      detail: string;
      createdAt: string;
    };

    const items: ActivityItem[] = [];

    for (const v of verifications) {
      items.push({
        id: v.id,
        type: 'verification',
        title: `Verification · ${v.result}`,
        detail: `${v.identifierType} ${v.maskedIdentifier}`,
        createdAt: v.createdAt,
      });
    }
    for (const r of reports) {
      items.push({
        id: r.id,
        type: 'report',
        title: `Report · ${r.category}`,
        detail: r.maskedIdentifier,
        createdAt: r.submittedAt,
      });
    }
    for (const t of walletTxns) {
      items.push({
        id: t.id,
        type: 'wallet',
        title: `Wallet · ${t.type}`,
        detail: `${t.description} · ₦${t.amount}`,
        createdAt: t.createdAt,
      });
    }
    for (const w of withdrawalRows) {
      items.push({
        id: w.id,
        type: 'withdrawal',
        title: `Withdrawal · ${w.status}`,
        detail: `₦${w.amount} · ${w.reference}`,
        createdAt: w.createdAt.toISOString(),
      });
    }

    items.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(pageNum, totalPages);
    const start = (safePage - 1) * pageSize;

    return {
      items: items.slice(start, start + pageSize),
      total,
      page: safePage,
      totalPages,
      limit: pageSize,
    };
  }

  async listTransactions(page = 1, limit = 25, type?: string) {
    const pageSize = Math.min(Math.max(limit, 1), 100);
    const pageNum = Math.max(page, 1);
    const skip = (pageNum - 1) * pageSize;

    const where = {
      institutionId: { not: PLATFORM_INTERNAL_INSTITUTION_ID },
      ...(type?.trim() ? { type: type.trim() } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where,
        include: {
          institution: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.walletTransaction.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(pageNum, totalPages);

    return {
      items: rows.map((row) => ({
        id: row.id,
        institutionId: row.institutionId,
        institutionName: row.institution.name,
        institutionEmail: row.institution.email,
        type: row.type,
        amount: row.amount,
        balanceBefore: row.balanceAfter - row.amount,
        balanceAfter: row.balanceAfter,
        description: row.description,
        reference: row.reference,
        createdAt: row.createdAt.toISOString(),
      })),
      total,
      page: safePage,
      totalPages,
      limit: pageSize,
    };
  }

  async getTransaction(id: string) {
    const row = await this.prisma.walletTransaction.findUnique({
      where: { id },
      include: {
        institution: {
          select: {
            id: true,
            name: true,
            email: true,
            walletBalance: true,
          },
        },
      },
    });
    if (!row || row.institutionId === PLATFORM_INTERNAL_INSTITUTION_ID) {
      throw new NotFoundException('Transaction not found.');
    }

    let fundSession = null;
    if (row.type === 'funding') {
      const fundReference =
        (row.metadata as { funding?: { fundReference?: string } } | null)
          ?.funding?.fundReference ??
        row.description.match(/·\s*(FND-[A-Z0-9]+-[A-Z0-9]+)/i)?.[1] ??
        (/^FND-/i.test(row.reference) ? row.reference : null);
      if (fundReference) {
        fundSession = await this.prisma.fundSession.findFirst({
          where: { reference: fundReference },
        });
      }
    }

    let verification = null;
    if (row.type === 'verification_charge') {
      const verRef =
        (row.metadata as { verification?: { reference?: string } } | null)
          ?.verification?.reference ??
        row.description.match(/(VER-[A-Z0-9]+(?:-[A-Z0-9]+)?)/i)?.[1];
      if (verRef) {
        verification = await this.prisma.verification.findFirst({
          where: {
            institutionId: row.institutionId,
            reference: verRef,
          },
        });
      }
      if (!verification) {
        verification = await this.prisma.verification.findFirst({
          where: {
            institutionId: row.institutionId,
            amountCharged: Math.abs(row.amount),
            createdAt: {
              gte: new Date(row.createdAt.getTime() - 2 * 60 * 1000),
              lte: new Date(row.createdAt.getTime() + 2 * 60 * 1000),
            },
          },
          orderBy: { createdAt: 'desc' },
        });
      }
    }

    return buildPlatformTransactionDetail({
      row,
      fundSession,
      verification,
    });
  }

  async listWebhookLogs(page = 1, limit = 25) {
    const pageSize = Math.min(Math.max(limit, 1), 100);
    const pageNum = Math.max(page, 1);
    const skip = (pageNum - 1) * pageSize;

    const [rows, total] = await Promise.all([
      this.prisma.monnifyWebhookLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.monnifyWebhookLog.count(),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(pageNum, totalPages);

    return {
      items: rows.map((row) => ({
        id: row.id,
        eventType: row.eventType,
        dedupeKey: row.dedupeKey,
        duplicate: row.duplicate,
        createdAt: row.createdAt.toISOString(),
      })),
      total,
      page: safePage,
      totalPages,
      limit: pageSize,
    };
  }

  async getWebhookLog(id: string) {
    const row = await this.prisma.monnifyWebhookLog.findUnique({
      where: { id },
    });
    if (!row) {
      throw new NotFoundException('Webhook log not found.');
    }
    return {
      id: row.id,
      eventType: row.eventType,
      dedupeKey: row.dedupeKey,
      duplicate: row.duplicate,
      payload: row.payload,
      createdAt: row.createdAt.toISOString(),
    };
  }
}

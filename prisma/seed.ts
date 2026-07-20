import * as bcrypt from 'bcrypt';
import {
  API_KEY_PREFIX,
  LOW_BALANCE_THRESHOLD,
  PLATFORM_INTERNAL_INSTITUTION_EMAIL,
} from '../src/common/constants';
import { buildApiConfidence } from '../src/common/utils/confidence';
import { generateId, generateReference } from '../src/common/utils/ids';
import { maskBvnOrNin, maskEmail } from '../src/common/utils/masking';
import { buildSignalKey } from '../src/common/utils/signal-key';
import { encryptApiKey } from '../src/common/crypto/api-key-cipher';
import {
  institutionToPrisma,
  reportToPrisma,
  userToPrisma,
  verificationToPrisma,
} from '../src/persistence/mappers/prisma-mappers';
import { PrismaClient } from '@prisma/client';

const DEFAULT_NOTIFICATION_PREFERENCES = {
  emailVerificationResults: true,
  emailEarnings: true,
  emailTeamActivity: true,
  emailLowBalance: true,
  inAppNotifications: true,
};

const prisma = new PrismaClient();

/** Minimum wallet balance for seeded customer institutions (₦). */
const MIN_CUSTOMER_WALLET_BALANCE = 5000;

const JWT_SECRET =
  process.env.JWT_SECRET ?? 'rain-dev-jwt-secret-change-me';

async function apiKeyFields(apiKeyPlain: string) {
  return {
    apiKeyHash: await bcrypt.hash(apiKeyPlain, 10),
    apiKeyPrefix: apiKeyPlain.slice(0, 16),
    apiKeyCiphertext: encryptApiKey(apiKeyPlain, JWT_SECRET),
  };
}

const RAIN_PLATFORM_INSTITUTION_ID = 'inst_rain_platform';

async function main() {
  const internalKey = `${API_KEY_PREFIX}rain_platform_internal`;
  const rainPlatformKeys = await apiKeyFields(internalKey);
  const rainPlatform = {
    id: RAIN_PLATFORM_INSTITUTION_ID,
    name: 'Rain Platform',
    email: PLATFORM_INTERNAL_INSTITUTION_EMAIL,
    walletBalance: 0,
    lowBalanceThreshold: LOW_BALANCE_THRESHOLD,
    ...rainPlatformKeys,
    apiKeyCreatedAt: new Date(),
    notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
    settlementBank: null,
  };

  await prisma.institution.upsert({
    where: { id: rainPlatform.id },
    create: institutionToPrisma({
      ...rainPlatform,
      apiKeyCreatedAt: rainPlatform.apiKeyCreatedAt.toISOString(),
      notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
    }),
    update: institutionToPrisma({
      ...rainPlatform,
      apiKeyCreatedAt: rainPlatform.apiKeyCreatedAt.toISOString(),
      notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
    }),
  });

  const superAdmin = {
    id: 'usr_rain_super_admin',
    institutionId: RAIN_PLATFORM_INSTITUTION_ID,
    email: 'admin@userain.co',
    name: 'Rain Super Admin',
    role: 'administrator' as const,
    passwordHash: await bcrypt.hash('Password@123', 10),
    isPlatformAdmin: true,
  };

  await prisma.user.upsert({
    where: { id: superAdmin.id },
    create: userToPrisma(superAdmin),
    update: userToPrisma(superAdmin),
  });

  const demoApiKey = `${API_KEY_PREFIX}demo_development_key`;
  const demoKeys = await apiKeyFields(demoApiKey);
  const institution = {
    id: 'inst_paynest',
    name: 'PayNest MFB',
    email: 'compliance@paynest.ng',
    walletBalance: 12500,
    lowBalanceThreshold: LOW_BALANCE_THRESHOLD,
    ...demoKeys,
    apiKeyCreatedAt: new Date(),
    notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
    settlementBank: null,
  };

  await prisma.institution.upsert({
    where: { id: institution.id },
    create: institutionToPrisma({
      ...institution,
      apiKeyCreatedAt: institution.apiKeyCreatedAt.toISOString(),
      notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
      settlementBank: {
        accountName: 'PayNest MFB',
        bankName: 'GTBank',
        accountNumber: '0123456789',
        updatedAt: new Date().toISOString(),
      },
    }),
    update: institutionToPrisma({
      ...institution,
      apiKeyCreatedAt: institution.apiKeyCreatedAt.toISOString(),
      notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
      settlementBank: {
        accountName: 'PayNest MFB',
        bankName: 'GTBank',
        accountNumber: '0123456789',
        updatedAt: new Date().toISOString(),
      },
    }),
  });

  const user = {
    id: 'usr_admin',
    institutionId: institution.id,
    email: 'compliance@paynest.ng',
    name: 'Adaora Okafor',
    role: 'administrator' as const,
    passwordHash: await bcrypt.hash('password123', 10),
    isPlatformAdmin: false,
  };

  await prisma.user.upsert({
    where: { id: user.id },
    create: userToPrisma(user),
    update: userToPrisma(user),
  });

  const peerApiKey = `${API_KEY_PREFIX}peer_demo_key`;
  const peerKeys = await apiKeyFields(peerApiKey);
  const peerInstitution = {
    id: 'inst_demo_peer',
    name: 'Demo Peer MFB',
    email: 'fraud@demopeer.ng',
    walletBalance: 8000,
    lowBalanceThreshold: LOW_BALANCE_THRESHOLD,
    ...peerKeys,
    apiKeyCreatedAt: new Date(),
    notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
    settlementBank: null,
  };

  await prisma.institution.upsert({
    where: { id: peerInstitution.id },
    create: institutionToPrisma({
      ...peerInstitution,
      apiKeyCreatedAt: peerInstitution.apiKeyCreatedAt.toISOString(),
      notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
    }),
    update: institutionToPrisma({
      ...peerInstitution,
      apiKeyCreatedAt: peerInstitution.apiKeyCreatedAt.toISOString(),
      notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
    }),
  });

  const peerSignal = buildSignalKey('bvn', '22222222222');
  const peerReport = {
    id: generateId('rpt'),
    institutionId: peerInstitution.id,
    reference: generateReference('RPT'),
    identifierType: 'bvn' as const,
    maskedIdentifier: maskBvnOrNin('22222222222'),
    maskedEmail: maskEmail('peer@demopeer.ng'),
    category: 'fraud' as const,
    description: 'Peer institution sample report for network feed testing.',
    incidentDate: '2026-03-01',
    independentSourceCount: 1,
    confidence: buildApiConfidence(1),
    earningsGenerated: 0,
    submittedAt: new Date(),
    signalKey: peerSignal,
  };

  await prisma.report.upsert({
    where: { id: peerReport.id },
    create: reportToPrisma({
      ...peerReport,
      submittedAt: peerReport.submittedAt.toISOString(),
    }),
    update: reportToPrisma({
      ...peerReport,
      submittedAt: peerReport.submittedAt.toISOString(),
    }),
  });

  async function seedInstitution(input: {
    id: string;
    name: string;
    email: string;
    walletBalance: number;
    apiKeySuffix: string;
    contactName: string;
    user: {
      id: string;
      name: string;
      email: string;
      password: string;
      role: 'administrator' | 'analyst' | 'finance';
    };
    settlementBank?: {
      accountName: string;
      bankName: string;
      accountNumber: string;
    };
  }) {
    const apiKeyPlain = `${API_KEY_PREFIX}${input.apiKeySuffix}`;
    const keys = await apiKeyFields(apiKeyPlain);
    const createdAt = new Date();
    const settlementBank = input.settlementBank
      ? { ...input.settlementBank, updatedAt: createdAt.toISOString() }
      : null;
    const inst = {
      id: input.id,
      name: input.name,
      email: input.email,
      contactName: input.contactName,
      walletBalance: Math.max(MIN_CUSTOMER_WALLET_BALANCE, input.walletBalance),
      lowBalanceThreshold: LOW_BALANCE_THRESHOLD,
      ...keys,
      apiKeyCreatedAt: createdAt,
      notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
      settlementBank,
    };
    await prisma.institution.upsert({
      where: { id: inst.id },
      create: institutionToPrisma({
        ...inst,
        apiKeyCreatedAt: inst.apiKeyCreatedAt.toISOString(),
        notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
      }),
      update: institutionToPrisma({
        ...inst,
        apiKeyCreatedAt: inst.apiKeyCreatedAt.toISOString(),
        notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
      }),
    });
    await prisma.user.upsert({
      where: { id: input.user.id },
      create: userToPrisma({
        id: input.user.id,
        institutionId: input.id,
        email: input.user.email,
        name: input.user.name,
        role: input.user.role,
        passwordHash: await bcrypt.hash(input.user.password, 10),
        isPlatformAdmin: false,
      }),
      update: userToPrisma({
        id: input.user.id,
        institutionId: input.id,
        email: input.user.email,
        name: input.user.name,
        role: input.user.role,
        passwordHash: await bcrypt.hash(input.user.password, 10),
        isPlatformAdmin: false,
      }),
    });
  }

  await seedInstitution({
    id: 'inst_liongate',
    name: 'Liongate MFB',
    email: 'ops@liongate.ng',
    walletBalance: 42000,
    apiKeySuffix: 'liongate_dev_key',
    contactName: 'Emeka Nwosu',
    user: {
      id: 'usr_liongate_admin',
      name: 'Emeka Nwosu',
      email: 'ops@liongate.ng',
      password: 'password123',
      role: 'administrator',
    },
  });

  await seedInstitution({
    id: 'inst_suretrust',
    name: 'SureTrust Finance',
    email: 'fraud@suretrust.ng',
    walletBalance: 9800,
    apiKeySuffix: 'suretrust_dev_key',
    contactName: 'Funke Adeyemi',
    user: {
      id: 'usr_suretrust_admin',
      name: 'Funke Adeyemi',
      email: 'fraud@suretrust.ng',
      password: 'password123',
      role: 'administrator',
    },
    settlementBank: {
      accountName: 'SureTrust Finance Ltd',
      bankName: 'Access Bank',
      accountNumber: '0987654321',
    },
  });

  const demoInstitutions: {
    id: string;
    name: string;
    email: string;
    suffix: string;
    balance: number;
    contact: string;
  }[] = [
    { id: 'inst_bluesky', name: 'BlueSky Microfinance', email: 'ops@bluesky.ng', suffix: 'bluesky_dev', balance: 18500, contact: 'Tunde Bakare' },
    { id: 'inst_cedar', name: 'Cedar Trust MFB', email: 'compliance@cedartrust.ng', suffix: 'cedar_dev', balance: 7200, contact: 'Ngozi Eze' },
    { id: 'inst_riverbank', name: 'Riverbank Finance', email: 'fraud@riverbank.ng', suffix: 'riverbank_dev', balance: 31000, contact: 'Chidi Okonkwo' },
    { id: 'inst_goldline', name: 'Goldline MFB', email: 'hello@goldline.ng', suffix: 'goldline_dev', balance: 5400, contact: 'Amaka Ibe' },
    { id: 'inst_northgate', name: 'Northgate Microfinance', email: 'ops@northgate.ng', suffix: 'northgate_dev', balance: 22300, contact: 'Ibrahim Musa' },
    { id: 'inst_palmcredit', name: 'Palm Credit Ltd', email: 'risk@palmcredit.ng', suffix: 'palm_dev', balance: 11200, contact: 'Yemi Adebayo' },
    { id: 'inst_summit', name: 'Summit Finance Co', email: 'compliance@summit.ng', suffix: 'summit_dev', balance: 8900, contact: 'Grace Udo' },
    { id: 'inst_harbor', name: 'Harbor MFB', email: 'ops@harbor.ng', suffix: 'harbor_dev', balance: 45600, contact: 'Kelvin Hart' },
    { id: 'inst_vertex', name: 'Vertex Payments', email: 'fraud@vertex.ng', suffix: 'vertex_dev', balance: 6700, contact: 'Sola Akinyemi' },
    { id: 'inst_meadow', name: 'Meadow Microfinance', email: 'hello@meadow.ng', suffix: 'meadow_dev', balance: 19800, contact: 'Blessing Okafor' },
    { id: 'inst_ironwood', name: 'Ironwood Finance', email: 'ops@ironwood.ng', suffix: 'ironwood_dev', balance: 14300, contact: 'David Okoro' },
    { id: 'inst_clearfund', name: 'ClearFund MFB', email: 'compliance@clearfund.ng', suffix: 'clearfund_dev', balance: 9100, contact: 'Fatima Bello' },
    { id: 'inst_stonebridge', name: 'Stonebridge MFB', email: 'risk@stonebridge.ng', suffix: 'stonebridge_dev', balance: 27500, contact: 'Peter Edem' },
    { id: 'inst_aurora', name: 'Aurora Finance', email: 'ops@aurora.ng', suffix: 'aurora_dev', balance: 6200, contact: 'Zainab Ali' },
  ];

  for (const demo of demoInstitutions) {
    const slug = demo.id.replace('inst_', '');
    await seedInstitution({
      id: demo.id,
      name: demo.name,
      email: demo.email,
      walletBalance: Math.max(MIN_CUSTOMER_WALLET_BALANCE, demo.balance),
      apiKeySuffix: `${slug}_key`,
      contactName: demo.contact,
      user: {
        id: `usr_${slug}_admin`,
        name: demo.contact,
        email: demo.email,
        password: 'password123',
        role: 'administrator',
      },
    });
  }

  const paynestVerifications = [
    { ref: 'VER-1001', type: 'bvn' as const, masked: maskBvnOrNin('12345678901'), result: 'match' as const, daysAgo: 1 },
    { ref: 'VER-1002', type: 'phone' as const, masked: '0803 ••• ••89', result: 'no_match' as const, daysAgo: 2 },
    { ref: 'VER-1003', type: 'account_number' as const, masked: '•••• 4521', result: 'match' as const, daysAgo: 3 },
    { ref: 'VER-1004', type: 'email' as const, masked: maskEmail('scam@example.com'), result: 'match' as const, daysAgo: 5 },
    { ref: 'VER-1005', type: 'nin' as const, masked: maskBvnOrNin('98765432109'), result: 'no_match' as const, daysAgo: 8 },
  ];

  for (const v of paynestVerifications) {
    const id = `ver_paynest_${v.ref}`;
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - v.daysAgo);
    await prisma.verification.upsert({
      where: { id },
      create: verificationToPrisma({
        id,
        institutionId: institution.id,
        reference: v.ref,
        identifierType: v.type,
        maskedIdentifier: v.masked,
        result: v.result,
        confidence: v.result === 'match' ? buildApiConfidence(2) : null,
        independentSourceCount: v.result === 'match' ? 2 : 0,
        amountCharged: 50,
        createdAt: createdAt.toISOString(),
      }),
      update: verificationToPrisma({
        id,
        institutionId: institution.id,
        reference: v.ref,
        identifierType: v.type,
        maskedIdentifier: v.masked,
        result: v.result,
        confidence: v.result === 'match' ? buildApiConfidence(2) : null,
        independentSourceCount: v.result === 'match' ? 2 : 0,
        amountCharged: 50,
        createdAt: createdAt.toISOString(),
      }),
    });
  }

  const paynestReports = [
    { category: 'scam' as const, signal: '90123456789', daysAgo: 4 },
    { category: 'mule_account' as const, signal: '8087654321', daysAgo: 6 },
  ];

  for (const [i, r] of paynestReports.entries()) {
    const id = `rpt_paynest_seed_${i + 1}`;
    const ref = `RPT-PAYNEST-SEED-${i + 1}`;
    const submittedAt = new Date();
    submittedAt.setDate(submittedAt.getDate() - r.daysAgo);
    const signalKey = buildSignalKey('phone', r.signal);
    await prisma.report.upsert({
      where: { id },
      create: reportToPrisma({
        id,
        institutionId: institution.id,
        reference: ref,
        identifierType: 'phone',
        maskedIdentifier: `080${r.signal.slice(0, 3)} ••• ${r.signal.slice(-2)}`,
        category: r.category,
        description: `Seeded ${r.category} report for admin demo.`,
        incidentDate: '2026-06-15',
        independentSourceCount: 1,
        confidence: buildApiConfidence(1),
        earningsGenerated: 25,
        submittedAt: submittedAt.toISOString(),
        signalKey,
      }),
      update: reportToPrisma({
        id,
        institutionId: institution.id,
        reference: ref,
        identifierType: 'phone',
        maskedIdentifier: `080${r.signal.slice(0, 3)} ••• ${r.signal.slice(-2)}`,
        category: r.category,
        description: `Seeded ${r.category} report for admin demo.`,
        incidentDate: '2026-06-15',
        independentSourceCount: 1,
        confidence: buildApiConfidence(1),
        earningsGenerated: 25,
        submittedAt: submittedAt.toISOString(),
        signalKey,
      }),
    });
  }

  const walletSeed = [
    { type: 'funding' as const, amount: 15000, desc: 'Monnify wallet funding', daysAgo: 10 },
    { type: 'verification_charge' as const, amount: -50, desc: 'Verification VER-1001', daysAgo: 1 },
    { type: 'reward_credit' as const, amount: 25, desc: 'Report reward', daysAgo: 4 },
  ];

  for (const [i, t] of walletSeed.entries()) {
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - t.daysAgo);
    await prisma.walletTransaction.upsert({
      where: { id: `txn_paynest_seed_${i + 1}` },
      create: {
        id: `txn_paynest_seed_${i + 1}`,
        institutionId: institution.id,
        type: t.type,
        amount: t.amount,
        balanceAfter: institution.walletBalance,
        description: t.desc,
        reference: generateReference('TXN'),
        createdAt,
      },
      update: {
        type: t.type,
        amount: t.amount,
        description: t.desc,
        createdAt,
      },
    });
  }

  await prisma.earningRecord.upsert({
    where: { id: 'ern_paynest_seed_1' },
    create: {
      id: 'ern_paynest_seed_1',
      institutionId: institution.id,
      maskedIdentifier: '0808 ••• ••21',
      reportReference: 'RPT-SEED',
      amount: 2500,
      status: 'available',
      createdAt: new Date(),
    },
    update: {
      amount: 2500,
      status: 'available',
    },
  });

  await prisma.earningsWithdrawalRequest.upsert({
    where: { id: 'ewd_paynest_pending' },
    create: {
      id: 'ewd_paynest_pending',
      institutionId: institution.id,
      reference: 'EWD-PAYNEST-PENDING',
      amount: 2500,
      status: 'pending_approval',
      createdAt: new Date(),
    },
    update: {
      status: 'pending_approval',
      amount: 2500,
    },
  });

  await prisma.earningsWithdrawalRequest.upsert({
    where: { id: 'ewd_suretrust_queued' },
    create: {
      id: 'ewd_suretrust_queued',
      institutionId: 'inst_suretrust',
      reference: 'EWD-SURETRUST-QUEUED',
      amount: 1200,
      status: 'queued',
      processAfterAt: new Date(Date.now() + 3600_000),
      reviewedAt: new Date(),
      reviewedByEmail: 'admin@userain.co',
      createdAt: new Date(Date.now() - 86400_000),
    },
    update: {
      status: 'queued',
      amount: 1200,
    },
  });

  const accessRequestsSeed = [
    {
      id: 'ar_seed_pending_liongate',
      companyName: 'Horizon Capital MFB',
      email: 'compliance@horizoncap.ng',
      cacNumber: 'RC445566',
      status: 'pending',
      createdAt: new Date(Date.now() - 2 * 86400_000),
    },
    {
      id: 'ar_seed_pending_nova',
      companyName: 'Nova Payments Ltd',
      email: 'hello@novapayments.ng',
      cacNumber: 'RC778899',
      status: 'pending',
      createdAt: new Date(Date.now() - 5 * 86400_000),
    },
    {
      id: 'ar_seed_rejected',
      companyName: 'QuickCash Ventures',
      email: 'apply@quickcash.ng',
      cacNumber: 'RC112233',
      status: 'rejected',
      rejectionReason: 'Incomplete CAC documentation.',
      reviewedAt: new Date(Date.now() - 14 * 86400_000),
      reviewedByEmail: 'admin@userain.co',
      createdAt: new Date(Date.now() - 20 * 86400_000),
    },
    {
      id: 'ar_seed_approved_paynest',
      companyName: 'PayNest MFB',
      email: 'compliance@paynest.ng',
      cacNumber: 'RC556677',
      status: 'approved',
      institutionId: institution.id,
      reviewedAt: new Date('2026-01-10'),
      reviewedByEmail: 'admin@userain.co',
      createdAt: new Date('2026-01-05'),
    },
  ];

  const requestPasswordHash = await bcrypt.hash('Password@123', 10);

  for (const ar of accessRequestsSeed) {
    await prisma.accessRequest.upsert({
      where: { id: ar.id },
      create: {
        id: ar.id,
        companyName: ar.companyName,
        email: ar.email,
        cacNumber: ar.cacNumber,
        passwordHash: requestPasswordHash,
        status: ar.status,
        createdAt: ar.createdAt,
        reviewedAt: ar.reviewedAt ?? null,
        reviewedByEmail: ar.reviewedByEmail ?? null,
        rejectionReason: ar.rejectionReason ?? null,
        institutionId: ar.institutionId ?? null,
      },
      update: {
        companyName: ar.companyName,
        status: ar.status,
        reviewedAt: ar.reviewedAt ?? null,
        reviewedByEmail: ar.reviewedByEmail ?? null,
        rejectionReason: ar.rejectionReason ?? null,
        institutionId: ar.institutionId ?? null,
      },
    });
  }

  const configDefaults = [
    { key: 'wallet_funding_fee', value: { amount: 100 } },
    { key: 'verification_cost', value: { amount: 50 } },
    { key: 'reward_amount', value: { amount: 25 } },
    { key: 'low_balance_threshold', value: { amount: LOW_BALANCE_THRESHOLD } },
  ];

  for (const row of configDefaults) {
    await prisma.appConfig.upsert({
      where: { key: row.key },
      create: row,
      update: row,
    });
  }

  const toppedUp = await prisma.institution.updateMany({
    where: {
      id: { not: RAIN_PLATFORM_INSTITUTION_ID },
      walletBalance: { lt: MIN_CUSTOMER_WALLET_BALANCE },
    },
    data: { walletBalance: MIN_CUSTOMER_WALLET_BALANCE },
  });

  console.log(
    `Seed complete: platform admin, PayNest + peer + Liongate + SureTrust, access requests, verifications, withdrawals.${toppedUp.count > 0 ? ` Topped up ${toppedUp.count} wallet(s) to ₦${MIN_CUSTOMER_WALLET_BALANCE.toLocaleString()}.` : ''}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

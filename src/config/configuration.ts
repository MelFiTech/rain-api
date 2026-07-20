export default () => ({
  port: parseInt(process.env.PORT ?? '9090', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  jwt: {
    secret: process.env.JWT_SECRET ?? 'rain-dev-jwt-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '24h',
  },
  payments: {
    defaultProvider: process.env.PAYMENT_PROVIDER ?? 'monnify',
    walletFundingFee: parseInt(
      process.env.MONNIFY_WALLET_FUNDING_FEE ?? '100',
      10,
    ),
    monnify: {
      apiKey: process.env.MONNIFY_API_KEY ?? '',
      secretKey: process.env.MONNIFY_SECRET_KEY ?? '',
      contractCode: process.env.MONNIFY_CONTRACT_CODE ?? '',
      baseUrl: process.env.MONNIFY_BASE_URL ?? 'https://sandbox.monnify.com',
      walletRedirectUrl:
        process.env.MONNIFY_WALLET_REDIRECT_URL ?? 'http://localhost:3000/wallet',
      walletAccountNumber: process.env.MONNIFY_WALLET_ACCOUNT_NUMBER ?? '',
      webhookEnforceIp:
        (process.env.MONNIFY_WEBHOOK_ENFORCE_IP ?? 'false').toLowerCase() ===
        'true',
      webhookAllowedIps: (
        process.env.MONNIFY_WEBHOOK_ALLOWED_IPS ?? '35.242.133.146'
      )
        .split(',')
        .map((ip) => ip.trim())
        .filter(Boolean),
    },
  },
  webhookDelivery: {
    defaultProvider: process.env.WEBHOOK_DELIVERY_PROVIDER ?? 'http',
  },
  email: {
    provider: process.env.EMAIL_PROVIDER ?? 'console',
    from: process.env.EMAIL_FROM ?? 'Rain <noreply@rain.ng>',
    resendApiKey: process.env.RESEND_API_KEY ?? '',
    opsAddress: process.env.EMAIL_OPS_ADDRESS ?? '',
  },
  platform: {
    webAppUrl: process.env.WEB_APP_URL ?? 'http://localhost:3000',
  },
  earnings: {
    bankWithdrawMinDelayMinutes: parseInt(
      process.env.EARNINGS_BANK_WITHDRAW_MIN_DELAY_MINUTES ?? '60',
      10,
    ),
    bankWithdrawMaxDelayMinutes: parseInt(
      process.env.EARNINGS_BANK_WITHDRAW_MAX_DELAY_MINUTES ?? '120',
      10,
    ),
    bankWithdrawWorkerIntervalMs: parseInt(
      process.env.EARNINGS_BANK_WITHDRAW_WORKER_INTERVAL_MS ?? '300000',
      10,
    ),
  },
});

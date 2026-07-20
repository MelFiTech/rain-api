/** NIP bank codes for Monnify account validation (subset). */
export const NIGERIAN_BANK_CODES: Record<string, string> = {
  'Access Bank': '044',
  'First Bank of Nigeria': '011',
  'Guaranty Trust Bank': '058',
  'United Bank for Africa': '033',
  'Zenith Bank': '057',
  'Stanbic IBTC Bank': '221',
  'Fidelity Bank': '070',
  'Union Bank': '032',
  'Wema Bank': '035',
  'Polaris Bank': '076',
  'Kuda Microfinance Bank': '50211',
  Opay: '999992',
  PalmPay: '999991',
  'Moniepoint MFB': '50515',
};

export function bankCodeForName(bankName: string): string | null {
  const trimmed = bankName.trim();
  if (NIGERIAN_BANK_CODES[trimmed]) return NIGERIAN_BANK_CODES[trimmed];
  const lower = trimmed.toLowerCase();
  for (const [name, code] of Object.entries(NIGERIAN_BANK_CODES)) {
    if (name.toLowerCase() === lower) return code;
  }
  return null;
}

export function bankNameForCode(bankCode: string): string | null {
  const code = bankCode.trim();
  for (const [name, mapped] of Object.entries(NIGERIAN_BANK_CODES)) {
    if (mapped === code) return name;
  }
  return null;
}

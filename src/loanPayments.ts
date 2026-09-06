/** SAC scheduled principal and interest on the actual balance, before final settlement cap. */
export function sacPayment(balance: number, principalQuota: number, monthlyRate: number): number {
  return balance > 0 ? principalQuota + balance * monthlyRate : 0;
}

/** Scheduled payments before extraordinary amortization. Rates are monthly fractions. */
export function originalSacPayment(principal: number, monthlyRate: number, months: number, month: number): number {
  if (principal <= 0 || months <= 0 || month < 1 || month > months) return 0;
  const amortization = principal / months;
  const originalBalance = Math.max(0, principal - (month - 1) * amortization);
  return sacPayment(originalBalance, amortization, monthlyRate);
}

export function fixedPricePayment(principal: number, monthlyRate: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  if (monthlyRate === 0) return principal / months;
  const factor = Math.pow(1 + monthlyRate, months);
  return principal * (monthlyRate * factor) / (factor - 1);
}

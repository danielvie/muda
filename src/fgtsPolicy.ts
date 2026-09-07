export const FGTS_DEPOSIT_RATE = 0.08;
export const FGTS_USE_INTERVAL_MONTHS = 24;

export type FgtsMode = "PRAZO" | "PRESTACAO";

export function fgtsDepositForMonth(
  monthlySalary: number,
  annualSalaryGrowth: number,
  month: number,
): number {
  if (monthlySalary <= 0 || month < 1) return 0;
  return monthlySalary
    * Math.pow(1 + annualSalaryGrowth, Math.floor((month - 1) / 12))
    * FGTS_DEPOSIT_RATE;
}

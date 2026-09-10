import { parseInvestmentRate } from "./amortizationComparison.ts";

export const INVESTMENT_RATE_KEY = "muda.financing.investmentRate.v1";
type RateStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type InvestmentRateSaveResult = { ok: true } | { ok: false; error: string };

/** Restore only this scenario's annual percentage. Never write during startup. */
export function readInvestmentRate(storage?: RateStorage): string {
  try {
    const data: unknown = JSON.parse((storage ?? globalThis.localStorage).getItem(INVESTMENT_RATE_KEY) ?? "null");
    if (!data || typeof data !== "object" || !("version" in data) || data.version !== 1 || !("annualRatePercent" in data)) return "";
    const rate = data.annualRatePercent;
    if (typeof rate !== "number" || parseInvestmentRate(String(rate)) === null) return "";
    return String(rate).replace(".", ",");
  } catch { return ""; }
}

/** User edits only: valid rates are remembered; clearing the field forgets them. */
export function saveInvestmentRate(value: string, storage?: RateStorage): InvestmentRateSaveResult {
  const rate = parseInvestmentRate(value);
  if (value.trim() && rate === null) return { ok: false, error: "Taxa inválida. A taxa salva não foi alterada." };
  try {
    const store = storage ?? globalThis.localStorage;
    if (!value.trim()) store.removeItem(INVESTMENT_RATE_KEY);
    else store.setItem(INVESTMENT_RATE_KEY, JSON.stringify({ version: 1, annualRatePercent: rate }));
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível guardar a taxa neste navegador. O valor atual vale apenas nesta sessão; a taxa salva anteriormente foi mantida." };
  }
}

import { defaultFinanceVsInvestFields, type FinanceVsInvestFields } from "./financeVsInvestProjection.ts";

export const FINANCE_VS_INVEST_FIELDS_KEY = "muda.financeVsInvest.fields.v1";
type FieldStorage = Pick<Storage, "getItem" | "setItem">;

export function readFinanceVsInvestFields(storage?: FieldStorage): FinanceVsInvestFields {
  const fields = { ...defaultFinanceVsInvestFields };
  try {
    const data: unknown = JSON.parse((storage ?? globalThis.localStorage).getItem(FINANCE_VS_INVEST_FIELDS_KEY) ?? "null");
    if (!data || typeof data !== "object" || Array.isArray(data)) return fields;
    for (const key of Object.keys(fields) as (keyof FinanceVsInvestFields)[]) {
      const value = (data as Record<string, unknown>)[key];
      if (key === "amortizationMethod") {
        if (value === "SAC" || value === "PRICE") fields[key] = value;
      } else if (typeof value === "string") fields[key] = value;
    }
  } catch { /* Keep defaults if storage is unavailable. */ }
  return fields;
}

export function saveFinanceVsInvestFields(fields: FinanceVsInvestFields, storage?: FieldStorage): void {
  try { (storage ?? globalThis.localStorage).setItem(FINANCE_VS_INVEST_FIELDS_KEY, JSON.stringify(fields)); }
  catch { /* The live workspace still owns the inputs, even if persistence fails. */ }
}

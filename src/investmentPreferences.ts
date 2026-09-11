import type { Bounds } from "./financingControls.ts";
import { DEFAULT_INVESTMENT_RANGES, INVESTMENT_FIELDS, validInvestmentValue, type InvestmentField, type InvestmentFields, type InvestmentRanges, type InvestmentPeriodUnit } from "./investmentControls.ts";

export const INVESTMENT_VALUES_KEY = "muda.investment.valuePreferences.v1";
export const INVESTMENT_RANGES_KEY = "muda.investment.rangePreferences.v1";
export const INVESTMENT_PERIOD_UNIT_KEY = "muda.investment.periodUnit.v1";
export type InvestmentValuePreferences = Partial<Record<InvestmentField, number>>;
export type InvestmentRangePreferences = Partial<InvestmentRanges>;
type Result<T> = { ok: true; preferences: T } | { ok: false; error: string };
type PreferenceStorage = Pick<Storage, "getItem" | "setItem">;

export function validateInvestmentRange(field: InvestmentField, bounds: Bounds): string | null {
  if (!validInvestmentValue(field, bounds.min) || !validInvestmentValue(field, bounds.max)) return "Informe limites válidos para este campo, na unidade indicada.";
  if (bounds.min >= bounds.max) return "O mínimo deve ser menor que o máximo.";
  if ([bounds.min, bounds.max].some(value => Math.abs(value * 100 - Math.round(value * 100)) > 1e-6)) return "Use no máximo duas casas decimais nos limites.";
  return null;
}
function documentData(raw: string | null, key: "values" | "ranges"): Record<string, unknown> {
  try {
    const doc = JSON.parse(raw ?? "null");
    return doc?.version === 1 && doc[key] && typeof doc[key] === "object" && !Array.isArray(doc[key]) ? doc[key] : {};
  } catch { return {}; }
}
function decodeValues(raw: string | null): InvestmentValuePreferences {
  const values = documentData(raw, "values");
  const result: InvestmentValuePreferences = {};
  for (const { key } of INVESTMENT_FIELDS) if (validInvestmentValue(key, values[key])) result[key] = values[key];
  return result;
}
function decodeRanges(raw: string | null): InvestmentRangePreferences {
  const ranges = documentData(raw, "ranges");
  const result: InvestmentRangePreferences = {};
  for (const { key } of INVESTMENT_FIELDS) {
    const range = ranges[key];
    if (!range || typeof range !== "object" || !("min" in range) || !("max" in range) || typeof range.min !== "number" || typeof range.max !== "number") continue;
    const bounds = { min: range.min, max: range.max };
    if (!validateInvestmentRange(key, bounds)) result[key] = bounds;
  }
  return result;
}
export function readInvestmentValues(storage?: PreferenceStorage): InvestmentValuePreferences {
  try { return decodeValues((storage ?? globalThis.localStorage).getItem(INVESTMENT_VALUES_KEY)); } catch { return {}; }
}
export function readInvestmentRanges(storage?: PreferenceStorage): InvestmentRangePreferences {
  try { return decodeRanges((storage ?? globalThis.localStorage).getItem(INVESTMENT_RANGES_KEY)); } catch { return {}; }
}
export function readInvestmentPeriodUnit(storage?: PreferenceStorage): InvestmentPeriodUnit {
  try {
    const doc = JSON.parse((storage ?? globalThis.localStorage).getItem(INVESTMENT_PERIOD_UNIT_KEY) ?? "null");
    if (doc?.version === 1 && doc.unit === "years") return "years";
  } catch {}
  return "months";
}
export function saveInvestmentPeriodUnit(unit: InvestmentPeriodUnit, storage?: PreferenceStorage): { ok: true } | { ok: false; error: string } {
  if (unit !== "months" && unit !== "years") return { ok: false, error: "Unidade de período inválida." };
  try {
    (storage ?? globalThis.localStorage).setItem(INVESTMENT_PERIOD_UNIT_KEY, JSON.stringify({ version: 1, unit }));
    return { ok: true };
  } catch { return { ok: false, error: "A unidade mudou, mas não foi possível lembrá-la neste navegador." }; }
}
/** Startup only: explicit defaults take precedence over the app's existing last-field memory. */
export function applyInvestmentDefaults<T extends InvestmentFields>(fields: T, preferences: InvestmentValuePreferences): T {
  const next = { ...fields };
  for (const { key } of INVESTMENT_FIELDS) if (validInvestmentValue(key, preferences[key])) next[key] = String(preferences[key]);
  return next;
}
export function resolveInvestmentRanges(preferences: InvestmentRangePreferences): InvestmentRanges {
  return Object.fromEntries(INVESTMENT_FIELDS.map(({ key }) => [key, { ...(preferences[key] ?? DEFAULT_INVESTMENT_RANGES[key]) }])) as InvestmentRanges;
}
export function saveInvestmentValue(field: InvestmentField, value: number | null, storage?: PreferenceStorage): Result<InvestmentValuePreferences> {
  if (!INVESTMENT_FIELDS.some(item => item.key === field) || (value !== null && !validInvestmentValue(field, value))) return { ok: false, error: "O valor atual não é válido. O padrão anterior foi mantido." };
  try {
    const store = storage ?? globalThis.localStorage;
    const preferences = decodeValues(store.getItem(INVESTMENT_VALUES_KEY));
    if (value === null) delete preferences[field]; else preferences[field] = value;
    store.setItem(INVESTMENT_VALUES_KEY, JSON.stringify({ version: 1, values: preferences }));
    return { ok: true, preferences };
  } catch { return { ok: false, error: "Não foi possível salvar neste navegador. O padrão anterior foi mantido." }; }
}
export function saveInvestmentRange(field: InvestmentField, bounds: Bounds | null, storage?: PreferenceStorage): Result<InvestmentRangePreferences> {
  if (!INVESTMENT_FIELDS.some(item => item.key === field)) return { ok: false, error: "Campo de investimento inválido." };
  const error = bounds && validateInvestmentRange(field, bounds);
  if (error) return { ok: false, error };
  try {
    const store = storage ?? globalThis.localStorage;
    const preferences = decodeRanges(store.getItem(INVESTMENT_RANGES_KEY));
    if (bounds === null) delete preferences[field]; else preferences[field] = { ...bounds };
    store.setItem(INVESTMENT_RANGES_KEY, JSON.stringify({ version: 1, ranges: preferences }));
    return { ok: true, preferences };
  } catch { return { ok: false, error: "Não foi possível salvar neste navegador. A faixa anterior foi mantida." }; }
}

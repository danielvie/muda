import type { FinancingState } from "./financingControls.ts";

export const FGTS_PREFERENCES_KEY = "muda.financing.fgtsPreferences.v1";
export type FgtsPreferences = Partial<Pick<FinancingState, "fgtsSalary" | "fgtsSalaryGrowth">>;
export type FgtsPreferenceResult = { ok: true; preferences: FgtsPreferences } | { ok: false; error: string };
type PreferenceStorage = Pick<Storage, "getItem" | "setItem">;
const fields = ["fgtsSalary", "fgtsSalaryGrowth"] as const;
const valid = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;

function decode(raw: string | null): FgtsPreferences {
  try {
    const data: unknown = JSON.parse(raw ?? "null");
    if (!data || typeof data !== "object" || !("version" in data) || data.version !== 1 || !("values" in data)) return {};
    const values = data.values;
    if (!values || typeof values !== "object" || Array.isArray(values)) return {};
    const result: FgtsPreferences = {};
    for (const field of fields) {
      const value = (values as Record<string, unknown>)[field];
      if (valid(value)) result[field] = value;
    }
    return result;
  } catch { return {}; }
}

export function readFgtsPreferences(storage?: PreferenceStorage): FgtsPreferences {
  try { return decode((storage ?? globalThis.localStorage).getItem(FGTS_PREFERENCES_KEY)); }
  catch { return {}; }
}

function persist(patch: FgtsPreferences | "clear-salary", storage?: PreferenceStorage): FgtsPreferenceResult {
  if (patch !== "clear-salary" && Object.entries(patch).some(([key, value]) => !fields.includes(key as typeof fields[number]) || !valid(value))) {
    return { ok: false, error: "Dados de FGTS inválidos. A memória anterior foi mantida." };
  }
  try {
    const store = storage ?? globalThis.localStorage;
    const next = decode(store.getItem(FGTS_PREFERENCES_KEY));
    if (patch === "clear-salary") delete next.fgtsSalary;
    else Object.assign(next, patch);
    store.setItem(FGTS_PREFERENCES_KEY, JSON.stringify({ version: 1, values: next }));
    return { ok: true, preferences: next };
  } catch {
    return { ok: false, error: "Não foi possível atualizar a memória do FGTS neste navegador. Os dados salvos anteriormente foram mantidos." };
  }
}

export function saveFgtsPreferences(patch: FgtsPreferences, storage?: PreferenceStorage): FgtsPreferenceResult {
  return persist(patch, storage);
}
export function clearSavedFgtsSalary(storage?: PreferenceStorage): FgtsPreferenceResult {
  return persist("clear-salary", storage);
}

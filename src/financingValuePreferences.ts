import { updateFinancing, type FinancingField, type FinancingState } from "./financingControls.ts";

export const VALUE_PREFERENCES_KEY = "muda.financing.valuePreferences.v1";
export const DEFAULT_FINANCING_STATE: Readonly<FinancingState> = Object.freeze({
  property: 800000, entry: 120000, financingRate: 10, termMonths: 420,
  fgtsSalary: 0, fgtsSalaryGrowth: 0, fgtsMode: "PRAZO", method: "SAC",
});
export type ValuePreferences = Partial<Pick<FinancingState, FinancingField>>;
export type ValuePreferenceResult = { ok: true; preferences: ValuePreferences } | { ok: false; error: string };
type PreferenceStorage = Pick<Storage, "getItem" | "setItem">;
const fields = ["property", "entry", "financingRate", "termMonths"] as const;

// Stored units match FinancingState: reais, annual percentage points and months.
function validValue(field: FinancingField, value: unknown): value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) return false;
  if (field === "termMonths") return Number.isInteger(value) && value >= 12 && value <= 480;
  return value >= 0 && value <= (field === "financingRate" ? 20 : Number.MAX_SAFE_INTEGER);
}
function decode(raw: string | null): ValuePreferences {
  try {
    const document: unknown = JSON.parse(raw ?? "null");
    if (!document || typeof document !== "object" || !("version" in document) || document.version !== 1 || !("values" in document)) return {};
    const values = document.values;
    if (!values || typeof values !== "object" || Array.isArray(values)) return {};
    const result: ValuePreferences = {};
    for (const field of fields) {
      const value = (values as Record<string, unknown>)[field];
      if (validValue(field, value)) result[field] = value;
    }
    return result;
  } catch { return {}; }
}
export function readValuePreferences(storage?: PreferenceStorage): ValuePreferences {
  try { return decode((storage ?? globalThis.localStorage).getItem(VALUE_PREFERENCES_KEY)); }
  catch { return {}; }
}

/** Startup only. Editing/loading a study never applies or writes these preferences. */
export function resolveValuePreferences(preferences: ValuePreferences): FinancingState {
  const patch: ValuePreferences = {};
  for (const field of fields) if (validValue(field, preferences[field])) patch[field] = preferences[field];
  // The normal entry policy caps entry to property. Keep the saved preference intact.
  return updateFinancing({ ...DEFAULT_FINANCING_STATE }, patch, false);
}

/** Merge the latest stored fields; never persist ranges, studies or the whole state. */
function persist(field: FinancingField, value: number | null, storage?: PreferenceStorage): ValuePreferenceResult {
  if (!fields.includes(field) || (value !== null && !validValue(field, value))) {
    return { ok: false, error: "O valor atual não é válido para este campo. O padrão anterior foi mantido." };
  }
  try {
    const store = storage ?? globalThis.localStorage;
    const next = decode(store.getItem(VALUE_PREFERENCES_KEY));
    if (value === null) delete next[field]; else next[field] = value;
    store.setItem(VALUE_PREFERENCES_KEY, JSON.stringify({ version: 1, values: next }));
    return { ok: true, preferences: next };
  } catch {
    return { ok: false, error: "Não foi possível salvar neste navegador. O padrão anterior foi mantido." };
  }
}
export function saveValuePreference(field: FinancingField, value: number, storage?: PreferenceStorage): ValuePreferenceResult {
  return persist(field, value, storage);
}
export function removeValuePreference(field: FinancingField, storage?: PreferenceStorage): ValuePreferenceResult {
  return persist(field, null, storage);
}

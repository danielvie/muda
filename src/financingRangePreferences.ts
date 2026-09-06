import { DEFAULT_CONTROL_RANGES, FINANCING_FIELDS, type ControlRanges } from "./financingGesture.ts";
import type { Bounds, FinancingField } from "./financingControls.ts";

export const RANGE_PREFERENCES_KEY = 'muda.financing.rangePreferences.v1';
export type RangePreferences = Partial<ControlRanges>;
export type PreferenceResult = { ok: true; preferences: RangePreferences } | { ok: false; error: string };
type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** Preferences are independent of the current simulation and its temporary zoom. */
export function validateRangePreference(field: FinancingField, bounds: Bounds): string | null {
  if (!Number.isFinite(bounds.min) || !Number.isFinite(bounds.max)) return 'Informe um mínimo e um máximo válidos.';
  const min = field === 'termMonths' ? 1 : 0;
  const max = field === 'termMonths' ? 40 : field === 'financingRate' ? 20 : Number.MAX_SAFE_INTEGER;
  if (bounds.min < min || bounds.max < min) return field === 'termMonths' ? 'O prazo mínimo é de 1 ano.' : 'Os limites não podem ser negativos.';
  if (bounds.min >= bounds.max) return 'O mínimo deve ser menor que o máximo.';
  if (bounds.max > max) return field === 'termMonths' ? 'O prazo máximo é de 40 anos.' : field === 'financingRate' ? 'Os juros devem ficar entre 0% e 20% a.a.' : 'O valor informado é muito alto.';
  if (field === 'termMonths' && (!Number.isInteger(bounds.min) || !Number.isInteger(bounds.max))) return 'Informe o prazo em anos inteiros.';
  if ([bounds.min, bounds.max].some(value => Math.abs(value * 100 - Math.round(value * 100)) > 1e-6)) return 'Use no máximo duas casas decimais nos limites.';
  return null;
}
function decodePreferences(raw: string | null): RangePreferences {
  try {
    const document: unknown = JSON.parse(raw ?? 'null');
    if (!document || typeof document !== 'object' || !('version' in document) || document.version !== 1 || !('ranges' in document)) return {};
    const ranges = document.ranges;
    if (!ranges || typeof ranges !== 'object' || Array.isArray(ranges)) return {};
    const result: RangePreferences = {};
    for (const { key } of FINANCING_FIELDS) {
      const value = (ranges as Record<string, unknown>)[key];
      if (!value || typeof value !== 'object' || !('min' in value) || !('max' in value) || typeof value.min !== 'number' || typeof value.max !== 'number') continue;
      const bounds = { min: value.min, max: value.max };
      if (!validateRangePreference(key, bounds)) result[key] = bounds;
    }
    return result;
  } catch { return {}; }
}
export function readRangePreferences(storage?: PreferenceStorage): RangePreferences {
  try { return decodePreferences((storage ?? globalThis.localStorage).getItem(RANGE_PREFERENCES_KEY)); }
  catch { return {}; }
}
export function resolveRangePreferences(preferences: RangePreferences): ControlRanges {
  return Object.fromEntries(FINANCING_FIELDS.map(({ key }) => [key, { ...(preferences[key] ?? DEFAULT_CONTROL_RANGES[key]) }])) as ControlRanges;
}
/** Called only by explicit save/restore commands. Never from rendering or an effect. */
function persistPreference(field: FinancingField, bounds: Bounds | null, storage?: PreferenceStorage): PreferenceResult {
  try {
    const store = storage ?? globalThis.localStorage;
    // Merge fields saved since this tab opened instead of writing a stale state snapshot.
    const next = decodePreferences(store.getItem(RANGE_PREFERENCES_KEY));
    if (bounds) next[field] = { ...bounds }; else delete next[field];
    store.setItem(RANGE_PREFERENCES_KEY, JSON.stringify({ version: 1, ranges: next }));
    return { ok: true, preferences: next };
  } catch { return { ok: false, error: 'Não foi possível salvar neste navegador. A preferência anterior foi mantida.' }; }
}
export function saveRangePreference(field: FinancingField, bounds: Bounds, storage?: PreferenceStorage): PreferenceResult {
  const error = validateRangePreference(field, bounds);
  if (error) return { ok: false, error };
  return persistPreference(field, bounds, storage);
}
export function restoreRangePreference(field: FinancingField, storage?: PreferenceStorage): PreferenceResult {
  return persistPreference(field, null, storage);
}

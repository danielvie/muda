import type { PreferenceActionResult } from "./preferenceResult.ts";

export type Environment = "financing" | "investment" | "comparison";
export const ENVIRONMENT_PREFERENCE_KEY = "muda.workspace.environment.v1";
type PreferenceStorage = Pick<Storage, "getItem" | "setItem">;
function isEnvironment(value: unknown): value is Environment {
  return value === "financing" || value === "investment" || value === "comparison";
}
export function readEnvironmentPreference(storage?: PreferenceStorage): Environment {
  try {
    const doc = JSON.parse((storage ?? globalThis.localStorage).getItem(ENVIRONMENT_PREFERENCE_KEY) ?? "null");
    if (doc?.version === 1 && isEnvironment(doc.environment)) return doc.environment;
  } catch {}
  return "financing";
}
export function saveEnvironmentPreference(environment: Environment, storage?: PreferenceStorage): PreferenceActionResult {
  if (!isEnvironment(environment)) return { ok: false, error: "Aba inválida." };
  try {
    (storage ?? globalThis.localStorage).setItem(ENVIRONMENT_PREFERENCE_KEY, JSON.stringify({ version: 1, environment }));
    return { ok: true };
  } catch { return { ok: false, error: "A aba foi aberta, mas não foi possível lembrá-la neste navegador." }; }
}

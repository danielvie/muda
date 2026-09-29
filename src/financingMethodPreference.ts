import type { FinancingState } from "./financingControls.ts";

export const FINANCING_METHOD_KEY = "muda.financing.method.v1";
type Method = FinancingState["method"];
type MethodStorage = Pick<Storage, "getItem" | "setItem">;

export function readFinancingMethod(storage?: MethodStorage): Method {
  try {
    const data: unknown = JSON.parse((storage ?? globalThis.localStorage).getItem(FINANCING_METHOD_KEY) ?? "null");
    if (data && typeof data === "object" && "version" in data && data.version === 1 && "method" in data && (data.method === "SAC" || data.method === "PRICE")) return data.method;
  } catch { /* Missing or unavailable storage leaves the original default. */ }
  return "SAC";
}

export function saveFinancingMethod(method: Method, storage?: MethodStorage): boolean {
  if (method !== "SAC" && method !== "PRICE") return false;
  try {
    (storage ?? globalThis.localStorage).setItem(FINANCING_METHOD_KEY, JSON.stringify({ version: 1, method }));
    return true;
  } catch { return false; }
}

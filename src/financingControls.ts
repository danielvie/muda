import type { FgtsMode } from "./fgtsSchedule.ts";

export type FinancingState = {
  property: number;
  entry: number;
  financingRate: number;
  termMonths: number;
  fgtsSalary: number;
  fgtsSalaryGrowth: number;
  fgtsMode: FgtsMode;
  method: "SAC" | "PRICE";
};
export type Bounds = { min: number; max: number };
export type ZoomAnchor = "min" | "value" | "max";
export type FinancingField = "property" | "entry" | "financingRate" | "termMonths";
export const MONEY_TICK = 1000;
export const MIN_RANGE_WIDTH = 20000;
const MAX = Number.MAX_SAFE_INTEGER;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
export const minimumEntry = (property: number) => Math.ceil(property * 0.2);

export function formatFinancingNumber(value: number, monetary: boolean): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: monetary ? 2 : 0, maximumFractionDigits: 2 });
}

/** Accept Brazilian grouping/decimals and ungrouped decimal-dot values pasted from older fields. */
export function parseFinancingNumber(raw: string): number {
  const text = raw.trim().replace(/^R\$\s*/, "").replace(/\s/g, "");
  if (/^[+-]?\d{1,3}(\.\d{3})+(,\d+)?$/.test(text)) return Number(text.replace(/\./g, "").replace(",", "."));
  if (/^[+-]?(\d+([.,]\d*)?|[.,]\d+)$/.test(text)) return Number(text.replace(",", "."));
  return NaN;
}

/** Snap to a zero-based grid, never to the possibly fractional minimum of a zoom range. */
export function snapFinancingValue(value: number, tick: number, min: number, max: number): number {
  const lower = Math.ceil(min / tick - 1e-9) * tick;
  const upper = Math.floor(max / tick + 1e-9) * tick;
  if (lower > upper) return clamp(value, min, max); // Preserve constraints when no full tick fits.
  return clamp(Number(clamp(Math.round(value / tick) * tick, lower, upper).toFixed(6)), min, max);
}

/** Apply the entry policy to every mutation, including restored studies. */
export function updateFinancing(state: FinancingState, patch: Partial<FinancingState>, automaticEntry: boolean): FinancingState {
  const next = { ...state };
  for (const key of ["property", "entry", "financingRate", "termMonths", "fgtsSalary", "fgtsSalaryGrowth"] as const) {
    const value = patch[key];
    if (typeof value === "number" && Number.isFinite(value)) next[key] = value;
  }
  if (patch.method === "SAC" || patch.method === "PRICE") next.method = patch.method;
  next.fgtsMode = state.fgtsMode === "PRESTACAO" ? "PRESTACAO" : "PRAZO";
  if (patch.fgtsMode === "PRAZO" || patch.fgtsMode === "PRESTACAO") next.fgtsMode = patch.fgtsMode;
  next.property = clamp(next.property, 0, MAX);
  next.entry = clamp(next.entry, 0, MAX);
  next.financingRate = clamp(next.financingRate, 0, 20);
  next.termMonths = clamp(Math.round(next.termMonths), 12, 480);
  next.fgtsSalary = Math.max(0, next.fgtsSalary);
  next.fgtsSalaryGrowth = Math.max(0, next.fgtsSalaryGrowth);
  if (automaticEntry) next.entry = Math.max(minimumEntry(next.property), next.entry);
  // Without the automatic policy, editing property or entry cannot overfund the property.
  else if (patch.property !== undefined || patch.entry !== undefined) next.entry = Math.min(next.property, next.entry);
  return next;
}

/** Ranges never exclude the current value or change the simulation. */
export function normalizeBounds(bounds: Bounds, value: number): Bounds {
  let min = clamp(Number.isFinite(bounds.min) ? bounds.min : 0, 0, value);
  let max = clamp(Number.isFinite(bounds.max) ? bounds.max : MAX, value, MAX);
  if (max - min < MIN_RANGE_WIDTH) {
    max = Math.min(MAX, min + MIN_RANGE_WIDTH);
    min = Math.max(0, max - MIN_RANGE_WIDTH);
  }
  min = Math.floor(min / MONEY_TICK) * MONEY_TICK;
  max = Math.min(MAX, Math.ceil(max / MONEY_TICK) * MONEY_TICK);
  return { min, max };
}
export function zoomBounds(bounds: Bounds, value: number, width: number, anchor: ZoomAnchor): Bounds {
  const size = clamp(Number.isFinite(width) ? width : MAX, MIN_RANGE_WIDTH, MAX);
  if (anchor === "min") return normalizeBounds({ min: bounds.min, max: bounds.min + size }, value);
  if (anchor === "max") return normalizeBounds({ min: Math.max(0, bounds.max - size), max: bounds.max }, value);
  const min = Math.max(0, value - size / 2);
  return normalizeBounds({ min, max: min + size }, value);
}
export function cropBounds(bounds: Bounds, value: number): Bounds {
  return zoomBounds(bounds, value, Math.max(100000, value) * 0.2, "value");
}
export function expandAtEdge(bounds: Bounds, value: number): Bounds {
  const width = Math.max(MIN_RANGE_WIDTH, bounds.max - bounds.min);
  if (value >= bounds.max - width * 0.01) return normalizeBounds({ min: bounds.min, max: bounds.max + Math.max(width, value) }, value);
  if (value <= bounds.min + width * 0.01 && bounds.min > 0) return normalizeBounds({ min: Math.max(0, bounds.min - width), max: bounds.max }, value);
  return bounds;
}
export function zoomScale(bounds: Bounds, value: number) {
  const min = Math.max(MIN_RANGE_WIDTH, Math.max(100000, value) * 0.02);
  // Extend the zoom scale if a manually entered value/range exceeds its usual span.
  const max = Math.min(MAX, Math.max(min * 1000, bounds.max - bounds.min));
  return { min, max };
}
export function widthToZoom(width: number, scale: Bounds): number {
  if (scale.max <= scale.min) return 0;
  return clamp(Math.log(Math.max(scale.min, width) / scale.min) / Math.log(scale.max / scale.min) * 100, 0, 100);
}
export function zoomToWidth(position: number, scale: Bounds): number {
  return scale.min * Math.pow(scale.max / scale.min, clamp(position, 0, 100) / 100);
}

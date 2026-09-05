import { MONEY_TICK, minimumEntry, snapFinancingValue, type Bounds, type FinancingField, type FinancingState } from "./financingControls.ts";

export const FINANCING_FIELDS = [
  { key: "property", label: "Valor do imóvel", short: "Imóvel", unit: "R$", step: MONEY_TICK, monetary: true },
  { key: "entry", label: "Entrada", short: "Entrada", unit: "R$", step: MONEY_TICK, monetary: true },
  { key: "financingRate", label: "Juros anuais", short: "Juros", unit: "% a.a.", step: 0.1, monetary: false },
  { key: "termMonths", label: "Prazo", short: "Prazo", unit: "anos", step: 1, monetary: false },
] as const;
export type ControlRanges = Record<FinancingField, Bounds>;
export const DEFAULT_CONTROL_RANGES: ControlRanges = {
  property: { min: 0, max: 2000000 }, entry: { min: 0, max: 800000 },
  financingRate: { min: 0, max: 20 }, termMonths: { min: 1, max: 40 },
};
export type ControlSpec = { value: number; min: number; max: number; step: number; monetary: boolean };
const MAX = Number.MAX_SAFE_INTEGER;
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const clean = (n: number) => Number(n.toFixed(8));
export function controlSpec(field: FinancingField, state: FinancingState, automatic: boolean): ControlSpec {
  const spec = FINANCING_FIELDS.find(item => item.key === field)!;
  return {
    value: field === "termMonths" ? state.termMonths / 12 : state[field],
    min: field === "entry" && automatic ? minimumEntry(state.property) : field === "termMonths" ? 1 : 0,
    max: field === "entry" ? Math.max(state.property, state.entry) : field === "financingRate" ? 20 : field === "termMonths" ? 40 : MAX,
    step: spec.step, monetary: spec.monetary,
  };
}
export function normalizeControlRange(bounds: Bounds, spec: ControlSpec): Bounds {
  let min = clamp(Number.isFinite(bounds.min) ? bounds.min : spec.min, spec.min, spec.value);
  let max = clamp(Number.isFinite(bounds.max) ? bounds.max : spec.max, spec.value, spec.max);
  const minimumWidth = Math.min(spec.max - spec.min, spec.step * (spec.monetary ? 20 : 4));
  if (max - min < minimumWidth) {
    max = Math.min(spec.max, min + minimumWidth);
    min = Math.max(spec.min, max - minimumWidth);
  }
  // Decimal rates such as 9.2 / 0.1 can land just below an integer in floating point.
  // Tolerance prevents repeated normalization from growing the range by one tick each render.
  return {
    min: Math.max(spec.min, Math.min(spec.value, clean(Math.floor(min / spec.step + 1e-9) * spec.step))),
    max: Math.min(spec.max, Math.max(spec.value, clean(Math.ceil(max / spec.step - 1e-9) * spec.step))),
  };
}
export function normalizeControlRanges(ranges: ControlRanges, state: FinancingState, automatic: boolean): ControlRanges {
  return Object.fromEntries(FINANCING_FIELDS.map(({ key }) => [key, normalizeControlRange(ranges[key], controlSpec(key, state, automatic))])) as ControlRanges;
}
export function rangeAroundValue(width: number, spec: ControlSpec): Bounds {
  const size = clamp(Number.isFinite(width) ? width : spec.max - spec.min, 0, spec.max - spec.min);
  const min = clamp(spec.value - size / 2, spec.min, Math.max(spec.min, spec.max - size));
  return normalizeControlRange({ min, max: min + size }, spec);
}
export function cropControlRange(spec: ControlSpec): Bounds {
  return rangeAroundValue(Math.max(spec.monetary ? 100000 : spec.step * 5, spec.value) * 0.2, spec);
}
export type FinancingGesture = {
  originX: number; originY: number; x: number; y: number;
  rawValue: number; value: number; band: number; scale: number;
  startWidth: number; basePerPixel: number; spec: ControlSpec;
};
export function startFinancingGesture(x: number, y: number, spec: ControlSpec, bounds: Bounds): FinancingGesture {
  const normalized = normalizeControlRange(bounds, spec);
  const width = normalized.max - normalized.min;
  return { originX: x, originY: y, x, y, rawValue: spec.value, value: spec.value, band: 0, scale: 1, startWidth: width, basePerPixel: Math.max(spec.step, width / 200) / 8, spec };
}
/** Integrate horizontal segments. Vertical motion only changes the gain of subsequent segments. */
export function moveFinancingGesture(previous: FinancingGesture, x: number, y: number): FinancingGesture {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return previous;
  const up = previous.originY - y;
  let band = previous.band;
  // A band boundary is 24px from its center; require 8px extra travel to prevent jitter.
  while (band < 2 && up > (band + 0.5) * 48 + 8) band += 1;
  while (band > -2 && up < (band - 0.5) * 48 - 8) band -= 1;
  const scale = Math.pow(2, band);
  const dx = x - previous.x;
  const rawValue = clamp(previous.rawValue + dx * previous.basePerPixel * scale, previous.spec.min, previous.spec.max);
  const value = dx === 0 ? previous.value : snapFinancingValue(rawValue, previous.spec.step, previous.spec.min, previous.spec.max);
  return { ...previous, x, y, rawValue, value, band, scale };
}
export function gestureBounds(gesture: FinancingGesture): Bounds {
  return rangeAroundValue(gesture.startWidth * gesture.scale, { ...gesture.spec, value: gesture.value });
}

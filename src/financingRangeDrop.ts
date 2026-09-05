import { normalizeControlRange, rangeAroundValue, sliderControlValue, type ControlSpec } from "./financingGesture.ts";
import type { Bounds } from "./financingControls.ts";

export type RangeDropIntent = 'crop' | 'reset-min' | 'expand-max';
export type RangeDropProposal = { intent: RangeDropIntent; bounds: Bounds; point: number | null; changed: boolean; limited: boolean };
export type RangeDropTrack = { left: number; right: number; y: number };

/** Only range mutations: the current simulation value remains inside every proposal. */
export function proposeRangeDrop(intent: RangeDropIntent, bounds: Bounds, spec: ControlSpec, point = spec.value): RangeDropProposal {
  const current = normalizeControlRange(bounds, spec);
  let next: Bounds;
  let limited = false;
  let target: number | null = null;
  if (intent === 'reset-min') {
    next = normalizeControlRange({ min: spec.min, max: current.max }, spec);
    limited = spec.min > 0;
  } else if (intent === 'expand-max') {
    const maximum = Math.min(spec.max, current.max * 2);
    next = normalizeControlRange({ min: current.min, max: maximum }, spec);
    limited = next.max < current.max * 2;
  } else {
    target = sliderControlValue(point, current, spec);
    const cropSpec = { ...spec, min: current.min, max: current.max };
    const window = rangeAroundValue((current.max - current.min) / 4, { ...cropSpec, value: target });
    next = normalizeControlRange(window, cropSpec);
  }
  return { intent, bounds: next, point: target, changed: next.min !== current.min || next.max !== current.max, limited };
}

/** The side gutters are separate drop targets; arbitrary vertical releases cancel. */
export function proposalAtPoint(x: number, y: number, track: RangeDropTrack, bounds: Bounds, spec: ControlSpec): RangeDropProposal | null {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (x < track.left - 20) return proposeRangeDrop('reset-min', bounds, spec);
  if (x > track.right + 20) return proposeRangeDrop('expand-max', bounds, spec);
  if (Math.abs(y - track.y) > 38) return null;
  const fraction = Math.max(0, Math.min(1, (x - track.left) / Math.max(1, track.right - track.left)));
  return proposeRangeDrop('crop', bounds, spec, bounds.min + fraction * (bounds.max - bounds.min));
}

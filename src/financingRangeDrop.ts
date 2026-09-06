import { normalizeControlRange, sliderControlValue, type ControlSpec } from "./financingGesture.ts";
import type { Bounds } from "./financingControls.ts";

export const FOCUS_CROP_RADIUS_PX = 28;
export const FOCUS_CROP_HALF_WIDTH = 100000;
export type RangeDropIntent = 'crop' | 'crop-center' | 'reset-min' | 'expand-max';
export type RangeDropProposal = { intent: RangeDropIntent; bounds: Bounds; point: number | null; cropEdge: 'min' | 'max' | null; changed: boolean; limited: boolean };
export type RangeDropTrack = { left: number; right: number; y: number };

/** Only range mutations: the current simulation value remains inside every proposal. */
export function proposeRangeDrop(intent: RangeDropIntent, bounds: Bounds, spec: ControlSpec, point = spec.value): RangeDropProposal {
  const current = normalizeControlRange(bounds, spec);
  if (intent === 'crop-center' && !spec.monetary) intent = 'crop';
  let next: Bounds;
  let limited = false;
  let target: number | null = null;
  let cropEdge: 'min' | 'max' | null = null;
  if (intent === 'crop-center') {
    target = spec.value;
    const min = spec.value - FOCUS_CROP_HALF_WIDTH;
    const max = spec.value + FOCUS_CROP_HALF_WIDTH;
    next = normalizeControlRange({ min, max }, spec);
    limited = min < spec.min || max > spec.max;
  } else if (intent === 'reset-min') {
    next = normalizeControlRange({ min: spec.min, max: current.max }, spec);
    limited = spec.min > 0;
  } else if (intent === 'expand-max') {
    const maximum = Math.min(spec.max, current.max * 2);
    next = normalizeControlRange({ min: current.min, max: maximum }, spec);
    limited = next.max < current.max * 2;
  } else {
    target = sliderControlValue(point, current, spec);
    const cropSpec = { ...spec, min: current.min, max: current.max };
    // The current value separates the lower and upper side. At equality, crop the upper side.
    cropEdge = target >= spec.value ? 'max' : 'min';
    next = normalizeControlRange(cropEdge === 'max' ? { min: current.min, max: target } : { min: target, max: current.max }, cropSpec);
    limited = Math.abs(next[cropEdge] - target) > spec.step * 1e-6;
  }
  return { intent, bounds: next, point: target, cropEdge, changed: next.min !== current.min || next.max !== current.max, limited };
}

/** The side gutters are separate drop targets; arbitrary vertical releases cancel. */
export function proposalAtPoint(x: number, y: number, track: RangeDropTrack, bounds: Bounds, spec: ControlSpec): RangeDropProposal | null {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const width = bounds.max - bounds.min;
  const fractionOfValue = width > 0 ? Math.max(0, Math.min(1, (spec.value - bounds.min) / width)) : 0;
  const thumbX = track.left + fractionOfValue * (track.right - track.left);
  if (spec.monetary && Math.hypot(x - thumbX, y - track.y) <= FOCUS_CROP_RADIUS_PX) return proposeRangeDrop('crop-center', bounds, spec);
  if (x < track.left - 20) return proposeRangeDrop('reset-min', bounds, spec);
  if (x > track.right + 20) return proposeRangeDrop('expand-max', bounds, spec);
  if (Math.abs(y - track.y) > 38) return null;
  const fraction = Math.max(0, Math.min(1, (x - track.left) / Math.max(1, track.right - track.left)));
  return proposeRangeDrop('crop', bounds, spec, bounds.min + fraction * (bounds.max - bounds.min));
}

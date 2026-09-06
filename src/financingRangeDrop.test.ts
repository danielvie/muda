import test from "node:test";
import assert from "node:assert/strict";
import { controlSpec, type ControlSpec } from "./financingGesture.ts";
import { proposeRangeDrop, proposalAtPoint, FOCUS_CROP_RADIUS_PX } from "./financingRangeDrop.ts";
import type { FinancingState } from "./financingControls.ts";
const state: FinancingState = { property: 800000, entry: 120000, financingRate: 10, termMonths: 420, fgtsSalary: 0, fgtsSalaryGrowth: 0, fgtsMode: "PRAZO", method: "SAC" };
const property = controlSpec('property', state, false);

test('left drop restores zero without changing the maximum', () => {
  const result = proposeRangeDrop('reset-min', { min: 650000, max: 1150000 }, property);
  assert.deepEqual(result.bounds, { min: 0, max: 1150000 });
  assert.equal(result.changed, true);
  assert.equal(result.limited, false);
});
test('right drop doubles the maximum, not the width, preserving the minimum', () => {
  const result = proposeRangeDrop('expand-max', { min: 650000, max: 1150000 }, property);
  assert.deepEqual(result.bounds, { min: 650000, max: 2300000 });
  assert.equal(result.limited, false);
});
test('repeated previews use the same starting bounds and never compound', () => {
  const bounds = { min: 650000, max: 1150000 };
  for (let i = 0; i < 20; i++) assert.equal(proposeRangeDrop('expand-max', bounds, property).bounds.max, 2300000);
  assert.deepEqual(bounds, { min: 650000, max: 1150000 });
  assert.equal(property.value, 800000);
});
test('crop above the current value preserves the lower limit', () => {
  const result = proposeRangeDrop('crop', { min: 0, max: 2000000 }, property, 1000000);
  assert.deepEqual(result.bounds, { min: 0, max: 1000000 });
  assert.equal(result.cropEdge, 'max');
  assert.equal(result.point, 1000000);
  assert.equal(property.value, 800000);
});
test('crop below the current value preserves the upper limit', () => {
  const result = proposeRangeDrop('crop', { min: 0, max: 2000000 }, property, 600000);
  assert.deepEqual(result.bounds, { min: 600000, max: 2000000 });
  assert.equal(result.cropEdge, 'min');
  assert.equal(property.value, 800000);
});
test('crop keeps the opposite endpoint even with nonzero limits', () => {
  const bounds = { min: 650000, max: 1150000 };
  assert.deepEqual(proposeRangeDrop('crop', bounds, property, 900000).bounds, { min: 650000, max: 900000 });
  assert.deepEqual(proposeRangeDrop('crop', bounds, property, 700000).bounds, { min: 700000, max: 1150000 });
});
test('an explicit directional crop at the current value keeps the lower side', () => {
  assert.deepEqual(proposeRangeDrop('crop', { min: 0, max: 2000000 }, property, 800000).bounds, { min: 0, max: 800000 });
});
test('cropping a distant point still includes the simulation and never expands', () => {
  const bounds = { min: 0, max: 2000000 };
  for (const point of [0, 100000, 1800000, 2000000]) {
    const next = proposeRangeDrop('crop', bounds, property, point).bounds;
    assert.ok(next.min <= property.value && next.max >= property.value);
    assert.ok(next.min >= bounds.min && next.max <= bounds.max);
  }
});
test('minimum-width crops do not grow the range', () => {
  const bounds = { min: 790000, max: 990000 };
  const result = proposeRangeDrop('crop', bounds, property, 990000);
  assert.deepEqual(result.bounds, bounds);
});
test('left entry reset respects the automatic twenty percent floor', () => {
  const spec = controlSpec('entry', { ...state, entry: 300000 }, true);
  const result = proposeRangeDrop('reset-min', { min: 200000, max: 400000 }, spec);
  assert.deepEqual(result.bounds, { min: 160000, max: 400000 });
  assert.equal(result.limited, true);
  assert.equal(spec.value, 300000);
});
test('interest and term resets and expansion respect their domain limits', () => {
  const rate = controlSpec('financingRate', state, false);
  assert.deepEqual(proposeRangeDrop('reset-min', { min: 9, max: 11 }, rate).bounds, { min: 0, max: 11 });
  const expandedRate = proposeRangeDrop('expand-max', { min: 9, max: 11 }, rate);
  assert.deepEqual(expandedRate.bounds, { min: 9, max: 20 });
  assert.equal(expandedRate.limited, true);
  const term = controlSpec('termMonths', state, false);
  assert.deepEqual(proposeRangeDrop('reset-min', { min: 32, max: 38 }, term).bounds, { min: 1, max: 38 });
  assert.deepEqual(proposeRangeDrop('expand-max', { min: 32, max: 38 }, term).bounds, { min: 32, max: 40 });
});
test('zero-width domains remain finite and cannot be expanded', () => {
  const spec: ControlSpec = { value: 0, min: 0, max: 0, step: 1000, monetary: true };
  for (const intent of ['crop', 'reset-min', 'expand-max'] as const) {
    const result = proposeRangeDrop(intent, { min: 0, max: 0 }, spec);
    assert.deepEqual(result.bounds, { min: 0, max: 0 });
    assert.equal(result.changed, false);
  }
});
test('left and right are distinct drop targets and arbitrary vertical drops cancel', () => {
  const track = { left: 100, right: 300, y: 200 };
  const bounds = { min: 650000, max: 1150000 };
  assert.equal(proposalAtPoint(79, 200, track, bounds, property)?.intent, 'reset-min');
  assert.equal(proposalAtPoint(321, 200, track, bounds, property)?.intent, 'expand-max');
  assert.equal(proposalAtPoint(200, 200, track, bounds, property)?.intent, 'crop');
  assert.equal(proposalAtPoint(200, 500, track, bounds, property), null);
  assert.equal(proposalAtPoint(NaN, 200, track, bounds, property), null);
});
test('dropping near the value thumb centers a 200k monetary range', () => {
  const bounds = { min: 0, max: 2000000 };
  const track = { left: 100, right: 300, y: 200 };
  // 800k is at x=180 on this track.
  for (const x of [180, 180 + FOCUS_CROP_RADIUS_PX, 180 - FOCUS_CROP_RADIUS_PX]) {
    const result = proposalAtPoint(x, 200, track, bounds, property)!;
    assert.equal(result.intent, 'crop-center');
    assert.deepEqual(result.bounds, { min: 700000, max: 900000 });
    assert.equal(result.point, 800000);
  }
  assert.equal(property.value, 800000);
});
test('outside the proximity radius the directional crop still applies', () => {
  const track = { left: 100, right: 300, y: 200 };
  const bounds = { min: 0, max: 2000000 };
  assert.equal(proposalAtPoint(180 + FOCUS_CROP_RADIUS_PX + 1, 200, track, bounds, property)?.cropEdge, 'max');
  assert.equal(proposalAtPoint(180 - FOCUS_CROP_RADIUS_PX - 1, 200, track, bounds, property)?.cropEdge, 'min');
  assert.equal(proposalAtPoint(180, 240, track, bounds, property), null);
});
test('center crop respects zero and monetary hard limits', () => {
  const low = { ...property, value: 50000 };
  const result = proposeRangeDrop('crop-center', { min: 0, max: 2000000 }, low);
  assert.deepEqual(result.bounds, { min: 0, max: 200000 });
  assert.equal(result.limited, true);
  const entry = controlSpec('entry', { ...state, entry: 180000 }, true);
  const limited = proposeRangeDrop('crop-center', { min: 160000, max: 800000 }, entry);
  assert.deepEqual(limited.bounds, { min: 160000, max: 360000 });
  assert.equal(limited.limited, true);
});
test('center framing uses its fixed width even after an overly narrow crop', () => {
  const result = proposeRangeDrop('crop-center', { min: 790000, max: 810000 }, property);
  assert.deepEqual(result.bounds, { min: 700000, max: 900000 });
});
test('the thumb zone takes precedence when the current value is at an edge', () => {
  const track = { left: 100, right: 300, y: 200 };
  const low = { ...property, value: 0 };
  assert.equal(proposalAtPoint(79, 200, track, { min: 0, max: 2000000 }, low)?.intent, 'crop-center');
  assert.equal(proposalAtPoint(50, 200, track, { min: 0, max: 2000000 }, low)?.intent, 'reset-min');
});
test('interest and term never use the 100k monetary crop', () => {
  for (const key of ['financingRate', 'termMonths'] as const) {
    const spec = controlSpec(key, state, false);
    const bounds = { min: spec.min, max: spec.max };
    const x = 100 + (spec.value - bounds.min) / (bounds.max - bounds.min) * 200;
    assert.equal(proposalAtPoint(x, 200, { left: 100, right: 300, y: 200 }, bounds, spec)?.intent, 'crop');
    assert.equal(proposeRangeDrop('crop-center', bounds, spec).intent, 'crop');
  }
});
test('the numerical ceiling never produces an infinite expanded range', () => {
  const spec = { ...property, value: Number.MAX_SAFE_INTEGER };
  const result = proposeRangeDrop('expand-max', { min: 0, max: spec.value }, spec);
  assert.equal(result.bounds.max, Number.MAX_SAFE_INTEGER);
  assert.equal(result.limited, true);
});

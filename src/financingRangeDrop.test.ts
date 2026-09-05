import test from "node:test";
import assert from "node:assert/strict";
import { controlSpec, type ControlSpec } from "./financingGesture.ts";
import { proposeRangeDrop, proposalAtPoint } from "./financingRangeDrop.ts";
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
test('focus crop shrinks around the drop point and preserves the current value', () => {
  const result = proposeRangeDrop('crop', { min: 0, max: 2000000 }, property, 1000000);
  assert.deepEqual(result.bounds, { min: 750000, max: 1250000 });
  assert.equal(result.point, 1000000);
  assert.equal(property.value, 800000);
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
  const bounds = { min: 790000, max: 810000 };
  const result = proposeRangeDrop('crop', bounds, property, 810000);
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
test('the numerical ceiling never produces an infinite expanded range', () => {
  const spec = { ...property, value: Number.MAX_SAFE_INTEGER };
  const result = proposeRangeDrop('expand-max', { min: 0, max: spec.value }, spec);
  assert.equal(result.bounds.max, Number.MAX_SAFE_INTEGER);
  assert.equal(result.limited, true);
});

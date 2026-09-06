import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_CONTROL_RANGES, FINANCING_FIELDS, controlSpec, cropControlRange, gestureBounds,
  moveFinancingGesture, normalizeControlRange, normalizeControlRanges, startFinancingGesture,
  sliderControlValue, sliderControlKey, resetControlRange,
} from "./financingGesture.ts";
import { updateFinancing, type FinancingState } from "./financingControls.ts";
const state: FinancingState = { property: 800000, entry: 120000, financingRate: 10, termMonths: 420, fgtsSalary: 0, fgtsSalaryGrowth: 0, fgtsMode: "PRAZO", method: "SAC" };

for (const field of FINANCING_FIELDS) {
  test(`${field.key}: horizontal movement uses the field unit and tick`, () => {
    const spec = controlSpec(field.key, state, false);
    const gesture = startFinancingGesture(100, 200, spec, DEFAULT_CONTROL_RANGES[field.key]);
    const moved = moveFinancingGesture(gesture, 108, 200);
    const expected = field.key === "property" ? 810000 : field.key === "entry" ? 124000 : field.key === "financingRate" ? 10.1 : 36;
    assert.equal(moved.value, expected);
    assert.equal(moved.scale, 1);
    assert.equal(moved.originY, 200);
  });
  test(`${field.key}: cropping preserves value and obeys field limits`, () => {
    const spec = controlSpec(field.key, state, false);
    const range = cropControlRange(spec);
    assert.ok(range.min <= spec.value && range.max >= spec.value);
    assert.ok(range.min >= spec.min && range.max <= spec.max);
    assert.equal(spec.value, field.key === "termMonths" ? 35 : state[field.key]);
  });
}
test("vertical motion changes only subsequent horizontal segments", () => {
  let g = startFinancingGesture(0, 0, controlSpec("property", state, false), DEFAULT_CONTROL_RANGES.property);
  g = moveFinancingGesture(g, 8, 0); assert.equal(g.value, 810000);
  g = moveFinancingGesture(g, 8, -48); assert.equal(g.value, 810000); assert.equal(g.scale, 2);
  g = moveFinancingGesture(g, 16, -48); assert.equal(g.value, 830000);
  g = moveFinancingGesture(g, 16, 48); assert.equal(g.value, 830000); assert.equal(g.scale, 0.5);
  g = moveFinancingGesture(g, 24, 48); assert.equal(g.value, 835000);
  assert.equal(g.originX, 0); assert.equal(g.originY, 0);
});
test("stable bands have an eight pixel hysteresis margin", () => {
  let g = startFinancingGesture(0, 0, controlSpec("property", state, false), DEFAULT_CONTROL_RANGES.property);
  for (const [up, expected] of [[20, 1], [34, 2], [24, 2], [15, 1]]) {
    g = moveFinancingGesture(g, 0, -up);
    assert.equal(g.scale, expected); assert.equal(g.value, 800000);
  }
  assert.equal(moveFinancingGesture(g, 0, -1000).scale, 4);
  assert.equal(moveFinancingGesture(g, 0, 1000).scale, 0.25);
});
test("fine movement accumulates below one interest tick", () => {
  let g = startFinancingGesture(0, 0, controlSpec("financingRate", state, false), DEFAULT_CONTROL_RANGES.financingRate);
  g = moveFinancingGesture(g, 0, 96); assert.equal(g.scale, 0.25);
  g = moveFinancingGesture(g, 8, 96); assert.equal(g.value, 10);
  g = moveFinancingGesture(g, 32, 96); assert.equal(g.value, 10.1);
});
test("interest and term clamp at their limits without overshoot debt", () => {
  for (const key of ["financingRate", "termMonths"] as const) {
    const spec = controlSpec(key, state, false);
    let g = startFinancingGesture(0, 0, spec, DEFAULT_CONTROL_RANGES[key]);
    g = moveFinancingGesture(g, 100000, 0); assert.equal(g.value, spec.max);
    g = moveFinancingGesture(g, 99992, 0); assert.equal(g.value, spec.max - spec.step);
    g = moveFinancingGesture(g, -100000, 0); assert.equal(g.value, spec.min);
  }
});
test("entry floor and exact automatic values survive vertical zoom", () => {
  const next = updateFinancing(state, { property: 1741000 }, true);
  const spec = controlSpec("entry", next, true);
  assert.equal(spec.min, 348200);
  let g = startFinancingGesture(0, 0, spec, { min: 0, max: next.property });
  g = moveFinancingGesture(g, 0, -48); assert.equal(g.value, 348200);
  g = moveFinancingGesture(g, -10000, -48); assert.ok(g.value >= spec.min);
  assert.ok(gestureBounds(g).min >= spec.min);
});
test("ranges are independent and normalize when the property changes", () => {
  const source = { ...DEFAULT_CONTROL_RANGES, financingRate: { min: 9, max: 11 } };
  const next = updateFinancing(state, { property: 5000000 }, true);
  const ranges = normalizeControlRanges(source, next, true);
  assert.deepEqual(ranges.financingRate, { min: 9, max: 11 });
  assert.ok(ranges.property.max >= 5000000);
  assert.ok(ranges.entry.min >= 1000000);
  assert.ok(ranges.entry.max <= next.property);
  assert.deepEqual(source.property, DEFAULT_CONTROL_RANGES.property);
});
test("zero financing, fractional floor and very large values remain finite", () => {
  const noEntry = controlSpec("entry", { ...state, property: 0, entry: 0 }, false);
  assert.deepEqual(normalizeControlRange({ min: 0, max: 800000 }, noEntry), { min: 0, max: 0 });
  const max = Number.MAX_SAFE_INTEGER;
  const spec = controlSpec("property", { ...state, property: max }, false);
  const bounds = normalizeControlRange({ min: 0, max: Infinity }, spec);
  assert.equal(bounds.max, max);
  const g = moveFinancingGesture(startFinancingGesture(0, 0, spec, bounds), 1000, -1000);
  assert.ok(Number.isFinite(g.value)); assert.ok(g.value <= max);
  assert.ok(gestureBounds(g).max <= max);
});
test("decimal zoom ranges are idempotent across repeated renders", () => {
  const spec = controlSpec("financingRate", { ...state, financingRate: 10.3 }, false);
  const first = cropControlRange(spec);
  assert.deepEqual(first, { min: 9.2, max: 11.4 });
  let current = first;
  for (let i = 0; i < 100; i++) current = normalizeControlRange(current, spec);
  assert.deepEqual(current, first);
});
test("simple slider snaps globally and does not change its bounds", () => {
  const spec = controlSpec("property", state, false);
  const bounds = { min: 720000, max: 880000 };
  assert.equal(sliderControlValue(811321, bounds, spec), 811000);
  assert.equal(sliderControlValue(900000, bounds, spec), 880000);
  assert.deepEqual(bounds, { min: 720000, max: 880000 });
});
test("slider keyboard uses field ticks and supports range endpoints", () => {
  for (const field of FINANCING_FIELDS) {
    const spec = controlSpec(field.key, state, false);
    const bounds = normalizeControlRange(DEFAULT_CONTROL_RANGES[field.key], spec);
    assert.equal(sliderControlKey("ArrowRight", bounds, spec), spec.value + spec.step);
    assert.equal(sliderControlKey("ArrowLeft", bounds, spec), spec.value - spec.step);
    assert.equal(sliderControlKey("Home", bounds, spec), bounds.min);
    assert.equal(sliderControlKey("End", bounds, spec), bounds.max);
    assert.equal(sliderControlKey("Enter", bounds, spec), null);
  }
});
test("slider can reach an exact automatic entry floor without reversing direction", () => {
  const updated = updateFinancing(state, { property: 1741000 }, true);
  const spec = controlSpec("entry", updated, true);
  const bounds = normalizeControlRange({ min: 0, max: updated.property }, spec);
  assert.equal(sliderControlKey("ArrowLeft", bounds, spec), 348200);
  assert.equal(sliderControlKey("ArrowRight", bounds, spec), 349000);
  assert.equal(sliderControlValue(bounds.min, bounds, spec), 348200);
  assert.equal(sliderControlValue(bounds.max, bounds, spec), 1741000);
});
test("slider preserves decimal ticks near the upper bound", () => {
  const spec = controlSpec("financingRate", { ...state, financingRate: 9.1 }, false);
  const bounds = { min: 9, max: 9.2 };
  assert.equal(sliderControlValue(9.19, bounds, spec), 9.2);
  assert.equal(sliderControlKey("ArrowRight", bounds, spec), 9.2);
});
test("a range narrower than one tick selects only its endpoints", () => {
  const spec = controlSpec("entry", { ...state, property: 500, entry: 300 }, false);
  const bounds = { min: 200, max: 500 };
  assert.equal(sliderControlValue(250, bounds, spec), 200);
  assert.equal(sliderControlValue(400, bounds, spec), 500);
});
test("reset restores the default range of each field without changing values", () => {
  for (const field of FINANCING_FIELDS) {
    const original = structuredClone(state);
    assert.deepEqual(resetControlRange(field.key, state, false), DEFAULT_CONTROL_RANGES[field.key]);
    assert.deepEqual(state, original);
  }
});
test("reset keeps values above the default maximum and the automatic entry floor", () => {
  const high = updateFinancing(state, { property: 5000000 }, true);
  assert.deepEqual(resetControlRange('property', high, true), { min: 0, max: 5000000 });
  const entry = resetControlRange('entry', high, true);
  assert.equal(entry.min, high.entry);
  assert.ok(entry.max >= high.entry && entry.max <= high.property);
});
test("invalid pointer coordinates are ignored", () => {
  const g = startFinancingGesture(0, 0, controlSpec("property", state, false), DEFAULT_CONTROL_RANGES.property);
  assert.equal(moveFinancingGesture(g, NaN, 0), g);
});

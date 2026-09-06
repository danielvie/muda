import test from "node:test";
import assert from "node:assert/strict";
import {
  cropBounds, expandAtEdge, minimumEntry, normalizeBounds, updateFinancing,
  widthToZoom, zoomBounds, zoomScale, zoomToWidth, type FinancingState,
  MONEY_TICK, formatFinancingNumber, parseFinancingNumber, snapFinancingValue,
} from "./financingControls.ts";

const state: FinancingState = { property: 800000, entry: 120000, financingRate: 10, termMonths: 420, fgtsSalary: 0, fgtsSalaryGrowth: 0, fgtsMode: "PRAZO", method: "SAC" };
test("FGTS mode updates survive financing edits and study restoration", () => {
  const reducedPayment = updateFinancing(state, { fgtsMode: "PRESTACAO" }, true);
  assert.equal(reducedPayment.fgtsMode, "PRESTACAO");
  assert.equal(reducedPayment.entry, 160000);
  const changed = updateFinancing(reducedPayment, { property: 3000000 }, true);
  assert.equal(changed.fgtsMode, "PRESTACAO");
  assert.equal(changed.entry, 600000);
  assert.equal(updateFinancing(changed, {}, true).fgtsMode, "PRESTACAO");
  assert.equal(updateFinancing(changed, { fgtsMode: "PRAZO" }, true).fgtsMode, "PRAZO");
});
test("legacy studies without an FGTS mode default to term reduction", () => {
  const { fgtsMode: _mode, ...legacy } = state;
  assert.equal(updateFinancing(legacy as FinancingState, {}, false).fgtsMode, "PRAZO");
});

test("enabling the policy raises a low entry and preserves a higher entry", () => {
  assert.equal(updateFinancing(state, {}, true).entry, 160000);
  assert.equal(updateFinancing({ ...state, entry: 300000 }, {}, true).entry, 300000);
});
test("property changes apply max of current entry and twenty percent", () => {
  let next = updateFinancing(state, { property: 3000000 }, true);
  assert.equal(next.entry, 600000);
  next = updateFinancing(next, { property: 1000000 }, true);
  assert.equal(next.entry, 600000);
  next = updateFinancing(next, { property: 500000 }, true);
  assert.equal(next.entry, 600000); // preserve even when the property drops below the entry
});
test("manual entry cannot bypass an enabled floor", () => {
  assert.equal(updateFinancing(state, { entry: 1 }, true).entry, 160000);
  assert.equal(updateFinancing(state, { entry: 1 }, false).entry, 1);
});
test("disabling automatic entry does not increase it on a subsequent property change", () => {
  assert.equal(updateFinancing({ ...state, entry: 160000 }, { property: 3000000 }, false).entry, 160000);
});
test("the twenty percent floor is rounded upwards", () => {
  assert.equal(minimumEntry(830001), 166001);
});
test("property values are not constrained by the slider's initial maximum", () => {
  const next = updateFinancing(state, { property: 5000000 }, false);
  assert.equal(next.property, 5000000);
  assert.equal(normalizeBounds({ min: 0, max: 2000000 }, next.property).max, 5000000);
});
test("non-finite mutations are ignored, financing term and rates stay bounded", () => {
  assert.equal(updateFinancing(state, { property: NaN }, false).property, state.property);
  assert.equal(updateFinancing(state, { entry: Infinity }, false).entry, state.entry);
  const next = updateFinancing(state, { termMonths: -1, financingRate: 999 }, false);
  assert.equal(next.termMonths, 12);
  assert.equal(next.financingRate, 20);
});
test("restoring a study with the policy enabled respects the floor", () => {
  const restored = updateFinancing({ ...state, property: 2000000, entry: 100000 }, {}, true);
  assert.equal(restored.entry, 400000);
});
test("ranges contain the current property and have useful width", () => {
  assert.deepEqual(normalizeBounds({ min: 900000, max: 950000 }, 800000), { min: 800000, max: 950000 });
  assert.deepEqual(normalizeBounds({ min: 0, max: 0 }, 0), { min: 0, max: 20000 });
});
test("zoom preserves the minimum anchor", () => {
  assert.deepEqual(zoomBounds({ min: 500000, max: 2000000 }, 800000, 20000, "min"), { min: 500000, max: 800000 });
});
test("zoom preserves the maximum anchor without excluding the property", () => {
  assert.deepEqual(zoomBounds({ min: 0, max: 2000000 }, 800000, 20000, "max"), { min: 800000, max: 2000000 });
});
test("zoom can center a range around the property without mutating its input", () => {
  const bounds = { min: 0, max: 2000000 };
  assert.deepEqual(zoomBounds(bounds, 800000, 400000, "value"), { min: 600000, max: 1000000 });
  assert.deepEqual(bounds, { min: 0, max: 2000000 });
});
test("crop restores precision around a property after a large expansion", () => {
  assert.deepEqual(cropBounds({ min: 0, max: 100000000 }, 800000), { min: 720000, max: 880000 });
  assert.deepEqual(cropBounds({ min: 0, max: 2000000 }, 0), { min: 0, max: 20000 });
});
test("edge expansion grows progressively, including the lower edge", () => {
  const first = expandAtEdge({ min: 0, max: 2000000 }, 2000000);
  assert.equal(first.max, 4000000);
  assert.equal(expandAtEdge(first, 4000000).max, 8000000);
  assert.deepEqual(expandAtEdge({ min: 720000, max: 880000 }, 720000), { min: 560000, max: 880000 });
});
test("the middle of a range does not expand, zero never becomes negative", () => {
  const bounds = { min: 0, max: 2000000 };
  assert.equal(expandAtEdge(bounds, 800000), bounds);
  assert.equal(expandAtEdge(bounds, 0), bounds);
});
test("zoom conversion round trips across a logarithmic scale", () => {
  const scale = zoomScale({ min: 0, max: 2000000 }, 800000);
  for (const position of [0, 10, 50, 90, 100]) assert.ok(Math.abs(widthToZoom(zoomToWidth(position, scale), scale) - position) < 1e-8);
});
test("zoom and crop limits align to global money ticks without rounding the property", () => {
  const value = 1740671.71;
  const bounds = cropBounds({ min: 0, max: 2000000 }, value);
  assert.equal(bounds.min % MONEY_TICK, 0);
  assert.equal(bounds.max % MONEY_TICK, 0);
  assert.ok(bounds.min <= value && bounds.max >= value);
  for (const anchor of ["min", "value", "max"] as const) {
    const zoomed = zoomBounds(bounds, value, 453921.791, anchor);
    assert.equal(zoomed.min % MONEY_TICK, 0);
    assert.equal(zoomed.max % MONEY_TICK, 0);
  }
});
test("amount controls snap to global ten-thousands, not a fractional range origin", () => {
  assert.equal(snapFinancingValue(1740671.71, MONEY_TICK, 1566671.71, 1914671.71), 1740000);
  assert.equal(snapFinancingValue(1742000, MONEY_TICK, 1566000, 1915000), 1740000);
  assert.equal(snapFinancingValue(1740000, MONEY_TICK, 1566000, 1915000), 1740000);
});
test("ticks preserve entry constraints and decimal rate precision", () => {
  assert.equal(snapFinancingValue(348000, MONEY_TICK, 348200, 1741000), 350000);
  assert.equal(snapFinancingValue(300, MONEY_TICK, 200, 500), 300);
  assert.equal(snapFinancingValue(10.100000000001, 0.1, 0, 20), 10.1);
  assert.equal(snapFinancingValue(35.4, 1, 1, 40), 35);
  assert.equal(updateFinancing({ ...state, property: 1741000 }, {}, true).entry, 348200);
});
test("formatted controls use Brazilian grouping and decimal comma", () => {
  assert.equal(formatFinancingNumber(1741000, true), "1.741.000,00");
  assert.equal(formatFinancingNumber(10.1, false), "10,1");
  assert.equal(formatFinancingNumber(35, false), "35");
});
test("parse formatted, raw, and pasted currency values without losing grouping", () => {
  for (const raw of ["1.740.671,71", "1740671,71", "1740671.71", "R$ 1.740.671,71"]) assert.equal(parseFinancingNumber(raw), 1740671.71);
  assert.equal(parseFinancingNumber("1.000"), 1000);
  assert.equal(parseFinancingNumber("10,1"), 10.1);
  assert.equal(parseFinancingNumber("0,00"), 0);
  for (const raw of ["", "abc", "1..2", "1,2,3", "1.23.456"]) assert.ok(Number.isNaN(parseFinancingNumber(raw)));
});

test("safe numerical bounds remain finite and include large values", () => {
  const max = Number.MAX_SAFE_INTEGER;
  const bounds = normalizeBounds({ min: max, max: Infinity }, max);
  assert.equal(bounds.max, max);
  assert.ok(bounds.max - bounds.min >= 20000);
  assert.ok(Number.isFinite(zoomToWidth(100, zoomScale(bounds, max))));
});

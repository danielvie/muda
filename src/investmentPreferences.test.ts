import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_INVESTMENT_VALUES, DEFAULT_INVESTMENT_RANGES, investmentRange } from "./investmentControls.ts";
import { INVESTMENT_RANGES_KEY, INVESTMENT_VALUES_KEY, applyInvestmentDefaults, readInvestmentRanges, readInvestmentValues, resolveInvestmentRanges, saveInvestmentRange, saveInvestmentValue, readInvestmentPeriodUnit, saveInvestmentPeriodUnit, INVESTMENT_PERIOD_UNIT_KEY } from "./investmentPreferences.ts";

function storage() {
  const data = new Map<string, string>([["muda.financing.rangePreferences.v1", "keep"], ["muda.financing.valuePreferences.v1", "keep"], ["muda:fields", "legacy"], ["muda:field-history", "history"]]);
  const writes: string[] = [];
  return { data, writes, getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { writes.push(key); data.set(key, value); } };
}
test("investment default reads do not write or share financing storage", () => {
  const s = storage();
  assert.deepEqual(readInvestmentValues(s), {});
  assert.deepEqual(resolveInvestmentRanges(readInvestmentRanges(s)), DEFAULT_INVESTMENT_RANGES);
  assert.equal(s.writes.length, 0);
  assert.ok(saveInvestmentValue("saldoInicial", 123456.78, s).ok);
  assert.ok(saveInvestmentRange("aporteMensal", { min: 0, max: 5000 }, s).ok);
  assert.deepEqual(s.writes, [INVESTMENT_VALUES_KEY, INVESTMENT_RANGES_KEY]);
  assert.equal(s.data.get("muda:fields"), "legacy");
  assert.equal(s.data.get("muda:field-history"), "history");
  assert.equal(s.data.get("muda.financing.valuePreferences.v1"), "keep");
});
test("explicit defaults override legacy money only at startup and preserve precision and unrelated fields", () => {
  const legacy = { ...DEFAULT_INVESTMENT_VALUES, saldoInicial: "100,000.00", entrada: "120000" };
  assert.deepEqual(applyInvestmentDefaults(legacy, {}), legacy);
  const result = applyInvestmentDefaults(legacy, { saldoInicial: 0, taxaInvestAnual: 14.123456, mesesProj: 25 });
  assert.equal(result.saldoInicial, "0");
  assert.equal(result.taxaInvestAnual, "14.123456");
  assert.equal(result.mesesProj, "25");
  assert.equal(result.entrada, "120000");
  assert.equal(legacy.saldoInicial, "100,000.00");
});
test("saves merge other fields; removing a value default restores legacy-memory fallback without changing it", () => {
  const s = storage();
  saveInvestmentValue("saldoInicial", 100000, s);
  saveInvestmentValue("taxaInvestAnual", 14.123456, s);
  assert.deepEqual(readInvestmentValues(s), { saldoInicial: 100000, taxaInvestAnual: 14.123456 });
  saveInvestmentValue("saldoInicial", null, s);
  assert.deepEqual(readInvestmentValues(s), { taxaInvestAnual: 14.123456 });
  assert.equal(applyInvestmentDefaults({ ...DEFAULT_INVESTMENT_VALUES, saldoInicial: "99999" }, readInvestmentValues(s)).saldoInicial, "99999");
});
test("saved ranges stay independent from current values and reset expands only the applied range", () => {
  const s = storage();
  saveInvestmentRange("saldoInicial", { min: 0, max: 200000 }, s);
  saveInvestmentRange("mesesProj", { min: 0, max: 60 }, s);
  const prefs = readInvestmentRanges(s);
  const bounds = investmentRange("saldoInicial", resolveInvestmentRanges(prefs).saldoInicial, 500000);
  assert.ok(bounds.max >= 500000);
  assert.deepEqual(readInvestmentRanges(s).saldoInicial, { min: 0, max: 200000 });
  const count = s.writes.length;
  investmentRange("saldoInicial", bounds, 500000);
  assert.equal(s.writes.length, count);
  saveInvestmentRange("saldoInicial", null, s);
  assert.deepEqual(resolveInvestmentRanges(readInvestmentRanges(s)).saldoInicial, DEFAULT_INVESTMENT_RANGES.saldoInicial);
  assert.deepEqual(readInvestmentRanges(s).mesesProj, { min: 0, max: 60 });
});
test("invalid values and ranges cannot replace valid saved defaults", () => {
  const s = storage();
  saveInvestmentValue("aporteMensal", 2000, s);
  saveInvestmentRange("mesesProj", { min: 0, max: 120 }, s);
  const before = new Map(s.data);
  for (const value of [-1, NaN, Infinity]) assert.equal(saveInvestmentValue("aporteMensal", value, s).ok, false);
  assert.equal(saveInvestmentValue("mesesProj", 1.5, s).ok, false);
  for (const bounds of [{ min: 2, max: 2 }, { min: -1, max: 12 }, { min: 0, max: 1201 }, { min: 0.5, max: 12 }]) assert.equal(saveInvestmentRange("mesesProj", bounds, s).ok, false);
  assert.deepEqual(s.data, before);
});
test("blocked reads and writes fail safely without clobbering stored preferences", () => {
  const blocked = { getItem: () => { throw Error("blocked"); }, setItem: () => { throw Error("must not write"); } };
  assert.deepEqual(readInvestmentValues(blocked), {});
  assert.deepEqual(readInvestmentRanges(blocked), {});
  assert.equal(saveInvestmentValue("saldoInicial", 1, blocked).ok, false);
  assert.equal(saveInvestmentRange("mesesProj", { min: 0, max: 12 }, blocked).ok, false);
  let writes = 0;
  const readBlocked = { getItem: blocked.getItem, setItem: () => { writes++; } };
  saveInvestmentValue("saldoInicial", 1, readBlocked);
  saveInvestmentRange("mesesProj", null, readBlocked);
  assert.equal(writes, 0);
  const s = storage();
  saveInvestmentValue("saldoInicial", 2, s);
  const writeBlocked = { getItem: s.getItem, setItem: () => { throw Error("quota"); } };
  assert.equal(saveInvestmentValue("saldoInicial", null, writeBlocked).ok, false);
  assert.deepEqual(readInvestmentValues(s), { saldoInicial: 2 });
});
test("period display unit is remembered without converting or changing saved months and ranges", () => {
  const s = storage();
  assert.equal(readInvestmentPeriodUnit(s), "months");
  saveInvestmentValue("mesesProj", 25, s);
  saveInvestmentRange("mesesProj", { min: 1, max: 480 }, s);
  const values = s.data.get(INVESTMENT_VALUES_KEY);
  const ranges = s.data.get(INVESTMENT_RANGES_KEY);
  for (const unit of ["years", "months", "years"] as const) {
    assert.ok(saveInvestmentPeriodUnit(unit, s).ok);
    assert.equal(readInvestmentPeriodUnit(s), unit);
    assert.equal(s.data.get(INVESTMENT_VALUES_KEY), values);
    assert.equal(s.data.get(INVESTMENT_RANGES_KEY), ranges);
  }
  for (const raw of ["{", "null", '{"version":2,"unit":"years"}', '{"version":1,"unit":"unknown"}']) {
    s.data.set(INVESTMENT_PERIOD_UNIT_KEY, raw);
    assert.equal(readInvestmentPeriodUnit(s), "months");
  }
  const blocked = { getItem: () => { throw Error("blocked"); }, setItem: () => { throw Error("blocked"); } };
  assert.equal(readInvestmentPeriodUnit(blocked), "months");
  assert.equal(saveInvestmentPeriodUnit("years", blocked).ok, false);
});

test("malformed documents and unknown fields are ignored without writes", () => {
  const s = storage();
  for (const raw of ["{", "null", "[]", '{"version":2,"values":{"saldoInicial":4}}']) {
    s.data.set(INVESTMENT_VALUES_KEY, raw);
    assert.deepEqual(readInvestmentValues(s), {});
  }
  s.data.set(INVESTMENT_VALUES_KEY, JSON.stringify({ version: 1, values: { saldoInicial: "1000", aporteMensal: 1234.56, mesesProj: 2.5, taxaInvestAnual: -5, foreign: 1 } }));
  assert.deepEqual(readInvestmentValues(s), { aporteMensal: 1234.56, taxaInvestAnual: -5 });
  s.data.set(INVESTMENT_RANGES_KEY, JSON.stringify({ version: 1, ranges: { saldoInicial: { min: 0, max: 10000 }, mesesProj: { min: 12, max: 0 }, taxaInvestAnual: null } }));
  assert.deepEqual(readInvestmentRanges(s), { saldoInicial: { min: 0, max: 10000 } });
  assert.equal(s.writes.length, 0);
});

import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_INVESTMENT_RANGES, DEFAULT_INVESTMENT_VALUES, INVESTMENT_FIELDS, investmentControlSpec, investmentRange, parseInvestmentInput, parseInvestmentPeriod, investmentPeriodInput, formatInvestmentPeriod } from "./investmentControls.ts";
import { sliderControlKey, sliderControlValue } from "./financingGesture.ts";
import { proposeRangeDrop } from "./financingRangeDrop.ts";
import { buildInvestmentProjection } from "./investmentProjection.ts";

const fields = { ...DEFAULT_INVESTMENT_VALUES, valorImovel: "800000", entrada: "120000", taxaFinAnual: "10", prazoMeses: "420", metodoAmortizacao: "SAC" as const };
test("investment accepts both money locales, decimal rates, expressions and zero without snapping manual values", () => {
  for (const raw of ["100,000.00", "100.000,00", "100000", "100.000", "R$ 100.000,00"]) assert.equal(parseInvestmentInput("saldoInicial", raw), 100000);
  assert.equal(parseInvestmentInput("aporteMensal", "2.345,67"), 2345.67);
  assert.equal(parseInvestmentInput("taxaInvestAnual", "14,123456"), 14.123456);
  assert.equal(parseInvestmentInput("taxaInvestAnual", "10.000"), 10);
  assert.equal(parseInvestmentInput("taxaInvestAnual", "-5,5"), -5.5);
  assert.equal(parseInvestmentInput("mesesProj", "12*3"), 36);
  for (const { key } of INVESTMENT_FIELDS) assert.equal(parseInvestmentInput(key, "0"), 0);
});
test("invalid and out-of-domain investment inputs never become a fake zero or an unbounded projection", () => {
  for (const { key } of INVESTMENT_FIELDS) {
    for (const raw of ["", " ", "NaN", "Infinity", "10abc", "1,2,3", "1..2", "1/0"]) assert.equal(parseInvestmentInput(key, raw), null, `${key}: ${raw}`);
  }
  assert.equal(parseInvestmentInput("saldoInicial", "-1"), null);
  assert.equal(parseInvestmentInput("taxaInvestAnual", "-100"), null);
  assert.equal(parseInvestmentInput("taxaInvestAnual", "101"), null);
  assert.equal(parseInvestmentInput("mesesProj", "1.5"), null);
  assert.equal(parseInvestmentInput("mesesProj", "1201"), null);
});
test("each investment slider uses its own steps, preserves exact typed values on range reset and reaches endpoints", () => {
  for (const { key, step } of INVESTMENT_FIELDS) {
    const value = Number(DEFAULT_INVESTMENT_VALUES[key]);
    const spec = investmentControlSpec(key, value);
    const bounds = investmentRange(key, DEFAULT_INVESTMENT_RANGES[key], value);
    assert.equal(sliderControlKey("ArrowRight", bounds, spec), value + step);
    assert.equal(sliderControlKey("Home", bounds, spec), bounds.min);
    assert.equal(sliderControlKey("End", bounds, spec), bounds.max);
    assert.equal(sliderControlValue(Infinity, bounds, spec), value);
    assert.equal(proposeRangeDrop("expand-max", bounds, spec).bounds.max, Math.min(spec.max, bounds.max * 2));
    assert.equal(investmentControlSpec(key, value).value, value);
  }
  const exact = 2456789.12;
  const bounds = investmentRange("saldoInicial", DEFAULT_INVESTMENT_RANGES.saldoInicial, exact);
  assert.ok(bounds.min <= exact && bounds.max >= exact);
  assert.deepEqual(investmentRange("saldoInicial", bounds, exact), bounds);
  assert.equal(investmentControlSpec("saldoInicial", exact).value, exact);
});
test("Foco uses 100k around initial balance but 1k around monthly contributions", () => {
  const initial = investmentControlSpec("saldoInicial", 200000);
  assert.deepEqual(proposeRangeDrop("crop-center", DEFAULT_INVESTMENT_RANGES.saldoInicial, initial).bounds, { min: 100000, max: 300000 });
  const monthly = investmentControlSpec("aporteMensal", 2000);
  assert.deepEqual(proposeRangeDrop("crop-center", DEFAULT_INVESTMENT_RANGES.aporteMensal, monthly).bounds, { min: 1000, max: 3000 });
  const zero = investmentControlSpec("aporteMensal", 0);
  assert.equal(proposeRangeDrop("crop-center", DEFAULT_INVESTMENT_RANGES.aporteMensal, zero).bounds.min, 0);
  for (const key of ["taxaInvestAnual", "mesesProj"] as const) {
    assert.equal(proposeRangeDrop("crop-center", DEFAULT_INVESTMENT_RANGES[key], investmentControlSpec(key, 10)).intent, "crop");
  }
});
test("period unit conversion preserves whole months, accepts fractional years, and never rounds a fractional month silently", () => {
  assert.equal(parseInvestmentPeriod("2", "years"), 24);
  assert.equal(parseInvestmentPeriod("2,5", "years"), 30);
  assert.equal(parseInvestmentPeriod("12/2", "years"), 72);
  assert.equal(parseInvestmentPeriod("0", "years"), 0);
  assert.equal(parseInvestmentPeriod("100", "years"), 1200);
  assert.equal(parseInvestmentPeriod("0.1", "years"), null);
  assert.equal(parseInvestmentPeriod("100.01", "years"), null);
  assert.equal(parseInvestmentPeriod("-0.00000001", "years"), null);
  assert.equal(parseInvestmentPeriod("1.5", "months"), null);
  for (let months = 0; months <= 1200; months++) {
    assert.equal(parseInvestmentPeriod(investmentPeriodInput(months, "years"), "years"), months);
    assert.equal(parseInvestmentPeriod(investmentPeriodInput(months, "months"), "months"), months);
  }
  assert.equal(formatInvestmentPeriod(24, "years"), "2 anos");
  assert.equal(formatInvestmentPeriod(12, "years"), "1 ano");
  assert.equal(formatInvestmentPeriod(25, "months"), "25 meses");
  const spec = { ...investmentControlSpec("mesesProj", 24), step: 12 };
  assert.equal(sliderControlKey("ArrowRight", DEFAULT_INVESTMENT_RANGES.mesesProj, spec), 36);
});

test("projection stays consistent with numeric input, zero period and negative or comma rates", () => {
  const result = buildInvestmentProjection({ ...fields, saldoInicial: "100,000.00" })!;
  assert.ok(Math.abs(result.result.saldoFinal - 173670.25) < 0.005);
  assert.equal(buildInvestmentProjection({ ...fields, taxaInvestAnual: "10,5" })!.result.serie.length, 24);
  assert.equal(buildInvestmentProjection({ ...fields, mesesProj: "0" })!.result.saldoFinal, 50000);
  assert.ok(buildInvestmentProjection({ ...fields, taxaInvestAnual: "-5" }));
  assert.equal(buildInvestmentProjection({ ...fields, taxaInvestAnual: "" }), null);
  assert.equal(buildInvestmentProjection({ ...fields, mesesProj: "100000000" }), null);
});

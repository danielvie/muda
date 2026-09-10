import test from "node:test";
import assert from "node:assert/strict";
import { defaultFinanceVsInvestFields } from "./financeVsInvestProjection.ts";
import { FINANCE_VS_INVEST_FIELDS_KEY, readFinanceVsInvestFields, saveFinanceVsInvestFields } from "./financeVsInvestPreferences.ts";

test("loads known input fields only, preserving raw precision and independent assumptions", () => {
  const storage = {
    getItem: () => JSON.stringify({ monthlyBudget: "", horizonYears: "17", investmentAnnualReturn: "14.123456", amortizationMethod: "PRICE", availableMoney: null, winner: "invest" }),
    setItem: () => assert.fail("Startup must not write"),
  };
  assert.deepEqual(readFinanceVsInvestFields(storage), { ...defaultFinanceVsInvestFields, horizonYears: "17", investmentAnnualReturn: "14.123456", amortizationMethod: "PRICE" });
});

test("malformed, missing and blocked storage falls back safely without modifying the source", () => {
  for (const raw of [null, "broken", "null", "[]", "123"]) {
    assert.deepEqual(readFinanceVsInvestFields({ getItem: () => raw, setItem: () => assert.fail("Must not write") }), defaultFinanceVsInvestFields);
  }
  const fail = () => { throw new Error("blocked"); };
  assert.deepEqual(readFinanceVsInvestFields({ getItem: fail, setItem: fail }), defaultFinanceVsInvestFields);
  assert.doesNotThrow(() => saveFinanceVsInvestFields(defaultFinanceVsInvestFields, { getItem: fail, setItem: fail }));
});

test("persists only the comparison inputs under the existing key", () => {
  let saved = "";
  saveFinanceVsInvestFields({ ...defaultFinanceVsInvestFields, monthlyRent: "3456" }, {
    getItem: () => null,
    setItem: (key, value) => { assert.equal(key, FINANCE_VS_INVEST_FIELDS_KEY); saved = value; },
  });
  assert.equal(JSON.parse(saved).monthlyRent, "3456");
});

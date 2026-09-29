import test from "node:test";
import assert from "node:assert/strict";
import { FINANCING_METHOD_KEY, readFinancingMethod, saveFinancingMethod } from "./financingMethodPreference.ts";

function memory(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  const writes: string[] = [];
  return {
    values, writes,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { writes.push(key); values.set(key, value); },
  };
}

test("SAC is the default without a saved method; reading never writes", () => {
  const store = memory();
  assert.equal(readFinancingMethod(store), "SAC");
  assert.deepEqual(store.writes, []);
});

test("choosing either method persists across reads without touching other preferences or studies", () => {
  const store = memory({ "muda.financing.studies.v1": "studies", "muda.financing.valuePreferences.v1": "values" });
  assert.equal(saveFinancingMethod("PRICE", store), true);
  assert.equal(readFinancingMethod(store), "PRICE");
  assert.equal(saveFinancingMethod("SAC", store), true);
  assert.equal(readFinancingMethod(store), "SAC");
  assert.deepEqual(store.writes, [FINANCING_METHOD_KEY, FINANCING_METHOD_KEY]);
  assert.equal(store.getItem("muda.financing.studies.v1"), "studies");
  assert.equal(store.getItem("muda.financing.valuePreferences.v1"), "values");
});

test("invalid or corrupt data falls back to SAC without overwriting storage", () => {
  for (const raw of ["broken", "null", "[]", '"PRICE"', '{"version":2,"method":"PRICE"}', '{"version":1,"method":"OTHER"}']) {
    const store = memory({ [FINANCING_METHOD_KEY]: raw });
    assert.equal(readFinancingMethod(store), "SAC");
    assert.deepEqual(store.writes, []);
  }
});

test("blocked storage does not crash the selection or erase the saved value", () => {
  const store = memory();
  saveFinancingMethod("PRICE", store);
  const blocked = { getItem: store.getItem, setItem: () => { throw Error("quota"); } };
  assert.equal(saveFinancingMethod("SAC", blocked), false);
  assert.equal(readFinancingMethod(store), "PRICE");
  const unreadable = { getItem: () => { throw Error("blocked"); }, setItem: store.setItem };
  assert.equal(readFinancingMethod(unreadable), "SAC");
});

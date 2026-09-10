import test from "node:test";
import assert from "node:assert/strict";
import { INVESTMENT_RATE_KEY, readInvestmentRate, saveInvestmentRate } from "./investmentRatePreference.ts";

function memoryStorage() {
  const data = new Map<string, string>();
  const writes: string[] = [];
  return {
    data, writes,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { writes.push(key); data.set(key, value); },
    removeItem: (key: string) => { writes.push(key); data.delete(key); },
  };
}

test("startup has no assumed rate and does not write storage", () => {
  const storage = memoryStorage();
  assert.equal(readInvestmentRate(storage), "");
  assert.deepEqual(storage.writes, []);
});

test("remembers annual percentage including comma, zero and precision without touching other settings", () => {
  const storage = memoryStorage();
  storage.data.set("muda.financing.studies.v1", "studies");
  storage.data.set("muda.financing.valuePreferences.v1", "defaults");
  for (const [input, expected] of [["8,5", "8,5"], ["7.123456", "7,123456"], ["0", "0"], ["100", "100"]]) {
    assert.deepEqual(saveInvestmentRate(input, storage), { ok: true });
    assert.equal(readInvestmentRate(storage), expected);
    assert.deepEqual(JSON.parse(storage.data.get(INVESTMENT_RATE_KEY)!), { version: 1, annualRatePercent: Number(input.replace(",", ".")) });
  }
  assert.ok(storage.writes.every(key => key === INVESTMENT_RATE_KEY));
  assert.equal(storage.data.get("muda.financing.studies.v1"), "studies");
  assert.equal(storage.data.get("muda.financing.valuePreferences.v1"), "defaults");
});

test("invalid edits preserve the last valid rate; clearing explicitly forgets it", () => {
  const storage = memoryStorage();
  saveInvestmentRate("8,5", storage);
  for (const input of ["abc", "101", "-1", "Infinity", "8,,5"]) {
    assert.equal(saveInvestmentRate(input, storage).ok, false);
    assert.equal(readInvestmentRate(storage), "8,5");
  }
  assert.equal(storage.writes.length, 1);
  assert.deepEqual(saveInvestmentRate("", storage), { ok: true });
  assert.equal(readInvestmentRate(storage), "");
  assert.equal(storage.data.has(INVESTMENT_RATE_KEY), false);
});

test("corrupt, unsupported and invalid stored rates are ignored without overwriting them", () => {
  const storage = memoryStorage();
  for (const raw of ["bad json", "null", "[]", "8.5", '{"version":2,"annualRatePercent":8}', '{"version":1,"annualRatePercent":"8"}', '{"version":1,"annualRatePercent":101}', '{"version":1,"annualRatePercent":-1}', '{"version":1,"annualRatePercent":null}']) {
    storage.data.set(INVESTMENT_RATE_KEY, raw);
    assert.equal(readInvestmentRate(storage), "");
    assert.equal(storage.data.get(INVESTMENT_RATE_KEY), raw);
  }
  assert.deepEqual(storage.writes, []);
});

test("blocked reads, writes and removals do not crash or lose the saved rate", () => {
  const storage = memoryStorage();
  saveInvestmentRate("8,5", storage);
  const fail = () => { throw new Error("Storage blocked"); };
  assert.equal(readInvestmentRate({ ...storage, getItem: fail }), "");
  for (const input of ["9", ""]) {
    const result = saveInvestmentRate(input, { ...storage, setItem: fail, removeItem: fail });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /apenas nesta sessão/);
    assert.equal(readInvestmentRate(storage), "8,5");
  }
});

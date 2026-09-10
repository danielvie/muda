import test from "node:test";
import assert from "node:assert/strict";
import { FGTS_PREFERENCES_KEY, readFgtsPreferences, saveFgtsPreferences, clearSavedFgtsSalary } from "./fgtsPreferences.ts";

function memoryStorage() {
  const data = new Map<string, string>();
  const writes: string[] = [];
  return {
    data, writes,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { writes.push(key); data.set(key, value); },
  };
}

test("FGTS memory restores salary and annual growth without writes on startup", () => {
  const storage = memoryStorage();
  assert.deepEqual(readFgtsPreferences(storage), {});
  assert.deepEqual(storage.writes, []);
  assert.equal(saveFgtsPreferences({ fgtsSalary: 30000.55, fgtsSalaryGrowth: 3.25 }, storage).ok, true);
  assert.deepEqual(readFgtsPreferences(storage), { fgtsSalary: 30000.55, fgtsSalaryGrowth: 3.25 });
  assert.equal(storage.writes.length, 1);
});

test("single-field edits merge the latest other field; zero growth is remembered", () => {
  const storage = memoryStorage();
  saveFgtsPreferences({ fgtsSalary: 30000, fgtsSalaryGrowth: 3 }, storage);
  saveFgtsPreferences({ fgtsSalaryGrowth: 0 }, storage);
  assert.deepEqual(readFgtsPreferences(storage), { fgtsSalary: 30000, fgtsSalaryGrowth: 0 });
  storage.data.set(FGTS_PREFERENCES_KEY, JSON.stringify({ version: 1, values: { fgtsSalary: 30000, fgtsSalaryGrowth: 4 } }));
  saveFgtsPreferences({ fgtsSalary: 40000 }, storage);
  assert.deepEqual(readFgtsPreferences(storage), { fgtsSalary: 40000, fgtsSalaryGrowth: 4 });
});

test("clear removes only salary from memory, preserving growth and other app settings", () => {
  const storage = memoryStorage();
  storage.data.set("muda.financing.studies.v1", "studies");
  saveFgtsPreferences({ fgtsSalary: 30000, fgtsSalaryGrowth: 3 }, storage);
  assert.equal(clearSavedFgtsSalary(storage).ok, true);
  assert.deepEqual(readFgtsPreferences(storage), { fgtsSalaryGrowth: 3 });
  assert.ok(!storage.data.get(FGTS_PREFERENCES_KEY)!.includes("30000"));
  assert.equal(storage.data.get("muda.financing.studies.v1"), "studies");
  assert.ok(storage.writes.every(key => key === FGTS_PREFERENCES_KEY));
});

test("invalid fields and corrupt storage never become restored salaries or trigger writes", () => {
  const storage = memoryStorage();
  for (const raw of ["bad", "null", "[]", '{"version":2,"values":{"fgtsSalary":30000}}', '{"version":1,"values":{"fgtsSalary":"30000","fgtsSalaryGrowth":-1}}']) {
    storage.data.set(FGTS_PREFERENCES_KEY, raw);
    assert.deepEqual(readFgtsPreferences(storage), {});
  }
  assert.deepEqual(storage.writes, []);
  storage.data.set(FGTS_PREFERENCES_KEY, '{"version":1,"values":{"fgtsSalary":-1,"fgtsSalaryGrowth":3}}');
  assert.deepEqual(readFgtsPreferences(storage), { fgtsSalaryGrowth: 3 });
  for (const value of [-1, NaN, Infinity]) assert.equal(saveFgtsPreferences({ fgtsSalary: value }, storage).ok, false);
  assert.deepEqual(storage.writes, []);
});

test("blocked storage fails safely and cannot claim a salary was cleared", () => {
  const storage = memoryStorage();
  saveFgtsPreferences({ fgtsSalary: 30000, fgtsSalaryGrowth: 3 }, storage);
  const fail = () => { throw new Error("blocked"); };
  assert.deepEqual(readFgtsPreferences({ ...storage, getItem: fail }), {});
  const blocked = { ...storage, setItem: fail };
  assert.equal(clearSavedFgtsSalary(blocked).ok, false);
  assert.equal(saveFgtsPreferences({ fgtsSalaryGrowth: 4 }, blocked).ok, false);
  assert.deepEqual(readFgtsPreferences(storage), { fgtsSalary: 30000, fgtsSalaryGrowth: 3 });
});

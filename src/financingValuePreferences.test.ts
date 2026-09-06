import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_FINANCING_STATE, VALUE_PREFERENCES_KEY, readValuePreferences,
  resolveValuePreferences, saveValuePreference, removeValuePreference,
} from "./financingValuePreferences.ts";
import { RANGE_PREFERENCES_KEY, readRangePreferences, resolveRangePreferences } from "./financingRangePreferences.ts";
import { normalizeControlRanges } from "./financingGesture.ts";
import { updateFinancing } from "./financingControls.ts";

function memory(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  const writes: string[] = [];
  return { values, writes, getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { writes.push(key); values.set(key, value); } };
}

test("without value preferences startup uses original defaults and never writes", () => {
  const store = memory();
  assert.deepEqual(resolveValuePreferences(readValuePreferences(store)), DEFAULT_FINANCING_STATE);
  assert.deepEqual(store.writes, []);
});

test("saving a field persists only that value, preserving other fields and units", () => {
  const store = memory();
  assert.equal(saveValuePreference("financingRate", 11.5, store).ok, true);
  assert.equal(saveValuePreference("entry", 180000, store).ok, true);
  assert.equal(saveValuePreference("termMonths", 300, store).ok, true);
  assert.deepEqual(readValuePreferences(store), { entry: 180000, financingRate: 11.5, termMonths: 300 });
  assert.deepEqual(resolveValuePreferences(readValuePreferences(store)), {
    ...DEFAULT_FINANCING_STATE, entry: 180000, financingRate: 11.5, termMonths: 300,
  });
  const saved = JSON.parse(store.getItem(VALUE_PREFERENCES_KEY)!);
  assert.equal(saved.version, 1);
  assert.equal("property" in saved.values, false);
  assert.equal("method" in saved.values, false);
});

test("property can be saved independently and zero is a valid default", () => {
  const store = memory();
  saveValuePreference("property", 0, store);
  saveValuePreference("financingRate", 0, store);
  assert.deepEqual(readValuePreferences(store), { property: 0, financingRate: 0 });
  const state = resolveValuePreferences(readValuePreferences(store));
  assert.equal(state.property, 0);
  assert.equal(state.entry, 0);
  assert.equal(state.financingRate, 0);
});

test("exact values and month units survive saving without slider rounding", () => {
  const store = memory();
  saveValuePreference("entry", 161234, store);
  saveValuePreference("financingRate", 9.25, store);
  saveValuePreference("termMonths", 301, store);
  const state = resolveValuePreferences(readValuePreferences(store));
  assert.equal(state.entry, 161234);
  assert.equal(state.financingRate, 9.25);
  assert.equal(state.termMonths, 301);
});

test("entry is capped at startup without overwriting an independently saved default", () => {
  const store = memory();
  saveValuePreference("entry", 900000, store);
  const preferences = readValuePreferences(store);
  const before = store.getItem(VALUE_PREFERENCES_KEY);
  const state = resolveValuePreferences(preferences);
  assert.equal(state.entry, DEFAULT_FINANCING_STATE.property);
  assert.equal(preferences.entry, 900000);
  assert.equal(store.getItem(VALUE_PREFERENCES_KEY), before);
  assert.equal(store.writes.length, 1);
});

test("saving and removing defaults do not change studies or range preferences", () => {
  const studies = "muda.financing.studies.v1";
  const store = memory({ [studies]: '[{"id":1}]', [RANGE_PREFERENCES_KEY]: '{"version":1,"ranges":{"property":{"min":200000,"max":900000}}}' });
  const before = [store.getItem(studies), store.getItem(RANGE_PREFERENCES_KEY)];
  saveValuePreference("entry", 50000, store);
  saveValuePreference("financingRate", 12, store);
  const result = removeValuePreference("entry", store);
  assert.deepEqual(result, { ok: true, preferences: { financingRate: 12 } });
  assert.equal(resolveValuePreferences(readValuePreferences(store)).entry, DEFAULT_FINANCING_STATE.entry);
  assert.deepEqual([store.getItem(studies), store.getItem(RANGE_PREFERENCES_KEY)], before);
  assert.ok(store.writes.every(key => key === VALUE_PREFERENCES_KEY));
});

test("new saves merge changes made by another tab rather than an old snapshot", () => {
  const store = memory();
  saveValuePreference("entry", 100000, store);
  const old = readValuePreferences(store);
  saveValuePreference("termMonths", 240, store);
  saveValuePreference("financingRate", 9, store);
  assert.deepEqual(old, { entry: 100000 });
  assert.deepEqual(readValuePreferences(store), { entry: 100000, financingRate: 9, termMonths: 240 });
});

test("invalid saves leave the previous persisted preferences unchanged", () => {
  const store = memory();
  saveValuePreference("entry", 100000, store);
  const before = store.getItem(VALUE_PREFERENCES_KEY);
  for (const value of [NaN, Infinity, -1, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(saveValuePreference("entry", value, store).ok, false);
  }
  assert.equal(saveValuePreference("financingRate", 21, store).ok, false);
  for (const value of [0, 11, 481, 24.5]) assert.equal(saveValuePreference("termMonths", value, store).ok, false);
  assert.equal(store.getItem(VALUE_PREFERENCES_KEY), before);
  assert.equal(store.writes.length, 1);
});

test("malformed, unsupported and invalid stored values are ignored without writes", () => {
  for (const raw of ["broken", "null", "[]", '{"version":2,"values":{"entry":10}}', '{"version":1,"values":[]}']) {
    const store = memory({ [VALUE_PREFERENCES_KEY]: raw });
    assert.deepEqual(readValuePreferences(store), {});
    assert.deepEqual(store.writes, []);
  }
  const store = memory({ [VALUE_PREFERENCES_KEY]: JSON.stringify({ version: 1, values: {
    entry: -1, property: "900000", termMonths: 600, financingRate: 11.5, fgtsSalary: 30000,
  } }) });
  assert.deepEqual(readValuePreferences(store), { financingRate: 11.5 });
  assert.deepEqual(store.writes, []);
});

test("blocked storage fails visibly and keeps prior values on failed save or removal", () => {
  const store = memory();
  saveValuePreference("entry", 150000, store);
  const blocked = { getItem: store.getItem, setItem: () => { throw Error("quota"); } };
  assert.equal(saveValuePreference("entry", 250000, blocked).ok, false);
  assert.equal(removeValuePreference("entry", blocked).ok, false);
  assert.deepEqual(readValuePreferences(store), { entry: 150000 });
  const unreadable = { getItem: () => { throw Error("blocked"); }, setItem: store.setItem };
  assert.deepEqual(readValuePreferences(unreadable), {});
  assert.equal(saveValuePreference("entry", 300000, unreadable).ok, false);
  assert.deepEqual(readValuePreferences(store), { entry: 150000 });
});

test("startup expands a saved range to include the saved value without persisting the expansion", () => {
  const store = memory({ [RANGE_PREFERENCES_KEY]: '{"version":1,"ranges":{"property":{"min":200000,"max":900000}}}' });
  saveValuePreference("property", 1500000, store);
  const state = resolveValuePreferences(readValuePreferences(store));
  const savedRange = readRangePreferences(store);
  const ranges = normalizeControlRanges(resolveRangePreferences(savedRange), state, false);
  assert.ok(ranges.property.min <= state.property && ranges.property.max >= state.property);
  assert.equal(savedRange.property?.max, 900000);
  assert.deepEqual(store.writes, [VALUE_PREFERENCES_KEY]);
});

test("simulation edits and study restoration do not autosave or reapply defaults", () => {
  const store = memory();
  saveValuePreference("financingRate", 11, store);
  const initial = resolveValuePreferences(readValuePreferences(store));
  const changed = updateFinancing(initial, { financingRate: 8, property: 900000 }, false);
  const study = updateFinancing(changed, { financingRate: 7, entry: 200000 }, false);
  assert.equal(study.financingRate, 7);
  assert.deepEqual(readValuePreferences(store), { financingRate: 11 });
  assert.equal(store.writes.length, 1);
});

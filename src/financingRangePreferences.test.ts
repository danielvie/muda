import test from 'node:test';
import assert from 'node:assert/strict';
import { RANGE_PREFERENCES_KEY, readRangePreferences, resolveRangePreferences, saveRangePreference, restoreRangePreference, validateRangePreference } from './financingRangePreferences.ts';
import { DEFAULT_CONTROL_RANGES, normalizeControlRanges, resetControlRange } from './financingGesture.ts';
import { updateFinancing, type FinancingState } from './financingControls.ts';

function memoryStorage() {
  const values = new Map<string, string>();
  const writes: string[] = [];
  return { values, writes, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { writes.push(key); values.set(key, value); } };
}
const state: FinancingState = { property: 800000, entry: 120000, financingRate: 10, termMonths: 420, fgtsSalary: 0, fgtsSalaryGrowth: 0, fgtsMode: 'PRAZO', method: 'SAC' };

test('no preference uses factory ranges without creating storage', () => {
  const store = memoryStorage();
  assert.deepEqual(readRangePreferences(store), {});
  assert.deepEqual(resolveRangePreferences(readRangePreferences(store)), DEFAULT_CONTROL_RANGES);
  assert.deepEqual(store.writes, []);
});
test('an explicit command saves only the selected field and survives a new read', () => {
  const store = memoryStorage();
  const result = saveRangePreference('property', { min: 500000, max: 1200000 }, store);
  assert.ok(result.ok);
  assert.deepEqual(result.preferences, { property: { min: 500000, max: 1200000 } });
  assert.deepEqual(readRangePreferences(store), result.preferences);
  assert.deepEqual(store.writes, [RANGE_PREFERENCES_KEY]);
  assert.deepEqual(resolveRangePreferences(readRangePreferences(store)).financingRate, DEFAULT_CONTROL_RANGES.financingRate);
});
test('range exploration and reset do not persist anything', () => {
  const store = memoryStorage();
  saveRangePreference('property', { min: 500000, max: 1200000 }, store);
  const preferences = readRangePreferences(store);
  const defaults = resolveRangePreferences(preferences);
  const before = store.getItem(RANGE_PREFERENCES_KEY);
  const writes = store.writes.length;
  normalizeControlRanges({ ...defaults, property: { min: 750000, max: 900000 } }, state, false);
  resetControlRange('property', state, false, defaults);
  assert.equal(store.getItem(RANGE_PREFERENCES_KEY), before);
  assert.equal(store.writes.length, writes);
});
test('invalid limits are rejected without changing previous preferences', () => {
  const store = memoryStorage();
  saveRangePreference('property', { min: 500000, max: 1200000 }, store);
  const previous = store.getItem(RANGE_PREFERENCES_KEY);
  for (const bounds of [{ min: 900000, max: 500000 }, { min: 0, max: 0 }, { min: -1, max: 2 }, { min: NaN, max: 1000 }, { min: 0, max: Infinity }, { min: 1.123, max: 500000 }]) {
    assert.equal(saveRangePreference('property', bounds, store).ok, false);
    assert.equal(store.getItem(RANGE_PREFERENCES_KEY), previous);
  }
  assert.equal(store.writes.length, 1);
});
test('range preferences use static field limits, not the current simulation', () => {
  assert.equal(validateRangePreference('entry', { min: 0, max: 5000000 }), null);
  assert.ok(validateRangePreference('financingRate', { min: 0, max: 21 }));
  assert.ok(validateRangePreference('termMonths', { min: 0, max: 40 }));
  assert.ok(validateRangePreference('termMonths', { min: 1, max: 41 }));
  assert.ok(validateRangePreference('termMonths', { min: 1.5, max: 40 }));
});
test('restoring one factory default preserves other saved fields', () => {
  const store = memoryStorage();
  saveRangePreference('property', { min: 500000, max: 1200000 }, store);
  saveRangePreference('financingRate', { min: 8, max: 12 }, store);
  const result = restoreRangePreference('property', store);
  assert.ok(result.ok);
  assert.deepEqual(result.preferences, { financingRate: { min: 8, max: 12 } });
  assert.deepEqual(resolveRangePreferences(result.preferences).property, DEFAULT_CONTROL_RANGES.property);
  assert.deepEqual(readRangePreferences(store).financingRate, { min: 8, max: 12 });
});
test('writes fail visibly and retain the previous preference', () => {
  const previous = JSON.stringify({ version: 1, ranges: { property: { min: 500000, max: 1200000 } } });
  const store = { getItem: () => previous, setItem: () => { throw new Error('quota'); } };
  assert.equal(saveRangePreference('property', { min: 0, max: 900000 }, store).ok, false);
  assert.equal(restoreRangePreference('property', store).ok, false);
  assert.deepEqual(readRangePreferences(store), { property: { min: 500000, max: 1200000 } });
});
test('blocked storage is safe to read and fails closed on writes', () => {
  let writes = 0;
  const store = { getItem: (): string | null => { throw new Error('blocked'); }, setItem: () => { writes++; } };
  assert.deepEqual(readRangePreferences(store), {});
  assert.equal(saveRangePreference('property', { min: 0, max: 1000000 }, store).ok, false);
  assert.equal(writes, 0);
});
test('malformed or unsupported documents never trigger writes', () => {
  const store = memoryStorage();
  for (const raw of ['not json', 'null', '[]', '{"version":2,"ranges":{}}', '{"version":1,"ranges":[]}']) {
    store.values.set(RANGE_PREFERENCES_KEY, raw);
    assert.deepEqual(readRangePreferences(store), {});
  }
  assert.equal(store.writes.length, 0);
});
test('invalid saved fields are ignored without losing valid fields', () => {
  const store = memoryStorage();
  store.values.set(RANGE_PREFERENCES_KEY, JSON.stringify({ version: 1, ranges: { property: { min: 500000, max: 1200000 }, entry: { min: '0', max: 900000 }, financingRate: { min: 10, max: 5 }, unknown: { min: 0, max: 10 } } }));
  assert.deepEqual(readRangePreferences(store), { property: { min: 500000, max: 1200000 } });
  assert.equal(store.writes.length, 0);
});
test('startup and reset include the current value without overwriting the saved range', () => {
  const saved = { property: { min: 300000, max: 600000 } };
  const defaults = resolveRangePreferences(saved);
  const range = resetControlRange('property', state, false, defaults);
  assert.deepEqual(range, { min: 300000, max: 800000 });
  assert.deepEqual(saved.property, { min: 300000, max: 600000 });
  assert.equal(state.property, 800000);
  const high = updateFinancing(state, { property: 1741000 }, true);
  const preferredEntry = resolveRangePreferences({ entry: { min: 0, max: 200000 } });
  assert.equal(resetControlRange('entry', high, true, preferredEntry).min, 348200);
  assert.deepEqual(preferredEntry.entry, { min: 0, max: 200000 });
});
test('commands merge other fields from the latest stored document and leave studies alone', () => {
  const store = memoryStorage();
  const studiesKey = 'muda.financing.studies.v1';
  store.values.set(studiesKey, '[{"id":1}]');
  saveRangePreference('property', { min: 300000, max: 900000 }, store);
  saveRangePreference('entry', { min: 0, max: 300000 }, store);
  assert.deepEqual(readRangePreferences(store), { property: { min: 300000, max: 900000 }, entry: { min: 0, max: 300000 } });
  assert.equal(store.getItem(studiesKey), '[{"id":1}]');
  assert.ok(store.writes.every(key => key === RANGE_PREFERENCES_KEY));
});

import test from "node:test";
import assert from "node:assert/strict";
import { ENVIRONMENT_PREFERENCE_KEY, readEnvironmentPreference, saveEnvironmentPreference, type Environment } from "./environmentPreference.ts";

test("startup defaults to financing without persisting a tab", () => {
  let writes = 0;
  assert.equal(readEnvironmentPreference({ getItem: () => null, setItem: () => { writes++; } }), "financing");
  assert.equal(writes, 0);
});
test("remembers all three environments without persisting simulation fields", () => {
  const data = new Map<string, string>([["muda:fields", "unchanged"]]);
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
  for (const tab of ["investment", "comparison", "financing"] as const) {
    assert.equal(saveEnvironmentPreference(tab, storage).ok, true);
    assert.equal(readEnvironmentPreference(storage), tab);
  }
  assert.deepEqual([...data.keys()], ["muda:fields", ENVIRONMENT_PREFERENCE_KEY]);
  assert.equal(data.get("muda:fields"), "unchanged");
});
test("corrupt or unknown tab preferences fall back safely", () => {
  for (const raw of ["garbage", "null", "[]", '{"version":1,"environment":"unknown"}', '{"version":2,"environment":"investment"}']) {
    assert.equal(readEnvironmentPreference({ getItem: () => raw, setItem: () => assert.fail("unexpected write") }), "financing");
  }
  assert.equal(saveEnvironmentPreference("unknown" as Environment, { getItem: () => null, setItem: () => assert.fail("unexpected write") }).ok, false);
});
test("storage failures do not throw or require navigation to be blocked", () => {
  const storage = { getItem: () => { throw Error("blocked"); }, setItem: () => { throw Error("blocked"); } };
  assert.equal(readEnvironmentPreference(storage), "financing");
  assert.equal(saveEnvironmentPreference("investment", storage).ok, false);
});

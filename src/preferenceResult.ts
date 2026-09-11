/** UI callbacks only need success or a user-facing error, not a storage schema. */
export type PreferenceActionResult = { ok: true } | { ok: false; error: string };

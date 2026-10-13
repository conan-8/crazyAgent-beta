// Lifetime usage totals (every finished run, this profile) shown in Settings.
import type { RunStats } from "../shared/protocol";

const KEY = "baLifetime";

/** Cumulative tokens and wall-clock time across all finished agent runs. */
export interface LifetimeStats {
  totalTokens: number;
  elapsedMs: number;
}

export const EMPTY_LIFETIME: LifetimeStats = { totalTokens: 0, elapsedMs: 0 };

/** Coerce a stored object: junk or missing numbers must read as zero, never NaN. */
export function normalizeLifetime(stored: unknown): LifetimeStats {
  const raw = (stored && typeof stored === "object" ? stored : {}) as Partial<LifetimeStats>;
  const num = (v: unknown): number =>
    typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
  return { totalTokens: num(raw.totalTokens), elapsedMs: num(raw.elapsedMs) };
}

export async function loadLifetime(): Promise<LifetimeStats> {
  const out = await chrome.storage.local.get(KEY);
  return normalizeLifetime(out[KEY]);
}

/** Fold one finished run's stats into the persisted lifetime totals. */
export async function addRunStats(stats: RunStats): Promise<LifetimeStats> {
  const cur = await loadLifetime();
  const next: LifetimeStats = {
    totalTokens: cur.totalTokens + Math.max(0, Math.floor(stats.totalTokens)),
    elapsedMs: cur.elapsedMs + Math.max(0, Math.floor(stats.elapsedMs)),
  };
  await chrome.storage.local.set({ [KEY]: next });
  return next;
}

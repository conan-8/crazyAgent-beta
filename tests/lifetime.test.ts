// Lifetime usage totals in chrome.storage.local (Settings → Statistics).
import { beforeEach, describe, expect, it } from "vitest";
import {
  addRunStats,
  loadLifetime,
  normalizeLifetime,
} from "../extension/src/background/lifetime";

const LIFETIME_KEY = "baLifetime";

const store = new Map<string, unknown>();

beforeEach(() => {
  store.clear();
  (globalThis as { chrome?: unknown }).chrome = {
    storage: {
      local: {
        get: async (key: string) => (store.has(key) ? { [key]: store.get(key) } : {}),
        set: async (obj: Record<string, unknown>) => {
          for (const [k, v] of Object.entries(obj)) store.set(k, v);
        },
      },
    },
  };
});

const run = (totalTokens: number, elapsedMs: number) =>
  ({ totalTokens, elapsedMs }) as Parameters<typeof addRunStats>[0];

describe("lifetime stats", () => {
  it("reads zeros before any run is recorded", async () => {
    expect(await loadLifetime()).toEqual({ totalTokens: 0, elapsedMs: 0 });
  });

  it("accumulates tokens and runtime across runs", async () => {
    await addRunStats(run(12_000, 60_000));
    await addRunStats(run(3_500, 250_000));
    expect(store.get(LIFETIME_KEY)).toEqual({ totalTokens: 15_500, elapsedMs: 310_000 });
    expect(await loadLifetime()).toEqual({ totalTokens: 15_500, elapsedMs: 310_000 });
  });

  it("survives junk in storage without producing NaN totals", async () => {
    store.set(LIFETIME_KEY, { totalTokens: "lots", elapsedMs: Number.NaN });
    await addRunStats(run(100, 1_000));
    expect(await loadLifetime()).toEqual({ totalTokens: 100, elapsedMs: 1_000 });
  });

  it("normalises junk to zeros for display", () => {
    expect(normalizeLifetime(undefined)).toEqual({ totalTokens: 0, elapsedMs: 0 });
    expect(normalizeLifetime({ totalTokens: -5, elapsedMs: Infinity })).toEqual({
      totalTokens: 0,
      elapsedMs: 0,
    });
  });
});

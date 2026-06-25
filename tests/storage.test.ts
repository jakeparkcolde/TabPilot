import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../src/lib/constants";
import {
  appendHistory,
  clearHistory,
  getStoredAutoCleanupStatus,
  getHistory,
  isOnboardingComplete,
  sanitizeSettings,
  setOnboardingComplete,
  setStoredAutoCleanupStatus,
} from "../src/lib/storage";
import type { CleanupHistoryEntry } from "../src/lib/types";

let store: Record<string, unknown>;

beforeEach(() => {
  store = {};
  vi.stubGlobal("chrome", {
    storage: {
      local: {
        get: vi.fn((key: string) => Promise.resolve({ [key]: store[key] })),
        set: vi.fn((values: Record<string, unknown>) => {
          Object.assign(store, values);
          return Promise.resolve();
        }),
        remove: vi.fn((key: string) => {
          delete store[key];
          return Promise.resolve();
        }),
      },
      session: {
        get: vi.fn((key: string) => Promise.resolve({ [key]: store[key] })),
        set: vi.fn((values: Record<string, unknown>) => {
          Object.assign(store, values);
          return Promise.resolve();
        }),
        remove: vi.fn((key: string) => {
          delete store[key];
          return Promise.resolve();
        }),
      },
    },
  });
});

describe("sanitizeSettings", () => {
  it("returns defaults for invalid input", () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it("clamps numeric settings to supported ranges", () => {
    expect(
      sanitizeSettings({
        inactivityThresholdMinutes: 1,
        maxTabsPerCleanup: 99,
        autoCleanupEnabled: true,
        autoCleanupIntervalMinutes: 7,
        lowMemoryThresholdPercent: 99,
        popupLayout: "b",
        theme: "light",
        protectedDomains: [],
      }),
    ).toMatchObject({
      inactivityThresholdMinutes: 15,
      maxTabsPerCleanup: 20,
      autoCleanupEnabled: true,
      autoCleanupIntervalMinutes: 30,
      lowMemoryThresholdPercent: 50,
      popupLayout: "b",
      theme: "light",
    });
  });

  it("normalizes and removes invalid protected domains", () => {
    expect(
      sanitizeSettings({
        inactivityThresholdMinutes: 60,
        maxTabsPerCleanup: 5,
        autoCleanupEnabled: false,
        autoCleanupIntervalMinutes: 30,
        popupLayout: "a",
        protectedDomains: [
          "Example.com",
          "example.com",
          "*.invalid.test",
          "https://docs.example.com",
        ],
      }).protectedDomains,
    ).toEqual(["docs.example.com", "example.com"]);
  });

  it("recovers individual invalid fields without dropping valid fields", () => {
    expect(
      sanitizeSettings({
        inactivityThresholdMinutes: Number.NaN,
        maxTabsPerCleanup: 8,
        autoCleanupEnabled: "yes",
        autoCleanupIntervalMinutes: 60,
        lowMemoryThresholdPercent: 20,
        popupLayout: "invalid",
        theme: "invalid",
        protectedDomains: "not-an-array",
      }),
    ).toEqual({
      ...DEFAULT_SETTINGS,
      maxTabsPerCleanup: 8,
      autoCleanupIntervalMinutes: 60,
      lowMemoryThresholdPercent: 20,
    });
  });
});

describe("cleanup history storage", () => {
  it("prepends entries and limits history to 100 records", async () => {
    store.cleanupHistory = Array.from({ length: 100 }, (_, index) =>
      makeHistoryEntry(`old-${index}`, index),
    );
    const newest = makeHistoryEntry("newest", 200);

    await appendHistory([newest]);
    const history = await getHistory();

    expect(history).toHaveLength(100);
    expect(history[0]?.id).toBe("newest");
    expect(history.some((entry) => entry.id === "old-99")).toBe(false);
  });

  it("filters malformed records while reading", async () => {
    store.cleanupHistory = [
      makeHistoryEntry("valid", 1),
      { id: "invalid" },
      null,
    ];

    expect(await getHistory()).toEqual([
      expect.objectContaining({ id: "valid" }),
    ]);
  });

  it("keeps automatic cleanup records", async () => {
    store.cleanupHistory = [
      { ...makeHistoryEntry("automatic", 2), trigger: "automatic" },
    ];

    expect(await getHistory()).toEqual([
      expect.objectContaining({ id: "automatic", trigger: "automatic" }),
    ]);
  });

  it("clears all cleanup history", async () => {
    store.cleanupHistory = [makeHistoryEntry("valid", 1)];

    await clearHistory();

    expect(await getHistory()).toEqual([]);
  });
});

describe("automatic cleanup status storage", () => {
  it("stores the latest automatic cleanup check result", async () => {
    await setStoredAutoCleanupStatus({
      lastCheckedAt: 1234,
      outcome: "memory-above-threshold",
      availableMemoryPercent: 31.2,
      candidateCount: null,
      cleanedCount: 0,
    });

    expect(await getStoredAutoCleanupStatus()).toEqual({
      lastCheckedAt: 1234,
      outcome: "memory-above-threshold",
      availableMemoryPercent: 31.2,
      candidateCount: null,
      cleanedCount: 0,
    });
  });

  it("recovers an invalid automatic cleanup status", async () => {
    store.autoCleanupStatus = { outcome: "invalid" };

    expect(await getStoredAutoCleanupStatus()).toEqual({
      lastCheckedAt: null,
      outcome: "never-checked",
      availableMemoryPercent: null,
      candidateCount: null,
      cleanedCount: 0,
    });
  });
});

describe("onboarding storage", () => {
  it("tracks onboarding completion", async () => {
    expect(await isOnboardingComplete()).toBe(false);
    await setOnboardingComplete();
    expect(await isOnboardingComplete()).toBe(true);
  });
});

function makeHistoryEntry(id: string, tabId: number): CleanupHistoryEntry {
  return {
    id,
    tabId,
    title: `Tab ${tabId}`,
    domain: "example.com",
    urlKind: "web",
    discardedAt: Date.now(),
    inactiveMinutes: 120,
    reasonCodes: ["inactive-over-threshold"],
    trigger: "bulk-manual",
    result: "success",
  };
}

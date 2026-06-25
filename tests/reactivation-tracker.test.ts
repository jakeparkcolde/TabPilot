import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  handleTabRemoved,
  handleTabUpdated,
} from "../src/background/reactivation-tracker";
import type { CleanupHistoryEntry } from "../src/lib/types";

let localStore: Record<string, unknown>;
let sessionStore: Record<string, unknown>;

beforeEach(() => {
  localStore = {
    cleanupHistory: [makeHistoryEntry()],
  };
  sessionStore = {
    reactivationIndex: { tabIds: [42] },
  };

  vi.stubGlobal("chrome", {
    storage: {
      local: createStorageArea(() => localStore),
      session: createStorageArea(() => sessionStore),
    },
  });
});

describe("reactivation tracker", () => {
  it("marks a successful cleanup record when a discarded tab reloads", async () => {
    await handleTabUpdated(42, { discarded: false });

    const history = localStore.cleanupHistory as CleanupHistoryEntry[];
    expect(history[0]?.reactivatedAt).toEqual(expect.any(Number));
    expect(sessionStore.reactivationIndex).toEqual({ tabIds: [] });
  });

  it("ignores unrelated tab updates", async () => {
    await handleTabUpdated(42, {});

    const history = localStore.cleanupHistory as CleanupHistoryEntry[];
    expect(history[0]?.reactivatedAt).toBeUndefined();
    expect(sessionStore.reactivationIndex).toEqual({ tabIds: [42] });
  });

  it("ignores tabs that were not discarded by TabPilot", async () => {
    await handleTabUpdated(99, { discarded: false });

    const history = localStore.cleanupHistory as CleanupHistoryEntry[];
    expect(history[0]?.reactivatedAt).toBeUndefined();
  });

  it("removes tracking when the tab is closed", async () => {
    await handleTabRemoved(42);

    expect(sessionStore.reactivationIndex).toEqual({ tabIds: [] });
    const history = localStore.cleanupHistory as CleanupHistoryEntry[];
    expect(history[0]?.reactivatedAt).toBeUndefined();
  });
});

function makeHistoryEntry(): CleanupHistoryEntry {
  return {
    id: "history-1",
    tabId: 42,
    title: "Example",
    domain: "example.com",
    urlKind: "web",
    discardedAt: Date.now() - 60_000,
    inactiveMinutes: 120,
    reasonCodes: ["inactive-over-threshold"],
    trigger: "bulk-manual",
    result: "success",
  };
}

function createStorageArea(getStore: () => Record<string, unknown>): {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
} {
  return {
    get: vi.fn((key: string) => Promise.resolve({ [key]: getStore()[key] })),
    set: vi.fn((values: Record<string, unknown>) => {
      Object.assign(getStore(), values);
      return Promise.resolve();
    }),
    remove: vi.fn((key: string) => {
      delete getStore()[key];
      return Promise.resolve();
    }),
  };
}

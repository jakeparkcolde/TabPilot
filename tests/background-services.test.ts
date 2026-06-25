import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  discardSelected,
  runSafeCleanup,
} from "../src/background/cleanup-engine";
import { getDashboard } from "../src/background/dashboard";
import { DEFAULT_SETTINGS } from "../src/lib/constants";

interface MockTab {
  id: number;
  windowId: number;
  index: number;
  url: string;
  title: string;
  active: boolean;
  pinned: boolean;
  audible: boolean;
  discarded: boolean;
  status: "loading" | "complete";
  lastAccessed: number;
}

const now = Date.now();
let tabs: MockTab[];
let localStore: Record<string, unknown>;
let sessionStore: Record<string, unknown>;
let getTabMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  tabs = [
    makeTab({ id: 1, active: true, lastAccessed: now }),
    makeTab({ id: 2, index: 1, lastAccessed: now - 2 * 60 * 60_000 }),
    makeTab({
      id: 3,
      index: 2,
      url: "https://docs.google.com/document/1",
      lastAccessed: now - 8 * 60 * 60_000,
    }),
  ];
  localStore = { settings: DEFAULT_SETTINGS };
  sessionStore = {};
  getTabMock = vi.fn((tabId: number) => {
    const tab = tabs.find((item) => item.id === tabId);
    return tab
      ? Promise.resolve({ ...tab })
      : Promise.reject(new Error("No tab"));
  });

  vi.stubGlobal("chrome", {
    windows: {
      WINDOW_ID_NONE: -1,
      getLastFocused: vi.fn(() => Promise.resolve({ id: 1 })),
    },
    tabs: {
      query: vi.fn(() => Promise.resolve(tabs.map((tab) => ({ ...tab })))),
      get: getTabMock,
      discard: vi.fn((tabId: number) => {
        const tab = tabs.find((item) => item.id === tabId);
        if (!tab) return Promise.reject(new Error("No tab"));
        tab.discarded = true;
        return Promise.resolve({ ...tab });
      }),
    },
    storage: {
      local: createStorageArea(() => localStore),
      session: createStorageArea(() => sessionStore),
    },
    system: {
      memory: {
        getInfo: vi.fn(() =>
          Promise.resolve({
            capacity: 16 * 1024 ** 3,
            availableCapacity: 4 * 1024 ** 3,
          }),
        ),
      },
    },
    action: {
      setBadgeText: vi.fn(() => Promise.resolve()),
      setBadgeBackgroundColor: vi.fn(() => Promise.resolve()),
      setTitle: vi.fn(() => Promise.resolve()),
    },
  });
});

describe("background services", () => {
  it("builds a dashboard from real policy evaluations", async () => {
    const dashboard = await getDashboard();

    expect(dashboard).toMatchObject({
      totalTabs: 3,
      discardedTabs: 0,
      candidateTabs: 1,
      cleanupLimit: 5,
      protectedTabs: 1,
      lastMemorySavings: null,
      estimatedCleanupBytes: null,
    });
    expect(dashboard.candidates.map((tab) => tab.tabId)).toEqual([2]);
    expect(dashboard.tabs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tabId: 1,
          active: true,
          eligible: false,
        }),
        expect.objectContaining({
          tabId: 2,
          eligible: true,
          sessionProtected: false,
          domainProtected: false,
        }),
        expect.objectContaining({
          tabId: 3,
          domainProtected: true,
        }),
      ]),
    );
    expect(dashboard.discarded).toEqual([]);
    expect(dashboard.memory?.availableRatio).toBe(0.25);
  });

  it("lists discarded tabs separately from cleanup candidates", async () => {
    tabs.push(
      makeTab({
        id: 4,
        index: 3,
        title: "Sleeping tab",
        discarded: true,
      }),
    );

    const dashboard = await getDashboard();

    expect(dashboard.discardedTabs).toBe(1);
    expect(dashboard.discarded).toEqual([
      expect.objectContaining({
        tabId: 4,
        title: "Sleeping tab",
        hostname: "example.com",
      }),
    ]);
    expect(dashboard.candidates.map((tab) => tab.tabId)).not.toContain(4);
  });

  it("estimates cleanup capacity from the most recent measured cleanup", async () => {
    sessionStore.lastMemorySavings = {
      reclaimedBytes: 400 * 1024 ** 2,
      measuredAt: now,
      discardedTabs: 2,
    };

    const dashboard = await getDashboard();

    expect(dashboard.estimatedCleanupBytes).toBe(200 * 1024 ** 2);
  });

  it("discards only eligible tabs and stores history", async () => {
    const result = await runSafeCleanup();

    expect(result).toMatchObject({
      requestedCount: 1,
      successCount: 1,
      skippedCount: 0,
      failedCount: 0,
    });
    expect(tabs.find((tab) => tab.id === 2)?.discarded).toBe(true);
    expect(localStore.cleanupHistory).toEqual([
      expect.objectContaining({
        tabId: 2,
        result: "success",
        trigger: "bulk-manual",
      }),
    ]);
  });

  it("skips a tab that becomes active before discard", async () => {
    getTabMock.mockImplementation((tabId: number) => {
      const tab = tabs.find((item) => item.id === tabId);
      return tab
        ? Promise.resolve({ ...tab, active: tabId === 2 })
        : Promise.reject(new Error("No tab"));
    });

    const result = await runSafeCleanup();

    expect(result.successCount).toBe(0);
    expect(result.skippedCount).toBe(1);
    expect(result.items[0]?.errorCode).toBe("no-longer-eligible");
    expect(chrome.tabs.discard).not.toHaveBeenCalled();
  });

  it("honors the configured maximum cleanup count", async () => {
    tabs.push(
      makeTab({ id: 4, index: 3, lastAccessed: now - 3 * 60 * 60_000 }),
      makeTab({ id: 5, index: 4, lastAccessed: now - 4 * 60 * 60_000 }),
    );
    localStore.settings = { ...DEFAULT_SETTINGS, maxTabsPerCleanup: 2 };

    const result = await runSafeCleanup();

    expect(result.requestedCount).toBe(2);
    expect(result.successCount).toBe(2);
    expect(chrome.tabs.discard).toHaveBeenCalledTimes(2);
  });

  it("discards only explicitly selected eligible tabs", async () => {
    tabs.push(
      makeTab({ id: 4, index: 3, lastAccessed: now - 3 * 60 * 60_000 }),
    );

    const result = await discardSelected([4]);

    expect(result.successCount).toBe(1);
    expect(chrome.tabs.discard).toHaveBeenCalledWith(4);
    expect(chrome.tabs.discard).not.toHaveBeenCalledWith(2);
  });
});

function makeTab(overrides: Partial<MockTab>): MockTab {
  return {
    id: 1,
    windowId: 1,
    index: 0,
    url: "https://example.com",
    title: "Example",
    active: false,
    pinned: false,
    audible: false,
    discarded: false,
    status: "complete",
    lastAccessed: now - 120 * 60_000,
    ...overrides,
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

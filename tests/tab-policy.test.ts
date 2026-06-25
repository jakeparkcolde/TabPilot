import { describe, expect, it } from "vitest";
import { evaluateTab, rankEligibleTabs } from "../src/background/tab-policy";
import { DEFAULT_SETTINGS } from "../src/lib/constants";
import type { TabSnapshot } from "../src/lib/types";

const NOW = Date.UTC(2026, 5, 24, 12);

function makeTab(overrides: Partial<TabSnapshot> = {}): TabSnapshot {
  return {
    id: 1,
    windowId: 1,
    index: 0,
    url: "https://example.com/article",
    title: "Example",
    active: false,
    pinned: false,
    audible: false,
    discarded: false,
    status: "complete",
    lastAccessed: NOW - 120 * 60_000,
    isInBackgroundWindow: false,
    ...overrides,
  };
}

const context = {
  now: NOW,
  settings: DEFAULT_SETTINGS,
  protectedTabIds: new Set<number>(),
};

describe("evaluateTab", () => {
  it.each([
    ["active", { active: true }, "active"],
    ["pinned", { pinned: true }, "pinned"],
    ["audible", { audible: true }, "audible"],
    ["loading", { status: "loading" as const }, "loading"],
    ["discarded", { discarded: true }, "discarded"],
  ])("excludes %s tabs", (_name, overrides, expectedCode) => {
    const result = evaluateTab(makeTab(overrides), context);
    expect(result.eligible).toBe(false);
    expect(result.exclusionCodes).toContain(expectedCode);
  });

  it("excludes session-protected tabs", () => {
    const result = evaluateTab(makeTab(), {
      ...context,
      protectedTabIds: new Set([1]),
    });
    expect(result.exclusionCodes).toContain("session-protected");
  });

  it("excludes protected domains and their subdomains", () => {
    const result = evaluateTab(
      makeTab({ url: "https://canvas.docs.google.com/edit" }),
      context,
    );
    expect(result.exclusionCodes).toContain("domain-protected");
  });

  it("excludes tabs below the inactivity threshold", () => {
    const result = evaluateTab(
      makeTab({ lastAccessed: NOW - 59 * 60_000 }),
      context,
    );
    expect(result.exclusionCodes).toContain("below-inactivity-threshold");
  });

  it("accepts a tab exactly at the inactivity threshold", () => {
    const result = evaluateTab(
      makeTab({ lastAccessed: NOW - 60 * 60_000 }),
      context,
    );
    expect(result.eligible).toBe(true);
    expect(result.reasonCodes).toContain("inactive-over-threshold");
  });

  it("excludes unsupported URLs and missing last access timestamps", () => {
    const tab = makeTab({ url: "chrome://settings" });
    delete tab.lastAccessed;

    const result = evaluateTab(tab, context);
    expect(result.exclusionCodes).toEqual(
      expect.arrayContaining(["unsupported-url", "missing-last-accessed"]),
    );
  });
});

describe("rankEligibleTabs", () => {
  it("ranks older tabs first and excludes unsafe tabs", () => {
    const ranked = rankEligibleTabs(
      [
        makeTab({ id: 1, lastAccessed: NOW - 2 * 60 * 60_000 }),
        makeTab({ id: 2, lastAccessed: NOW - 8 * 60 * 60_000 }),
        makeTab({ id: 3, active: true, lastAccessed: NOW - 12 * 60 * 60_000 }),
      ],
      context,
    );

    expect(ranked.map(({ tab }) => tab.id)).toEqual([2, 1]);
  });

  it("adds a small background-window ranking bonus", () => {
    const ranked = rankEligibleTabs(
      [
        makeTab({
          id: 1,
          lastAccessed: NOW - 120 * 60_000,
          isInBackgroundWindow: false,
        }),
        makeTab({
          id: 2,
          lastAccessed: NOW - 100 * 60_000,
          isInBackgroundWindow: true,
        }),
      ],
      context,
    );

    expect(ranked[0]?.tab.id).toBe(2);
  });
});

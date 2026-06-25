import { inspectUrl } from "../lib/domain";
import {
  getLastMemorySavings,
  getSessionProtection,
  getSettings,
} from "../lib/storage";
import type { DashboardData, MemorySnapshot } from "../lib/types";
import { queryTabSnapshots } from "./tab-adapter";
import { evaluateTab, rankEligibleTabs } from "./tab-policy";

export async function getDashboard(): Promise<DashboardData> {
  const [tabs, settings, protection, memory, lastMemorySavings] =
    await Promise.all([
      queryTabSnapshots(),
      getSettings(),
      getSessionProtection(),
      getMemorySnapshot(),
      getLastMemorySavings(),
    ]);
  const protectedTabIds = new Set(protection.protectedTabIds);
  const context = { now: Date.now(), settings, protectedTabIds };
  const ranked = rankEligibleTabs(tabs, context);
  const estimatedCleanupTabs = Math.min(
    ranked.length,
    settings.maxTabsPerCleanup,
  );
  const estimatedCleanupBytes =
    lastMemorySavings &&
    lastMemorySavings.discardedTabs > 0 &&
    lastMemorySavings.reclaimedBytes > 0
      ? Math.round(
          (lastMemorySavings.reclaimedBytes / lastMemorySavings.discardedTabs) *
            estimatedCleanupTabs,
        )
      : null;
  const protectedTabs = tabs.filter((tab) => {
    const evaluation = evaluateTab(tab, context);
    return evaluation.exclusionCodes.some(
      (code) => code === "session-protected" || code === "domain-protected",
    );
  }).length;
  const managedTabs = tabs
    .filter((tab) => tab.id !== undefined)
    .map((tab) => {
      const evaluation = evaluateTab(tab, context);
      return {
        tabId: tab.id as number,
        windowId: tab.windowId,
        title: tab.title ?? "제목 없는 탭",
        hostname: inspectUrl(tab.url).hostname,
        favIconUrl: tab.favIconUrl ?? null,
        inactiveMinutes: evaluation.inactiveMinutes,
        reasonCodes: evaluation.reasonCodes,
        exclusionCodes: evaluation.exclusionCodes,
        score: evaluation.score,
        active: tab.active,
        pinned: tab.pinned,
        audible: tab.audible ?? false,
        loading: tab.status === "loading",
        discarded: tab.discarded,
        eligible: evaluation.eligible,
        sessionProtected: protectedTabIds.has(tab.id as number),
        domainProtected: evaluation.exclusionCodes.includes("domain-protected"),
      };
    })
    .sort((left, right) => {
      if (left.windowId !== right.windowId) {
        return left.windowId - right.windowId;
      }
      if (left.active !== right.active) {
        return left.active ? -1 : 1;
      }
      return left.title.localeCompare(right.title, "ko");
    });

  return {
    totalTabs: tabs.length,
    discardedTabs: tabs.filter((tab) => tab.discarded).length,
    candidateTabs: ranked.length,
    cleanupLimit: settings.maxTabsPerCleanup,
    protectedTabs,
    memory,
    lastMemorySavings,
    estimatedCleanupBytes,
    tabs: managedTabs,
    candidates: ranked.map(({ tab, evaluation }) => ({
      tabId: tab.id as number,
      title: tab.title ?? "제목 없는 탭",
      hostname: inspectUrl(tab.url).hostname,
      favIconUrl: tab.favIconUrl ?? null,
      inactiveMinutes: evaluation.inactiveMinutes,
      reasonCodes: evaluation.reasonCodes,
      score: evaluation.score,
    })),
    discarded: tabs
      .filter((tab) => tab.discarded && tab.id !== undefined)
      .map((tab) => ({
        tabId: tab.id as number,
        title: tab.title ?? "제목 없는 탭",
        hostname: inspectUrl(tab.url).hostname,
        favIconUrl: tab.favIconUrl ?? null,
        inactiveMinutes: tab.lastAccessed
          ? Math.max(0, Math.floor((Date.now() - tab.lastAccessed) / 60_000))
          : null,
        reasonCodes: [],
        score: 0,
      })),
  };
}

async function getMemorySnapshot(): Promise<MemorySnapshot | null> {
  try {
    const info = await chrome.system.memory.getInfo();
    return {
      capacityBytes: info.capacity,
      availableCapacityBytes: info.availableCapacity,
      availableRatio:
        info.capacity > 0 ? info.availableCapacity / info.capacity : 0,
      measuredAt: Date.now(),
    };
  } catch {
    return null;
  }
}

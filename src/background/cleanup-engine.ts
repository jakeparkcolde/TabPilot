import { inspectUrl } from "../lib/domain";
import {
  addReactivationTracking,
  appendHistory,
  getSessionProtection,
  getSettings,
} from "../lib/storage";
import type {
  CleanupErrorCode,
  CleanupHistoryEntry,
  CleanupResult,
  CleanupResultItem,
  CleanupTrigger,
  Settings,
  TabEvaluation,
  TabSnapshot,
} from "../lib/types";
import { evaluateTab, rankEligibleTabs } from "./tab-policy";
import { getTabSnapshot, queryTabSnapshots } from "./tab-adapter";

export async function runSafeCleanup(
  trigger: Extract<CleanupTrigger, "bulk-manual" | "automatic"> = "bulk-manual",
): Promise<CleanupResult> {
  const [tabs, settings, sessionProtection] = await Promise.all([
    queryTabSnapshots(),
    getSettings(),
    getSessionProtection(),
  ]);
  const context = {
    now: Date.now(),
    settings,
    protectedTabIds: new Set(sessionProtection.protectedTabIds),
  };
  const selected = rankEligibleTabs(tabs, context).slice(
    0,
    settings.maxTabsPerCleanup,
  );

  return discardSelectedTabs(
    selected.map(({ tab }) => tab),
    settings,
    context.protectedTabIds,
    trigger,
  );
}

export async function discardOne(tabId: number): Promise<CleanupResult> {
  const [tab, settings, sessionProtection] = await Promise.all([
    getTabSnapshot(tabId),
    getSettings(),
    getSessionProtection(),
  ]);

  if (!tab) {
    return {
      requestedCount: 1,
      successCount: 0,
      skippedCount: 1,
      failedCount: 0,
      items: [
        {
          tabId,
          title: "닫힌 탭",
          status: "skipped",
          errorCode: "tab-not-found",
        },
      ],
    };
  }

  return discardSelectedTabs(
    [tab],
    settings,
    new Set(sessionProtection.protectedTabIds),
    "single-manual",
  );
}

export async function discardSelected(
  tabIds: number[],
): Promise<CleanupResult> {
  const [settings, sessionProtection] = await Promise.all([
    getSettings(),
    getSessionProtection(),
  ]);
  const uniqueIds = [...new Set(tabIds)].slice(0, settings.maxTabsPerCleanup);
  const tabs = await Promise.all(
    uniqueIds.map((tabId) => getTabSnapshot(tabId)),
  );

  return discardSelectedTabs(
    tabs.filter((tab): tab is TabSnapshot => tab !== null),
    settings,
    new Set(sessionProtection.protectedTabIds),
    "bulk-manual",
  );
}

async function discardSelectedTabs(
  selectedTabs: TabSnapshot[],
  settings: Settings,
  protectedTabIds: ReadonlySet<number>,
  trigger: CleanupTrigger,
): Promise<CleanupResult> {
  const items: CleanupResultItem[] = [];
  const historyEntries: CleanupHistoryEntry[] = [];

  for (const selectedTab of selectedTabs) {
    if (selectedTab.id === undefined) {
      continue;
    }

    const latestTab = await getTabSnapshot(selectedTab.id);
    if (!latestTab) {
      items.push({
        tabId: selectedTab.id,
        title: selectedTab.title ?? "닫힌 탭",
        status: "skipped",
        errorCode: "tab-not-found",
      });
      continue;
    }

    const evaluation = evaluateTab(latestTab, {
      now: Date.now(),
      settings,
      protectedTabIds,
    });

    if (!evaluation.eligible) {
      items.push({
        tabId: selectedTab.id,
        title: latestTab.title ?? "제목 없는 탭",
        status: "skipped",
        errorCode: "no-longer-eligible",
      });
      continue;
    }

    const item = await discardTab(latestTab, evaluation, trigger);
    items.push(item.result);
    historyEntries.push(item.history);
  }

  await appendHistory(historyEntries);

  return {
    requestedCount: selectedTabs.length,
    successCount: items.filter((item) => item.status === "success").length,
    skippedCount: items.filter((item) => item.status === "skipped").length,
    failedCount: items.filter((item) => item.status === "failed").length,
    items,
  };
}

async function discardTab(
  tab: TabSnapshot,
  evaluation: TabEvaluation,
  trigger: CleanupTrigger,
): Promise<{ result: CleanupResultItem; history: CleanupHistoryEntry }> {
  const tabId = tab.id;
  if (tabId === undefined) {
    throw new Error("Eligible tab is missing an ID.");
  }

  const discardedAt = Date.now();
  const domain = inspectUrl(tab.url);
  let errorCode: CleanupErrorCode | undefined;

  try {
    const discarded = await chrome.tabs.discard(tabId);
    if (!discarded?.discarded) {
      errorCode = "discard-rejected";
    }
  } catch {
    errorCode = "unknown";
  }

  const baseHistory: Omit<CleanupHistoryEntry, "result" | "errorCode"> = {
    id: crypto.randomUUID(),
    tabId,
    title: tab.title ?? "제목 없는 탭",
    domain: domain.hostname,
    urlKind: domain.kind,
    discardedAt,
    inactiveMinutes: evaluation.inactiveMinutes,
    reasonCodes: evaluation.reasonCodes,
    trigger,
  };

  if (errorCode) {
    return {
      result: {
        tabId,
        title: baseHistory.title,
        status: "failed",
        errorCode,
      },
      history: { ...baseHistory, result: "failed", errorCode },
    };
  }

  await addReactivationTracking(tabId);

  return {
    result: { tabId, title: baseHistory.title, status: "success" },
    history: { ...baseHistory, result: "success" },
  };
}

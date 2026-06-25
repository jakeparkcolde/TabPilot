import { discardOne, discardSelected, runSafeCleanup } from "./cleanup-engine";
import { getDashboard } from "./dashboard";
import { handleTabRemoved, handleTabUpdated } from "./reactivation-tracker";
import { isRequestMessage, type RequestMessage } from "../lib/messages";
import { AUTO_CLEANUP_ALARM } from "../lib/constants";
import {
  clearHistory,
  getHistory,
  getSettings,
  getStoredAutoCleanupStatus,
  isOnboardingComplete,
  setLastMemorySavings,
  setOnboardingComplete,
  setStoredAutoCleanupStatus,
  setTabProtection,
  updateSettings,
} from "../lib/storage";
import type { AutoCleanupStatus, CleanupResult } from "../lib/types";

chrome.runtime.onMessage.addListener(
  (message: unknown, _sender, sendResponse) => {
    if (!isRequestMessage(message)) {
      sendResponse({
        ok: false,
        error: { code: "invalid-message", message: "잘못된 요청입니다." },
      });
      return false;
    }

    void handleMessage(message)
      .then((data) => {
        sendResponse({ ok: true, data });
      })
      .catch((error: unknown) => {
        console.error("TabPilot request failed", error);
        sendResponse({
          ok: false,
          error: {
            code: "request-failed",
            message: "요청을 처리하지 못했습니다.",
          },
        });
      });

    return true;
  },
);

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  void handleTabUpdated(tabId, changeInfo).catch((error: unknown) => {
    console.error("Failed to track tab reactivation", error);
  });
  void updateBadge();
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void handleTabRemoved(tabId).catch((error: unknown) => {
    console.error("Failed to clear tab tracking", error);
  });
  void updateBadge();
});

chrome.tabs.onCreated.addListener(() => {
  void updateBadge();
});

chrome.runtime.onStartup.addListener(() => {
  void updateBadge();
  void ensureAutoCleanupAlarm();
});

chrome.runtime.onInstalled.addListener((details) => {
  void updateBadge();
  void ensureAutoCleanupAlarm();
  if (details.reason === "install") {
    void openOnboardingIfNeeded();
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === AUTO_CLEANUP_ALARM) {
    void runAutomaticCleanup();
  }
});

void updateBadge();
void ensureAutoCleanupAlarm();

async function handleMessage(message: RequestMessage) {
  switch (message.type) {
    case "GET_DASHBOARD":
      return getDashboard();
    case "RUN_SAFE_CLEANUP":
      return runMeasuredCleanup(runSafeCleanup);
    case "DISCARD_SELECTED":
      return runMeasuredCleanup(() => discardSelected(message.tabIds));
    case "DISCARD_ONE":
      return runMeasuredCleanup(() => discardOne(message.tabId));
    case "PROTECT_TAB":
      return setTabProtection(message.tabId, true);
    case "UNPROTECT_TAB":
      return setTabProtection(message.tabId, false);
    case "ACTIVATE_TAB":
      await activateTab(message.tabId);
      return null;
    case "REACTIVATE_TABS":
      return reactivateTabs(message.tabIds);
    case "GET_SETTINGS":
      return getSettings();
    case "GET_AUTO_CLEANUP_STATUS":
      return getAutoCleanupStatus();
    case "RUN_AUTO_CLEANUP_CHECK":
      return runAutomaticCleanup();
    case "COMPLETE_ONBOARDING": {
      const settings = await updateSettingsAndSchedule(message.patch);
      await setOnboardingComplete();
      return settings;
    }
    case "UPDATE_SETTINGS":
      return updateSettingsAndSchedule(message.patch);
    case "GET_HISTORY":
      return getHistory();
    case "CLEAR_HISTORY":
      await clearHistory();
      return null;
  }
}

async function openOnboardingIfNeeded(): Promise<void> {
  if (await isOnboardingComplete()) return;
  await chrome.tabs.create({ url: chrome.runtime.getURL("onboarding.html") });
}

async function updateSettingsAndSchedule(
  patch: Parameters<typeof updateSettings>[0],
) {
  const settings = await updateSettings(patch);
  await rescheduleAutoCleanupAlarm(settings);
  return settings;
}

async function rescheduleAutoCleanupAlarm(
  providedSettings?: Awaited<ReturnType<typeof getSettings>>,
): Promise<void> {
  const settings = providedSettings ?? (await getSettings());
  await chrome.alarms.clear(AUTO_CLEANUP_ALARM);

  if (!settings.autoCleanupEnabled) {
    return;
  }

  await chrome.alarms.create(AUTO_CLEANUP_ALARM, {
    delayInMinutes: settings.autoCleanupIntervalMinutes,
    periodInMinutes: settings.autoCleanupIntervalMinutes,
  });
}

async function ensureAutoCleanupAlarm(): Promise<void> {
  const settings = await getSettings();
  const existingAlarm = await chrome.alarms.get(AUTO_CLEANUP_ALARM);

  if (!settings.autoCleanupEnabled) {
    if (existingAlarm) {
      await chrome.alarms.clear(AUTO_CLEANUP_ALARM);
    }
    return;
  }

  if (existingAlarm?.periodInMinutes === settings.autoCleanupIntervalMinutes) {
    return;
  }

  await rescheduleAutoCleanupAlarm(settings);
}

let automaticCleanupRunning = false;

async function getAutoCleanupStatus(): Promise<AutoCleanupStatus> {
  const [settings, storedStatus, alarm] = await Promise.all([
    getSettings(),
    getStoredAutoCleanupStatus(),
    chrome.alarms.get(AUTO_CLEANUP_ALARM),
  ]);
  return {
    enabled: settings.autoCleanupEnabled,
    intervalMinutes: settings.autoCleanupIntervalMinutes,
    thresholdPercent: settings.lowMemoryThresholdPercent,
    nextCheckAt:
      settings.autoCleanupEnabled && alarm ? alarm.scheduledTime : null,
    ...storedStatus,
  };
}

async function saveAutoCleanupCheck(
  status: Awaited<ReturnType<typeof getStoredAutoCleanupStatus>>,
): Promise<AutoCleanupStatus> {
  await setStoredAutoCleanupStatus(status);
  return getAutoCleanupStatus();
}

async function runAutomaticCleanup(): Promise<AutoCleanupStatus> {
  if (automaticCleanupRunning) {
    return saveAutoCleanupCheck({
      lastCheckedAt: Date.now(),
      outcome: "already-running",
      availableMemoryPercent: null,
      candidateCount: null,
      cleanedCount: 0,
    });
  }

  automaticCleanupRunning = true;
  try {
    const settings = await getSettings();
    if (!settings.autoCleanupEnabled) {
      await rescheduleAutoCleanupAlarm(settings);
      return await saveAutoCleanupCheck({
        lastCheckedAt: Date.now(),
        outcome: "disabled",
        availableMemoryPercent: null,
        candidateCount: null,
        cleanedCount: 0,
      });
    }
    const memory = await getMemoryInfo();
    if (memory === null || memory.capacity <= 0) {
      return await saveAutoCleanupCheck({
        lastCheckedAt: Date.now(),
        outcome: "memory-unavailable",
        availableMemoryPercent: null,
        candidateCount: null,
        cleanedCount: 0,
      });
    }
    const availableMemoryPercent =
      (memory.availableCapacity / memory.capacity) * 100;
    if (availableMemoryPercent > settings.lowMemoryThresholdPercent) {
      return await saveAutoCleanupCheck({
        lastCheckedAt: Date.now(),
        outcome: "memory-above-threshold",
        availableMemoryPercent,
        candidateCount: null,
        cleanedCount: 0,
      });
    }
    const dashboard = await getDashboard();
    if (dashboard.candidateTabs === 0) {
      return await saveAutoCleanupCheck({
        lastCheckedAt: Date.now(),
        outcome: "no-candidates",
        availableMemoryPercent,
        candidateCount: 0,
        cleanedCount: 0,
      });
    }
    const result = await runMeasuredCleanup(() => runSafeCleanup("automatic"));
    return await saveAutoCleanupCheck({
      lastCheckedAt: Date.now(),
      outcome: result.successCount > 0 ? "cleaned" : "no-candidates",
      availableMemoryPercent,
      candidateCount: dashboard.candidateTabs,
      cleanedCount: result.successCount,
    });
  } catch (error) {
    console.error("Automatic cleanup failed", error);
    return await saveAutoCleanupCheck({
      lastCheckedAt: Date.now(),
      outcome: "error",
      availableMemoryPercent: null,
      candidateCount: null,
      cleanedCount: 0,
    });
  } finally {
    automaticCleanupRunning = false;
  }
}

async function runMeasuredCleanup(
  cleanup: () => Promise<CleanupResult>,
): Promise<CleanupResult> {
  const before = await getAvailableMemory();
  const result = await cleanup();

  if (result.successCount === 0) {
    return { ...result, estimatedMemoryReclaimedBytes: null };
  }

  await delay(700);
  const after = await getAvailableMemory();
  const reclaimedBytes =
    before === null || after === null ? null : Math.max(0, after - before);

  if (reclaimedBytes !== null) {
    await setLastMemorySavings({
      reclaimedBytes,
      measuredAt: Date.now(),
      discardedTabs: result.successCount,
    });
  }

  await updateBadge();
  return { ...result, estimatedMemoryReclaimedBytes: reclaimedBytes };
}

async function getAvailableMemory(): Promise<number | null> {
  const memory = await getMemoryInfo();
  return memory?.availableCapacity ?? null;
}

async function getMemoryInfo(): Promise<chrome.system.memory.MemoryInfo | null> {
  try {
    return await chrome.system.memory.getInfo();
  } catch {
    return null;
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function activateTab(tabId: number): Promise<void> {
  const tab = await chrome.tabs.get(tabId);
  await chrome.windows.update(tab.windowId, { focused: true });
  await chrome.tabs.update(tabId, { active: true });
}

async function reactivateTabs(tabIds: number[]) {
  const uniqueIds = [...new Set(tabIds)].slice(0, 20);
  let successCount = 0;

  for (const tabId of uniqueIds) {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab.discarded) {
        await chrome.tabs.reload(tabId);
      }
      successCount += 1;
    } catch {
      // A tab may have been closed after cleanup.
    }
  }

  return { requestedCount: uniqueIds.length, successCount };
}

async function updateBadge(): Promise<void> {
  try {
    const discardedTabs = await chrome.tabs.query({ discarded: true });
    const count = discardedTabs.length;
    await Promise.all([
      chrome.action.setBadgeText({ text: count > 0 ? String(count) : "" }),
      chrome.action.setBadgeBackgroundColor({ color: "#527fe8" }),
      chrome.action.setTitle({
        title: count > 0 ? `TabPilot · 휴면 탭 ${count}개` : "TabPilot",
      }),
    ]);
  } catch (error) {
    console.error("Failed to update TabPilot badge", error);
  }
}

import {
  AUTO_CLEANUP_STATUS_KEY,
  CLEANUP_HISTORY_KEY,
  DEFAULT_SETTINGS,
  LAST_MEMORY_SAVINGS_KEY,
  MAX_HISTORY_ENTRIES,
  ONBOARDING_COMPLETE_KEY,
  REACTIVATION_INDEX_KEY,
  SESSION_PROTECTION_KEY,
  SETTINGS_KEY,
} from "./constants";
import { normalizeProtectedDomains } from "./domain";
import type {
  AutoCleanupStatus,
  CleanupHistoryEntry,
  MemorySavingsSnapshot,
  ReactivationIndex,
  SessionProtection,
  Settings,
} from "./types";

export async function getStoredAutoCleanupStatus(): Promise<
  Omit<
    AutoCleanupStatus,
    "enabled" | "intervalMinutes" | "thresholdPercent" | "nextCheckAt"
  >
> {
  const result = await chrome.storage.local.get(AUTO_CLEANUP_STATUS_KEY);
  const value: unknown = result[AUTO_CLEANUP_STATUS_KEY];
  if (
    !isObject(value) ||
    typeof value.outcome !== "string" ||
    !isAutoCleanupOutcome(value.outcome)
  ) {
    return {
      lastCheckedAt: null,
      outcome: "never-checked",
      availableMemoryPercent: null,
      candidateCount: null,
      cleanedCount: 0,
    };
  }

  return {
    lastCheckedAt:
      typeof value.lastCheckedAt === "number" ? value.lastCheckedAt : null,
    outcome: value.outcome,
    availableMemoryPercent:
      typeof value.availableMemoryPercent === "number"
        ? value.availableMemoryPercent
        : null,
    candidateCount:
      typeof value.candidateCount === "number" ? value.candidateCount : null,
    cleanedCount:
      typeof value.cleanedCount === "number"
        ? Math.max(0, Math.round(value.cleanedCount))
        : 0,
  };
}

export async function setStoredAutoCleanupStatus(
  status: Awaited<ReturnType<typeof getStoredAutoCleanupStatus>>,
): Promise<void> {
  await chrome.storage.local.set({ [AUTO_CLEANUP_STATUS_KEY]: status });
}

export async function isOnboardingComplete(): Promise<boolean> {
  const result = await chrome.storage.local.get(ONBOARDING_COMPLETE_KEY);
  return result[ONBOARDING_COMPLETE_KEY] === true;
}

export async function setOnboardingComplete(): Promise<void> {
  await chrome.storage.local.set({ [ONBOARDING_COMPLETE_KEY]: true });
}

export async function getLastMemorySavings(): Promise<MemorySavingsSnapshot | null> {
  const result = await chrome.storage.session.get(LAST_MEMORY_SAVINGS_KEY);
  const value: unknown = result[LAST_MEMORY_SAVINGS_KEY];

  if (
    !isObject(value) ||
    typeof value.reclaimedBytes !== "number" ||
    typeof value.measuredAt !== "number" ||
    typeof value.discardedTabs !== "number"
  ) {
    return null;
  }

  return {
    reclaimedBytes: Math.max(0, value.reclaimedBytes),
    measuredAt: value.measuredAt,
    discardedTabs: Math.max(0, Math.round(value.discardedTabs)),
  };
}

export async function setLastMemorySavings(
  snapshot: MemorySavingsSnapshot,
): Promise<void> {
  await chrome.storage.session.set({
    [LAST_MEMORY_SAVINGS_KEY]: snapshot,
  });
}

export async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  const settings = sanitizeSettings(result[SETTINGS_KEY]);

  if (JSON.stringify(settings) !== JSON.stringify(result[SETTINGS_KEY])) {
    await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
  }

  return settings;
}

export async function updateSettings(
  patch: Partial<Omit<Settings, "schemaVersion">>,
): Promise<Settings> {
  const current = await getSettings();
  const settings = sanitizeSettings({ ...current, ...patch });
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
  return settings;
}

export async function getSessionProtection(): Promise<SessionProtection> {
  const result = await chrome.storage.session.get(SESSION_PROTECTION_KEY);
  const rawProtection: unknown = result[SESSION_PROTECTION_KEY];
  const rawIds =
    isObject(rawProtection) && Array.isArray(rawProtection.protectedTabIds)
      ? rawProtection.protectedTabIds
      : [];
  const protectedTabIds = rawIds.filter(
    (value: unknown): value is number =>
      typeof value === "number" && Number.isInteger(value) && value >= 0,
  );

  return { protectedTabIds: [...new Set(protectedTabIds)] };
}

export async function setTabProtection(
  tabId: number,
  protectedState: boolean,
): Promise<SessionProtection> {
  const current = await getSessionProtection();
  const ids = new Set(current.protectedTabIds);

  if (protectedState) {
    ids.add(tabId);
  } else {
    ids.delete(tabId);
  }

  const sessionProtection = { protectedTabIds: [...ids] };
  await chrome.storage.session.set({
    [SESSION_PROTECTION_KEY]: sessionProtection,
  });
  return sessionProtection;
}

export async function addReactivationTracking(tabId: number): Promise<void> {
  const index = await getReactivationIndex();
  await chrome.storage.session.set({
    [REACTIVATION_INDEX_KEY]: {
      tabIds: [...new Set([...index.tabIds, tabId])],
    },
  });
}

export async function consumeReactivationTracking(
  tabId: number,
): Promise<boolean> {
  const index = await getReactivationIndex();
  if (!index.tabIds.includes(tabId)) {
    return false;
  }

  await chrome.storage.session.set({
    [REACTIVATION_INDEX_KEY]: {
      tabIds: index.tabIds.filter((id) => id !== tabId),
    },
  });
  return true;
}

export async function removeReactivationTracking(tabId: number): Promise<void> {
  const index = await getReactivationIndex();
  if (!index.tabIds.includes(tabId)) {
    return;
  }

  await chrome.storage.session.set({
    [REACTIVATION_INDEX_KEY]: {
      tabIds: index.tabIds.filter((id) => id !== tabId),
    },
  });
}

export async function appendHistory(
  entries: CleanupHistoryEntry[],
): Promise<void> {
  if (entries.length === 0) {
    return;
  }

  const result = await chrome.storage.local.get(CLEANUP_HISTORY_KEY);
  const existing = Array.isArray(result[CLEANUP_HISTORY_KEY])
    ? (result[CLEANUP_HISTORY_KEY] as CleanupHistoryEntry[])
    : [];
  const history = [...entries, ...existing].slice(0, MAX_HISTORY_ENTRIES);
  await chrome.storage.local.set({ [CLEANUP_HISTORY_KEY]: history });
}

export async function getHistory(): Promise<CleanupHistoryEntry[]> {
  const result = await chrome.storage.local.get(CLEANUP_HISTORY_KEY);
  if (!Array.isArray(result[CLEANUP_HISTORY_KEY])) {
    return [];
  }

  return (result[CLEANUP_HISTORY_KEY] as unknown[])
    .filter(isCleanupHistoryEntry)
    .slice(0, MAX_HISTORY_ENTRIES);
}

export async function markHistoryReactivated(
  tabId: number,
  reactivatedAt: number,
): Promise<boolean> {
  const history = await getHistory();
  const entryIndex = history.findIndex(
    (entry) =>
      entry.tabId === tabId &&
      entry.result === "success" &&
      entry.reactivatedAt === undefined,
  );
  const entry = history[entryIndex];

  if (entryIndex === -1 || !entry) {
    return false;
  }

  history[entryIndex] = { ...entry, reactivatedAt };
  await chrome.storage.local.set({ [CLEANUP_HISTORY_KEY]: history });
  return true;
}

export async function clearHistory(): Promise<void> {
  await chrome.storage.local.remove(CLEANUP_HISTORY_KEY);
  await chrome.storage.session.remove(REACTIVATION_INDEX_KEY);
}

export function sanitizeSettings(value: unknown): Settings {
  const candidate = isObject(value) ? value : {};
  const inactivityThresholdMinutes = clampInteger(
    candidate.inactivityThresholdMinutes,
    15,
    7 * 24 * 60,
    DEFAULT_SETTINGS.inactivityThresholdMinutes,
  );
  const maxTabsPerCleanup = clampInteger(
    candidate.maxTabsPerCleanup,
    1,
    20,
    DEFAULT_SETTINGS.maxTabsPerCleanup,
  );
  const autoCleanupEnabled =
    typeof candidate.autoCleanupEnabled === "boolean"
      ? candidate.autoCleanupEnabled
      : DEFAULT_SETTINGS.autoCleanupEnabled;
  const autoCleanupIntervalMinutes = sanitizeAutoCleanupInterval(
    candidate.autoCleanupIntervalMinutes,
  );
  const lowMemoryThresholdPercent = clampInteger(
    candidate.lowMemoryThresholdPercent,
    5,
    50,
    DEFAULT_SETTINGS.lowMemoryThresholdPercent,
  );
  const popupLayout =
    candidate.popupLayout === "b" || candidate.popupLayout === "c"
      ? candidate.popupLayout
      : DEFAULT_SETTINGS.popupLayout;
  const theme =
    candidate.theme === "light" || candidate.theme === "dark"
      ? candidate.theme
      : DEFAULT_SETTINGS.theme;
  const protectedDomains = Array.isArray(candidate.protectedDomains)
    ? normalizeProtectedDomains(
        candidate.protectedDomains.filter(
          (item): item is string => typeof item === "string",
        ),
      )
    : DEFAULT_SETTINGS.protectedDomains;

  return {
    schemaVersion: 1,
    inactivityThresholdMinutes,
    maxTabsPerCleanup,
    autoCleanupEnabled,
    autoCleanupIntervalMinutes,
    lowMemoryThresholdPercent,
    popupLayout,
    theme,
    protectedDomains,
  };
}

function sanitizeAutoCleanupInterval(value: unknown): number {
  const supported = [15, 30, 60];
  return typeof value === "number" && supported.includes(value)
    ? value
    : DEFAULT_SETTINGS.autoCleanupIntervalMinutes;
}

function clampInteger(
  value: unknown,
  minimum: number,
  maximum: number,
  fallback: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAutoCleanupOutcome(
  value: string,
): value is AutoCleanupStatus["outcome"] {
  return [
    "never-checked",
    "disabled",
    "memory-unavailable",
    "memory-above-threshold",
    "no-candidates",
    "cleaned",
    "already-running",
    "error",
  ].includes(value);
}

function isCleanupHistoryEntry(value: unknown): value is CleanupHistoryEntry {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.tabId === "number" &&
    typeof value.title === "string" &&
    (typeof value.domain === "string" || value.domain === null) &&
    typeof value.discardedAt === "number" &&
    (typeof value.inactiveMinutes === "number" ||
      value.inactiveMinutes === null) &&
    Array.isArray(value.reasonCodes) &&
    (value.trigger === "bulk-manual" ||
      value.trigger === "single-manual" ||
      value.trigger === "automatic") &&
    (value.result === "success" || value.result === "failed") &&
    (value.reactivatedAt === undefined ||
      typeof value.reactivatedAt === "number")
  );
}

async function getReactivationIndex(): Promise<ReactivationIndex> {
  const result = await chrome.storage.session.get(REACTIVATION_INDEX_KEY);
  const rawIndex: unknown = result[REACTIVATION_INDEX_KEY];
  const rawIds =
    isObject(rawIndex) && Array.isArray(rawIndex.tabIds) ? rawIndex.tabIds : [];
  const tabIds = rawIds.filter(
    (value: unknown): value is number =>
      typeof value === "number" && Number.isInteger(value) && value >= 0,
  );

  return { tabIds: [...new Set(tabIds)] };
}

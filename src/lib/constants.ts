import type { Settings } from "./types";

export const SETTINGS_KEY = "settings";
export const SESSION_PROTECTION_KEY = "sessionProtection";
export const REACTIVATION_INDEX_KEY = "reactivationIndex";
export const CLEANUP_HISTORY_KEY = "cleanupHistory";
export const LAST_MEMORY_SAVINGS_KEY = "lastMemorySavings";
export const AUTO_CLEANUP_ALARM = "autoCleanup";
export const AUTO_CLEANUP_STATUS_KEY = "autoCleanupStatus";
export const ONBOARDING_COMPLETE_KEY = "onboardingComplete";

export const DEFAULT_SETTINGS: Settings = {
  schemaVersion: 1,
  inactivityThresholdMinutes: 60,
  maxTabsPerCleanup: 5,
  autoCleanupEnabled: false,
  autoCleanupIntervalMinutes: 30,
  lowMemoryThresholdPercent: 15,
  popupLayout: "a",
  theme: "system",
  protectedDomains: [
    "localhost",
    "127.0.0.1",
    "docs.google.com",
    "figma.com",
    "notion.so",
  ],
};

export const MAX_HISTORY_ENTRIES = 100;
export const MAX_INACTIVITY_SCORE_MINUTES = 7 * 24 * 60;

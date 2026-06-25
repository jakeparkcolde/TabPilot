export interface Settings {
  schemaVersion: 1;
  inactivityThresholdMinutes: number;
  maxTabsPerCleanup: number;
  autoCleanupEnabled: boolean;
  autoCleanupIntervalMinutes: number;
  lowMemoryThresholdPercent: number;
  popupLayout: "a" | "b" | "c";
  theme: "system" | "light" | "dark";
  protectedDomains: string[];
}

export interface SessionProtection {
  protectedTabIds: number[];
}

export interface ReactivationIndex {
  tabIds: number[];
}

export type CleanupTrigger = "bulk-manual" | "single-manual" | "automatic";

export type CleanupErrorCode =
  | "tab-not-found"
  | "no-longer-eligible"
  | "discard-rejected"
  | "unknown";

export interface CleanupHistoryEntry {
  id: string;
  tabId: number;
  title: string;
  domain: string | null;
  urlKind: UrlKind;
  discardedAt: number;
  inactiveMinutes: number | null;
  reasonCodes: CleanupReasonCode[];
  trigger: CleanupTrigger;
  result: "success" | "failed";
  errorCode?: CleanupErrorCode;
  reactivatedAt?: number;
}

export interface MemorySnapshot {
  capacityBytes: number;
  availableCapacityBytes: number;
  availableRatio: number;
  measuredAt: number;
}

export interface MemorySavingsSnapshot {
  reclaimedBytes: number;
  measuredAt: number;
  discardedTabs: number;
}

export type UrlKind =
  | "web"
  | "localhost"
  | "chrome-internal"
  | "extension"
  | "file"
  | "invalid";

export type ExclusionCode =
  | "missing-tab-id"
  | "unsupported-url"
  | "active"
  | "pinned"
  | "audible"
  | "loading"
  | "discarded"
  | "session-protected"
  | "domain-protected"
  | "missing-last-accessed"
  | "below-inactivity-threshold";

export type CleanupReasonCode =
  | "inactive-over-threshold"
  | "inactive-over-6-hours"
  | "inactive-over-24-hours"
  | "background-window";

export interface TabSnapshot {
  id?: number;
  windowId: number;
  index: number;
  url?: string;
  title?: string;
  favIconUrl?: string;
  active: boolean;
  pinned: boolean;
  audible?: boolean;
  discarded: boolean;
  status?: "unloaded" | "loading" | "complete";
  lastAccessed?: number;
  isInBackgroundWindow: boolean;
}

export interface TabEvaluation {
  tabId: number | null;
  eligible: boolean;
  inactiveMinutes: number | null;
  exclusionCodes: ExclusionCode[];
  reasonCodes: CleanupReasonCode[];
  score: number;
}

export interface DomainInfo {
  kind: UrlKind;
  hostname: string | null;
}

export interface DashboardTab {
  tabId: number;
  title: string;
  hostname: string | null;
  favIconUrl: string | null;
  inactiveMinutes: number | null;
  reasonCodes: CleanupReasonCode[];
  score: number;
}

export interface ManagedTab extends DashboardTab {
  windowId: number;
  active: boolean;
  pinned: boolean;
  audible: boolean;
  loading: boolean;
  discarded: boolean;
  eligible: boolean;
  sessionProtected: boolean;
  domainProtected: boolean;
  exclusionCodes: ExclusionCode[];
}

export interface DashboardData {
  totalTabs: number;
  discardedTabs: number;
  candidateTabs: number;
  cleanupLimit: number;
  protectedTabs: number;
  memory: MemorySnapshot | null;
  lastMemorySavings: MemorySavingsSnapshot | null;
  estimatedCleanupBytes: number | null;
  tabs: ManagedTab[];
  candidates: DashboardTab[];
  discarded: DashboardTab[];
}

export interface CleanupResultItem {
  tabId: number;
  title: string;
  status: "success" | "skipped" | "failed";
  errorCode?: CleanupErrorCode;
}

export interface CleanupResult {
  requestedCount: number;
  successCount: number;
  skippedCount: number;
  failedCount: number;
  items: CleanupResultItem[];
  estimatedMemoryReclaimedBytes?: number | null;
}

export interface ReactivationResult {
  requestedCount: number;
  successCount: number;
}

export type AutoCleanupOutcome =
  | "never-checked"
  | "disabled"
  | "memory-unavailable"
  | "memory-above-threshold"
  | "no-candidates"
  | "cleaned"
  | "already-running"
  | "error";

export interface AutoCleanupStatus {
  enabled: boolean;
  intervalMinutes: number;
  thresholdPercent: number;
  nextCheckAt: number | null;
  lastCheckedAt: number | null;
  outcome: AutoCleanupOutcome;
  availableMemoryPercent: number | null;
  candidateCount: number | null;
  cleanedCount: number;
}

import type {
  AutoCleanupStatus,
  CleanupHistoryEntry,
  CleanupResult,
  DashboardData,
  ReactivationResult,
  SessionProtection,
  Settings,
} from "./types";

export type RequestMessage =
  | { type: "GET_DASHBOARD" }
  | { type: "RUN_SAFE_CLEANUP" }
  | { type: "DISCARD_SELECTED"; tabIds: number[] }
  | { type: "DISCARD_ONE"; tabId: number }
  | { type: "PROTECT_TAB"; tabId: number }
  | { type: "UNPROTECT_TAB"; tabId: number }
  | { type: "ACTIVATE_TAB"; tabId: number }
  | { type: "REACTIVATE_TABS"; tabIds: number[] }
  | { type: "GET_SETTINGS" }
  | { type: "GET_AUTO_CLEANUP_STATUS" }
  | { type: "RUN_AUTO_CLEANUP_CHECK" }
  | {
      type: "COMPLETE_ONBOARDING";
      patch: Partial<Omit<Settings, "schemaVersion">>;
    }
  | {
      type: "UPDATE_SETTINGS";
      patch: Partial<Omit<Settings, "schemaVersion">>;
    }
  | { type: "GET_HISTORY" }
  | { type: "CLEAR_HISTORY" };

export interface ResponseMap {
  GET_DASHBOARD: DashboardData;
  RUN_SAFE_CLEANUP: CleanupResult;
  DISCARD_SELECTED: CleanupResult;
  DISCARD_ONE: CleanupResult;
  PROTECT_TAB: SessionProtection;
  UNPROTECT_TAB: SessionProtection;
  ACTIVATE_TAB: null;
  REACTIVATE_TABS: ReactivationResult;
  GET_SETTINGS: Settings;
  GET_AUTO_CLEANUP_STATUS: AutoCleanupStatus;
  RUN_AUTO_CLEANUP_CHECK: AutoCleanupStatus;
  COMPLETE_ONBOARDING: Settings;
  UPDATE_SETTINGS: Settings;
  GET_HISTORY: CleanupHistoryEntry[];
  CLEAR_HISTORY: null;
}

export type AppResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

export function isRequestMessage(value: unknown): value is RequestMessage {
  if (!isObject(value) || typeof value.type !== "string") {
    return false;
  }

  switch (value.type) {
    case "GET_DASHBOARD":
    case "RUN_SAFE_CLEANUP":
    case "GET_SETTINGS":
    case "GET_AUTO_CLEANUP_STATUS":
    case "RUN_AUTO_CLEANUP_CHECK":
    case "GET_HISTORY":
    case "CLEAR_HISTORY":
      return true;
    case "DISCARD_SELECTED":
    case "REACTIVATE_TABS":
      return (
        Array.isArray(value.tabIds) &&
        value.tabIds.every((tabId) => typeof tabId === "number")
      );
    case "DISCARD_ONE":
    case "PROTECT_TAB":
    case "UNPROTECT_TAB":
    case "ACTIVATE_TAB":
      return typeof value.tabId === "number";
    case "UPDATE_SETTINGS":
    case "COMPLETE_ONBOARDING":
      return isObject(value.patch);
    default:
      return false;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

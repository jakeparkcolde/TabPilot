import { describe, expect, it } from "vitest";
import { isRequestMessage } from "../src/lib/messages";

describe("message validation", () => {
  it("accepts settings and history requests", () => {
    expect(isRequestMessage({ type: "GET_SETTINGS" })).toBe(true);
    expect(isRequestMessage({ type: "GET_HISTORY" })).toBe(true);
    expect(isRequestMessage({ type: "GET_AUTO_CLEANUP_STATUS" })).toBe(true);
    expect(isRequestMessage({ type: "RUN_AUTO_CLEANUP_CHECK" })).toBe(true);
    expect(
      isRequestMessage({
        type: "COMPLETE_ONBOARDING",
        patch: { autoCleanupEnabled: false },
      }),
    ).toBe(true);
    expect(isRequestMessage({ type: "CLEAR_HISTORY" })).toBe(true);
    expect(isRequestMessage({ type: "ACTIVATE_TAB", tabId: 3 })).toBe(true);
    expect(isRequestMessage({ type: "REACTIVATE_TABS", tabIds: [3, 4] })).toBe(
      true,
    );
    expect(isRequestMessage({ type: "DISCARD_SELECTED", tabIds: [1, 2] })).toBe(
      true,
    );
    expect(
      isRequestMessage({
        type: "UPDATE_SETTINGS",
        patch: { maxTabsPerCleanup: 10 },
      }),
    ).toBe(true);
  });

  it("rejects malformed messages", () => {
    expect(isRequestMessage(null)).toBe(false);
    expect(isRequestMessage({ type: "DISCARD_ONE", tabId: "1" })).toBe(false);
    expect(
      isRequestMessage({ type: "DISCARD_SELECTED", tabIds: [1, "2"] }),
    ).toBe(false);
    expect(isRequestMessage({ type: "UPDATE_SETTINGS", patch: null })).toBe(
      false,
    );
    expect(isRequestMessage({ type: "UNKNOWN" })).toBe(false);
  });
});

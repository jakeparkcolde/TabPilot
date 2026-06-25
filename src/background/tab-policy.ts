import { MAX_INACTIVITY_SCORE_MINUTES } from "../lib/constants";
import { inspectUrl, isProtectedHostname } from "../lib/domain";
import type {
  CleanupReasonCode,
  ExclusionCode,
  Settings,
  TabEvaluation,
  TabSnapshot,
} from "../lib/types";

export interface EvaluationContext {
  now: number;
  settings: Settings;
  protectedTabIds: ReadonlySet<number>;
}

export function evaluateTab(
  tab: TabSnapshot,
  context: EvaluationContext,
): TabEvaluation {
  const exclusionCodes: ExclusionCode[] = [];
  const reasonCodes: CleanupReasonCode[] = [];
  const domain = inspectUrl(tab.url);

  if (tab.id === undefined) exclusionCodes.push("missing-tab-id");
  if (domain.kind !== "web" && domain.kind !== "localhost") {
    exclusionCodes.push("unsupported-url");
  }
  if (tab.active) exclusionCodes.push("active");
  if (tab.pinned) exclusionCodes.push("pinned");
  if (tab.audible) exclusionCodes.push("audible");
  if (tab.status === "loading") exclusionCodes.push("loading");
  if (tab.discarded) exclusionCodes.push("discarded");
  if (tab.id !== undefined && context.protectedTabIds.has(tab.id)) {
    exclusionCodes.push("session-protected");
  }
  if (
    domain.hostname &&
    isProtectedHostname(domain.hostname, context.settings.protectedDomains)
  ) {
    exclusionCodes.push("domain-protected");
  }

  const inactiveMinutes = calculateInactiveMinutes(
    tab.lastAccessed,
    context.now,
  );
  if (inactiveMinutes === null) {
    exclusionCodes.push("missing-last-accessed");
  } else if (inactiveMinutes < context.settings.inactivityThresholdMinutes) {
    exclusionCodes.push("below-inactivity-threshold");
  }

  if (exclusionCodes.length > 0 || inactiveMinutes === null) {
    return {
      tabId: tab.id ?? null,
      eligible: false,
      inactiveMinutes,
      exclusionCodes,
      reasonCodes,
      score: 0,
    };
  }

  reasonCodes.push("inactive-over-threshold");
  if (inactiveMinutes >= 24 * 60) {
    reasonCodes.push("inactive-over-24-hours");
  } else if (inactiveMinutes >= 6 * 60) {
    reasonCodes.push("inactive-over-6-hours");
  }
  if (tab.isInBackgroundWindow) {
    reasonCodes.push("background-window");
  }

  return {
    tabId: tab.id ?? null,
    eligible: true,
    inactiveMinutes,
    exclusionCodes,
    reasonCodes,
    score:
      Math.min(inactiveMinutes, MAX_INACTIVITY_SCORE_MINUTES) +
      (tab.isInBackgroundWindow ? 30 : 0),
  };
}

export function rankEligibleTabs(
  tabs: TabSnapshot[],
  context: EvaluationContext,
): Array<{ tab: TabSnapshot; evaluation: TabEvaluation }> {
  return tabs
    .map((tab) => ({ tab, evaluation: evaluateTab(tab, context) }))
    .filter(({ evaluation }) => evaluation.eligible)
    .sort((left, right) => {
      if (right.evaluation.score !== left.evaluation.score) {
        return right.evaluation.score - left.evaluation.score;
      }

      const leftAccessed = left.tab.lastAccessed ?? context.now;
      const rightAccessed = right.tab.lastAccessed ?? context.now;
      if (leftAccessed !== rightAccessed) {
        return leftAccessed - rightAccessed;
      }
      if (left.tab.windowId !== right.tab.windowId) {
        return left.tab.windowId - right.tab.windowId;
      }
      return left.tab.index - right.tab.index;
    });
}

function calculateInactiveMinutes(
  lastAccessed: number | undefined,
  now: number,
): number | null {
  if (lastAccessed === undefined || !Number.isFinite(lastAccessed)) {
    return null;
  }

  return Math.max(0, Math.floor((now - lastAccessed) / 60_000));
}

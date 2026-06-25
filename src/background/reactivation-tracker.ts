import {
  consumeReactivationTracking,
  markHistoryReactivated,
  removeReactivationTracking,
} from "../lib/storage";

export async function handleTabUpdated(
  tabId: number,
  changeInfo: { discarded?: boolean },
): Promise<void> {
  if (changeInfo.discarded !== false) {
    return;
  }

  const wasTracked = await consumeReactivationTracking(tabId);
  if (!wasTracked) {
    return;
  }

  await markHistoryReactivated(tabId, Date.now());
}

export async function handleTabRemoved(tabId: number): Promise<void> {
  await removeReactivationTracking(tabId);
}

import type { TabSnapshot } from "../lib/types";

export async function queryTabSnapshots(): Promise<TabSnapshot[]> {
  const [tabs, lastFocusedWindow] = await Promise.all([
    chrome.tabs.query({}),
    chrome.windows.getLastFocused().catch(() => null),
  ]);

  return tabs.map((tab) =>
    toTabSnapshot(tab, lastFocusedWindow?.id ?? chrome.windows.WINDOW_ID_NONE),
  );
}

export async function getTabSnapshot(
  tabId: number,
): Promise<TabSnapshot | null> {
  try {
    const [tab, lastFocusedWindow] = await Promise.all([
      chrome.tabs.get(tabId),
      chrome.windows.getLastFocused().catch(() => null),
    ]);
    return toTabSnapshot(
      tab,
      lastFocusedWindow?.id ?? chrome.windows.WINDOW_ID_NONE,
    );
  } catch {
    return null;
  }
}

function toTabSnapshot(
  tab: chrome.tabs.Tab,
  lastFocusedWindowId: number,
): TabSnapshot {
  const snapshot: TabSnapshot = {
    windowId: tab.windowId,
    index: tab.index,
    active: tab.active,
    pinned: tab.pinned,
    discarded: tab.discarded,
    isInBackgroundWindow: tab.windowId !== lastFocusedWindowId,
  };

  if (tab.id !== undefined) snapshot.id = tab.id;
  if (tab.url !== undefined) snapshot.url = tab.url;
  if (tab.title !== undefined) snapshot.title = tab.title;
  if (tab.favIconUrl !== undefined) snapshot.favIconUrl = tab.favIconUrl;
  if (tab.audible !== undefined) snapshot.audible = tab.audible;
  if (tab.status !== undefined) snapshot.status = tab.status;
  if (tab.lastAccessed !== undefined) snapshot.lastAccessed = tab.lastAccessed;

  return snapshot;
}

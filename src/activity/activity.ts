import "./activity.css";
import type { AppResponse, RequestMessage, ResponseMap } from "../lib/messages";
import { applyTheme, watchSystemTheme } from "../lib/theme";
import type {
  CleanupHistoryEntry,
  DashboardData,
  DashboardTab,
  ManagedTab,
  Settings,
} from "../lib/types";

type TabFilter = "all" | "candidate" | "protected" | "sleeping" | "active";

const allTabsList = document.querySelector<HTMLUListElement>("#all-tabs-list");
const sleepingList = document.querySelector<HTMLUListElement>("#sleeping-list");
const historyList = document.querySelector<HTMLUListElement>("#history-list");
const tabSearch = document.querySelector<HTMLInputElement>("#tab-search");
const tabFilters = document.querySelector<HTMLElement>("#tab-filters");
const totalCount = document.querySelector<HTMLElement>("#total-count");
const candidateCount = document.querySelector<HTMLElement>("#candidate-count");
const sleepingCount = document.querySelector<HTMLElement>("#sleeping-count");
const protectedCount = document.querySelector<HTMLElement>("#protected-count");
const historyCount = document.querySelector<HTMLElement>("#history-count");
const visibleCount = document.querySelector<HTMLElement>("#visible-count");
const status = document.querySelector<HTMLElement>("#status");
const clearHistoryButton =
  document.querySelector<HTMLButtonElement>("#clear-history");

let settings: Settings | null = null;
let dashboard: DashboardData | null = null;
let history: CleanupHistoryEntry[] = [];
let activeFilter: TabFilter = "all";
let searchQuery = "";

document.querySelector("#refresh")?.addEventListener("click", () => {
  void loadActivity();
});
document.querySelector("#open-options")?.addEventListener("click", () => {
  void chrome.runtime.openOptionsPage();
});
clearHistoryButton?.addEventListener("click", () => {
  void clearHistory();
});
tabSearch?.addEventListener("input", () => {
  searchQuery = tabSearch.value.trim().toLocaleLowerCase("ko");
  renderManagedTabs();
});
tabFilters?.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
    "[data-filter]",
  );
  const filter = button?.dataset.filter;
  if (
    filter !== "all" &&
    filter !== "candidate" &&
    filter !== "protected" &&
    filter !== "sleeping" &&
    filter !== "active"
  ) {
    return;
  }
  activeFilter = filter;
  for (const filterButton of Array.from(
    tabFilters.querySelectorAll<HTMLElement>("[data-filter]"),
  )) {
    filterButton.classList.toggle(
      "selected",
      filterButton.dataset.filter === activeFilter,
    );
  }
  renderManagedTabs();
});

watchSystemTheme(() => settings?.theme ?? null);
void initialize();

async function initialize(): Promise<void> {
  try {
    settings = await sendMessage("GET_SETTINGS", { type: "GET_SETTINGS" });
    applyTheme(settings.theme);
    await loadActivity();
  } catch {
    setStatus("설정과 탭 상태를 불러오지 못했습니다.");
  }
}

async function loadActivity(): Promise<void> {
  setStatus("탭 상태를 불러오는 중…");
  try {
    [dashboard, history] = await Promise.all([
      sendMessage("GET_DASHBOARD", { type: "GET_DASHBOARD" }),
      sendMessage("GET_HISTORY", { type: "GET_HISTORY" }),
    ]);
    renderSummary();
    renderManagedTabs();
    renderSleeping(dashboard.discarded);
    renderHistory(history);
    setStatus("");
  } catch {
    setStatus("탭 상태를 불러오지 못했습니다.");
  }
}

function renderSummary(): void {
  if (!dashboard) return;
  setText(totalCount, dashboard.totalTabs.toString());
  setText(candidateCount, dashboard.candidateTabs.toString());
  setText(sleepingCount, dashboard.discardedTabs.toString());
  setText(protectedCount, dashboard.protectedTabs.toString());
  setText(historyCount, history.length > 0 ? `· ${history.length}건` : "");
}

function renderManagedTabs(): void {
  if (!allTabsList || !dashboard) return;
  allTabsList.replaceChildren();
  const filteredTabs = dashboard.tabs.filter((tab) => {
    const matchesQuery =
      searchQuery.length === 0 ||
      tab.title.toLocaleLowerCase("ko").includes(searchQuery) ||
      (tab.hostname?.toLocaleLowerCase("ko").includes(searchQuery) ?? false);
    return matchesQuery && matchesFilter(tab);
  });

  setText(visibleCount, `${filteredTabs.length}개 표시`);
  if (filteredTabs.length === 0) {
    allTabsList.append(
      createEmpty(
        searchQuery
          ? "검색 조건에 맞는 탭이 없습니다."
          : "선택한 상태의 탭이 없습니다.",
      ),
    );
    return;
  }

  for (const tab of filteredTabs) {
    allTabsList.append(createManagedTabItem(tab));
  }
}

function matchesFilter(tab: ManagedTab): boolean {
  switch (activeFilter) {
    case "candidate":
      return tab.eligible;
    case "protected":
      return tab.sessionProtected || tab.domainProtected;
    case "sleeping":
      return tab.discarded;
    case "active":
      return tab.active;
    default:
      return true;
  }
}

function createManagedTabItem(tab: ManagedTab): HTMLLIElement {
  const item = document.createElement("li");
  item.className = "managed-tab";

  const siteMark = document.createElement("span");
  siteMark.className = "site-mark";
  siteMark.textContent = tab.discarded
    ? "Z"
    : (tab.hostname ?? tab.title).charAt(0).toUpperCase();

  const content = document.createElement("div");
  content.className = "tab-content";
  const titleRow = document.createElement("div");
  titleRow.className = "tab-title-row";
  const title = document.createElement("strong");
  title.textContent = tab.title;
  title.title = tab.title;
  const badges = document.createElement("span");
  badges.className = "tab-badges";
  for (const label of getTabBadges(tab)) {
    const badge = document.createElement("span");
    badge.className = `state-badge ${label.className}`;
    badge.textContent = label.text;
    badges.append(badge);
  }
  titleRow.append(title, badges);

  const meta = document.createElement("span");
  meta.className = "tab-meta";
  meta.textContent = `창 ${tab.windowId} · ${tab.hostname ?? "내부 페이지"} · ${formatInactive(tab.inactiveMinutes)}`;
  const reason = document.createElement("span");
  reason.className = "tab-reason";
  reason.textContent = describeTabState(tab);
  content.append(titleRow, meta, reason);

  const actions = document.createElement("div");
  actions.className = "tab-actions";
  if (tab.discarded) {
    actions.append(
      createActionButton("다시 열기", "primary-action", () =>
        activateTab(tab.tabId),
      ),
    );
  } else {
    actions.append(
      createActionButton("열기", "quiet-action", () => activateTab(tab.tabId)),
    );
    if (tab.sessionProtected) {
      actions.append(
        createActionButton("보호 해제", "quiet-action", () =>
          setProtection(tab.tabId, false),
        ),
      );
    } else if (!tab.domainProtected) {
      actions.append(
        createActionButton("보호", "quiet-action", () =>
          setProtection(tab.tabId, true),
        ),
      );
    }
    if (tab.eligible) {
      actions.append(
        createActionButton("휴면", "primary-action", () =>
          discardTab(tab.tabId),
        ),
      );
    }
  }

  item.append(siteMark, content, actions);
  return item;
}

function getTabBadges(
  tab: ManagedTab,
): Array<{ text: string; className: string }> {
  const badges: Array<{ text: string; className: string }> = [];
  if (tab.active) badges.push({ text: "활성", className: "active" });
  if (tab.eligible) badges.push({ text: "후보", className: "candidate" });
  if (tab.discarded) badges.push({ text: "휴면", className: "sleeping" });
  if (tab.sessionProtected) {
    badges.push({ text: "탭 보호", className: "protected" });
  } else if (tab.domainProtected) {
    badges.push({ text: "도메인 보호", className: "protected" });
  }
  if (tab.pinned) badges.push({ text: "고정", className: "neutral" });
  if (tab.audible) badges.push({ text: "소리 재생", className: "neutral" });
  return badges;
}

function describeTabState(tab: ManagedTab): string {
  if (tab.discarded) return "현재 메모리가 해제된 휴면 상태입니다.";
  if (tab.eligible) return "설정한 비활성 기준을 넘어 안전 정리가 가능합니다.";
  if (tab.active) return "현재 사용 중인 탭이라 정리하지 않습니다.";
  if (tab.sessionProtected) return "이 브라우저 세션 동안 보호한 탭입니다.";
  if (tab.domainProtected) return "보호 도메인에 포함된 탭입니다.";
  if (tab.pinned) return "고정 탭이라 정리하지 않습니다.";
  if (tab.audible) return "소리를 재생 중이라 정리하지 않습니다.";
  if (tab.loading) return "페이지를 불러오는 중이라 정리하지 않습니다.";
  if (tab.exclusionCodes.includes("unsupported-url")) {
    return "Chrome 내부 페이지 등 지원하지 않는 주소입니다.";
  }
  if (tab.exclusionCodes.includes("below-inactivity-threshold")) {
    return "아직 설정한 비활성 기준에 도달하지 않았습니다.";
  }
  return "현재 상태에서는 안전 정리 대상이 아닙니다.";
}

function renderSleeping(tabs: DashboardTab[]): void {
  if (!sleepingList) return;
  sleepingList.replaceChildren();
  if (tabs.length === 0) {
    sleepingList.append(createEmpty("현재 휴면 중인 탭이 없습니다."));
    return;
  }

  for (const tab of tabs) {
    const item = document.createElement("li");
    const content = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = tab.title;
    const meta = document.createElement("span");
    meta.textContent = `${tab.hostname ?? "알 수 없는 사이트"} · 메모리 해제됨`;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "다시 열기";
    button.addEventListener("click", () => void activateTab(tab.tabId));
    content.append(title, meta);
    item.append(content, button);
    sleepingList.append(item);
  }
}

function renderHistory(entries: CleanupHistoryEntry[]): void {
  if (!historyList) return;
  historyList.replaceChildren();
  if (clearHistoryButton) clearHistoryButton.disabled = entries.length === 0;
  if (entries.length === 0) {
    historyList.append(createEmpty("아직 정리 기록이 없습니다."));
    return;
  }

  for (const entry of entries) {
    const item = document.createElement("li");
    const content = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = entry.title;
    const meta = document.createElement("span");
    const trigger = entry.trigger === "automatic" ? "자동" : "수동";
    meta.textContent = `${entry.domain ?? "알 수 없는 사이트"} · ${trigger} · ${formatReason(entry)} · ${formatDate(entry.discardedAt)}`;
    const badge = document.createElement("span");
    badge.className = `badge ${entry.reactivatedAt ? "awake" : entry.result}`;
    badge.textContent =
      entry.result === "failed"
        ? "실패"
        : entry.reactivatedAt
          ? "다시 사용"
          : "휴면 완료";
    content.append(title, meta);
    item.append(content, badge);
    historyList.append(item);
  }
}

function createActionButton(
  label: string,
  className: string,
  action: () => Promise<void>,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", () => void action());
  return button;
}

async function setProtection(
  tabId: number,
  protectedState: boolean,
): Promise<void> {
  try {
    if (protectedState) {
      await sendMessage("PROTECT_TAB", { type: "PROTECT_TAB", tabId });
    } else {
      await sendMessage("UNPROTECT_TAB", { type: "UNPROTECT_TAB", tabId });
    }
    await loadActivity();
    setStatus(
      protectedState ? "탭을 보호했습니다." : "탭 보호를 해제했습니다.",
    );
  } catch {
    setStatus("탭 보호 상태를 변경하지 못했습니다.");
  }
}

async function discardTab(tabId: number): Promise<void> {
  try {
    const result = await sendMessage("DISCARD_ONE", {
      type: "DISCARD_ONE",
      tabId,
    });
    await loadActivity();
    setStatus(
      result.successCount === 1
        ? "탭을 휴면 처리했습니다."
        : "탭 상태가 바뀌어 휴면 처리하지 않았습니다.",
    );
  } catch {
    setStatus("탭을 휴면 처리하지 못했습니다.");
  }
}

async function activateTab(tabId: number): Promise<void> {
  try {
    await sendMessage("ACTIVATE_TAB", { type: "ACTIVATE_TAB", tabId });
    await loadActivity();
  } catch {
    setStatus("탭을 열지 못했습니다.");
  }
}

async function clearHistory(): Promise<void> {
  if (!window.confirm("이 기기에 저장된 정리 기록을 모두 삭제할까요?")) return;
  await sendMessage("CLEAR_HISTORY", { type: "CLEAR_HISTORY" });
  await loadActivity();
}

function createEmpty(message: string): HTMLLIElement {
  const item = document.createElement("li");
  item.className = "empty";
  item.textContent = message;
  return item;
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

function formatInactive(minutes: number | null): string {
  if (minutes === null) return "사용 시각 확인 불가";
  if (minutes < 60) return `${minutes}분 전 사용`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}시간 전 사용`;
  return `${Math.floor(minutes / (24 * 60))}일 전 사용`;
}

function formatReason(entry: CleanupHistoryEntry): string {
  if (entry.reasonCodes.includes("inactive-over-24-hours")) {
    return "24시간 이상 미사용";
  }
  if (entry.reasonCodes.includes("inactive-over-6-hours")) {
    return "6시간 이상 미사용";
  }
  if (entry.reasonCodes.includes("background-window")) {
    return "다른 창의 비활성 탭";
  }
  return "비활성 기준 초과";
}

function setStatus(message: string): void {
  setText(status, message);
}

function setText(element: HTMLElement | null, value: string): void {
  if (element) element.textContent = value;
}

async function sendMessage<K extends keyof ResponseMap>(
  _type: K,
  message: Extract<RequestMessage, { type: K }>,
): Promise<ResponseMap[K]> {
  const response: AppResponse<ResponseMap[K]> =
    await chrome.runtime.sendMessage(message);
  if (!response.ok) throw new Error(response.error.message);
  return response.data;
}

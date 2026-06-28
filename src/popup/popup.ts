import "./popup.css";
import { localizeText, translateStaticPage } from "../lib/i18n";
import { applyTheme, watchSystemTheme } from "../lib/theme";
import type { AppResponse, RequestMessage, ResponseMap } from "../lib/messages";
import type { DashboardData, DashboardTab, Settings } from "../lib/types";

const optionsButton =
  document.querySelector<HTMLButtonElement>("#open-options");
const refreshButton = document.querySelector<HTMLButtonElement>("#refresh");
const cleanupButton = document.querySelector<HTMLButtonElement>("#cleanup");
const status = document.querySelector<HTMLElement>("#status");
const memoryBar = document.querySelector<HTMLElement>("#memory-bar");
const memoryTotal = document.querySelector<HTMLElement>("#memory-total");
const memoryAvailable =
  document.querySelector<HTMLElement>("#memory-available");
const memoryEstimate = document.querySelector<HTMLElement>("#memory-estimate");
const memorySavings = document.querySelector<HTMLElement>("#memory-savings");
const totalTabs = document.querySelector<HTMLElement>("#total-tabs");
const discardedTabs = document.querySelector<HTMLElement>("#discarded-tabs");
const candidateTabs = document.querySelector<HTMLElement>("#candidate-tabs");
const protectedTabs = document.querySelector<HTMLElement>("#protected-tabs");
const discardedCount = document.querySelector<HTMLElement>("#discarded-count");
const candidateList =
  document.querySelector<HTMLUListElement>("#candidate-list");
const discardedList =
  document.querySelector<HTMLUListElement>("#discarded-list");
const toggleAllButton =
  document.querySelector<HTMLButtonElement>("#toggle-all");
const toggleReviewButton =
  document.querySelector<HTMLButtonElement>("#toggle-review");
const candidateSection =
  document.querySelector<HTMLElement>(".candidate-section");
const compactTotal = document.querySelector<HTMLElement>("#compact-total");
const compactCandidates = document.querySelector<HTMLElement>(
  "#compact-candidates",
);
const compactDiscarded =
  document.querySelector<HTMLElement>("#compact-discarded");
const compactProtected =
  document.querySelector<HTMLElement>("#compact-protected");
const guideGaugeValue =
  document.querySelector<SVGCircleElement>("#guide-gauge-value");
const guideMemory = document.querySelector<HTMLElement>("#guide-memory");
const guideTitle = document.querySelector<HTMLElement>("#guide-title");
const guideDescription =
  document.querySelector<HTMLElement>("#guide-description");
const undoCleanupButton =
  document.querySelector<HTMLButtonElement>("#undo-cleanup");
const openActivityButton =
  document.querySelector<HTMLButtonElement>("#open-activity");

let settings: Settings | null = null;
let dashboard: DashboardData | null = null;
const selectedTabIds = new Set<number>();
let reviewVisible = false;
let lastCleanedTabIds: number[] = [];
let lastCleanupCount = 0;

translateStaticPage();

optionsButton?.addEventListener("click", () => {
  void chrome.runtime.openOptionsPage();
});

refreshButton?.addEventListener("click", () => {
  void loadDashboard();
});

cleanupButton?.addEventListener("click", () => {
  void runCleanup();
});

undoCleanupButton?.addEventListener("click", () => {
  void undoCleanup();
});

openActivityButton?.addEventListener("click", () => {
  void chrome.tabs.create({ url: chrome.runtime.getURL("activity.html") });
  window.close();
});

toggleAllButton?.addEventListener("click", () => {
  if (!dashboard) return;
  const candidates = dashboard.candidates.slice(0, dashboard.cleanupLimit);
  const allSelected =
    candidates.length > 0 &&
    candidates.every((candidate) => selectedTabIds.has(candidate.tabId));
  selectedTabIds.clear();
  if (!allSelected) {
    candidates.forEach((candidate) => selectedTabIds.add(candidate.tabId));
  }
  renderDashboard(dashboard);
});

toggleReviewButton?.addEventListener("click", () => {
  reviewVisible = !reviewVisible;
  candidateSection?.classList.toggle("review-visible", reviewVisible);
  toggleReviewButton.textContent = localizeText(
    reviewVisible ? "검토 목록 접기" : "어떤 탭이 정리되나요?",
  );
});

void initialize();

async function initialize(): Promise<void> {
  try {
    settings = await sendMessage("GET_SETTINGS", { type: "GET_SETTINGS" });
    document.documentElement.dataset.layout = settings.popupLayout;
    applyTheme(settings.theme);
    watchSystemTheme(() => settings?.theme ?? null);
    await loadDashboard();
  } catch {
    setStatus("설정을 불러오지 못했습니다.");
  }
}

async function loadDashboard(updateStatus = true): Promise<void> {
  setStatus("탭 상태 확인 중");

  try {
    const loadedDashboard = await sendMessage("GET_DASHBOARD", {
      type: "GET_DASHBOARD",
    });
    dashboard = loadedDashboard;
    syncSelectedTabs(loadedDashboard);
    renderDashboard(loadedDashboard);
    if (updateStatus) {
      setStatus(
        loadedDashboard.candidateTabs > 0
          ? `오래 사용하지 않은 탭 ${loadedDashboard.candidateTabs}개를 확인했습니다.`
          : "현재 안전하게 정리할 후보가 없습니다.",
      );
    }
  } catch {
    setStatus("탭 상태를 불러오지 못했습니다.");
  }
}

async function runCleanup(): Promise<void> {
  if (!cleanupButton) return;
  const isSelectionLayout = settings?.popupLayout === "b";
  const selectedIds = [...selectedTabIds];

  cleanupButton.disabled = true;
  cleanupButton.textContent = localizeText("정리 중…");
  setStatus("실행 직전 탭 상태를 다시 확인하고 있습니다.");

  try {
    const result = isSelectionLayout
      ? await sendMessage("DISCARD_SELECTED", {
          type: "DISCARD_SELECTED",
          tabIds: selectedIds,
        })
      : await sendMessage("RUN_SAFE_CLEANUP", {
          type: "RUN_SAFE_CLEANUP",
        });
    lastCleanedTabIds = result.items
      .filter((item) => item.status === "success")
      .map((item) => item.tabId);
    lastCleanupCount = lastCleanedTabIds.length;
    selectedTabIds.clear();
    await loadDashboard(false);
    setStatus(
      `휴면 ${result.successCount}개 · 건너뜀 ${result.skippedCount}개 · 실패 ${result.failedCount}개`,
    );
    renderMemorySavings(
      result.estimatedMemoryReclaimedBytes === undefined
        ? null
        : {
            reclaimedBytes: result.estimatedMemoryReclaimedBytes ?? 0,
            measuredAt: Date.now(),
            discardedTabs: result.successCount,
          },
      result.estimatedMemoryReclaimedBytes === null,
    );
  } catch {
    setStatus("탭 정리를 완료하지 못했습니다.");
  } finally {
    if (dashboard) renderDashboard(dashboard);
  }
}

function renderDashboard(dashboard: DashboardData): void {
  setText(totalTabs, dashboard.totalTabs.toString());
  setText(discardedTabs, dashboard.discardedTabs.toString());
  setText(candidateTabs, dashboard.candidateTabs.toString());
  setText(protectedTabs, `보호됨 ${dashboard.protectedTabs}`);
  setText(discardedCount, `${dashboard.discardedTabs}개`);
  setText(compactTotal, dashboard.totalTabs.toString());
  setText(compactCandidates, dashboard.candidateTabs.toString());
  setText(compactDiscarded, dashboard.discardedTabs.toString());
  setText(compactProtected, dashboard.protectedTabs.toString());
  setText(
    memoryTotal,
    dashboard.memory
      ? formatBytes(dashboard.memory.capacityBytes)
      : "확인 불가",
  );
  setText(
    memoryAvailable,
    dashboard.memory
      ? `${formatBytes(dashboard.memory.availableCapacityBytes)} · ${Math.round(
          dashboard.memory.availableRatio * 100,
        )}%`
      : "확인 불가",
  );
  setText(
    memoryEstimate,
    dashboard.estimatedCleanupBytes === null
      ? "측정 전"
      : `약 ${formatMemorySavings(dashboard.estimatedCleanupBytes)}`,
  );
  renderMemoryGauge(dashboard.memory?.availableRatio ?? null);
  renderGuide(dashboard);

  if (cleanupButton) {
    const selectedCount = Math.min(selectedTabIds.size, dashboard.cleanupLimit);
    const selectionLayout = settings?.popupLayout === "b";
    cleanupButton.disabled = selectionLayout
      ? selectedCount === 0
      : dashboard.candidateTabs === 0;
    cleanupButton.textContent = selectionLayout
      ? selectedCount > 0
        ? `선택한 ${selectedCount}개 정리`
        : "탭을 선택하세요"
      : `안전 정리하기 · 최대 ${Math.min(
          dashboard.candidateTabs,
          dashboard.cleanupLimit,
        )}개`;
  }
  if (toggleAllButton) {
    const selectable = dashboard.candidates.slice(0, dashboard.cleanupLimit);
    const allSelected =
      selectable.length > 0 &&
      selectable.every((candidate) => selectedTabIds.has(candidate.tabId));
    toggleAllButton.textContent = allSelected ? "모두 해제" : "모두 선택";
  }

  renderCandidates(dashboard.candidates);
  renderDiscarded(dashboard.discarded);
  renderMemorySavings(dashboard.lastMemorySavings);
  translateStaticPage();
}

function syncSelectedTabs(nextDashboard: DashboardData): void {
  const candidateIds = new Set(
    nextDashboard.candidates
      .slice(0, nextDashboard.cleanupLimit)
      .map((candidate) => candidate.tabId),
  );
  for (const tabId of selectedTabIds) {
    if (!candidateIds.has(tabId)) selectedTabIds.delete(tabId);
  }
  if (settings?.popupLayout === "b" && selectedTabIds.size === 0) {
    candidateIds.forEach((tabId) => selectedTabIds.add(tabId));
  }
}

function renderGuide(data: DashboardData): void {
  const ratio = data.memory?.availableRatio ?? null;
  if (guideGaugeValue) {
    const circumference = 2 * Math.PI * 62;
    guideGaugeValue.style.strokeDasharray = String(circumference);
    guideGaugeValue.style.strokeDashoffset = String(
      circumference * (1 - (ratio ?? 0)),
    );
  }
  setText(
    guideMemory,
    data.memory ? formatBytes(data.memory.availableCapacityBytes) : "—",
  );
  setText(
    guideTitle,
    lastCleanupCount > 0
      ? `${lastCleanupCount}개 탭을 휴면 처리했어요`
      : data.candidateTabs > 0
        ? "정리 준비 완료"
        : "정리할 탭이 없어요",
  );
  setText(
    guideDescription,
    lastCleanupCount > 0
      ? "필요하면 아래 버튼으로 방금 정리한 탭을 다시 불러올 수 있어요."
      : data.candidateTabs > 0
        ? `오래 사용하지 않은 탭 ${data.candidateTabs}개를 안전하게 휴면 처리할 수 있어요.`
        : "지금은 모든 탭이 사용 중이거나 보호되어 있습니다.",
  );
  if (undoCleanupButton) {
    undoCleanupButton.hidden = lastCleanedTabIds.length === 0;
  }
}

function renderMemoryGauge(availableRatio: number | null): void {
  if (memoryBar) {
    memoryBar.style.width =
      availableRatio === null ? "0%" : `${Math.round(availableRatio * 100)}%`;
  }
}

function renderCandidates(candidates: DashboardTab[]): void {
  if (!candidateList) return;
  candidateList.replaceChildren();

  if (candidates.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "비활성 기준을 넘긴 안전한 후보가 없습니다.";
    candidateList.append(empty);
    return;
  }

  for (const candidate of candidates.slice(0, 20)) {
    const item = document.createElement("li");
    item.className = "candidate";
    item.classList.toggle("selected", selectedTabIds.has(candidate.tabId));

    const content = document.createElement("div");
    content.className = "candidate-content";

    const checkbox = document.createElement("span");
    checkbox.className = "candidate-checkbox";
    checkbox.textContent = "✓";
    checkbox.setAttribute("aria-hidden", "true");

    const siteMark = document.createElement("span");
    siteMark.className = "site-mark";
    siteMark.textContent = (candidate.hostname ?? candidate.title)
      .charAt(0)
      .toUpperCase();
    siteMark.setAttribute("aria-hidden", "true");

    const text = document.createElement("div");
    text.className = "candidate-text";

    const title = document.createElement("strong");
    title.textContent = candidate.title;
    title.title = candidate.title;

    const meta = document.createElement("span");
    meta.textContent = `${candidate.hostname ?? "알 수 없는 사이트"} · ${formatInactive(
      candidate.inactiveMinutes,
    )}`;

    const reason = document.createElement("span");
    reason.className = "reason";
    reason.textContent = formatReasons(candidate.reasonCodes);

    const actions = document.createElement("div");
    actions.className = "candidate-actions";

    const protectButton = document.createElement("button");
    protectButton.type = "button";
    protectButton.className = "secondary-button";
    protectButton.textContent = "보호";
    protectButton.addEventListener("click", () => {
      void protectTab(candidate.tabId);
    });

    const discardButton = document.createElement("button");
    discardButton.type = "button";
    discardButton.className = "discard-button";
    discardButton.textContent = "휴면";
    discardButton.addEventListener("click", () => {
      void discardOne(candidate.tabId);
    });

    text.append(title, meta, reason);
    content.append(checkbox, siteMark, text);
    actions.append(protectButton, discardButton);
    item.append(content, actions);
    item.addEventListener("click", (event) => {
      if (
        settings?.popupLayout !== "b" ||
        (event.target as HTMLElement).closest("button")
      ) {
        return;
      }
      if (selectedTabIds.has(candidate.tabId)) {
        selectedTabIds.delete(candidate.tabId);
      } else if (selectedTabIds.size < (dashboard?.cleanupLimit ?? 0)) {
        selectedTabIds.add(candidate.tabId);
      }
      if (dashboard) renderDashboard(dashboard);
    });
    candidateList.append(item);
  }
}

function renderDiscarded(discarded: DashboardTab[]): void {
  if (!discardedList) return;
  discardedList.replaceChildren();

  if (discarded.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty dormant-empty";
    empty.textContent = "현재 휴면 중인 탭이 없습니다.";
    discardedList.append(empty);
    return;
  }

  for (const tab of discarded.slice(0, 20)) {
    const item = document.createElement("li");
    item.className = "candidate dormant";

    const content = document.createElement("div");
    content.className = "candidate-content";

    const siteMark = document.createElement("span");
    siteMark.className = "site-mark dormant-mark";
    siteMark.textContent = "Z";
    siteMark.setAttribute("aria-hidden", "true");

    const text = document.createElement("div");
    text.className = "candidate-text";

    const title = document.createElement("strong");
    title.textContent = tab.title;
    title.title = tab.title;

    const meta = document.createElement("span");
    meta.textContent = `${tab.hostname ?? "알 수 없는 사이트"} · 메모리 해제됨`;

    const activateButton = document.createElement("button");
    activateButton.type = "button";
    activateButton.className = "activate-button";
    activateButton.textContent = "열기";
    activateButton.setAttribute("aria-label", `${tab.title} 탭 열기`);
    activateButton.addEventListener("click", () => {
      void activateTab(tab.tabId);
    });

    text.append(title, meta);
    content.append(siteMark, text);
    item.append(content, activateButton);
    discardedList.append(item);
  }
}

async function protectTab(tabId: number): Promise<void> {
  try {
    await sendMessage("PROTECT_TAB", { type: "PROTECT_TAB", tabId });
    await loadDashboard(false);
    setStatus("이 브라우저 세션 동안 탭을 보호합니다.");
  } catch {
    setStatus("탭을 보호하지 못했습니다.");
  }
}

async function discardOne(tabId: number): Promise<void> {
  try {
    const result = await sendMessage("DISCARD_ONE", {
      type: "DISCARD_ONE",
      tabId,
    });
    await loadDashboard(false);
    setStatus(
      result.successCount === 1
        ? "탭을 휴면 처리했습니다."
        : "탭 상태가 변경되어 휴면 처리하지 않았습니다.",
    );
  } catch {
    setStatus("탭을 휴면 처리하지 못했습니다.");
  }
}

async function activateTab(tabId: number): Promise<void> {
  try {
    await sendMessage("ACTIVATE_TAB", { type: "ACTIVATE_TAB", tabId });
    window.close();
  } catch {
    setStatus("휴면 탭을 열지 못했습니다.");
  }
}

async function undoCleanup(): Promise<void> {
  if (lastCleanedTabIds.length === 0 || !undoCleanupButton) return;
  undoCleanupButton.disabled = true;
  undoCleanupButton.textContent = localizeText("되돌리는 중…");

  try {
    const result = await sendMessage("REACTIVATE_TABS", {
      type: "REACTIVATE_TABS",
      tabIds: lastCleanedTabIds,
    });
    lastCleanedTabIds = [];
    lastCleanupCount = 0;
    await loadDashboard(false);
    setStatus(`탭 ${result.successCount}개를 다시 불러왔습니다.`);
  } catch {
    setStatus("방금 정리한 탭을 되돌리지 못했습니다.");
  } finally {
    undoCleanupButton.disabled = false;
    undoCleanupButton.textContent = localizeText("방금 정리 되돌리기");
    undoCleanupButton.hidden = lastCleanedTabIds.length === 0;
  }
}

function renderMemorySavings(
  savings: DashboardData["lastMemorySavings"],
  measurementFailed = false,
): void {
  if (!memorySavings) return;

  const label = memorySavings.querySelector("small");
  const value = memorySavings.querySelector("strong");

  if (measurementFailed) {
    setText(label, "최근 정리 추정치");
    setText(value, "메모리 변화를 측정하지 못했습니다");
    return;
  }

  if (!savings) {
    setText(label, "최근 정리 추정치");
    setText(value, "아직 측정된 절약량이 없습니다");
    return;
  }

  setText(
    label,
    `최근 정리 · 탭 ${savings.discardedTabs}개 · ${formatTime(savings.measuredAt)}`,
  );
  setText(
    value,
    savings.reclaimedBytes > 0
      ? `약 ${formatMemorySavings(savings.reclaimedBytes)} 확보`
      : "가용 메모리 증가가 감지되지 않았습니다",
  );
}

async function sendMessage<K extends keyof ResponseMap>(
  _type: K,
  message: Extract<RequestMessage, { type: K }>,
): Promise<ResponseMap[K]> {
  const response: AppResponse<ResponseMap[K]> =
    await chrome.runtime.sendMessage(message);

  if (!response.ok) {
    throw new Error(response.error.message);
  }

  return response.data;
}

function setStatus(message: string): void {
  setText(status, message);
}

function setText(element: HTMLElement | null, value: string): void {
  if (element) element.textContent = localizeText(value);
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 ** 3).toFixed(1)}GB`;
}

function formatMemorySavings(bytes: number): string {
  if (bytes < 1024 ** 2) return `${Math.round(bytes / 1024)}KB`;
  if (bytes < 1024 ** 3) return `${Math.round(bytes / 1024 ** 2)}MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)}GB`;
}

function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat(chrome.i18n.getUILanguage(), {
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

function formatInactive(minutes: number | null): string {
  if (minutes === null) return "사용 시각 확인 불가";
  if (minutes < 60) return `${minutes}분 전`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}시간 전`;
  return `${Math.floor(minutes / (24 * 60))}일 전`;
}

function formatReasons(reasonCodes: DashboardTab["reasonCodes"]): string {
  if (reasonCodes.includes("inactive-over-24-hours")) {
    return "24시간 이상 사용하지 않음";
  }
  if (reasonCodes.includes("inactive-over-6-hours")) {
    return "6시간 이상 사용하지 않음";
  }
  if (reasonCodes.includes("background-window")) {
    return "다른 창의 비활성 탭";
  }
  return "설정한 비활성 기준을 넘김";
}

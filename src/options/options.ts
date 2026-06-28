import "./options.css";
import { DEFAULT_SETTINGS } from "../lib/constants";
import { normalizeProtectedDomain } from "../lib/domain";
import { localizeText, translateStaticPage } from "../lib/i18n";
import { applyTheme, watchSystemTheme } from "../lib/theme";
import type { AppResponse, RequestMessage, ResponseMap } from "../lib/messages";
import type {
  AutoCleanupStatus,
  CleanupHistoryEntry,
  Settings,
} from "../lib/types";

const settingsForm = document.querySelector<HTMLFormElement>("#settings-form");
const layoutOptions = document.querySelector<HTMLElement>("#layout-options");
const popupPreview =
  document.querySelector<HTMLIFrameElement>("#popup-preview");
const previewLayout = document.querySelector<HTMLElement>("#preview-layout");
const thresholdSelect = document.querySelector<HTMLSelectElement>(
  "#inactivity-threshold",
);
const maxTabsInput = document.querySelector<HTMLInputElement>("#max-tabs");
const autoCleanupEnabled = document.querySelector<HTMLInputElement>(
  "#auto-cleanup-enabled",
);
const autoCleanupInterval = document.querySelector<HTMLSelectElement>(
  "#auto-cleanup-interval",
);
const lowMemoryThreshold = document.querySelector<HTMLSelectElement>(
  "#low-memory-threshold",
);
const themeOptions = document.querySelector<HTMLElement>("#theme-options");
const restoreButton =
  document.querySelector<HTMLButtonElement>("#restore-defaults");
const saveStatus = document.querySelector<HTMLElement>("#save-status");
const domainForm = document.querySelector<HTMLFormElement>("#domain-form");
const domainInput = document.querySelector<HTMLInputElement>("#domain-input");
const domainError = document.querySelector<HTMLElement>("#domain-error");
const domainList = document.querySelector<HTMLUListElement>("#domain-list");
const historyList = document.querySelector<HTMLUListElement>("#history-list");
const clearHistoryButton =
  document.querySelector<HTMLButtonElement>("#clear-history");
const openActivityButton =
  document.querySelector<HTMLButtonElement>("#open-activity");
const openOnboardingButton =
  document.querySelector<HTMLButtonElement>("#open-onboarding");
const runAutoCheckButton =
  document.querySelector<HTMLButtonElement>("#run-auto-check");
const autoStatusTitle =
  document.querySelector<HTMLElement>("#auto-status-title");
const autoStatusDetail = document.querySelector<HTMLElement>(
  "#auto-status-detail",
);
const autoNextCheck = document.querySelector<HTMLElement>("#auto-next-check");

let settings: Settings = DEFAULT_SETTINGS;
let autoCleanupStatus: AutoCleanupStatus | null = null;

translateStaticPage();

settingsForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  void saveFormSettings();
});

layoutOptions?.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
    "[data-layout]",
  );
  const layout = button?.dataset.layout;
  if (layout === "a" || layout === "b" || layout === "c") {
    void saveSettings({ popupLayout: layout });
  }
});

themeOptions?.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
    "[data-theme-value]",
  );
  const theme = button?.dataset.themeValue;
  if (theme === "system" || theme === "light" || theme === "dark") {
    void saveSettings({ theme });
  }
});

restoreButton?.addEventListener("click", () => {
  void saveSettings({
    inactivityThresholdMinutes: DEFAULT_SETTINGS.inactivityThresholdMinutes,
    maxTabsPerCleanup: DEFAULT_SETTINGS.maxTabsPerCleanup,
    autoCleanupEnabled: DEFAULT_SETTINGS.autoCleanupEnabled,
    autoCleanupIntervalMinutes: DEFAULT_SETTINGS.autoCleanupIntervalMinutes,
    lowMemoryThresholdPercent: DEFAULT_SETTINGS.lowMemoryThresholdPercent,
    popupLayout: DEFAULT_SETTINGS.popupLayout,
    theme: DEFAULT_SETTINGS.theme,
    protectedDomains: DEFAULT_SETTINGS.protectedDomains,
  });
});

autoCleanupEnabled?.addEventListener("change", () => {
  updateAutoCleanupControls();
  void saveSettings({
    autoCleanupEnabled: autoCleanupEnabled.checked,
    autoCleanupIntervalMinutes: Number(autoCleanupInterval?.value),
  });
});

autoCleanupInterval?.addEventListener("change", () => {
  void saveSettings({
    autoCleanupIntervalMinutes: Number(autoCleanupInterval.value),
  });
});

lowMemoryThreshold?.addEventListener("change", () => {
  void saveSettings({
    lowMemoryThresholdPercent: Number(lowMemoryThreshold.value),
  });
});

domainForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  void addDomain();
});

clearHistoryButton?.addEventListener("click", () => {
  void clearHistory();
});

openActivityButton?.addEventListener("click", () => {
  void chrome.tabs.create({ url: chrome.runtime.getURL("activity.html") });
});

openOnboardingButton?.addEventListener("click", () => {
  void chrome.tabs.create({ url: chrome.runtime.getURL("onboarding.html") });
});

runAutoCheckButton?.addEventListener("click", () => {
  void runAutoCleanupCheck();
});

watchSystemTheme(() => settings.theme);

void loadPage();

async function loadPage(): Promise<void> {
  try {
    const [loadedSettings, history, loadedAutoStatus] = await Promise.all([
      sendMessage("GET_SETTINGS", { type: "GET_SETTINGS" }),
      sendMessage("GET_HISTORY", { type: "GET_HISTORY" }),
      sendMessage("GET_AUTO_CLEANUP_STATUS", {
        type: "GET_AUTO_CLEANUP_STATUS",
      }),
    ]);
    settings = loadedSettings;
    autoCleanupStatus = loadedAutoStatus;
    renderSettings();
    renderHistory(history);
  } catch {
    setSaveStatus("설정을 불러오지 못했습니다.", true);
  }
}

async function saveFormSettings(): Promise<void> {
  const inactivityThresholdMinutes = Number(thresholdSelect?.value);
  const maxTabsPerCleanup = Number(maxTabsInput?.value);

  await saveSettings({
    inactivityThresholdMinutes,
    maxTabsPerCleanup,
  });
}

async function saveSettings(
  patch: Partial<Omit<Settings, "schemaVersion">>,
): Promise<void> {
  setSaveStatus("저장 중…");

  try {
    settings = await sendMessage("UPDATE_SETTINGS", {
      type: "UPDATE_SETTINGS",
      patch,
    });
    autoCleanupStatus = await sendMessage("GET_AUTO_CLEANUP_STATUS", {
      type: "GET_AUTO_CLEANUP_STATUS",
    });
    renderSettings();
    refreshPopupPreview();
    setSaveStatus("저장했습니다.");
  } catch {
    setSaveStatus("설정을 저장하지 못했습니다.", true);
  }
}

async function addDomain(): Promise<void> {
  const normalized = normalizeProtectedDomain(domainInput?.value ?? "");

  if (!normalized) {
    setDomainError("경로 없이 example.com 형태로 입력해 주세요.");
    return;
  }

  if (settings.protectedDomains.includes(normalized)) {
    setDomainError("이미 등록된 도메인입니다.");
    return;
  }

  setDomainError("");
  await saveSettings({
    protectedDomains: [...settings.protectedDomains, normalized],
  });
  if (domainInput) domainInput.value = "";
}

async function removeDomain(domain: string): Promise<void> {
  await saveSettings({
    protectedDomains: settings.protectedDomains.filter(
      (item) => item !== domain,
    ),
  });
}

async function clearHistory(): Promise<void> {
  if (!window.confirm(localizeText("저장된 정리 기록을 모두 삭제할까요?"))) {
    return;
  }

  try {
    await sendMessage("CLEAR_HISTORY", { type: "CLEAR_HISTORY" });
    renderHistory([]);
  } catch {
    setSaveStatus("정리 기록을 삭제하지 못했습니다.", true);
  }
}

function renderSettings(): void {
  if (thresholdSelect) {
    ensureThresholdOption(settings.inactivityThresholdMinutes);
    thresholdSelect.value = settings.inactivityThresholdMinutes.toString();
  }
  if (maxTabsInput) {
    maxTabsInput.value = settings.maxTabsPerCleanup.toString();
  }
  if (autoCleanupEnabled) {
    autoCleanupEnabled.checked = settings.autoCleanupEnabled;
  }
  if (autoCleanupInterval) {
    autoCleanupInterval.value = settings.autoCleanupIntervalMinutes.toString();
  }
  if (lowMemoryThreshold) {
    lowMemoryThreshold.value = settings.lowMemoryThresholdPercent.toString();
  }
  applyTheme(settings.theme);
  const themeButtons = themeOptions
    ? Array.from(
        themeOptions.querySelectorAll<HTMLButtonElement>("[data-theme-value]"),
      )
    : [];
  for (const button of themeButtons) {
    const selected = button.dataset.themeValue === settings.theme;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  }
  const layoutButtons = layoutOptions
    ? Array.from(
        layoutOptions.querySelectorAll<HTMLButtonElement>("[data-layout]"),
      )
    : [];
  for (const button of layoutButtons) {
    const selected = button.dataset.layout === settings.popupLayout;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  }
  setText(previewLayout, settings.popupLayout.toUpperCase());
  updateAutoCleanupControls();
  renderAutoCleanupStatus();
  renderDomains();
}

function refreshPopupPreview(): void {
  if (!popupPreview) return;
  popupPreview.src = `${chrome.runtime.getURL("popup.html")}?preview=${Date.now()}`;
}

function updateAutoCleanupControls(): void {
  if (autoCleanupInterval) {
    autoCleanupInterval.disabled = !(autoCleanupEnabled?.checked ?? false);
  }
  if (lowMemoryThreshold) {
    lowMemoryThreshold.disabled = !(autoCleanupEnabled?.checked ?? false);
  }
  if (runAutoCheckButton) {
    runAutoCheckButton.disabled = !(autoCleanupEnabled?.checked ?? false);
  }
}

async function runAutoCleanupCheck(): Promise<void> {
  if (!runAutoCheckButton) return;
  runAutoCheckButton.disabled = true;
  runAutoCheckButton.textContent = localizeText("검사 중…");
  setText(autoStatusTitle, "자동 정리 조건 확인 중");
  setText(autoStatusDetail, "메모리와 정리 후보를 확인하고 있습니다.");

  try {
    autoCleanupStatus = await sendMessage("RUN_AUTO_CLEANUP_CHECK", {
      type: "RUN_AUTO_CLEANUP_CHECK",
    });
    renderAutoCleanupStatus();
  } catch {
    setText(autoStatusTitle, "검사를 완료하지 못했습니다");
    setText(autoStatusDetail, "잠시 후 다시 시도해 주세요.");
  } finally {
    runAutoCheckButton.textContent = localizeText("지금 자동 검사");
    runAutoCheckButton.disabled = !settings.autoCleanupEnabled;
  }
}

function renderAutoCleanupStatus(): void {
  const state = autoCleanupStatus;
  if (!state) return;

  if (!state.enabled) {
    setText(autoStatusTitle, "자동 정리가 꺼져 있습니다");
    setText(autoStatusDetail, "스위치를 켜면 설정한 주기로 조건을 확인합니다.");
    setText(autoNextCheck, "예약 없음");
    return;
  }

  const memoryText =
    state.availableMemoryPercent === null
      ? ""
      : ` · 당시 여유 메모리 ${Math.round(state.availableMemoryPercent)}%`;
  const candidateText =
    state.candidateCount === null ? "" : ` · 후보 ${state.candidateCount}개`;
  const checkedText =
    state.lastCheckedAt === null
      ? ""
      : `${formatRelativeDate(state.lastCheckedAt)} 검사`;

  switch (state.outcome) {
    case "never-checked":
      setText(autoStatusTitle, "아직 자동 검사를 실행하지 않았습니다");
      setText(
        autoStatusDetail,
        "예약 시각을 기다리거나 지금 검사할 수 있습니다.",
      );
      break;
    case "memory-above-threshold":
      setText(autoStatusTitle, "메모리 여유가 있어 정리하지 않았습니다");
      setText(
        autoStatusDetail,
        `${checkedText}${memoryText} · 실행 기준 ${state.thresholdPercent}% 이하`,
      );
      break;
    case "memory-unavailable":
      setText(autoStatusTitle, "메모리 상태를 확인하지 못했습니다");
      setText(
        autoStatusDetail,
        `${checkedText} · 탭 정리는 실행하지 않았습니다.`,
      );
      break;
    case "no-candidates":
      setText(autoStatusTitle, "안전하게 정리할 후보가 없었습니다");
      setText(autoStatusDetail, `${checkedText}${memoryText}${candidateText}`);
      break;
    case "cleaned":
      setText(
        autoStatusTitle,
        `탭 ${state.cleanedCount}개를 자동 정리했습니다`,
      );
      setText(autoStatusDetail, `${checkedText}${memoryText}${candidateText}`);
      break;
    case "already-running":
      setText(autoStatusTitle, "자동 검사가 이미 진행 중입니다");
      setText(autoStatusDetail, "잠시 후 상태를 다시 확인해 주세요.");
      break;
    case "error":
      setText(autoStatusTitle, "자동 검사 중 오류가 발생했습니다");
      setText(
        autoStatusDetail,
        `${checkedText} · 탭 정리는 실행하지 않았습니다.`,
      );
      break;
    case "disabled":
      setText(autoStatusTitle, "자동 정리가 꺼져 있었습니다");
      setText(autoStatusDetail, checkedText);
      break;
  }

  setText(
    autoNextCheck,
    state.nextCheckAt === null
      ? "예약 확인 불가"
      : formatNextCheck(state.nextCheckAt),
  );
}

function renderDomains(): void {
  if (!domainList) return;
  domainList.replaceChildren();

  for (const domain of settings.protectedDomains) {
    const item = document.createElement("li");
    const label = document.createElement("code");
    label.textContent = domain;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-button";
    removeButton.textContent = "삭제";
    removeButton.setAttribute("aria-label", `${domain} 보호 해제`);
    removeButton.addEventListener("click", () => {
      void removeDomain(domain);
    });

    item.append(label, removeButton);
    domainList.append(item);
  }
  translateStaticPage(domainList);
}

function renderHistory(history: CleanupHistoryEntry[]): void {
  if (!historyList) return;
  historyList.replaceChildren();

  if (clearHistoryButton) {
    clearHistoryButton.disabled = history.length === 0;
  }

  if (history.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "아직 정리 기록이 없습니다.";
    historyList.append(empty);
    translateStaticPage(historyList);
    return;
  }

  for (const entry of history) {
    const item = document.createElement("li");
    item.className = "history-item";

    const content = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = entry.title;
    title.title = entry.title;

    const meta = document.createElement("span");
    const triggerText = entry.trigger === "automatic" ? "자동" : "수동";
    const reactivationText = entry.reactivatedAt
      ? ` · 다시 사용 ${formatDate(entry.reactivatedAt)}`
      : "";
    meta.textContent = `${entry.domain ?? "알 수 없는 사이트"} · ${triggerText} 휴면 ${formatDate(entry.discardedAt)}${reactivationText}`;

    const result = document.createElement("span");
    result.className =
      entry.result === "success" ? "result success" : "result failed";
    result.textContent = entry.result === "success" ? "휴면 완료" : "실패";

    content.append(title, meta);
    item.append(content, result);
    historyList.append(item);
  }
  translateStaticPage(historyList);
}

function ensureThresholdOption(value: number): void {
  if (!thresholdSelect) return;
  const exists = Array.from(thresholdSelect.options).some(
    (option) => Number(option.value) === value,
  );
  if (!exists) {
    const option = document.createElement("option");
    option.value = value.toString();
    option.textContent = localizeText(`${value}분`);
    thresholdSelect.append(option);
  }
}

function setSaveStatus(message: string, isError = false): void {
  if (!saveStatus) return;
  saveStatus.textContent = localizeText(message);
  saveStatus.classList.toggle("error", isError);
}

function setDomainError(message: string): void {
  if (domainError) domainError.textContent = localizeText(message);
}

function setText(element: HTMLElement | null, value: string): void {
  if (element) element.textContent = localizeText(value);
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat(chrome.i18n.getUILanguage(), {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

function formatRelativeDate(timestamp: number): string {
  const elapsedMinutes = Math.max(
    0,
    Math.floor((Date.now() - timestamp) / 60_000),
  );
  if (elapsedMinutes < 1) return "방금";
  if (elapsedMinutes < 60) return `${elapsedMinutes}분 전`;
  if (elapsedMinutes < 24 * 60) {
    return `${Math.floor(elapsedMinutes / 60)}시간 전`;
  }
  return `${Math.floor(elapsedMinutes / (24 * 60))}일 전`;
}

function formatNextCheck(timestamp: number): string {
  const remainingMinutes = Math.max(
    0,
    Math.ceil((timestamp - Date.now()) / 60_000),
  );
  if (remainingMinutes <= 1) return "1분 이내";
  if (remainingMinutes < 60) return `${remainingMinutes}분 후`;
  return `${Math.floor(remainingMinutes / 60)}시간 ${remainingMinutes % 60}분 후`;
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

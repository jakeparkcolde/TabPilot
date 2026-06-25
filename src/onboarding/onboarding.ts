import "./onboarding.css";
import type { AppResponse, RequestMessage, ResponseMap } from "../lib/messages";
import { applyTheme } from "../lib/theme";
import type { Settings } from "../lib/types";

const form = document.querySelector<HTMLFormElement>("#onboarding-form");
const completeButton = document.querySelector<HTMLButtonElement>("#complete");
const status = document.querySelector<HTMLElement>("#status");

const PRESETS: Record<string, string[]> = {
  work: ["docs.google.com", "figma.com", "notion.so"],
  developer: ["github.com", "localhost", "127.0.0.1"],
  communication: ["mail.google.com", "slack.com", "discord.com"],
};
const PRESET_DOMAINS = new Set(Object.values(PRESETS).flat());
let currentSettings: Settings | null = null;

void initialize();

async function initialize(): Promise<void> {
  try {
    const settings = await sendMessage("GET_SETTINGS", {
      type: "GET_SETTINGS",
    });
    currentSettings = settings;
    applyTheme(settings.theme);
    restoreCurrentSettings(settings);
  } catch {
    applyTheme("system");
  }
}

function restoreCurrentSettings(settings: Settings): void {
  const threshold = document.querySelector<HTMLInputElement>(
    `input[name="threshold"][value="${settings.inactivityThresholdMinutes}"]`,
  );
  if (threshold) threshold.checked = true;

  for (const input of Array.from(
    document.querySelectorAll<HTMLInputElement>('input[name="preset"]'),
  )) {
    const preset = input.value;
    input.checked =
      PRESETS[preset]?.every((domain) =>
        settings.protectedDomains.includes(domain),
      ) ?? false;
  }

  const autoCleanup = document.querySelector<HTMLInputElement>("#auto-cleanup");
  if (autoCleanup) autoCleanup.checked = settings.autoCleanupEnabled;
}

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  void completeOnboarding();
});

async function completeOnboarding(): Promise<void> {
  if (!form || !completeButton) return;
  completeButton.disabled = true;
  completeButton.textContent = "설정 저장 중…";
  setStatus("");

  const formData = new FormData(form);
  const threshold = Number(formData.get("threshold"));
  const selectedPresets = formData
    .getAll("preset")
    .filter((value): value is string => typeof value === "string");
  const protectedDomains = [
    ...new Set([
      ...(currentSettings?.protectedDomains.filter(
        (domain) => !PRESET_DOMAINS.has(domain),
      ) ?? []),
      ...selectedPresets.flatMap((preset) => PRESETS[preset] ?? []),
    ]),
  ];
  const autoCleanupEnabled =
    document.querySelector<HTMLInputElement>("#auto-cleanup")?.checked ?? false;

  try {
    await sendMessage("COMPLETE_ONBOARDING", {
      type: "COMPLETE_ONBOARDING",
      patch: {
        inactivityThresholdMinutes: threshold,
        protectedDomains,
        autoCleanupEnabled,
        autoCleanupIntervalMinutes: 30,
        lowMemoryThresholdPercent: 15,
      },
    });
    document.body.classList.add("complete");
    completeButton.textContent = "설정 완료";
    setStatus(
      "TabPilot 설정을 저장했습니다. 이 탭을 닫고 확장 아이콘을 눌러주세요.",
    );
  } catch {
    completeButton.disabled = false;
    completeButton.textContent = "설정 완료하고 시작하기";
    setStatus("설정을 저장하지 못했습니다. 다시 시도해 주세요.");
  }
}

function setStatus(message: string): void {
  if (status) status.textContent = message;
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

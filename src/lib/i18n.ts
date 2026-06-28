type Replacement = {
  pattern: RegExp;
  replace: (...matches: string[]) => string;
};

const STATIC_ENGLISH: Record<string, string> = {
  "TabPilot 설정": "TabPilot Settings",
  "TabPilot 활동 관리": "TabPilot Activity",
  "TabPilot 시작하기": "Get started with TabPilot",
  "탭 정리": "Tab cleanup",
  "전체 관리": "Manage all",
  "전체 탭 관리 열기": "Open all tab manager",
  "전체 탭 관리": "All tab manager",
  "새로고침": "Refresh",
  "탭 상태 새로고침": "Refresh tab status",
  "TabPilot 설정 열기": "Open TabPilot settings",
  "설정": "Settings",
  "탭 상태 요약": "Tab status summary",
  "전체": "Total",
  "후보": "Candidates",
  "휴면": "Sleeping",
  "전체 탭": "Total tabs",
  "정리 후보": "Cleanup candidates",
  "안전하게 메모리를 줄일 수 있어요": "Safely reduce memory usage",
  "사용 가능 메모리": "Available memory",
  "탭 상태 확인 중": "Checking tab status",
  "작업 중인 탭은 보호하고 오래 사용하지 않은 탭만 정리합니다.":
    "Protect active work tabs and clean up only inactive tabs.",
  "전체 메모리": "Total memory",
  "시스템 여유": "System available",
  "Chrome 점유": "Chrome usage",
  "측정 제한": "Limited",
  "정리 가능 추정": "Estimated cleanup",
  "측정 전": "Not measured",
  "최근 정리 추정치": "Recent cleanup estimate",
  "아직 측정된 절약량이 없습니다": "No measured savings yet",
  "안전 정리하기": "Safe cleanup",
  "방금 정리 되돌리기": "Undo last cleanup",
  "어떤 탭이 정리되나요?": "Which tabs will be cleaned?",
  "검토 목록 접기": "Hide review list",
  "정리 중…": "Cleaning…",
  "실행 직전 탭 상태를 다시 확인하고 있습니다.":
    "Rechecking tab status before cleanup.",
  "현재 안전하게 정리할 후보가 없습니다.":
    "There are no safe cleanup candidates right now.",
  "탭 상태를 불러오지 못했습니다.": "Could not load tab status.",
  "탭 정리를 완료하지 못했습니다.": "Could not complete tab cleanup.",
  "확인 불가": "Unavailable",
  "탭을 선택하세요": "Select tabs",
  "모두 해제": "Deselect all",
  "정리 준비 완료": "Ready to clean",
  "정리할 탭이 없어요": "No tabs to clean",
  "필요하면 아래 버튼으로 방금 정리한 탭을 다시 불러올 수 있어요.":
    "Use the button below to restore the tabs you just cleaned.",
  "지금은 모든 탭이 사용 중이거나 보호되어 있습니다.":
    "All tabs are currently in use or protected.",
  "비활성 기준을 넘긴 안전한 후보가 없습니다.":
    "No safe candidates exceed the inactivity threshold.",
  "알 수 없는 사이트": "Unknown site",
  "보호": "Protect",
  "열기": "Open",
  "현재 휴면 중인 탭이 없습니다.": "No tabs are sleeping right now.",
  "메모리 해제됨": "Memory released",
  "이 브라우저 세션 동안 탭을 보호합니다.":
    "This tab is protected for the current browser session.",
  "탭을 보호하지 못했습니다.": "Could not protect the tab.",
  "탭을 휴면 처리했습니다.": "Put the tab to sleep.",
  "탭 상태가 변경되어 휴면 처리하지 않았습니다.":
    "The tab changed state, so it was not put to sleep.",
  "탭을 휴면 처리하지 못했습니다.": "Could not put the tab to sleep.",
  "휴면 탭을 열지 못했습니다.": "Could not open the sleeping tab.",
  "되돌리는 중…": "Restoring…",
  "방금 정리한 탭을 되돌리지 못했습니다.":
    "Could not restore the tabs from the last cleanup.",
  "메모리 변화를 측정하지 못했습니다": "Could not measure memory change",
  "가용 메모리 증가가 감지되지 않았습니다":
    "No increase in available memory was detected",
  "사용 시각 확인 불가": "Last use unknown",
  "24시간 이상 사용하지 않음": "Inactive for over 24 hours",
  "6시간 이상 사용하지 않음": "Inactive for over 6 hours",
  "다른 창의 비활성 탭": "Inactive tab in another window",
  "설정한 비활성 기준을 넘김": "Exceeded the inactivity threshold",
  "REVIEW": "REVIEW",
  "정리할 탭": "Tabs to clean",
  "모두 선택": "Select all",
  "SLEEPING": "SLEEPING",
  "휴면 중인 탭": "Sleeping tabs",
  "설정 저장 중…": "Saving settings…",
  "설정 완료": "Setup complete",
  "설정 완료하고 시작하기": "Finish setup and start",
  "TabPilot 설정을 저장했습니다. 이 탭을 닫고 확장 아이콘을 눌러주세요.":
    "TabPilot settings were saved. Close this tab and click the extension icon.",
  "설정을 저장하지 못했습니다. 다시 시도해 주세요.":
    "Could not save settings. Please try again.",
  "WELCOME": "WELCOME",
  "중요한 탭은 지키고,\n메모리만 가볍게.":
    "Keep important tabs,\nmake memory lighter.",
  "중요한 탭은 지키고,": "Keep important tabs,",
  "메모리만 가볍게.": "make memory lighter.",
  "TabPilot은 탭을 닫지 않습니다. 오래 사용하지 않은 탭을 Chrome의 휴면 상태로 전환하고, 다시 열면 페이지를 새로 불러옵니다.":
    "TabPilot does not close tabs. It puts inactive tabs into Chrome's sleeping state and reloads them when you open them again.",
  "안전 우선": "Safety first",
  "활성·고정·오디오 탭 제외": "Skip active, pinned, and audio tabs",
  "언제든 복구": "Recover anytime",
  "휴면 탭과 되돌리기 제공": "Sleeping tabs and undo are available",
  "기기 안에서": "On your device",
  "외부 서버 전송 없음": "No external server transfer",
  "기본 정리 기준": "Default cleanup threshold",
  "처음 사용하기 좋은 안전한 기준을 선택하세요.":
    "Choose a safe default for first use.",
  "30분": "30 minutes",
  "빠른 정리": "Fast cleanup",
  "1시간": "1 hour",
  "권장": "Recommended",
  "6시간": "6 hours",
  "보수적": "Conservative",
  "항상 보호할 사이트": "Sites to always protect",
  "선택한 사이트와 하위 도메인은 자동·수동 정리에서 제외됩니다.":
    "Selected sites and subdomains are excluded from automatic and manual cleanup.",
  "문서·디자인": "Docs & design",
  "개발 도구": "Developer tools",
  "커뮤니케이션": "Communication",
  "자동 정리": "Automatic cleanup",
  "기본값은 꺼짐입니다. 켜도 메모리 조건과 안전 조건을 모두 확인합니다.":
    "Off by default. When enabled, memory and safety conditions are still checked.",
  "저메모리 상태에서 자동 정리 사용": "Use automatic cleanup when memory is low",
  "30분마다 확인하고 시스템 여유 메모리 15% 이하에서만 실행":
    "Checks every 30 minutes and runs only when system available memory is 15% or lower",
  "설정은 언제든 변경할 수 있습니다.":
    "You can change these settings anytime.",
  "Chrome 도구 모음의 TabPilot 아이콘을 눌러 첫 정리를 시작하세요.":
    "Click the TabPilot icon in the Chrome toolbar to start your first cleanup.",
  "사용 안내 다시 보기": "View onboarding again",
  "탭 정리 기준과 보호할 사이트를 관리합니다.":
    "Manage tab cleanup rules and protected sites.",
  "화면 테마": "Theme",
  "시스템 설정을 따르거나 밝은 화면과 어두운 화면을 고정합니다.":
    "Follow system settings or lock light/dark mode.",
  "시스템": "System",
  "라이트": "Light",
  "다크": "Dark",
  "팝업 레이아웃": "Popup layout",
  "확장 아이콘을 눌렀을 때 사용할 화면을 선택하세요.":
    "Choose the screen shown when clicking the extension icon.",
  "요약 중심": "Summary focused",
  "큰 숫자와 원클릭 정리": "Large numbers and one-click cleanup",
  "컴팩트·선택": "Compact selection",
  "탭을 직접 골라 정리": "Select tabs manually",
  "흐름·가이드": "Guided flow",
  "메모리 상태 중심 안내": "Memory-focused guidance",
  "정리 기준": "Cleanup rules",
  "수동 정리와 자동 정리에 동일하게 적용됩니다.":
    "Applied to both manual and automatic cleanup.",
  "기본값 복원": "Restore defaults",
  "비활성 기준": "Inactivity threshold",
  "마지막 사용 이후 지난 시간": "Time since last use",
  "한 번에 정리할 탭": "Tabs per cleanup",
  "최대 20개까지 설정 가능": "Up to 20 tabs",
  "변경사항 저장": "Save changes",
  "보호하지 않은 후보를 주기적으로 확인해 자동 휴면합니다.":
    "Periodically checks unprotected candidates and puts them to sleep.",
  "자동 정리 사용": "Enable automatic cleanup",
  "검사 주기": "Check interval",
  "15분마다": "Every 15 minutes",
  "30분마다": "Every 30 minutes",
  "1시간마다": "Every hour",
  "여유 메모리 기준": "Available memory threshold",
  "10% 이하": "10% or lower",
  "15% 이하": "15% or lower",
  "20% 이하": "20% or lower",
  "25% 이하": "25% or lower",
  "자동 정리 상태": "Automatic cleanup status",
  "확인 중…": "Checking…",
  "마지막 검사 결과를 불러오고 있습니다.":
    "Loading the last check result.",
  "다음 검사": "Next check",
  "지금 자동 검사": "Run check now",
  "설정을 불러오지 못했습니다.": "Could not load settings.",
  "저장 중…": "Saving…",
  "저장했습니다.": "Saved.",
  "설정을 저장하지 못했습니다.": "Could not save settings.",
  "경로 없이 example.com 형태로 입력해 주세요.":
    "Enter a domain like example.com without a path.",
  "이미 등록된 도메인입니다.": "This domain is already registered.",
  "저장된 정리 기록을 모두 삭제할까요?":
    "Delete all saved cleanup history?",
  "정리 기록을 삭제하지 못했습니다.": "Could not clear cleanup history.",
  "검사 중…": "Checking…",
  "자동 정리 조건 확인 중": "Checking automatic cleanup conditions",
  "메모리와 정리 후보를 확인하고 있습니다.":
    "Checking memory and cleanup candidates.",
  "검사를 완료하지 못했습니다": "Could not complete the check",
  "잠시 후 다시 시도해 주세요.": "Please try again shortly.",
  "자동 정리가 꺼져 있습니다": "Automatic cleanup is off",
  "스위치를 켜면 설정한 주기로 조건을 확인합니다.":
    "Turn on the switch to check conditions on your schedule.",
  "예약 없음": "Not scheduled",
  "아직 자동 검사를 실행하지 않았습니다":
    "Automatic check has not run yet",
  "예약 시각을 기다리거나 지금 검사할 수 있습니다.":
    "Wait for the scheduled time or run a check now.",
  "메모리 여유가 있어 정리하지 않았습니다":
    "Memory was available, so cleanup did not run",
  "메모리 상태를 확인하지 못했습니다":
    "Could not check memory status",
  "탭 정리는 실행하지 않았습니다.": "Tab cleanup did not run.",
  "안전하게 정리할 후보가 없었습니다":
    "There were no safe cleanup candidates",
  "자동 검사가 이미 진행 중입니다": "An automatic check is already running",
  "잠시 후 상태를 다시 확인해 주세요.":
    "Please check the status again shortly.",
  "자동 검사 중 오류가 발생했습니다":
    "An error occurred during the automatic check",
  "자동 정리가 꺼져 있었습니다": "Automatic cleanup was off",
  "예약 확인 불가": "Schedule unavailable",
  "삭제": "Remove",
  "아직 정리 기록이 없습니다.": "No cleanup history yet.",
  "자동": "Automatic",
  "수동": "Manual",
  "휴면 완료": "Slept",
  "실패": "Failed",
  "다시 사용": "Reactivated",
  "방금": "Just now",
  "1분 이내": "Within 1 minute",
  "검사 시 시스템 여유 메모리가 기준 이하일 때만 실행합니다. 활성·고정·소리 재생·로딩 탭과 보호 탭은 항상 제외됩니다.":
    "Runs only when available system memory is below the threshold. Active, pinned, audible, loading, and protected tabs are always skipped.",
  "보호 도메인": "Protected domains",
  "등록한 사이트와 서브도메인은 항상 정리에서 제외됩니다.":
    "Registered sites and subdomains are always excluded from cleanup.",
  "도메인 추가": "Add domain",
  "팝업 미리보기": "Popup preview",
  "선택한 레이아웃이 실제 데이터로 표시됩니다.":
    "The selected layout is shown with real data.",
  "최근 정리": "Recent cleanup",
  "이 기기에만 저장되는 최근 기록입니다.":
    "Recent history stored only on this device.",
  "모두 삭제": "Delete all",
  "휴면 탭과 전체 기록 관리": "Manage sleeping tabs and full history",
  "데이터는 기기 안에만": "Data stays on your device",
  "탭 제목과 도메인을 외부로 전송하지 않으며 모든 사이트 접근 권한도 사용하지 않습니다.":
    "Tab titles and domains are not sent externally, and TabPilot does not request access to all sites.",
  "열린 탭을 검색하고 보호·휴면·재활성화 상태를 한곳에서 관리합니다.":
    "Search open tabs and manage protected, sleeping, and reactivated states in one place.",
  "활동 요약": "Activity summary",
  "ALL TABS": "ALL TABS",
  "열린 탭": "Open tabs",
  "탭 검색": "Search tabs",
  "탭 제목이나 도메인 검색": "Search tab title or domain",
  "탭 상태 필터": "Tab status filter",
  "보호됨": "Protected",
  "활성": "Active",
  "HISTORY": "HISTORY",
  "정리 기록": "Cleanup history",
  "기록 삭제": "Clear history",
  "설정과 탭 상태를 불러오지 못했습니다.":
    "Could not load settings and tab status.",
  "탭 상태를 불러오는 중…": "Loading tab status…",
  "검색 조건에 맞는 탭이 없습니다.":
    "No tabs match your search.",
  "선택한 상태의 탭이 없습니다.": "No tabs match the selected state.",
  "내부 페이지": "Internal page",
  "다시 열기": "Reopen",
  "보호 해제": "Unprotect",
  "탭 보호": "Tab protected",
  "도메인 보호": "Domain protected",
  "고정": "Pinned",
  "소리 재생": "Playing audio",
  "현재 메모리가 해제된 휴면 상태입니다.":
    "This tab is sleeping and its memory is released.",
  "설정한 비활성 기준을 넘어 안전 정리가 가능합니다.":
    "This tab exceeded the inactivity threshold and can be safely cleaned.",
  "현재 사용 중인 탭이라 정리하지 않습니다.":
    "This tab is active, so it will not be cleaned.",
  "이 브라우저 세션 동안 보호한 탭입니다.":
    "This tab is protected for this browser session.",
  "보호 도메인에 포함된 탭입니다.":
    "This tab belongs to a protected domain.",
  "고정 탭이라 정리하지 않습니다.": "Pinned tabs are not cleaned.",
  "소리를 재생 중이라 정리하지 않습니다.":
    "Tabs playing audio are not cleaned.",
  "페이지를 불러오는 중이라 정리하지 않습니다.":
    "Loading tabs are not cleaned.",
  "Chrome 내부 페이지 등 지원하지 않는 주소입니다.":
    "This is an unsupported address such as a Chrome internal page.",
  "아직 설정한 비활성 기준에 도달하지 않았습니다.":
    "This tab has not reached the inactivity threshold yet.",
  "현재 상태에서는 안전 정리 대상이 아닙니다.":
    "This tab is not a safe cleanup target in its current state.",
  "탭을 보호했습니다.": "Protected the tab.",
  "탭 보호를 해제했습니다.": "Removed tab protection.",
  "탭 보호 상태를 변경하지 못했습니다.":
    "Could not change tab protection.",
  "탭 상태가 바뀌어 휴면 처리하지 않았습니다.":
    "The tab changed state, so it was not put to sleep.",
  "탭을 열지 못했습니다.": "Could not open the tab.",
  "이 기기에 저장된 정리 기록을 모두 삭제할까요?":
    "Delete all cleanup history stored on this device?",
  "24시간 이상 미사용": "Inactive over 24 hours",
  "6시간 이상 미사용": "Inactive over 6 hours",
  "비활성 기준 초과": "Exceeded inactivity threshold",
};

const REGEX_ENGLISH: Replacement[] = [
  {
    pattern: /^보호됨 (\d+)$/,
    replace: (_, count) => `Protected ${count}`,
  },
  {
    pattern: /^(\d+)개$/,
    replace: (_, count) => `${count}`,
  },
  {
    pattern: /^탭 (\d+)개를 다시 불러왔습니다\.$/,
    replace: (_, count) => `Restored ${count} tabs.`,
  },
  {
    pattern: /^탭 (\d+)개를 자동 정리했습니다$/,
    replace: (_, count) => `Automatically cleaned ${count} tabs`,
  },
  {
    pattern: /^선택한 (\d+)개 정리$/,
    replace: (_, count) => `Clean ${count} selected`,
  },
  {
    pattern: /^안전 정리하기 · 최대 (\d+)개$/,
    replace: (_, count) => `Safe cleanup · up to ${count}`,
  },
  {
    pattern: /^오래 사용하지 않은 탭 (\d+)개를 확인했습니다\.$/,
    replace: (_, count) => `Found ${count} inactive tabs.`,
  },
  {
    pattern: /^휴면 (\d+)개 · 건너뜀 (\d+)개 · 실패 (\d+)개$/,
    replace: (_, success, skipped, failed) =>
      `Slept ${success} · skipped ${skipped} · failed ${failed}`,
  },
  {
    pattern: /^(\d+)개 탭을 휴면 처리했어요$/,
    replace: (_, count) => `Put ${count} tabs to sleep`,
  },
  {
    pattern: /^오래 사용하지 않은 탭 (\d+)개를 안전하게 휴면 처리할 수 있어요\.$/,
    replace: (_, count) => `${count} inactive tabs can be safely put to sleep.`,
  },
  {
    pattern: /^최근 정리 · 탭 (\d+)개 · (.+)$/,
    replace: (_, count, time) => `Recent cleanup · ${count} tabs · ${time}`,
  },
  {
    pattern: /^약 (.+)$/,
    replace: (_, value) => `About ${value}`,
  },
  {
    pattern: /^약 (.+) 확보$/,
    replace: (_, value) => `About ${value} reclaimed`,
  },
  {
    pattern: /^창 (\d+) · (.+) · (.+)$/,
    replace: (_, windowId, site, inactive) =>
      `Window ${windowId} · ${site} · ${inactive}`,
  },
  {
    pattern: /^· (\d+)건$/,
    replace: (_, count) => `· ${count}`,
  },
  {
    pattern: /^(\d+)개 표시$/,
    replace: (_, count) => `${count} shown`,
  },
  {
    pattern: /^(\d+)분$/,
    replace: (_, minutes) => `${minutes} min`,
  },
  {
    pattern: /^(\d+)분 전$/,
    replace: (_, minutes) => `${minutes} min ago`,
  },
  {
    pattern: /^(\d+)시간 전$/,
    replace: (_, hours) => `${hours} hours ago`,
  },
  {
    pattern: /^(\d+)일 전$/,
    replace: (_, days) => `${days} days ago`,
  },
  {
    pattern: /^(\d+)분 전 사용$/,
    replace: (_, minutes) => `Used ${minutes} min ago`,
  },
  {
    pattern: /^(\d+)시간 전 사용$/,
    replace: (_, hours) => `Used ${hours} hours ago`,
  },
  {
    pattern: /^(\d+)일 전 사용$/,
    replace: (_, days) => `Used ${days} days ago`,
  },
  {
    pattern: /^(\d+)분 후$/,
    replace: (_, minutes) => `In ${minutes} min`,
  },
  {
    pattern: /^(\d+)시간 (\d+)분 후$/,
    replace: (_, hours, minutes) => `In ${hours}h ${minutes}m`,
  },
  {
    pattern: /^(.+) 보호 해제$/,
    replace: (_, domain) => `Remove protection for ${domain}`,
  },
  {
    pattern: /^(.+) 탭 열기$/,
    replace: (_, title) => `Open ${title} tab`,
  },
];

export function isEnglishUi(): boolean {
  const language = chrome.i18n.getUILanguage().toLocaleLowerCase();
  return !language.startsWith("ko");
}

export function localizeText(value: string): string {
  if (!isEnglishUi() || value.length === 0) return value;
  const normalized = value.replace(/\s+/g, " ").trim();
  const direct = STATIC_ENGLISH[value] ?? STATIC_ENGLISH[normalized];
  if (direct) return direct;

  for (const replacement of REGEX_ENGLISH) {
    const match = normalized.match(replacement.pattern);
    if (match) return replacement.replace(...match);
  }

  return value;
}

export function translateStaticPage(root: ParentNode = document): void {
  if (!isEnglishUi()) {
    document.documentElement.lang = "ko";
    return;
  }

  document.documentElement.lang = "en";
  if (document.title) document.title = localizeText(document.title);

  const treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = treeWalker.nextNode();
  while (node) {
    const original = node.textContent ?? "";
    const trimmed = original.trim();
    if (trimmed) {
      const localized = localizeText(trimmed);
      if (localized !== trimmed) {
        node.textContent = original.replace(trimmed, localized);
      }
    }
    node = treeWalker.nextNode();
  }

  const elements =
    root instanceof Element
      ? [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))]
      : Array.from(root.querySelectorAll<HTMLElement>("*"));
  for (const element of elements) {
    for (const attribute of ["aria-label", "title", "placeholder"]) {
      const value = element.getAttribute(attribute);
      if (value) element.setAttribute(attribute, localizeText(value));
    }
  }
}

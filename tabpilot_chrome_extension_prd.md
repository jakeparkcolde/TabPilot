# TabPilot 크롬 확장 프로그램 기획서

## 개발 작업을 방해하지 않는 MacBook용 Chrome 탭 메모리 컨트롤러

> 버전: v0.1  
> 목적: Codex 기반 MVP 개발 및 GitHub 공개 준비

---

## 1. 프로젝트 배경

맥북 에어에서 코딩, 문서 작업, 디자인 툴, AI 도구, GitHub, 개발 서버 등을 동시에 사용하면 Chrome 탭이 빠르게 늘어납니다.

문제는 단순히 탭 수가 많아지는 것이 아닙니다.

- 사용하지 않는 탭이 메모리를 계속 차지합니다.
- Chrome이 느려지면 VS Code, Cursor, 터미널, Figma 등 전체 작업 환경도 함께 버벅일 수 있습니다.
- 개발 중인 localhost, GitHub, 문서 작성 화면, 관리자 페이지 등을 잘못 정리하면 작업 흐름이 끊기거나 입력 내용이 사라질 수 있습니다.
- 기존 탭 정리 확장 프로그램은 자동 종료 또는 자동 휴면 중심이라 개발자 작업 환경에 맞춘 안전장치가 부족한 경우가 많습니다.

TabPilot은 단순히 탭을 닫는 확장 프로그램이 아니라, **작업 중인 탭은 보호하면서 오래 방치된 탭만 안전하게 휴면 처리하는 Chrome 작업 환경 관리 도구**입니다.

---

## 2. 제품 목표

### 핵심 목표

1. Chrome이 과도하게 메모리를 사용하는 상황을 줄입니다.
2. 코딩·문서·디자인 작업 중인 중요 탭은 최대한 보호합니다.
3. 사용자가 탭을 직접 찾고 정리하는 시간을 줄입니다.
4. 모든 데이터는 기본적으로 로컬에만 저장합니다.
5. GitHub 오픈소스 프로젝트로 공개 가능한 구조를 만듭니다.

### 한 줄 설명

> 개발 작업은 건드리지 않고, 잊고 있던 탭만 조용히 정리하는 Chrome 메모리 매니저

---

## 3. 타겟 사용자

### 1차 타겟

- MacBook Air 또는 저사양 노트북 사용자
- VS Code, Cursor, Codex, GitHub, ChatGPT, Figma 등을 동시에 사용하는 사람
- 탭을 20개 이상 열어두고 일하는 개발자 및 기획자
- 탭을 닫는 것이 불안한 사용자

### 2차 타겟

- 온라인 셀러
- 마케터
- 디자이너
- 연구·리서치 업무를 많이 하는 사용자
- 여러 프로젝트를 동시에 운영하는 창업자

---

## 4. 시장 및 기존 도구 검토

### Chrome 기본 기능

Chrome은 메모리 절약 모드(Memory Saver)를 통해 비활성 탭을 휴면 상태로 전환하는 기능을 제공합니다. Chrome의 기본 성능 관리 기능은 유용하지만, 개발·문서·업무 탭별 보호 규칙이나 사용 이력 기반의 세밀한 정리 경험은 제한적입니다.

### 유사 확장 프로그램 유형

- **Auto Tab Discard**: Chrome의 탭 휴면 기능을 활용해 비활성 탭을 메모리에서 내리는 방식
- **OneTab**: 탭을 목록으로 묶어 실제 탭 수를 줄이는 방식
- **Tab Wrangler**: 오래 사용하지 않은 탭을 닫고 복구 목록을 제공하는 방식
- **Tab Suspender 계열**: 오래 사용하지 않은 탭을 자동 휴면 처리하는 방식

### 직접 만들 가치가 있는 이유

단순 “탭 자동 정리”는 이미 경쟁이 많습니다. 따라서 TabPilot은 아래처럼 포지셔닝해야 합니다.

> **개발자와 멀티태스킹 사용자를 위한 안전한 탭 메모리 컨트롤러**

핵심은 “정확한 탭별 메모리 측정”이 아니라 다음 신호를 종합해 안전하게 정리하는 것입니다.

- 마지막 사용 시점
- 고정 탭 여부
- 오디오 재생 여부
- 로딩 여부
- 보호 도메인 여부
- 시스템 전체 메모리 여유
- 사용자 지정 예외 규칙

---

## 5. 제품 포지셔닝 및 차별점

### 기존 탭 관리 확장 프로그램

- 단순 시간 기준 자동 휴면
- 단순 탭 닫기
- 탭 목록 저장
- 전체 탭 일괄 정리

### TabPilot의 차별점

- 개발·업무용 탭 보호 프리셋
- 시스템 메모리 부족 시에만 작동하는 저메모리 보호 모드
- 탭을 닫지 않고 Chrome 네이티브 휴면 처리 우선
- 최근 사용 시간, 고정 여부, 오디오 여부, 작업 도메인 여부를 함께 판단
- 사용자에게 “왜 이 탭이 정리 후보인지” 설명
- 모든 데이터 로컬 저장, 외부 서버 및 광고 추적 없음
- GitHub에서 코드와 권한 사용 목적을 투명하게 공개

---

## 6. MVP 기능 범위

### A. 탭 현황 대시보드

확장 프로그램 아이콘을 누르면 아래 정보를 표시합니다.

- 현재 열려 있는 전체 탭 수
- 휴면 상태 탭 수
- 최근 1시간 이상 사용하지 않은 탭 수
- 시스템 전체 메모리 여유 상태
- 현재 정리 추천 탭 수
- `지금 정리하기` 버튼

탭 목록에는 아래 항목을 보여줍니다.

- 사이트 아이콘
- 탭 제목
- 도메인
- 마지막 사용 시점
- 보호 상태
- 휴면 상태
- 정리 후보 사유
- 휴면 처리 버튼
- 항상 보호 버튼

---

### B. 원클릭 안전 정리

사용자가 `지금 정리하기`를 누르면 아래 조건을 만족하는 탭만 휴면 처리합니다.

- 현재 활성 탭이 아님
- 고정 탭이 아님
- 최근 일정 시간 이상 사용하지 않음
- 오디오 재생 중이 아님
- 다운로드 중이 아님
- 이미 휴면 상태가 아님
- 사용자가 보호 목록에 넣지 않은 도메인임
- 개발 및 문서 작업용 보호 도메인이 아님

초기 기본값은 아래와 같이 설정합니다.

- 60분 이상 사용하지 않은 탭만 후보
- 한 번에 최대 5개만 정리
- 자동 정리는 기본 비활성화
- 사용자가 직접 버튼을 눌러 실행하는 방식 우선

---

### C. 개발자 보호 프리셋

아래 도메인은 초기 상태에서 자동 휴면 대상에서 제외합니다.

- `localhost`
- `127.0.0.1`
- `github.com`
- `gitlab.com`
- `docs.google.com`
- `drive.google.com`
- `figma.com`
- `notion.so`
- `canva.com`
- `vercel.com`
- `netlify.app`
- `supabase.com`
- `firebase.google.com`
- `console.aws.amazon.com`
- `dash.cloudflare.com`
- `chatgpt.com`
- `claude.ai`

사용자는 설정 화면에서 보호 도메인을 추가하거나 삭제할 수 있습니다.

---

### D. 저메모리 보호 모드

시스템 메모리 여유가 사용자가 설정한 기준 이하가 되었을 때만 정리 추천을 표시합니다.

예시 설정값:

- 메모리 여유 20% 이하: 정리 추천 표시
- 메모리 여유 15% 이하: 휴면 후보 자동 선택
- 메모리 여유 10% 이하: 사용자 승인 후 긴급 정리 실행

자동 정리는 반드시 사용자가 별도로 활성화한 경우에만 작동합니다.

---

### E. 탭 보호 기능

사용자는 중요 탭을 아래 방식으로 보호할 수 있습니다.

- 이 탭만 보호
- 이 도메인 전체 보호
- 이 탭 그룹 전체 보호
- 오늘 하루 동안 보호
- 항상 보호

보호된 탭은 자동 정리 후보에서 제외합니다.

---

### F. 정리 기록

확장 프로그램은 최근 정리 기록을 로컬에 보관합니다.

기록 항목:

- 정리 시간
- 정리된 탭 제목
- 도메인
- 정리 사유
- 사용자가 직접 정리했는지 여부
- 자동 정리였는지 여부
- 다시 활성화된 시간

초기 MVP에서는 최근 7일 또는 최근 100건만 저장합니다.

---

## 7. 기능 우선순위

### Phase 1: MVP

- 전체 탭 목록 조회
- 마지막 사용 시간 표시
- 탭 휴면 처리
- 보호 도메인 설정
- 원클릭 정리
- 시스템 메모리 여유 표시
- 로컬 정리 기록
- 다크 모드 UI

### Phase 2

- 저메모리 상태 자동 감지
- 자동 정리 규칙
- 탭 그룹 단위 정리
- 단축키
- 도메인별 탭 개수 분석
- 탭 중복 탐지
- 장기 미사용 탭 아카이브

### Phase 3

- 프로젝트별 워크스페이스
- 코딩 모드
- 회의 모드
- 리서치 모드
- 업무 종료 전 탭 아카이브
- 탭 세션 내보내기 및 가져오기
- Chromium 기반 Edge 지원

---

## 8. 사용자 경험 설계

### 팝업 첫 화면

상단 영역:

- `Chrome 탭 42개`
- `휴면 탭 8개`
- `메모리 여유 2.1GB`
- 상태 라벨: 안정 / 주의 / 정리 필요

중앙 영역:

- `정리 추천 탭 6개`
- `예상 영향: 오래 사용하지 않은 탭만 휴면 처리합니다`
- 버튼: `안전 정리하기`

하단 영역:

- 보호된 탭 수
- 최근 정리 기록
- 설정 열기

### 탭별 상태 라벨

- 안전: 일반 탭, 장시간 미사용
- 보호됨: 고정 또는 보호 목록 등록
- 주의: 로그인·문서·관리자 화면 가능성
- 오디오 재생 중
- 현재 작업 중
- 이미 휴면 상태

---

## 9. 기술 설계

### 권장 기술 스택

- Chrome Extension Manifest V3
- TypeScript
- Vanilla HTML / CSS 또는 React 기반 Popup UI
- Chrome Tabs API
- Chrome Alarms API
- Chrome Storage API
- Chrome System Memory API
- GitHub Actions

### 필요한 Chrome 권한

- `tabs`
- `alarms`
- `storage`
- `system.memory`

### 선택 권한

- `notifications`
- `contextMenus`
- `tabGroups`

### 권한 최소화 원칙

- 모든 사이트 접근 권한은 MVP에서 요청하지 않습니다.
- 콘텐츠 스크립트는 MVP에서 사용하지 않습니다.
- 탭 제목, URL, 설정값, 기록은 외부 서버로 전송하지 않습니다.
- 분석 도구, 광고 SDK, 사용자 추적 코드는 넣지 않습니다.

---

## 10. 자동 정리 판단 로직

### 정리 후보 점수 예시

탭별 점수는 아래 기준으로 계산합니다.

- 마지막 사용 시간이 오래될수록 점수 증가
- 다른 창에 오래 방치된 탭이면 점수 증가
- 동일 도메인 탭이 여러 개면 점수 증가
- 이미 휴면 상태면 제외
- 현재 활성 탭이면 제외
- 고정 탭이면 제외
- 오디오 재생 탭이면 제외
- 보호 도메인이면 제외
- 개발·문서·디자인 프리셋 도메인이면 제외
- 로딩 중인 탭이면 제외

### 추천 스코어링 예시

```ts
score =
  inactiveMinutes * 0.5 +
  duplicateDomainCount * 10 +
  backgroundWindowBonus -
  protectedPenalty -
  pinnedPenalty -
  audiblePenalty -
  loadingPenalty;
```

### 정리 실행 방식

1. 후보 탭을 계산합니다.
2. 위험 요소가 있는 탭은 제외합니다.
3. 점수가 높은 탭부터 최대 N개를 선택합니다.
4. Chrome 네이티브 탭 휴면 기능을 호출합니다.
5. 정리 결과를 로컬 기록에 저장합니다.
6. 팝업에서 정리 결과를 보여줍니다.

---

## 11. 중요한 제한사항

### 정확한 탭별 메모리 수치

일반 사용자용 Chrome 확장 프로그램에서는 탭별 정확한 메모리 사용량을 안정적으로 핵심 기능으로 제공하기 어렵습니다.

따라서 MVP에서는 아래를 중심으로 설계합니다.

- 시스템 전체 메모리 여유
- 마지막 탭 사용 시간
- 탭 상태
- 오디오 재생 여부
- 고정 여부
- 휴면 여부
- 사용자 보호 규칙

### 데이터 손실 방지

탭 휴면 처리는 탭을 다시 활성화할 때 페이지를 새로 불러올 수 있습니다.

따라서 아래 원칙을 지킵니다.

- 자동 정리는 기본 비활성화
- 개발·문서·업무 도메인은 기본 보호
- 처음에는 사용자 승인형 정리만 제공
- 위험할 수 있는 도메인은 항상 보호 목록에 추가 가능
- 정리 후보 사유를 사용자에게 명확히 표시

---

## 12. GitHub 공개 구조

```text
tabpilot/
├── src/
│   ├── background/
│   │   ├── service-worker.ts
│   │   ├── cleanup-engine.ts
│   │   ├── tab-policy.ts
│   │   └── memory-monitor.ts
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.ts
│   │   └── popup.css
│   ├── options/
│   │   ├── options.html
│   │   ├── options.ts
│   │   └── options.css
│   ├── lib/
│   │   ├── storage.ts
│   │   ├── types.ts
│   │   ├── domain-rules.ts
│   │   └── constants.ts
│   └── assets/
├── tests/
├── public/
├── manifest.json
├── README.md
├── CONTRIBUTING.md
├── SECURITY.md
├── CODE_OF_CONDUCT.md
├── PRIVACY.md
├── LICENSE
└── package.json
```

---

## 13. GitHub README 핵심 구성

- 프로젝트 소개
- 문제 정의
- 주요 기능
- 스크린샷 또는 GIF
- 권한 설명
- 개인정보 처리 원칙
- 로컬 개발 방법
- Chrome에 직접 설치하는 방법
- 테스트 방법
- 로드맵
- 기여 방법
- 보안 이슈 제보 방법
- 라이선스

### 추천 라이선스

**MIT License**

이유:

- 개인·상업적 사용이 쉽습니다.
- 외부 기여자를 받기 좋습니다.
- GitHub 공개 프로젝트에 적합합니다.

---

## 14. 성공 지표

### MVP 검증 지표

- 설치 후 첫 정리 실행률
- 주간 활성 사용자 수
- 사용자당 평균 휴면 처리 탭 수
- 보호 도메인 등록률
- 자동 정리 활성화율
- 휴면 처리 후 재활성화 비율
- GitHub Star 수
- GitHub Issue 및 Pull Request 수

### 제품 품질 지표

- 자동 정리 실패율
- 잘못 휴면 처리된 탭 신고 건수
- 확장 프로그램 자체 메모리 사용량
- 팝업 로딩 속도
- Chrome Web Store 리뷰 평점

---

## 15. Codex 시작 프롬프트

```text
Create a production-ready Chrome Extension named TabPilot.

Goal:
Build a privacy-first Chrome tab memory controller for developers and MacBook users. It should safely identify inactive tabs and use Chrome native tab discarding to free memory without closing tabs.

Technical requirements:
- Manifest V3
- TypeScript
- No backend
- No analytics
- No remote code
- Store all settings and history locally using chrome.storage.local
- Use chrome.tabs, chrome.alarms, chrome.storage, and chrome.system.memory APIs
- Use a service worker for background logic
- Use a lightweight popup UI and a separate options page
- Do not require all_urls or host permissions
- Do not inject content scripts in the MVP

MVP features:
1. Show total open tabs, discarded tabs, system free memory, and cleanup candidate count.
2. Show a list of tabs with title, domain, last accessed time, protected status, discarded status, and cleanup reason.
3. Add a “Clean safely” button that discards only eligible inactive tabs.
4. Never discard active, pinned, audible, loading, already discarded, or protected tabs.
5. Include default protected domains:
   localhost, 127.0.0.1, github.com, gitlab.com, docs.google.com, drive.google.com,
   figma.com, notion.so, canva.com, vercel.com, netlify.app, supabase.com,
   firebase.google.com, console.aws.amazon.com, dash.cloudflare.com,
   chatgpt.com, claude.ai.
6. Add options for inactivity threshold, max tabs per cleanup, auto cleanup toggle,
   low memory threshold, and domain allowlist.
7. Auto cleanup must be disabled by default.
8. Use chrome.alarms for periodic checks.
9. Keep a local cleanup history of the latest 100 actions.
10. Build a clean dark-mode-first UI.

Architecture:
- src/background/service-worker.ts
- src/background/cleanup-engine.ts
- src/background/memory-monitor.ts
- src/background/tab-policy.ts
- src/popup/
- src/options/
- src/lib/storage.ts
- src/lib/types.ts
- tests/

Quality requirements:
- Strong TypeScript types
- Unit tests for cleanup eligibility and scoring logic
- ESLint and formatting setup
- GitHub Actions workflow for lint, test, and build
- README, CONTRIBUTING, SECURITY, PRIVACY, and MIT LICENSE
- Explain every requested Chrome permission in README
- Include a clear privacy policy stating that tab metadata never leaves the user’s device

Important:
Do not claim exact per-tab memory usage.
Use system free memory and tab activity signals instead.
Show users why a tab is eligible for cleanup.
```

---

## 16. 참고 링크

- Chrome 메모리 절약 기능: https://support.google.com/chrome/answer/12929150
- Chrome Tabs API: https://developer.chrome.com/docs/extensions/reference/api/tabs
- Chrome Processes API: https://developer.chrome.com/docs/extensions/reference/api/processes
- Chrome Extension Manifest V3: https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3
- Chrome Web Store 프로그램 정책: https://developer.chrome.com/docs/webstore/program-policies

---

## 17. 최종 제안

TabPilot은 “메모리 많이 먹는 탭을 정확히 측정하는 확장 프로그램”보다 아래와 같이 정의하는 편이 현실적이고 경쟁력이 있습니다.

> **코딩·문서 작업 탭은 보호하고, 잊힌 탭만 안전하게 휴면 처리하는 개발자용 Chrome 메모리 컨트롤러**

초기 MVP는 사용자 승인형 `안전 정리`를 중심으로 만들고, 실제 사용 데이터를 본 뒤 저메모리 자동 정리와 프로젝트별 워크스페이스 기능을 확장하는 방식이 좋습니다.

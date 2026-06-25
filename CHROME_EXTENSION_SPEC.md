# TabPilot Chrome Extension MVP 구현 스펙

> 문서 상태: Draft v0.1  
> 대상 범위: Chrome 확장 프로그램 Phase 0–1  
> 대상 브라우저: Google Chrome 121 이상  
> 후속 제품: TabPilot for Mac 컴패니언 앱

---

## 1. 목적

TabPilot MVP는 사용자가 현재 작업 중인 탭을 보호하면서, 오래 사용하지 않은 Chrome 탭을 확인하고 수동으로 휴면 처리하는 확장 프로그램이다.

첫 버전의 핵심 성공 조건은 메모리 절감량을 정확히 측정하는 것이 아니라 다음 경험을 안정적으로 제공하는 것이다.

> 어떤 탭이 왜 정리 대상인지 보여주고, 위험한 탭을 제외한 뒤 사용자의 명시적 실행으로만 휴면 처리한다.

---

## 2. MVP 범위

### 포함

- 현재 Chrome 프로필의 일반 창 탭 조회
- 전체 탭, 휴면 탭, 정리 후보 탭 수 표시
- 시스템 전체 메모리 용량과 사용 가능 용량 표시
- 정리 후보 목록과 후보 사유 표시
- 비활성 시간 기준 설정
- 실행당 최대 정리 탭 수 설정
- 기본 보호 도메인 제공
- 사용자 보호 도메인 추가 및 삭제
- 현재 브라우저 세션 동안 개별 탭 보호
- 수동 `안전 정리하기`
- 개별 후보 탭 수동 휴면 처리
- 최근 100건 정리 기록
- 다크 모드 우선 UI

### 제외

- 자동 정리
- 메모리 임계값 기반 자동 동작
- 다운로드 중인 탭 감지
- 탭 그룹 단위 보호
- 중복 탭 자동 판단
- 탭 세션 아카이브
- 클라우드 동기화 및 사용자 계정
- 분석 도구 및 외부 서버
- 탭별 정확한 메모리 사용량
- 시크릿 창 탭 처리
- macOS 앱 및 Native Messaging 연동

---

## 3. 기술 스택

- Chrome Extension Manifest V3
- TypeScript
- Vite
- Vanilla HTML/CSS
- Vitest
- ESLint
- Prettier
- GitHub Actions

React는 MVP에서 사용하지 않는다. 팝업과 설정 화면의 상태 및 상호작용이 제한적이므로 번들 크기와 구조 복잡도를 줄이는 편이 적합하다.

### 브라우저 요구사항

```json
{
  "manifest_version": 3,
  "minimum_chrome_version": "121"
}
```

Chrome 121 이상을 요구하는 이유는 `chrome.tabs.Tab.lastAccessed`를 정리 판단의 핵심 신호로 사용하기 때문이다.

---

## 4. 권한

### 필수 권한

| 권한            | 목적                                                      |
| --------------- | --------------------------------------------------------- |
| `tabs`          | 탭 제목, URL, 상태, 마지막 접근 시각 조회 및 탭 휴면 처리 |
| `storage`       | 설정, 보호 도메인, 정리 기록 저장                         |
| `system.memory` | 시스템 전체 메모리 참고 정보 표시                         |

### MVP에서 요청하지 않는 권한

- `alarms`
- `downloads`
- `notifications`
- `contextMenus`
- `tabGroups`
- `nativeMessaging`
- 호스트 권한

자동 작업이 없으므로 MVP에서는 `alarms` 권한이 필요하지 않다. 콘텐츠 스크립트와 모든 사이트 접근 권한도 사용하지 않는다.

### 시크릿 모드

manifest에 `"incognito": "not_allowed"`를 지정한다. 시크릿 탭의 메타데이터를 처리하거나 기록하지 않는다.

---

## 5. 권장 프로젝트 구조

```text
tabpilot/
├── public/
│   ├── icons/
│   └── manifest.json
├── src/
│   ├── background/
│   │   ├── service-worker.ts
│   │   ├── cleanup-engine.ts
│   │   └── tab-policy.ts
│   ├── popup/
│   │   ├── index.html
│   │   ├── popup.ts
│   │   └── popup.css
│   ├── options/
│   │   ├── index.html
│   │   ├── options.ts
│   │   └── options.css
│   └── lib/
│       ├── constants.ts
│       ├── domain.ts
│       ├── messages.ts
│       ├── storage.ts
│       └── types.ts
├── tests/
│   ├── domain.test.ts
│   ├── storage.test.ts
│   └── tab-policy.test.ts
├── .github/workflows/ci.yml
├── README.md
├── PRIVACY.md
├── SECURITY.md
├── LICENSE
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 6. 데이터 모델

모든 영구 데이터는 `chrome.storage.local`에 저장한다.

### 설정

```ts
interface Settings {
  schemaVersion: 1;
  inactivityThresholdMinutes: number;
  maxTabsPerCleanup: number;
  protectedDomains: string[];
}
```

기본값:

```ts
const DEFAULT_SETTINGS: Settings = {
  schemaVersion: 1,
  inactivityThresholdMinutes: 60,
  maxTabsPerCleanup: 5,
  protectedDomains: [
    "localhost",
    "127.0.0.1",
    "docs.google.com",
    "figma.com",
    "notion.so",
  ],
};
```

기본 보호 목록은 과도한 제외를 피하기 위해 PRD의 전체 프리셋보다 축소한다. GitHub, ChatGPT 등 읽기 위주 탭은 사용자가 직접 보호할 수 있다.

### 세션 탭 보호

```ts
interface SessionProtection {
  protectedTabIds: number[];
}
```

`chrome.storage.session`에 저장한다. 브라우저가 종료되면 제거되며 URL 이동 여부와 관계없이 같은 탭 ID가 유지되는 동안 보호한다.

### 정리 기록

```ts
type CleanupTrigger = "bulk-manual" | "single-manual";

interface CleanupHistoryEntry {
  id: string;
  tabId: number;
  title: string;
  domain: string | null;
  urlKind: UrlKind;
  discardedAt: number;
  inactiveMinutes: number | null;
  reasonCodes: CleanupReasonCode[];
  trigger: CleanupTrigger;
  result: "success" | "failed";
  errorCode?: CleanupErrorCode;
  reactivatedAt?: number;
}
```

기록은 최신순으로 최대 100건만 유지한다. 탭 제목은 기록 시점 값을 저장하며 외부로 전송하지 않는다.

### 메모리 상태

```ts
interface MemorySnapshot {
  capacityBytes: number;
  availableCapacityBytes: number;
  availableRatio: number;
  measuredAt: number;
}
```

메모리 값은 팝업을 열 때 조회하며 영구 저장하지 않는다. macOS의 메모리 압박 또는 실제 앱별 메모리 사용량이라고 표현하지 않는다.

---

## 7. URL 및 도메인 규칙

```ts
type UrlKind =
  | "web"
  | "localhost"
  | "chrome-internal"
  | "extension"
  | "file"
  | "invalid";
```

### 정리 가능한 URL

- `http:`
- `https:`

`localhost`와 `127.0.0.1`도 기술적으로는 웹 URL이지만 기본 보호 대상으로 분류한다.

### 항상 제외할 URL

- `chrome://`
- `chrome-extension://`
- `devtools://`
- `view-source:`
- `file://`
- 파싱할 수 없는 URL

### 보호 도메인 매칭

보호 값 `example.com`은 다음을 모두 보호한다.

- `example.com`
- `www.example.com`
- `docs.example.com`

다음은 보호하지 않는다.

- `notexample.com`
- `example.com.evil.test`

판정식:

```ts
hostname === protectedDomain || hostname.endsWith(`.${protectedDomain}`);
```

입력값은 저장 전에 다음과 같이 정규화한다.

- 소문자 변환
- 앞뒤 공백 제거
- URL 입력 시 hostname만 추출
- 마지막 점 제거
- 중복 제거
- 와일드카드와 경로 거부

---

## 8. 탭 판정 모델

보호 조건은 점수 감점이 아니라 절대 제외 조건으로 처리한다.

```ts
interface TabEvaluation {
  tabId: number;
  eligible: boolean;
  inactiveMinutes: number | null;
  exclusionCodes: ExclusionCode[];
  reasonCodes: CleanupReasonCode[];
  score: number;
}
```

### 제외 코드

```ts
type ExclusionCode =
  | "missing-tab-id"
  | "unsupported-url"
  | "active"
  | "pinned"
  | "audible"
  | "loading"
  | "discarded"
  | "session-protected"
  | "domain-protected"
  | "missing-last-accessed"
  | "below-inactivity-threshold";
```

### 후보 사유 코드

```ts
type CleanupReasonCode =
  | "inactive-over-threshold"
  | "inactive-over-6-hours"
  | "inactive-over-24-hours"
  | "background-window";
```

### 판정 순서

1. 탭 ID와 URL 유효성 확인
2. 지원하지 않는 URL 제외
3. 활성, 고정, 오디오, 로딩, 기존 휴면 상태 제외
4. 세션 탭 보호 확인
5. 보호 도메인 확인
6. `lastAccessed` 존재 여부 확인
7. 비활성 기준 시간 확인
8. 후보 사유와 정렬 점수 계산

### 점수

점수는 후보 간 정렬에만 사용한다.

```ts
const cappedInactiveMinutes = Math.min(inactiveMinutes, 7 * 24 * 60);

score = cappedInactiveMinutes + (isInBackgroundWindow ? 30 : 0);
```

동점일 경우 다음 순서로 정렬한다.

1. `lastAccessed`가 오래된 탭
2. 창 ID
3. 탭 index

동일 도메인 탭 수는 MVP 점수에 사용하지 않는다.

---

## 9. 정리 실행

### 일괄 정리

1. 모든 일반 창의 탭을 조회한다.
2. 각 탭을 판정한다.
3. 후보를 점수순으로 정렬한다.
4. 설정의 `maxTabsPerCleanup`만큼 선택한다.
5. 각 탭을 휴면 처리하기 직전에 최신 상태를 다시 조회한다.
6. 최신 상태로 정책을 다시 평가한다.
7. 여전히 후보인 경우 `chrome.tabs.discard(tabId)`를 호출한다.
8. 탭별 성공 또는 실패 기록을 저장한다.
9. 전체 결과를 팝업에 반환한다.

탭 하나의 실패가 나머지 탭 처리를 중단시키지 않는다.

### 개별 정리

개별 버튼을 눌러도 안전 조건을 우회하지 않는다. 실행 직전에 같은 정책으로 다시 검사하고 조건을 만족하지 않으면 휴면 처리하지 않는다.

### 오류 코드

```ts
type CleanupErrorCode =
  | "tab-not-found"
  | "no-longer-eligible"
  | "discard-rejected"
  | "unknown";
```

### 정리 결과

```ts
interface CleanupResult {
  requestedCount: number;
  successCount: number;
  skippedCount: number;
  failedCount: number;
  items: CleanupResultItem[];
}
```

결과 화면은 성공, 상태 변경으로 건너뜀, API 실패를 구분해 표시한다.

---

## 10. 휴면 해제 추적

TabPilot이 성공적으로 휴면 처리한 탭 ID를 세션 인덱스에 기록한다.

`chrome.tabs.onUpdated`에서 다음 조건을 감지하면 해당 정리 기록의 `reactivatedAt`을 갱신한다.

- TabPilot 정리 기록에 존재하는 탭
- 이전 상태가 `discarded === true`
- 현재 상태가 `discarded === false`

Chrome 자체가 휴면 처리한 탭은 TabPilot 정리 기록에 추가하지 않는다.

---

## 11. 메시지 계약

팝업과 설정 화면은 서비스 워커에 메시지를 보내고 서비스 워커가 Chrome API 및 저장소 접근을 담당한다.

```ts
type RequestMessage =
  | { type: "GET_DASHBOARD" }
  | { type: "RUN_SAFE_CLEANUP" }
  | { type: "DISCARD_ONE"; tabId: number }
  | { type: "PROTECT_TAB"; tabId: number }
  | { type: "UNPROTECT_TAB"; tabId: number }
  | { type: "GET_SETTINGS" }
  | { type: "UPDATE_SETTINGS"; patch: SettingsPatch }
  | { type: "GET_HISTORY" }
  | { type: "CLEAR_HISTORY" };
```

모든 응답은 공통 envelope를 사용한다.

```ts
type Response<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };
```

향후 Native Messaging이 추가되더라도 내부 정리 엔진을 직접 호출하지 않고 동일한 애플리케이션 서비스 계층을 사용한다.

---

## 12. 화면 스펙

### 팝업

권장 크기:

- 너비: 380px
- 최대 높이: 600px

구성:

1. 헤더
   - 제품명
   - 설정 버튼
2. 상태 요약
   - 전체 탭
   - 휴면 탭
   - 정리 후보
   - 사용 가능 메모리
3. 주요 액션
   - `안전 정리하기`
   - 실행 대상 수 표시
4. 후보 목록
   - favicon
   - 제목
   - 도메인
   - 마지막 사용 시각
   - 후보 사유
   - 개별 휴면 버튼
   - 세션 보호 버튼
5. 최근 결과
   - 성공, 건너뜀, 실패 수

후보가 없으면 제외 이유 요약과 설정 이동 버튼을 표시한다.

### 설정 화면

- 비활성 기준: 15분–7일
- 실행당 최대 탭 수: 1–20
- 보호 도메인 목록
- 기본값 복원
- 정리 기록 확인 및 삭제
- 권한 및 개인정보 설명

### 사용자 문구 원칙

- `메모리 확보 예상치`를 표시하지 않는다.
- `메모리 압박` 대신 `사용 가능 시스템 메모리`라고 표시한다.
- `탭 종료` 대신 `탭 휴면`을 사용한다.
- 휴면 탭이 다시 열릴 때 페이지가 새로 로드될 수 있음을 설명한다.

---

## 13. 상태 및 예외 처리

### 팝업 상태

```ts
type ViewState = "loading" | "ready" | "cleaning" | "empty" | "error";
```

`cleaning` 상태에서는 중복 실행을 막는다.

### Chrome API 실패

- 전체 대시보드 조회 실패: 재시도 버튼 표시
- 메모리 조회만 실패: 탭 기능은 유지하고 메모리 항목만 `확인 불가` 표시
- favicon 로드 실패: 기본 아이콘 표시
- 개별 탭이 사라짐: `tab-not-found`로 건너뜀
- 저장소 데이터 손상: 유효한 필드만 복구하고 나머지는 기본값 적용

---

## 14. 보안 및 개인정보

- 탭 제목과 URL은 외부로 전송하지 않는다.
- 원격 코드와 CDN 리소스를 사용하지 않는다.
- 콘텐츠 스크립트를 사용하지 않는다.
- 호스트 권한을 요청하지 않는다.
- `innerHTML`로 탭 제목이나 URL을 삽입하지 않는다.
- 메시지 payload를 런타임에서 검증한다.
- 저장된 설정과 기록에 스키마 버전을 둔다.
- 진단 로그에 전체 URL의 query와 fragment를 기록하지 않는다.

정리 기록에는 전체 URL 대신 제목과 정규화된 도메인만 저장한다.

---

## 15. 테스트 계획

### 단위 테스트

- 활성 탭 제외
- 고정 탭 제외
- 오디오 탭 제외
- 로딩 탭 제외
- 기존 휴면 탭 제외
- 세션 보호 탭 제외
- 보호 도메인과 서브도메인 제외
- 유사하지만 다른 도메인 허용
- 비활성 기준 경계값
- `lastAccessed` 누락 처리
- 특수 URL 제외
- 점수 및 동점 정렬
- 보호 도메인 정규화
- 기록 100건 제한
- 손상된 설정 복구

### 통합 테스트

Chrome API를 mock 처리하여 다음 흐름을 검증한다.

- 대시보드 조회
- 일괄 정리 성공
- 일부 탭 실패
- 실행 직전 탭 상태 변경
- 개별 정리
- 탭 보호 및 해제
- 휴면 해제 시 기록 갱신

### 수동 검증

- 여러 Chrome 창
- 20개, 50개, 100개 탭
- 오디오 재생 중인 탭
- 고정 탭
- 로딩 중 탭
- localhost
- Chrome 내부 페이지
- 탭이 실행 도중 닫히는 상황
- Chrome 재시작 후 영구 설정 유지
- 브라우저 종료 후 세션 탭 보호 초기화

---

## 16. 성능 기준

- 탭 100개 기준 팝업 초기 데이터 표시: 500ms 이내 목표
- 정책 판정: 탭 100개 기준 50ms 이내 목표
- 팝업 번들 gzip 크기: 150KB 이하 목표
- 서비스 워커에 지속 타이머를 두지 않음
- popup이 닫힌 뒤 불필요한 상태를 메모리에 유지하지 않음

성능 수치는 개발 환경과 실제 Chrome에서 각각 측정하며 절대 보장 문구로 사용하지 않는다.

---

## 17. 접근성 기준

- 모든 버튼에 텍스트 또는 `aria-label` 제공
- 키보드만으로 전체 기능 사용 가능
- 포커스 표시 제거 금지
- 색상 외에 아이콘과 문구로 상태 구분
- 본문 텍스트 명도 대비 WCAG AA 목표
- `prefers-reduced-motion` 지원

---

## 18. MVP 수용 기준

다음 조건을 모두 충족하면 Chrome 확장 프로그램 MVP가 완료된 것으로 본다.

1. Chrome 121 이상에서 unpacked extension으로 설치된다.
2. 전체 탭, 휴면 탭, 후보 탭 수가 실제 상태와 일치한다.
3. 활성, 고정, 오디오, 로딩, 보호, 기존 휴면 탭이 정리되지 않는다.
4. 정리 직전에 상태가 바뀐 탭이 안전하게 건너뛰어진다.
5. 사용자가 지정한 최대 개수보다 많은 탭을 한 번에 정리하지 않는다.
6. 개별 탭 실패가 전체 실행을 중단하지 않는다.
7. 보호 도메인과 설정이 Chrome 재시작 후 유지된다.
8. 개별 탭 보호는 브라우저 세션 종료 후 초기화된다.
9. 정리 기록이 최대 100건으로 유지된다.
10. 탭 메타데이터가 네트워크로 전송되지 않는다.
11. lint, test, build가 CI에서 통과한다.
12. README와 개인정보 처리방침에 모든 권한의 목적이 설명된다.

---

## 19. 구현 순서

1. 프로젝트 및 Manifest V3 빌드 구성
2. 타입, 기본 설정, 저장소 계층
3. URL 정규화와 도메인 규칙
4. 탭 판정 순수 함수와 단위 테스트
5. 정리 엔진과 부분 실패 처리
6. 서비스 워커 메시지 API
7. 팝업 대시보드
8. 설정 화면
9. 정리 기록과 휴면 해제 추적
10. 접근성, 오류 처리, 성능 점검
11. 문서와 GitHub Actions
12. 실제 Chrome 수동 검증

---

## 20. 후속 macOS 연동을 위한 경계

Chrome MVP에서는 macOS 관련 코드를 넣지 않는다. 대신 다음 경계를 유지한다.

- 탭 판정 로직은 UI 및 Chrome 메시지 처리와 분리한다.
- 정리 실행은 `CleanupService` 인터페이스 뒤에 둔다.
- 메시지 payload는 버전 확장이 가능한 객체 형태로 정의한다.
- 시스템 메모리는 별도 provider를 통해 조회한다.
- Native Messaging 추가 시에도 기존 팝업과 동일한 정리 정책을 사용한다.

macOS 앱은 향후 정리 요청을 보낼 수 있지만, 보호 조건 판정과 최종 `tabs.discard()` 결정은 항상 Chrome 확장 프로그램이 수행한다.

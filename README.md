# saju-engine · Oh My Saju

한국 사주의 연주·월주·일주·시주를 **재현 가능하고 감사 가능한 JSON**으로 계산하는
TypeScript 패키지입니다. 모든 출생 시각은 명시한 IANA 시간대로 먼저 하나의 UTC 순간에
고정하고, 연·월은 천문 절입 순간, 일·시는 선택한 민간시 또는 지방 진태양시 규칙으로
계산합니다.

**오 마이 사주(Oh My Saju)**는 이 계산 코어에 판본화된 Tradition Pack, 근거형
Reading/Application runtime, Agent Skill workflow를 조립해 Codex, Claude Code, 그리고
Agent Skills 호환 호스트에 설치하는 배포판입니다. 각 계층의 소유권은 다음과 같습니다.

```text
saju-engine: 결정론적 원국·달력·구조·timing 사실
  → Tradition Packs: 출전·규칙·표·helper·provenance
    → plugin runtime: Pack 평가·비교·reading 검증·application CLI
      → Agent Skill: 입력 인터뷰와 prepare→draft→validate workflow
        → Codex / Claude Code / 다른 host adapter
```

`saju-engine`은 운세를 과학적으로 예측한다고 주장하지 않으며 학파 해석을 내장하지
않습니다. 계산 가능한 역법·간지 사실만 코어가 소유하고, 학파에 따라 달라지는 전통
분류는 플러그인의 버전형 Tradition Pack이 담당합니다. 호스트 모델은 한 Pack의
finding을 인용해 실제 해석문을 작성하되 계산 사실·학파 규칙·모델 추론을 서로 다른
층으로 유지합니다.
격국·왕쇠·조후는 서로 다른 정의를 유지하며 투표·평균·승자 선택으로 합치지 않습니다.
출전과 완전한 규칙표가 없는 현대 억부 점수식은 내장하지 않습니다. 질문이 진학·직업·
성격·궁합·대운·사건 같은 주제를 포함한다는 이유로 해설 요청을 차단하지 않습니다.

## 핵심 특성

- `calculateSaju()` 하나를 권장 진입점으로 사용하는 순수 계산 API
- 생시 미상·오전/오후·근사·범위를 위한 `calculateSajuPossibilities()` 후보 API
- `moment-timezone@0.6.3`의 full IANA tzdb `2026c`를 고정하여 호스트 OS/`TZ`와 무관
- DST/표준시 전환의 존재하지 않는 시각(gap)과 중복 시각(fold)을 기본적으로 거부
- 같은 IANA 릴리스의 TZif `isdst`와 분리한 DST 보정량을 감사 메타데이터로 제공
- `astronomy-engine@2.1.19`의 겉보기 지심 태양 황경으로 24절기 순간 계산
- 입춘과 12절 경계를 `-1ms / 경계 / +1ms`까지 포함 규칙으로 판정
- 한국 음력과 윤달을 명시적인 입력 타입으로 구분
- 한국 음력 월의 평달·윤달 일수와 양력 시작·종료일을 조회하는 `getLunarMonthInfo()`
- 민간시와 지방 진태양시, 세 가지 자시 일경계 정책 지원
- 십신·공망·지장간·오행 분포·천간합·지지 합·충·형·파·해·삼합의 구조적 사실 제공
- 정확한 입춘→입춘 사주년과 12절월, 개수 선택·십신이 포함된 근사 대운의
  `saju-engine/timing` API
- 원국과 같은 시간·자시·진태양시 convention을 상속해 현지 정오의 연·월·일주,
  십신, 원국 네 기둥과의 합·충·형·파·해를 반환하는 `calculateSajuDailyTransit()`
- ESM/CommonJS 및 `calendar`/`advanced`/`timing` 계산 서브패스 제공
- 계산 보고서와 Tradition Pack finding을 섞지 않는 plugin runtime
- 명시적 관법표의 12운성, 자평·적천수·궁통보감 Pack, 출전형 역마 원시 관측의 독립
  실행과 의미 좌표 기반 미해결 비교
- 준비 결과를 그대로 보존해 출력하는 결정론적 Compact·Markdown renderer
- 원출생정보를 별도 narrator task에 보내지 않는 provider-neutral reading 계약
- `prepare-reading → host draft → validate-reading` 방식의 application seam
- Node.js 18만으로 독립 실행되는 Oh My Saju Agent Skill과 Codex·Claude adapter
- 결과, 규칙, 엔진 버전·소스 커밋·패키지 무결성, 데이터 계보, 실제 경계 순간을
  한 JSON에 기록

## Oh My Saju 플러그인

저장소의 [`plugins/oh-my-saju`](./plugins/oh-my-saju)는 plugin cache 안에서도
독립 실행되는 배포 artifact입니다. Agent Plugins 1.0 root manifest와 Codex·Claude
adapter가 같은 `skills/oh-my-saju`를 가리킵니다. 계산에는 네트워크나 별도 npm 설치가
필요하지 않습니다.

Codex App/CLI:

```bash
codex plugin marketplace add JaeSang1998/baby-saju
codex plugin add oh-my-saju@oh-my-saju-marketplace --json
```

Claude Code:

```bash
claude plugin marketplace add JaeSang1998/baby-saju
claude plugin install oh-my-saju@oh-my-saju-marketplace
```

clone한 저장소에서 검증하거나 개발할 때는 Claude에서 다음처럼 직접 로드할 수도
있습니다.

```bash
claude --plugin-dir ./plugins/oh-my-saju
```

일반 Agent Skills host는
[`plugins/oh-my-saju/skills/oh-my-saju`](./plugins/oh-my-saju/skills/oh-my-saju)를
하나의 표준 skill directory로 설치하면 됩니다. 정확한 이식성 범위와 host별 차이는
[호환성 조사](./docs/research/agent-plugin-compatibility.md), 공개 생태계 비교는
[패턴 조사](./docs/research/ecosystem-patterns.md), 설계 결정은
[ADR 0006](./docs/adr/0006-core-pack-skill-boundaries.md)에 기록했습니다.

## 라이브러리 설치

현재 저장소에서 개발할 때:

```bash
pnpm install
pnpm check
```

패키지를 레지스트리에 게시한 뒤 소비할 때:

```bash
pnpm add saju-engine
```

Node.js 18 이상을 지원합니다.

## 빠른 시작

```ts
import { calculateSaju } from 'saju-engine';

const report = calculateSaju({
  birth: {
    date: {
      calendar: 'gregorian',
      year: 1992,
      month: 10,
      day: 24,
    },
    time: {
      hour: 5,
      minute: 30,
    },
    timeZone: 'Asia/Seoul',
  },
});

console.log({
  year: report.pillars.year.korean, // 임신
  month: report.pillars.month.korean, // 경술
  day: report.pillars.day.korean, // 계유
  hour: report.pillars.hour.korean, // 을묘
});

JSON.stringify(report); // 항상 직렬화 가능
```

보고서에는 다음이 함께 들어 있습니다.

- 입력 달력과 정규화된 양력·한국 음력 날짜
- UTC 순간, 적용된 IANA 총 offset·축약명·DST 상태·보정량
- 네 기둥의 60갑자·천간·지지·한글·한자·오행·음양
- 일간 기준 십신, 공망, 구조 분석
- 실제 입춘·월 시작 절·다음 절의 UTC 순간
- 자시·진태양시 규칙과 사용한 엔진/데이터 버전
- 절입 오차 범위에 너무 가까운 경우의 경고와 근거가 구분된 양쪽 원국

## 생시를 모르거나 대략만 아는 경우

임의로 정오를 넣지 않습니다. 정확한 시각은 기존 `calculateSaju()`로 계산하고,
불확실한 시각은 `calculateSajuPossibilities()`에 실제로 아는 범위를 전달합니다.

```ts
import { calculateSajuPossibilities } from 'saju-engine';

const unknown = calculateSajuPossibilities({
  birth: {
    date: { calendar: 'gregorian', year: 1992, month: 10, day: 24 },
    time: { kind: 'unknown', reason: 'asked-unknown' },
    timeZone: 'Asia/Seoul',
  },
});

unknown.hourPillar; // 'omitted'
unknown.policyResults[0]?.stablePillars;
// 일반적인 날에는 연주·월주·일주가 공통이고 hour는 null

const morning = calculateSajuPossibilities({
  birth: {
    date: { calendar: 'gregorian', year: 1992, month: 10, day: 24 },
    time: { kind: 'day-period', period: 'am' },
    timeZone: 'Asia/Seoul',
    timeEvidence: {
      source: 'family-memory',
      originalText: '오전에 태어남',
    },
  },
});

morning.policyResults[0]?.candidates;
// 가능한 시주와 각 시주가 성립하는 현지/UTC 반열린 구간
```

23시 전후라면 세 자시 정책을 한 번에 비교할 수 있습니다.

```ts
const aroundZi = calculateSajuPossibilities({
  birth: {
    date: { calendar: 'gregorian', year: 2024, month: 3, day: 10 },
    time: {
      kind: 'approximate',
      time: { hour: 23, minute: 0 },
      toleranceMinutes: 15,
    },
    timeZone: 'Asia/Seoul',
  },
  rules: { ziHourPolicies: 'all' },
});

aroundZi.policyResults.map(({ ziHourPolicy, candidates, boundaries }) => ({
  ziHourPolicy,
  candidates,
  boundaries,
}));
```

지원하는 시간 지식은 다음과 같습니다.

| `birth.time.kind` | 의미                                    | 정규화 구간                     |
| ----------------- | --------------------------------------- | ------------------------------- |
| `unknown`         | 날짜만 알고 생시는 모름                 | 해당 날짜 `[00:00, 다음 00:00)` |
| `day-period`      | 오전 또는 오후만 앎                     | 오전/오후 12시간                |
| `approximate`     | 중심 시각과 `toleranceMinutes`를 앎     | 중심 기준 대칭 반열린 구간      |
| `range`           | 시작 포함·끝 제외 범위를 직접 알고 있음 | 입력한 `[start, end)`           |

모든 범위는 `[start,end)`입니다. 근사 범위가 입력 날짜를 벗어나면 날짜까지 불확실한지
확인하도록 기본적으로 거부하며, 확인한 경우에만 `dateRollover: 'allow'`를 지정합니다.
자정을 넘는 직접 범위는 `crossesMidnight: true`로 명시합니다.

결과의 `stablePillars`는 모든 후보에서 같은 기둥만 남기고 나머지는 `null`로 표시합니다.
`candidates`는 60갑자 index로 중복 제거되며 `windows`에 현지 시각, 실제 UTC 범위,
offset과 fold 해소값을 함께 기록합니다. 각 window의 `basis`는 계산 결과이면
`computed`, 천문 소스 오차 때문에 보존한 대안이면
`solar-term-source-uncertainty`입니다. `boundaries`는 절입·일경계·시진·시간대 전환 중
후보를 가른 원인을 기록합니다. 절입 추정 순간의 근거 변경은
`computed-basis-transition`, 오차 구간 시작·끝은 `source-uncertainty-transition`으로
구분합니다.

역사적 gap은 다음 시각으로 보정하지 않고 `unresolvableWindows`로 반환합니다. 최상위
`candidates`는 여러 자시 정책에서 같은 원국을 한 번으로 합치고 `ziHourPolicies`,
`occurrences`, `supportDurationMilliseconds`를 제공합니다. 여러 정책에 겹치는 실제
UTC 구간은 한 번만 세며, 이 시간 길이는 확률이 아닙니다.

역사 기록에 당시 UTC offset이 남아 있으면 `birth.expectedOffsetSeconds`로 fold의
`earlier`/`later` 후보를 좁힐 수 있습니다. 출처는 `timeEvidence.source`, 상충 자료는
`timeEvidence.conflict: 'multiple-sources'`로 계산값과 분리해 보존합니다. 외부에서
역산된 시각은 `source: 'rectified'`로 표시할 수 있지만 패키지가 직접 역산하지는 않습니다.

시간 미상이라도 입춘·절입 당일이거나 23시 일교체 정책을 비교하면 연주·월주·일주가
모두 확정되지 않을 수 있습니다. 사건 이력이나 성격으로 생시를 역산하는 자동
rectification은 결정론 계산 코어의 구현 범위에 포함되지 않습니다. 조사 근거와 제품 UX 권고는
[출생시각 미상·근사·범위 입력 조사](./docs/UNKNOWN_BIRTH_TIME_RESEARCH.md)에 정리했습니다.

이 인터페이스는 “출생 날짜는 하나로 확인되고 생시만 불확실한” UX를 대상으로 하며 한
요청의 최대 범위는 48시간입니다. 며칠에 걸쳐 날짜 자체가 불확실하면 날짜 후보를
사용자가 확인한 뒤 요청을 나누어 계산해야 합니다.

## 한국 음력 입력

평달과 윤달을 Boolean 조합이 아닌 구별된 값으로 입력합니다.

```ts
const report = calculateSaju({
  birth: {
    date: {
      calendar: 'korean-lunar',
      year: 1992,
      month: 9,
      day: 29,
      monthKind: 'regular',
    },
    time: { hour: 5, minute: 30 },
    timeZone: 'Asia/Seoul',
  },
});
```

이 입력은 양력 `1992-10-24`와 같은 순간·원국으로 정규화됩니다. 한국과 중국 음력이
갈리는 날짜도 합삭·중기·동지를 직접 계산하는 한국 음양력 엔진을 사용합니다. 예를
들어 한국의 1997년 설은 양력 `1997-02-08`입니다.

독립적인 음양력 변환은 별도 진입점에 있습니다.

```ts
import { getLunarMonthInfo, lunarToSolar, solarToLunar } from 'saju-engine/calendar';

solarToLunar(1997, 2, 8);
// { year: 1997, month: 1, day: 1, isLeapMonth: false }

lunarToSolar(2020, 4, 1, true);
// { year: 2020, month: 5, day: 23 }

getLunarMonthInfo(2023, 2);
// regular: 30일(2023-02-20..2023-03-21)
// leap:    29일(2023-03-22..2023-04-19)
```

## 역사 시간대와 DST

벽시각을 임의로 UTC+9로 가정하지 않습니다. 아래처럼 시간대와 중복 시각 해소 정책을
입력합니다.

```ts
const report = calculateSaju({
  birth: {
    date: { calendar: 'gregorian', year: 1988, month: 10, day: 9 },
    time: { hour: 2, minute: 30 },
    timeZone: 'Asia/Seoul',
    disambiguation: 'later',
  },
});
```

`disambiguation`의 기본값은 `reject`입니다.

| 값        | 동작                                         |
| --------- | -------------------------------------------- |
| `reject`  | gap과 fold를 오류로 처리                     |
| `earlier` | fold의 이른 UTC 순간 선택; gap은 여전히 오류 |
| `later`   | fold의 늦은 UTC 순간 선택; gap은 여전히 오류 |

`expectedOffsetSeconds`를 함께 주면 기록된 UTC offset과 IANA 데이터의 불일치도 검출할 수
있습니다. 서울의 `1908 +08:27:52`, `1912 +09:00`, `1954 +08:30`, `1961 +09:00`,
1948–1960 및 1987–1988의 24개 DST 전이를 밀리초 경계 회귀 사례로 고정했습니다.

보고서의 `offsetSeconds`는 DST가 적용된 경우까지 포함한 IANA 총 offset입니다.
`chronology.daylightSaving.isDaylightSavingTime`은 같은 2026c TZif의 `isdst` 비트이며,
그 아래 `offsetSeconds`는 인접 표준시 type과 같은 zone의 명확한 전례로 분리한 계절
보정량입니다. 축약명(`KST`/`KDT` 등)이나 1월/7월 오프셋 비교로 DST를 추측하지
않습니다. 이 방식은 Dublin의 음수 DST와 offset 변화가 0초인 역사적 DST type도
보존합니다. 생성·검증 범위 밖에서는 두 값이 `null`입니다.

## 자시 일경계

23:00–23:59의 일주와 시주 천간을 어떻게 볼지는 전통 관법에 따라 다릅니다. 이 패키지는
하나를 정답처럼 숨기지 않고 규칙으로 노출합니다.

```ts
const base = {
  birth: {
    date: { calendar: 'gregorian' as const, year: 2024, month: 3, day: 10 },
    time: { hour: 23, minute: 0 },
    timeZone: 'Asia/Seoul',
  },
};

calculateSaju({ ...base, rules: { ziHourPolicy: 'civilMidnight' } });
// 계유일 / 임자시

calculateSaju({ ...base, rules: { ziHourPolicy: 'ziStart' } });
// 갑술일 / 갑자시

calculateSaju({ ...base, rules: { ziHourPolicy: 'splitZi' } });
// 계유일 / 갑자시
```

| 정책                   | 23시대 일주 | 시주 천간 기준 |
| ---------------------- | ----------- | -------------- |
| `civilMidnight` (기본) | 당일        | 당일 일간      |
| `ziStart`              | 다음날      | 다음날 일간    |
| `splitZi`              | 당일        | 다음날 일간    |

## 지방 진태양시

진태양시는 일주·시주의 유효 시계에만 적용합니다. 연주·월주는 원래 UTC 출생 순간과
천문 절입 순간을 비교하므로 이동하지 않습니다.

```ts
const report = calculateSaju({
  birth: {
    date: { calendar: 'gregorian', year: 1990, month: 5, day: 15 },
    time: { hour: 7, minute: 5 },
    timeZone: 'Asia/Seoul',
  },
  rules: {
    dayHourClock: {
      kind: 'local-apparent-solar',
      longitudeDegreesEast: 126.978,
      equationOfTime: 'apply',
    },
  },
});
```

내부식은 다음과 같습니다.

```text
지방 진태양시 = UTC 순간 + 경도 × 240초 + 균시차
```

`equationOfTime: 'omit'`도 명시할 수 있습니다. 적용한 경도, 균시차, 총 보정량은 보고서에
남습니다.

## 세운·절월·대운 사실

`saju-engine/timing`은 양력 1월 1일이 아니라 실제 입춘부터 다음 입춘까지를 한
사주년으로 만들고, 그 안을 실제 12절 경계로 나눕니다. 성별을 전달한 경우에만 전통
순행/역행 규칙의 근사 대운을 추가합니다.

```ts
import { calculateSajuTiming } from 'saju-engine/timing';

const timing = calculateSajuTiming({
  natalRequest: {
    birth: {
      date: { calendar: 'gregorian', year: 1992, month: 10, day: 24 },
      time: { hour: 5, minute: 30 },
      timeZone: 'Asia/Seoul',
    },
  },
  fromYear: 2026,
  throughYear: 2028,
  gender: 'female',
  luckPillarCount: 6,
});

timing.years[0]?.annualPillar.tenGods;
timing.years[0]?.months[0]?.tenGods;
timing.luckPillars?.pillars[0]?.tenGods;
```

`luckPillarCount`는 1–120이며 기본값은 10입니다. 대운의 천간·지지 십신은 일간과의
관계를 표시하지만, 대운 시작일은 `three-days-one-year` 환산의 근사값입니다. timing
API는 길흉·사건·유리한 시기를 추론하지 않습니다.

## 일진 사실

같은 `saju-engine/timing` subpath에서 특정 현지 날짜의 결정론적 일진 사실을 계산할
수 있습니다. 민간 하루 전체가 자시 정책이나 진태양시 때문에 항상 같은 일주라는
가정을 피하기 위해, 대표 시각은 원국 IANA 시간대의 현지 민간시 정오로 명시됩니다.

```ts
import { calculateSajuDailyTransit } from 'saju-engine/timing';

const daily = calculateSajuDailyTransit({
  natalRequest: {
    birth: {
      date: { calendar: 'gregorian', year: 1992, month: 10, day: 24 },
      time: { hour: 5, minute: 30 },
      timeZone: 'Asia/Seoul',
    },
  },
  date: { calendar: 'gregorian', year: 2026, month: 6, day: 28 },
});

daily.pillars.year.korean; // 병오
daily.pillars.day.korean; // 계유
daily.tenGods.day; // 원국 일간 기준 천간·지지 십신
daily.relationships.branchClashes;
// [{ positions: ['transit-day', 'natal-hour'], members: ['유', '묘'], direction: 'mutual' }]
```

관계 배열은 일진 일주와 원국의 연·월·일·시주를 모두 비교하고 위치와 형의 방향을
보존합니다. 합·충·형·파·해의 원시 표 일치만 반환하며 점수·길흉·순위·사건 예측은
만들지 않습니다. 대표 시각, 상속한 자시 정책·일시계, 진태양시 보정과 근거는
`representative`와 `audit`에 남습니다.

## Tradition Pack과 근거형 해설

계산 보고서에 학파 해석 필드를 섞지 않습니다. `saju-engine`은 L1/L2 계산 사실까지만
만들고, `plugins/oh-my-saju/tradition-packs/<pack-id>`의 Pack이 그 사실을 판본화된
규칙으로 평가합니다.

각 Tradition Pack은 다음을 한꺼번에 버전 관리하는 수직 module입니다.

- `tradition-pack.json`: Pack ID·version·출력 계약·의존 파일 목록
- `sources.json`: 판본과 출전 locator
- `rules.json`과 `profile.ts`: 규칙 ID·지원 범위·제약
- Pack별 table과 `evaluate.ts` helper
- rule/fixture digest와 검증 상태를 포함한 provenance

현재 plugin artifact에는 다음 Pack이 들어 있습니다.

1. `calculation-baseline@1.1.0`: 학파 공통 구조와 명시적 관법표의 12운성 관찰
2. `ziping@1.0.0`: 《자평진전》 월령·격국 후보
3. `ditianshui@1.0.0`: 《적천수》 왕쇠 증거 장부
4. `qiongtong@1.0.0`: 《궁통보감》 일간×월령 조후 후보
5. `sanming-symbolic-curated@1.0.0`: 연지 역마 일치·완전 명식 부재·부분 원시 관측

12운성은 선택한 음간 진행 방향과 토간 배속을 profile parameter로 기록하고, 각 기둥의
단계만 반환합니다. 역마 overlay도 출전 문구를 연지 기준으로 한 지지 일치만 반환하며,
완전한 네 기둥에서만 부재를 확정합니다. 생시 미상은 알려진 삼주 관측으로 표시합니다.
어느 쪽도 그 자체로 신강·신약, 길흉, 이동·여행, 사건 예측을 만들지 않으며, 이
릴리스가 광범위한 신살 체계를 지원한다는 뜻도 아닙니다.

각 Pack은 자신의 finding·source·rule namespace를 유지합니다. runtime 비교기는
호환되는 의미 좌표의 agreement/disagreement와 `semantic-mismatch`를 나란히 보여 줄
뿐 Pack을 평탄화하거나 투표·평균·점수·승자 선택으로 합치지 않습니다.

Agent Skill은 이 규칙을 프롬프트로 다시 구현하지 않습니다. self-contained runtime의
`prepare-reading`으로 계산과 Pack 평가를 실행하고, 호스트가 Pack별 narration task를
독립 작성한 뒤 `validate-reading`으로 근거와 불확실성을 검증하는 workflow입니다.

예를 들어 다음 JSON을 임시 파일 `prepare.json`에 저장합니다.

```json
{
  "schemaVersion": "1",
  "command": "prepare-reading",
  "request": {
    "calculation": {
      "kind": "exact",
      "request": {
        "birth": {
          "date": { "calendar": "gregorian", "year": 1996, "month": 5, "day": 27 },
          "time": { "hour": 6, "minute": 50 },
          "timeZone": "Asia/Seoul"
        }
      }
    },
    "question": "원국의 핵심 구조를 근거와 함께 설명해줘.",
    "locale": "ko-KR",
    "purpose": "general-reading",
    "audience": "adult",
    "variantPolicy": "include-candidate-dependent"
  }
}
```

설치된 skill directory를 기준으로 실행합니다.

```bash
node plugins/oh-my-saju/skills/oh-my-saju/scripts/oh-my-saju.mjs \
  --input prepare.json \
  --pretty
```

성공 결과의 주요 층은 다음과 같습니다.

- `result.analysis.calculation`: 감사 가능한 원국 또는 생시 후보 집합
- `result.analysis.baseline`: 공통 구조 Pack의 관찰
- `result.analysis.doctrines`: 학파 Pack별 독립 finding
- `result.analysis.comparison`: 합의·차이·의미 불일치를 그대로 둔 비교
- `result.narrationTasks`: 한 Pack의 finding만 담은 provider-neutral 요청
- `result.binding`: 계산 코어·Pack·reading 계약을 묶은 SHA-256 digest

저장소의 application API를 직접 조립하는 호스트는
`renderOhMySajuCompact(prepared)`와 `renderOhMySajuMarkdown(prepared)`로 같은 준비
결과를 LLM 입력용 압축 텍스트 또는 표 중심 Markdown으로 결정론적으로 표시할 수
있습니다. 두 renderer는 생시 불확실성, Pack 출처, 12운성, 세운·절월, 대운의 근사
표시와 십신을 보존하지만 해석이나 길흉을 새로 만들지는 않습니다.

호스트는 `requiresDraft: true`인 task마다 허용된 `findingIds`만 인용해 JSON 초안을
만듭니다. 이어 같은 원 요청, `result.binding.digest`, 정확한 Pack별 draft 집합으로
`validate-reading`을 실행합니다. runtime은 원 요청을 다시 계산하고 schema·평문·Pack
격리·finding ID·후보 support·조건부 표현을 검사합니다. 검증 실패를 우회한 prose는
결과가 아닙니다. 자세한 명령 형태는
[`input-and-runtime.md`](./plugins/oh-my-saju/skills/oh-my-saju/references/input-and-runtime.md)를
참고하세요.

생시 미상에서는 실제 삼주만 계산합니다. Pack은 삼주로 유효한 소계를
`coverage: 'partial'`, `omittedPillars: ['hour']`로 표시하고 시주가 필수인 규칙은
`unavailable`로 남깁니다. 임의 정오나 구간 길이 기반 확률을 만들지 않습니다.

향후 서로 다른 Pack의 고유 용어를 더 정밀하게 비교해야 할 때는 별도 ontology adapter
seam을 둘 수 있습니다. adapter는 version과 mapping provenance를 가진 비교 좌표를
만들 뿐 Pack의 원래 finding을 다시 쓰거나 하나의 표준 학파로 합치지 않습니다.

## 오류 처리

`calculateSaju()`는 예상 가능한 입력·데이터 오류를 `SajuError`로 던집니다.
서버 경계에서는 결과 union을 반환하는 `tryCalculateSaju()`가 편리합니다.

```ts
import { tryCalculateSaju } from 'saju-engine';

const result = tryCalculateSaju(request);
if (!result.ok) {
  console.error(result.error.code, result.error.message);
}

JSON.stringify(result); // 성공과 실패 모두 안전
```

주요 오류 코드는 `INVALID_REQUEST`, `INVALID_DATE`, `INVALID_TIME`,
`INVALID_LEAP_MONTH`, `INVALID_RULE`, `UNKNOWN_TIME_ZONE`,
`NONEXISTENT_LOCAL_TIME`, `AMBIGUOUS_LOCAL_TIME`, `OFFSET_MISMATCH`,
`UNSUPPORTED_DATE_RANGE`, `DATA_INTEGRITY_FAILURE`입니다.

Oh My Saju CLI는 계산·Pack·reading/application 오류를 감추지 않고
`{ "ok": false, "error": { "code", "message", ... } }` JSON으로 반환합니다.
`prepare-reading`이 실패하면 원국이나 finding을 추측해 계속하지 않습니다.
`validate-reading`의 `PREPARATION_MISMATCH`, `INVALID_DRAFT_SET`,
`UNGROUNDED_OUTPUT`, `UNCERTAINTY_VIOLATION`도 초안을 수정하거나 다시 준비해야 하는
실패이며 우회 대상이 아닙니다. 각 오류의 `code`를 기계 분기에 사용하고 provider
원문·자격증명은 공개 오류에 보존하지 않습니다.

## 지원 범위

| 기능                | 범위                            |
| ------------------- | ------------------------------- |
| 권장 사주 보고서    | 양력으로 정규화된 1801–2100년   |
| 천문 절기 조회      | 1800–2300년                     |
| 한국 음력 연도 변환 | 음력 1391–2100년                |
| IANA 시간대         | 패키지에 고정된 full tzdb 2026c |

1801년 이전 출생지는 표준시 이전의 지역 평균시 기록 해석 문제가 커서 권장 API에서
제외했습니다. `Asia/Seoul`의 1908년 표준시 도입 이전 계산에는 서울 LMT가 적용되며,
실제 출생지 경도와 다를 수 있다는 경고가 반환됩니다. 1582년 이전 양력 표기는
proleptic Gregorian 기준입니다.

## 서브패스

```ts
import { calculateSaju, tryCalculateSaju, ENGINE_MANIFEST } from 'saju-engine';
import { getLunarMonthInfo, solarToLunar, lunarToSolar } from 'saju-engine/calendar';
import { findSolarTermBoundary, resolveBirthInstant } from 'saju-engine/advanced';
import { calculateSajuTiming } from 'saju-engine/timing';
```

- 루트: 안정적인 JSON 사주 API
- `calendar`: 한국 음양력 변환과 평달·윤달 월 정보
- `advanced`: 저수준 시간대·절기·구조 분석 진단
- `timing`: 정확 시각 원국을 기준으로 한 입춘 사주년·12절월·개수 선택 및 십신 포함
  근사 대운

Tradition Pack, reading, application CLI는 npm 서브패스가 아니라
`plugins/oh-my-saju`가 소유합니다.

## 검증

`pnpm check`는 다음을 실행합니다.

- 엄격한 TypeScript 타입 검사와 ESLint
- KASI/data.go.kr 200개 독립 음양력 픽스처와 SHA-256 고정
- KASI와 양방향 일치하는 198건 및 알려진 전근대 역법 차이 2건 고정
- 음력 1391년 초하루부터 2100년 말일까지 259,307개 날짜 전수 왕복
- 모든 음력 평달·윤달의 시작·끝 왕복
- KASI 일진 115개 독립 대조
- Astronomy Engine으로 계산한 24절기와 일본 국립천문대 2024년 12절 픽스처
- 1801–2100년 모든 12절·12중기의 `-1ms / 경계 / +1ms`
- 공개 API를 통한 60갑자, 오호둔·오서둔, 시진·자시 밀리초 경계, 세기 윤년,
  독립 Gregorian JDN 속성
- 한국의 24개 역사 DST 전이와 네 표준시 변경, 미국 DST gap/fold
- 597개 IANA zone의 65,958개 시간 구간에 대한 TZif/Moment 정렬과 DST 메타데이터 전수 해독
- ESM/CommonJS/서브패스 로딩 및 세 가지 Node 호스트 `TZ`의 byte-for-byte 동일성
- 0.9.0 계산 코어와 plugin runtime/Pack의 분리된 test·coverage gate
- engine package가 해석·AI·agent 서브패스나 Tradition Pack source를 노출하지 않는지
- Pack별 finding 안정성, source/evidence 연결, provenance digest와 재귀 동결
- plugin runtime의 가짜 finding, 후보 불확실성 혼합, JSON/prototype pollution,
  제어문자·HTML/URL 출력 거부
- 체크인된 Agent Skill runtime의 재빌드 byte equality와 plugin 밖 경로 비의존성
- 브라우저용 IIFE 번들 생성

상세한 설계와 검증 계보는 [아키텍처](./docs/ARCHITECTURE.md)와
[검증·한계](./docs/VALIDATION.md)를 참고하세요.
릴리스 검증에서는 생성한 번들을 실제 Chromium(`Asia/Seoul`)에서도 실행해 같은 고정
결과를 확인했습니다.

## 개발

```bash
pnpm test:run
pnpm test:browser:bundle
pnpm typecheck
pnpm lint
pnpm build
pnpm verify:package
pnpm check
```

의존성과 데이터 버전은 정확한 버전으로 고정합니다. 시간대·천문·음력 데이터 갱신은
버전 변경, 독립 fixture 재생성, 전수 diff 검토를 한 변경으로 처리해야 합니다.

## 라이선스

프로젝트는 [Apache License 2.0](./LICENSE)으로 배포합니다. 번들되는 제3자
소프트웨어와 데이터의 저작권·라이선스는 [NOTICE.md](./NOTICE.md)를 참고하세요.

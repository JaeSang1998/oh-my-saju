<div align="center">

<h1>Oh My Saju</h1>

<p><strong>만세력부터 해석까지. 사주 개발에 필요한 모든 것.</strong></p>

<p>
정확한 원국 계산, 음양력·절기·대운, 전통 규칙, 택일·점술 모듈, AI 해설까지<br />
하나의 TypeScript 프로젝트에서 바로 사용할 수 있습니다.
</p>

<p>
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white" />
  <img alt="Node.js 18+" src="https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=nodedotjs&logoColor=white" />
  <img alt="saju-engine 0.9.0" src="https://img.shields.io/badge/saju--engine-0.9.0-765A3D" />
  <img alt="Oh My Saju plugin 0.4.0" src="https://img.shields.io/badge/plugin-0.4.0-A66A3F" />
  <img alt="Apache 2.0" src="https://img.shields.io/badge/license-Apache--2.0-blue" />
</p>

<p>
  <a href="#빠른-시작">빠른 시작</a> ·
  <a href="#제공-기능">제공 기능</a> ·
  <a href="#typescript-api">TypeScript API</a> ·
  <a href="#검증">검증</a> ·
  <a href="#개발">개발</a>
</p>

</div>

---

Oh My Saju는 만세력 계산부터 전통 규칙 평가와 AI 해설까지 한 번에 제공하는 올인원
사주 개발 툴킷입니다.

같은 생년월일시도 절입 시각, 역사 시간대, 자시 기준, 진태양시 적용 방식에 따라 결과가
달라질 수 있습니다. 이 프로젝트는 그런 선택을 기본값 뒤에 감추지 않고 입력 정책,
중간 계산, 사용한 데이터 버전과 함께 반환합니다.

저장소에는 두 배포물이 들어 있습니다.

| 배포물              | 역할                                                                 |
| ------------------- | -------------------------------------------------------------------- |
| `saju-engine@0.9.0` | 원국, 한국 음양력, 절기, 시간대, 생시 후보, 세운·절월·대운·일진 계산 |
| `oh-my-saju@0.4.0`  | 전통 규칙 팩, 택일·토정·주역·자미두수·육임, 근거형 AI 해설 워크플로  |

## 빠른 시작

### Codex

```bash
codex plugin marketplace add JaeSang1998/oh-my-saju
codex plugin add oh-my-saju@oh-my-saju-marketplace --json
```

### Claude Code

```bash
claude plugin marketplace add JaeSang1998/oh-my-saju
claude plugin install oh-my-saju@oh-my-saju-marketplace
```

저장소를 내려받아 직접 불러올 수도 있습니다.

```bash
claude --plugin-dir ./plugins/oh-my-saju
```

설치한 뒤 자연어로 요청하세요.

```text
1992년 10월 24일 오전 5시 30분, 서울 출생이야.
절기와 시간 보정 근거를 포함해서 사주를 계산해줘.
```

```text
태어난 시간이 오전이라는 것만 알아.
확실한 부분과 시간에 따라 달라지는 부분을 나눠줘.
```

다른 Agent Skills 호스트에서는
`plugins/oh-my-saju/skills/oh-my-saju`를 하나의 스킬 디렉터리로 설치하면 됩니다.
호스트별 차이는 [플러그인 호환성 조사](./docs/research/agent-plugin-compatibility.md)에
정리했습니다.

### 소스에서 빌드

```bash
git clone https://github.com/JaeSang1998/oh-my-saju.git
cd oh-my-saju

corepack pnpm@10.15.0 install --frozen-lockfile
corepack pnpm@10.15.0 run build
corepack pnpm@10.15.0 run build:plugin
```

Node.js 18 이상이 필요합니다. npm 패키지 배포 전에는 저장소 소스를 기준으로
사용하세요.

## 제공 기능

### 만세력 계산 코어

| 영역          | 제공 내용                                                        |
| ------------- | ---------------------------------------------------------------- |
| 원국          | 연주·월주·일주·시주, 60갑자, 천간·지지, 음양, 오행               |
| 십신과 구조   | 십신, 공망, 전체 지장간, 오행 분포                               |
| 기둥 관계     | 천간합, 지지 합·충·형·파·해·삼합과 실제 기둥 위치                |
| 한국 음양력   | 양력↔음력 변환, 평달·윤달, 월 길이와 양력 시작·종료일           |
| 절기          | 겉보기 지심 태양 황경으로 계산한 24절기의 실제 순간              |
| 시간대        | IANA 시간대, 역사 표준시·DST, 존재하지 않거나 중복되는 현지 시각 |
| 일시 정책     | 민간시, 지방 진태양시, 세 가지 자시 일경계                       |
| 생시 불확실성 | 미상·오전/오후·근사·직접 범위의 가능한 원국과 안정된 기둥        |
| 운의 계산     | 입춘 기준 세운, 12절월, 근사 대운, 특정 날짜의 일진              |
| 출력          | 직렬화 가능한 JSON, Compact 텍스트, Markdown                     |

### 전통 규칙 팩

학파에 따라 달라지는 규칙은 계산 코어와 분리해 버전별로 관리합니다. 각 결과에는
규칙 ID, 적용 위치, 출전과 관법 버전이 붙습니다.

| 규칙 팩                          | 현재 범위                                       |
| -------------------------------- | ----------------------------------------------- |
| `calculation-baseline@1.1.0`     | 공통 구조 관찰과 관법을 명시한 십이운성         |
| `ziping@1.0.0`                   | 《자평진전》 계열의 월령·격국 후보              |
| `ditianshui@1.0.0`               | 《적천수》 계열의 왕쇠 증거 장부                |
| `qiongtong@1.0.0`                | 《궁통보감》 계열의 일간×월령 조후 후보         |
| `sanming-symbolic-curated@1.1.0` | 기준 기둥과 위치를 보존하는 15개 엄선 신살 규칙 |

규칙 팩끼리 비교할 때는 같은 의미의 결과만 일치·불일치로 묶습니다. 비교 기준 자체가
다르면 `semantic-mismatch`로 남겨 원래 결과를 보존합니다.

### 독립 전통 계산

| 모듈     | 현재 제공 범위                                                           | 다음 확장 범위                             |
| -------- | ------------------------------------------------------------------------ | ------------------------------------------ |
| 택일     | 일상·결혼·이사 후보일, 12건제, 황흑도, 월파, 참가자 연지 관계, 정렬 점수 | 영인본 대조가 필요한 육덕·행사별 상세 규칙 |
| 토정비결 | 한국식 나이와 음력·간지에 따른 144 숫자 산출 과정                        | 판본을 고정한 144괘 해석                   |
| 주역     | 수동 효, 삼전법 동전, 재현 가능한 시초법에서 본괘·동효·지괘 계산         | 괘사·효사 해석                             |
| 자미두수 | 명궁·신궁, 12궁 궁간, 오행국, 14주성 배치                                | 보조성, 사화, 대한·유년 등 운한            |
| 육임     | 중기 기준 월장, 천지반, 사과, 규칙 경로, 삼전                            | 천장 배치와 점단                           |

택일 점수는 후보 정렬 정책입니다. 고전 규칙의 일치 내역과 점수 기여분을 나누어
반환하므로 순위가 나온 이유를 확인할 수 있습니다.

### 근거형 AI 해설

```text
prepare-reading
  → 원국과 규칙 팩 계산
  → 규칙 팩별 판정 근거 ID 생성
  → 호스트 모델이 근거 ID를 인용해 초안 작성
  → validate-reading이 근거와 생시 불확실성 검증
```

계산 결과, 규칙 팩의 판정, 모델이 작성한 문장을 별도 필드로 유지합니다. 다른 규칙
팩의 근거를 잘못 섞거나 특정 생시 후보에만 해당하는 내용을 확정적으로 쓰면 검증
단계에서 찾을 수 있습니다.

## TypeScript API

### 원국 계산

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
  rules: {
    ziHourPolicy: 'civilMidnight',
    dayHourClock: { kind: 'civil' },
  },
});

console.log({
  year: report.pillars.year.korean, // 임신
  month: report.pillars.month.korean, // 경술
  day: report.pillars.day.korean, // 계유
  hour: report.pillars.hour.korean, // 을묘
});
```

결과에는 정규화된 양력·음력 날짜, UTC 순간, 당시 시간대 오프셋, 절입 시각, 선택한
자시·진태양시 정책과 엔진·데이터 버전이 함께 들어 있습니다.

### 생시를 모를 때

```ts
import { calculateSajuPossibilities } from 'saju-engine';

const result = calculateSajuPossibilities({
  birth: {
    date: {
      calendar: 'gregorian',
      year: 1992,
      month: 10,
      day: 24,
    },
    time: {
      kind: 'day-period',
      period: 'am',
    },
    timeZone: 'Asia/Seoul',
    timeEvidence: {
      source: 'family-memory',
      originalText: '오전에 태어남',
    },
  },
  rules: {
    ziHourPolicies: 'all',
  },
});

result.policyResults[0]?.stablePillars;
result.policyResults[0]?.candidates;
```

`unknown`, `day-period`, `approximate`, `range` 입력을 지원합니다. 각 후보가 실제로
성립하는 현지·UTC 구간과 모든 후보에서 같은 기둥을 함께 반환합니다.

### 한국 음양력

```ts
import { getLunarMonthInfo, lunarToSolar, solarToLunar } from 'saju-engine/calendar';

solarToLunar(1997, 2, 8);
// { year: 1997, month: 1, day: 1, isLeapMonth: false }

lunarToSolar(2020, 4, 1, true);
// { year: 2020, month: 5, day: 23 }

getLunarMonthInfo(2023, 2);
// 평달·윤달의 일수와 각각의 양력 시작·종료일
```

음양력 변환은 외부 HTTP API를 호출하지 않습니다. `calculateSaju()`도 같은 내부
변환기를 직접 사용하며, KASI 자료는 배포 시점의 회귀 검증 자료로 사용합니다.

### 지방 진태양시

```ts
const report = calculateSaju({
  birth: {
    date: { calendar: 'gregorian', year: 1990, month: 5, day: 15 },
    time: { hour: 7, minute: 5 },
    timeZone: 'Asia/Seoul',
  },
  rules: {
    ziHourPolicy: 'civilMidnight',
    dayHourClock: {
      kind: 'local-apparent-solar',
      longitudeDegreesEast: 126.978,
      equationOfTime: 'apply',
    },
  },
});
```

적용한 경도, 균시차와 총 보정량은 결과에 기록됩니다.

### 세운·절월·대운과 일진

```ts
import { calculateSajuDailyTransit, calculateSajuTiming } from 'saju-engine/timing';
```

`calculateSajuTiming()`은 실제 입춘부터 다음 입춘까지를 한 사주년으로 만들고 실제
12절 경계로 월을 나눕니다. `calculateSajuDailyTransit()`은 특정 현지 날짜의 일진과
원국 네 기둥 사이의 합·충·형·파·해를 반환합니다.

### 전통 시스템 명령

플러그인 실행기는 다섯 전통 시스템을 같은 JSON 명령 형식으로 받습니다.

```json
{
  "schemaVersion": "1",
  "command": "run-traditional-system",
  "request": {
    "kind": "iching",
    "method": "manual-lines",
    "lines": [9, 7, 7, 7, 7, 7],
    "trigramArrangement": {
      "id": "shuogua-houtian",
      "version": "1.0.0"
    }
  }
}
```

```bash
node plugins/oh-my-saju/skills/oh-my-saju/scripts/oh-my-saju.mjs \
  --input request.json \
  --pretty
```

TypeScript에서는 다음 함수를 직접 호출할 수 있습니다.

- `rankElectionDates()`
- `calculateTojeong144()`
- `castIChing()`
- `calculateZiweiChart()`
- `calculateLiurenChart()`

자미두수와 육임은 `subject.rules.ziHourPolicy`와
`subject.rules.dayHourClock`을 요청에 명시해야 합니다.

## 계산 데이터

| 영역           | 구현과 고정 버전                                  |
| -------------- | ------------------------------------------------- |
| 한국 음양력    | 자체 천문 계산기, KASI·data.go.kr 고정 검증 자료  |
| 절기           | `astronomy-engine@2.1.19`의 겉보기 지심 태양 황경 |
| 시간대         | `moment-timezone@0.6.3`, 전체 IANA tzdb `2026c`   |
| 날짜 범위      | 양력으로 정규화한 사주 1801–2100년                |
| 절기 범위      | 1800–2300년                                       |
| 한국 음력 범위 | 음력 1391–2100년                                  |

## 검증

`pnpm check`는 타입, 정적 분석, 형식, 회귀 테스트, 브라우저 번들, 패키지와 플러그인
무결성을 한 번에 검사합니다.

- KASI·data.go.kr 음양력 독립 사례 200건과 일진 115건
- 음력 1391년 초하루부터 2100년 말일까지 259,307개 날짜의 양방향 전수 변환
- 1801–2100년 모든 12절·12중기의 `경계 - 1ms / 경계 / 경계 + 1ms`
- 일본 국립천문대 2024년 절기 자료와의 독립 대조
- 서울의 역사 표준시 변경과 24개 DST 전이
- 597개 IANA 시간대, 65,958개 구간의 시간대 자료 정렬
- ESM·CommonJS·서브패스와 서로 다른 호스트 `TZ`에서 같은 결과인지 확인
- 규칙 팩별 표 전수 검사, 출전 연결, 콘텐츠 해시와 경계 회귀
- 자미두수 독립 오라클 438셀과 음력월·윤달·일·시 경계 검사
- 플러그인 배포물의 재빌드 바이트 일치와 실제 명령 검사

자세한 검증 범위와 알려진 오차 요인은 [검증과 한계](./docs/VALIDATION.md)를
참고하세요.

## 공개 진입점

| 진입점                                   | 주요 기능                              |
| ---------------------------------------- | -------------------------------------- |
| `saju-engine`                            | 원국, 오류 결과형, 생시 후보           |
| `saju-engine/calendar`                   | 한국 음양력 변환과 월 정보             |
| `saju-engine/advanced`                   | 절기·시간대·구조 분석용 저수준 진단    |
| `saju-engine/timing`                     | 세운·절월·대운·일진                    |
| `plugins/oh-my-saju/runtime/systems`     | 택일·토정·주역·자미두수·육임           |
| `plugins/oh-my-saju/runtime/application` | 해설 준비·검증과 Compact·Markdown 출력 |

## 저장소 구조

```text
src/                         # saju-engine 계산 코어
plugins/oh-my-saju/
  runtime/                   # 규칙 평가·해설 검증·전통 시스템
  tradition-packs/           # 출전과 검증 자료를 묶은 전통 규칙 팩
  skills/oh-my-saju/         # Agent Skill과 독립 실행 번들
docs/
  adr/                       # 설계 결정
  research/                  # 출처 조사와 구현 범위
test/fixtures/               # 독립 검증 자료
tools/                       # 빌드·검증 도구
```

## 개발

```bash
corepack pnpm@10.15.0 install --frozen-lockfile

pnpm test:run
pnpm test:coverage
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
pnpm build:plugin
pnpm verify:plugin
pnpm verify:package
pnpm verify:artifact
```

전체 검사는 다음 한 줄로 실행합니다.

```bash
pnpm check
```

시간대·천문·음력·전통 규칙 데이터를 바꿀 때는 코드와 함께 데이터 버전, 검증 자료,
콘텐츠 해시와 경계 회귀를 갱신해야 합니다.

더 읽을 문서:

- [아키텍처](./docs/ARCHITECTURE.md)
- [검증과 한계](./docs/VALIDATION.md)

## 라이선스

Oh My Saju는 [Apache License 2.0](./LICENSE)으로 배포합니다.

배포물에 포함된 제3자 소프트웨어와 데이터의 저작권·라이선스는
[NOTICE.md](./NOTICE.md)와 [LICENSES](./LICENSES)에서 확인할 수 있습니다.

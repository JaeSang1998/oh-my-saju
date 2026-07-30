# Architecture

## 목표

복잡한 시간대·천문·역법 구현은 내부에 가두고, 호출자는 하나의 명시적인 요청과
JSON 보고서만 다루게 합니다. 외부 엔진은 교체 가능한 계산 seam으로 사용하고
사주 규칙은 작은 순수 TypeScript 계층에 둡니다.

```text
SajuRequest
  ├─ Gregorian date ───────────────────────────────┐
  └─ Korean lunar date → astronomical lunisolar engine ─┤
                                                   ▼
                         local wall time + IANA zone
                                                   │
                          full tzdb → one UTC instant
                                                   │
                    ┌──────────────────────────────┴──────────┐
                    ▼                                         ▼
       apparent solar longitude                    civil/apparent-solar clock
          → Lichun and 12 Jie                                 │
                    │                                         │
                    └────────── Korean rules layer ────────────┘
                                       │
                    year / month / day / hour pillars
                                       │
                    facts + evidence + warnings + manifest
```

불확실한 생시는 정확 시각 seam 앞에서 별도의 집합 계산 모듈이 다룹니다.

```text
SajuPossibilityRequest
  → unknown / am·pm / approximate / range를 [local start, local end)로 정규화
  → IANA gap·fold + 입춘·12절 및 소스 오차 끝점 + 시진·자시 + 진태양시 근을 경계로 열거
  → 각 불변 구간에서 calculateSaju()
  → 절입 오차 안에서는 실제 UTC 절입 양쪽 원국을 epistemic 대안으로 추가
  → 60갑자 index로 후보 중복 제거
  → 전체/정책별 stablePillars + 정책 간 중복 제거 candidates + basis가 있는 windows
```

이 모듈은 가상 정오나 분 단위 표본을 쓰지 않습니다. 민간시 경계는 직접 열거하고,
지방 진태양시 경계는 보정된 시계가 경계에 도달하는 근을 밀리초까지 이분 탐색합니다.
정확 시각 계산 규칙은 기존 `calculateSaju()` 한 곳에만 유지합니다.

## 공개 모듈

| 진입점                 | 책임                                               |
| ---------------------- | -------------------------------------------------- |
| `saju-engine`          | 정확/불확실 시각 요청, 계산 보고서, 오류, manifest |
| `saju-engine/calendar` | 한국 음양력 변환                                   |
| `saju-engine/advanced` | 시간대·절기·구조 분석 진단                         |
| `saju-engine/timing`   | 입춘 사주년·12절월·근사 대운·현지 정오 일진 사실   |

저수준 provider를 루트 API에 노출하지 않습니다. 안정적인 외부 seam은 정확 시각용
`calculateSaju(request)`와 불확실 시각용 `calculateSajuPossibilities(request)`입니다.
모든 공개 서브패스는 재현 가능한 계산 사실만 반환하며, 공개 진입점은 위 표와 package
`exports` 검증을 단일 계약으로 삼습니다.

## repository module과 의존 방향

아래 `D`는 dependency tier이며 `CONTEXT.md`의 `L0–L4` evidence level과 별개입니다.
각 module은 바로 아래 tier의 공개 interface만 소비합니다.

```text
D0  출생 증거·tzdb·천문·한국 음력·독립 fixture
 ↓
D1  saju-engine: 시간대·절기·원국·생시 후보·구조·timing 사실
 ↓
D2  plugin Tradition Packs: source/rules/table/helper/provenance
 ↓
D3  plugin Pack runtime: 평가 + 미해결 비교
 ↓
D4  plugin Reading/Application runtime: narration task + claim gate + JSON CLI
 ↓
D5  Agent Skill: 입력 인터뷰 + prepare→draft→validate workflow
 ↓
D6  Agent Plugins / Codex / Claude Code host adapters
```

### 계산 코어

`saju-engine`은 계산 복잡성을 작은 request/report interface 뒤에 숨기는 깊은
module입니다. 코어 구현은 전통 문헌, 학파 rule ID, narration prompt, Agent Skill,
host manifest를 알지 못합니다. `timing`도 동일한 계산 사실 가지이며 길흉·기회·부담·
사건 예측을 반환하지 않습니다.

### Tradition Pack

Tradition Pack은 한 전통 또는 공통 구조 baseline의 지식을 함께 이동·검증·버전 관리하는
수직 module입니다. Pack directory는 적어도 다음 implementation 단위를 함께 둡니다.

```text
tradition-packs/<pack-id>/
├── tradition-pack.json   # Pack interface와 파일 inventory
├── sources.json          # 판본·출전 locator
├── rules.json            # rule ID와 선언 계약
├── profile.ts            # finding profile
├── evaluate.ts           # 필요한 Pack-local evaluator
└── *table* / helpers / fixtures
```

Pack provenance는 source/rule/table/helper/fixture의 실제 bytes와 version을 결속합니다.
계산 코어의 `ENGINE_MANIFEST`가 Pack provenance를 소유하지 않습니다. Pack runtime은
검증된 정적 Pack을 읽는 adapter이며, caller가 같은 Pack/rule/source ID로 내용을
덮어쓰게 하지 않습니다.

현재 Pack은 `calculation-baseline`, `ziping`, `ditianshui`, `qiongtong`,
`sanming-symbolic-curated`입니다. `calculation-baseline@1.1.0`은 명시적 관법표의
12운성 단계를 구조 관찰로만 내보내며, `sanming-symbolic-curated@1.0.0`은 출전표를
연지 기준으로 한 역마 지지 일치만 내보냅니다. 생시 미상은 전체 부재가 아닌 부분
관측으로 남깁니다. 이는 광범위한 신살 지원이나 길흉·사건 해석이 아닙니다.
각 Pack은 고유 namespace와 isolated finding set을 반환합니다. comparison은 호환되는
`definitionId`, `conceptId`, `methodId`, `subjectKey` 좌표에서만 agreement 또는
disagreement를 계산하고, 나머지는 `semantic-mismatch`나 unavailable로 보존합니다.
Pack 결과를 하나의 공통 객체로 평탄화하거나 투표·평균·점수·순위·승자로 합치지
않습니다.

향후 Pack-native 용어 사이의 명시적 매핑이 충분히 필요해지면 comparison 앞에
versioned ontology adapter seam을 둘 수 있습니다. 이 adapter는 mapping provenance와
unmapped 상태를 출력하며 원래 finding을 수정하지 않습니다. 단 하나의 학파 ontology를
코어나 모든 Pack에 선제적으로 강제하지 않습니다.

### Reading/Application runtime

Reading runtime은 Pack별 finding으로 redacted narration task를 만들고 모델 초안을
검증합니다. Application runtime은 그 과정을 두 command의 provider-neutral JSON
interface로 감쌉니다.

```text
prepare-reading(raw request)
  → saju-engine으로 원국·후보·timing 사실 계산
  → Pack별 독립 평가 + unresolved comparison
  → one redacted narration task per Pack
  → SHA-256 binding over core + Packs + analysis + timing + task contracts

validate-reading(the same raw request, prepared digest, host drafts)
  → 같은 코어와 Pack으로 다시 계산
  → question/chart/timing/Pack/task mismatch 거부
  → exact required Pack/draft set 검사
  → schema / plain-text / finding-ID / support-set / uncertainty / calendar-Ganzhi claim gate
  → audited per-Pack readings
```

직렬화한 계산 보고서나 Pack 결과를 다시 신뢰하지 않고 원 요청으로 재계산합니다. 각
narration task에는 구조화된 출생 요청, chronology, 원래 생시 증거 문구, 내부 finding
value가 없으며 한 Pack의 finding만 들어갑니다. 자유문 `question`은 비신뢰 데이터로
별도 전달되므로 개인정보 고지·마스킹·provider 정책은 product adapter 책임입니다.
모델 초안은 plugin runtime 검증을 통과한 뒤에만 결과가 됩니다.

질문은 길이·정규화·제어문자만 검증하며 의료·교육·재무·직업·성격·궁합·대운·사건 같은
주제로 분류해 호출 전에 차단하지 않습니다. Reading은 계산 사실(L1/L2), Pack
finding(L3), 모델 추론(L4)을 구분하며 모델 추론을 계산 보고서나 Pack finding에
되쓰지 않습니다.

### Agent Skill과 host adapter

Agent Skill은 D4 interface를 올바른 순서로 사용하는 workflow입니다. 계산 공식,
Pack rule/table, comparison semantics, claim validation을 `SKILL.md`에 재구현하지
않습니다. Codex와 Claude Code adapter는 동일한 Agent Skill과 bundled runtime을
설치·발견·호출하는 역할만 합니다.

배포 artifact의 정본은 `plugins/oh-my-saju`입니다.

```text
plugins/oh-my-saju/
├── plugin.json                       # Agent Plugins 1.0 portable manifest
├── .codex-plugin/plugin.json         # Codex overlay/fallback
├── .claude-plugin/plugin.json        # Claude Code adapter
├── tradition-packs/                   # Pack source/rule/table/helper/provenance
├── runtime/
│   ├── traditions/                    # Pack adapter, evaluation, comparison
│   ├── reading/                       # narration tasks and claim gate
│   └── application/                   # prepare/validate command implementation
└── skills/oh-my-saju/
    ├── SKILL.md                       # shared workflow
    ├── references/
    ├── agents/openai.yaml
    └── scripts/oh-my-saju.mjs         # self-contained generated runtime
```

번들 runtime은 plugin root 밖의 monorepo 파일을 참조하지 않고 Node.js 18 이상에서
네트워크와 패키지 설치 없이 실행됩니다. 첫 버전에는 MCP, hook, 상시 bootstrap을
넣지 않습니다. 향후 MCP를 추가하더라도 같은 command schema를 운반하는 transport일
뿐 계산·Pack 규칙을 소유하지 않습니다.

자세한 결정은
[ADR 0006](./adr/0006-core-pack-skill-boundaries.md)과
[호환성 조사](./research/agent-plugin-compatibility.md)를 참고하세요.

## 계산 불변식

1. 한국 음력 입력은 먼저 양력 날짜로 정규화합니다.
2. 벽시각과 IANA zone은 정확히 하나의 UTC 순간으로 해석합니다.
3. gap은 자동 이동하지 않고, fold는 명시적인 `earlier`/`later`가 없으면 거부합니다.
4. 연주는 `instant >= 입춘 순간`일 때 새해에 포함합니다.
5. 월주는 12절 구간을 `[현재 절, 다음 절)`로 판정합니다.
6. 일주·시주에만 민간시 또는 지방 진태양시를 적용합니다.
7. 자시 정책을 적용한 뒤 일주와 시주 천간을 계산합니다.
8. 모든 결과와 동일한 근거를 보고서에 복사합니다.
9. 불확실한 생시는 반열린 구간으로 정규화하고 가짜 대표 시각을 만들지 않습니다.
10. 시간 미상에서는 코어가 시주를 만들지 않고 알려진 삼주 사실만 반환합니다. 이후
    Pack runtime은 삼주로 유효한 finding을 `partial`, 시주가 필수인 규칙을
    `unavailable`로 구분합니다.

## 규칙 공식

- 연주 cycle: `floorMod(sajuYear - 4, 60)`
- 월간: `floorMod(2 × (yearStem mod 5) + monthNumber + 1, 10)`
- 월지: 인월부터 축월까지 순환
- 일주: `floorMod(epochDay + 17, 60)` (`2000-01-07 = 甲子`)
- 시지: `floor((millisecondsOfDay + 1h) mod 24h / 2h)`
- 시간: `floorMod(2 × (effectiveDayStem mod 5) + hourBranch, 10)`

모든 modulo는 음수에서도 0 이상을 돌려주는 Euclidean modulo입니다.

## 데이터와 provider

- 시간대: `MomentZone.offsets/untils`에서 가능한 UTC 후보를 직접 열거합니다.
  `moment.tz(localString)`의 자동 gap/fold 보정은 사용하지 않습니다. 동일한 IANA
  릴리스의 TZif를 직접 파싱한 생성 테이블이 `isdst`와 계절 보정량을 별도로 제공합니다.
- 절기: Astronomy Engine의 `SearchSunLongitude()` 결과를 계산값으로 사용하고 NAOJ
  2024년 12절 fixture와 공개 경계 성질로 검증합니다.
- 음력: 공개 달력 변환은 KASI/data.go.kr 독립 fixture와 지원 범위 전수 왕복을 서로
  다른 gate로 검증합니다.

`ENGINE_MANIFEST`가 계산 패키지·계산 규칙·지원 범위·데이터 계보의 단일 소스입니다.
보고서는 manifest의 동결된 값을 직접 포함하며, 배포 검증은 `package.json` 버전과
manifest 버전의 일치도 검사합니다. 배포 빌드는 현재 Git revision을 주입하고 dirty
빌드에는 `-dirty`를 붙여 실행 코드와 소스 상태를 구분합니다. Tradition Pack의
source/rule/table/helper provenance는 각 Pack manifest가 별도로 소유합니다.

## 변경 규칙

- 공개 요청/보고서 변경은 schema와 package version을 함께 올립니다.
- IANA, 천문, 음력 데이터 변경은 독립 fixture를 자동 덮어쓰지 않고 semantic diff를
  검토합니다.
- 절입 오차 범위 안의 출생은 독립 Time4J/JPL 계열 oracle로 재확인합니다.
- Time4J는 향후 fixture 생성·검증 oracle로 사용하며 TypeScript 런타임에는 결합하지 않습니다.
- 용신·격국·신강/신약·신살·예측 finding을 추가하려면 별도 Tradition Pack
  ID·version·rule/source trace가 필요합니다. Reading runtime은 Pack finding을 근거로
  사용자의 질문을 해설할 수 있지만 그 추론을 코어 값으로 승격하지 않습니다.
- 격국·억부·조후·통관·병약·종격에서 서로 다른 의미로 쓰이는 용신을 하나의 필드로
  합치지 않습니다.
- Pack 충돌과 생시 후보 차이는 평탄화·투표·평균·점수로 숨기지 않습니다.
- Pack-owned rule ID의 출처와 파라미터는 해당 Pack과 runtime registry에 바인딩하며
  caller가 같은 ID로 덮어쓰지 못하게 합니다.
- future ontology adapter는 Pack 밖 comparison seam에 두고 mapping version·provenance와
  unmapped 상태를 보존합니다. 계산 코어나 Pack finding을 수정하지 않습니다.

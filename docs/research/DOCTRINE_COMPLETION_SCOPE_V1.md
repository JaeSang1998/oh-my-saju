# 해석 Skill 완성 범위와 규칙·fixture 매트릭스

> 상태: 구현 착수용 연구 기준서
> 작성일: 2026-07-29
> 대상: Oh My Saju Tradition Packs의 자평 월령·격국, 적천수/삼명통회 왕쇠 증거,
> 궁통보감 조후 Skill
> 범위: 고정한 문헌·판본·프로필에서 결정적으로 재현할 수 있는 결과. 성격, 신살,
> 궁합, 사건·수명·길흉 예측은 범위 밖이다.

## 1. 결론: “완성”의 정확한 뜻

이 패키지에서 정직하게 완성할 수 있는 것은 **역법 코어 위에서, 선택된 문헌 계보의
규칙을 출전·버전·미결 조건과 함께 재현하는 해석 Skill 층**이다. 하나의 합성
`사주 정답`이나 학파 사이의 승자를 만드는 일은 아니다.

각 Skill은 다음 네 상태를 분리해야 한다.

| 축                  | 완성 기준                                                       | 현재 방향                         |
| ------------------- | --------------------------------------------------------------- | --------------------------------- |
| runtime             | 같은 원국·프로필·버전이면 같은 JSON을 반환하고 모든 분기를 시험 | `stable` 가능                     |
| source coverage     | 각 결과 셀/규칙이 고정 전사본과 판면 locator로 연결             | 표와 규칙별로 승격                |
| doctrine coverage   | 그 판본에서 선언한 규칙 범위를 빠짐없이 구현                    | profile version 단위로만 주장     |
| predictive validity | 현실의 성격·사건을 맞춘다는 외부 실증                           | `not-established`, 제품 주장 금지 |

따라서 현행 `experimental`은 런타임 불안정을 뜻하면 안 된다. 완성 후에는
`runtimeMaturity: 'stable'`과 `sourceCoverage`/`doctrineCoverage`를 별도로 내보낸다.
단, 원전의 문장을 임의로 점수·확률·현대적 성공 예측으로 바꾸지 않는 한에서만
그렇게 승격할 수 있다.

## 2. 공통 선행 조건과 경계

모든 해석 Skill은 다음 이미 계산된 사실만 입력으로 받는다.

- 절입으로 확정한 월지와 확정/후보 사주 원국
- 천간의 음양·오행·십신 관계
- 명시적 지장간 **멤버십** 표와 표면 투간 위치
- 합·충·형·해 등의 raw match (합화·작용 판정은 별도 규칙)
- 시주 미상/시간 경계 시 관측된 기둥과 누락된 기둥 목록

지장간 **구성원**과 월중 **사령 일수**는 다르다. 《三命通會》 권2의
`論人元司事`와 `論五行旺相休囚死並寄生十二宮`은 전자를 포함한 계절·인원
자료를 제공하지만, 현행 공개 전사 사이에는 사령 일수 표기가 갈린다. 따라서
멤버십은 profile 정책으로 고정해 쓸 수 있어도, 일수·본기 우선권은 판본을 잠근
별도 profile 없이는 도입하지 않는다. [《三命通會》 권2](https://zh.wikisource.org/zh-hant/%E4%B8%89%E5%91%BD%E9%80%9A%E6%9C%83/%E5%8D%B7%E4%BA%8C)

`HIDDEN_STEMS_V1`의 0.6/0.3/0.1 값은 공통 구조 시각화용 합성 가중치다. 이 값은
어느 고전 Skill의 사령 강도, 투간 강도, 신강 점수에 재사용하면 안 된다.

## 3. 목표 아키텍처

```text
calculation report (확정 원국 또는 후보 원국)
  └─ immutable fact graph
       ├─ common structural facts
       ├─ Ziping skill (월령·격 후보 / 성패 predicate)
       ├─ Ditianshui/Sanming skill (왕쇠 증거 벡터)
       └─ Qiongtong skill (조후 후보 / 조건 predicate)
              └─ AI narration: 위 finding만 설명, 새 규칙·결론 생성 금지
```

Skill 결과의 공통 규칙은 다음과 같다.

1. `profileId`, `version`, `editionLock`, `ruleId`, `sourceLocator`, `fixtureId`를
   결과마다 남긴다.
2. 학파별 `usefulGod`, `strength`, `pattern`의 뜻을 같은 필드로 합치지 않는다.
3. `true | false | indeterminate` 이외의 숨은 기본값을 두지 않는다.
4. 시간 미상은 시주를 만든 결과가 아니라, 관측된 삼주에 대한 `coverage: partial`
   결과다.
5. 어떤 Skill도 다른 Skill의 finding을 전제조건으로 사용하지 않는다. 비교 API는
   공통·상충·범위 차이만 보고하며 다수결을 하지 않는다.

## 4. 자평 월령·격국: 최대 구현 범위

### 4.1 고정해야 하는 텍스트 층

`ziping-shen-base@1`과 `ziping-xu-commentary@1`은 별도 profile이어야 한다.
현재 인용하는 《子平真詮評注》 공개 전사는 본문과 徐樂吾 평주가 함께 있어,
웹 페이지 하나를 단일 저자 규칙으로 취급할 수 없다. 기준은 원문 스캔과 대조한
본문·주석 각각의 excerpt hash, 페이지·절 locator여야 한다. [《子平真詮評注》
「論用神」·「論用神成敗救應」·「論建祿月劫」](https://ctext.org/wiki.pl?chapter=974137&if=gb)

### 4.2 결정적으로 형식화할 수 있는 규칙

| 규칙 단위                 | 입력 사실                      | 출력                              | 구현 상태 목표          | 전수/대표 fixture                   |
| ------------------------- | ------------------------------ | --------------------------------- | ----------------------- | ----------------------------------- |
| 월지 지장간 열거          | 월지, profile membership table | 후보 천간 집합·본기 표기          | 결정적                  | 12지지 전수                         |
| 십신/격 후보              | 일간, 각 월지 후보 천간        | 재·관·살·인·식·상관 등의 후보     | 결정적                  | 10×10 십신 전수 + 12월지            |
| 투간                      | 연·월·시 표면 천간             | 각 후보의 노출 위치               | 결정적                  | year/month/hour 및 시주 미상 최소쌍 |
| 건록/양인 기초 후보       | 일간·월지, 명시된 표           | `basePatternCandidate`            | 결정적 profile table    | 10일간×12월지                       |
| 사령일 기준 후보          | 절기 후 경과·선택된 일수 표    | 현재 사령 후보                    | **판본 잠금 후** 결정적 | 12월 × 경계일 전후                  |
| 성·패·구응 원자 predicate | 원국의 명시 조건               | 충족/불충족/미결 trace            | 각 predicate별 결정적   | 원전 worked example + 부정 최소쌍   |
| 최종 격국 선택            | 위 모든 predicate와 우선순위   | `established` 하나 또는 복수/미결 | profile 완결 시에만     | 원전 예시 + 충돌 fixture            |

이 문헌 계열은 월령에서 격국을 찾고 재·관·인·식과 살·상·겁·양인의 순·역용을
구별하는 출발 규칙을 제공한다. 그러나 그 문장만으로 사령 일수·지장간 우선순위·
회지·투간 다수 후보의 타이브레이커가 정해지는 것은 아니다. 따라서 현행의
`candidate | indeterminate`, `finalPattern: null`은 옳은 중간 표현이다.

### 4.3 구현할 predicate 그래프

프로필이 완전한 산문 해석을 흉내 내지 않도록, `성패구응`은 아래처럼 작은 검증
가능한 노드로만 만든다.

```ts
type DoctrineTruth = true | false | 'indeterminate';

type ZipingPredicate = {
  id: string;
  appliesTo: PatternId;
  kind: 'month-command' | 'transparency' | 'root' | 'relationship' | 'damage' | 'rescue';
  truth: DoctrineTruth;
  factRefs: readonly FactRef[];
  source: SourceRef;
  unresolvedReason?: string;
};
```

우선 구현할 수 있는 predicate는 `month-hidden-stem-visible`, `same-stem-visible`,
`required-stem-absent`, `raw-clash-present`, `raw-combination-present`처럼 관측 사실에
가까운 것들이다. `有根`, `有力`, `太過`, `相戰`, `可用`처럼 임계치나 평가자의
판단을 요구하는 말은 해당 저본이 조작적 정의를 줄 때까지 `indeterminate`로 남긴다.

### 4.4 반드시 별도 profile로 갈라야 하는 변형

- 심효첨 본문과 徐樂吾 평주의 규칙층
- 지장간 멤버십 표와 인원사령 일수 표
- 본기·중기·여기 우선순위 및 회지로 월령을 바꾸는 조건
- 건록·월겁·양인 표 및 그 뒤의 취용 우선순위
- 외격·종격·화격을 인정하는 범위

### 4.5 해서는 안 되는 주장

- 지장간 배열 순서나 60/30/10을 격국 강도·확률로 변환
- 월지 하나로 “정관격 확정” 같은 단일 결론을 반환
- 합·충 raw match만으로 파격 또는 구응을 확정
- 격국 이름을 직업·성격·사회적 성취 예측으로 번역

## 5. 적천수/삼명통회: 왕쇠 **증거**의 최대 구현 범위

### 5.1 문헌 계보를 섞지 않는 방법

《三命通會》 권2의 `旺·相·休·囚·死` 표는 계절 오행과 다섯 상태의 표 규칙이다.
《滴天髓闡微》의 `月令`·`衰旺`·`中和` 및 任鐵樵 주석은 월령 단독 판정을 경계하고
원국 전체의 손익을 보라는 해석 프레임이다. 그러므로 제품 명칭도
`sanming-seasonal-state`와 `ditianshui-strength-evidence`로 나누고, 결합 화면은
`comparison preset`으로만 제공한다. [《三命通會》 권2](https://zh.wikisource.org/zh-hant/%E4%B8%89%E5%91%BD%E9%80%9A%E6%9C%83/%E5%8D%B7%E4%BA%8C),
[《滴天髓闡微》](https://ctext.org/wiki.pl?chapter=826601&if=en)

### 5.2 결정적으로 완성할 수 있는 표와 evidence

| 규칙 단위           | 입력 사실                 | 출력                          | 주의                                | fixture                 |
| ------------------- | ------------------------- | ----------------------------- | ----------------------------------- | ----------------------- |
| 旺相休囚死 25칸     | 계절 주재 오행, 대상 오행 | 왕·상·휴·수·사                | 원전 표를 생극 그래프로만 재현      | 5×5 전수                |
| 월지→계절 주재 오행 | 월지, seasonal policy     | 목·화·토·금·수                | 토 전환 정책은 고전 표 밖의 profile | 12지지 전수 + 정책 차이 |
| 표면 evidence       | 연·월·시 천간             | 인성·비겁·식상·재성·관살 장부 | 일간은 자기 지지 증거가 아님        | 10×10 관계 + 위치       |
| 지장간 evidence     | 지지, membership table    | 같은 다섯 장부                | membership table version을 명시     | 12지지·시주 미상        |
| raw 관계 영향       | 합충형파해 raw match      | 영향 가능성 trace             | 변환·상쇄는 확정하지 않음           | 각 관계 + 부정 사례     |
| 누락 시주 영향      | 삼주/가능 시주 집합       | 공통·가변 evidence            | 정오 대입 금지                      | 미상/오전/자시 경계     |

원전 표는 봄·여름·6월·가을·겨울마다 왕상휴수사를 열거하므로, 표 자체의 25칸은
완전 전수 테스트가 가능하다. 다만 현행 `four-season-endings`(辰戌丑未 모두 토)
정책은 그 표의 `六月土旺`을 넓힌 convention이다. 이 정책은
`sanming-seasonal/four-season-endings@1`으로 명시해야 하며, 원문이 직접 증명한
유일한 기본값처럼 표시하면 안 된다.

### 5.3 최종 신강·신약 라벨을 미루는 이유

다음은 코드로 관측할 수 있지만, 이들 사이의 보편 가중치·임계치·우선순위는
선택한 저본만으로 충분히 명세되지 않는다.

- 득령/실령, 통근과 잔근, 투간
- 생조·동류와 설기·재·관살
- 합화가 실제 성립했는지, 묘고와 여기의 실제 세기
- 극왕·극쇠 및 종격 신호

따라서 최대 완성 결과는 `StrengthEvidenceVector`와 모순 목록이다. 별도 규칙표와
golden fixture 없이 `신강`, `신약`, `72점`, `용신`으로 승격하지 않는다. 이는 구현을
회피하는 것이 아니라, 텍스트가 직접 제공하는 계절표와 텍스트가 요구하는 전체
원국 검토를 각각 정확히 보존하는 설계다.

## 6. 궁통보감 10×12 조후: 최대 구현 범위

### 6.1 기준 판본과 셀의 단위

`qiongtong-baojian/<edition>@1`은 한 기준판만 고정한다. 현재 패키지의 출발점은
고정 [Wikisource oldid 2294674](https://zh.wikisource.org/w/index.php?oldid=2294674&title=%E7%A9%B7%E9%80%9A%E5%AE%9D%E9%89%B4)와
[1937년 《窮通寶鑑評註》 스캔](https://commons.wikimedia.org/wiki/File:NLC416-12jh004238-48608_%E7%AA%AE%E9%80%9A%E5%AF%B6%E9%91%91%E8%A9%95%E8%A8%BB.pdf)이다.
각 셀은 `일간 × 절기월지`이고, 음력월이나 실제 현대 기상·위도는 입력이 아니다.

120셀 전체를 stable runtime 데이터로 완성할 수 있다. 단, 다음 audit을 통과한
의미에서만 `sourceCoverage: 'edition-located'` 또는 `'edition-audited'`로 승격한다.

1. 각 셀의 후보 순서·공동 우선·조건문을 고정 전사본과 스캔의 page/line locator에
   연결한다.
2. 각 excerpt에 해시를 남겨 이후 전사 변경을 검출한다.
3. 원전이 직접 말한 기능만 태그한다. 원소 상징에서 기능을 추론하지 않는다.
4. 후보가 원국의 표면·지장간에 있는지 **관측**하고, 존재만으로 조건 충족이나
   최종 용신을 선언하지 않는다.

### 6.2 셀 스키마와 조건의 세 단계

```ts
type ClimateCondition = {
  id: string;
  sourceExcerptHash: string;
  class: 'observable' | 'convention-dependent' | 'semantic';
  evaluation: true | false | 'indeterminate';
  factRefs: readonly FactRef[];
};

type ClimateCell = {
  dayStem: HeavenlyStem;
  solarMonthBranch: EarthlyBranch;
  candidates: readonly {
    stem: HeavenlyStem;
    priority: 'primary' | 'co-primary' | 'secondary' | 'conditional';
    function: ClimateFunctionTag | null;
    conditions: readonly ClimateCondition[];
  }[];
  edition: EditionLock;
};
```

| 조건 종류            | 예                                                  | 처리                                           |
| -------------------- | --------------------------------------------------- | ---------------------------------------------- |
| observable           | 표면 투간, 특정 글자 유무, 동일 글자 개수           | profile의 위치 정책을 선언해 true/false        |
| convention-dependent | 지장간도 `有`로 볼지, `多`의 임계값, 합화 후 유효성 | policy ID 없으면 `indeterminate`               |
| semantic             | `有力`, `太過`, `可用`, 재관·질병·부귀의 산문 판단  | predicate로 만들지 않거나 항상 `indeterminate` |

이 구분은 120셀의 후보 전사를 완성하면서도, 산문에 없는 수치 규칙을 몰래 발명하지
않게 한다.

### 6.3 전수와 대표 fixture 매트릭스

| fixture 군        | 수량/목표               | 검증 대상                                                  |
| ----------------- | ----------------------- | ---------------------------------------------------------- |
| 셀 존재·키·동결   | 120                     | 10일간×12월지가 정확히 한 번, 후보 중복 없음               |
| 전사·판면 audit   | 120                     | 후보 배열, 우선 묶음, locator, excerpt hash, edition hash  |
| explicit function | 모든 비-null 태그       | 문구가 그 후보에 기능을 직접 연결하는지                    |
| 조건 parser       | 조건 문장 종류별 최소쌍 | observable true/false/미상, convention 의존, semantic 보류 |
| 현재 curated 회귀 | 7셀                     | 甲辰, 甲巳, 乙寅, 庚寅, 己巳/午/未의 순서·공동 우선·기능   |
| presence          | 120×후보 위치           | 표면/지장간 presence와 조건 충족을 혼동하지 않음           |
| 판본 차이         | 발견된 셀마다           | edition A와 B는 별도 table/profile, overwrite 금지         |

현재 `QIONGTONG_CLIMATE_CANDIDATES_V1`은 120개 배열을 제공하지만 7개 셀만
source-checked metadata를 갖는다. 나머지 113개는 데이터 구조가 완전할 뿐 출전 audit이
완전한 것이 아니다. 다음 구현 단계는 **후보 배열을 다시 발명하는 것**이 아니라,
기존 120 셀 각각에 `ClimateCellSource`와 fixture를 붙이는 일이다.

### 6.4 끝까지 하지 않는 것

- 조후 후보를 격국용신·억부용신에 병합하거나 학파 투표로 하나를 고르기
- 부귀·과거·질병·수명·혼인 문장을 현대 사건 예측으로 출력
- 한국의 실제 기후·남반구 계절을 전통 절기월 profile에 암묵 반영
- 후보가 존재하면 자동으로 “좋다”, 부재하면 “나쁘다”라고 출력

## 7. 추천 릴리스 경계

| profile                         | v1 stable runtime으로 완성 가능한 약속              | 공개 금지 결론             |
| ------------------------------- | --------------------------------------------------- | -------------------------- |
| `ziping-shen-base@1`            | 월령·투간·격 후보와 출전 predicate trace, 미결 이유 | 모든 명식의 최종 격국·용신 |
| `sanming-seasonal/<policy>@1`   | 25칸 계절표, 월지 정책, five-role ledger            | 신강/신약 점수·단일 용신   |
| `ditianshui-evidence/<layer>@1` | 원국 전체 증거·모순·종격 신호 후보                  | 전통 강약의 단일 확정      |
| `qiongtong-baojian/<edition>@1` | 120셀 후보·조건·locator·presence                    | 최종 조후용신·사건/길흉    |

이 상태에서는 Skill들이 “실행 가능한 규칙팩”으로 완성된다. 이후 어떤 판정을
추가하더라도 기존 결과의 뜻을 바꾸지 않도록 새 `profileId@version`으로 추가한다.

## 8. 구현 순서와 완료 게이트

1. **메타데이터 분리**: `runtimeMaturity`, `sourceCoverage`, `doctrineCoverage`,
   `predictiveValidity`를 profile에 추가한다. `experimental` 하나로 품질을 뭉개지 않는다.
2. **출전 lock 도구**: edition URL/revision, scan file hash, page·line locator, excerpt
   hash의 schema와 검증기를 만든다.
3. **Ziping**: 본문 profile의 후보/투간/기초예외를 stable로 하고, 성패구응은
   predicate registry와 원전 worked fixture부터 늘린다.
4. **Sanming/Ditianshui**: 계절표 profile과 evidence profile을 분리하고, 25칸·12월
   정책·장부·미상 시주를 전수 시험한다.
5. **Qiongtong**: 120셀 audit manifest와 source fixture를 완성한다. 조건은
   observable부터 세 값 논리로 평가한다.
6. **AI boundary**: AI 입력은 profile finding과 허용 source excerpt ID만 받게 하고,
   최종 용신·강약·사건을 새로 발명하면 schema validation에서 거부한다.

완료 게이트는 다음이다.

- 모든 런타임 finding이 선언된 rule/source/edition lock으로 역추적된다.
- 표 규칙은 전수 fixture, predicate는 긍정·부정·미상 fixture를 가진다.
- 시간 미상·절입/시진 경계에서 임의 시주를 생성하지 않는다.
- 판본 차이는 overwrite가 아니라 다른 profile/version 결과로 나타난다.
- 패키지 사용자가 같은 입력·버전에서 동일 JSON과 동일 rule trace를 재현한다.

## 9. 이 문서가 보장하지 않는 것

이 계획은 고전 텍스트의 특정 계보를 더 정확히 전사·형식화하는 계획이다. 고전의
문헌적 존재, 코드의 결정성, 사용자에게 읽기 쉬운 AI 해설은 현실의 성격·사건·건강·
수명·재산을 예측한다는 실증 보증이 아니다. 그러한 주장은 이 패키지의 API, 마케팅,
AI 출력에서 하지 않는다.

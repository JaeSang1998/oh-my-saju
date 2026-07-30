# 출생시각 미상·근사·범위 입력 조사와 권고안

- 조사일: 2026-07-26
- 범위: 한국 사주/만세력의 공개 UX, 출생시각 품질을 다루는 공식 점성술 서비스,
  시간 구간·결측·출처·프라이버시 관련 공식 표준
- 목적: `saju-engine`이 출생시각을 임의로 보정하지 않고, 계산 가능한 모든 원국과
  그 근거를 재현 가능하게 반환할 수 있는 API/UX 모델을 제안

## 결론

권장 원칙은 다음 한 문장으로 요약할 수 있다.

> 알 수 없는 출생시각을 정오 같은 가짜 시각으로 채우지 말고, 사용자가 실제로 아는
> 범위를 명시적인 시간 구간으로 정규화한 뒤 그 구간에서 가능한 원국을 경계별로
> 계산·중복 제거하고, 공통으로 유지되는 기둥과 달라지는 기둥을 분리해 보여준다.

여기서 중요한 예외가 하나 있다. “시간 모름이면 무조건 삼주”라고 단정하면 안 된다.
일반적인 날과 `civilMidnight` 정책에서는 연주·월주·일주가 하루 동안 유지되므로 삼주를
안전하게 보여줄 수 있다. 그러나 다음 경우에는 시주뿐 아니라 다른 기둥도 후보가 된다.

- 입력 날짜 안에 입춘 또는 월 경계인 절입 순간이 있으면 연주나 월주가 달라질 수 있다.
- 23:00–23:59를 포함하고 `ziStart` 또는 `splitZi`를 비교하면 일주 또는 시주 천간이
  달라질 수 있다.
- 지방 진태양시를 적용해 보정된 시각이 날짜나 시진 경계를 넘으면 일주·시주가 달라질
  수 있다.
- 역사적 시간대 전환의 gap/fold에 걸리면 같은 벽시각이 존재하지 않거나 두 UTC 순간에
  대응할 수 있다.

따라서 출력의 중심은 고정된 “삼주/사주” 슬롯이 아니라 `stablePillars`와
`candidates`여야 한다.

## 1. 공식 서비스와 구현체에서 확인된 UX

### 1.1 한국 사주/만세력

[포스텔러 만세력 2.2의 공식 프로필 입력 화면](https://pro.forceteller.com/profile/edit)은
정확한 생년월일시 입력과 별도로 `시간 모름`을 제공하고, `야자시/조자시` 선택과 도시
입력도 같은 화면에 둔다. 이는 한국 사용자가 출생시각 미상과 자시 관법 차이를 실제
입력 문제로 만난다는 강한 제품 근거다.

[올바른사주의 공식 상담 신청 화면](https://www.rightsaju.org/)도 출생시간 옆에
`시간 모름`을 독립 선택지로 제공한다. 즉, 출생시각을 필수 숫자 필드로 강제하지 않는
UX는 실제 한국 사주 서비스에서 이미 사용된다.

다만 두 서비스의 공개 페이지는 `시간 모름`을 선택한 뒤 내부에서 정오를 쓰는지, 시주를
생략하는지, 여러 후보를 비교하는지까지 규정하지 않는다. 공개되지 않은 내부 동작을
`saju-engine`의 계산 규칙 근거로 삼아서는 안 된다.

[6tail Tyme 공식 문서의 EightChar 항목](https://6tail.cn/tyme.html)은 23:00–23:59의
일간을 다음 날로 보는 방식을 기본으로 하되, 어떤 유파는 당일로 본다고 설명하고
`EightCharProvider`로 정책을 교체할 수 있게 한다. 같은 문서는 23:00–23:59와
00:00–00:59가 모두 자시이므로 한 민간일에 시진 구간이 13개로 나타난다고 명시한다.
[6tail의 간지 공식 문서](https://6tail.cn/calendar/lunar.ganzhi.html)는 늦은 자시의
일주를 다음 날로 보는 계산과 당일로 보는 계산을 각각 별도 API로 노출한다.

이 근거는 “23시는 하나의 숨은 정답으로 고정”하는 것보다, 정책 ID를 입력과 결과에
보존하고 필요하면 정책별 결과를 비교하는 편이 맞다는 것을 보여준다. 다만 6tail은 중국
역법 구현체이므로 한국 사주의 유일한 정본이 아니라, 관법 복수성을 명시적으로 모델링한
구현 사례로만 사용한다.

### 1.2 서양 점성술의 ‘시간 미상’ 처리에서 가져올 수 있는 원칙

[Astrodienst의 공식 출생시각 FAQ](https://www.astro.com/faq/fq_de_time_e.htm)는
`unknown`을 선택하면 내부 계산용으로 가상의 12:00를 사용하지만, 시간에 의존하는
하우스는 만들지 않는다. 다른 가상 시각을 넣는 경우에도 결과에 `hyp`를 표시한다.
같은 FAQ는 신뢰할 만한 출생시각 보정(rectification) 방법을 알지 못하므로 해당 서비스를
제공하지 않는다고 밝힌다.

이 사례에서 가져올 것은 “정오를 사용한다”가 아니라 다음 두 원칙이다.

1. 내부 계산 편의를 위한 대표 시각을 실제 출생시각처럼 노출하지 않는다.
2. 시각이 없으면 시각 의존 결과를 제거하거나 후보로 표시한다.

서양 점성술의 하우스·상승점은 사주의 시주와 계산 구조가 다르므로, Astrodienst의 정오
관행을 사주에 그대로 이식하면 안 된다. `saju-engine`은 이미 정확한 경계 계산이 가능하므로
대표 시각 없이 범위 전체를 계산하는 편이 더 안전하다.

### 1.3 출생시각 보정과 사주 계산은 분리

[Astro-Databank의 공식 Rodden Rating 설명](https://www.astro.com/astro-databank/Help%3ARR)은
출생기록, 본인·가족 기억, 출처 없음, 상충 자료, 시간 없음, 추정값을 서로 다른 데이터
품질로 분류한다. 특히 rectification 결과는 합의된 검증 방법이 없으므로 `Caution`으로
취급한다. [공식 데이터 수집 지침](https://www.astro.com/astro-databank/Astro-Databank%3AData_collecting)은
출생 데이터의 원출처와 단순 참고문헌을 구분하고, 데이터와 함께 출처 메모를 보존할 것을
권고한다.

Rodden Rating 자체는 서양 점성술 데이터베이스의 체계이므로 그대로 복제할 필요는 없다.
그러나 다음 방법론은 사주에도 유효하다.

- 값의 표기 정밀도와 그 값을 믿을 근거를 분리한다.
- 상충하는 시각을 하나로 임의 병합하지 않는다.
- 출생기록, 가족 기억, 본인 기억, 2차 자료, 출처 미상을 구분한다.
- 사건 이력으로 시각을 역산한 결과를 확정된 출생시각으로 승격하지 않는다.

따라서 사건 기반 자동 출생시각 보정은 이 기능의 범위에 넣지 않는다. 사용자가 외부에서
보정된 시각을 가져온다면 `source: 'rectified'`로 표시하고 일반 기록 시각과 구분해야 한다.

## 2. 시간 불확실성 표현에 적용할 공식 표준

### 2.1 한 시점과 범위를 구분

[RFC 3339](https://datatracker.ietf.org/doc/html/rfc3339#section-5.6)는 완전한 날짜,
시각, UTC offset으로 하나의 timestamp를 표현한다. `-00:00` 또는 `Z`의 “unknown”은
UTC 순간은 알지만 현지 offset을 모른다는 뜻이지, 출생 시각 자체를 모른다는 뜻이 아니다.
이 의미는 [RFC 9557 §2](https://datatracker.ietf.org/doc/html/rfc9557#section-2)에서도
정리되어 있다. 따라서 `1990-01-01T12:00:00+09:00`이나 `-00:00`을 “시간 모름”의
직렬화로 사용하면 안 된다.

[FHIR R5의 `dateTime` 타입](https://hl7.org/fhir/R5/datatypes.html)은 연, 연월,
날짜처럼 낮은 정밀도를 허용하지만, 시·분을 넣으면 timezone offset을 요구한다.
날짜만 알고 시각을 모르는 경우 날짜 값과 시간 결측 상태를 분리하는 설계의 좋은 근거다.

[FHIR R5의 `Period` 타입](https://hl7.org/fhir/R5/datatypes.html#Period)은 시작과
끝으로 시간 범위를 표현하며, 문맥에 따라 범위 전체가 적용되거나 그 범위 안의 값 하나가
해당할 수 있음을 명시한다. `saju-engine`의 “오전 중 어느 한 순간에 태어남”은 후자다.
구현에서는 경계 중복을 피하기 위해 `[start, end)` 반열린 구간을 사용하되, 이는
`saju-engine`의 명시적 계약으로 문서화한다.

[Library of Congress EDTF 명세](https://www.loc.gov/standards/datetime/)는 uncertain,
approximate, unspecified, interval, one-of-a-set을 서로 다른 개념으로 구분한다.
EDTF 문자열을 공개 API에 그대로 사용할 필요는 없지만, “대략”, “모름”, “가능한 값
목록”, “범위”를 하나의 nullable timestamp로 뭉개지 않아야 한다는 모델링 근거가 된다.

### 2.2 결측 이유

[HL7 DataAbsentReason](https://terminology.hl7.org/7.0.0/CodeSystem-data-absent-reason.html)은
단순 `unknown` 외에도 `asked-unknown`, `not-asked`, `asked-declined`, `masked` 등을
구분한다. 제품 UX에서 이 차이는 실제로 유용하다.

- `not-asked`: 온보딩을 이어가며 나중에 물을 수 있다.
- `asked-unknown`: 같은 질문을 반복하지 않고 시간 미상 결과를 계산한다.
- `asked-declined`: 사용자의 선택을 존중하고 재요구하지 않는다.
- `masked`: 공유·내보내기 시 시각을 숨겼다는 사실을 보존한다.

### 2.3 시간대 gap/fold

[RFC 9557 §3.4](https://datatracker.ietf.org/doc/html/rfc9557#section-3.4)는 IANA
시간대에서 현지 시각이 시간대 전환 때문에 모호하거나 존재하지 않을 수 있음을 다룬다.
시간 범위를 UTC로 바꿀 때도 각 벽시각 후보에 기존 `saju-engine`의 gap/fold 검증을
적용해야 한다. 범위 입력이라는 이유로 gap을 다음 유효 시각으로 밀거나 fold의 한쪽을
몰래 선택해서는 안 된다.

## 3. 권장 사용자 입력 모델

현재의 정확 시각용 `calculateSaju()`는 그대로 유지하고, 불확실 시각 전용 façade를
추가하는 편이 하위 호환성과 타입 명확성에 유리하다.

```ts
type BirthTimeSource =
  | 'official-birth-record'
  | 'medical-record'
  | 'family-record'
  | 'self-memory'
  | 'family-memory'
  | 'secondary-source'
  | 'rectified'
  | 'unknown';

interface BirthTimeEvidence {
  readonly source: BirthTimeSource;
  /** 사용자가 실제로 본 문구. 저장은 명시적으로 동의한 경우에만 한다. */
  readonly originalText?: string;
  /** 서로 충돌하는 자료가 있는지 별도로 표시한다. */
  readonly conflict?: 'none' | 'multiple-sources';
}

type BirthTimeKnowledge =
  | {
      readonly kind: 'exact';
      readonly localDateTime: string;
      readonly precision: 'second' | 'minute' | 'five-minutes' | 'hour';
      readonly evidence?: BirthTimeEvidence;
    }
  | {
      readonly kind: 'approximate';
      readonly centerLocalDateTime: string;
      readonly toleranceMinutes: number;
      readonly evidence?: BirthTimeEvidence;
    }
  | {
      readonly kind: 'range';
      readonly startLocalDateTime: string;
      readonly endLocalDateTimeExclusive: string;
      readonly evidence?: BirthTimeEvidence;
    }
  | {
      readonly kind: 'day-period';
      readonly date: string;
      readonly period: 'am' | 'pm';
      readonly evidence?: BirthTimeEvidence;
    }
  | {
      readonly kind: 'unknown';
      readonly date: string;
      readonly reason: 'asked-unknown' | 'not-asked' | 'asked-declined' | 'masked';
      readonly evidence?: BirthTimeEvidence;
    };
```

`localDateTime`을 넣는 이유는 “23시 전후” 범위가 자정을 넘을 수 있기 때문이다. 날짜를
별도 고정한 채 `22:30–00:30` 같은 time-only 구간을 받으면 어느 날짜의 00:30인지
모호해진다.

### 3.1 각 입력을 계산 범위로 정규화

| 사용자가 아는 것       | 정규화되는 현지 벽시각 범위                  |
| ---------------------- | -------------------------------------------- |
| 정확한 09:10           | 그 정밀도에 맞는 한 시점 또는 기록 단위 구간 |
| 대략 23시, ±30분       | 중심 시각 기준 `[22:30, 23:30)`              |
| 22시부터 자정 전       | 명시된 `[22:00, 다음 날 00:00)`              |
| 오전                   | `[00:00, 12:00)`                             |
| 오후                   | `[12:00, 다음 날 00:00)`                     |
| 시간 모름, 날짜는 확실 | `[해당 날짜 00:00, 다음 날 00:00)`           |

오전/오후의 경계는 UI에 “오전 00:00–11:59, 오후 12:00–23:59”라고 표시한다.
“대략 23시”에는 숨은 기본 오차를 두지 말고 `10분 / 30분 / 1시간 / 직접 입력`처럼
사용자가 기억 범위를 선택하게 한다. 기본값이 필요하다면 선택 화면에 명시하고 결과
provenance에 그대로 남긴다.

정확한 날짜는 확실하지만 근사 시각 범위가 날짜 밖으로 넘어가면 다음을 다시 확인해야 한다.

> 출생 날짜도 경계 양쪽일 수 있나요, 아니면 날짜는 기록으로 확실한가요?

날짜가 확실하면 범위를 그 날짜와 교집합하고, 날짜도 불확실하면 날짜까지 포함한 완전한
범위를 유지한다. 이를 자동으로 추측하지 않는다.

### 3.2 정밀도와 출처 신뢰도를 분리

다음 두 입력은 같은 것이 아니다.

- “병원 기록에 09:00라고 적혀 있음”: 시간 단위로 반올림됐을 수 있지만 출처는 기록이다.
- “가족이 정확히 09:00라고 기억함”: 분 단위 문자열이지만 출처는 기억이다.

따라서 `precision`과 `evidence.source`를 별도 필드로 둔다. `정확도 85%` 같은 숫자는
확률 모델과 검증 데이터가 없는 한 만들지 않는다. 후보의 유효 시간 길이도 확률이 아니다.

[FHIR Provenance](https://hl7.org/fhir/provenance.html)와
[W3C PROV-O](https://www.w3.org/TR/prov-o/)는 결과가 어떤 원자료와 활동에서
생성·파생됐는지를 기록하는 모델을 제공한다. 이를 가볍게 적용해 원문, 정규화된 범위,
시간대 데이터 버전, 사주 규칙 버전, 계산 시각을 결과에 남긴다.

## 4. 권장 계산 방법

### 4.1 샘플링이 아니라 경계 분할

1분 간격으로 하루를 샘플링하면 절입 순간, millisecond 경계, 역사적 offset 전환을
놓칠 수 있다. 입력 구간을 다음 경계에서 정확히 분할해야 한다.

1. 입력 구간의 시작과 끝
2. IANA 시간대의 offset 전환, gap, fold
3. 입춘과 12절의 정확한 순간
4. 민간시 또는 지방 진태양시에서의 시진 경계
5. 자정과 23:00 자시 정책 경계
6. 천문 소스의 명시된 불확실성 구간

각 분할 구간은 내부 상태가 바뀌지 않는 반열린 구간이 된다. 각 구간의 시작 순간에 현재
`calculateSaju()`를 적용하고, 경계의 inclusive 규칙을 그대로 사용한다. 지방
진태양시는 민간시의 홀수 시각을 단순 복사하지 말고 보정된 시계가 시진 경계에 도달하는
UTC 순간을 찾아 분할해야 한다.

### 4.2 후보 중복 제거

후보 키는 표시 문자열이 아니라 네 기둥의 60갑자 cycle index로 만든다.

```ts
const candidateKey =
  `${year.cycleIndex}/${month.cycleIndex}/` + `${day.cycleIndex}/${hour.cycleIndex}`;
```

같은 원국이 떨어진 여러 시간 구간이나 여러 자시 정책에서 나오면 후보를 복제하지 않고
다음 정보를 한 후보에 합친다.

- `supportingRanges`: 이 원국이 성립하는 모든 현지/UTC 구간
- `ziHourPolicies`: 이 원국을 만든 정책 목록
- `disambiguations`: 역사적 fold에서의 `earlier`/`later`
- `supportDurationMilliseconds`: 정책별 중복을 제거한 실제 UTC 구간의 합집합 길이

`supportDurationMilliseconds`는 후보 가능성의 확률이 아니라, 입력 범위 중 그 결과를
만드는 시간 길이일 뿐임을 명시한다.

### 4.3 불변 기둥 계산

모든 후보에서 cycle index가 같은 위치만 `stablePillars`에 넣는다.

```ts
interface StablePillars {
  readonly year?: PillarReport;
  readonly month?: PillarReport;
  readonly day?: PillarReport;
  readonly hour?: PillarReport;
}
```

이를 통해 다음 결과를 정확히 표현할 수 있다.

- 일반적인 시간 미상 날짜: 연·월·일은 `stable`, 시주는 후보
- 입춘 당일 시간 미상: 월·일은 `stable`, 연주는 둘 이상의 후보일 수 있음
- 절입 당일 시간 미상: 연·일은 `stable`, 월주는 후보
- 23시 전후와 자시 정책 비교: 일주·시주가 정책별 후보
- 구간 전체가 우연히 한 시진 안에 있음: 시주까지 `stable`

### 4.4 제안 출력 타입

```ts
interface SajuPossibilityReport {
  readonly schemaVersion: string;
  readonly mode: 'determinate' | 'indeterminate';
  readonly normalizedInput: {
    readonly localStart: string;
    readonly localEndExclusive: string;
    readonly timeZone: string;
    readonly knowledge: BirthTimeKnowledge;
  };
  readonly stablePillars: StablePillars;
  readonly candidates: readonly {
    readonly key: string;
    readonly pillars: {
      readonly year: PillarReport;
      readonly month: PillarReport;
      readonly day: PillarReport;
      readonly hour: PillarReport;
    };
    readonly supportingRanges: readonly {
      readonly localStart: string;
      readonly localEndExclusive: string;
      readonly instantStartUtc: string;
      readonly instantEndExclusiveUtc: string;
      readonly offsetSeconds: number;
    }[];
    readonly ziHourPolicies: readonly ZiHourPolicy[];
    readonly supportDurationMilliseconds: number;
  }[];
  readonly crossedBoundaries: readonly {
    readonly kind:
      | 'lichun'
      | 'jie'
      | 'hour-branch'
      | 'civil-midnight'
      | 'zi-start'
      | 'time-zone-transition';
    readonly instantUtc: string;
    readonly localDateTime: string;
    readonly affectedPillars: readonly ('year' | 'month' | 'day' | 'hour')[];
  }[];
  readonly provenance: {
    readonly inputEvidence?: BirthTimeEvidence;
    readonly ruleset: string;
    readonly timeZoneDataset: string;
    readonly solarTermEngine: string;
    readonly generatedAt: string;
  };
  readonly warnings: readonly {
    readonly code: string;
    readonly message: string;
  }[];
}
```

정확한 시각도 새 façade에 넣을 수 있지만, 후보가 하나이면 기존 `SajuReport`와 동일한
내용을 `determinate`로 반환한다. 이 방식이면 기존 `calculateSaju()`의 간단한 계약을
깨지 않는다.

## 5. 권장 UX

### 5.1 입력

출생시각 질문을 빈 텍스트 필드 하나로 두지 않고 다음 네 선택지로 시작한다.

1. `정확한 시간을 알아요`
2. `대략적인 시간이나 범위만 알아요`
3. `오전/오후만 알아요`
4. `전혀 몰라요`

정확 시각에는 선택적으로 “어디에서 확인했나요?”를 물어
`출생·병원 기록 / 가족 기록 / 본인 기억 / 가족 기억 / 기타`를 저장한다. 이 질문은
계산을 막는 필수값이 아니라 결과의 근거를 설명하기 위한 선택값이다.

근사 시각에는 중심 시각과 오차를 함께 받는다.

```text
기억하는 시각  [23:00]
얼마나 차이 날 수 있나요?  [10분] [30분] [1시간] [직접 입력]
```

시간 미상 선택 시에는 다음 문구가 적절하다.

> 임의로 정오를 넣지 않습니다. 해당 날짜에서 공통으로 유지되는 기둥과 가능한 시주
> 후보를 계산합니다. 절입·자시 경계일에는 연주·월주·일주도 후보가 될 수 있습니다.

### 5.2 결과

결과 화면의 우선순위는 다음과 같다.

1. **시간 범위 전체에서 변하지 않는 결과**
2. **가능한 원국 수와 달라지는 기둥**
3. **어떤 시각·정책에서 왜 바뀌는지 보여주는 경계 타임라인**
4. **출생시각 출처와 적용 규칙**

후보마다 전체 해설을 반복하지 않고, 공통 부분은 한 번만 보여주고 차이만 강조한다.
예를 들어 오전 입력에서 연·월·일이 동일하고 시주만 7종이면 “삼주는 공통, 시주는
7개 후보”로 요약한다.

23:00을 포함하는 범위에서는 정책 탭을 제공한다.

```text
[민간 자정] [23시 일교체] [분리 자시] [세 정책 비교]
```

`세 정책 비교`가 기본 추천이며, 하나를 선택하면 그 선택이 전통적 진리라서가 아니라
서비스의 계산 규칙이라는 점을 표시한다. 포스텔러와 6tail의 공식 UI/문서가 자시 관법을
명시적 선택으로 다루는 것도 이 방향을 뒷받침한다.

### 5.3 경계 경고

다음 경고는 단순 “정확도가 낮습니다”보다 행동 가능해야 한다.

- `22:58–23:04 범위가 23:00 자시 경계를 지납니다.`
- `출생 범위 안에 2024-02-04 17:27:08 KST 입춘이 있어 연주 후보가 2개입니다.`
- `진태양시 보정 후 06:58–07:06이 되어 묘시/진시 후보가 모두 가능합니다.`
- `해당 역사적 벽시각은 두 UTC 순간에 대응합니다. 기록된 offset이 있으면 입력하세요.`

경계까지의 거리, 사용한 시간대, 절입 순간, 규칙 ID를 함께 보여주면 사용자가 가족이나
기록을 다시 확인했을 때 후보를 실제로 줄일 수 있다.

## 6. 프라이버시

생년월일과 출생지는 다른 정보와 결합될 때 개인을 식별하는 데 쓰일 수 있다.
[NIST의 PII 정의](https://csrc.nist.gov/glossary/term/personally_identifiable_information)는
생년월일과 출생지를 결합 가능한 식별 정보의 예로 든다. 한국
[개인정보 보호법 제16조](https://www.law.go.kr/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1029335669)도
목적에 필요한 최소한의 개인정보만 수집하도록 한다.

따라서 다음을 권장한다.

- 사주 원국 계산에 필요하지 않은 실명, 성별, 전화번호, 계정 가입을 요구하지 않는다.
- 한국 출생을 사용자가 확인하면 민간시 계산에는 `Asia/Seoul`만 받고 도시·GPS를 받지
  않는다.
- 지방 진태양시를 선택할 때만 경도를 받고, 위도는 요구하지 않는다.
- 도시 검색으로 얻은 원본 위치는 timezone/경도로 변환한 뒤 필요가 없으면 폐기한다.
- 서버 저장은 opt-in으로 하고, 기본은 요청 처리 후 폐기 또는 기기 내부 저장으로 한다.
- 저장된 프로필은 사용자가 조회·수정·삭제할 수 있어야 한다.
- 진단 로그에는 원문 출생시각·도시를 남기지 않고 범주화된 오류 코드만 남긴다.

[W3C Privacy Principles](https://www.w3.org/TR/privacy-principles/#data-minimization)은
모든 개인 데이터에 최소 수집 원칙을 적용하며,
[W3C Geolocation의 프라이버시 지침](https://www.w3.org/TR/geolocation/#privacy)은
필요할 때만 위치를 요청하고 목적이 끝나면 폐기하며, 저장 시 수정·삭제 통제를 제공할
것을 권고한다.

실제 제품 선례로, [SAJU 앱의 공식 App Store 설명](https://apps.apple.com/kr/app/%EC%82%AC%EC%A3%BC-%EC%9A%B4%EC%84%B8-%EC%A0%95%ED%86%B5%EC%82%AC%EC%A3%BC-%ED%83%80%EB%A1%9C-%EC%97%B0%EC%95%A0%EC%9A%B4-%EC%98%A4%EB%8A%98%EC%9D%98%EC%9A%B4%EC%84%B8/id366187378)은
회원가입과 서버 저장 없이 기기 내부에만 정보를 저장한다고 명시한다. 이는 규범은
아니지만 한국 사주 서비스에서도 local-first UX가 현실적으로 가능하다는 사례다.

## 7. 구현 우선순위

### 1단계: 실용 MVP

- 새 `calculateSajuPossibilities()` façade
- `exact`, `am/pm`, `range`, `unknown`
- `Asia/Seoul` 민간시
- `civilMidnight`, `ziStart`, `splitZi` 비교
- 후보 중복 제거와 `stablePillars`
- 경계 타임라인과 입력 provenance

### 2단계: 근사·역사 입력

- 중심 시각 + 허용 오차
- 역사적 gap/fold의 다중 후보
- 상충하는 복수 출처
- 날짜까지 불확실한 범위
- 원문 보존 opt-in

### 3단계: 지방 진태양시

- 경도 기반 시진 경계 역산
- 주요 한국 도시 프리셋
- 민간시/진태양시 비교
- 위치 최소 수집과 즉시 폐기

사건 예측으로 출생시각을 역산하는 rectification은 어느 단계에도 포함하지 않는다.

## 8. 필수 테스트 유즈케이스

### 입력 정규화

- `am` → `[00:00, 12:00)`, `pm` → `[12:00, 다음 날 00:00)`
- 시간 미상 → 정확히 24시간 벽시각 범위
- 23:00 ± 30분 → 날짜를 포함한 `[22:30, 23:30)`
- 자정을 넘는 근사 범위에서 날짜 확실/불확실 분기
- `asked-unknown`, `not-asked`, `asked-declined`, `masked` 보존

### 후보와 불변값

- 일반 날짜, 시간 미상, `civilMidnight`: 연·월·일 `stable`
- 입춘 순간이 포함된 날짜: 연주 후보 2개
- 12절 순간이 포함된 날짜: 월주 후보 2개
- 시진 경계 전후 1 ms
- 23:00 전후와 세 자시 정책
- 동일 원국이 떨어진 구간에서 나올 때 후보 1개로 병합
- 후보 순서가 입력 순회·호스트 timezone에 의존하지 않음
- `supportDurationMilliseconds` 합이 유효 입력 구간과 일치

### 시간대

- 한국의 1948–1960, 1987–1988 DST 전환 구간
- gap 안의 벽시각은 자동 이동하지 않음
- fold의 두 UTC 순간을 모두 보존
- 기록된 `expectedOffsetSeconds`로 후보를 줄이는 사례
- 해외 출생에서 `Asia/Seoul`을 자동 적용하지 않음

### 진태양시

- 민간시로는 한 시진, 진태양시로는 두 시진 후보가 되는 범위
- 진태양시가 자정을 넘는 사례
- 방정시 적용/생략 규칙별 후보와 provenance

### 직렬화와 프라이버시

- 결과가 JSON-safe, deep-frozen, 결정적 순서
- manifest와 규칙 버전 포함
- 출처 원문을 제공하지 않으면 결과·로그에도 생성되지 않음
- 이름·성별·GPS 없이 전체 기능 계산 가능

## 9. 조사 근거의 한계

- 한국 사주 서비스의 공식 공개 페이지에서는 `시간 모름`과 자시 정책 선택 UX는 확인할
  수 있었지만, 시간 미상 결과를 어떤 알고리즘으로 만드는지는 공개되어 있지 않았다.
- 오전/오후를 사주 전용 입력으로 제공하고 후보 원국을 자동 중복 제거하는 공개 한국
  서비스 명세는 찾지 못했다. 이 문서의 오전/오후·범위 계산은 FHIR Period, EDTF의
  불확실성 구분, 현재 `saju-engine`의 경계 계산 능력을 결합한 설계 권고다.
- Astrodienst와 Rodden Rating은 서양 점성술 사례다. 사주 규칙의 근거가 아니라
  시간 의존 결과를 숨기고 출처 품질을 보존하는 방법론의 근거로만 사용했다.
- 이 문서는 용신·격국·신강/신약·신살·성격·궁합·사건 예측의 불확실성을 다루지 않는다.
  오직 출생시각 입력이 역법 계산 결과에 만드는 후보 범위를 다룬다.

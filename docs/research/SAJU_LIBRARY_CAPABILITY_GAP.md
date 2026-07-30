# 사주·만세력 오픈소스 기능 격차 조사

> 기준일: 2026-07-30
>
> 대상: `ssaju`, `sajupy`, `laravel-fortune`, 현재 `saju-engine` / Oh My Saju
>
> 원칙: 공식 저장소의 README·source·test, 공식 패키지 레지스트리만 사용

## 1. 결론

Oh My Saju 0.9 / plugin 0.3은 다음 영역에서 비교 대상보다 더 강한 공개 계약을
제공한다.

- 출생 벽시각을 IANA 시간대의 실제 UTC 순간으로 해소하고 DST gap/fold를 구분
- 천문 절입 순간, 한국 음양력, 진태양시와 세 가지 자시 정책을 감사 정보와 함께 반환
- 생시 미상·오전/오후·근사·범위를 임의의 정오로 바꾸지 않고 후보와 안정 기둥으로 표현
- 계산 사실, 학파별 Tradition Pack finding, 모델 서술을 서로 다른 계층으로 유지
- 세운·월운에 해당하는 입춘 사주년과 12절월 사실, 선택적 근사 대운을 별도 timing API로 제공
- 합·충·형·파·해의 12×12 지지표를 모든 기둥 쌍에 적용하고 실제 기둥 위치까지 보존
- 명시적 convention의 일간 기준 십이운성 10×12 전수표와 출전 범위를 좁힌 역마 관측
- 정확한 생시와 생시 가능성, timing을 모두 보존하는 Compact / Markdown 순수 formatter
- 음력 월의 평달·윤달 일수·양력 범위, 호출자 선택 대운 개수와 대운 십신

따라서 **역법 계산 코어와 일반 사주 구조의 충실도는 충분하다.** 이번 조사에서 처음
확인한 십이운성·제한 신살·formatter·대운 십신·음력 월 정보의 공백은 0.9/0.3 작업에
반영됐다.

남은 공백은 범위를 의도적으로 제한한 영역이다.

1. **광범위한 신살**: 현재는 출전표의 연지 기준 역마 원시 관측 하나뿐이다.
2. **운 해석**: 대운·세운·절월은 정확한 사실을 제공하지만 사건 예측이나 길흉 점수를
   만들지 않는다.
3. **다른 점술 vertical**: 택일·주역·자미두수·육임 등은 별도 문헌·규칙 제품이다.

사용자가 사례로 제시한 특정 구현의 “절기 경계 약 21% 오류” 수치는 원 fixture와
측정법을 확보하지 못했으므로 이 조사에서 사실로 재인용하지 않았다. 대신 이
저장소 자체의 전 범위 경계 회귀와 공개 audit 계약으로 정확성을 판정한다.

과거에 사용했던 비교 구현은 현재 저장소의 식별자 제거 정책에 따라 이름·URL·계보를
조사 산출물에 남기지 않았다. 사용자가 제시한 기능 묶음만 일반화해 비교 축에 반영했다.

## 2. 판정 방법

표의 표시는 다음 뜻이다.

| 표시        | 의미                                                         |
| ----------- | ------------------------------------------------------------ |
| `충실`      | 공개 API와 source/test에서 해당 계약을 확인                  |
| `부분`      | 기반 계산은 있으나 하위 기능·출력·불확실성 처리가 일부 빠짐  |
| `미지원`    | 공개 문서와 export/source에서 해당 기능 계약을 확인하지 못함 |
| `별도 영역` | 사주 계산 parity가 아니라 독립 점술·서비스 제품에 해당       |

`미지원`은 저장소 전체에 어떤 유사 코드도 절대 없다는 뜻이 아니라, **사용자가 의존할 수
있는 공개 계약을 검토한 자료에서 확인하지 못했다**는 뜻이다.

검토 snapshot은 다음과 같다.

- `ssaju`: 공식 저장소 commit
  [`07b608a`](https://github.com/golbin/ssaju/tree/07b608a778be6dac8669e04b9ab794c441959208)
- `sajupy`: 공식 저장소 commit
  [`071c80d`](https://github.com/0ssw1/sajupy/tree/071c80da720c837f93bfda52ae2cb162d9a4fa07),
  공식 [PyPI 0.2.0](https://pypi.org/project/sajupy/0.2.0/)
- `laravel-fortune`: 공식 저장소 commit
  [`3b97333`](https://github.com/wangta69/laravel-fortune/tree/3b97333d8aa2a25bf347ac818a424a5a5df7a6c0),
  공식 [Packagist 항목](https://packagist.org/packages/wangta69/laravel-fortune)
- Oh My Saju: 이 저장소의 현재 source, manifest, public tests

## 3. 비교 대상의 확인된 공개 기능

### 3.1 `ssaju`

공식 README는 `calculateSaju()` 한 번으로 원국, 십성, 십이운성, 관계, 신살, 격국,
용신, 대운, 세운, 월운, 공망을 반환하고 `toCompact()`와 `toMarkdown()`을 제공한다고
명시한다. 같은 문서는 gzip 약 15KB, runtime dependency 0개, compact 약 950 tokens를
제품 특성으로 제시한다.
([README](https://github.com/golbin/ssaju/blob/07b608a778be6dac8669e04b9ab794c441959208/README.md#L1-L78),
[결과 type](https://github.com/golbin/ssaju/blob/07b608a778be6dac8669e04b9ab794c441959208/src/types.ts#L100-L186),
[package manifest](https://github.com/golbin/ssaju/blob/07b608a778be6dac8669e04b9ab794c441959208/package.json#L1-L61))

출력 type에는 네 기둥, 지장간, 십성, 봉법·거법 십이운성, 신살, 대운·세운·월운과
고급 분석이 한 객체에 들어간다. formatter 회귀 테스트도 주요 section과 compact가
Markdown보다 짧음을 고정한다.
([type](https://github.com/golbin/ssaju/blob/07b608a778be6dac8669e04b9ab794c441959208/src/types.ts#L19-L186),
[test](https://github.com/golbin/ssaju/blob/07b608a778be6dac8669e04b9ab794c441959208/tests/calculateSaju.test.ts#L275-L347))

IANA 시간대 문자열, 경도 기반 지방 평균시, 양력·음력 변환과 절입 계산도 제공한다.
다만 생시를 생략하면 “미상”으로 보존하지 않고 정오로 정규화한다. source가 지원하는
입력 연도는 1900–2099이며, 시간대 변환은 호스트 `Intl`에 의존한다.
([input normalization](https://github.com/golbin/ssaju/blob/07b608a778be6dac8669e04b9ab794c441959208/src/manse.ts#L34-L103),
[time and longitude](https://github.com/golbin/ssaju/blob/07b608a778be6dac8669e04b9ab794c441959208/src/manse.ts#L105-L212),
[solar terms](https://github.com/golbin/ssaju/blob/07b608a778be6dac8669e04b9ab794c441959208/src/manse.ts#L442-L575),
[omitted-hour test](https://github.com/golbin/ssaju/blob/07b608a778be6dac8669e04b9ab794c441959208/tests/calculateSaju.test.ts#L186-L207),
[range](https://github.com/golbin/ssaju/blob/07b608a778be6dac8669e04b9ab794c441959208/src/constants.ts#L1-L25))

### 3.2 `sajupy`

공식 README와 PyPI는 1900–2100 CSV 기반 네 기둥, 양력↔음력 변환, 음력 월 정보,
절기 시각을 반영한 월주, 조자시/야자시 옵션을 공개한다.
([README](https://github.com/0ssw1/sajupy/blob/071c80da720c837f93bfda52ae2cb162d9a4fa07/README.md#L5-L12),
[pillars and conversion](https://github.com/0ssw1/sajupy/blob/071c80da720c837f93bfda52ae2cb162d9a4fa07/README.md#L42-L113),
[PyPI](https://pypi.org/project/sajupy/0.2.0/))

도시 이름을 Nominatim으로 geocode하거나 경도와 UTC offset을 직접 받아 지방 평균시를
보정한다. 반환값은 기둥·생년월일·보정 정보를 담은 Python dictionary다.
([README output](https://github.com/0ssw1/sajupy/blob/071c80da720c837f93bfda52ae2cb162d9a4fa07/README.md#L115-L183),
[implementation](https://github.com/0ssw1/sajupy/blob/071c80da720c837f93bfda52ae2cb162d9a4fa07/src/sajupy/core.py#L342-L555))

공개 `calculate_saju` 계약은 `hour`를 필수로 받는다. 검토한 공개 type·README·tests에는
십성, 십이운성, 신살, 대운·세운·월운 또는 compact/Markdown formatter가 없다.
패키지는 Python 3.7 이상과 `pandas`, `geopy`를 요구한다.
([function](https://github.com/0ssw1/sajupy/blob/071c80da720c837f93bfda52ae2cb162d9a4fa07/src/sajupy/core.py#L770-L809),
[public exports](https://github.com/0ssw1/sajupy/blob/071c80da720c837f93bfda52ae2cb162d9a4fa07/src/sajupy/__init__.py#L24-L47),
[pyproject](https://github.com/0ssw1/sajupy/blob/071c80da720c837f93bfda52ae2cb162d9a4fa07/pyproject.toml#L5-L35))

### 3.3 `laravel-fortune`

공식 README는 Laravel Facade와 HTTP route로 양력·음력 입력, 네 기둥과 한글·한자
표현을 제공한다.
([README](https://github.com/wangta69/laravel-fortune/blob/3b97333d8aa2a25bf347ac818a424a5a5df7a6c0/README.md#L33-L128))

원국 생성 뒤 오행, 십신, 지장간, 신살·십이신살, 십이운성, 대운·세운을 선택적으로
채우며, 기본 Saju controller는 이 기능들을 한 JSON 응답에 조립한다.
([README](https://github.com/wangta69/laravel-fortune/blob/3b97333d8aa2a25bf347ac818a424a5a5df7a6c0/README.md#L153-L237),
[service](https://github.com/wangta69/laravel-fortune/blob/3b97333d8aa2a25bf347ac818a424a5a5df7a6c0/src/Services/Saju.php#L280-L433),
[controller](https://github.com/wangta69/laravel-fortune/blob/3b97333d8aa2a25bf347ac818a424a5a5df7a6c0/src/Http/Controllers/SajuController.php#L15-L31))

8자리 날짜 또는 `99` 시간 sentinel을 생시 미상으로 받아 시주를 `時柱不明`으로
보존한다. 후보 시간대나 안정 기둥을 열거하지는 않는다.
([unknown-time input](https://github.com/wangta69/laravel-fortune/blob/3b97333d8aa2a25bf347ac818a424a5a5df7a6c0/src/Services/Saju.php#L65-L105),
[unknown hour result](https://github.com/wangta69/laravel-fortune/blob/3b97333d8aa2a25bf347ac818a424a5a5df7a6c0/src/Services/Saju.php#L145-L215))

음력 달력, 24절기 달력, 삼재에 더해 토정비결, 당사주, 자미두수, 주역, 육임, 택일도
같은 package가 제공한다. 이들은 사주 계산 parity라기보다 여러 독립 전통 서비스를 한
Laravel package에 모은 제품 범위다.
([calendar](https://github.com/wangta69/laravel-fortune/blob/3b97333d8aa2a25bf347ac818a424a5a5df7a6c0/README.md#L239-L289),
[other services](https://github.com/wangta69/laravel-fortune/blob/3b97333d8aa2a25bf347ac818a424a5a5df7a6c0/README.md#L291-L460))

Composer manifest는 PHP 7 이상, Laravel provider/facade 형태와 MIT license를 선언한다.
([composer.json](https://github.com/wangta69/laravel-fortune/blob/3b97333d8aa2a25bf347ac818a424a5a5df7a6c0/composer.json#L1-L54))

## 4. Oh My Saju의 현재 확인된 공개 기능

### 4.1 계산 코어

- `calculateSaju()`는 네 기둥, 한글·한자, 오행·음양, 일간 기준 천간·지지 십신,
  공망, 지장간과 구조 관계를 직렬화 가능한 보고서로 반환한다.
  ([root exports](../../src/index.ts), [report contract](../../src/auditable/types.ts),
  [structure](../../src/analysis/structural-analysis.ts))
- `solarToLunar()`와 `lunarToSolar()`는 별도 `calendar` subpath에 있고 평달·윤달을
  구분한다. ([calendar API](../../src/calendar.ts))
- 지원 범위는 권장 사주 1801–2100, 절기 1800–2300, 한국 음력 1391–2100이다.
  ([manifest](../../src/manifest.ts))
- runtime dependencies는 고정된 `astronomy-engine`, `moment`, `moment-timezone` 세
  개다. ESM/CommonJS와 Node.js 18 이상을 지원한다. ([package manifest](../../package.json))

### 4.2 시간·절입·불확실성

- IANA tzdb version, Astronomy Engine version, dataset digest와 source를 결과에 남긴다.
  DST gap/fold를 기본 거부하고 명시적 해소 정책과 기대 offset을 받는다.
  ([manifest](../../src/manifest.ts), [request/report types](../../src/auditable/types.ts))
- 민간시와 경도·균시차를 포함한 지방 진태양시, 세 가지 자시 일경계 정책을 지원한다.
  ([request types](../../src/auditable/types.ts), [clock](../../src/time/apparent-solar-clock.ts))
- 생시 미상, 오전/오후, 근사, 직접 범위를 반열린 구간으로 정규화하고 후보별 실제
  UTC window, 안정 기둥, 변경 경계를 반환한다.
  ([possibility contract](../../src/auditable/types.ts),
  [implementation](../../src/auditable/calculate-saju-possibilities.ts))

검증 근거에는 1801–2100년 모든 12절·12중기 `-1ms / 경계 / +1ms`, 한국 음력 전체
범위 왕복, 역사 DST 전이, 공개 계산 속성 검사가 포함된다.
([validation](../VALIDATION.md), [solar boundary properties](../../test/public-solar-boundary-properties.test.ts),
[calendar properties](../../src/calendar/calendar-properties.test.ts))

### 4.3 timing, Tradition Pack, LLM output

- `calculateSajuTiming()`은 정확한 입춘→입춘 사주년, 매년 12개의 절→절 월 구간과
  그 간지·십신을 반환한다. 성별이 있으면 순·역행, 시작 offset, 호출자가 선택한
  1–120개 대운의 간지·십신과 근사 시작일도 반환한다.
  ([timing contract](../../src/timing/types.ts),
  [timing implementation](../../src/timing/calculate-saju-timing.ts))
- 대운 표시일은 전통적인 `3일=1년` 환산이므로 명시적으로 `approximate`다. timing은
  정확한 생시만 받고 현재 최대 21개 사주년을 한 번에 반환한다.
  ([timing contract](../../src/timing/types.ts),
  [request validation](../../src/timing/calculate-saju-timing.ts))
- `calculateSajuDailyTransit()`은 원국의 IANA 시간대·자시 정책·일시계 convention을
  상속하고, 지정한 양력 날짜의 현지 정오를 대표 시각으로 한 연·월·일주와 원국 일간
  기준 십신, 일진 일주와 원국 네 기둥의 합·충·형·파·해 원시 관계를 위치·방향과
  함께 반환한다. 하루 점수·길흉·사건 예측은 만들지 않는다.
  ([daily contract](../../src/timing/types.ts),
  [daily implementation](../../src/timing/calculate-saju-daily-transit.ts))
- plugin은 계산 baseline과 자평·적천수·궁통보감·제한 역마 Pack을 분리 평가하며,
  provider-neutral narration task와 finding 참조 검증을 제공한다.
  ([plugin README](../../plugins/oh-my-saju/README.md),
  [skill workflow](../../plugins/oh-my-saju/skills/oh-my-saju/SKILL.md))
- plugin은 self-contained Node.js bundle이라 설치 후 npm install이나 계산 시 네트워크가
  필요 없다. ([plugin README](../../plugins/oh-my-saju/README.md))

`calculation-baseline@1.1.0`은 음간 역행·토간 배속을 ID로 고정한 십이운성 raw stage를
10×12 전수표로 계산한다. `sanming-symbolic-curated@1.0.0`은 출전표의 연지 기준
역마 지지 일치만 관찰하고, 생시 미상에서는 전체 부재를 확정하지 않는다. 둘 다
길흉·강약·사건 의미를 자동 부여하지 않는다.
([baseline profile](../../plugins/oh-my-saju/tradition-packs/calculation-baseline/profile.ts),
[growth table](../../plugins/oh-my-saju/tradition-packs/calculation-baseline/growth-stages.ts),
[symbolic profile](../../plugins/oh-my-saju/tradition-packs/sanming-symbolic-curated/profile.ts))

application은 prepared result를 바꾸지 않는 Compact / Markdown renderer를 제공한다.
생시 불확실성, 달력 환산, 계산 convention, Pack ID, timing 경계와 근사 qualifier를
보존한다.
([presentation](../../plugins/oh-my-saju/runtime/application/presentation.ts))

AI narration은 finding ID뿐 아니라 chronology/timing 근거가 없는 연도 간지·날짜
일진 주장을 fail-closed로 거부한다. Skill은 timing 값을 표시할 수 있지만 이를
길흉·사건 해석으로 확장하지 못하게 한다.
([claim gate](../../plugins/oh-my-saju/runtime/reading/create-reading.ts),
[timing presentation rule](../../plugins/oh-my-saju/skills/oh-my-saju/SKILL.md))

## 5. 기능 격차 matrix

아래 표는 3절과 4절의 출처를 요약한 것이다.

| 사용자 기능           | `ssaju`                 | `sajupy`                  | `laravel-fortune`   | Oh My Saju                                                    | 판정                                |
| --------------------- | ----------------------- | ------------------------- | ------------------- | ------------------------------------------------------------- | ----------------------------------- |
| 네 기둥·원국          | 한 번에 상세 원국       | 네 기둥 dictionary        | Facade/JSON 원국    | 감사 가능한 상세 JSON                                         | **충실**                            |
| 오행·음양·지장간·관계 | 상세 포함               | 공개 계약 없음            | 선택 method         | 전체 지장간과 합·충·형·파·해 위치를 포함한 구조 사실          | **충실**                            |
| 십신                  | 네 기둥·운 단위         | 공개 계약 없음            | 원국·지장간·운 십신 | 원국·세운·절월·호출자 선택 개수의 대운 십신                   | **충실**                            |
| 십이운성              | 봉법·거법               | 공개 계약 없음            | `woonsung12()`      | 일간 기준 명시 profile의 10×12 원시 단계와 생시 미상 coverage | **충실(선택 convention 1개)**       |
| 신살                  | 십이신살·특수신살       | 공개 계약 없음            | 신살·십이신살       | 연지 기준 역마 원시 관측 하나, 부분 관측·출전 제한 명시       | **부분**, 넓게 광고하지 않음        |
| 대운                  | 기산·현재 운·목록       | 공개 계약 없음            | `daewoon()`         | 방향·기산·1–120개 간지·십신·근사 시작일                       | **계산 사실은 충실**                |
| 세운·월운             | 현재 기준 목록          | 공개 계약 없음            | 세운 공개           | 정확한 입춘년·12절월·십신·경계 시각                           | **계산 사실은 충실**                |
| 일진·원국 관계        | 일운·월운 출력          | 공개 계약 없음            | 공개 Saju 계약 상이 | 현지 정오 일진·십신·원국 4주 관계; 점수 없음                  | **사실 계층 충실**, 운세점수 비목표 |
| 양력↔음력            | 양방향                  | 양방향·월 정보            | 양·음력과 달력      | 한국 음력 양방향·윤달·월 일수와 양력 범위                     | **충실**                            |
| 절입                  | 근사 황경 계산          | CSV 절기 시각             | 24절기 달력         | 천문 instant와 uncertainty, 전 범위 경계 회귀                 | **충실**                            |
| 시간대·DST            | IANA 문자열·host Intl   | 수동 UTC offset           | 공개 Saju 계약 없음 | 고정 IANA tzdb·gap/fold·역사 offset                           | **강점**                            |
| 지방 태양시           | 지방 평균시             | 지방 평균시·도시 geocode  | 공개 계약 없음      | 경도+균시차 진태양시                                          | **강점**, 도시 UX는 별도            |
| 생시 미상             | 생략 시 정오 대입       | 필수 hour                 | 시주 미상 sentinel  | 삼주·후보·안정 기둥·범위                                      | **강점**                            |
| compact output        | `toCompact()`           | 없음                      | JSON                | 순수 `renderOhMySajuCompact()`                                | **충실**                            |
| Markdown output       | `toMarkdown()`          | 없음                      | JSON                | 순수 `renderOhMySajuMarkdown()`                               | **충실**                            |
| LLM grounding         | compact 문자열          | 없음                      | 없음                | Pack 격리·finding 검증·privacy·날짜/간지 fail-closed gate     | **강점**                            |
| runtime footprint     | Node 18, 0 runtime deps | Python 3.7+, pandas/geopy | PHP/Laravel         | Node 18, core 3 deps; plugin self-contained                   | 정확성을 택한 다른 포지션           |

## 6. 구현 배치와 반영 상태

아래 배치는 조사 단계에서 정한 설계 경계다. 0.9/0.3에 반영된 항목과 여전히 남은
항목을 구분한다.

### 6.1 계산 코어

계산 코어에는 출전이나 학파 해석 없이 재현 가능한 사실만 둔다.

반영 및 남은 보강:

1. **완료:** 대운 각 항목에 일간 기준 천간·지지 십신과 호출자 선택 개수를 추가했다.
2. **부분:** 방향·환산 method와 근사 qualifier는 공개한다. 출생↔대상 절입의 exact
   duration을 더 직접적인 audit 필드로 노출하는 일은 남았다.
3. **남음:** 생시 범위에 따라 대운 기산이 달라질 수 있는 경우를 위한
   `calculateSajuTimingPossibilities()` 또는 동등한 후보 timing API를 설계한다.
4. **유지:** 세운·월운은 현재의 정확한 입춘년·절월 모델을 유지한다. 양력 1월 1일·달력 월로
   단순 치환한 별도 구현을 만들지 않는다.

코어에 넣지 않을 것:

- 무출전 십이운성 한 표를 “표준 정답”으로 고정
- 거대한 신살 사전
- 대운·세운을 사건 예측이나 길흉 점수로 변환
- 도시 geocoding을 위한 네트워크 의존성

### 6.2 Tradition Pack

#### 십이운성 Pack — 완료

십이운성은 입력이 단순 lookup처럼 보여도 음간 진행, 토간, 봉법·거법과 의미 해석이
달라질 수 있으므로 versioned Pack이 적합하다.

최소 계약:

- 선택한 profile마다 `10 일간 × 12 지지` 전수표
- `tableId`, `profileId`, 출전·판본·rule ID
- 계산된 raw stage와 사용한 anchor를 분리
- 원국 네 위치, 대운·세운·절월에 같은 lookup contract 재사용
- 생시 미상에서는 삼주 결과와 `omittedPillars: ['hour']` 보존
- stage 이름을 생애 사건이나 강도 점수로 자동 해석하지 않음

#### 신살 overlay Pack — 제한 범위 완료, 확장은 남음

신살은 기본 계산 코어가 아니라 선택형 overlay로 둔다.

최소 계약:

- 출전과 표가 확인된 소수 규칙부터 시작
- `anchorPillar`, `targetPillar`, 성별·주야·절기 등 variant 조건
- raw match, 전통 의미, 최종 서술을 별도 필드로 분리
- 시주가 필요한 규칙은 생시 미상에서 `unavailable` 처리
- “길신 수 - 흉신 수” 같은 합산 점수와 하나의 최종 길흉 판정 금지

#### timing interpretation Pack — 별도

현재 timing 결과는 계산 사실로 충분하다. 대운·세운·월운의 작용을 해석하려면 다음을
소유하는 별도 Pack이 필요하다.

- 원국과 운 간의 십신·관계·십이운성 결합 규칙
- 적용할 대운 기산 profile과 불확실성 조건
- 사건을 단정하지 않는 claim scope
- 운 구간별 finding ID와 counterevidence

### 6.3 Reading / Application

#### 결정론적 formatter — 완료

`toCompact()`처럼 report 객체에 함수를 붙이면 “항상 JSON 직렬화 가능”이라는 현재
계약이 약해진다. 대신 다음과 같은 순수 함수를 application/format 계층에 두는 편이
적합하다.

```ts
renderOhMySajuCompact(prepared): string
renderOhMySajuMarkdown(prepared): string
```

필수 조건:

- exact report와 possibility report를 모두 지원
- 생시 미상을 정오나 단일 원국으로 축약하지 않음
- Pack별 finding ID와 불일치를 compact에서도 보존
- timing의 exact boundary와 대운의 `approximate` qualifier를 삭제하지 않음
- calculation-only, selected-Pack, validated-reading 세 projection을 구분
- 고정 section 순서, snapshot test, 최대 byte/token budget
- HTML·URL·제어문자 정책은 현재 validator와 일치

#### 한 번 호출하는 application facade

경쟁 라이브러리의 장점은 “한 번 호출” UX다. 코어와 Pack을 합쳐 버리지 않고도 plugin
application command가 다음 묶음을 한 결과로 반환하도록 facade를 명확히 할 수 있다.

```text
calculation
baseline
selectedTraditionPacks
timing
formattedViews
audit
```

각 하위 결과는 기존 schema와 소유권을 유지해야 한다. facade는 orchestration일 뿐
십이운성·신살·운세 규칙을 직접 구현하지 않는다.

#### 도시 입력 adapter

도시 이름 입력은 편리하지만 geocoding 결과, 역사 경계, 같은 이름의 도시가 모호하다.
따라서 core가 아니라 optional application adapter가 다음을 반환하도록 한다.

```text
입력 문자열 → IANA zone + 경도 + resolver/source + confidence/ambiguity
```

해소가 모호하면 사용자가 확인해야 하며, 계산 report에는 최종 IANA zone과 경도만
명시적으로 전달한다.

## 7. 구현 우선순위

| 상태      | 작업                            | 현재 결과 / 남은 완료 기준                                                          |
| --------- | ------------------------------- | ----------------------------------------------------------------------------------- |
| 완료      | 공개 capability 표현 정리       | 계산 사실, Pack raw 관측, 운 해석 미지원을 구분                                     |
| 완료      | 십이운성 Tradition Pack         | 선택 profile 10×12 전수 test, provenance, 생시 미상 coverage                        |
| 완료      | compact/Markdown formatter      | exact·possibility·timing과 convention/qualifier/finding 보존                        |
| 부분 완료 | 대운 audit·십신 보강            | 개수·십신·method·근사일 완료; 대상 절입 exact duration의 직접 필드는 남음           |
| 제한 완료 | 신살 overlay Pack               | 출전형 역마 하나와 partial 처리; 추가 표·variant는 별도 provenance가 있을 때만 확장 |
| 안전장치  | timing narration claim gate     | timing 근거가 없는 날짜·간지 claim은 거부; 사건 단정 없는 별도 timing Pack은 남음   |
| 남음      | optional 도시 resolver          | network-free core 유지, source와 ambiguity를 보존하는 adapter                       |
| 별도 제품 | 달력 화면·택일 등 별도 vertical | 기존 core를 재사용하되 독립 plugin/Pack으로 제품화                                  |

## 8. 비목표

`laravel-fortune`이 함께 제공하는 토정비결, 당사주, 자미두수, 주역, 육임, 이사·결혼
택일 전체를 Oh My Saju parity 조건으로 삼지 않는다. 각각은 입력, 문헌, 규칙, 검증
계보가 다른 별도 vertical이다.

또한 비교 라이브러리의 작은 bundle을 따라가기 위해 고정된 천문·시간대 dependency와
감사 데이터를 제거하지 않는다. Oh My Saju의 차별점은 최소 byte가 아니라 **재현성,
시간 불확실성, 출전 격리, 검증 가능한 LLM 서술**이다. 크기 최적화가 필요하면 계산
정확성을 낮추기보다 subpath tree-shaking, application bundle 분리, CI size budget으로
다룬다.

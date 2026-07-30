# Validation and limitations

## 검증 원칙

검증은 구현 내부의 중간값보다 배포되는 공개 API와 독립 자료를 우선합니다. 같은 공식을
두 번 구현해 결과가 같은지만 확인하지 않도록 다음 세 종류의 검사를 분리합니다.

1. 공개 계약 검사: `calculateSaju()`와 공개 subpath의 결과·오류·경계 의미를 확인합니다.
2. 독립 성질 검사: Gregorian JDN, 60갑자 주기, 오행 생극처럼 구현과 별도로 적을 수 있는
   수학적·도메인 불변식을 확인합니다.
3. 외부 fixture 검사: KASI 음양력·일진과 일본 국립천문대(NAOJ) 역서처럼 출처가 다른
   자료를 고정해 확인합니다.

전수 왕복은 양방향 구현의 자기일관성을 강하게 검사하지만, 그 자체를 외부 정확성의
증명으로 간주하지 않습니다. 반대로 소수의 외부 fixture 통과만으로 지원 범위 전체의
경계 의미가 보장된다고 간주하지도 않습니다.

## 공개 API 계산 회귀

### 1801–2100년 절기 경계

`test/public-solar-boundary-properties.test.ts`는 공개 사주 범위의 매년 모든 12절과
12중기를 검사합니다.

- 300년 × 12절 각각에서 경계 `-1 ms`, 정확한 경계, `+1 ms`를
  `calculateSaju()`에 입력합니다.
- 12절은 `[현재 절, 다음 절)` 규칙에 따라 정확한 경계부터 새 월주를 사용해야 합니다.
- 입춘은 정확한 경계부터 새 연주를 사용해야 합니다.
- 보고서의 `monthStart`, `monthEnd`, `lichun` 근거 시각도 계산에 사용한 경계와 같아야
  합니다.
- 300년 × 12중기 각각에서는 세 시점 모두 연주·월주가 바뀌지 않아야 합니다.

따라서 절과 중기를 혼동하거나, 초·분 단위로 반올림하거나, 경계의 포함 방향을 뒤집는
변경은 공개 seam에서 검출됩니다.

### 60갑자·일주·시주·십신

`test/public-calculation-properties.test.ts`는 다음 성질을 공개 보고서에서 확인합니다.

- `2000-01-07 = 갑자일`부터 60일 전체가 중복 없이 한 주기를 이루고, 다음 날은 항상
  cycle index가 `+1 mod 60`입니다.
- 1801–2100년에서 선택한 날짜의 일주는 production의 epoch 계산과 별도로 작성한
  Gregorian JDN 식과 일치합니다.
- 1900·2000·2100년의 세기 윤년 경계가 Gregorian 규칙을 따릅니다.
- 10개 일간 × 12개 시진에서 오서둔 시간 공식과 60갑자 조합이 일치합니다.
- 01·03·…·23시의 12개 시진 경계는 `-1 ms`와 정확한 경계 사이에서 다음 지지로
  전환됩니다.
- `civilMidnight`, `splitZi`, `ziStart` 세 자시 정책은 23:00와 다음 날 00:00에서
  각각 선언한 일주·시주 의미를 유지합니다.
- 10개 일간 표본에서 천간·지지의 오행·음양과, 일간 기준 십신이 독립 생극·음양 공식과
  일치합니다.

`src/ganji.test.ts`는 별도로 60개 유효 천간·지지 조합의 index 계산, 10×12 조합의
음양 parity, 범위 밖·비정수 index 및 유효하지 않은 조합 거부를 전수 확인합니다.

### 불확실한 출생시각

`calculateSajuPossibilities()` 회귀는 한 시점을 임의로 대표값으로 고르지 않고 다음
경계를 반열린 구간으로 분할하는지 확인합니다.

- IANA gap·fold의 시작과 끝
- 입춘·12절의 계산 시각과 천문 오차 구간 양 끝
- 민간시의 자정·23시 자시·12시진 경계
- 경도와 균시차를 적용한 지방 진태양시 경계의 근

시간 미상은 시주를 `null`로 남기고 공통 삼주만 반환합니다. 오전·오후·근사·범위 입력은
가능한 정책별 원국과 실제 성립 구간을 함께 반환하며, 후보 구간의 길이를 확률이나
신뢰도로 해석하지 않습니다. 절입 오차 때문에 보존한 후보와 실제 계산 구간도 서로 다른
`basis`로 구분합니다.

## 독립 자료와 전수 달력 검사

### KASI 음양력 200건과 일진 115건

`test/fixtures/kasi-lunar-dataset.json`은 data.go.kr의 KASI 음양력 OpenAPI 결과를 수집한
200개 행입니다.

- fixture 행 수와 파일 SHA-256
  `d651d5a77d7970cde4b36f414995b6ea833b4d50760f23fe0f462c96fdf8ca1a`를 고정합니다.
- 198건에서 양력→한국 음력, 한국 음력→양력, 윤달 여부가 KASI 값과 양방향
  일치해야 합니다.
- `1637-06-13`과 `1643-03-13`은 당시 관용력과 현대 천문 역산의 알려진 차이로
  고정합니다. 새 엔진이 이 두 값을 KASI 값인 것처럼 예외 처리하지 않습니다.
- 공개 사주 범위에 포함되는 115건은 정오의 일주가 KASI 일진과도 일치해야 합니다.
- 수집기 revision, 수집일, 원 API는
  `test/fixtures/kasi-lunar-dataset.provenance.md`와 `ENGINE_MANIFEST`에 기록합니다.

이 fixture는 KASI 전체 제공 범위를 복제한 자료가 아닙니다. 검증된 주장은 보존된
200건 중 양방향 일치한 198건, 명시한 차이 2건, 그리고 일진을 확인한 115건으로
한정합니다.

### 259,307일 왕복

달력 계층의 전수 검사는 음력 1391년 1월 1일에 대응하는 양력 날짜부터 음력 2100년
마지막 날에 대응하는 양력 날짜까지 모든 259,307개 날짜에 다음 불변식을 적용합니다.

```text
Gregorian date → Korean lunar date → the same Gregorian date
```

또한 지원 범위의 모든 음력 평달·윤달에서 첫날과 마지막 날을 양력으로 바꾼 뒤 다시
원래 음력 날짜로 돌아오는지 확인합니다. 이 검사는 공개 달력 변환에 연결되는 구현이
바뀌어도 동일하게 적용되는 interface 수준의 조건입니다. 같은 경계 계산을 공유하는
양방향 함수가 함께 틀릴 가능성은 남으므로, 외부 정확성은 위 KASI fixture와 별도로
판단합니다.

### NAOJ 2024년 12절

`src/astro/astronomical-solar-terms.test.ts`는 Astronomy Engine으로 계산한 2024년
12절을 일본 국립천문대 역서의 분 단위 시각과 대조합니다. 각 절의 UTC 시각 차이는
60초 이하여야 합니다. 입춘은 태양의 겉보기 지심 황경 315° 검색 결과이며, 보고서가
별도 참조표를 런타임 결과로 가장하지 않는지도 확인합니다.

이 12개 값은 2024년의 분 단위 외부 확인점입니다. 1801–2100년 모든 절기의 절대 오차를
외부 관측 자료로 전수 입증하는 자료는 아닙니다.

## IANA 시간대와 DST

시간대 런타임은 `moment-timezone@0.6.3`, `moment@2.30.1`, IANA tzdb `2026c`에
고정되어 있습니다.

- 597개 zone의 UTC 1800-01-01–2102-01-01 구간 65,958개 interval에서 생성된 DST
  metadata index와 MomentZone interval이 모두 정렬되는지 검사합니다.
- TZif의 `isdst`와 주변 표준시 type에서 복원한 계절 보정량을 총 UTC offset과 별도로
  보존합니다. 음수 save와 0초 save도 회귀에 포함됩니다.
- `Asia/Seoul`의 1908 LMT·표준시 도입, 1912·1961 offset 변경, 1954 fold,
  1948–1960 및 1987–1988의 24개 DST 전환을 직전 `-1 ms`와 정확한 전환 시각에서
  확인합니다.
- 존재하지 않는 벽시각은 자동 이동하지 않고 거부하며, 중복 벽시각은 기본 거부하고
  명시적인 `earlier`/`later` 또는 기록된 offset으로만 결정합니다.
- package consumer를 `TZ=UTC`, `America/New_York`, `Asia/Seoul`에서 각각 실행해
  동일 입력의 직렬화 결과가 호스트 시간대에 따라 변하지 않는지 확인합니다.

브라우저 gate는 browser-target bundle의 생성 가능성을 검사합니다. 현재 자동 gate가
여러 실제 브라우저와 여러 브라우저 시간대를 실행해 결과까지 확인하는 것은 아닙니다.

IANA data archive SHA-256은
`e4a178a4477f3d0ea77cc31828ff72aa38feff8d61aa13e7e99e142e9d902be4`,
tzcode archive SHA-256은
`b1cffc3ace4c4c7cd0efba2f7add86ec3d0b79da48bcf03582671fd3c8feace8`,
생성된 DST metadata SHA-256은
`a85d029decb3f71259f6668f8cd8659895d0abd39bbf447de56c65c5a769fbb7`입니다.

## Package와 plugin gate

`pnpm check`는 다음 gate를 순서대로 통과해야 성공합니다.

- core와 Oh My Saju plugin의 TypeScript 검사
- ESLint와 Prettier
- Vitest 및 coverage threshold
- browser-target bundle 생성
- ESM·CommonJS package build
- 선언 파일을 사용하는 ESM·CommonJS consumer, 공개 subpath, 오류 class identity,
  host `TZ` 독립성 검사
- 실제 `npm pack` archive의 파일·라이선스·exports와 설치 후 smoke 검사
- Oh My Saju plugin manifest, Tradition Pack inventory·digest, self-contained runtime
  재빌드 및 command smoke 검사

계산 package와 plugin은 서로 다른 배포 artifact입니다. 계산 package는
`saju-engine`, `saju-engine/calendar`, `saju-engine/advanced`, `saju-engine/timing`
및 `package.json`만 공개합니다. plugin gate는 Pack의 source·rule·table·fixture
inventory와 content digest, Pack별 finding 격리, reading claim gate, plugin 밖 경로에
의존하지 않는 번들을 별도로 확인합니다.

정확한 테스트 개수와 coverage는 문서에 고정하지 않고 현재 `pnpm check` 출력으로
판단합니다. 전체 테스트 수 하나가 천문 정확성, 역법 정확성, 전통 규칙의 충실도,
자연어 해설의 타당성을 동시에 증명하지는 않습니다.

## 재현성 메타데이터

`ENGINE_MANIFEST`와 계산 보고서는 다음을 보존합니다.

- engine·schema·ruleset·source revision
- Astronomy Engine, Moment, Moment Timezone의 버전·source revision·package integrity
- IANA tzdb release와 원본 archive·생성 DST metadata hash
- KASI fixture의 원 API, 행 수, 수집일, 수집기 revision, SHA-256
- 사주·절기·한국 음양력의 지원 범위

배포 빌드는 현재 Git revision을 주입하며, 변경된 source tree에서 만든 build는
`-dirty`를 붙입니다. 체크인되는 self-contained plugin runtime은 아직 생성되지 않은
자기 commit hash 대신 production source inventory의 content digest에 결속됩니다.
Tradition Pack의 provenance와 application binding은 plugin manifest가 별도로
소유합니다.

## 남은 한계

- 공개 사주 보고서의 지원 범위는 1801–2100년입니다. 범위 밖 입력은 근사값으로 조용히
  대체하지 않고 명시적인 오류로 거부합니다.
- Astronomy Engine이 문서화한 천체 위치 정확도는 약 ±1 arcminute입니다. 태양 이동
  속도로 환산한 보수적 25분을 `uncertaintyMilliseconds`로 사용하지만, 이는 개별
  절입의 실제 오차를 측정한 신뢰구간이 아닙니다.
- NAOJ 검사는 2024년 12절의 분 단위 확인점입니다. 지원 범위 전체에 대한 독립
  천문력 전수 검증은 남아 있습니다.
- KASI fixture는 200건이며 198건이 현대 천문 역산과 양방향 일치합니다. 259,307일
  왕복은 강한 자기일관성 검사지만, 모든 날짜가 KASI 관용력과 독립적으로 일치한다는
  뜻은 아닙니다.
- 음양력 엔진은 1912년 이전 120°E, 이후 135°E 역법 일경계를 사용합니다. 이는
  합삭·중기·동지를 날짜에 배정하기 위한 명시적 정책이지 모든 역사적 시보 제도의
  재현은 아닙니다.
- IANA 결과는 tzdb `2026c`의 snapshot입니다. 법령과 tzdb가 바뀌면 데이터·hash·전환
  회귀를 함께 갱신해야 합니다.
- 1908년 이전 `Asia/Seoul`은 IANA의 서울 LMT를 사용하므로 실제 출생지의 지역
  평균시와 다를 수 있습니다.
- 지방 진태양시는 경도와 균시차를 반영한 계산 시계이며, 지형·대기 굴절을 포함하는
  일출시각이 아닙니다.
- 자시, 진태양시, 대운 방향·기산 등 관행에 따라 달라지는 규칙은 요청과 보고서에
  정책으로 남깁니다. 하나의 관행을 역사적으로 유일한 정답으로 주장하지 않습니다.
- 계산·전통 규칙 회귀는 현실 사건 예측의 경험적 타당성을 입증하지 않습니다. 자연어
  해설의 논리적 충실도와 전문가 검토도 별도 평가 대상입니다.

## 출처

- Astronomy Engine: <https://github.com/cosinekitty/astronomy>
- IANA Time Zone Database: <https://www.iana.org/time-zones>
- KASI 음양력 OpenAPI: <https://www.data.go.kr/data/15012679/openapi.do>
- 일본 국립천문대 2024년 역서:
  <https://eco.mtk.nao.ac.jp/koyomi/yoko/2024/rekiyou242.html>

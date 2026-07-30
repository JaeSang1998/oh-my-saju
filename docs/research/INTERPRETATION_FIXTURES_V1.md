# 사주 해석 규칙 원전 fixture v1

> 상태: 구현 전 검증 기준서
> 작성일: 2026-07-28
> 대상: Oh My Saju Tradition Packs의 월령 계절 상태, 격국 후보, 조후 후보 규칙
> 범위: 원전에서 반복 실행 가능한 **분류 결과**를 뽑아 테스트 fixture로 만드는 일. 전통 명리의 성격·사건·미래 예측 효능을 검증하는 문서가 아니다.

## 1. 결론

v1에서 안전하게 코드화할 수 있는 범위는 다음과 같다.

1. 《三命通會》의 `旺·相·休·囚·死` 관계표는 오행 생극 관계로 완전하게 재현할 수 있다.
2. 일간과 월지의 관계로 `정관·재·인·식·칠살·상관·겁재·양인·건록` 등의 **격국 후보**를 만드는 것은 가능하다.
3. 하나의 격국을 확정하려면 월지 지장간, 사령 일수, 투간, 회지, 성패·구응 규칙이 더 필요하다. 이 부분은 판본과 주석층을 고정한 별도 프로필이어야 한다.
4. 《窮通寶鑑》에서 “甲 일간·巳월이면 癸 다음 丁”과 같은 월별 조후 후보 순서를 추출할 수 있다. 이것은 격국용신이나 억부용신과 합치면 안 된다.
5. 현재 확인 가능한 공식 통계·학술조사만으로는 “한국에서 어느 학파가 가장 많이 쓰인다”는 순위를 입증할 수 없다. 제품의 기본 순서는 인기도가 아니라 **출전 명확성, 규칙 재현성, fixture 완성도**로 정해야 한다.

따라서 UI 표현은 `한국에서 가장 많이 쓰는 학파`가 아니라 `대표 문헌별 해석 프로필`이 적절하다. 또한 여기서 말하는 신뢰도는 미래 예측 정확도가 아니라 **원전 충실도와 소프트웨어 재현성**이다.

---

## 2. 출처와 검증 원칙

### 2.1 1차 출처

- 萬民英, 《三命通會》 권2:
  - [위키문헌 전사본](https://zh.wikisource.org/zh-hant/%E4%B8%89%E5%91%BD%E9%80%9A%E6%9C%83/%E5%8D%B7%E4%BA%8C)
  - [중국철학서전자화계획 전사본](https://ctext.org/wiki.pl?chapter=17423&if=gb)
  - [국립도서관 소장본 공개 스캔](https://upload.wikimedia.org/wikipedia/commons/2/23/NLC416-13jh000156-94145_%E4%B8%89%E5%91%BD%E9%80%9A%E6%9C%83.pdf)
- 萬民英, 《三命通會》 권5:
  - [위키문헌 전사본](https://zh.wikisource.org/zh-hant/%E4%B8%89%E5%91%BD%E9%80%9A%E6%9C%83/%E5%8D%B7%E4%BA%94)
  - [중국철학서전자화계획 전사본](https://ctext.org/wiki.pl?chapter=802420&if=gb)
- 沈孝瞻 본문·徐樂吾 평주, 《子平真詮評注》:
  - [중국철학서전자화계획 전사본](https://ctext.org/wiki.pl?chapter=974137&if=gb)
- 余春臺 편, 《窮通寶鑑》:
  - [위키문헌 전사본](https://zh.wikisource.org/zh-hant/%E7%AA%AE%E9%80%9A%E5%AF%B6%E9%91%91)
  - [중국철학서전자화계획 전사본](https://ctext.org/wiki.pl?chapter=208379&if=gb)
  - [《窮通寶鑑評註》 공개 스캔](https://upload.wikimedia.org/wikipedia/commons/9/93/NLC416-12jh004238-48608_%E7%AA%AE%E9%80%9A%E5%AF%B6%E9%91%91%E8%A9%95%E8%A8%BB.pdf)

### 2.2 전사본을 곧바로 상수표로 쓰지 않는 이유

공개 전사본에는 `巳/已`, `己/已`, `癸/壬`, `乙/甲`처럼 OCR 또는 전사 오류로 의심되는 글자가 있다. 특히 《三命通會》의 `論人元司事` 표는 디지털 전사본 사이에도 일수 차이가 보인다.

- 위키문헌 권2 전사: 寅월 `5·5·20`, 巳월 `7·5·18`
- 널리 유통되는 《子平真詮評注》 부표: 寅월 `7·7·16`, 巳월 `5·9·16`
- 다른 《三命通會》 OCR 자원에는 寅월 `7·5·18`로 읽히는 판면도 존재

이 차이가 실제 판본 차이인지 OCR 오독인지 먼저 판면 단위로 확정해야 한다. 그러므로 fixture의 출처는 단순 URL뿐 아니라 `editionId`, `volume`, `section`, `pageImage`, `transcriptionRevision`, `excerptHash`를 가져야 한다.

```ts
type SourceLocator = {
  sourceId: string;
  editionId: string;
  volume: string;
  section: string;
  pageImage?: number;
  transcriptionRevision?: string;
  excerptHash: string;
};
```

v1에서는 **지장간 구성원**과 **원전이 직접 붙인 분류명**만 안정 fixture로 삼는다. 인원사령 일수는 `experimental`로 둔다.

---

## 3. 월령 계절 상태: 旺相休囚死

### 3.1 원전 규칙

《三命通會》 권2 `論五行旺相休囚死並寄生十二宮`은 봄·여름·6월·가을·겨울의 상태를 직접 열거한다. 규칙을 일반화하면 다음과 같다.

- 계절을 주재하는 오행: `旺`
- 주재 오행이 생하는 오행: `相`
- 주재 오행을 생하는 오행: `休`
- 주재 오행을 극하는 오행: `囚`
- 주재 오행이 극하는 오행: `死`

원전은 동시에 “생왕이면 곧 길하고 휴수사절이면 곧 흉한 것은 아니다”라고 경고한다. 따라서 이 결과를 점수나 최종 신강·신약으로 자동 변환하면 안 된다.

### 3.2 완전 표 fixture

| fixture ID                    | 주재 오행 | 木  | 火  | 土  | 金  | 水  | 원전 표현 |
| ----------------------------- | --------- | --- | --- | --- | --- | --- | --------- |
| `seasonal-state.spring-wood`  | 木        | 旺  | 相  | 死  | 囚  | 休  | 春木旺    |
| `seasonal-state.summer-fire`  | 火        | 休  | 旺  | 相  | 死  | 囚  | 夏火旺    |
| `seasonal-state.june-earth`   | 土        | 囚  | 休  | 旺  | 相  | 死  | 六月土旺  |
| `seasonal-state.autumn-metal` | 金        | 死  | 囚  | 休  | 旺  | 相  | 秋金旺    |
| `seasonal-state.winter-water` | 水        | 相  | 死  | 囚  | 休  | 旺  | 冬水旺    |

필수 속성 테스트:

```text
각 행에는 旺·相·休·囚·死가 정확히 한 번씩 있다.
주재 오행은 항상 旺이다.
상생·상극 그래프에서 파생한 결과와 원전 표가 25칸 모두 일치한다.
```

### 3.3 날짜·월지 매핑의 제한

위 표는 `주재 오행 → 다섯 상태`를 확정하지만, 모든 날짜를 어느 주재 오행에 넣을지는 별도 문제다. 특히 원전이 `六月土旺`을 따로 적으므로 `辰·戌·丑·未 전체를 같은 토왕 기간으로 본다` 같은 확장은 이 문장만으로 입증되지 않는다.

안전한 v1 입력은 `seasonalRulerElement`를 이미 결정한 상태다. 월지에서 주재 오행을 정하는 모듈은 다음처럼 별도 프로필이어야 한다.

```ts
type SeasonalCommandProfile = {
  profileId: string;
  monthBranchToSeason: Partial<Record<EarthlyBranch, SeasonKey>>;
  earthTransitionPolicy: 'sixth-month-only' | 'four-season-endings' | 'human-source-governance';
};
```

### 3.4 대표 계산 fixture

```json
{
  "id": "seasonal-state.jia-in-si-month",
  "input": {
    "dayStem": "甲",
    "dayElement": "木",
    "monthBranch": "巳",
    "seasonalRulerElement": "火"
  },
  "expected": {
    "seasonalState": "休",
    "isFinalStrengthVerdict": false
  }
}
```

巳월을 여름의 화 사령으로 고른 프로필에서는 甲木의 계절 상태가 `休`가 된다. 이 fixture가 입증하는 것은 계절 증거 한 항목뿐이며 `신약`, `종격`, `용신`을 뜻하지 않는다.

---

## 4. 월지 인원과 사령 일수

### 4.1 안정적으로 쓸 수 있는 것

《三命通會》 권2 `論人元司事`의 巳월 대목은 戊·庚·丙을 열거한다. 일수의 판본 차이와 무관하게 이 세 천간이 해당 월지의 후보라는 점은 대조 자료에서 일치한다.

```json
{
  "id": "hidden-membership.si-sanming-v1",
  "input": { "monthBranch": "巳" },
  "expected": {
    "hiddenStemCandidates": ["戊", "庚", "丙"],
    "governingStem": null
  },
  "excludedAssertions": ["각 지장간의 가중치", "출생 순간의 사령 천간", "격국 확정"]
}
```

### 4.2 아직 안정적으로 쓸 수 없는 것

다음 값은 v1 제품 기본 프로필에 넣지 않는다.

- 30일 고정 구간을 실제 절입 간격에 그대로 배분하는 계산
- `5·5·20`, `7·5·18`, `7·7·16` 중 하나를 무근거로 표준이라 부르는 것
- 지장간 순서를 곧 강도 순서 또는 `60/30/10%`로 바꾸는 것
- 인원사령 하나만으로 격국을 확정하는 것

필요한 검증 작업:

1. 동일 저본의 판면 이미지를 최소 두 기관 사본으로 대조한다.
2. 월별 30일 표가 절입 간 실제 길이와 어긋날 때 적용할 보간 정책의 출전을 찾는다.
3. 한국 현업 전문가에게 동일 명식 30개 이상을 독립 판정하게 하고 불일치 원인을 규칙 수준에서 기록한다.
4. 그 뒤 `sanming-human-source@edition-x`처럼 판본 ID가 포함된 실험 프로필로만 공개한다.

---

## 5. 십신과 기본 격국 후보

### 5.1 십신의 안정 계산

《三命通會》 권5 `論古人立印食官財名義`는 일간을 기준으로 다음 관계를 설명한다.

- 나를 생함: 印
- 내가 생함: 食
- 나를 극함: 官煞
- 내가 극함: 財
- 같은 오행: 比劫

같은 절은 甲을 예로 들어 `丙=食神`, `丁=傷官`, `庚=偏官`, `辛=正官`, `戊=偏財`, `己=正財`의 구분 근거를 제공한다. 이 관계는 음양과 생극으로 계산할 수 있으므로 10개 일간 × 10개 대상 천간 100쌍을 전수 테스트해야 한다.

격국 규칙은 십신 계산과 분리한다. 십신은 관계 사실이고, 격국은 월령·투간·성패를 더한 문헌 프로필의 추론이다.

### 5.2 정관 후보 fixture

《三命通會》 권5 `論正官`은 `甲日生酉月`과 `甲見辛酉`를 직접 정관 사례로 든다.

```json
{
  "id": "pattern-candidate.jia-you-officer",
  "input": {
    "dayStem": "甲",
    "monthBranch": "酉",
    "monthHiddenStems": ["辛"]
  },
  "expected": {
    "candidates": [
      {
        "tenGod": "正官",
        "sourceStem": "辛",
        "status": "candidate"
      }
    ],
    "finalPattern": null
  }
}
```

`正官格 확정`은 천간 투출과 파격·구응 조건을 더 검사한 뒤에만 가능하다.

### 5.3 건록·월겁 예외 fixture

《子平真詮評注》는 木 일간이 寅·卯월에 태어나 일간과 월령이 같으면 그 자체를 일반 용신으로 삼지 않고, 사주에 드러난 財·官·煞·食 등을 다시 보며 `建祿月劫`으로 분류한다고 설명한다.

```json
{
  "id": "pattern-candidate.wood-yin-mao-lu-jie",
  "input": {
    "dayElement": "木",
    "monthBranch": "寅|卯"
  },
  "expected": {
    "baseCandidate": "建祿月劫",
    "requiresSecondaryCandidateSearch": true,
    "finalPattern": null
  }
}
```

### 5.4 복수 후보 fixture

甲 일간·巳월에 《三命通會》의 巳중 인원 후보 戊·庚·丙을 대응하면 다음이 나온다.

| 지장간 후보 | 甲 일간과의 관계 | 격국 후보 |
| ----------- | ---------------- | --------- |
| 戊          | 甲이 극하는 양토 | 偏財      |
| 庚          | 甲을 극하는 양금 | 七殺/偏官 |
| 丙          | 甲이 생하는 양화 | 食神      |

```json
{
  "id": "pattern-candidate.jia-si-multiple",
  "input": {
    "dayStem": "甲",
    "monthBranch": "巳",
    "monthHiddenStems": ["戊", "庚", "丙"]
  },
  "expected": {
    "candidates": ["偏財", "七殺", "食神"],
    "finalPattern": null,
    "reason": "governing-day-and-transparency-policy-required"
  }
}
```

후보 배열의 원소 순서는 강도 순위로 취급하지 않는다. 최종 선택에는 어느 지장간이 사령하는지, 천간에 투출했는지, 지지에서 회합했는지, 방해·구응이 있는지에 관한 프로필 규칙이 필요하다.

### 5.5 원전이 직접 이름 붙인 worked fixture

《子平真詮評注》의 `論建祿月劫`에는 다음 명식과 분류가 직접 제시된다. 역사 인물의 실제 삶을 검증 fixture로 쓰는 것이 아니라, **텍스트가 그 명식을 어떤 구조로 이름 붙였는지**만 테스트한다.

#### `ziping.jianlu-officer-protected-by-seal`

```json
{
  "inputPillars": ["庚戌", "戊子", "癸酉", "癸亥"],
  "expected": {
    "baseCandidate": "建祿月劫",
    "selectedUseCandidate": "正官",
    "supportingStructure": "印護官",
    "evidence": {
      "戊": "正官",
      "庚": "正印"
    }
  }
}
```

원전 문구는 이 명식을 `用官而印護`의 예로 든다.

#### `ziping.jianlu-wealth-with-output`

```json
{
  "inputPillars": ["甲子", "丙子", "癸丑", "壬辰"],
  "expected": {
    "baseCandidate": "建祿月劫",
    "selectedUseCandidate": "正財",
    "supportingStructure": "食傷化劫生財",
    "evidence": {
      "丙": "正財",
      "甲": "傷官"
    }
  }
}
```

원전은 `祿劫用財，須帶食傷`을 설명하며 이 명식을 예로 든다.

이 두 fixture는 동일한 `建祿月劫` 기반에서도 후속 구조가 달라짐을 보여 준다. `월지 하나 → 최종 격국 하나`의 단순 매핑은 허용하지 않는다.

---

## 6. 조후 후보

### 6.1 격국용신과 다른 출력 타입

《窮通寶鑑》은 월령의 한난조습과 일간을 함께 보고 필요한 천간을 논한다. 이 결과는 다음 타입처럼 `climateRequirementCandidate`로 내보내야 한다.

```ts
type ClimateRequirementCandidate = {
  dayStem: HeavenlyStem;
  monthBranch: EarthlyBranch;
  orderedStems: HeavenlyStem[];
  observedPresence: Array<{
    stem: HeavenlyStem;
    location: 'visible' | 'hidden';
  }>;
  sourceRuleId: string;
  status: 'source-candidate';
};
```

`用神`이라는 같은 한자어를 쓴다는 이유로 아래 결과를 `격국용신` 또는 `억부용신` 필드에 넣으면 안 된다.

### 6.2 재현 가능한 대표 fixture

| fixture ID          | 일간 | 월지/계절 | 원전의 우선순위         | v1 예상값    |
| ------------------- | ---- | --------- | ----------------------- | ------------ |
| `climate.jia-chen`  | 甲   | 辰        | 먼저 庚, 다음 壬        | `[庚,壬]`    |
| `climate.jia-si`    | 甲   | 巳        | 먼저 癸, 다음 丁        | `[癸,丁]`    |
| `climate.yi-yin`    | 乙   | 寅        | 丙을 먼저, 癸를 다음    | `[丙,癸]`    |
| `climate.geng-yin`  | 庚   | 寅        | 丙·甲을 상위, 丁을 다음 | `[丙,甲,丁]` |
| `climate.ji-summer` | 己   | 여름      | 癸가 요체, 丙을 다음    | `[癸,丙]`    |

출전:

- 甲·辰: 《窮通寶鑑》 `三春甲木`의 `先取庚金，次用壬水`
- 甲·巳: 같은 책 `三夏甲木`의 `先癸後丁`
- 乙·寅: `三春乙木`의 `丙火為先，癸水次之`
- 庚·寅: `三春庚金`의 `丙甲為上，丁火次之`
- 己·여름: `三夏己土`의 `取癸為要，次用丙火`

각 fixture는 천간 후보의 순서까지만 검증한다. 원전 뒤에 이어지는 과거 급제, 부귀, 질병, 수명 등의 서술은 v1 기대값에서 제외한다.

기능 태그는 원문이 해당 후보에 직접 결속한 경우만 별도 검증한다.

| fixture             | source-explicit function                                  |
| ------------------- | --------------------------------------------------------- |
| `climate.jia-chen`  | 庚=`null`, 壬=`null`                                      |
| `climate.jia-si`    | 癸=`null`, 丁=`null`                                      |
| `climate.yi-yin`    | 丙=`warming`, 癸=`moistening`                             |
| `climate.geng-yin`  | 丙=`warming`, 甲=`other:loosening-thick-earth`, 丁=`null` |
| `climate.ji-summer` | 癸=`moistening`, 丙=`other:sunlight-growth`               |

조건문은 fixture별 ID로 전사하되 v0.5.0에서는 predicate를 아직 평가하지 않는다. 따라서
`conditions.satisfied`는 비어 있고 `conditions.unresolved`와
`source-transcribed-not-evaluated` 상태를 반환한다. 특히 庚寅의 丙·甲은 공동 상위이며
배열 위치를 `丙 > 甲`의 엄격 순위로 해석하지 않는다.

### 6.3 현재 대화 명식에 적용한 구조 fixture

앞선 계산 결과인 `丙子·癸巳·甲子·丁卯`를 입력 사실로 사용할 경우:

```json
{
  "id": "climate.jia-si.current-conversation-example",
  "input": {
    "pillars": ["丙子", "癸巳", "甲子", "丁卯"],
    "dayStem": "甲",
    "monthBranch": "巳",
    "visibleStems": ["丙", "癸", "甲", "丁"]
  },
  "expected": {
    "orderedClimateCandidates": ["癸", "丁"],
    "visibleCandidatePresence": ["癸", "丁"],
    "finalUsefulGod": null,
    "finalStrength": null
  }
}
```

이 fixture로 말할 수 있는 것은 “《窮通寶鑑》의 甲·巳월 조후 후보 두 글자가 표면 천간에 모두 있다”까지다. 이것을 곧바로 좋은 사주, 신강·신약, 성격 또는 사건 예측으로 바꾸지 않는다.

---

## 7. 한국에서 “가장 많이 쓰는 학파”를 입증할 수 있는가

### 7.1 확인한 학술·공식 자료

- 김태연의 [2006~2024년 사주명리학 연구 동향 분석](https://www.kci.go.kr/kciportal/landing/article.kci?arti_id=ART003163885)은 KCI 논문 205편을 분석한다. 연구 주제·방법·키워드 빈도는 보고하지만, 현업 상담가가 어느 학파나 용신법을 쓰는지 표본조사하지 않는다.
- 김혜련·한동수의 [한국 현대명리학의 발전과정 연구](https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART002964921)는 1960년 이후 번역·강좌·평생교육 확대 과정을 다룬다. 학파별 사용자 비율은 제시하지 않는다.
- 고윤상·조기룡의 [사주명리 시장의 현황과 성장방향 연구](https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART003234240)는 대학·평생교육·민간자격과 앱·유튜브·화상상담의 확산을 분석한다. 교리별 시장점유율 자료는 없다.
- 박숙희의 [한국인의 사주에 관한 의식 및 영향요인 분석](https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART001955457)은 부산 성인 270명의 사주 인식을 조사하지만, 이용한 학파를 묻지 않는다.
- 김만태의 [현대 사주명리 상담의 현장론적 연구](https://www.kci.go.kr/kciportal/mobile/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART003182973)는 상담 과정과 이용 채널을 설명하지만, 규칙 계보별 빈도 조사는 아니다.

### 7.2 판정

이번 조사에서는 전국 대표 표본의 상담가·교육기관·서비스를 대상으로 다음을 측정한 자료를 찾지 못했다.

- 월령격국, 억부, 조후, 병약, 통관 중 주 방법론
- 여러 방법을 혼합할 때의 우선순위
- 사용하는 원전·주석 판본
- 상담 건수로 가중한 실제 사용률
- 지역·세대·교육계보별 차이

따라서 `자평진전 계열이 한국 1위`, `억부법이 가장 대중적` 같은 문구는 현재 근거로 제품에 넣을 수 없다. 서점 판매문구, 검색량, 유튜브 조회수, 특정 협회의 회원 수는 전국 현업 사용률을 대신하지 못한다.

향후 인기도를 주장하려면 최소한 다음 조사가 필요하다.

1. 상담가·교육자·앱 운영자를 층화 표집한다.
2. “알고 있다”가 아니라 최근 실제 상담 20건에 적용한 규칙을 묻는다.
3. 복수 선택뿐 아니라 우선순위와 혼합 조건을 기록한다.
4. 표본 프레임, 무응답 편향, 지역 분포, 신뢰구간을 공개한다.
5. 결과는 `2026 practitioner survey`처럼 시점과 모집단을 한정해 표현한다.

### 7.3 제품 기본 정렬의 대안

인기 순위를 가장하지 않고 다음처럼 정렬한다.

| 순서 | 프로필                   | 기본 노출 이유                                              |
| ---- | ------------------------ | ----------------------------------------------------------- |
| 1    | `common-structural`      | 생극·십신·원시 관계처럼 가장 결정적이고 전수 테스트 가능    |
| 2    | `ziping-month-command`   | 월령 격국 후보와 성패를 문헌 단위로 추적하기 쉬움           |
| 3    | `sanming-seasonal-state` | 旺相休囚死의 완전 표가 있고 관계 계산으로 교차검증 가능     |
| 4    | `qiongtong-climate`      | 일간×월령 조후 후보를 별도 관점으로 명시 가능               |
| 5    | `ditiansui-flow`         | 전체 흐름·왕쇠를 다루지만 정성 예외가 많아 전문가 검수 필요 |
| 6    | `modern-balancing-*`     | 저자·교재·판본별 수식과 가중치를 확보한 경우에만 개별 추가  |

이것은 `popularRank`가 아니라 `implementationReadinessRank`다.

---

## 8. AI 해석에 필요한 fixture 경계

2026년 KCI 논문 [생성형 인공지능의 명리 해석 양상과 한계](https://www.kci.go.kr/kciportal/mobile/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART003361304)는 여러 생성형 AI의 동일 명식 해석에서 십성 오판, 지장간 순서, 월지 인식, 용신 관계, 종격과 합충 적용의 불일치를 보고한다. 이 결과는 LLM이 규칙 실행자가 아니라 근거가 확정된 결과의 서술자여야 한다는 설계를 지지한다.

AI에는 다음 값을 계산하게 하지 않는다.

- 일간·월지·지장간
- 십신
- 旺相休囚死
- 격국 후보와 성패
- 조후 후보 순서

AI가 받을 수 있는 값은 fixture를 통과한 rule finding ID와 출전 요약뿐이다. 서로 다른 프로필 결과를 한 문단에 합칠 때는 반드시 관점을 표시한다.

예:

```text
월령격국 프로필: 식신·편재·칠살 후보가 갈리며 아직 확정되지 않습니다.
계절 상태 프로필: 甲木은 巳월 화 사령에서 休로 분류됩니다.
조후 프로필: 《窮通寶鑑》은 이 조합에서 癸, 丁 순으로 후보를 둡니다.
```

금지 예:

```text
甲木이 약하지만 용신 癸丁이 모두 있어 무조건 귀한 팔자입니다.
```

금지 문장은 서로 다른 규칙층을 합치고, 원전의 전통적 가치 판단을 검증된 미래 사실처럼 단정한다.

---

## 9. fixture 승인 기준

새 해석 규칙은 다음 조건을 모두 충족해야 `stable`이 된다.

- [ ] 원전 본문과 후대 주석을 분리했다.
- [ ] 판본과 판면 위치를 기록했다.
- [ ] 최소 두 전사본을 대조하고 의심 글자는 스캔으로 확인했다.
- [ ] 입력과 예상 출력이 구조화되어 있다.
- [ ] 길흉·성격·사건 서술을 계산 기대값에서 제외했다.
- [ ] 경계 사례와 반례가 있다.
- [ ] 다른 프로필과 충돌할 때 병합하지 않고 병렬 출력한다.
- [ ] 생시 미상일 때 시주 의존 결과가 `unavailable` 또는 후보별 결과가 된다.
- [ ] 전문가 2명 이상이 규칙 해석과 fixture를 독립 검토했다.
- [ ] 소프트웨어 전수·속성·회귀 테스트를 통과했다.

권장 상태:

```ts
type DoctrineRuleStatus =
  | 'research'
  | 'transcribed'
  | 'collated'
  | 'expert-reviewed'
  | 'stable'
  | 'deprecated';
```

현재 이 문서의 표와 대표 fixture는 `transcribed` 단계다. 판면 위치 확정과 독립 전문가 검토 전에는 `stable`로 승격하지 않는다.

# 사주 해석 학파 프로필 V1 연구

> 상태: 구현 전 출전·규칙 경계 기준서
> 작성일: 2026-07-28
> 대상: Oh My Saju Tradition Packs의 학파별 해석 프로필
> 범위: 한국 사용자를 위한 자평 월령 격국, 왕쇠·억부, 조후, 출전형 상징표
> 비범위: 초자연적 정확성의 주장, 성격·질병·수명·재물·혼인·사건의 단정

## 1. 결론

V1에서 권장하는 순서는 “예언 정확도” 순위가 아니라 **출전 명확성, 규칙 재현성, 테스트 가능성** 순위다.

1. `core/common-structural@1`: 간지, 음양오행, 십신 관계, 지장간 멤버십, 합충형파해의 원시 일치, 공망 계산
2. `doctrine/ziping-month-command-shen-base@1`: 《子平真詮》 본문층에 한정한 월령 격국 후보와 성패·구응 근거
3. `doctrine/ditiansui-strength-ren-commentary@1`: 《滴天髓》 본문과 任鐵樵 주석층을 분리한 왕쇠·억부 증거와 판정 후보
4. `overlay/qiongtong-seasonal-edition@1`: 《窮通寶鑑》의 일간×월령별 한난조습 후보를 별도 조후 결과로 제공
5. `overlay/sanming-symbolic-curated@1`: 《三命通會》에서 판본 확인을 마친 공망·역마 등 소수 표의 원시 일치만 선택 제공

월령 격국, 억부용신, 조후용신은 같은 의미의 `용신`을 계산하지 않는다. 결과가 우연히 같아도 필드를 합치지 않고, 다르면 충돌로 그대로 보여 준다. 신살은 기본 판정 엔진이 아니라 선택형 overlay여야 한다.

현대 한국에서 어느 한 방법이 “가장 많이 쓰인다”는 전국 대표 표본 조사는 찾지 못했다. 다만 한국 학위 연구가 《滴天髓》·《子平真詮》·《窮通寶鑑》을 각각 억부·격국·조후의 세 대표 용신론으로 직접 비교하고 있고, 현대 사례 연구도 격국용신과 조후용신을 함께 사용한다. 이는 **현대 사용의 존재**를 뒷받침하지만 시장 점유율이나 정확도 순위를 입증하지는 않는다([RISS 비교 연구, 초록·목차](https://riss.kr/search/detail/ssoSkipDetailView.do?control_no=f2778c52d0f1b9ddffe0bdc3ef48d419&p_mat_type=be54d9b8bc7cdb09), [KCI 교사 명조 사례 연구](https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART002681040)).

## 2. “신뢰도”를 네 축으로 분리한다

| 축             | 이 문서에서 묻는 것                                       | 답할 수 있는 것                                  | 답할 수 없는 것                                          |
| -------------- | --------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------- |
| 문헌 중심성    | 고전 본문에 명시되고 후대 연구에서 독립 체계로 다뤄지는가 | 출전, 판본, 장절, 후대 비교 연구                 | 원전이 오래되었다는 이유만으로 현실 예측이 참이라는 결론 |
| 한국 사용 근거 | 한국의 연구·상담 사례에서 실제 사용되는가                 | 논문·학위논문의 적용 항목, 현대 상담 문화의 존재 | 전국 실무자 중 사용 비율, “가장 많이 쓰임” 순위          |
| 재현성         | 같은 입력·판본·프로필이면 같은 결과가 나오는가            | 표 조회, 관계 탐지, 명시된 규칙 그래프           | 산문적 예외를 개발자가 임의로 보충한 결과                |
| 과학적 타당성  | 독립 표본에서 현실 결과를 예측하는가                      | 특정 연구의 설계·효과크기·한계                   | 전통적 권위나 사용 빈도를 예측 타당성으로 대체           |

2015년 한국 성인 148명을 대상으로 한 탐색 연구는 음양·오행·육신과 표준화 성격검사의 관계를 조사했다. 주요 단일 기준에서는 유의한 관계가 없었고, 일부 상관은 `r=0.18–0.29`로 약했다. 저자들도 표본이 작고, 효과크기가 0.30 미만이며, 사주 성격 기술의 조작적 정의가 모호하다고 제한점을 적었다([Yonsei Medical Journal 원문, pp. 698–704](https://eymj.org/pdf/10.3349/ymj.2015.56.3.698)).

따라서 현재 근거로는 어느 학파도 성격·직업·사건 예측의 과학적으로 검증된 모델이라고 표시할 수 없다. 계산 규칙의 재현성과 현실 예측의 타당성은 별개의 품질이다. 모든 학파 프로필은 다음 메타데이터를 가져야 한다.

```ts
type EvidenceStatus =
  | 'deterministic-symbolic-rule'
  | 'textual-doctrine'
  | 'modern-reconstruction'
  | 'empirically-unvalidated';
```

## 3. 권장 우선순위 매트릭스

`한국 사용 근거`는 대표 표본의 빈도가 아니라, 확인 가능한 한국 학술 문헌에서 독립 방법으로 쓰인 정도다.

| 프로필              | 고전 문헌 중심성 | 현대 한국 사용 근거  | V1 재현성                            | 과학적 예측 타당성        | 기본 노출    |
| ------------------- | ---------------- | -------------------- | ------------------------------------ | ------------------------- | ------------ |
| 공통 구조 계산      | 높음             | 높음                 | 높음                                 | 해석 주장이 아니므로 별도 | 기본         |
| 자평 월령 격국      | 높음             | 중상                 | 후보 생성 높음, 최종 성패 중간       | 확립되지 않음             | 기본 학파    |
| 적천수 왕쇠·억부    | 높음             | 중상                 | 증거 추출 높음, 최종 강약 중하       | 확립되지 않음             | 비교 학파    |
| 궁통보감 조후       | 높음             | 중상                 | 판본 고정 후 표 후보 높음, 예외 중간 | 확립되지 않음             | 별도 overlay |
| 삼명통회 상징표     | 높음             | 사용 존재, 빈도 불명 | 표별로 높음                          | 확립되지 않음             | opt-in       |
| 병약·통관·종격 종합 | 문헌별 상이      | 사용 존재, 빈도 불명 | 현재 낮음                            | 확립되지 않음             | 연구 플래그  |

《子平真詮》 계열과 현대 변형을 같은 `격국법`으로 뭉칠 수 없다. 예를 들어 한국 연구는 아베 타이잔 체계가 `格`, `格局`, `格式`을 따로 정의하고, 월지를 포함한 삼합국을 별도 `格局` 개념으로 삼았다고 정리한다. 이는 심효첨 본문 프로필과 별도 프로필이어야 한다([KCI, 아베 타이잔의 명리 격국이론 수용과 특징](https://www.kci.go.kr/kciportal/landing/article.kci?arti_id=ART002650633)).

## 4. 공통 구조층

### 4.1 V1에서 즉시 구현 가능한 규칙

다음은 의미 해석이 아니라 관계 계산이다.

- 10천간·12지지의 음양과 오행
- 오행의 생·극 방향
- 일간과 대상 천간의 오행 방향 및 음양 동일성으로 계산한 십신
- 선택한 표에 따른 지장간 **멤버십**
- 천간합, 지지 육합·삼합, 충·형·파·해의 원시 조합 일치
- 60갑자 순(旬)에서 빠지는 두 지지로 계산한 공망
- 모든 관계가 어느 원국 글자와 규칙표에서 나왔는지에 대한 trace

《三命通會》 권5 「論正官」은 정관을 “甲見辛、乙見庚”의 예로 들고 음양 배합과 상제를 설명한다. 이는 십신 관계표의 고전 출전으로 사용할 수 있다([《三命通會》 권5 「論正官」](https://ctext.org/wiki.pl?chapter=802420&if=en)). 권2 「論支元六合」「論支元三合」은 육합 쌍과 삼합 조합을 명시한다([《三命通會》 권2](https://ctext.org/wiki.pl?chapter=17423&if=en)).

### 4.2 원시 일치와 교리 판정을 분리한다

다음은 서로 다른 필드여야 한다.

```ts
type RelationMatch = {
  relation:
    | 'stem-combination'
    | 'six-combination'
    | 'three-combination'
    | 'clash'
    | 'punishment'
    | 'harm'
    | 'break';
  members: string[];
  tableProfileRef: string;
};

type RelationEvaluation = {
  matchRef: string;
  eligible: boolean | 'indeterminate';
  transformationCandidate?: string;
  doctrineProfileRef: string;
  reasons: RuleTrace[];
};
```

《三命通會》 권2는 삼합에 세 글자가 모두 있어야 화국으로 논한다고 적지만, 이후의 강도·길흉 서술은 표 일치와 다른 교리층이다. V1은 조합 탐지까지만 공통 구조로 두고 합화 성립은 프로필별로 평가한다.

### 4.3 테스트

- 십신: `10 일간 × 10 대상 천간 = 100` 전수
- 지장간 멤버십: `12 지지` 전수
- 지지 이항 관계: `12 × 12` ordered pair 전수 후 대칭성/비대칭성 명시
- 삼합: `12 choose 3` 조합 및 부분 조합 부정 테스트
- 공망: `60갑자` 전수
- 원국 순서를 바꾸어도 집합형 관계는 같아야 하는 metamorphic test

## 5. 프로필 A — 자평 월령 격국

### 5.1 출전과 텍스트 층

《子平真詮》 「論用神」은 “八字用神，專求月令，以日干配月令地支，而生剋不同，格局分焉”이라고 하여 월령과 일간의 관계에서 격국을 나눈다. 이어 재·관·인·식은 순용하고 살·상·겁·양인(刃)은 역용한다는 큰 원칙을 제시한다([《子平真詮評注》 공개 전사, 「論用神」 91행](https://ctext.org/wiki.pl?chapter=974137&if=en)).

그러나 이 웹 전사는 심효첨 본문과 후대 평주가 한 페이지에 섞여 있다. 프로덕션 프로필은 [중국국가도서관 소장 《子平真詮》 공개 스캔](https://commons.wikimedia.org/wiki/File:NLC416-11jh010455-35296_%E5%AD%90%E5%B9%B3%E7%9C%9F%E8%A9%AE.pdf)의 본문층과 대조하고, 심효첨 본문·편집 문구·후대 주석을 별도 source layer로 기록해야 한다.

### 5.2 V1에서 구현할 수 있는 정확한 부분

1. 월지와 선택된 지장간표를 읽는다.
2. 월지 지장간 각각이 다른 천간에 투출했는지 탐지한다.
3. 일간과 월령 후보 천간의 십신 관계를 계산한다.
4. 정관·재·인·식신·칠살·상관·건록·월겁 등 **격 후보**를 만든다.
5. 「論用神成敗救應」에 명시된 조건 중 선행 개념이 결정적인 것만 규칙 그래프로 평가한다.
6. 각 후보를 `established | candidate | defeated | indeterminate`로 반환한다.
7. 선택되지 않은 후보와 탈락 이유를 보존한다.

예를 들어 공개 전사의 101행은 관격의 재·인 보조와 형충파해 부재, 재격의 식신 생재 등 여러 성립 예를 열거한다. 이를 한 번에 자연어로 흉내 내지 말고 작은 predicate로 나눌 수 있다([같은 문헌, 「論用神成敗救應」](https://ctext.org/wiki.pl?chapter=974137&if=en)).

```ts
type ZipingPatternCandidate = {
  pattern:
    | 'proper-officer'
    | 'wealth'
    | 'seal'
    | 'food-god'
    | 'seven-killings'
    | 'hurting-officer'
    | 'yang-blade'
    | 'month-robbery';
  monthCommandRefs: FactRef[];
  exposedStemRefs: FactRef[];
  supportingConditions: RuleTrace[];
  defeatingConditions: RuleTrace[];
  rescueConditions: RuleTrace[];
  status: 'established' | 'candidate' | 'defeated' | 'indeterminate';
};
```

### 5.3 아직 해결되지 않은 부분

- 월지 지장간 중 본기·중기·여기의 선택 우선순위와 사령 일수
- 둘 이상 투출했을 때 어느 글자를 먼저 취하는지
- 월령 회합으로 원래 격이 변하는 정확한 성립 조건
- `身强`, `有根`, `有力`, `有情`의 조작적 정의
- 정관과 칠살, 재와 인처럼 상충하는 조건의 선후
- 외격·종격·화격을 인정하는 범위
- 본문과 徐樂吾 평주의 규칙 차이

따라서 초기 버전은 “정관격 확정” 같은 단일 라벨보다 “정관격 후보: 월령 관계 충족, 강약 선행 판단 미확정”처럼 반환해야 한다.

### 5.4 사용자 설명의 한계

격국은 구조 분류다. 이를 곧바로 “공무원형”, “부자 사주”, “성공 운명”으로 변환하지 않는다. 사용자에게는 적용한 프로필, 격 후보, 성립·파괴·구응 근거와 미결 조건만 설명한다.

### 5.5 `ziping@1.0.0` Tradition Pack 구현 경계

현재 stable Pack 프로필은 선언한 범위에서 월지 지장간별 십신 격 후보, 연·월·시 천간
투출 위치, `candidate | indeterminate`, 미결 사유까지 구현한다. 교리·출전 범위는
의도적으로 부분적이며 사령·회지·성패·구응 규칙이 아직 완전하지 않으므로
`established | defeated`를 만들어 내지 않고 `finalPattern`은 항상 `null`이다. 지장간
배열 순서를 후보 강도나 우선순위로 사용하지 않는다.

## 6. 프로필 B — 왕쇠·억부

### 6.1 출전과 텍스트 층

《滴天髓闡微》 「衰旺」은 왕하면 설·상을 쓰고 쇠하면 방·조를 기뻐한다는 일반 원칙을 제시하면서도, 왕중유쇠·쇠중유왕 때문에 단순 적용해서는 안 된다고 한다. 任鐵樵 주석은 득시·실령만으로 왕쇠를 끝내는 것을 “死法”이라 비판하고 연·일·시의 손익도 함께 본다([《滴天髓闡微》 「十七、衰旺」 451–454행](https://ctext.org/wiki.pl?chapter=826601&if=en)).

원전 본문, 원주, 任氏 주석은 서로 다른 텍스트 층이다. 판면 확인용으로 [1947년 《滴天髓闡微》 공개 스캔](https://commons.wikimedia.org/wiki/File:SSID-11335994_%E6%BB%B4%E5%A4%A9%E9%AB%93%E9%97%A1%E5%BE%AE.pdf)을 사용할 수 있다.

### 6.2 V1에서 구현할 수 있는 정확한 부분

첫 버전은 점수부터 만들지 않고 **강약 증거 벡터**를 만든다.

```ts
type StrengthEvidenceVector = {
  seasonalCommand: EvidenceItem[];
  directRoots: EvidenceItem[];
  residualRoots: EvidenceItem[];
  visibleResource: EvidenceItem[];
  visiblePeers: EvidenceItem[];
  hiddenSupport: EvidenceItem[];
  outputDrain: EvidenceItem[];
  wealthDrain: EvidenceItem[];
  officerControl: EvidenceItem[];
  combinationsAffectingEvidence: EvidenceItem[];
  followPatternSignals: EvidenceItem[];
  contradictions: EvidenceItem[];
};
```

결정적으로 계산 가능한 것은 다음과 같다.

- 일간이 월령에서 왕·상·휴·수·사 중 어느 계절 범주에 놓이는지
- 각 지지의 선택된 지장간표에 일간 동류 또는 생조 오행이 있는지
- 천간에 비겁·인성이 드러나는지
- 식상·재성·관살이 일간을 설·소모·극하는 관계인지
- 합충으로 원시 증거가 영향을 받을 **후보**인지
- 시간 미상 후보들 사이에서 증거가 안정적인지

### 6.3 V1에서 하지 말아야 할 것

- 오행 개수 또는 합성 백분율을 그대로 신강 점수로 사용
- 출전 없는 `월지 40점, 일지 20점` 식 가중치
- `신강 72.4%` 같은 거짓 정밀도
- 득령 하나로 신강, 실령 하나로 신약 확정
- 종격 후보를 일반 신약으로 강제

초기 판정 범주는 `support-dominant | drain-control-dominant | mixed | extreme-candidate | indeterminate`가 안전하다. 전통 명칭 `신강/신약`은 모든 predicate와 우선순위가 고정되고 전문가 golden fixture를 통과한 버전에서만 추가한다.

### 6.4 해결되지 않은 부분

- 계절, 통근, 투간, 지장간에 부여할 상대 우선순위
- 합화가 기존 근과 천간 관계를 실제로 바꾸는 조건
- 묘고·여기·중기의 강도
- 극왕·극쇠와 종왕·종강·종재·종살의 경계
- 음간과 양간의 강약 판정 차이를 인정하는 범위
- 원국과 대운·세운이 강약 분류 자체를 바꾸는지, 단지 작용만 바꾸는지

이 쟁점을 숨긴 하나의 “한국식 억부 공식”은 만들지 않는다. 특정 현대 저자 체계를 넣으려면 저작권 허락, 완전한 규칙표, 저자 검수 fixture를 갖춘 별도 `modern-korean/{author-system}@version` 프로필이어야 한다.

## 7. 프로필 C — 계절 조후

### 7.1 출전과 텍스트 층

《窮通寶鑑》은 일간과 월령 조합별로 계절 상태와 필요한 천간을 산문형 표처럼 제시한다. 예를 들어 봄 甲木 총론은 초봄의 남은 추위에는 火로 덥히고, 늦봄의 건조에는 水가 필요하다고 서술하며, 정월 甲木에서는 丙·癸를 든다([《窮通寶鑑》 공개 전사 16–19행](https://ctext.org/wiki.pl?chapter=208379&if=en)). 오월 丙火 대목은 염열한 계절 조건에서 壬·庚을 논한다([같은 전사 212–216행](https://ctext.org/wiki.pl?chapter=208379&if=en)).

단, Chinese Text Project는 이 자료의 기준 판본을 `Unknown`으로 표시한다([서지 페이지](https://ctext.org/wiki.pl?if=en&res=346166)). 따라서 공개 전사만으로 production 표를 만들면 안 된다. [와세다대 소장 《窮通寶鑑欄江綱》 스캔](https://www.wul.waseda.ac.jp/kotenseki/html/bunko19/bunko19_f0111/index.html) 또는 [중국국가도서관 소장 공개 스캔](https://commons.wikimedia.org/wiki/File:NLC416-12jh004238-48608_%E7%AA%AE%E9%80%9A%E5%AF%B6%E9%91%91%E8%A9%95%E8%A8%BB.pdf) 중 하나를 기준판으로 고정하고 전사해야 한다.

### 7.2 V1에서 구현할 수 있는 정확한 부분

1. `10 일간 × 12 절기월`의 120 셀을 기준 판본에서 전사한다.
2. 각 셀에서 우선 후보 천간, 보조 후보, 방해 조건을 구조화한다.
3. 후보 천간이 표면 천간·지장간 중 어디에 존재하는지 각각 탐지한다.
4. `warming | cooling | moistening | drying | supporting-material` 같은 **원문 기반 기능 태그**를 붙인다.
5. 격국용신·억부용신과 별도 `climateCandidates`로 반환한다.

```ts
type ClimateCandidate = {
  dayStem: HeavenlyStem;
  solarMonthBranch: EarthlyBranch;
  candidateStem: HeavenlyStem;
  priority: 'primary' | 'secondary' | 'conditional';
  function: 'warming' | 'cooling' | 'moistening' | 'drying' | 'other';
  presence: Array<'visible' | 'hidden'>;
  conditionsSatisfied: RuleTrace[];
  conditionsUnresolved: RuleTrace[];
  editionRef: SourceRef;
};
```

### 7.3 반드시 제거할 서술

원문에는 과거제, 관직, 빈부, 질병, 수명, 가족관계 같은 시대적·결정론적 서술이 섞여 있다. V1 데이터셋에는 계절 후보 규칙만 넣고 다음은 넣지 않는다.

- `科甲`, `富貴`, `貧賤`을 현대 성공 확률로 변환
- 신체·정신 질병 또는 수명 예측
- 배우자·자녀에 대한 성 역할·생사 서술
- 특정 천간 부재를 도덕성이나 지능 결함으로 변환

### 7.4 해결되지 않은 부분

- 《欄江網》·《窮通寶鑑》·《造化元鑰》 계열 판본 차이
- 후보가 지장간에만 있을 때 충족으로 볼지
- 두 후보의 선후가 절대 우선인지 조건부인지
- 격국·억부 결과와 상충할 때 어느 것을 우선할지
- 실제 기상·위도·남반구 계절과 연동할지
  전통 프로필은 중국·동아시아 절기 상징 체계를 그대로 재현하고, 현대 기상 보정은 별도 synthetic profile로만 연구한다.

### 7.5 `qiongtong@1.0.0` Tradition Pack 구현 경계

120칸의 구조와 후보 배열은 제공하지만 source-checked 범위는 대표 5개 규칙(여름 己土의
3개월을 포함한 7개 셀)뿐이다. 이 셀들은 후보 순서와 표면·지장간 출현 위치, 출전
locator를 반환한다. 원문이 후보와 기능을 직접 결속한 乙寅의 丙·癸, 庚寅의 丙·甲,
여름 己土의 癸·丙만 기능 태그를 붙이고 나머지는 `null`로 둔다. 원문 조건은 구조화했지만
아직 predicate로 평가하지 않으므로 `source-transcribed-not-evaluated`로 반환한다.
나머지 셀은 `experimental-transcription-only`이며 stable 승격 대상이 아니다.

## 8. 프로필 D — 출전형 상징표와 신살

### 8.1 넣어도 되는 첫 번째 표

다음은 anchor와 lookup을 명시하면 원시 일치를 결정적으로 계산할 수 있다.

- 공망: 60갑자의 순에서 천간이 배정되지 않은 두 지지
- 역마: 연지 또는 일지의 삼합 그룹을 anchor로 한 대상 지지
- 천을귀인: **어느 변형표인지 명시한 경우에 한해** 일간/연간 anchor의 대상 지지
- 십이운성: 양·음간 진행방향과 토간 정책을 명시한 표

《三命通會》 「論空亡」은 甲子旬에서 戌亥가 남는 계산을 설명하면서도 곧바로 여러 경중법과 “곧 흉으로 논할 수 없다”는 예외를 병기한다([《三命通會》 권3 「論空亡」](https://ctext.org/wiki.pl?chapter=868825&if=en&remap=gb)). 따라서 `voidBranches` 계산과 효과 해석을 분리한다.

「論驛馬」는 `寅午戌→申`, `申子辰→寅`, `巳酉丑→亥`, `亥卯未→巳` 표를 명시한다([《三命通會》 권3 「論驛馬」 1–5행](https://ctext.org/wiki.pl?chapter=117077&if=en)). V1은 이 raw match만 계산하고 이사·승진·여행 사건을 예측하지 않는다.

### 8.2 천을귀인을 기본값으로 두지 않는 이유

같은 《三命通會》의 「論天乙貴人」 안에 양귀·음귀, 동지·하지, 낮·밤, 寅申 기준 등에 관한 여러 설명이 함께 실려 있다([《三命通會》 권3 「論天乙貴人」](https://ctext.org/wiki.pl?chapter=868825&if=en)). 이름이 같다고 하나의 표로 합치면 출전 자체를 훼손한다.

```ts
type SymbolicTableRule = {
  ruleId: string;
  canonicalName: string;
  anchor: 'year-stem' | 'day-stem' | 'year-branch' | 'day-branch' | 'pillar';
  target: 'stem' | 'branch' | 'pillar';
  variantId: string;
  lookup: Readonly<Record<string, readonly string[]>>;
  sourceRefs: SourceRef[];
  effectPolicy: 'raw-match-only';
};
```

### 8.3 V1 제외

- 길신 개수에서 흉신 개수를 빼는 점수
- 신살 하나로 성격·직업·연애·사건을 단정
- 출전 없이 인터넷 표를 합친 “백여 신살”
- 이름이 같은 변형표를 임의 병합
- 격국 프로필이 신살을 배제하는데도 최종 결론을 뒤집는 동작

## 9. 현대 한국 사용에 대한 보수적 결론

현대 상담이 한국에서 널리 문화적으로 사용되고 디지털 채널로 확산했다는 질적 연구는 있다. 해당 연구는 인터넷 운세사이트, 모바일, 카카오톡, 유튜브, 화상상담, 사주카페 등 채널의 다양화를 기술한다([KCI, 「현대 사주명리 상담의 현장론적 연구」](https://www.kci.go.kr/kciportal/mobile/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART003182973)).

그러나 이것으로 특정 학파의 사용률을 계산할 수는 없다. 현재 확인할 수 있는 더 좁은 근거는 다음과 같다.

- 한국 학위 연구가 적천수 억부, 자평진전 격국, 궁통보감 조후를 “3대 용신론”으로 비교한다.
- 한국 사례 연구가 격국·용신·십성·조후·십이운성 등을 함께 적용한다.
- 현대 격국 연구는 같은 `격국` 용어도 심효첨 계열과 아베 타이잔 계열에서 정의가 달라질 수 있음을 보여 준다.
- 2026년 생성형 AI 비교 연구는 동일 명식에서도 십신 오판, 지장간 순서·월지 인식 오류, 투간 기준 불일치, 용희기신 혼선, 종격 누락, 합충 적용 불명확성이 나타났다고 보고했다([KCI, 「생성형 인공지능의 명리 해석 양상과 한계」](https://www.kci.go.kr/kciportal/mobile/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART003361304)).

따라서 제품의 “한국 기본 모드”는 여러 학파를 몰래 혼합한 단일 해석이 아니라 다음 UI preset이어야 한다.

```ts
const KOREAN_COMPARISON_PRESET_V1 = {
  calculation: 'calculation/korea-civil-time@1',
  doctrines: [
    'doctrine/ziping-month-command-shen-base@1',
    'doctrine/ditiansui-strength-ren-commentary@1',
  ],
  overlays: ['overlay/qiongtong-seasonal-edition@1'],
  symbolicTables: 'off-by-default',
  mergePolicy: 'never-merge-semantic-yongshin',
} as const;
```

## 10. 프로필 실행과 충돌 구조

### 10.1 실행 순서

```text
출생 증거와 시간 후보
  → 역법·원국 후보
  → 공통 구조 사실
  → 월령 격국 후보
  → 왕쇠·억부 증거
  → 조후 후보
  → 선택형 상징표 일치
  → 후보 시간별·프로필별 안정성 집계
  → 근거가 연결된 고정 렌더러/AI 설명
```

격국과 억부가 서로를 참조할 때 순환을 피하기 위해 2단계로 실행한다.

1. `raw evidence pass`: 월령, 투간, 통근, 생조·설극, 관계 후보를 모두 계산
2. `doctrine resolution pass`: 프로필별 우선순위로 후보를 평가하고, 다른 프로필의 결론은 입력으로 사용하지 않음

### 10.2 용신 필드는 의미별로 고정한다

```ts
type UsefulGodFinding =
  | { method: 'structure'; profileRef: string; candidates: TenGodOrStem[] }
  | { method: 'balance'; profileRef: string; candidates: ElementOrStem[] }
  | { method: 'climate'; profileRef: string; candidates: HeavenlyStem[] }
  | { method: 'bridging'; profileRef: string; candidates: ElementOrStem[] }
  | { method: 'illness-medicine'; profileRef: string; candidates: ElementOrStem[] };
```

`yongShin: "수"` 같은 전역 필드는 금지한다. AI도 여러 결과를 평균내거나 다수결로 하나를 선택할 수 없다.

### 10.3 시간 미상

- 삼주로 변하지 않는 월령·일간·십신·관계 사실은 계산한다.
- 시주가 필요한 통근·투간·합충·격국 예외는 `indeterminate`로 남긴다.
- 가능한 시주 후보별 결과를 만들고 `stableAcrossCandidates`와 `variantByCandidate`를 분리한다.
- “시간이 없으니 정오를 가정”하지 않는다.
- 기본 AI 설명은 모든 시간 후보에서 안정적인 결과만 사용한다.

## 11. 소스와 규칙 manifest

```ts
interface DoctrineProfileManifest {
  profileId: string;
  version: string;
  displayName: string;
  lineage: {
    work: string;
    attributedAuthor?: string;
    commentator?: string;
    textualLayer:
      | 'base-text'
      | 'original-commentary'
      | 'later-commentary'
      | 'modern-reconstruction';
  };
  edition: {
    catalogUrl: string;
    scanUrl: string;
    publication: string;
    checksum: string;
  };
  rules: Array<{
    ruleId: string;
    sourceLocator: {
      volume?: string;
      chapter: string;
      folioOrImage: string;
      lineRange?: string;
    };
    transcriptionHash: string;
    formalizationStatus: 'literal-table' | 'formalized-prose' | 'reconstruction';
    reviewerIds: string[];
  }>;
  limitations: string[];
  fixturesHash: string;
  rulesHash: string;
}
```

결과에는 최소한 다음이 남아야 한다.

- 원국 fact ID
- 적용 rule ID와 profile version
- 판본·장절·면/이미지 locator
- 원문 전사 hash
- predicate 입력과 결과
- 확정/후보/미결 상태
- 시간 후보 집합
- 다른 프로필과의 합의·충돌

## 12. 판본·라이선스 정책

고전 원문 자체와 공개된 기계적 스캔을 우선 사용한다.

- [《子平真詮》 중국국가도서관 스캔](https://commons.wikimedia.org/wiki/File:NLC416-11jh010455-35296_%E5%AD%90%E5%B9%B3%E7%9C%9F%E8%A9%AE.pdf): Commons 페이지가 public-domain scan으로 표시
- [《滴天髓闡微》 1947년 스캔](https://commons.wikimedia.org/wiki/File:SSID-11335994_%E6%BB%B4%E5%A4%A9%E9%AB%93%E9%97%A1%E5%BE%AE.pdf): public-domain mark
- [《窮通寶鑑欄江綱》 와세다대 스캔](https://commons.wikimedia.org/wiki/File:WUL-bunko19_f0111_%E7%AA%AE%E9%80%9A%E5%AE%9D%E9%91%91%E6%AC%84%E6%B1%9F%E7%B6%B1.pdf): public-domain 표시
- [1578년 《三命通會》 스캔](https://commons.wikimedia.org/wiki/File:NCL-06589_1_%E4%B8%89%E5%91%BD%E9%80%9A%E6%9C%83.pdf): public-domain 표시

Chinese Text Project는 탐색·대조에 유용하지만 사이트 전체를 자유 라이선스 데이터셋으로 간주하면 안 된다. 공식 FAQ는 사이트와 콘텐츠가 저작권 보호를 받으며 합리적 인용은 허용하지만 재배포에는 제한이 있다고 설명한다([CTP FAQ의 Copyright 절](https://ctext.org/faq)). 또한 Wiki 텍스트는 사용자 편집·OCR 초고일 수 있다. 제품 규칙은 CTP 문장을 대량 복제하지 않고, 공개 도메인 판면에서 자체 전사한 최소 규칙 데이터와 출전 locator를 저장한다.

현대 번역서·강의안·상담가의 표는 별도 저작권 대상일 수 있다. 다음 중 하나 없이는 규칙팩으로 복제하지 않는다.

- 저작권자의 명시적 상업 이용·파생 허락
- 자유 라이선스와 의무 준수
- 저작권이 만료된 기준판
- 법률 검토를 거친 비보호 사실의 독립 재구성

이 문서는 법률 자문이 아니다. 출시 전 배포 국가 기준의 라이선스 검토가 필요하다.

## 13. fixture와 검수 기준

### 13.1 fixture 종류

1. **전수표 fixture**: 십신, 공망, 지장간, 관계표, 선택된 신살표
2. **원문 예시 fixture**: 원전에 실제로 제시된 명식과 해당 장의 주장
3. **전문가 합의 fixture**: 출생 입력과 기대 trace를 최소 2인이 독립 주석
4. **의도적 충돌 fixture**: 격국·억부·조후 결과가 다른 명식
5. **경계 fixture**: 절입, 자시 정책, 역사적 표준시, 시간 미상
6. **부정 fixture**: 부분 삼합, 미투간, 무근, 조건 하나 부족

원전 사례는 결과가 현실에서 참이었다는 증거가 아니라 **그 프로필을 충실히 재현했는지** 확인하는 golden fixture다.

### 13.2 프로필 승인 기준

- 모든 규칙이 판본과 면/행 locator를 가짐
- OCR과 판면을 2인이 대조
- 표 규칙 100% 전수 테스트
- 산문 규칙 branch coverage 100%
- 결정 순서와 tie-breaker 문서화
- 적어도 30개 합의 fixture, 20개 충돌 fixture, 20개 시간불확실 fixture
- 이전 버전과 semantic diff 생성
- 동일 입력·동일 profile hash에서 byte-stable JSON
- AI 없이도 전체 finding과 근거가 생성됨

전문가 일치도가 낮은 항목은 억지로 golden truth로 만들지 않는다. `inter-rater disagreement`를 저장하고 해당 규칙을 candidate-only로 낮춘다.

## 14. AI가 할 수 있는 일과 할 수 없는 일

AI가 할 수 있는 일:

- 엔진 finding ID 중 사용자 질문에 맞는 항목 선택
- 학파 간 합의와 충돌을 쉬운 한국어로 배열
- “이 프로필에서는 왜 후보인지” trace 설명
- 시간 미상 때문에 달라지는 범위 요약

AI가 할 수 없는 일:

- 간지·십신·지장간·격국을 다시 계산
- 숨겨진 학파를 선택하거나 프로필을 혼합
- 근거 없는 용신 하나를 확정
- 성격·질병·수명·범죄·임신·재물·합격·이혼·사망 사건 생성
- 사용자 반응에 맞추어 계산 결과를 변경

동일 명식에 여러 범용 LLM을 적용한 2026년 한국 연구에서 십신·지장간·투간·용신·종격·합충 판단의 불일치가 보고된 점은, “LLM이 계산하고 해석”하는 구조가 아니라 “엔진이 계산하고 LLM은 승인된 finding을 설명”하는 구조가 필요하다는 직접적인 현대 근거다.

## 15. 구현 단계

### Phase 1 — 즉시

- 공통 구조 전수표와 trace
- 월령 격국 **후보 생성**
- 왕쇠 **증거 벡터**
- 기준판을 고정한 조후 120셀 전사 도구와 schema
- 공망·역마 raw match
- 학파 비교 API와 시간 후보 안정성 집계

### Phase 2 — 전문가 fixture 후

- 자평진전 성패·구응 규칙 그래프
- 왕쇠 범주 판정과 극단 후보
- 조후 조건·방해 관계
- 천을귀인 등 변형별 curated table

### Phase 3 — 별도 연구

- 종격·화격·전왕격
- 병약·통관 프로필
- 대운·세운과 원국의 교리적 상호작용
- 저작권 허락을 받은 특정 현대 한국 학파

### 출시하지 않는 것

- 출전 없는 종합 점수
- “가장 정확한 학파” 배지
- AI가 생성한 규칙을 production profile에 자동 추가
- 현실 사건의 확률·날짜 예측
- 사용자의 생시를 결과에 맞춰 역추정하는 자동 보정

## 16. 출전 색인

| Source ID                 | 문헌·위치                                | 이번 구현에서 쓰는 범위       | 주의                            |
| ------------------------- | ---------------------------------------- | ----------------------------- | ------------------------------- |
| `SRC-ZPZQ-BASE-YONGSHEN`  | 《子平真詮》 「論用神」                  | 월령 중심 격 후보·순역용 원칙 | 평주층 분리                     |
| `SRC-ZPZQ-BASE-SUCCESS`   | 같은 책 「論用神成敗救應」               | 성립·파괴·구응 predicate 후보 | 강약·유력 정의 선행 필요        |
| `SRC-DTS-BASE-STRENGTH`   | 《滴天髓闡微》 「衰旺」 451–453행        | 왕쇠·부억 일반 원칙           | 본문·원주 분리                  |
| `SRC-DTS-REN-STRENGTH`    | 같은 장 454행 이하 任氏曰                | 득령 단독판정 금지, 다축 증거 | 후대 주석 프로필                |
| `SRC-QTBJ-SPRING-JIA`     | 《窮通寶鑑》 16–19행                     | 甲×寅월 계절 후보             | 기준판 미지정 전사는 비프로덕션 |
| `SRC-QTBJ-MIDSUMMER-BING` | 같은 책 212–216행                        | 丙×午월 계절 후보             | 길흉 서술 제외                  |
| `SRC-SMTH-OFFICER`        | 《三命通會》 권5 「論正官」              | 십신 관계 출전                | 의미 서술 제외                  |
| `SRC-SMTH-COMBINATION`    | 같은 책 권2 「論支元六合」「論支元三合」 | raw 관계표                    | 합화·길흉 분리                  |
| `SRC-SMTH-VOID`           | 같은 책 권3 「論空亡」                   | 순공 계산                     | 효과 변형 제외                  |
| `SRC-SMTH-TRAVEL-HORSE`   | 같은 책 권3 「論驛馬」 1–5행             | 삼합 anchor lookup            | 사건 해석 제외                  |
| `SRC-SMTH-NOBLEMAN`       | 같은 책 권3 「論天乙貴人」               | 변형 존재와 variant 설계      | 단일 기본표 금지                |

## 17. 연구 한계

- 현대 한국 실무자의 학파별 점유율을 보여 주는 대표성 있는 조사는 확인하지 못했다.
- 한국 학술 논문과 학위논문은 전통 이론의 사용·비교 근거이지 초자연적 예측력의 검증 자료가 아니다.
- CTP의 일부 자료는 OCR·협업 전사이므로 판면 대조 전에는 production source가 아니다.
- 고전 산문은 완전한 알고리즘 명세가 아니다. 형식화 과정 자체가 해석이므로 규칙 revision과 검수자가 필요하다.
- 2015년 성격 연구 한 편의 약한 탐색 결과는 학파별 정확도나 사건 예측력을 확립하지 못한다.

이 한계를 공개하는 것이 서비스의 결함이 아니라, 학파별 규칙층을 견고하고 검증 가능하게 유지하는 전제다.

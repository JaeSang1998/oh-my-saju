import type { EarthlyBranch, HeavenlyStem } from 'saju-engine';
import { deepFreeze } from '../../runtime/internal/deep-freeze';
/** Source-status-aware deterministic table owned by the Qiongtong Pack. */
import { assertEarthlyBranch, assertHeavenlyStem } from '../../runtime/traditions/domain';

type ClimateCandidateTable = Readonly<
  Record<HeavenlyStem, Readonly<Record<EarthlyBranch, readonly HeavenlyStem[]>>>
>;

type ClimateFunctionTag = 'warming' | 'moistening' | 'other';

interface QiongtongClimateCandidateSource {
  readonly stem: HeavenlyStem;
  readonly priority: 'primary' | 'co-primary' | 'secondary';
  /**
   * A null tag means the base-text passage does not bind a climate function
   * directly to this stem. We do not fill the gap from element symbolism.
   */
  readonly function: {
    readonly tag: ClimateFunctionTag | null;
    readonly evidence: string | null;
    readonly status: 'source-explicit' | 'not-explicit-in-base-text';
  };
  readonly conditions: {
    readonly satisfied: readonly string[];
    readonly unresolved: readonly string[];
    readonly status: 'source-transcribed-not-evaluated';
  };
}

export interface QiongtongClimateCellSource {
  readonly fixtureId: string;
  readonly sourceRuleId: string;
  readonly sourceReferenceId: 'qiongtong-day-stem-month-climate-v1';
  readonly sourceLocator: string;
  readonly verification: 'source-checked-candidate-order-and-explicit-functions';
  readonly candidates: readonly QiongtongClimateCandidateSource[];
}

function curatedCandidate(
  stem: HeavenlyStem,
  priority: QiongtongClimateCandidateSource['priority'],
  functionTag: ClimateFunctionTag | null,
  functionEvidence: string | null,
  unresolvedConditions: readonly string[],
): QiongtongClimateCandidateSource {
  return {
    stem,
    priority,
    function: {
      tag: functionTag,
      evidence: functionEvidence,
      status: functionTag === null ? 'not-explicit-in-base-text' : 'source-explicit',
    },
    conditions: {
      satisfied: [],
      unresolved: unresolvedConditions,
      status: 'source-transcribed-not-evaluated',
    },
  };
}

const JIA_CHEN_CONDITIONS = [
  'geng-count-and-ren-selection-not-evaluated',
  'hidden-fire-damage-water-response-not-evaluated',
  'metal-configuration-ding-exception-not-evaluated',
] as const;
const JIA_SI_CONDITIONS = [
  'gui-ding-geng-transparency-branches-not-evaluated',
  'no-water-and-no-geng-ding-branch-not-evaluated',
] as const;
const YI_YIN_CONDITIONS = [
  'bing-gui-joint-transparency-not-evaluated',
  'excess-bing-or-excess-gui-balance-not-evaluated',
] as const;
const GENG_YIN_CONDITIONS = [
  'bing-jia-joint-or-single-transparency-not-evaluated',
  'thick-earth-burying-metal-not-evaluated',
  'ding-earth-no-water-special-case-not-evaluated',
] as const;
const JI_SUMMER_CONDITIONS = [
  'bing-gui-transparency-and-xin-support-not-evaluated',
  'wu-gui-combination-not-evaluated',
  'ren-substitution-not-evaluated',
  'excess-fire-or-rootless-gui-not-evaluated',
] as const;

const CURATED_CELL_SOURCES: Readonly<Record<string, QiongtongClimateCellSource>> = deepFreeze({
  '갑:진': {
    fixtureId: 'climate.jia-chen',
    sourceRuleId: 'qiongtong.jia-spring.chen.v1',
    sourceReferenceId: 'qiongtong-day-stem-month-climate-v1',
    sourceLocator: 'Wikisource oldid 2294674, 三春甲木, lines 230-239; 1937 scan pp.20-21',
    verification: 'source-checked-candidate-order-and-explicit-functions',
    candidates: [
      curatedCandidate('경', 'primary', null, null, JIA_CHEN_CONDITIONS),
      curatedCandidate('임', 'secondary', null, null, JIA_CHEN_CONDITIONS),
    ],
  },
  '갑:사': {
    fixtureId: 'climate.jia-si',
    sourceRuleId: 'qiongtong.jia-summer.si.v1',
    sourceReferenceId: 'qiongtong-day-stem-month-climate-v1',
    sourceLocator: 'Wikisource oldid 2294674, 三夏甲木, lines 242-252; 1937 scan p.22',
    verification: 'source-checked-candidate-order-and-explicit-functions',
    candidates: [
      curatedCandidate('계', 'primary', null, null, JIA_SI_CONDITIONS),
      curatedCandidate('정', 'secondary', null, null, JIA_SI_CONDITIONS),
    ],
  },
  '을:인': {
    fixtureId: 'climate.yi-yin',
    sourceRuleId: 'qiongtong.yi-spring.yin.v1',
    sourceReferenceId: 'qiongtong-day-stem-month-climate-v1',
    sourceLocator: 'Wikisource oldid 2294674, 三春乙木, lines 348-358; 1937 scan p.47',
    verification: 'source-checked-candidate-order-and-explicit-functions',
    candidates: [
      curatedCandidate(
        '병',
        'primary',
        'warming',
        'remaining-cold-needs-warming',
        YI_YIN_CONDITIONS,
      ),
      curatedCandidate(
        '계',
        'secondary',
        'moistening',
        'nourishing-root-foundation',
        YI_YIN_CONDITIONS,
      ),
    ],
  },
  '경:인': {
    fixtureId: 'climate.geng-yin',
    sourceRuleId: 'qiongtong.geng-spring.yin.v1',
    sourceReferenceId: 'qiongtong-day-stem-month-climate-v1',
    sourceLocator: 'Wikisource oldid 2294674, 三春庚金, lines 1544-1560; 1937 scan pp.170-171',
    verification: 'source-checked-candidate-order-and-explicit-functions',
    candidates: [
      curatedCandidate(
        '병',
        'co-primary',
        'warming',
        'removing-cold-from-geng',
        GENG_YIN_CONDITIONS,
      ),
      curatedCandidate('갑', 'co-primary', 'other', 'loosening-thick-earth', GENG_YIN_CONDITIONS),
      curatedCandidate('정', 'secondary', null, null, GENG_YIN_CONDITIONS),
    ],
  },
  '기:사': {
    fixtureId: 'climate.ji-summer',
    sourceRuleId: 'qiongtong.ji-summer.si.v1',
    sourceReferenceId: 'qiongtong-day-stem-month-climate-v1',
    sourceLocator: 'Wikisource oldid 2294674, 三夏己土, lines 1427-1441; 1937 scan pp.157-158',
    verification: 'source-checked-candidate-order-and-explicit-functions',
    candidates: [
      curatedCandidate('계', 'primary', 'moistening', 'rain-moistens-earth', JI_SUMMER_CONDITIONS),
      curatedCandidate(
        '병',
        'secondary',
        'other',
        'sunlight-supports-growth',
        JI_SUMMER_CONDITIONS,
      ),
    ],
  },
  '기:오': {
    fixtureId: 'climate.ji-summer',
    sourceRuleId: 'qiongtong.ji-summer.wu.v1',
    sourceReferenceId: 'qiongtong-day-stem-month-climate-v1',
    sourceLocator: 'Wikisource oldid 2294674, 三夏己土, lines 1427-1441; 1937 scan pp.157-158',
    verification: 'source-checked-candidate-order-and-explicit-functions',
    candidates: [
      curatedCandidate('계', 'primary', 'moistening', 'rain-moistens-earth', JI_SUMMER_CONDITIONS),
      curatedCandidate(
        '병',
        'secondary',
        'other',
        'sunlight-supports-growth',
        JI_SUMMER_CONDITIONS,
      ),
    ],
  },
  '기:미': {
    fixtureId: 'climate.ji-summer',
    sourceRuleId: 'qiongtong.ji-summer.wei.v1',
    sourceReferenceId: 'qiongtong-day-stem-month-climate-v1',
    sourceLocator: 'Wikisource oldid 2294674, 三夏己土, lines 1427-1441; 1937 scan pp.157-158',
    verification: 'source-checked-candidate-order-and-explicit-functions',
    candidates: [
      curatedCandidate('계', 'primary', 'moistening', 'rain-moistens-earth', JI_SUMMER_CONDITIONS),
      curatedCandidate(
        '병',
        'secondary',
        'other',
        'sunlight-supports-growth',
        JI_SUMMER_CONDITIONS,
      ),
    ],
  },
});

/**
 * 《궁통보감》의 일간 × 절기월 후보 천간 전사표.
 *
 * 이 표는 공개 전사본과 연구 fixture에서 길흉·사건 서술을 제거하고 후보
 * 천간만 독립 재구성한 것이다. 대표 fixture는 후보 우선 묶음·원문 명시
 * 기능·미평가 조건을 별도로 보존한다. 나머지 배열 순서는 점수나 확률,
 * 최종 용신을 뜻하지 않는다. 전체 판면 대조와 독립 전문가 검수가 끝나기
 * 전까지 반드시 experimental 데이터로 취급한다.
 */
export const QIONGTONG_CLIMATE_TABLE_V1_METADATA = deepFreeze({
  id: 'qiongtong-day-stem-month-branch-candidates-v1',
  schemaVersion: '1',
  transcriptionStatus: 'partial-source-reviewed',
  releaseStatus: 'experimental',
  dayStemCount: 10,
  solarMonthBranchCount: 12,
  cellCount: 120,
  monthBasis: 'solar-term-month-branch',
  outputScope: 'candidate-stems-with-curated-source-metadata',
  sourceFixtureScope: 'five-curated-fixtures-covering-seven-cells',
  remainingCellVerification: 'experimental-transcription-only',
  sourceWork: '궁통보감(窮通寶鑑)',
  sourceTranscriptionRevision: 'Wikisource oldid 2294674',
  sourceScanEdition: '1937 《窮通寶鑑評註》',
  cautions: [
    '판본 및 전사 차이가 남아 있어 최종 용신으로 사용할 수 없다.',
    '배열 순서는 전사된 후보 순서이며 강도 점수나 확률이 아니다.',
    '격국용신 및 억부용신과 병합하거나 다수결로 고르지 않는다.',
  ],
} as const);

/**
 * 한글 천간·지지 키를 사용하는 10 × 12 완전 조회표.
 *
 * 지지 키의 표기 순서만 자축인묘진사오미신유술해이며, 계산은 절입으로
 * 확정된 월지를 입력받는다. 객체와 모든 후보 배열은 재귀적으로 동결된다.
 */
export const QIONGTONG_CLIMATE_CANDIDATES_V1: ClimateCandidateTable = deepFreeze({
  갑: {
    자: ['정', '경', '병'],
    축: ['정', '경', '병'],
    인: ['병', '계'],
    묘: ['경', '병', '정', '무', '기'],
    진: ['경', '임'],
    사: ['계', '정'],
    오: ['계', '정', '경'],
    미: ['계', '정', '임'],
    신: ['경', '정', '임'],
    유: ['정', '병', '경'],
    술: ['경', '갑', '정', '임', '계'],
    해: ['경', '정', '병', '무'],
  },
  을: {
    자: ['병'],
    축: ['병'],
    인: ['병', '계'],
    묘: ['병', '계'],
    진: ['계', '병', '무'],
    사: ['계'],
    오: ['계', '병'],
    미: ['계', '병'],
    신: ['병', '계', '기'],
    유: ['계', '병', '정'],
    술: ['계', '신'],
    해: ['병', '무'],
  },
  병: {
    자: ['임', '무', '기'],
    축: ['임', '갑'],
    인: ['임', '경'],
    묘: ['임', '기'],
    진: ['임', '갑'],
    사: ['임', '경', '계'],
    오: ['임', '경'],
    미: ['임', '경'],
    신: ['임', '무'],
    유: ['임', '계'],
    술: ['갑', '임'],
    해: ['갑', '무', '경', '임'],
  },
  정: {
    자: ['갑', '경'],
    축: ['갑', '경'],
    인: ['갑', '경'],
    묘: ['경', '갑'],
    진: ['갑', '경', '무'],
    사: ['갑', '경'],
    오: ['임', '경', '계'],
    미: ['갑', '임', '경'],
    신: ['갑', '경', '병', '무'],
    유: ['갑', '경', '병', '무'],
    술: ['갑', '경', '병', '무'],
    해: ['갑', '경'],
  },
  무: {
    자: ['병', '갑'],
    축: ['병', '갑'],
    인: ['병', '갑', '계'],
    묘: ['병', '갑', '계'],
    진: ['갑', '병', '계'],
    사: ['갑', '병', '계'],
    오: ['임', '갑', '병'],
    미: ['계', '병', '갑'],
    신: ['병', '계', '갑'],
    유: ['병', '계'],
    술: ['갑', '병', '계'],
    해: ['갑', '병'],
  },
  기: {
    자: ['병', '갑', '무'],
    축: ['병', '갑', '무'],
    인: ['병', '경', '갑'],
    묘: ['갑', '계', '병'],
    진: ['병', '계', '갑'],
    사: ['계', '병'],
    오: ['계', '병'],
    미: ['계', '병'],
    신: ['병', '계'],
    유: ['병', '계'],
    술: ['갑', '병', '계'],
    해: ['병', '갑', '무'],
  },
  경: {
    자: ['정', '갑', '병'],
    축: ['병', '정', '갑'],
    인: ['병', '갑', '정'],
    묘: ['정', '갑', '병', '경'],
    진: ['갑', '정', '임', '계'],
    사: ['임', '병', '정', '무'],
    오: ['임', '계'],
    미: ['정', '갑'],
    신: ['정', '갑'],
    유: ['정', '갑', '병'],
    술: ['갑', '임'],
    해: ['정', '병'],
  },
  신: {
    자: ['병', '무', '임', '갑'],
    축: ['병', '임', '무', '기'],
    인: ['기', '임', '경'],
    묘: ['임', '갑'],
    진: ['임', '갑'],
    사: ['임', '갑', '계'],
    오: ['임', '기', '계'],
    미: ['임', '경', '갑'],
    신: ['임', '갑', '무'],
    유: ['임', '갑', '정'],
    술: ['임', '갑'],
    해: ['임', '병'],
  },
  임: {
    자: ['무', '병'],
    축: ['병', '갑', '정'],
    인: ['경', '병', '무'],
    묘: ['무', '신', '경'],
    진: ['갑', '경', '병'],
    사: ['임', '신', '경', '계'],
    오: ['계', '경', '신'],
    미: ['신', '갑'],
    신: ['무', '정'],
    유: ['갑', '경'],
    술: ['갑', '병'],
    해: ['무', '병', '경'],
  },
  계: {
    자: ['병', '신'],
    축: ['병', '정'],
    인: ['신', '병'],
    묘: ['경', '신'],
    진: ['병', '신', '갑'],
    사: ['신'],
    오: ['경', '임', '계'],
    미: ['경', '신', '계'],
    신: ['정'],
    유: ['신', '병'],
    술: ['신', '갑', '계', '임'],
    해: ['경', '신', '무', '정'],
  },
});

/**
 * 일간과 절기월의 《궁통보감》 조후 후보를 전사 순서대로 반환한다.
 *
 * 반환 배열은 공유된 동결 값이다. 호출자는 이를 수정할 수 없으며, 최종
 * 용신이나 현실 예측 결과로 승격해서는 안 된다.
 */
export function getQiongtongClimateCandidates(
  dayStem: HeavenlyStem,
  monthBranch: EarthlyBranch,
): readonly HeavenlyStem[] {
  assertHeavenlyStem(dayStem, '일간(dayStem)');
  assertEarthlyBranch(monthBranch, '월지(monthBranch)');
  return QIONGTONG_CLIMATE_CANDIDATES_V1[dayStem][monthBranch];
}

export function getQiongtongClimateCellSource(
  dayStem: HeavenlyStem,
  monthBranch: EarthlyBranch,
): QiongtongClimateCellSource | null {
  assertHeavenlyStem(dayStem, '일간(dayStem)');
  assertEarthlyBranch(monthBranch, '월지(monthBranch)');
  return CURATED_CELL_SOURCES[`${dayStem}:${monthBranch}`] ?? null;
}

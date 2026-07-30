import type {
  EarthlyBranch,
  HeavenlyStem,
  SajuCandidatePillars,
  SajuPillarName,
} from 'saju-engine';
import { describe, expect, test } from 'vitest';
import type { DoctrineRuleContext } from '../../runtime/traditions/rule-evaluator-types';
import { evaluateSanmingSymbolicCuratedRule } from './evaluate';

const TRAVEL_HORSE_LITERAL_ORACLE: Readonly<Record<EarthlyBranch, EarthlyBranch>> = {
  자: '인',
  축: '해',
  인: '신',
  묘: '사',
  진: '인',
  사: '해',
  오: '신',
  미: '사',
  신: '인',
  유: '해',
  술: '신',
  해: '사',
};

const TRIAD_LITERAL_ORACLE = {
  자: {
    'sanming.travel-horse': '인',
    'sanming.general-star': '자',
    'sanming.canopy': '진',
    'sanming.xianchi': '유',
    'sanming.robbery': '사',
    'sanming.lost-spirit': '해',
    'sanming.disaster': '오',
    'sanming.six-misfortune': '묘',
  },
  인: {
    'sanming.travel-horse': '신',
    'sanming.general-star': '오',
    'sanming.canopy': '술',
    'sanming.xianchi': '묘',
    'sanming.robbery': '해',
    'sanming.lost-spirit': '사',
    'sanming.disaster': '자',
    'sanming.six-misfortune': '유',
  },
  유: {
    'sanming.travel-horse': '해',
    'sanming.general-star': '유',
    'sanming.canopy': '축',
    'sanming.xianchi': '오',
    'sanming.robbery': '인',
    'sanming.lost-spirit': '신',
    'sanming.disaster': '묘',
    'sanming.six-misfortune': '자',
  },
  묘: {
    'sanming.travel-horse': '사',
    'sanming.general-star': '묘',
    'sanming.canopy': '미',
    'sanming.xianchi': '자',
    'sanming.robbery': '신',
    'sanming.lost-spirit': '인',
    'sanming.disaster': '유',
    'sanming.six-misfortune': '오',
  },
} as const;

const BRANCHES: readonly EarthlyBranch[] = [
  '자',
  '축',
  '인',
  '묘',
  '진',
  '사',
  '오',
  '미',
  '신',
  '유',
  '술',
  '해',
];

const STEMS: readonly HeavenlyStem[] = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];

const STEM_LITERAL_ORACLE = {
  갑: {
    'sanming.heavenly-noble': ['축', '미'],
    'sanming.lu': ['인'],
    'sanming.literary-star': ['사'],
    'sanming.blade-after-lu-all-stems': ['묘'],
    'sanming.blade-yang-stems-only': ['묘'],
  },
  을: {
    'sanming.heavenly-noble': ['자', '신'],
    'sanming.lu': ['묘'],
    'sanming.literary-star': ['오'],
    'sanming.blade-after-lu-all-stems': ['진'],
    'sanming.blade-yang-stems-only': [],
  },
  병: {
    'sanming.heavenly-noble': ['유', '해'],
    'sanming.lu': ['사'],
    'sanming.literary-star': ['신'],
    'sanming.blade-after-lu-all-stems': ['오'],
    'sanming.blade-yang-stems-only': ['오'],
  },
  정: {
    'sanming.heavenly-noble': ['유', '해'],
    'sanming.lu': ['오'],
    'sanming.literary-star': ['유'],
    'sanming.blade-after-lu-all-stems': ['미'],
    'sanming.blade-yang-stems-only': [],
  },
  무: {
    'sanming.heavenly-noble': ['축', '미'],
    'sanming.lu': ['사'],
    'sanming.literary-star': ['신'],
    'sanming.blade-after-lu-all-stems': ['오'],
    'sanming.blade-yang-stems-only': ['오'],
  },
  기: {
    'sanming.heavenly-noble': ['자', '신'],
    'sanming.lu': ['오'],
    'sanming.literary-star': ['유'],
    'sanming.blade-after-lu-all-stems': ['미'],
    'sanming.blade-yang-stems-only': [],
  },
  경: {
    'sanming.heavenly-noble': ['축', '미'],
    'sanming.lu': ['신'],
    'sanming.literary-star': ['해'],
    'sanming.blade-after-lu-all-stems': ['유'],
    'sanming.blade-yang-stems-only': ['유'],
  },
  신: {
    'sanming.heavenly-noble': ['인', '오'],
    'sanming.lu': ['유'],
    'sanming.literary-star': ['자'],
    'sanming.blade-after-lu-all-stems': ['술'],
    'sanming.blade-yang-stems-only': [],
  },
  임: {
    'sanming.heavenly-noble': ['묘', '사'],
    'sanming.lu': ['해'],
    'sanming.literary-star': ['인'],
    'sanming.blade-after-lu-all-stems': ['자'],
    'sanming.blade-yang-stems-only': ['자'],
  },
  계: {
    'sanming.heavenly-noble': ['묘', '사'],
    'sanming.lu': ['자'],
    'sanming.literary-star': ['묘'],
    'sanming.blade-after-lu-all-stems': ['축'],
    'sanming.blade-yang-stems-only': [],
  },
} as const;

const SEASON_CORNER_LITERAL_ORACLE = {
  해: { 'sanming.lonely': '인', 'sanming.widow': '술' },
  인: { 'sanming.lonely': '사', 'sanming.widow': '축' },
  사: { 'sanming.lonely': '신', 'sanming.widow': '진' },
  신: { 'sanming.lonely': '해', 'sanming.widow': '미' },
} as const;

function pillar(branch: EarthlyBranch, stem: HeavenlyStem = '갑'): SajuCandidatePillars['year'] {
  return {
    branch: { korean: branch },
    stem: { korean: stem },
  } as SajuCandidatePillars['year'];
}

function context(
  branches: Readonly<Record<Exclude<SajuPillarName, 'hour'>, EarthlyBranch>> & {
    readonly hour: EarthlyBranch | null;
    readonly dayStem?: HeavenlyStem;
  },
): DoctrineRuleContext {
  return {
    pillars: {
      year: pillar(branches.year),
      month: pillar(branches.month),
      day: pillar(branches.day, branches.dayStem),
      hour: branches.hour === null ? null : pillar(branches.hour),
    },
    structure: {},
  } as DoctrineRuleContext;
}

describe('sanming-symbolic-curated 역마 원시 지지 일치', () => {
  test('연지 12개 각각에 원문 삼합국의 충지 리터럴 표를 빠짐없이 적용한다', () => {
    for (const [anchorBranch, targetBranch] of Object.entries(
      TRAVEL_HORSE_LITERAL_ORACLE,
    ) as readonly [EarthlyBranch, EarthlyBranch][]) {
      const result = evaluateSanmingSymbolicCuratedRule(
        'sanming.travel-horse',
        context({
          year: anchorBranch,
          month: targetBranch,
          day: anchorBranch,
          hour: targetBranch,
        }),
      );

      expect(result.values.anchors, anchorBranch).toEqual([
        { position: 'year', branch: anchorBranch, targetBranch },
      ]);
      expect(result.values.matches, anchorBranch).toEqual([
        {
          anchorPosition: 'year',
          anchorBranch,
          targetBranch,
          observedPosition: 'month',
        },
        {
          anchorPosition: 'year',
          anchorBranch,
          targetBranch,
          observedPosition: 'hour',
        },
      ]);
    }
  });

  test('완전한 네 지지는 연지 기준의 모든 일치 위치만 반환한다', () => {
    const result = evaluateSanmingSymbolicCuratedRule(
      'sanming.travel-horse',
      context({ year: '인', month: '신', day: '유', hour: '해' }),
    );

    expect(result).toMatchObject({
      topic: 'symbolic-stars',
      coverage: 'complete',
      omittedPillars: [],
      values: {
        symbolicStar: 'travel-horse',
        anchorMethod: 'year-branch-source-literal',
        anchors: [{ position: 'year', branch: '인', targetBranch: '신' }],
        observedPillars: [
          { position: 'year', branch: '인' },
          { position: 'month', branch: '신' },
          { position: 'day', branch: '유' },
          { position: 'hour', branch: '해' },
        ],
        matches: [
          {
            anchorPosition: 'year',
            anchorBranch: '인',
            targetBranch: '신',
            observedPosition: 'month',
          },
        ],
        status: 'raw-matches',
      },
      evidencePaths: [
        'pillars.year.branch',
        'pillars.month.branch',
        'pillars.day.branch',
        'pillars.hour.branch',
      ],
      sourceReferenceIds: ['sanming-tonghui-travel-horse-v1'],
    });
    expect(result.statement).toBe('연지 인→신 표의 일치 지지는 월지 신입니다.');
    expect(JSON.stringify(result)).not.toMatch(/이동|여행|성격|사건|예측|재물|관계/);
  });

  test('일치가 없으면 빈 원시 결과를 명시한다', () => {
    const result = evaluateSanmingSymbolicCuratedRule(
      'sanming.travel-horse',
      context({ year: '인', month: '묘', day: '유', hour: '오' }),
    );

    expect(result.values).toMatchObject({
      matches: [],
      status: 'raw-absence',
    });
    expect(result.statement).toBe('연지 인→신 표에서 일치하는 지지가 없습니다.');
  });

  test('생시 미상은 시주를 합성하지 않고 알려진 세 지지만 partial로 관찰한다', () => {
    const result = evaluateSanmingSymbolicCuratedRule(
      'sanming.travel-horse',
      context({ year: '인', month: '신', day: '유', hour: null }),
    );

    expect(result).toMatchObject({
      coverage: 'partial',
      omittedPillars: ['hour'],
      values: {
        observedPillars: [
          { position: 'year', branch: '인' },
          { position: 'month', branch: '신' },
          { position: 'day', branch: '유' },
        ],
        matches: [
          {
            anchorPosition: 'year',
            anchorBranch: '인',
            targetBranch: '신',
            observedPosition: 'month',
          },
        ],
        status: 'raw-matches-observed-partial',
      },
      evidencePaths: ['pillars.year.branch', 'pillars.month.branch', 'pillars.day.branch'],
    });
    expect(result.statement).toContain('알려진 연·월·일 지지 범위');
    expect(result.statement).toContain('시지는 미상');
    expect(JSON.stringify(result.values)).not.toContain('"position":"hour"');
  });

  test('생시 미상이고 알려진 삼주에 일치가 없으면 전체 부재로 확정하지 않는다', () => {
    const result = evaluateSanmingSymbolicCuratedRule(
      'sanming.travel-horse',
      context({ year: '인', month: '묘', day: '유', hour: null }),
    );

    expect(result).toMatchObject({
      coverage: 'partial',
      omittedPillars: ['hour'],
      values: {
        matches: [],
        status: 'indeterminate-omitted-pillar',
      },
    });
    expect(result.statement).toContain('알려진 연·월·일 지지에서는');
    expect(result.statement).toContain('전체 부재로 확정하지 않습니다');
  });
});

describe('sanming-symbolic-curated 삼합 8종 원시 지지 일치', () => {
  test('네 삼합군 각각에서 후보 지지 12개 중 원전 target 하나만 일치한다', () => {
    for (const [anchorBranch, rules] of Object.entries(TRIAD_LITERAL_ORACLE) as readonly [
      keyof typeof TRIAD_LITERAL_ORACLE,
      (typeof TRIAD_LITERAL_ORACLE)[keyof typeof TRIAD_LITERAL_ORACLE],
    ][]) {
      for (const [ruleId, targetBranch] of Object.entries(rules) as readonly [
        keyof typeof rules,
        EarthlyBranch,
      ][]) {
        for (const candidateBranch of BRANCHES) {
          const result = evaluateSanmingSymbolicCuratedRule(
            ruleId,
            context({
              year: anchorBranch,
              month: candidateBranch,
              day: '축',
              hour: '술',
            }),
          );
          const candidateMatches = (
            result.values.matches as readonly { readonly observedPosition: SajuPillarName }[]
          ).filter(({ observedPosition }) => observedPosition === 'month');

          expect(
            candidateMatches,
            `${anchorBranch}/${ruleId}/${candidateBranch}→${targetBranch}`,
          ).toHaveLength(candidateBranch === targetBranch ? 1 : 0);
        }
      }
    }
  });
});

describe('sanming-symbolic-curated 계절 모서리와 일간 표', () => {
  test('네 계절군 각각에서 고진·과숙 target만 12지 후보에 일치한다', () => {
    for (const [anchorBranch, rules] of Object.entries(SEASON_CORNER_LITERAL_ORACLE) as readonly [
      keyof typeof SEASON_CORNER_LITERAL_ORACLE,
      (typeof SEASON_CORNER_LITERAL_ORACLE)[keyof typeof SEASON_CORNER_LITERAL_ORACLE],
    ][]) {
      for (const [ruleId, targetBranch] of Object.entries(rules) as readonly [
        keyof typeof rules,
        EarthlyBranch,
      ][]) {
        for (const candidateBranch of BRANCHES) {
          const result = evaluateSanmingSymbolicCuratedRule(
            ruleId,
            context({
              year: anchorBranch,
              month: candidateBranch,
              day: '오',
              hour: '유',
            }),
          );
          const candidateMatches = (
            result.values.matches as readonly { readonly observedPosition: SajuPillarName }[]
          ).filter(({ observedPosition }) => observedPosition === 'month');

          expect(
            candidateMatches,
            `${anchorBranch}/${ruleId}/${candidateBranch}→${targetBranch}`,
          ).toHaveLength(candidateBranch === targetBranch ? 1 : 0);
        }
      }
    }
  });

  test('열 일간 각각에 천을 쌍·건록·문창·두 양인 변형의 명시적 표를 적용한다', () => {
    for (const stem of STEMS) {
      const rules = STEM_LITERAL_ORACLE[stem];
      for (const [ruleId, targetBranches] of Object.entries(rules) as readonly [
        keyof typeof rules,
        readonly EarthlyBranch[],
      ][]) {
        for (const candidateBranch of BRANCHES) {
          const result = evaluateSanmingSymbolicCuratedRule(
            ruleId,
            context({
              year: '해',
              month: candidateBranch,
              day: '오',
              hour: '유',
              dayStem: stem,
            }),
          );
          const candidateMatches = (
            result.values.matches as readonly { readonly observedPosition: SajuPillarName }[]
          ).filter(({ observedPosition }) => observedPosition === 'month');

          expect(
            candidateMatches,
            `${stem}/${ruleId}/${candidateBranch}→${targetBranches.join('·')}`,
          ).toHaveLength(targetBranches.includes(candidateBranch) ? 1 : 0);
        }
      }
    }
  });

  test('음간에서는 녹후일위 변형만 일치하고 양간전용 변형은 적용 불가를 그대로 표시한다', () => {
    const input = context({
      year: '자',
      month: '진',
      day: '축',
      hour: '술',
      dayStem: '을',
    });
    const allStems = evaluateSanmingSymbolicCuratedRule('sanming.blade-after-lu-all-stems', input);
    const yangOnly = evaluateSanmingSymbolicCuratedRule('sanming.blade-yang-stems-only', input);
    const yangOnlyUnknownHour = evaluateSanmingSymbolicCuratedRule(
      'sanming.blade-yang-stems-only',
      context({
        year: '자',
        month: '진',
        day: '축',
        hour: null,
        dayStem: '을',
      }),
    );

    expect(allStems.values).toMatchObject({
      anchors: [{ position: 'day', stem: '을', targetBranches: ['진'] }],
      status: 'raw-matches',
    });
    expect(yangOnly.values).toMatchObject({
      anchors: [{ position: 'day', stem: '을', targetBranches: [] }],
      matches: [],
      status: 'not-applicable-to-yin-stem',
    });
    expect(yangOnlyUnknownHour).toMatchObject({
      coverage: 'partial',
      omittedPillars: ['hour'],
      values: {
        status: 'not-applicable-to-yin-stem',
      },
    });
  });

  test('함지는 지지 패턴과 미확정 천간·납음 자격을 분리하고 생시 미상 subtotal을 보존한다', () => {
    const result = evaluateSanmingSymbolicCuratedRule(
      'sanming.xianchi',
      context({ year: '자', month: '유', day: '축', hour: null }),
    );

    expect(result).toMatchObject({
      coverage: 'partial',
      omittedPillars: ['hour'],
      values: {
        symbolicStar: 'xianchi',
        branchPatternMatch: true,
        sanmingQualification: 'unresolved',
        status: 'raw-matches-observed-partial',
      },
    });
    expect(JSON.stringify(result)).not.toMatch(
      /성격|연애|결혼|사건|예측|점수|확률|probability|score/u,
    );
  });
});

import type { EarthlyBranch, HeavenlyStem, SajuPillarName } from 'saju-engine';
import { canonicalJsonStringify } from '../../runtime/internal/canonical-json';
import { deepFreeze } from '../../runtime/internal/deep-freeze';
import { comparison, PILLAR_POSITIONS } from '../../runtime/traditions/rule-helpers';
import type {
  DoctrineRuleContext,
  DoctrineRuleMatch,
} from '../../runtime/traditions/rule-evaluator-types';

type SanmingTriadSymbolicRuleId =
  | 'sanming.travel-horse'
  | 'sanming.general-star'
  | 'sanming.canopy'
  | 'sanming.xianchi'
  | 'sanming.robbery'
  | 'sanming.lost-spirit'
  | 'sanming.disaster'
  | 'sanming.six-misfortune';

type SanmingSeasonCornerRuleId = 'sanming.lonely' | 'sanming.widow';

type SanmingDayStemRuleId =
  | 'sanming.heavenly-noble'
  | 'sanming.lu'
  | 'sanming.literary-star'
  | 'sanming.blade-after-lu-all-stems'
  | 'sanming.blade-yang-stems-only';

type SanmingYearBranchRuleId = SanmingTriadSymbolicRuleId | SanmingSeasonCornerRuleId;

export type SanmingSymbolicCuratedRuleId = SanmingYearBranchRuleId | SanmingDayStemRuleId;

export const SANMING_SYMBOLIC_CURATED_RULE_IDS_V1: readonly SanmingSymbolicCuratedRuleId[] =
  deepFreeze([
    'sanming.travel-horse',
    'sanming.general-star',
    'sanming.canopy',
    'sanming.xianchi',
    'sanming.robbery',
    'sanming.lost-spirit',
    'sanming.disaster',
    'sanming.six-misfortune',
    'sanming.lonely',
    'sanming.widow',
    'sanming.heavenly-noble',
    'sanming.lu',
    'sanming.literary-star',
    'sanming.blade-after-lu-all-stems',
    'sanming.blade-yang-stems-only',
  ]);

const TRIAD_SOURCE_IDS = ['sanming-tonghui-triad-symbolic-stars-v1'] as const;
const TRAVEL_HORSE_SOURCE_IDS = ['sanming-tonghui-travel-horse-v1'] as const;
const SEASON_CORNER_SOURCE_IDS = ['sanming-tonghui-lonely-widow-v1'] as const;
const HEAVENLY_NOBLE_SOURCE_IDS = ['sanming-tonghui-heavenly-noble-v1'] as const;
const LU_SOURCE_IDS = ['sanming-tonghui-lu-v1'] as const;
const LITERARY_STAR_SOURCE_IDS = ['selection-1867-literary-star-v1'] as const;
const BLADE_SOURCE_IDS = ['sanming-tonghui-blade-variants-v1'] as const;

export const SANMING_TRIAD_SYMBOLIC_STAR_BRANCH_V1: Readonly<
  Record<SanmingTriadSymbolicRuleId, Readonly<Record<EarthlyBranch, EarthlyBranch>>>
> = deepFreeze({
  'sanming.travel-horse': {
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
  },
  'sanming.general-star': {
    자: '자',
    축: '유',
    인: '오',
    묘: '묘',
    진: '자',
    사: '유',
    오: '오',
    미: '묘',
    신: '자',
    유: '유',
    술: '오',
    해: '묘',
  },
  'sanming.canopy': {
    자: '진',
    축: '축',
    인: '술',
    묘: '미',
    진: '진',
    사: '축',
    오: '술',
    미: '미',
    신: '진',
    유: '축',
    술: '술',
    해: '미',
  },
  'sanming.xianchi': {
    자: '유',
    축: '오',
    인: '묘',
    묘: '자',
    진: '유',
    사: '오',
    오: '묘',
    미: '자',
    신: '유',
    유: '오',
    술: '묘',
    해: '자',
  },
  'sanming.robbery': {
    자: '사',
    축: '인',
    인: '해',
    묘: '신',
    진: '사',
    사: '인',
    오: '해',
    미: '신',
    신: '사',
    유: '인',
    술: '해',
    해: '신',
  },
  'sanming.lost-spirit': {
    자: '해',
    축: '신',
    인: '사',
    묘: '인',
    진: '해',
    사: '신',
    오: '사',
    미: '인',
    신: '해',
    유: '신',
    술: '사',
    해: '인',
  },
  'sanming.disaster': {
    자: '오',
    축: '묘',
    인: '자',
    묘: '유',
    진: '오',
    사: '묘',
    오: '자',
    미: '유',
    신: '오',
    유: '묘',
    술: '자',
    해: '유',
  },
  'sanming.six-misfortune': {
    자: '묘',
    축: '자',
    인: '유',
    묘: '오',
    진: '묘',
    사: '자',
    오: '유',
    미: '오',
    신: '묘',
    유: '자',
    술: '유',
    해: '오',
  },
});

export const SANMING_TRAVEL_HORSE_BRANCH_V1 =
  SANMING_TRIAD_SYMBOLIC_STAR_BRANCH_V1['sanming.travel-horse'];

export const SANMING_SEASON_CORNER_BRANCH_V1: Readonly<
  Record<SanmingSeasonCornerRuleId, Readonly<Record<EarthlyBranch, EarthlyBranch>>>
> = deepFreeze({
  'sanming.lonely': {
    자: '인',
    축: '인',
    인: '사',
    묘: '사',
    진: '사',
    사: '신',
    오: '신',
    미: '신',
    신: '해',
    유: '해',
    술: '해',
    해: '인',
  },
  'sanming.widow': {
    자: '술',
    축: '술',
    인: '축',
    묘: '축',
    진: '축',
    사: '진',
    오: '진',
    미: '진',
    신: '미',
    유: '미',
    술: '미',
    해: '술',
  },
});

export const SANMING_DAY_STEM_TARGET_BRANCHES_V1: Readonly<
  Record<SanmingDayStemRuleId, Readonly<Record<HeavenlyStem, readonly EarthlyBranch[]>>>
> = deepFreeze({
  'sanming.heavenly-noble': {
    갑: ['축', '미'],
    을: ['자', '신'],
    병: ['유', '해'],
    정: ['유', '해'],
    무: ['축', '미'],
    기: ['자', '신'],
    경: ['축', '미'],
    신: ['인', '오'],
    임: ['묘', '사'],
    계: ['묘', '사'],
  },
  'sanming.lu': {
    갑: ['인'],
    을: ['묘'],
    병: ['사'],
    정: ['오'],
    무: ['사'],
    기: ['오'],
    경: ['신'],
    신: ['유'],
    임: ['해'],
    계: ['자'],
  },
  'sanming.literary-star': {
    갑: ['사'],
    을: ['오'],
    병: ['신'],
    정: ['유'],
    무: ['신'],
    기: ['유'],
    경: ['해'],
    신: ['자'],
    임: ['인'],
    계: ['묘'],
  },
  'sanming.blade-after-lu-all-stems': {
    갑: ['묘'],
    을: ['진'],
    병: ['오'],
    정: ['미'],
    무: ['오'],
    기: ['미'],
    경: ['유'],
    신: ['술'],
    임: ['자'],
    계: ['축'],
  },
  'sanming.blade-yang-stems-only': {
    갑: ['묘'],
    을: [],
    병: ['오'],
    정: [],
    무: ['오'],
    기: [],
    경: ['유'],
    신: [],
    임: ['자'],
    계: [],
  },
});

const SYMBOLIC_STAR_BY_RULE: Readonly<Record<SanmingSymbolicCuratedRuleId, string>> = deepFreeze({
  'sanming.travel-horse': 'travel-horse',
  'sanming.general-star': 'general-star',
  'sanming.canopy': 'canopy',
  'sanming.xianchi': 'xianchi',
  'sanming.robbery': 'robbery',
  'sanming.lost-spirit': 'lost-spirit',
  'sanming.disaster': 'disaster',
  'sanming.six-misfortune': 'six-misfortune',
  'sanming.lonely': 'lonely',
  'sanming.widow': 'widow',
  'sanming.heavenly-noble': 'heavenly-noble',
  'sanming.lu': 'lu',
  'sanming.literary-star': 'literary-star',
  'sanming.blade-after-lu-all-stems': 'blade',
  'sanming.blade-yang-stems-only': 'blade',
});

const BRANCH_POSITION_LABEL: Readonly<Record<SajuPillarName, string>> = {
  year: '연지',
  month: '월지',
  day: '일지',
  hour: '시지',
};

const TRIAD_RULE_IDS: ReadonlySet<string> = new Set(
  Object.keys(SANMING_TRIAD_SYMBOLIC_STAR_BRANCH_V1),
);
const SEASON_CORNER_RULE_IDS: ReadonlySet<string> = new Set(
  Object.keys(SANMING_SEASON_CORNER_BRANCH_V1),
);
const DAY_STEM_RULE_IDS: ReadonlySet<string> = new Set(
  Object.keys(SANMING_DAY_STEM_TARGET_BRANCHES_V1),
);

function isTriadRule(ruleId: string): ruleId is SanmingTriadSymbolicRuleId {
  return TRIAD_RULE_IDS.has(ruleId);
}

function isSeasonCornerRule(ruleId: string): ruleId is SanmingSeasonCornerRuleId {
  return SEASON_CORNER_RULE_IDS.has(ruleId);
}

function isDayStemRule(ruleId: string): ruleId is SanmingDayStemRuleId {
  return DAY_STEM_RULE_IDS.has(ruleId);
}

function sourceReferenceIds(ruleId: SanmingSymbolicCuratedRuleId): readonly string[] {
  if (ruleId === 'sanming.travel-horse') return TRAVEL_HORSE_SOURCE_IDS;
  if (isTriadRule(ruleId)) return TRIAD_SOURCE_IDS;
  if (isSeasonCornerRule(ruleId)) return SEASON_CORNER_SOURCE_IDS;
  if (ruleId === 'sanming.heavenly-noble') return HEAVENLY_NOBLE_SOURCE_IDS;
  if (ruleId === 'sanming.lu') return LU_SOURCE_IDS;
  if (ruleId === 'sanming.literary-star') return LITERARY_STAR_SOURCE_IDS;
  return BLADE_SOURCE_IDS;
}

export function evaluateSanmingSymbolicCuratedRule(
  ruleId: SanmingSymbolicCuratedRuleId,
  context: DoctrineRuleContext,
): DoctrineRuleMatch {
  if (!isTriadRule(ruleId) && !isSeasonCornerRule(ruleId) && !isDayStemRule(ruleId)) {
    throw new RangeError(`지원하지 않는 삼명통회 엄선 신살 규칙입니다: ${String(ruleId)}`);
  }

  const observedPillars = PILLAR_POSITIONS.flatMap((position) => {
    const pillar = context.pillars[position];
    return pillar === null ? [] : [{ position, branch: pillar.branch.korean }];
  });
  const omitted = PILLAR_POSITIONS.filter((position) => context.pillars[position] === null);
  const isStemRule = isDayStemRule(ruleId);
  const yearBranch = context.pillars.year.branch.korean;
  const dayStem = context.pillars.day.stem.korean;
  const targetBranches = isStemRule
    ? SANMING_DAY_STEM_TARGET_BRANCHES_V1[ruleId][dayStem]
    : [
        isTriadRule(ruleId)
          ? SANMING_TRIAD_SYMBOLIC_STAR_BRANCH_V1[ruleId][yearBranch]
          : SANMING_SEASON_CORNER_BRANCH_V1[ruleId][yearBranch],
      ];
  const anchors = isStemRule
    ? [
        {
          position: 'day' as const,
          stem: dayStem,
          targetBranches,
        },
      ]
    : [
        {
          position: 'year' as const,
          branch: yearBranch,
          targetBranch: targetBranches[0]!,
        },
      ];
  const matches = observedPillars.flatMap(({ position: observedPosition, branch }) =>
    targetBranches.includes(branch)
      ? [
          isStemRule
            ? {
                anchorPosition: 'day' as const,
                anchorStem: dayStem,
                targetBranch: branch,
                observedPosition,
              }
            : {
                anchorPosition: 'year' as const,
                anchorBranch: yearBranch,
                targetBranch: branch,
                observedPosition,
              },
        ]
      : [],
  );
  const notApplicable = ruleId === 'sanming.blade-yang-stems-only' && targetBranches.length === 0;
  const partial = omitted.length > 0;
  const status = notApplicable
    ? 'not-applicable-to-yin-stem'
    : partial
      ? matches.length === 0
        ? 'indeterminate-omitted-pillar'
        : 'raw-matches-observed-partial'
      : matches.length === 0
        ? 'raw-absence'
        : 'raw-matches';
  const values = {
    symbolicStar: SYMBOLIC_STAR_BY_RULE[ruleId],
    anchorMethod: isStemRule ? 'day-stem-source-literal' : 'year-branch-source-literal',
    anchors,
    observedPillars,
    matches,
    status,
    ...(ruleId === 'sanming.blade-after-lu-all-stems'
      ? { variant: 'after-lu-all-stems' }
      : ruleId === 'sanming.blade-yang-stems-only'
        ? { variant: 'yang-stems-only' }
        : {}),
    ...(ruleId === 'sanming.xianchi'
      ? {
          branchPatternMatch: matches.length > 0,
          sanmingQualification: 'unresolved',
        }
      : {}),
  } as const;
  const anchorSummary = isStemRule
    ? `일간 ${dayStem}→${targetBranches.join('·')}`
    : `연지 ${yearBranch}→${targetBranches[0]}`;
  const matchSummary = matches
    .map(
      ({ observedPosition, targetBranch }) =>
        `${BRANCH_POSITION_LABEL[observedPosition]} ${targetBranch}`,
    )
    .join('·');
  const statement = notApplicable
    ? `일간 ${dayStem}은 양간에만 쓰는 이 표의 적용 대상이 아닙니다.`
    : partial
      ? matches.length === 0
        ? `확인된 연·월·일 지지를 ${anchorSummary} 표와 대조했지만 일치하지 않았습니다. 시지를 모르므로 해당 신살이 없다고 단정하지 않습니다.`
        : `${anchorSummary} 표와 확인된 연·월·일 지지를 대조했습니다. 일치한 지지는 ${matchSummary}입니다. 시지를 모르므로 더 있는지는 판단하지 않습니다.`
      : matches.length === 0
        ? `${anchorSummary} 표에서 일치하는 지지가 없습니다.`
        : `${anchorSummary} 표와 대조한 결과, 일치한 지지는 ${matchSummary}입니다.`;
  const evidencePaths = [
    isStemRule ? 'pillars.day.stem' : 'pillars.year.branch',
    ...observedPillars.map(({ position }) => `pillars.${position}.branch`),
  ].filter((path, index, paths) => paths.indexOf(path) === index);

  return {
    key: canonicalJsonStringify(values),
    statement,
    topic: 'symbolic-stars',
    values,
    evidencePaths,
    sourceReferenceIds: sourceReferenceIds(ruleId),
    comparison: comparison(
      `${ruleId}.${isStemRule ? 'day-stem' : 'year-anchor'}.raw.v1`,
      'symbolic-star-raw-branch-match',
      ruleId,
      isStemRule ? dayStem : yearBranch,
      canonicalJsonStringify({ matches, status }),
    ),
    coverage: partial ? 'partial' : 'complete',
    omittedPillars: partial ? omitted : [],
  };
}

import type { EarthlyBranch, SajuPillarName } from 'saju-engine';
import { canonicalJsonStringify } from '../../runtime/internal/canonical-json';
import { deepFreeze } from '../../runtime/internal/deep-freeze';
import { comparison, PILLAR_POSITIONS } from '../../runtime/traditions/rule-helpers';
import type {
  DoctrineRuleContext,
  DoctrineRuleMatch,
} from '../../runtime/traditions/rule-evaluator-types';

export type SanmingSymbolicCuratedRuleId = 'sanming.travel-horse';

const TRAVEL_HORSE_SOURCE_IDS = ['sanming-tonghui-travel-horse-v1'] as const;

export const SANMING_TRAVEL_HORSE_BRANCH_V1: Readonly<Record<EarthlyBranch, EarthlyBranch>> =
  deepFreeze({
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
  });

const BRANCH_POSITION_LABEL: Readonly<Record<SajuPillarName, string>> = {
  year: '연지',
  month: '월지',
  day: '일지',
  hour: '시지',
};

export function evaluateSanmingSymbolicCuratedRule(
  ruleId: SanmingSymbolicCuratedRuleId,
  context: DoctrineRuleContext,
): DoctrineRuleMatch {
  if (ruleId !== 'sanming.travel-horse') {
    throw new RangeError(`지원하지 않는 삼명통회 엄선 신살 규칙입니다: ${String(ruleId)}`);
  }

  const anchors = [
    {
      position: 'year',
      branch: context.pillars.year.branch.korean,
      targetBranch: SANMING_TRAVEL_HORSE_BRANCH_V1[context.pillars.year.branch.korean],
    },
  ] as const;
  const observedPillars = PILLAR_POSITIONS.flatMap((position) => {
    const pillar = context.pillars[position];
    return pillar === null ? [] : [{ position, branch: pillar.branch.korean }];
  });
  const matches = anchors.flatMap(({ position: anchorPosition, branch, targetBranch }) =>
    observedPillars
      .filter(({ branch: observedBranch }) => observedBranch === targetBranch)
      .map(({ position: observedPosition }) => ({
        anchorPosition,
        anchorBranch: branch,
        targetBranch,
        observedPosition,
      })),
  );
  const omitted = PILLAR_POSITIONS.filter((position) => context.pillars[position] === null);
  const partial = omitted.length > 0;
  const status = partial
    ? matches.length === 0
      ? 'indeterminate-omitted-pillar'
      : 'raw-matches-observed-partial'
    : matches.length === 0
      ? 'raw-absence'
      : 'raw-matches';
  const values = {
    symbolicStar: 'travel-horse',
    anchorMethod: 'year-branch-source-literal',
    anchors,
    observedPillars,
    matches,
    status,
  } as const;
  const anchorSummary = anchors
    .map(
      ({ position, branch, targetBranch }) =>
        `${BRANCH_POSITION_LABEL[position]} ${branch}→${targetBranch}`,
    )
    .join('·');
  const matchSummary = matches
    .map(
      ({ observedPosition, targetBranch }) =>
        `${BRANCH_POSITION_LABEL[observedPosition]} ${targetBranch}`,
    )
    .join('·');
  const statement = partial
    ? matches.length === 0
      ? `알려진 연·월·일 지지에서는 ${anchorSummary} 표의 일치가 관찰되지 않았습니다. 시지는 미상이라 전체 부재로 확정하지 않습니다.`
      : `${anchorSummary} 표의 알려진 연·월·일 지지 범위 일치는 ${matchSummary}입니다. 시지는 미상이라 추가 일치 가능성은 판단하지 않습니다.`
    : matches.length === 0
      ? `${anchorSummary} 표에서 일치하는 지지가 없습니다.`
      : `${anchorSummary} 표의 일치 지지는 ${matchSummary}입니다.`;
  const evidencePaths = [
    'pillars.year.branch',
    ...observedPillars.map(({ position }) => `pillars.${position}.branch`),
  ].filter((path, index, paths) => paths.indexOf(path) === index);

  return {
    key: canonicalJsonStringify(values),
    statement,
    topic: 'symbolic-stars',
    values,
    evidencePaths,
    sourceReferenceIds: TRAVEL_HORSE_SOURCE_IDS,
    comparison: comparison(
      'sanming.travel-horse.year-anchor.raw.v1',
      'symbolic-star-raw-branch-match',
      'sanming-travel-horse',
      anchors[0].branch,
      canonicalJsonStringify({ matches, status }),
    ),
    coverage: partial ? 'partial' : 'complete',
    omittedPillars: omitted,
  };
}

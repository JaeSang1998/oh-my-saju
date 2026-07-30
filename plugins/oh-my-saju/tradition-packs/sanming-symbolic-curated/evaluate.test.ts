import type { EarthlyBranch, SajuCandidatePillars, SajuPillarName } from 'saju-engine';
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

function pillar(branch: EarthlyBranch): SajuCandidatePillars['year'] {
  return { branch: { korean: branch } } as SajuCandidatePillars['year'];
}

function context(
  branches: Readonly<Record<Exclude<SajuPillarName, 'hour'>, EarthlyBranch>> & {
    readonly hour: EarthlyBranch | null;
  },
): DoctrineRuleContext {
  return {
    pillars: {
      year: pillar(branches.year),
      month: pillar(branches.month),
      day: pillar(branches.day),
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

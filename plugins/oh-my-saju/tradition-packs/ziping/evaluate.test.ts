import type {
  EarthlyBranch,
  HeavenlyStem,
  SajuCandidatePillars,
  SajuPillarName,
} from 'saju-engine';
import type { PillarPosition } from 'saju-engine/advanced';
import { describe, expect, test } from 'vitest';
import type { DoctrineRuleContext } from '../../runtime/traditions/rule-evaluator-types';
import { evaluateZipingPackRule } from './evaluate';

interface PillarInput {
  readonly stem: HeavenlyStem;
  readonly branch: EarthlyBranch;
}

interface PairInput {
  readonly members: readonly [EarthlyBranch, EarthlyBranch];
  readonly positions: readonly [PillarPosition, PillarPosition];
}

function pillar({ stem, branch }: PillarInput): SajuCandidatePillars['year'] {
  return {
    branch: { korean: branch },
    stem: { korean: stem },
  } as SajuCandidatePillars['year'];
}

function context(
  pillars: Readonly<Record<Exclude<SajuPillarName, 'hour'>, PillarInput>> & {
    readonly hour: PillarInput | null;
  },
  branchClashes: readonly PairInput[] = [],
): DoctrineRuleContext {
  return {
    pillars: {
      year: pillar(pillars.year),
      month: pillar(pillars.month),
      day: pillar(pillars.day),
      hour: pillars.hour === null ? null : pillar(pillars.hour),
    },
    structure: {
      relationships: {
        stemCombinations: [],
        branchCombinations: [],
        branchClashes,
        branchPunishments: [],
        branchBreaks: [],
        branchHarms: [],
        threeHarmonies: [],
      },
    },
    solarTerm: null,
  } as unknown as DoctrineRuleContext;
}

function integrityValues(chart: DoctrineRuleContext): Record<string, unknown> {
  return evaluateZipingPackRule('ziping.pattern-integrity', chart).values as Record<
    string,
    unknown
  >;
}

describe('ziping.pattern-integrity', () => {
  test('월지가 일간의 록이면 내격 여덟 격에서 빼고 건록격으로 간다', () => {
    const chart = context({
      year: { stem: '무', branch: '진' },
      month: { stem: '병', branch: '인' },
      day: { stem: '갑', branch: '자' },
      hour: { stem: '을', branch: '해' },
    });
    const values = integrityValues(chart);
    expect(values).toMatchObject({
      pattern: '건록격',
      track: 'special',
      basis: 'lu-month-branch',
      direction: null,
      patternPriority: 'main-qi-first',
    });
    expect(evaluateZipingPackRule('ziping.pattern-integrity', chart).statement).toContain(
      '내격 여덟 격에서 빼고',
    );
  });

  test('월지가 양인이면 양인격으로 가고 관살이 하나도 없으면 파격으로 본다', () => {
    const chart = context({
      year: { stem: '갑', branch: '자' },
      month: { stem: '정', branch: '묘' },
      day: { stem: '갑', branch: '인' },
      hour: { stem: '갑', branch: '자' },
    });
    expect(integrityValues(chart)).toMatchObject({
      pattern: '양인격',
      track: 'special',
      basis: 'yang-blade-month-branch',
      direction: '역용',
      reliefGods: ['관살'],
      presentBreakingFactors: ['양인무제'],
      unrescuedBreakingFactors: ['양인무제'],
      integrity: '파격',
    });
  });

  test('본기가 투출하면 그 십신을 격으로 세우고 뿌리 있는 상신이 있으면 성격으로 본다', () => {
    const chart = context({
      year: { stem: '임', branch: '신' },
      month: { stem: '신', branch: '유' },
      day: { stem: '갑', branch: '자' },
      hour: { stem: '병', branch: '인' },
    });
    expect(integrityValues(chart)).toMatchObject({
      pattern: '정관격',
      track: 'inner-eight',
      basis: 'transparent-month-hidden-stem',
      via: 'transparent',
      sourceStem: '신',
      sourceRank: '정기',
      direction: '순용',
      presentReliefGods: ['인성'],
      rootedReliefGods: ['인성'],
      integrity: '성격',
    });
  });

  test('월지 지장간이 하나도 투출하지 않으면 본기 기준 암격으로 세운다', () => {
    const chart = context({
      year: { stem: '정', branch: '묘' },
      month: { stem: '계', branch: '유' },
      day: { stem: '갑', branch: '자' },
      hour: { stem: '갑', branch: '자' },
    });
    expect(integrityValues(chart)).toMatchObject({
      pattern: '정관격',
      basis: 'hidden-only-main-qi',
      via: 'hidden-only',
      sourceStem: '신',
      transparentPositions: [],
    });
  });

  test('월지가 충을 맞으면 정관격은 막는 글자를 두지 않아 파격이 된다', () => {
    const chart = context(
      {
        year: { stem: '임', branch: '신' },
        month: { stem: '신', branch: '유' },
        day: { stem: '갑', branch: '자' },
        hour: { stem: '을', branch: '묘' },
      },
      [{ members: ['유', '묘'], positions: ['month', 'hour'] }],
    );
    expect(integrityValues(chart)).toMatchObject({
      pattern: '정관격',
      presentBreakingFactors: ['월지충'],
      integrity: '파격',
      unresolvedReasons: ['rescue-not-modeled-for-월지충'],
    });
  });

  test('상신이 천간에 하나도 없으면 결론을 내지 않고 억부로 축을 옮긴다고 밝힌다', () => {
    const chart = context({
      year: { stem: '병', branch: '인' },
      month: { stem: '을', branch: '사' },
      day: { stem: '갑', branch: '자' },
      hour: { stem: '정', branch: '묘' },
    });
    const result = evaluateZipingPackRule('ziping.pattern-integrity', chart);
    expect(result.values).toMatchObject({
      pattern: '식신격',
      presentReliefGods: [],
      hiddenOnlyReliefGods: ['재성'],
      integrity: '격은 서지만 상신이 없어 격국으로는 결론이 나지 않음',
    });
    expect(result.statement).toContain('억부로 축을 옮겨 봅니다');
  });

  test('비겁이 투간해도 월겁격을 세우지 않고 다음 지장간·암격으로 넘어간다', () => {
    // 을축 경진 갑진 병인: 진월 갑일간.  여기 을(겁재)이 연간에 투출했지만
    // 진은 갑의 록도 양인도 비겁 본기도 아니므로 월겁격이 아니라 본기 무 기준
    // 편재격 암격으로 간다.
    const chart = context({
      year: { stem: '을', branch: '축' },
      month: { stem: '경', branch: '진' },
      day: { stem: '갑', branch: '진' },
      hour: { stem: '병', branch: '인' },
    });
    expect(integrityValues(chart)).toMatchObject({
      pattern: '편재격',
      track: 'inner-eight',
      basis: 'hidden-only-main-qi',
      sourceStem: '무',
    });
    const candidates = evaluateZipingPackRule('ziping.pattern-candidate', chart).values as Record<
      string,
      unknown
    >;
    expect(candidates.candidatePatterns).not.toContain('월겁격');
    expect(candidates.rejectedCandidates).toMatchObject([
      {
        sourceStem: '을',
        tenGod: '겁재',
        rejectionReason: 'peer-ten-god-not-established-by-transparency',
      },
    ]);
  });

  test('월지 지장간과 후보 목록을 팩의 월률분야표 하나로만 읽는다', () => {
    // 임인 병오 신묘 경인: 오의 여기 병이 월간에 투출한다.  엔진 약식표에는 병이
    // 없어 후보와 최종 격이 어긋났었다.
    const chart = context({
      year: { stem: '임', branch: '인' },
      month: { stem: '병', branch: '오' },
      day: { stem: '신', branch: '묘' },
      hour: { stem: '경', branch: '인' },
    });
    const monthCommand = evaluateZipingPackRule('ziping.month-command', chart);
    expect(monthCommand.values).toMatchObject({
      hiddenStems: ['병', '기', '정'],
      mainHiddenStem: '정',
      hiddenStemTable: 'yueling-fenye-yuanhai-v1',
    });
    const candidates = evaluateZipingPackRule('ziping.pattern-candidate', chart).values as Record<
      string,
      unknown
    >;
    const values = integrityValues(chart);
    expect(values).toMatchObject({ pattern: '정관격', sourceStem: '병', sourceRank: '여기' });
    expect(candidates.candidatePatterns).toContain('정관격');
  });

  test('제복이 지장간에만 있으면 칠살무제를 면하지 못한다', () => {
    // 무오 경신 갑인 신미: 식신·양인이 천간에 하나도 없다.
    const chart = context({
      year: { stem: '무', branch: '오' },
      month: { stem: '경', branch: '신' },
      day: { stem: '갑', branch: '인' },
      hour: { stem: '신', branch: '미' },
    });
    const result = evaluateZipingPackRule('ziping.pattern-integrity', chart);
    expect(result.values).toMatchObject({
      pattern: '칠살격',
      presentReliefGods: [],
      presentBreakingFactors: ['칠살무제'],
      integrity: '파격',
    });
    expect(result.statement).toContain('제복할 식신·양인이 천간에 드러나지 않아 칠살무제로 봅니다');
  });

  test('음간 일간에게는 겁재를 양인이라 부르지 않고 상신 후보에서 뺀다', () => {
    // 계묘 을축 정사 병오: 정 일간은 양인을 세우지 않는 음간이다.
    const chart = context({
      year: { stem: '계', branch: '묘' },
      month: { stem: '을', branch: '축' },
      day: { stem: '정', branch: '사' },
      hour: { stem: '병', branch: '오' },
    });
    const result = evaluateZipingPackRule('ziping.pattern-integrity', chart);
    expect(result.values).toMatchObject({
      pattern: '칠살격',
      reliefGods: ['식신', '양인'],
      effectiveReliefGods: ['식신'],
      excludedReliefGods: ['양인'],
      reliefGodExclusionBasis: 'yang-blade-only-for-yang-day-stems',
    });
    const reliefGod = evaluateZipingPackRule('ziping.pattern-relief-god', chart);
    expect(reliefGod.statement).not.toContain('상신은 양인입니다');
  });

  test('파격 요인 문장은 label과 근거를 겹쳐 쓰지 않는다', () => {
    const chart = context(
      {
        year: { stem: '임', branch: '신' },
        month: { stem: '신', branch: '유' },
        day: { stem: '갑', branch: '자' },
        hour: { stem: '을', branch: '묘' },
      },
      [{ members: ['유', '묘'], positions: ['month', 'hour'] }],
    );
    const statement = evaluateZipingPackRule('ziping.pattern-integrity', chart).statement;
    expect(statement).toContain('월지 유 충이 있고 막는 글자가 없습니다');
    expect(statement).not.toContain('월지 충(월지');
  });

  test('시주를 모르면 partial coverage로 표기한다', () => {
    const chart = context({
      year: { stem: '임', branch: '신' },
      month: { stem: '신', branch: '유' },
      day: { stem: '갑', branch: '자' },
      hour: null,
    });
    const result = evaluateZipingPackRule('ziping.pattern-integrity', chart);
    expect(result.coverage).toBe('partial');
    expect(result.omittedPillars).toEqual(['hour']);
  });
});

describe('ziping.pattern-relief-god', () => {
  test('상신을 이 팩의 용신으로 진술하되 플러그인 최종 용신이 아님을 밝힌다', () => {
    const chart = context({
      year: { stem: '임', branch: '신' },
      month: { stem: '신', branch: '유' },
      day: { stem: '갑', branch: '자' },
      hour: { stem: '병', branch: '인' },
    });
    const result = evaluateZipingPackRule('ziping.pattern-relief-god', chart);
    expect(result.topic).toBe('useful-god');
    expect(result.values).toMatchObject({
      pattern: '정관격',
      selectedReliefGods: ['인성'],
      scope: 'pack-local-pattern-relief-god-not-plugin-final-useful-god',
      status: 'pack-local-relief-god-selected',
    });
    expect(result.statement).toContain('자평 격국 기준으로 이 명식의 상신은 인성입니다');
    expect(result.statement).toContain('플러그인이 정한 최종 용신이 아닙니다');
  });

  test('격이 파격이면 상신을 단정하지 않고 상신 후보로 적는다', () => {
    // 정축 갑진 계축 무오: 정관격이지만 상관 갑이 투출해 파격이다.
    const chart = context({
      year: { stem: '정', branch: '축' },
      month: { stem: '갑', branch: '진' },
      day: { stem: '계', branch: '축' },
      hour: { stem: '무', branch: '오' },
    });
    const result = evaluateZipingPackRule('ziping.pattern-relief-god', chart);
    expect(result.values).toMatchObject({
      pattern: '정관격',
      integrity: '파격',
      selectedReliefGods: ['재성'],
      status: 'pack-local-relief-god-selected-but-pattern-broken',
    });
    expect(result.statement).toContain('상신 후보는 재성입니다');
    expect(result.statement).toContain('이 격은 파격이라 상신이 격을 살리지 못합니다');
  });

  test('상신이 없으면 억부 폴백을 밝히고 용신을 정하지 않는다', () => {
    const chart = context({
      year: { stem: '병', branch: '인' },
      month: { stem: '을', branch: '사' },
      day: { stem: '갑', branch: '자' },
      hour: { stem: '정', branch: '묘' },
    });
    const result = evaluateZipingPackRule('ziping.pattern-relief-god', chart);
    expect(result.values).toMatchObject({
      selectedReliefGods: [],
      status: 'relief-god-absent-fallback-to-strength-balancing',
    });
    expect(result.statement).toContain('억부로 축을 옮겨 봅니다');
    expect(result.statement).toContain('플러그인이 정한 최종 용신이 아닙니다');
  });
});

import type {
  EarthlyBranch,
  HeavenlyStem,
  SajuCandidatePillars,
  SajuPillarName,
} from 'saju-engine';
import { describe, expect, test } from 'vitest';
import type { DoctrineRuleContext } from '../../runtime/traditions/rule-evaluator-types';
import { evaluateQiongtongPackRule, QIONGTONG_HIDDEN_STEMS_V1 } from './evaluate';
import { getQiongtongClimateCandidates } from './qiongtong-table-v1';

interface PillarInput {
  readonly stem: HeavenlyStem;
  readonly branch: EarthlyBranch;
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
        branchClashes: [],
        branchPunishments: [],
        branchBreaks: [],
        branchHarms: [],
        threeHarmonies: [],
      },
    },
    solarTerm: null,
  } as unknown as DoctrineRuleContext;
}

interface ConditionValue {
  readonly stem: HeavenlyStem;
  readonly state: string;
  readonly transparent: boolean;
  readonly rooted: boolean;
}

function conditions(chart: DoctrineRuleContext): readonly ConditionValue[] {
  return evaluateQiongtongPackRule('qiongtong.candidate-condition', chart).values
    .candidateConditions as readonly ConditionValue[];
}

describe('qiongtong.candidate-condition', () => {
  test('갑 일간 사월의 조후 후보 계·정을 투간과 뿌리로 나눠 본다', () => {
    expect(getQiongtongClimateCandidates('갑', '사')).toEqual(['계', '정']);
    const chart = context({
      year: { stem: '병', branch: '자' },
      month: { stem: '계', branch: '사' },
      day: { stem: '갑', branch: '자' },
      hour: { stem: '정', branch: '묘' },
    });
    expect(conditions(chart)).toEqual([
      expect.objectContaining({
        stem: '계',
        transparent: true,
        rooted: true,
        state: 'transparent-and-rooted',
        label: '드러나고 뿌리도 있어 바로 쓸 수 있는 자리',
      }),
      expect.objectContaining({
        stem: '정',
        transparent: true,
        rooted: true,
        state: 'transparent-and-rooted',
      }),
    ]);
  });

  test('천간에 없고 지장간에만 있으면 드러나지 않은 자리로 본다', () => {
    const chart = context({
      year: { stem: '갑', branch: '자' },
      month: { stem: '갑', branch: '사' },
      day: { stem: '갑', branch: '자' },
      hour: { stem: '갑', branch: '자' },
    });
    expect(conditions(chart)).toEqual([
      expect.objectContaining({
        stem: '계',
        transparent: false,
        rooted: true,
        state: 'rooted-only',
      }),
      expect.objectContaining({
        stem: '정',
        transparent: false,
        rooted: true,
        state: 'rooted-only',
      }),
    ]);
  });

  test('투간했어도 지지에 뿌리가 없으면 힘이 약한 자리로 본다', () => {
    const chart = context({
      year: { stem: '계', branch: '묘' },
      month: { stem: '갑', branch: '사' },
      day: { stem: '갑', branch: '묘' },
      hour: null,
    });
    const values = conditions(chart);
    expect(values[0]).toMatchObject({
      stem: '계',
      transparent: true,
      rooted: false,
      state: 'transparent-only',
      label: '드러났으나 뿌리가 없어 힘이 약한 자리',
    });
    const result = evaluateQiongtongPackRule('qiongtong.candidate-condition', chart);
    expect(result.coverage).toBe('partial');
    expect(result.omittedPillars).toEqual(['hour']);
  });

  test('뿌리 판정은 이 팩의 지장간 표만 읽는다', () => {
    expect(QIONGTONG_HIDDEN_STEMS_V1['자']).toEqual(['임', '계']);
    expect(QIONGTONG_HIDDEN_STEMS_V1['사']).toEqual(['무', '경', '병']);
  });
});

describe('qiongtong.climate-tendency', () => {
  test('등급은 한난 축에만 붙이고 조습 지표에는 붙이지 않는다', () => {
    const chart = context({
      year: { stem: '무', branch: '미' },
      month: { stem: '기', branch: '미' },
      day: { stem: '무', branch: '미' },
      hour: { stem: '기', branch: '미' },
    });
    const result = evaluateQiongtongPackRule('qiongtong.climate-tendency', chart);
    expect(result.values).toMatchObject({ gradeAxis: 'temperature-only' });
    expect(result.statement).toContain('한난 조절이 급한 자리입니다. 조습 지표는');
    expect(result.statement).not.toMatch(/조습 지표는 [^.]*한난 조절이 급한 자리입니다/);
  });
});

describe('qiongtong.pack-climate-priority', () => {
  test('가장 쓸 수 있는 후보를 이 팩 기준 1순위로 두되 최종 용신이 아님을 밝힌다', () => {
    const chart = context({
      year: { stem: '병', branch: '자' },
      month: { stem: '계', branch: '사' },
      day: { stem: '갑', branch: '자' },
      hour: { stem: '정', branch: '묘' },
    });
    const result = evaluateQiongtongPackRule('qiongtong.pack-climate-priority', chart);
    expect(result.topic).toBe('useful-god');
    expect(result.values).toMatchObject({
      priorityStem: '계',
      priorityState: 'transparent-and-rooted',
      usable: true,
      tieBreak: 'candidate-state-then-transcribed-order',
      scope: 'pack-local-climate-priority-not-plugin-final-useful-god',
    });
    expect(result.statement).toContain('1순위로 봅니다');
    expect(result.statement).toContain('플러그인의 최종 용신이 아닙니다');
  });

  test('판면 대조를 하지 않은 칸이면 궁통보감 1순위라고 단언하지 않는다', () => {
    // 정:진은 큐레이트 7칸 밖이라 실험 전사다.
    const chart = context({
      year: { stem: '정', branch: '진' },
      month: { stem: '무', branch: '진' },
      day: { stem: '정', branch: '진' },
      hour: { stem: '무', branch: '진' },
    });
    const result = evaluateQiongtongPackRule('qiongtong.pack-climate-priority', chart);
    expect(result.values).toMatchObject({
      cellVerification: 'experimental-transcription-only',
      cellSourceReviewed: false,
    });
    expect(result.statement).toContain('아직 기준 판면과 대조하지 않은 실험용 전사입니다');
    expect(result.statement).toContain('이 팩 전사 기준의 1순위');
    expect(result.statement).not.toContain('궁통보감 조후용신으로는 이 자리를 1순위로 봅니다');

    const condition = evaluateQiongtongPackRule('qiongtong.candidate-condition', chart);
    expect(condition.values).toMatchObject({
      cellVerification: 'experimental-transcription-only',
      cellSourceReviewed: false,
    });
    expect(condition.statement).toContain('아직 기준 판면과 대조하지 않은 실험용 전사입니다');
  });

  test('판면 대조를 마친 칸은 대조 사실을 함께 밝힌다', () => {
    const chart = context({
      year: { stem: '병', branch: '자' },
      month: { stem: '계', branch: '사' },
      day: { stem: '갑', branch: '자' },
      hour: { stem: '정', branch: '묘' },
    });
    const result = evaluateQiongtongPackRule('qiongtong.pack-climate-priority', chart);
    expect(result.values).toMatchObject({
      cellVerification: 'source-checked-candidate-order-and-explicit-functions',
      cellSourceReviewed: true,
    });
    expect(result.statement).toContain('기준 판면과 대조한 7칸에 속합니다');
  });

  test('상태가 같으면 이 팩 전사 순서로 1순위를 정한다', () => {
    const chart = context({
      year: { stem: '갑', branch: '자' },
      month: { stem: '갑', branch: '사' },
      day: { stem: '갑', branch: '자' },
      hour: { stem: '갑', branch: '자' },
    });
    expect(
      evaluateQiongtongPackRule('qiongtong.pack-climate-priority', chart).values,
    ).toMatchObject({
      priorityStem: '계',
      priorityState: 'rooted-only',
      rankedCandidates: [
        { stem: '계', state: 'rooted-only', transcribedOrder: 1 },
        { stem: '정', state: 'rooted-only', transcribedOrder: 2 },
      ],
    });
  });
});

import type {
  EarthlyBranch,
  HeavenlyStem,
  SajuCandidatePillars,
  SajuPillarName,
} from 'saju-engine';
import type { PillarPosition } from 'saju-engine/advanced';
import { describe, expect, test } from 'vitest';
import type { DoctrineRuleContext } from '../../runtime/traditions/rule-evaluator-types';
import { evaluateDitianshuiPackRule } from './evaluate';

interface PillarInput {
  readonly stem: HeavenlyStem;
  readonly branch: EarthlyBranch;
}

interface PairInput {
  readonly members: readonly [EarthlyBranch, EarthlyBranch];
  readonly positions: readonly [PillarPosition, PillarPosition];
}

interface PunishmentInput extends PairInput {
  readonly kind: 'directed-cycle' | 'mutual' | 'self';
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
  relationships: {
    readonly branchClashes?: readonly PairInput[];
    readonly branchPunishments?: readonly PunishmentInput[];
  } = {},
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
        branchClashes: relationships.branchClashes ?? [],
        branchPunishments: relationships.branchPunishments ?? [],
        branchBreaks: [],
        branchHarms: [],
        threeHarmonies: [],
      },
    },
    solarTerm: null,
  } as unknown as DoctrineRuleContext;
}

interface RootValue {
  readonly position: PillarPosition;
  readonly branch: EarthlyBranch;
  readonly damageFactor: number;
  readonly damageReasons: readonly string[];
  readonly score: number;
}

function roots(result: { readonly values: Record<string, unknown> }): readonly RootValue[] {
  return result.values.roots as readonly RootValue[];
}

interface PatternValue {
  readonly kind: string;
  readonly name: string;
  readonly state: string;
}

function patterns(result: { readonly values: Record<string, unknown> }): readonly PatternValue[] {
  return result.values.patterns as readonly PatternValue[];
}

const ALL_WATER_PEER = {
  year: { stem: '임' as const, branch: '자' as const },
  month: { stem: '계' as const, branch: '자' as const },
  day: { stem: '임' as const, branch: '자' as const },
  hour: { stem: '임' as const, branch: '자' as const },
};

describe('ditianshui.rooting-ledger 손상 보정', () => {
  test('충은 0.5배, 형은 0.8배, 둘 다 걸리면 0.4배로 곱해 적용한다', () => {
    const base = evaluateDitianshuiPackRule('ditianshui.rooting-ledger', context(ALL_WATER_PEER));
    const clashed = evaluateDitianshuiPackRule(
      'ditianshui.rooting-ledger',
      context(ALL_WATER_PEER, {
        branchClashes: [{ members: ['자', '오'], positions: ['day', 'hour'] }],
      }),
    );
    const punished = evaluateDitianshuiPackRule(
      'ditianshui.rooting-ledger',
      context(ALL_WATER_PEER, {
        branchPunishments: [{ members: ['자', '묘'], positions: ['day', 'hour'], kind: 'mutual' }],
      }),
    );
    const both = evaluateDitianshuiPackRule(
      'ditianshui.rooting-ledger',
      context(ALL_WATER_PEER, {
        branchClashes: [{ members: ['자', '오'], positions: ['day', 'hour'] }],
        branchPunishments: [{ members: ['자', '묘'], positions: ['day', 'hour'], kind: 'mutual' }],
      }),
    );

    const dayRootOf = (result: { readonly values: Record<string, unknown> }): RootValue =>
      roots(result).find(({ position }) => position === 'day')!;
    expect(dayRootOf(base).damageFactor).toBe(1);
    expect(dayRootOf(base).damageReasons).toEqual([]);
    expect(dayRootOf(clashed).damageFactor).toBe(0.5);
    expect(dayRootOf(clashed).damageReasons).toEqual(['충(오)']);
    expect(dayRootOf(punished).damageFactor).toBe(0.8);
    expect(dayRootOf(punished).damageReasons).toEqual(['형(묘)']);
    expect(dayRootOf(both).damageFactor).toBe(0.4);
    expect(both.values.damageAdjustment).toBe('clash-0.5-punishment-0.8');
    expect(both.values.rootScore as number).toBeLessThan(base.values.rootScore as number);
    expect(both.statement).toContain('충(오)과 형(묘)');
  });

  test('합화로 오행이 바뀌는 경우는 이번에도 적용하지 않는다고 남긴다', () => {
    const result = evaluateDitianshuiPackRule('ditianshui.rooting-ledger', context(ALL_WATER_PEER));
    expect(result.values.transformedElementAdjustment).toBe('not-applied');
  });
});

describe('ditianshui.strength-verdict 100점 배점', () => {
  test('비겁만으로 채운 원국은 100점이 되어 태왕으로 본다', () => {
    const result = evaluateDitianshuiPackRule(
      'ditianshui.strength-verdict',
      context(ALL_WATER_PEER),
    );

    expect(result.values.supportScore).toBe(100);
    expect(result.values.grade).toBe('태왕');
    expect(result.values.declaredTotal).toBe(100);
    expect(result.values.strengthScoreProfile).toBe('ditianshui-position-weighted-v1');
    expect(result.statement).toContain('배점표와 임계값은 이 팩의 프로파일이며 유파마다 다릅니다');
  });

  test('시주를 모르면 시지·시간 배점을 빼고 77점을 100으로 환산해 partial로 둔다', () => {
    const result = evaluateDitianshuiPackRule(
      'ditianshui.strength-verdict',
      context({ ...ALL_WATER_PEER, hour: null }),
    );

    expect(result.values.declaredTotal).toBe(77);
    expect(result.values.supportScore).toBe(100);
    expect(result.coverage).toBe('partial');
    expect(result.omittedPillars).toEqual(['hour']);
    expect(result.statement).toContain('시주를 몰라');
  });

  test('일간을 돕지 않는 글자만 있으면 극약 구간으로 떨어진다', () => {
    const result = evaluateDitianshuiPackRule(
      'ditianshui.strength-verdict',
      context({
        year: { stem: '병', branch: '오' },
        month: { stem: '무', branch: '술' },
        day: { stem: '임', branch: '오' },
        hour: { stem: '기', branch: '미' },
      }),
    );

    expect(result.values.supportScore as number).toBeLessThan(15);
    expect(result.values.grade).toBe('극약');
  });
});

describe('ditianshui.follow-transform-patterns 종격·화격·일행득기격', () => {
  test('종왕격만 유근 조건이고 종아격은 무근 조건이라 뿌리가 남으면 성립하지 않는다', () => {
    const dominantPeer = evaluateDitianshuiPackRule(
      'ditianshui.follow-transform-patterns',
      context(ALL_WATER_PEER),
    );
    const rootlessOutput = evaluateDitianshuiPackRule(
      'ditianshui.follow-transform-patterns',
      context({
        year: { stem: '을', branch: '묘' },
        month: { stem: '을', branch: '묘' },
        day: { stem: '임', branch: '묘' },
        hour: { stem: '갑', branch: '묘' },
      }),
    );
    const rootedOutput = evaluateDitianshuiPackRule(
      'ditianshui.follow-transform-patterns',
      context({
        year: { stem: '을', branch: '자' },
        month: { stem: '을', branch: '묘' },
        day: { stem: '임', branch: '묘' },
        hour: { stem: '갑', branch: '묘' },
      }),
    );

    expect(patterns(dominantPeer)).toContainEqual(
      expect.objectContaining({ kind: 'follow', name: '종왕격', state: '성립' }),
    );
    expect(dominantPeer.values.rootScore as number).toBeGreaterThan(0.2);
    expect(patterns(rootlessOutput)).toContainEqual(
      expect.objectContaining({ kind: 'follow', name: '종아격', state: '성립' }),
    );
    expect(rootlessOutput.values.rootScore).toBe(0);
    // Same 식상 dominance, but the day master keeps a root: 종아격 must not form.
    expect(rootedOutput.values.rootScore as number).toBeGreaterThan(0.2);
    expect(patterns(rootedOutput)).toEqual([]);
    expect(rootedOutput.values.verdict).toBe('정격');
    expect(rootedOutput.statement).toContain('정격으로 봅니다');
  });

  test('화격은 월간·시간과의 합만 인정하고 년간과의 합은 인정하지 않는다', () => {
    const hourTransform = evaluateDitianshuiPackRule(
      'ditianshui.follow-transform-patterns',
      context({
        year: { stem: '병', branch: '자' },
        month: { stem: '기', branch: '사' },
        day: { stem: '갑', branch: '유' },
        hour: { stem: '무', branch: '신' },
      }),
    );
    const yearTransform = evaluateDitianshuiPackRule(
      'ditianshui.follow-transform-patterns',
      context({
        year: { stem: '기', branch: '자' },
        month: { stem: '병', branch: '사' },
        day: { stem: '갑', branch: '유' },
        hour: { stem: '무', branch: '신' },
      }),
    );

    expect(patterns(hourTransform)).toContainEqual(
      expect.objectContaining({ kind: 'transform', name: '화격(토)', state: '성립' }),
    );
    expect(hourTransform.values.transformPartnerPositions).toEqual(['month', 'hour']);
    expect(patterns(yearTransform)).toEqual([]);
    expect(yearTransform.values.transformChecks).toEqual([]);
  });

  test('일행득기격이 함께 성립하면 종격보다 앞세우고 길흉은 붙이지 않는다', () => {
    const result = evaluateDitianshuiPackRule(
      'ditianshui.follow-transform-patterns',
      context({
        year: { stem: '을', branch: '해' },
        month: { stem: '을', branch: '묘' },
        day: { stem: '갑', branch: '미' },
        hour: { stem: '갑', branch: '자' },
      }),
    );

    expect(result.values.primaryPattern).toBe('곡직격');
    expect(patterns(result)[0]).toMatchObject({ kind: 'dominant-element', name: '곡직격' });
    expect(result.values.patternPrecedence).toBe('dominant-element-then-transform-then-follow');
    expect(result.statement).toContain('길흉이나 사건 의미는 붙이지 않습니다');
  });

  test('일행득기격은 국 지지가 품은 지장간 관살이 아니라 투간 관살만으로 막는다', () => {
    // 국을 이루는 지지 자체가 관살 지장간을 품으므로(진·미의 을, 술의 정, 신·진의 무),
    // 지장간까지 합산한 관살 점수를 0으로 요구하면 가색·종혁·윤하는 영구히 성립하지 않는다.
    const cases = [
      {
        name: '가색격',
        pillars: {
          year: { stem: '무', branch: '진' },
          month: { stem: '무', branch: '술' },
          day: { stem: '무', branch: '축' },
          hour: { stem: '무', branch: '미' },
        },
      },
      {
        name: '종혁격',
        pillars: {
          year: { stem: '경', branch: '신' },
          month: { stem: '을', branch: '유' },
          day: { stem: '신', branch: '술' },
          hour: { stem: '무', branch: '술' },
        },
      },
      {
        name: '윤하격',
        pillars: {
          year: { stem: '임', branch: '신' },
          month: { stem: '임', branch: '자' },
          day: { stem: '임', branch: '진' },
          hour: { stem: '계', branch: '해' },
        },
      },
    ] as const;

    for (const { name, pillars } of cases) {
      const result = evaluateDitianshuiPackRule(
        'ditianshui.follow-transform-patterns',
        context(pillars),
      );
      expect(patterns(result)).toContainEqual(
        expect.objectContaining({ kind: 'dominant-element', name, state: '성립' }),
      );
      // 지장간 관살은 남아 있지만 투간 관살이 0점이라 국이 선다.
      expect(result.values.revealedOfficerScore).toBe(0);
      expect(
        (result.values.groupScores as Readonly<Record<string, number>>)['관살'],
      ).toBeGreaterThan(0);
      expect(result.statement).toContain('천간에 투출한 관살은 0점');
    }
  });

  test('관살이 투간하면 일행득기격은 성립하지 않는다', () => {
    // 종혁격 픽스처의 시간 무(토)를 정(화, 관살)으로 바꾸면 투간 관살이 생긴다.
    const blocked = evaluateDitianshuiPackRule(
      'ditianshui.follow-transform-patterns',
      context({
        year: { stem: '경', branch: '신' },
        month: { stem: '을', branch: '유' },
        day: { stem: '신', branch: '술' },
        hour: { stem: '정', branch: '술' },
      }),
    );

    expect(blocked.values.revealedOfficerScore as number).toBeGreaterThan(0);
    expect(patterns(blocked)).not.toContainEqual(
      expect.objectContaining({ kind: 'dominant-element' }),
    );
  });

  test('무근 서술은 뿌리 점수와 이 관법의 기준을 함께 밝힌다', () => {
    const transform = evaluateDitianshuiPackRule(
      'ditianshui.follow-transform-patterns',
      context({
        year: { stem: '병', branch: '자' },
        month: { stem: '기', branch: '사' },
        day: { stem: '갑', branch: '유' },
        hour: { stem: '무', branch: '신' },
      }),
    );

    expect(transform.statement).toContain('무근 기준(0.2 이하)에 듭니다');
    expect(transform.statement).not.toContain('뿌리를 두지 못했으며');
  });
});

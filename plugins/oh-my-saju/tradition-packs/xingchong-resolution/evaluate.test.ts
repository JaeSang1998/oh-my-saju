import type {
  EarthlyBranch,
  HeavenlyStem,
  SajuCandidatePillars,
  SajuPillarName,
} from 'saju-engine';
import type { PillarPosition } from 'saju-engine/advanced';
import { describe, expect, test } from 'vitest';
import type { DoctrineRuleContext } from '../../runtime/traditions/rule-evaluator-types';
import {
  evaluateXingchongResolutionRule,
  XINGCHONG_RELATION_TABLES_V1,
  xingchongDistanceFactor,
} from './evaluate';

type PillarInput = {
  readonly stem: HeavenlyStem;
  readonly branch: EarthlyBranch;
};

interface ClashInput {
  readonly members: readonly [EarthlyBranch, EarthlyBranch];
  readonly positions: readonly [PillarPosition, PillarPosition];
}

interface PunishmentInput extends ClashInput {
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
    readonly branchClashes?: readonly ClashInput[];
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

interface BureauValue {
  readonly kind: string;
  readonly id: string;
  readonly completeness: string;
  readonly transparent: boolean;
  readonly state: string;
}

function bureaus(result: { readonly values: Record<string, unknown> }): readonly BureauValue[] {
  return result.values.bureaus as readonly BureauValue[];
}

describe('xingchong-resolution 국 성립', () => {
  test('방합은 세 글자가 모두 있어야 성립하고 두 글자는 성립으로 보지 않는다', () => {
    const full = evaluateXingchongResolutionRule(
      'xingchong.branch-bureau',
      context({
        year: { stem: '갑', branch: '인' },
        month: { stem: '을', branch: '묘' },
        day: { stem: '병', branch: '진' },
        hour: { stem: '무', branch: '자' },
      }),
    );
    const partial = evaluateXingchongResolutionRule(
      'xingchong.branch-bureau',
      context({
        year: { stem: '갑', branch: '인' },
        month: { stem: '을', branch: '묘' },
        day: { stem: '병', branch: '자' },
        hour: { stem: '무', branch: '오' },
      }),
    );

    expect(bureaus(full)).toContainEqual(
      expect.objectContaining({ kind: 'directional', id: '인묘진', completeness: 'full' }),
    );
    expect(bureaus(partial)).toContainEqual(
      expect.objectContaining({ kind: 'directional', id: '인묘진', completeness: 'not-formed' }),
    );
    expect(partial.values.partialDirectionalBureau).toBe('not-recognized');
  });

  test('삼합 반합을 생지+왕지·왕지+고지·생지+고지 세 등급으로 나눈다', () => {
    const strongHalf = evaluateXingchongResolutionRule(
      'xingchong.branch-bureau',
      context({
        year: { stem: '갑', branch: '신' },
        month: { stem: '을', branch: '자' },
        day: { stem: '병', branch: '오' },
        hour: { stem: '무', branch: '미' },
      }),
    );
    const weakHalf = evaluateXingchongResolutionRule(
      'xingchong.branch-bureau',
      context({
        year: { stem: '갑', branch: '자' },
        month: { stem: '을', branch: '진' },
        day: { stem: '병', branch: '오' },
        hour: { stem: '무', branch: '미' },
      }),
    );
    const notFormed = evaluateXingchongResolutionRule(
      'xingchong.branch-bureau',
      context({
        year: { stem: '갑', branch: '신' },
        month: { stem: '을', branch: '진' },
        day: { stem: '병', branch: '오' },
        hour: { stem: '무', branch: '미' },
      }),
    );

    expect(bureaus(strongHalf)).toContainEqual(
      expect.objectContaining({ id: '신자진', completeness: 'strong-half' }),
    );
    expect(bureaus(weakHalf)).toContainEqual(
      expect.objectContaining({ id: '신자진', completeness: 'weak-half' }),
    );
    expect(bureaus(notFormed)).toContainEqual(
      expect.objectContaining({ id: '신자진', completeness: 'not-formed' }),
    );
  });

  test('국의 오행이 천간에 투출했는지로 manifest와 latent를 가른다', () => {
    const transparent = evaluateXingchongResolutionRule(
      'xingchong.branch-bureau',
      context({
        year: { stem: '갑', branch: '신' },
        month: { stem: '임', branch: '자' },
        day: { stem: '병', branch: '진' },
        hour: { stem: '무', branch: '오' },
      }),
    );
    const latent = evaluateXingchongResolutionRule(
      'xingchong.branch-bureau',
      context({
        year: { stem: '갑', branch: '신' },
        month: { stem: '병', branch: '자' },
        day: { stem: '무', branch: '진' },
        hour: { stem: '기', branch: '오' },
      }),
    );

    expect(bureaus(transparent)).toContainEqual(
      expect.objectContaining({ id: '신자진', transparent: true, state: 'manifest' }),
    );
    expect(bureaus(latent)).toContainEqual(
      expect.objectContaining({ id: '신자진', transparent: false, state: 'latent' }),
    );
  });

  test('갈리는 육합은 문장에도 유파가 갈린다는 사실을 남긴다', () => {
    const result = evaluateXingchongResolutionRule(
      'xingchong.branch-bureau',
      context({
        year: { stem: '갑', branch: '신' },
        month: { stem: '을', branch: '자' },
        day: { stem: '병', branch: '오' },
        hour: { stem: '무', branch: '미' },
      }),
    );

    expect(result.statement).toContain('오미합은 화신이 유파에 따라 갈리는 자리입니다');
    expect(result.statement).toContain('이 관법 토, 다른 계열 화');
  });

  test('오미 육합의 화신은 토로 두고 갈리는 자리임을 표에 남긴다', () => {
    const wumei = XINGCHONG_RELATION_TABLES_V1.sixCombinations.find(
      ({ members }) => members[0] === '오' && members[1] === '미',
    );

    expect(XINGCHONG_RELATION_TABLES_V1.wumeiTransform).toBe('earth');
    expect(wumei?.element).toBe('토');
    expect(wumei?.divergence).toBe('earth-or-fire-split');
  });
});

describe('xingchong-resolution 천간합 합화', () => {
  test('네 조건을 모두 채우면 합화로 본다', () => {
    const result = evaluateXingchongResolutionRule(
      'xingchong.stem-combination-state',
      context({
        year: { stem: '무', branch: '오' },
        month: { stem: '계', branch: '사' },
        day: { stem: '경', branch: '신' },
        hour: { stem: '경', branch: '신' },
      }),
    );
    const [combination] = result.values.combinations as readonly {
      readonly members: readonly string[];
      readonly state: string;
      readonly conditions: Record<string, boolean>;
    }[];

    expect(combination?.members).toEqual(['무', '계']);
    expect(combination?.conditions).toEqual({
      monthSupport: true,
      noAdjacentController: true,
      noStrongRoot: true,
      noContention: true,
    });
    expect(combination?.state).toBe('합화');
  });

  test('한 조건이라도 어긋나면 합이불화(기반)로 본다', () => {
    const result = evaluateXingchongResolutionRule(
      'xingchong.stem-combination-state',
      context({
        year: { stem: '무', branch: '자' },
        month: { stem: '계', branch: '자' },
        day: { stem: '경', branch: '신' },
        hour: { stem: '경', branch: '신' },
      }),
    );
    const [combination] = result.values.combinations as readonly {
      readonly state: string;
      readonly conditions: Record<string, boolean>;
      readonly rootedStems: readonly string[];
    }[];

    expect(combination?.conditions.monthSupport).toBe(false);
    expect(combination?.rootedStems).toContain('계');
    expect(combination?.state).toBe('기반');
    expect(result.statement).toContain('기반');
  });

  test('화신과 같은 오행인 천간의 통근은 무근 조건에 걸지 않는다', () => {
    const result = evaluateXingchongResolutionRule(
      'xingchong.stem-combination-state',
      context({
        year: { stem: '갑', branch: '오' },
        month: { stem: '기', branch: '미' },
        day: { stem: '병', branch: '술' },
        hour: { stem: '무', branch: '진' },
      }),
    );
    const [combination] = result.values.combinations as readonly {
      readonly members: readonly string[];
      readonly state: string;
      readonly rootedStems: readonly string[];
      readonly conditions: Record<string, boolean>;
    }[];

    expect(combination?.members).toEqual(['갑', '기']);
    // 기토는 미월 정기에 통근하지만 그 뿌리가 곧 화신이라 합화를 막지 않는다.
    expect(combination?.rootedStems).toEqual([]);
    expect(combination?.conditions.noStrongRoot).toBe(true);
    expect(combination?.state).toBe('합화');
  });

  test('본래 오행을 버려야 하는 천간이 통근하면 기반으로 본다', () => {
    const result = evaluateXingchongResolutionRule(
      'xingchong.stem-combination-state',
      context({
        year: { stem: '갑', branch: '인' },
        month: { stem: '기', branch: '미' },
        day: { stem: '병', branch: '술' },
        hour: { stem: '무', branch: '진' },
      }),
    );
    const [combination] = result.values.combinations as readonly {
      readonly state: string;
      readonly rootedStems: readonly string[];
    }[];

    expect(combination?.rootedStems).toEqual(['갑']);
    expect(combination?.state).toBe('기반');
  });

  test('떨어져 있는 천간 짝은 합화를 따지지 않고 원격으로 남긴다', () => {
    const result = evaluateXingchongResolutionRule(
      'xingchong.stem-combination-state',
      context({
        year: { stem: '갑', branch: '오' },
        month: { stem: '병', branch: '미' },
        day: { stem: '병', branch: '술' },
        hour: { stem: '기', branch: '진' },
      }),
    );
    const [combination] = result.values.combinations as readonly {
      readonly state: string;
      readonly adjacent: boolean;
      readonly distanceFactor: number;
    }[];

    expect(combination?.adjacent).toBe(false);
    expect(combination?.distanceFactor).toBe(0.2);
    expect(combination?.state).toBe('원격');
    expect(result.values.stemCombinationAdjacency).toBe('adjacent-only');
    expect(result.statement).toContain('원격');
  });

  test('같은 글자가 둘 이상이면 쟁합으로 본다', () => {
    const result = evaluateXingchongResolutionRule(
      'xingchong.stem-combination-state',
      context({
        year: { stem: '무', branch: '오' },
        month: { stem: '계', branch: '사' },
        day: { stem: '무', branch: '신' },
        hour: { stem: '경', branch: '신' },
      }),
    );
    const [combination] = result.values.combinations as readonly { readonly state: string }[];

    expect(combination?.state).toBe('쟁합');
    expect(result.statement).toContain('쟁합');
  });
});

describe('xingchong-resolution 해소 순서', () => {
  test('국에 묶인 지지의 충은 탐합망충으로 눌린 자리로 본다', () => {
    const result = evaluateXingchongResolutionRule(
      'xingchong.resolution-order',
      context(
        {
          year: { stem: '갑', branch: '사' },
          month: { stem: '을', branch: '유' },
          day: { stem: '병', branch: '축' },
          hour: { stem: '무', branch: '미' },
        },
        {
          branchClashes: [{ members: ['축', '미'], positions: ['day', 'hour'] }],
        },
      ),
    );
    const [clash] = result.values.clashes as readonly {
      readonly status: string;
      readonly reason: string | null;
      readonly distanceFactor: number;
    }[];

    expect(clash?.status).toBe('suppressed');
    expect(clash?.reason).toBe('탐합망충');
    expect(clash?.distanceFactor).toBe(1);
    expect(result.values.passes).toBe(2);
    expect(result.statement).toContain('탐합망충');
  });

  test('왕지가 충을 맞으면 국을 깨고 눌렸던 충을 다시 세운다', () => {
    const result = evaluateXingchongResolutionRule(
      'xingchong.resolution-order',
      context(
        {
          year: { stem: '갑', branch: '사' },
          month: { stem: '을', branch: '유' },
          day: { stem: '병', branch: '축' },
          hour: { stem: '무', branch: '묘' },
        },
        {
          branchClashes: [{ members: ['유', '묘'], positions: ['month', 'hour'] }],
        },
      ),
    );
    const bureauStates = result.values.bureaus as readonly {
      readonly id: string;
      readonly status: string;
      readonly reason: string | null;
    }[];
    const [clash] = result.values.clashes as readonly { readonly status: string }[];

    expect(bureauStates).toContainEqual(
      expect.objectContaining({ id: '사유축', status: 'broken', reason: '충해합' }),
    );
    expect(clash?.status).toBe('active');
    expect(result.values.passes).toBe(2);
  });

  test('형은 삼형·상형·자형을 구분하고 거리 계수를 함께 남긴다', () => {
    const result = evaluateXingchongResolutionRule(
      'xingchong.resolution-order',
      context(
        {
          year: { stem: '갑', branch: '인' },
          month: { stem: '을', branch: '사' },
          day: { stem: '병', branch: '자' },
          hour: { stem: '무', branch: '해' },
        },
        {
          branchPunishments: [
            { kind: 'directed-cycle', members: ['인', '사'], positions: ['year', 'month'] },
          ],
        },
      ),
    );
    const [punishment] = result.values.punishments as readonly {
      readonly completeness: string;
      readonly distanceFactor: number;
    }[];

    expect(punishment?.completeness).toBe('partial-pair');
    expect(punishment?.distanceFactor).toBe(1);
    expect(result.statement).toContain('두 글자만 모인 상형');
  });

  test('방합은 왕지가 충을 맞아도 깨지 않고 그 선택을 문장에 밝힌다', () => {
    const result = evaluateXingchongResolutionRule(
      'xingchong.resolution-order',
      context(
        {
          year: { stem: '갑', branch: '인' },
          month: { stem: '을', branch: '묘' },
          day: { stem: '병', branch: '진' },
          hour: { stem: '무', branch: '유' },
        },
        {
          branchClashes: [{ members: ['묘', '유'], positions: ['month', 'hour'] }],
        },
      ),
    );
    const bureauStates = result.values.bureaus as readonly {
      readonly id: string;
      readonly status: string;
    }[];

    expect(bureauStates).toContainEqual(
      expect.objectContaining({ kind: 'directional', id: '인묘진', status: 'locked' }),
    );
    expect(result.values.directionalBureauBreakPolicy).toBe('not-broken-by-clash');
    expect(result.statement).toContain('방합을 충으로 깨지 않는 국');
  });

  test('거리 계수는 인접 1.0·격각 0.5·년시 0.2로 고정한다', () => {
    expect(xingchongDistanceFactor('year', 'month')).toBe(1);
    expect(xingchongDistanceFactor('month', 'day')).toBe(1);
    expect(xingchongDistanceFactor('day', 'hour')).toBe(1);
    expect(xingchongDistanceFactor('year', 'day')).toBe(0.5);
    expect(xingchongDistanceFactor('month', 'hour')).toBe(0.5);
    expect(xingchongDistanceFactor('year', 'hour')).toBe(0.2);
  });

  test('시주를 모르면 부분 관찰로 표시한다', () => {
    const result = evaluateXingchongResolutionRule(
      'xingchong.resolution-order',
      context({
        year: { stem: '갑', branch: '신' },
        month: { stem: '을', branch: '자' },
        day: { stem: '병', branch: '진' },
        hour: null,
      }),
    );

    expect(result.coverage).toBe('partial');
    expect(result.omittedPillars).toEqual(['hour']);
  });
});

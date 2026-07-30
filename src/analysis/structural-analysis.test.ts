import { describe, expect, test } from 'vitest';
import type { FourPillars } from '../types';
import { analyzeKnownPillarStructure, analyzeStructure } from './structural-analysis';

const BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'] as const;

describe('analyzeStructure', () => {
  test('지장간과 오행 가중치, 음양, 합충해를 결정적 구조 데이터로 계산한다', () => {
    const pillars: FourPillars = {
      year: { heavenlyStem: '임', earthlyBranch: '신' },
      month: { heavenlyStem: '경', earthlyBranch: '술' },
      day: { heavenlyStem: '계', earthlyBranch: '유' },
      hour: { heavenlyStem: '을', earthlyBranch: '묘' },
    };

    const analysis = analyzeStructure(pillars);

    expect(analysis.elementBalance).toEqual({
      profileId: 'visible-stems-1-hidden-stems-normalized-v1',
      totalWeight: 8,
      scores: { 목: 2, 화: 0.1, 토: 0.7, 금: 2.9, 수: 2.3 },
      percentages: { 목: 25, 화: 1.25, 토: 8.75, 금: 36.25, 수: 28.75 },
      strongest: ['금'],
      weakest: ['화'],
    });
    expect(analysis.yinYangBalance).toEqual({
      basis: 'eight-visible-characters',
      counts: { 양: 4, 음: 4 },
      percentages: { 양: 50, 음: 50 },
    });
    expect(analysis.hiddenStems.year.map(({ stem, weight }) => ({ stem, weight }))).toEqual([
      { stem: '경', weight: 0.6 },
      { stem: '임', weight: 0.3 },
      { stem: '무', weight: 0.1 },
    ]);
    expect(analysis.relationships.stemCombinations).toContainEqual({
      positions: ['month', 'hour'],
      members: ['경', '을'],
    });
    expect(analysis.relationships.branchCombinations).toContainEqual({
      positions: ['month', 'hour'],
      members: ['술', '묘'],
    });
    expect(analysis.relationships.branchClashes).toContainEqual({
      positions: ['day', 'hour'],
      members: ['유', '묘'],
    });
    expect(analysis.relationships.branchHarms).toContainEqual({
      positions: ['month', 'day'],
      members: ['술', '유'],
    });
  });

  test('생시 미상은 연·월·일 소계만 계산하고 빠진 시주를 표시한다', () => {
    const analysis = analyzeKnownPillarStructure({
      year: { heavenlyStem: '임', earthlyBranch: '신' },
      month: { heavenlyStem: '경', earthlyBranch: '술' },
      day: { heavenlyStem: '계', earthlyBranch: '유' },
    });

    expect(analysis.knownPillars).toEqual(['year', 'month', 'day']);
    expect(analysis.omittedPillars).toEqual(['hour']);
    expect(analysis.elementBalance).toEqual({
      profileId: 'visible-stems-1-hidden-stems-normalized-v1',
      totalWeight: 6,
      scores: { 목: 0, 화: 0.1, 토: 0.7, 금: 2.9, 수: 2.3 },
      percentages: {
        목: 0,
        화: 1.666667,
        토: 11.666667,
        금: 48.333333,
        수: 38.333333,
      },
      strongest: ['금'],
      weakest: ['목'],
    });
    expect(analysis.yinYangBalance).toEqual({
      basis: 'known-visible-characters',
      totalCharacters: 6,
      counts: { 양: 4, 음: 2 },
      percentages: { 양: 66.666667, 음: 33.333333 },
    });
    expect(analysis.relationships.branchHarms).toContainEqual({
      positions: ['month', 'day'],
      members: ['술', '유'],
    });
    expect(analysis.relationships.branchClashes).toEqual([]);
  });

  test('비인접 연지·시지를 포함한 12×12 ordered pair에서 합·충·형·파·해 표를 빠짐없이 구분한다', () => {
    const combinations = new Set(['자-축', '인-해', '묘-술', '진-유', '사-신', '오-미']);
    const clashes = new Set(['자-오', '축-미', '인-신', '묘-유', '진-술', '사-해']);
    const harms = new Set(['자-미', '축-오', '인-사', '묘-진', '신-해', '유-술']);
    const breaks = new Set(['자-유', '축-진', '인-해', '묘-오', '사-신', '미-술']);
    const directedPunishments = new Set(['인-사', '사-신', '신-인', '축-술', '술-미', '미-축']);
    const selfPunishments = new Set(['진', '오', '유', '해']);

    for (const left of BRANCHES) {
      for (const right of BRANCHES) {
        const analysis = analyzeStructure({
          year: { heavenlyStem: '갑', earthlyBranch: left },
          month: { heavenlyStem: '병', earthlyBranch: '축' },
          day: { heavenlyStem: '무', earthlyBranch: '축' },
          hour: { heavenlyStem: '경', earthlyBranch: right },
        });
        const breakMatch = analysis.relationships.branchBreaks.find(
          ({ positions }) => positions[0] === 'year' && positions[1] === 'hour',
        );
        const combinationMatch = analysis.relationships.branchCombinations.find(
          ({ positions }) => positions[0] === 'year' && positions[1] === 'hour',
        );
        const clashMatch = analysis.relationships.branchClashes.find(
          ({ positions }) => positions[0] === 'year' && positions[1] === 'hour',
        );
        const harmMatch = analysis.relationships.branchHarms.find(
          ({ positions }) => positions[0] === 'year' && positions[1] === 'hour',
        );
        const punishmentMatch = analysis.relationships.branchPunishments.find(
          ({ positions }) =>
            (positions[0] === 'year' && positions[1] === 'hour') ||
            (positions[0] === 'hour' && positions[1] === 'year'),
        );
        const isPair = (oracle: ReadonlySet<string>): boolean =>
          oracle.has(`${left}-${right}`) || oracle.has(`${right}-${left}`);
        const isBreak = isPair(breaks);
        const direct = directedPunishments.has(`${left}-${right}`);
        const reverse = directedPunishments.has(`${right}-${left}`);
        const mutual = (left === '자' && right === '묘') || (left === '묘' && right === '자');
        const self = left === right && selfPunishments.has(left);

        expect(Boolean(combinationMatch), `합 ${left}-${right}`).toBe(isPair(combinations));
        expect(Boolean(clashMatch), `충 ${left}-${right}`).toBe(isPair(clashes));
        expect(Boolean(harmMatch), `해 ${left}-${right}`).toBe(isPair(harms));
        expect(Boolean(breakMatch), `파 ${left}-${right}`).toBe(isBreak);
        expect(Boolean(punishmentMatch), `형 ${left}-${right}`).toBe(
          direct || reverse || mutual || self,
        );
        if (punishmentMatch !== undefined) {
          expect(punishmentMatch.kind).toBe(self ? 'self' : mutual ? 'mutual' : 'directed-cycle');
          if (direct) expect(punishmentMatch.positions).toEqual(['year', 'hour']);
          if (reverse) expect(punishmentMatch.positions).toEqual(['hour', 'year']);
        }
      }
    }
  });

  test('인·사·신과 축·술·미의 방향형 및 같은 글자 자형을 위치와 함께 보존한다', () => {
    const directed = analyzeStructure({
      year: { heavenlyStem: '갑', earthlyBranch: '인' },
      month: { heavenlyStem: '병', earthlyBranch: '신' },
      day: { heavenlyStem: '무', earthlyBranch: '사' },
      hour: { heavenlyStem: '경', earthlyBranch: '축' },
    });
    expect(directed.relationships.branchPunishments).toEqual([
      {
        kind: 'directed-cycle',
        positions: ['year', 'day'],
        members: ['인', '사'],
      },
      {
        kind: 'directed-cycle',
        positions: ['day', 'month'],
        members: ['사', '신'],
      },
      {
        kind: 'directed-cycle',
        positions: ['month', 'year'],
        members: ['신', '인'],
      },
    ]);

    const self = analyzeStructure({
      year: { heavenlyStem: '갑', earthlyBranch: '진' },
      month: { heavenlyStem: '병', earthlyBranch: '축' },
      day: { heavenlyStem: '무', earthlyBranch: '자' },
      hour: { heavenlyStem: '경', earthlyBranch: '진' },
    });
    expect(self.relationships.branchPunishments).toContainEqual({
      kind: 'self',
      positions: ['year', 'hour'],
      members: ['진', '진'],
    });
  });
});

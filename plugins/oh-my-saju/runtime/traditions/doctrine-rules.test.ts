/** Shared deterministic Pack-rule tests. */
import { describe, expect, test } from 'vitest';
import type { EarthlyBranch, FiveElement } from 'saju-engine';
import { FIVE_ELEMENTS } from './domain';
import {
  DITIANSHUI_SEASONAL_RULER_BY_MONTH_V1,
  getDitianshuiSeasonalState,
  type DitianshuiSeasonalState,
} from './doctrine-rules';
import seasonalStateTable from '../../tradition-packs/ditianshui/seasonal-state-table.json';

const REPRESENTATIVE_MONTH: Readonly<Record<FiveElement, EarthlyBranch>> = {
  목: '인',
  화: '사',
  토: '진',
  금: '신',
  수: '해',
};

const EXPECTED: Readonly<
  Record<FiveElement, Readonly<Record<FiveElement, DitianshuiSeasonalState>>>
> = {
  목: { 목: '왕', 화: '상', 토: '사', 금: '수', 수: '휴' },
  화: { 목: '휴', 화: '왕', 토: '상', 금: '사', 수: '수' },
  토: { 목: '수', 화: '휴', 토: '왕', 금: '상', 수: '사' },
  금: { 목: '사', 화: '수', 토: '휴', 금: '왕', 수: '상' },
  수: { 목: '상', 화: '사', 토: '수', 금: '휴', 수: '왕' },
};

describe('Ditianshui seasonal evidence table', () => {
  test('旺相休囚死 25칸을 상생·상극 그래프와 동일하게 계산한다', () => {
    for (const ruler of FIVE_ELEMENTS) {
      const monthBranch = REPRESENTATIVE_MONTH[ruler];
      const observed = FIVE_ELEMENTS.map((subject) => {
        const result = getDitianshuiSeasonalState(subject, monthBranch);
        expect(result.rulerElement).toBe(ruler);
        expect(Object.isFrozen(result)).toBe(true);
        expect(result.state).toBe(EXPECTED[ruler][subject]);
        return result.state;
      });
      expect([...observed].sort()).toEqual(['사', '상', '수', '왕', '휴'].sort());
    }
  });

  test('토왕 전환 정책은 진·술·축·미로 명시되고 표가 동결된다', () => {
    expect(seasonalStateTable.schemaVersion).toBe('1');
    expect(DITIANSHUI_SEASONAL_RULER_BY_MONTH_V1).toEqual(seasonalStateTable.monthRuler);
    expect(DITIANSHUI_SEASONAL_RULER_BY_MONTH_V1).toMatchObject({
      진: '토',
      술: '토',
      축: '토',
      미: '토',
      인: '목',
      사: '화',
      신: '금',
      해: '수',
    });
    expect(Object.isFrozen(DITIANSHUI_SEASONAL_RULER_BY_MONTH_V1)).toBe(true);
  });
});

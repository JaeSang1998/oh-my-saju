import { deepFreeze } from '../internal/deep-freeze';
import type { EarthlyBranch, HeavenlyStem } from '../types';

export interface WeightedHiddenStemV1 {
  readonly stem: HeavenlyStem;
  readonly weight: number;
}

/**
 * Package-wide hidden-stem convention.
 *
 * Array order is a storage convention, not a doctrine strength ranking.
 * Weights are used only by the synthetic structural visualization profile.
 */
export const HIDDEN_STEMS_V1: Readonly<Record<EarthlyBranch, readonly WeightedHiddenStemV1[]>> =
  deepFreeze({
    자: [{ stem: '계', weight: 1 }],
    축: [
      { stem: '기', weight: 0.6 },
      { stem: '계', weight: 0.3 },
      { stem: '신', weight: 0.1 },
    ],
    인: [
      { stem: '갑', weight: 0.6 },
      { stem: '병', weight: 0.3 },
      { stem: '무', weight: 0.1 },
    ],
    묘: [{ stem: '을', weight: 1 }],
    진: [
      { stem: '무', weight: 0.6 },
      { stem: '을', weight: 0.3 },
      { stem: '계', weight: 0.1 },
    ],
    사: [
      { stem: '병', weight: 0.6 },
      { stem: '무', weight: 0.3 },
      { stem: '경', weight: 0.1 },
    ],
    오: [
      { stem: '정', weight: 0.7 },
      { stem: '기', weight: 0.3 },
    ],
    미: [
      { stem: '기', weight: 0.6 },
      { stem: '정', weight: 0.3 },
      { stem: '을', weight: 0.1 },
    ],
    신: [
      { stem: '경', weight: 0.6 },
      { stem: '임', weight: 0.3 },
      { stem: '무', weight: 0.1 },
    ],
    유: [{ stem: '신', weight: 1 }],
    술: [
      { stem: '무', weight: 0.6 },
      { stem: '신', weight: 0.3 },
      { stem: '정', weight: 0.1 },
    ],
    해: [
      { stem: '임', weight: 0.7 },
      { stem: '갑', weight: 0.3 },
    ],
  });

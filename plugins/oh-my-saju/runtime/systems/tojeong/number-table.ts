import type { EarthlyBranch, HeavenlyStem } from 'saju-engine';
import { deepFreeze } from '../../internal/deep-freeze';

export type TojeongTableKind = 'taese' | 'wolgeon' | 'iljin';

const STEM_NUMBERS: Readonly<Record<HeavenlyStem, number>> = deepFreeze({
  갑: 10,
  을: 9,
  병: 8,
  정: 7,
  무: 6,
  기: 10,
  경: 9,
  신: 8,
  임: 7,
  계: 6,
});

const BRANCH_NUMBERS: Readonly<Record<TojeongTableKind, Readonly<Record<EarthlyBranch, number>>>> =
  deepFreeze({
    taese: {
      자: 10,
      축: 12,
      인: 9,
      묘: 9,
      진: 12,
      사: 8,
      오: 8,
      미: 12,
      신: 11,
      유: 11,
      술: 12,
      해: 10,
    },
    wolgeon: {
      자: 8,
      축: 7,
      인: 6,
      묘: 5,
      진: 4,
      사: 3,
      오: 8,
      미: 7,
      신: 6,
      유: 5,
      술: 4,
      해: 3,
    },
    iljin: {
      자: 8,
      축: 11,
      인: 7,
      묘: 7,
      진: 10,
      사: 6,
      오: 6,
      미: 11,
      신: 9,
      유: 9,
      술: 10,
      해: 8,
    },
  });

export const TOJEONG_NUMBER_TABLE_DIGEST =
  'sha256:2a76fa467c20532b6d14598addd7794bf0d9d33dafa9b64eabf5d7b2b09f173e';

export function tojeongStemNumber(stem: HeavenlyStem): number {
  return STEM_NUMBERS[stem];
}

export function tojeongBranchNumber(kind: TojeongTableKind, branch: EarthlyBranch): number {
  return BRANCH_NUMBERS[kind][branch];
}

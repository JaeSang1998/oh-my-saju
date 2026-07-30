import type { EarthlyBranch } from 'saju-engine';
import { describe, expect, test } from 'vitest';
import {
  ELECTION_AZURE_DRAGON_START_BRANCH_V1,
  ELECTION_DAY_OFFICER_SEQUENCE_V1,
  dayOfficerForBranches,
  yellowBlackPathForBranches,
} from './index';

const BRANCHES: readonly EarthlyBranch[] = [
  '자',
  '축',
  '인',
  '묘',
  '진',
  '사',
  '오',
  '미',
  '신',
  '유',
  '술',
  '해',
];

const OFFICER_12_BY_12_LITERAL = [
  [
    'establish',
    'remove',
    'full',
    'balance',
    'settle',
    'hold',
    'break',
    'danger',
    'complete',
    'receive',
    'open',
    'close',
  ],
  [
    'close',
    'establish',
    'remove',
    'full',
    'balance',
    'settle',
    'hold',
    'break',
    'danger',
    'complete',
    'receive',
    'open',
  ],
  [
    'open',
    'close',
    'establish',
    'remove',
    'full',
    'balance',
    'settle',
    'hold',
    'break',
    'danger',
    'complete',
    'receive',
  ],
  [
    'receive',
    'open',
    'close',
    'establish',
    'remove',
    'full',
    'balance',
    'settle',
    'hold',
    'break',
    'danger',
    'complete',
  ],
  [
    'complete',
    'receive',
    'open',
    'close',
    'establish',
    'remove',
    'full',
    'balance',
    'settle',
    'hold',
    'break',
    'danger',
  ],
  [
    'danger',
    'complete',
    'receive',
    'open',
    'close',
    'establish',
    'remove',
    'full',
    'balance',
    'settle',
    'hold',
    'break',
  ],
  [
    'break',
    'danger',
    'complete',
    'receive',
    'open',
    'close',
    'establish',
    'remove',
    'full',
    'balance',
    'settle',
    'hold',
  ],
  [
    'hold',
    'break',
    'danger',
    'complete',
    'receive',
    'open',
    'close',
    'establish',
    'remove',
    'full',
    'balance',
    'settle',
  ],
  [
    'settle',
    'hold',
    'break',
    'danger',
    'complete',
    'receive',
    'open',
    'close',
    'establish',
    'remove',
    'full',
    'balance',
  ],
  [
    'balance',
    'settle',
    'hold',
    'break',
    'danger',
    'complete',
    'receive',
    'open',
    'close',
    'establish',
    'remove',
    'full',
  ],
  [
    'full',
    'balance',
    'settle',
    'hold',
    'break',
    'danger',
    'complete',
    'receive',
    'open',
    'close',
    'establish',
    'remove',
  ],
  [
    'remove',
    'full',
    'balance',
    'settle',
    'hold',
    'break',
    'danger',
    'complete',
    'receive',
    'open',
    'close',
    'establish',
  ],
] as const;

const AZURE_DRAGON_START_LITERAL: Readonly<Record<EarthlyBranch, EarthlyBranch>> = {
  자: '신',
  축: '술',
  인: '자',
  묘: '인',
  진: '진',
  사: '오',
  오: '신',
  미: '술',
  신: '자',
  유: '인',
  술: '진',
  해: '오',
};

describe('election classical tables', () => {
  test('12절월 × 12일지의 건제를 144개 리터럴 셀과 대조한다', () => {
    expect(ELECTION_DAY_OFFICER_SEQUENCE_V1.map(({ id }) => id)).toEqual(
      OFFICER_12_BY_12_LITERAL[0],
    );
    for (const [monthIndex, selectionMonthBranch] of BRANCHES.entries()) {
      for (const [dayIndex, dayBranch] of BRANCHES.entries()) {
        expect(
          dayOfficerForBranches(selectionMonthBranch, dayBranch).id,
          `${selectionMonthBranch}/${dayBranch}`,
        ).toBe(OFFICER_12_BY_12_LITERAL[monthIndex]![dayIndex]);
      }
    }
  });

  test('12절월 × 12일지의 청룡 기점과 황도 6·흑도 6 분류를 빠짐없이 보존한다', () => {
    expect(ELECTION_AZURE_DRAGON_START_BRANCH_V1).toEqual(AZURE_DRAGON_START_LITERAL);
    for (const selectionMonthBranch of BRANCHES) {
      const classifications = BRANCHES.map((dayBranch) =>
        yellowBlackPathForBranches(selectionMonthBranch, dayBranch),
      );
      expect(
        classifications.every(
          ({ azureDragonStartBranch }) =>
            azureDragonStartBranch === AZURE_DRAGON_START_LITERAL[selectionMonthBranch],
        ),
      ).toBe(true);
      expect(
        classifications.filter(({ classification }) => classification === 'yellow-path'),
      ).toHaveLength(6);
      expect(
        classifications.filter(({ classification }) => classification === 'black-path'),
      ).toHaveLength(6);
    }
  });
});

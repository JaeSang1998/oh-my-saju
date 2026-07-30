import type { EarthlyBranch } from 'saju-engine';
import { deepFreeze } from '../../internal/deep-freeze';
import { branchAt, branchIndex, systemModulo } from '../shared';
import type { ElectionDayOfficerId, ElectionEventType, ElectionYellowBlackDeityId } from './types';
import { OH_MY_SAJU_ELECTION_RANKING_POLICY_V1 } from './profile';

export const ELECTION_DAY_OFFICER_SEQUENCE_V1 = deepFreeze([
  { id: 'establish', hanja: '建' },
  { id: 'remove', hanja: '除' },
  { id: 'full', hanja: '滿' },
  { id: 'balance', hanja: '平' },
  { id: 'settle', hanja: '定' },
  { id: 'hold', hanja: '執' },
  { id: 'break', hanja: '破' },
  { id: 'danger', hanja: '危' },
  { id: 'complete', hanja: '成' },
  { id: 'receive', hanja: '收' },
  { id: 'open', hanja: '開' },
  { id: 'close', hanja: '閉' },
] as const satisfies readonly {
  readonly id: ElectionDayOfficerId;
  readonly hanja: string;
}[]);

const YELLOW_BLACK_DEITIES = deepFreeze([
  { id: 'azure-dragon', hanja: '青龍', classification: 'yellow-path' },
  { id: 'bright-hall', hanja: '明堂', classification: 'yellow-path' },
  { id: 'heavenly-punishment', hanja: '天刑', classification: 'black-path' },
  { id: 'vermilion-bird', hanja: '朱雀', classification: 'black-path' },
  { id: 'golden-cabinet', hanja: '金櫃', classification: 'yellow-path' },
  { id: 'heavenly-virtue', hanja: '天德', classification: 'yellow-path' },
  { id: 'white-tiger', hanja: '白虎', classification: 'black-path' },
  { id: 'jade-hall', hanja: '玉堂', classification: 'yellow-path' },
  { id: 'heavenly-prison', hanja: '天牢', classification: 'black-path' },
  { id: 'dark-warrior', hanja: '玄武', classification: 'black-path' },
  { id: 'life-command', hanja: '司命', classification: 'yellow-path' },
  { id: 'hook-array', hanja: '勾陳', classification: 'black-path' },
] as const satisfies readonly {
  readonly id: ElectionYellowBlackDeityId;
  readonly hanja: string;
  readonly classification: 'yellow-path' | 'black-path';
}[]);

export const ELECTION_AZURE_DRAGON_START_BRANCH_V1: Readonly<Record<EarthlyBranch, EarthlyBranch>> =
  deepFreeze({
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
  });

function azureDragonStartIndex(selectionMonthBranch: EarthlyBranch): number {
  return branchIndex(ELECTION_AZURE_DRAGON_START_BRANCH_V1[selectionMonthBranch]);
}

export function dayOfficerForBranches(
  selectionMonthBranch: EarthlyBranch,
  dayBranch: EarthlyBranch,
): {
  readonly id: ElectionDayOfficerId;
  readonly index: number;
  readonly hanja: string;
} {
  const index = systemModulo(branchIndex(dayBranch) - branchIndex(selectionMonthBranch), 12);
  const officer = ELECTION_DAY_OFFICER_SEQUENCE_V1[index]!;
  return { ...officer, index };
}

export function yellowBlackPathForBranches(
  selectionMonthBranch: EarthlyBranch,
  dayBranch: EarthlyBranch,
): {
  readonly deityId: ElectionYellowBlackDeityId;
  readonly deityIndex: number;
  readonly hanja: string;
  readonly classification: 'yellow-path' | 'black-path';
  readonly azureDragonStartBranch: EarthlyBranch;
} {
  const startIndex = azureDragonStartIndex(selectionMonthBranch);
  const deityIndex = systemModulo(branchIndex(dayBranch) - startIndex, 12);
  const deity = YELLOW_BLACK_DEITIES[deityIndex]!;
  return {
    deityId: deity.id,
    deityIndex,
    hanja: deity.hanja,
    classification: deity.classification,
    azureDragonStartBranch: branchAt(startIndex),
  };
}

export function officerWeight(
  eventType: ElectionEventType,
  officerId: ElectionDayOfficerId,
): number {
  return OH_MY_SAJU_ELECTION_RANKING_POLICY_V1.weights.officer[eventType][officerId];
}

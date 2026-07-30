import { deepFreeze } from '../../internal/deep-freeze';
import { TraditionalSystemError } from '../shared';
import type {
  IChingTrigram,
  IChingTrigramArrangement,
  IChingTrigramArrangementPosition,
  IChingTrigramArrangementSelection,
  IChingTrigramId,
} from './types';

const TRIGRAMS_BY_ID = deepFreeze({
  qian: { id: 'qian', hanja: '乾', symbol: '☰', bits: '111', lineOrder: 'bottom-to-top' },
  dui: { id: 'dui', hanja: '兌', symbol: '☱', bits: '110', lineOrder: 'bottom-to-top' },
  li: { id: 'li', hanja: '離', symbol: '☲', bits: '101', lineOrder: 'bottom-to-top' },
  zhen: { id: 'zhen', hanja: '震', symbol: '☳', bits: '100', lineOrder: 'bottom-to-top' },
  xun: { id: 'xun', hanja: '巽', symbol: '☴', bits: '011', lineOrder: 'bottom-to-top' },
  kan: { id: 'kan', hanja: '坎', symbol: '☵', bits: '010', lineOrder: 'bottom-to-top' },
  gen: { id: 'gen', hanja: '艮', symbol: '☶', bits: '001', lineOrder: 'bottom-to-top' },
  kun: { id: 'kun', hanja: '坤', symbol: '☷', bits: '000', lineOrder: 'bottom-to-top' },
} satisfies Readonly<Record<IChingTrigramId, IChingTrigram>>);

function position(
  direction: IChingTrigramArrangementPosition['direction'],
  trigramId: IChingTrigramId,
  number?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8,
): IChingTrigramArrangementPosition {
  return number === undefined
    ? { direction, trigram: TRIGRAMS_BY_ID[trigramId] }
    : { direction, trigram: TRIGRAMS_BY_ID[trigramId], number };
}

const SHAOYONG_XIANTIAN = deepFreeze({
  profile: {
    id: 'shaoyong-xiantian',
    version: '1.0.0',
    displayName: '소옹 선천 팔괘 배열',
    sourceIds: ['shuogua-base-text', 'shaoyong-xiantian-commentary'],
  },
  orientation: 'south-at-top',
  lineOrder: 'bottom-to-top',
  numbering: 'xiantian-sequence',
  positions: [
    position('south', 'qian', 1),
    position('southeast', 'dui', 2),
    position('east', 'li', 3),
    position('northeast', 'zhen', 4),
    position('north', 'kun', 8),
    position('northwest', 'gen', 7),
    position('west', 'kan', 6),
    position('southwest', 'xun', 5),
  ],
} satisfies IChingTrigramArrangement);

const SHUOGUA_HOUTIAN = deepFreeze({
  profile: {
    id: 'shuogua-houtian',
    version: '1.0.0',
    displayName: '《설괘》 후천 팔괘 배열',
    sourceIds: ['shuogua-base-text'],
  },
  orientation: 'south-at-top',
  lineOrder: 'bottom-to-top',
  numbering: 'none',
  excludedConventions: ['luoshu-number'],
  positions: [
    position('east', 'zhen'),
    position('southeast', 'xun'),
    position('south', 'li'),
    position('southwest', 'kun'),
    position('west', 'dui'),
    position('northwest', 'qian'),
    position('north', 'kan'),
    position('northeast', 'gen'),
  ],
} satisfies IChingTrigramArrangement);

/**
 * Looks up one explicitly selected eight-trigram directional arrangement.
 *
 * The Xiantian sequence numbers and Houtian directions are separate profiles. Luoshu numbers are
 * deliberately excluded from the Houtian v1 metadata instead of being merged into an unnamed
 * numeric table.
 */
export function getIChingTrigramArrangement(
  selection: IChingTrigramArrangementSelection,
): IChingTrigramArrangement {
  if (selection?.version !== '1.0.0') {
    throw new TraditionalSystemError(
      'UNSUPPORTED_SYSTEM_PROFILE',
      'I Ching trigram arrangements require profile version 1.0.0.',
      { path: ['trigramArrangement'] },
    );
  }
  if (selection.id === 'shaoyong-xiantian') return SHAOYONG_XIANTIAN;
  if (selection.id === 'shuogua-houtian') return SHUOGUA_HOUTIAN;
  throw new TraditionalSystemError(
    'UNSUPPORTED_SYSTEM_PROFILE',
    'Unknown I Ching trigram arrangement profile.',
    { path: ['trigramArrangement'] },
  );
}

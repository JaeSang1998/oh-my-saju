import { deepFreeze } from '../../internal/deep-freeze';
import { TraditionalSystemError } from '../shared';

const TRIGRAM_PATTERN_ORDER = deepFreeze([
  '111',
  '110',
  '101',
  '100',
  '011',
  '010',
  '001',
  '000',
] as const);

/**
 * Received King Wen numbers by upper trigram row and lower trigram column.
 * Trigrams use the classical 乾兌離震巽坎艮坤 binary order above.
 */
const KING_WEN_NUMBER_BY_UPPER_AND_LOWER = deepFreeze([
  [1, 10, 13, 25, 44, 6, 33, 12],
  [43, 58, 49, 17, 28, 47, 31, 45],
  [14, 38, 30, 21, 50, 64, 56, 35],
  [34, 54, 55, 51, 32, 40, 62, 16],
  [9, 61, 37, 42, 57, 59, 53, 20],
  [5, 60, 63, 3, 48, 29, 39, 8],
  [26, 41, 22, 27, 18, 4, 52, 23],
  [11, 19, 36, 24, 46, 7, 15, 2],
] as const);

const KING_WEN_HANJA_BY_NUMBER = deepFreeze([
  '乾',
  '坤',
  '屯',
  '蒙',
  '需',
  '訟',
  '師',
  '比',
  '小畜',
  '履',
  '泰',
  '否',
  '同人',
  '大有',
  '謙',
  '豫',
  '隨',
  '蠱',
  '臨',
  '觀',
  '噬嗑',
  '賁',
  '剝',
  '復',
  '無妄',
  '大畜',
  '頤',
  '大過',
  '坎',
  '離',
  '咸',
  '恆',
  '遯',
  '大壯',
  '晉',
  '明夷',
  '家人',
  '睽',
  '蹇',
  '解',
  '損',
  '益',
  '夬',
  '姤',
  '萃',
  '升',
  '困',
  '井',
  '革',
  '鼎',
  '震',
  '艮',
  '漸',
  '歸妹',
  '豐',
  '旅',
  '巽',
  '兌',
  '渙',
  '節',
  '中孚',
  '小過',
  '既濟',
  '未濟',
] as const);

const ALL_NUMBERS = KING_WEN_NUMBER_BY_UPPER_AND_LOWER.flat();
if (
  KING_WEN_HANJA_BY_NUMBER.length !== 64 ||
  ALL_NUMBERS.length !== 64 ||
  new Set(ALL_NUMBERS).size !== 64 ||
  ALL_NUMBERS.some((number) => number < 1 || number > 64)
) {
  throw new Error('The independent King Wen lookup must cover numbers 1 through 64 exactly once.');
}

export interface KingWenHexagramRecord {
  readonly number: number;
  readonly hanja: string;
}

export function lookupKingWenHexagram(bits: string): KingWenHexagramRecord {
  if (!/^[01]{6}$/u.test(bits)) {
    throw new TraditionalSystemError(
      'SYSTEM_INVARIANT_VIOLATION',
      `Invalid hexagram bit pattern: ${bits}.`,
    );
  }
  const lowerIndex = TRIGRAM_PATTERN_ORDER.indexOf(
    bits.slice(0, 3) as (typeof TRIGRAM_PATTERN_ORDER)[number],
  );
  const upperIndex = TRIGRAM_PATTERN_ORDER.indexOf(
    bits.slice(3, 6) as (typeof TRIGRAM_PATTERN_ORDER)[number],
  );
  const number = KING_WEN_NUMBER_BY_UPPER_AND_LOWER[upperIndex]?.[lowerIndex];
  const hanja = number === undefined ? undefined : KING_WEN_HANJA_BY_NUMBER[number - 1];
  if (number === undefined || hanja === undefined) {
    throw new TraditionalSystemError(
      'SYSTEM_INVARIANT_VIOLATION',
      `Hexagram lookup failed for bit pattern ${bits}.`,
    );
  }
  return { number, hanja };
}

import type { HeavenlyStem, SajuCandidatePillars, SajuPillarName } from 'saju-engine';
/** Shared mechanics for deterministic Pack helpers. */
import type { PillarPosition } from 'saju-engine/advanced';
import { HIDDEN_STEMS } from './domain';
import type { FindingComparisonCoordinate } from './types';

export const PILLAR_POSITIONS = ['year', 'month', 'day', 'hour'] as const;

export const PILLAR_POSITION_LABEL: Readonly<Record<PillarPosition, string>> = {
  year: '연주',
  month: '월주',
  day: '일주',
  hour: '시주',
};

export interface PositionedStem {
  readonly stem: HeavenlyStem;
  readonly position: PillarPosition;
}

export function visibleStemObservations(
  pillars: SajuCandidatePillars,
  options: { readonly includeDay: boolean },
): readonly PositionedStem[] {
  return PILLAR_POSITIONS.flatMap((position) => {
    if (!options.includeDay && position === 'day') return [];
    const pillar = pillars[position];
    return pillar === null ? [] : [{ stem: pillar.stem.korean, position }];
  });
}

export function hiddenStemObservations(pillars: SajuCandidatePillars): readonly PositionedStem[] {
  return PILLAR_POSITIONS.flatMap((position) => {
    const pillar = pillars[position];
    return pillar === null
      ? []
      : HIDDEN_STEMS[pillar.branch.korean].map(({ stem }) => ({ stem, position }));
  });
}

export function omittedPillars(pillars: SajuCandidatePillars): readonly SajuPillarName[] {
  return PILLAR_POSITIONS.filter((position) => pillars[position] === null);
}

export function comparison(
  definitionId: string,
  conceptId: string,
  methodId: string,
  subjectKey: string,
  outcomeKey: string,
): FindingComparisonCoordinate {
  return { definitionId, conceptId, methodId, subjectKey, outcomeKey };
}

/**
 * 조사(particle) selection.
 *
 * Korean particles agree with the final consonant (받침) of the word they attach
 * to. Pack statements interpolate stems, branches, element names and scores into
 * templates, so the particle has to be chosen at run time rather than hard-coded.
 *
 * Reading rules used here — these are formatting conventions, not doctrine:
 *
 * 1. **Brackets are skipped whole.** `화격(목)` agrees with `격`, and
 *    `재성(연간 계 투출, 지지 뿌리 없음)` agrees with `성`. Style guides differ on
 *    whether the particle after a parenthetical follows the head noun or the last
 *    word inside the bracket; this module standardises on the head noun in front
 *    of the bracket so that one statement never mixes both conventions.
 * 2. **Quotation marks are skipped, their contents are not.** Quoted text *is* the
 *    head noun, so `'양인'` agrees with `인`.
 * 3. **A trailing digit is read aloud in Sino-Korean** and agrees with that
 *    reading: 0 영 · 1 일 · 2 이 · 3 삼 · 4 사 · 5 오 · 6 육 · 7 칠 · 8 팔 · 9 구.
 *    For a decimal the last digit decides (`0.69` → 구 → no 받침).
 * 4. **ㄹ is tracked separately** because the adverbial particle takes `로` (not
 *    `으로`) after ㄹ: 일로 · 칠로 · 팔로 · 서울로. Every other particle treats ㄹ
 *    like any other 받침.
 * 5. Anything else (Latin letters, symbols, an empty string) falls back to
 *    "no 받침", which is the safer default for the common `-` / `%` cases.
 */
type FinalConsonantClass = 'none' | 'rieul' | 'other';

const HANGUL_SYLLABLE_START = 0xac00;
const HANGUL_SYLLABLE_END = 0xd7a3;
const HANGUL_FINAL_COUNT = 28;
/** Index of ㄹ in the 종성 table of the Hangul syllable block. */
const HANGUL_FINAL_RIEUL = 8;

const BRACKET_CLOSERS = new Set([')', ']', '}', '）', '］', '｝', '〕', '】', '》', '〉']);
const BRACKET_OPENERS = new Set(['(', '[', '{', '（', '［', '｛', '〔', '【', '《', '〈']);
const SKIPPED_MARKS = new Set([
  ' ',
  '\t',
  '\n',
  '"',
  "'",
  '`',
  '‘',
  '’',
  '“',
  '”',
  '「',
  '」',
  '『',
  '』',
]);

/** Sino-Korean reading of each digit, classified by its final consonant. */
const DIGIT_FINAL_CONSONANT: readonly FinalConsonantClass[] = [
  'other', // 0 영 (ㅇ)
  'rieul', // 1 일 (ㄹ)
  'none', // 2 이
  'other', // 3 삼 (ㅁ)
  'none', // 4 사
  'none', // 5 오
  'other', // 6 육 (ㄱ)
  'rieul', // 7 칠 (ㄹ)
  'rieul', // 8 팔 (ㄹ)
  'none', // 9 구
];

/** Classifies the 받침 of the syllable a particle would attach to. */
function finalConsonantClass(word: string): FinalConsonantClass {
  let bracketDepth = 0;
  for (let index = word.length - 1; index >= 0; index -= 1) {
    const character = word[index]!;
    if (BRACKET_CLOSERS.has(character)) {
      bracketDepth += 1;
      continue;
    }
    if (BRACKET_OPENERS.has(character)) {
      if (bracketDepth > 0) bracketDepth -= 1;
      continue;
    }
    if (bracketDepth > 0) continue;
    if (SKIPPED_MARKS.has(character)) continue;
    const code = word.charCodeAt(index);
    if (code >= HANGUL_SYLLABLE_START && code <= HANGUL_SYLLABLE_END) {
      const final = (code - HANGUL_SYLLABLE_START) % HANGUL_FINAL_COUNT;
      if (final === 0) return 'none';
      return final === HANGUL_FINAL_RIEUL ? 'rieul' : 'other';
    }
    if (character >= '0' && character <= '9') {
      return DIGIT_FINAL_CONSONANT[Number(character)]!;
    }
    return 'none';
  }
  return 'none';
}

/** True when a particle after `word` should take its 받침 form. */
export function hasFinalConsonant(word: string): boolean {
  return finalConsonantClass(word) !== 'none';
}

/** 주제 보조사: `은` / `는`. */
export function withTopicParticle(word: string): string {
  return `${word}${hasFinalConsonant(word) ? '은' : '는'}`;
}

/** 주격 조사: `이` / `가`. */
export function withSubjectParticle(word: string): string {
  return `${word}${hasFinalConsonant(word) ? '이' : '가'}`;
}

/** 목적격 조사: `을` / `를`. */
export function withObjectParticle(word: string): string {
  return `${word}${hasFinalConsonant(word) ? '을' : '를'}`;
}

/** 공동격 조사: `과` / `와`. */
export function withComitativeParticle(word: string): string {
  return `${word}${hasFinalConsonant(word) ? '과' : '와'}`;
}

/**
 * 부사격 조사: `으로` / `로`.
 * ㄹ 받침 takes the short form (일로 · 칠로 · 팔로 · 서울로).
 */
export function withAdverbialParticle(word: string): string {
  return `${word}${finalConsonantClass(word) === 'other' ? '으로' : '로'}`;
}

/** 서술격 조사(계사) + 연결어미: `이라` / `라`. */
export function withCopulaClause(word: string): string {
  return `${word}${hasFinalConsonant(word) ? '이라' : '라'}`;
}

/** Joins a list with `·` and appends the 공동격 조사 the last item calls for. */
export function joinWithComitativeParticle(items: readonly string[]): string {
  return withComitativeParticle(items.join('·'));
}

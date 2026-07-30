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

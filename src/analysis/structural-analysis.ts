import type {
  EarthlyBranch,
  FiveElement,
  FourPillars,
  HeavenlyStem,
  Pillar,
  TenGod,
  YinYang,
} from '../types';
import { FIVE_ELEMENTS } from '../constants';
import {
  getEarthlyBranchYinYang,
  getHeavenlyStemElement,
  getHeavenlyStemYinYang,
} from '../elements';
import { getTenGod } from '../features/ten-gods';
import { HIDDEN_STEMS_V1 } from '../domain/hidden-stems-v1';

export type PillarPosition = 'year' | 'month' | 'day' | 'hour';

const POSITIONS: readonly PillarPosition[] = ['year', 'month', 'day', 'hour'];

const STEM_COMBINATIONS: readonly (readonly [HeavenlyStem, HeavenlyStem])[] = [
  ['갑', '기'],
  ['을', '경'],
  ['병', '신'],
  ['정', '임'],
  ['무', '계'],
];

const BRANCH_COMBINATIONS: readonly (readonly [EarthlyBranch, EarthlyBranch])[] = [
  ['자', '축'],
  ['인', '해'],
  ['묘', '술'],
  ['진', '유'],
  ['사', '신'],
  ['오', '미'],
];

const BRANCH_CLASHES: readonly (readonly [EarthlyBranch, EarthlyBranch])[] = [
  ['자', '오'],
  ['축', '미'],
  ['인', '신'],
  ['묘', '유'],
  ['진', '술'],
  ['사', '해'],
];

const BRANCH_HARMS: readonly (readonly [EarthlyBranch, EarthlyBranch])[] = [
  ['자', '미'],
  ['축', '오'],
  ['인', '사'],
  ['묘', '진'],
  ['신', '해'],
  ['유', '술'],
];

const BRANCH_BREAKS: readonly (readonly [EarthlyBranch, EarthlyBranch])[] = [
  ['자', '유'],
  ['축', '진'],
  ['인', '해'],
  ['묘', '오'],
  ['사', '신'],
  ['미', '술'],
];

const DIRECTED_BRANCH_PUNISHMENTS: readonly (readonly [EarthlyBranch, EarthlyBranch])[] = [
  ['인', '사'],
  ['사', '신'],
  ['신', '인'],
  ['축', '술'],
  ['술', '미'],
  ['미', '축'],
];

const MUTUAL_BRANCH_PUNISHMENTS: readonly (readonly [EarthlyBranch, EarthlyBranch])[] = [
  ['자', '묘'],
];

const SELF_PUNISHMENT_BRANCHES: readonly EarthlyBranch[] = ['진', '오', '유', '해'];

const THREE_HARMONIES: readonly (readonly [EarthlyBranch, EarthlyBranch, EarthlyBranch])[] = [
  ['신', '자', '진'],
  ['해', '묘', '미'],
  ['인', '오', '술'],
  ['사', '유', '축'],
];

export interface StructuralAnalysis {
  readonly hiddenStems: Readonly<
    Record<
      PillarPosition,
      readonly {
        readonly stem: HeavenlyStem;
        readonly weight: number;
        readonly element: FiveElement;
        readonly tenGod: TenGod;
      }[]
    >
  >;
  readonly elementBalance: {
    readonly profileId: 'visible-stems-1-hidden-stems-normalized-v1';
    readonly totalWeight: 8;
    readonly scores: Readonly<Record<FiveElement, number>>;
    readonly percentages: Readonly<Record<FiveElement, number>>;
    readonly strongest: readonly FiveElement[];
    readonly weakest: readonly FiveElement[];
  };
  readonly yinYangBalance: {
    readonly basis: 'eight-visible-characters';
    readonly counts: Readonly<Record<YinYang, number>>;
    readonly percentages: Readonly<Record<YinYang, number>>;
  };
  readonly relationships: {
    readonly stemCombinations: readonly StemPairRelationship[];
    readonly branchCombinations: readonly BranchPairRelationship[];
    readonly branchClashes: readonly BranchPairRelationship[];
    /**
     * Raw directed/mutual/self-punishment table matches. `positions` follows
     * the canonical member direction rather than pillar chronology.
     */
    readonly branchPunishments: readonly BranchPunishmentRelationship[];
    readonly branchBreaks: readonly BranchPairRelationship[];
    readonly branchHarms: readonly BranchPairRelationship[];
    readonly threeHarmonies: readonly {
      readonly positions: readonly PillarPosition[];
      readonly members: readonly EarthlyBranch[];
    }[];
  };
}

/** Structural subtotal for the pillars that are actually known. */
export interface KnownPillarStructuralAnalysis {
  readonly knownPillars: readonly PillarPosition[];
  readonly omittedPillars: readonly PillarPosition[];
  readonly hiddenStems: Readonly<
    Partial<
      Record<
        PillarPosition,
        readonly {
          readonly stem: HeavenlyStem;
          readonly weight: number;
          readonly element: FiveElement;
          readonly tenGod: TenGod;
        }[]
      >
    >
  >;
  readonly elementBalance: {
    readonly profileId: 'visible-stems-1-hidden-stems-normalized-v1';
    readonly totalWeight: number;
    readonly scores: Readonly<Record<FiveElement, number>>;
    readonly percentages: Readonly<Record<FiveElement, number>>;
    readonly strongest: readonly FiveElement[];
    readonly weakest: readonly FiveElement[];
  };
  readonly yinYangBalance: {
    readonly basis: 'known-visible-characters';
    readonly totalCharacters: number;
    readonly counts: Readonly<Record<YinYang, number>>;
    readonly percentages: Readonly<Record<YinYang, number>>;
  };
  readonly relationships: StructuralAnalysis['relationships'];
}

interface StemPairRelationship {
  readonly positions: readonly [PillarPosition, PillarPosition];
  readonly members: readonly [HeavenlyStem, HeavenlyStem];
}

interface BranchPairRelationship {
  readonly positions: readonly [PillarPosition, PillarPosition];
  readonly members: readonly [EarthlyBranch, EarthlyBranch];
}

interface BranchPunishmentRelationship extends BranchPairRelationship {
  readonly kind: 'directed-cycle' | 'mutual' | 'self';
}

export type PillarPairPunishmentDirection = 'left-to-right' | 'right-to-left' | 'mutual' | 'self';

/**
 * Raw table matches for exactly two pillars.
 *
 * This deliberately reports coexistence (for example, a pair may be both a
 * combination and a break) without assigning strength, auspiciousness, or
 * predictive meaning.
 */
export interface PillarPairRelationshipAnalysis {
  readonly stemCombination: boolean;
  readonly branchCombination: boolean;
  readonly branchClash: boolean;
  readonly branchPunishment: {
    readonly kind: 'directed-cycle' | 'mutual' | 'self';
    readonly direction: PillarPairPunishmentDirection;
  } | null;
  readonly branchBreak: boolean;
  readonly branchHarm: boolean;
}

function isPair<T>(left: T, right: T, pairs: readonly (readonly [T, T])[]): boolean {
  return pairs.some(
    ([first, second]) =>
      (left === first && right === second) || (left === second && right === first),
  );
}

/** Analyzes one ordered pillar pair against the shared structural tables. */
export function analyzePillarPairRelationships(
  left: Pillar,
  right: Pillar,
): PillarPairRelationshipAnalysis {
  const leftBranch = left.earthlyBranch;
  const rightBranch = right.earthlyBranch;
  let branchPunishment: PillarPairRelationshipAnalysis['branchPunishment'] = null;

  if (leftBranch === rightBranch && SELF_PUNISHMENT_BRANCHES.includes(leftBranch)) {
    branchPunishment = { kind: 'self', direction: 'self' };
  } else if (
    DIRECTED_BRANCH_PUNISHMENTS.some(
      ([fromBranch, toBranch]) => leftBranch === fromBranch && rightBranch === toBranch,
    )
  ) {
    branchPunishment = { kind: 'directed-cycle', direction: 'left-to-right' };
  } else if (
    DIRECTED_BRANCH_PUNISHMENTS.some(
      ([fromBranch, toBranch]) => rightBranch === fromBranch && leftBranch === toBranch,
    )
  ) {
    branchPunishment = { kind: 'directed-cycle', direction: 'right-to-left' };
  } else if (isPair(leftBranch, rightBranch, MUTUAL_BRANCH_PUNISHMENTS)) {
    branchPunishment = { kind: 'mutual', direction: 'mutual' };
  }

  return {
    stemCombination: isPair(left.heavenlyStem, right.heavenlyStem, STEM_COMBINATIONS),
    branchCombination: isPair(leftBranch, rightBranch, BRANCH_COMBINATIONS),
    branchClash: isPair(leftBranch, rightBranch, BRANCH_CLASHES),
    branchPunishment,
    branchBreak: isPair(leftBranch, rightBranch, BRANCH_BREAKS),
    branchHarm: isPair(leftBranch, rightBranch, BRANCH_HARMS),
  };
}

function rounded(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function pairRelationships<T extends HeavenlyStem | EarthlyBranch>(
  values: Readonly<Record<PillarPosition, T>>,
  pairs: readonly (readonly [T, T])[],
): readonly {
  readonly positions: readonly [PillarPosition, PillarPosition];
  readonly members: readonly [T, T];
}[] {
  const relationships: {
    positions: [PillarPosition, PillarPosition];
    members: [T, T];
  }[] = [];
  for (let leftIndex = 0; leftIndex < POSITIONS.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < POSITIONS.length; rightIndex += 1) {
      const leftPosition = POSITIONS[leftIndex];
      const rightPosition = POSITIONS[rightIndex];
      if (leftPosition === undefined || rightPosition === undefined) continue;
      const left = values[leftPosition];
      const right = values[rightPosition];
      if (isPair(left, right, pairs)) {
        relationships.push({
          positions: [leftPosition, rightPosition],
          members: [left, right],
        });
      }
    }
  }
  return relationships;
}

function knownPairRelationships<T extends HeavenlyStem | EarthlyBranch>(
  positions: readonly PillarPosition[],
  values: Readonly<Partial<Record<PillarPosition, T>>>,
  pairs: readonly (readonly [T, T])[],
): readonly {
  readonly positions: readonly [PillarPosition, PillarPosition];
  readonly members: readonly [T, T];
}[] {
  const relationships: {
    positions: [PillarPosition, PillarPosition];
    members: [T, T];
  }[] = [];
  for (let leftIndex = 0; leftIndex < positions.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < positions.length; rightIndex += 1) {
      const leftPosition = positions[leftIndex];
      const rightPosition = positions[rightIndex];
      if (leftPosition === undefined || rightPosition === undefined) continue;
      const left = values[leftPosition];
      const right = values[rightPosition];
      if (left !== undefined && right !== undefined && isPair(left, right, pairs)) {
        relationships.push({
          positions: [leftPosition, rightPosition],
          members: [left, right],
        });
      }
    }
  }
  return relationships;
}

function branchPunishmentRelationships(
  positions: readonly PillarPosition[],
  values: Readonly<Partial<Record<PillarPosition, EarthlyBranch>>>,
): readonly BranchPunishmentRelationship[] {
  const relationships: BranchPunishmentRelationship[] = [];
  const positionsFor = (branch: EarthlyBranch): readonly PillarPosition[] =>
    positions.filter((position) => values[position] === branch);

  for (const [fromBranch, toBranch] of DIRECTED_BRANCH_PUNISHMENTS) {
    for (const fromPosition of positionsFor(fromBranch)) {
      for (const toPosition of positionsFor(toBranch)) {
        relationships.push({
          kind: 'directed-cycle',
          positions: [fromPosition, toPosition],
          members: [fromBranch, toBranch],
        });
      }
    }
  }

  for (const [leftBranch, rightBranch] of MUTUAL_BRANCH_PUNISHMENTS) {
    for (const leftPosition of positionsFor(leftBranch)) {
      for (const rightPosition of positionsFor(rightBranch)) {
        relationships.push({
          kind: 'mutual',
          positions: [leftPosition, rightPosition],
          members: [leftBranch, rightBranch],
        });
      }
    }
  }

  for (const branch of SELF_PUNISHMENT_BRANCHES) {
    const matchingPositions = positionsFor(branch);
    for (let leftIndex = 0; leftIndex < matchingPositions.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < matchingPositions.length; rightIndex += 1) {
        relationships.push({
          kind: 'self',
          positions: [matchingPositions[leftIndex]!, matchingPositions[rightIndex]!],
          members: [branch, branch],
        });
      }
    }
  }

  return relationships;
}

/**
 * Computes only the subtotal supported by known pillars.
 *
 * This is used for unknown birth time: year/month/day facts remain available,
 * while `omittedPillars` makes it explicit that the result is not a complete
 * eight-character chart.
 */
export function analyzeKnownPillarStructure(
  pillars: Readonly<Partial<Record<PillarPosition, Pillar>>>,
): KnownPillarStructuralAnalysis {
  const day = pillars.day;
  if (day === undefined) {
    throw new TypeError('analyzeKnownPillarStructure requires a day pillar.');
  }
  const knownPillars = POSITIONS.filter((position) => pillars[position] !== undefined);
  const omittedPillars = POSITIONS.filter((position) => pillars[position] === undefined);
  const stems: Partial<Record<PillarPosition, HeavenlyStem>> = {};
  const branches: Partial<Record<PillarPosition, EarthlyBranch>> = {};
  const hiddenStems: Partial<
    Record<
      PillarPosition,
      NonNullable<KnownPillarStructuralAnalysis['hiddenStems'][PillarPosition]>
    >
  > = {};

  for (const position of knownPillars) {
    const pillar = pillars[position]!;
    stems[position] = pillar.heavenlyStem;
    branches[position] = pillar.earthlyBranch;
    hiddenStems[position] = HIDDEN_STEMS_V1[pillar.earthlyBranch].map(({ stem, weight }) => ({
      stem,
      weight,
      element: getHeavenlyStemElement(stem),
      tenGod: getTenGod(day.heavenlyStem, stem),
    }));
  }

  const scores: Record<FiveElement, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const position of knownPillars) {
    scores[getHeavenlyStemElement(stems[position]!)] += 1;
    for (const hidden of hiddenStems[position] ?? []) scores[hidden.element] += hidden.weight;
  }
  for (const element of FIVE_ELEMENTS) scores[element] = rounded(scores[element]);
  const totalWeight = knownPillars.length * 2;
  const percentages: Record<FiveElement, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const element of FIVE_ELEMENTS) {
    percentages[element] = rounded((scores[element] / totalWeight) * 100);
  }
  const maximum = Math.max(...FIVE_ELEMENTS.map((element) => scores[element]));
  const minimum = Math.min(...FIVE_ELEMENTS.map((element) => scores[element]));

  const counts: Record<YinYang, number> = { 양: 0, 음: 0 };
  for (const position of knownPillars) {
    counts[getHeavenlyStemYinYang(stems[position]!)] += 1;
    counts[getEarthlyBranchYinYang(branches[position]!)] += 1;
  }
  const totalCharacters = knownPillars.length * 2;
  const threeHarmonies: {
    positions: PillarPosition[];
    members: EarthlyBranch[];
  }[] = [];
  for (const members of THREE_HARMONIES) {
    const matchingPositions = members.map((member) =>
      knownPillars.find((position) => branches[position] === member),
    );
    if (matchingPositions.every((position) => position !== undefined)) {
      threeHarmonies.push({
        positions: matchingPositions as PillarPosition[],
        members: [...members],
      });
    }
  }

  return {
    knownPillars,
    omittedPillars,
    hiddenStems,
    elementBalance: {
      profileId: 'visible-stems-1-hidden-stems-normalized-v1',
      totalWeight,
      scores,
      percentages,
      strongest: FIVE_ELEMENTS.filter((element) => scores[element] === maximum),
      weakest: FIVE_ELEMENTS.filter((element) => scores[element] === minimum),
    },
    yinYangBalance: {
      basis: 'known-visible-characters',
      totalCharacters,
      counts,
      percentages: {
        양: rounded((counts.양 / totalCharacters) * 100),
        음: rounded((counts.음 / totalCharacters) * 100),
      },
    },
    relationships: {
      stemCombinations: knownPairRelationships(knownPillars, stems, STEM_COMBINATIONS),
      branchCombinations: knownPairRelationships(knownPillars, branches, BRANCH_COMBINATIONS),
      branchClashes: knownPairRelationships(knownPillars, branches, BRANCH_CLASHES),
      branchPunishments: branchPunishmentRelationships(knownPillars, branches),
      branchBreaks: knownPairRelationships(knownPillars, branches, BRANCH_BREAKS),
      branchHarms: knownPairRelationships(knownPillars, branches, BRANCH_HARMS),
      threeHarmonies,
    },
  };
}

/**
 * Deterministic structural facts only.
 *
 * This function intentionally does not infer 용신, 격국, 신강/신약, personality,
 * or predictions. Hidden-stem weights are an explicit, replaceable profile and
 * each branch contributes a normalized total weight of 1.
 */
export function analyzeStructure(pillars: FourPillars): StructuralAnalysis {
  const dayMaster = pillars.day.heavenlyStem;
  const stems: Record<PillarPosition, HeavenlyStem> = {
    year: pillars.year.heavenlyStem,
    month: pillars.month.heavenlyStem,
    day: pillars.day.heavenlyStem,
    hour: pillars.hour.heavenlyStem,
  };
  const branches: Record<PillarPosition, EarthlyBranch> = {
    year: pillars.year.earthlyBranch,
    month: pillars.month.earthlyBranch,
    day: pillars.day.earthlyBranch,
    hour: pillars.hour.earthlyBranch,
  };

  const hiddenFor = (position: PillarPosition): StructuralAnalysis['hiddenStems'][PillarPosition] =>
    HIDDEN_STEMS_V1[branches[position]].map(({ stem, weight }) => ({
      stem,
      weight,
      element: getHeavenlyStemElement(stem),
      tenGod: getTenGod(dayMaster, stem),
    }));
  const hiddenStems: StructuralAnalysis['hiddenStems'] = {
    year: hiddenFor('year'),
    month: hiddenFor('month'),
    day: hiddenFor('day'),
    hour: hiddenFor('hour'),
  };

  const scores: Record<FiveElement, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const position of POSITIONS) {
    scores[getHeavenlyStemElement(stems[position])] += 1;
    for (const hidden of hiddenStems[position]) {
      scores[hidden.element] += hidden.weight;
    }
  }
  for (const element of FIVE_ELEMENTS) scores[element] = rounded(scores[element]);

  const percentages: Record<FiveElement, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const element of FIVE_ELEMENTS) percentages[element] = rounded((scores[element] / 8) * 100);
  const maximum = Math.max(...FIVE_ELEMENTS.map((element) => scores[element]));
  const minimum = Math.min(...FIVE_ELEMENTS.map((element) => scores[element]));

  const yinYangCounts: Record<YinYang, number> = { 양: 0, 음: 0 };
  for (const position of POSITIONS) {
    yinYangCounts[getHeavenlyStemYinYang(stems[position])] += 1;
    yinYangCounts[getEarthlyBranchYinYang(branches[position])] += 1;
  }

  const threeHarmonies: {
    positions: PillarPosition[];
    members: EarthlyBranch[];
  }[] = [];
  for (const members of THREE_HARMONIES) {
    const positions = members.map((member) =>
      POSITIONS.find((position) => branches[position] === member),
    );
    if (positions.every((position) => position !== undefined)) {
      threeHarmonies.push({
        positions: positions as PillarPosition[],
        members: [...members],
      });
    }
  }

  return {
    hiddenStems,
    elementBalance: {
      profileId: 'visible-stems-1-hidden-stems-normalized-v1',
      totalWeight: 8,
      scores,
      percentages,
      strongest: FIVE_ELEMENTS.filter((element) => scores[element] === maximum),
      weakest: FIVE_ELEMENTS.filter((element) => scores[element] === minimum),
    },
    yinYangBalance: {
      basis: 'eight-visible-characters',
      counts: yinYangCounts,
      percentages: {
        양: rounded((yinYangCounts.양 / 8) * 100),
        음: rounded((yinYangCounts.음 / 8) * 100),
      },
    },
    relationships: {
      stemCombinations: pairRelationships(stems, STEM_COMBINATIONS),
      branchCombinations: pairRelationships(branches, BRANCH_COMBINATIONS),
      branchClashes: pairRelationships(branches, BRANCH_CLASHES),
      branchPunishments: branchPunishmentRelationships(POSITIONS, branches),
      branchBreaks: pairRelationships(branches, BRANCH_BREAKS),
      branchHarms: pairRelationships(branches, BRANCH_HARMS),
      threeHarmonies,
    },
  };
}

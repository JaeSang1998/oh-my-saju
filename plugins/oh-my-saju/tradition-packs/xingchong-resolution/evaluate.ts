import type { EarthlyBranch, FiveElement, HeavenlyStem } from 'saju-engine';
import type { PillarPosition } from 'saju-engine/advanced';
import { canonicalJsonStringify } from '../../runtime/internal/canonical-json';
import { deepFreeze } from '../../runtime/internal/deep-freeze';
import { isRecord } from '../../runtime/internal/guards';
/** Deterministic helper for the Xingchong Resolution Pack. */
import {
  EARTHLY_BRANCHES,
  ELEMENT_CONTROLS,
  ELEMENT_GENERATES,
  HEAVENLY_STEMS,
  getHeavenlyStemElement,
} from '../../runtime/traditions/domain';
import {
  comparison,
  omittedPillars,
  PILLAR_POSITIONS,
  visibleStemObservations,
  withComitativeParticle,
  withObjectParticle,
  withSubjectParticle,
  withTopicParticle,
} from '../../runtime/traditions/rule-helpers';
import type {
  DoctrineRuleContext,
  DoctrineRuleMatch,
} from '../../runtime/traditions/rule-evaluator-types';
import type { JsonValue } from '../../runtime/traditions/types';
import relationTableData from './branch-relation-tables-v1.json';

export type XingchongResolutionRuleId =
  'xingchong.branch-bureau' | 'xingchong.stem-combination-state' | 'xingchong.resolution-order';

export const XINGCHONG_RESOLUTION_RULE_IDS_V1: readonly XingchongResolutionRuleId[] = deepFreeze([
  'xingchong.branch-bureau',
  'xingchong.stem-combination-state',
  'xingchong.resolution-order',
]);

const XINGCHONG_BUREAU_SOURCE_IDS = [
  'yuanhai-ziping-combination-clash-v1',
  'oh-my-saju-xingchong-resolution-v1',
] as const;
const XINGCHONG_STEM_COMBINATION_SOURCE_IDS = [
  'yuanhai-ziping-combination-clash-v1',
  'oh-my-saju-xingchong-resolution-v1',
] as const;
const XINGCHONG_RESOLUTION_SOURCE_IDS = [
  'yuanhai-ziping-combination-clash-v1',
  'sanming-tonghui-xingchong-v1',
  'oh-my-saju-xingchong-resolution-v1',
] as const;

/** Lineage tag of the branch/stem relation tables this Pack ships. */
export const XINGCHONG_RELATION_TABLE_ID_V1 = 'xingchong-branch-relation-tables-v1';

export interface XingchongDirectionalBureau {
  readonly id: string;
  readonly members: readonly EarthlyBranch[];
  readonly element: FiveElement;
}

export interface XingchongTriadBureau {
  readonly id: string;
  readonly growth: EarthlyBranch;
  readonly peak: EarthlyBranch;
  readonly storage: EarthlyBranch;
  readonly element: FiveElement;
}

export interface XingchongSixCombination {
  readonly members: readonly [EarthlyBranch, EarthlyBranch];
  readonly element: FiveElement;
  readonly divergence: string | null;
}

export interface XingchongStemCombination {
  readonly members: readonly [HeavenlyStem, HeavenlyStem];
  readonly element: FiveElement;
}

export interface XingchongPunishmentTriad {
  readonly id: string;
  readonly members: readonly EarthlyBranch[];
}

export interface XingchongRelationTables {
  readonly wumeiTransform: 'earth';
  readonly directionalBureaus: readonly XingchongDirectionalBureau[];
  readonly triadBureaus: readonly XingchongTriadBureau[];
  readonly sixCombinations: readonly XingchongSixCombination[];
  readonly stemCombinations: readonly XingchongStemCombination[];
  readonly punishmentTriads: readonly XingchongPunishmentTriad[];
  readonly branchMainQi: Readonly<Record<EarthlyBranch, HeavenlyStem>>;
}

function requireBranch(value: unknown): EarthlyBranch {
  if (typeof value !== 'string' || !(EARTHLY_BRANCHES as readonly string[]).includes(value)) {
    throw new TypeError(`Invalid Xingchong relation table branch: ${String(value)}.`);
  }
  return value as EarthlyBranch;
}

function requireStem(value: unknown): HeavenlyStem {
  if (typeof value !== 'string' || !(HEAVENLY_STEMS as readonly string[]).includes(value)) {
    throw new TypeError(`Invalid Xingchong relation table stem: ${String(value)}.`);
  }
  return value as HeavenlyStem;
}

function requireElement(value: unknown): FiveElement {
  if (value === '목' || value === '화' || value === '토' || value === '금' || value === '수') {
    return value;
  }
  throw new TypeError(`Invalid Xingchong relation table element: ${String(value)}.`);
}

function requireEntries(value: unknown, name: string): readonly unknown[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError(`Invalid Xingchong relation table section: ${name}.`);
  }
  return value as readonly unknown[];
}

function requireId(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError('Invalid Xingchong relation table entry id.');
  }
  return value;
}

function parseRelationTables(value: unknown): XingchongRelationTables {
  if (
    !isRecord(value) ||
    value.schemaVersion !== '1' ||
    value.profileId !== XINGCHONG_RELATION_TABLE_ID_V1 ||
    value.wumeiTransform !== 'earth' ||
    !isRecord(value.branchMainQi)
  ) {
    throw new TypeError('Invalid Xingchong branch relation table.');
  }
  const mainQi = value.branchMainQi;
  return {
    wumeiTransform: 'earth',
    directionalBureaus: requireEntries(value.directionalBureaus, 'directionalBureaus').map(
      (entry) => {
        if (!isRecord(entry) || !Array.isArray(entry.members) || entry.members.length !== 3) {
          throw new TypeError('Invalid Xingchong directional bureau entry.');
        }
        return {
          id: requireId(entry.id),
          members: (entry.members as readonly unknown[]).map(requireBranch),
          element: requireElement(entry.element),
        };
      },
    ),
    triadBureaus: requireEntries(value.triadBureaus, 'triadBureaus').map((entry) => {
      if (!isRecord(entry)) throw new TypeError('Invalid Xingchong triad bureau entry.');
      return {
        id: requireId(entry.id),
        growth: requireBranch(entry.growth),
        peak: requireBranch(entry.peak),
        storage: requireBranch(entry.storage),
        element: requireElement(entry.element),
      };
    }),
    sixCombinations: requireEntries(value.sixCombinations, 'sixCombinations').map((entry) => {
      if (!isRecord(entry) || !Array.isArray(entry.members) || entry.members.length !== 2) {
        throw new TypeError('Invalid Xingchong six-combination entry.');
      }
      const members = entry.members as readonly unknown[];
      return {
        members: [requireBranch(members[0]), requireBranch(members[1])] as const,
        element: requireElement(entry.element),
        divergence: typeof entry.divergence === 'string' ? entry.divergence : null,
      };
    }),
    stemCombinations: requireEntries(value.stemCombinations, 'stemCombinations').map((entry) => {
      if (!isRecord(entry) || !Array.isArray(entry.members) || entry.members.length !== 2) {
        throw new TypeError('Invalid Xingchong stem-combination entry.');
      }
      const members = entry.members as readonly unknown[];
      return {
        members: [requireStem(members[0]), requireStem(members[1])] as const,
        element: requireElement(entry.element),
      };
    }),
    punishmentTriads: requireEntries(value.punishmentTriads, 'punishmentTriads').map((entry) => {
      if (!isRecord(entry) || !Array.isArray(entry.members) || entry.members.length !== 3) {
        throw new TypeError('Invalid Xingchong punishment triad entry.');
      }
      return {
        id: requireId(entry.id),
        members: (entry.members as readonly unknown[]).map(requireBranch),
      };
    }),
    branchMainQi: Object.fromEntries(
      EARTHLY_BRANCHES.map((branch) => [branch, requireStem(mainQi[branch])]),
    ) as Readonly<Record<EarthlyBranch, HeavenlyStem>>,
  };
}

/**
 * Pack-local 방합·삼합·육합·천간합 tables.  Combination doctrine diverges the
 * most between schools, so this Pack never reads another Pack's table.
 */
export const XINGCHONG_RELATION_TABLES_V1: XingchongRelationTables = deepFreeze(
  parseRelationTables(relationTableData),
);

/** 삼합국의 왕지(자·오·묘·유) — 충해합 판정의 대상 자리. */
const TRIAD_PEAK_BRANCHES: ReadonlySet<EarthlyBranch> = new Set(
  XINGCHONG_RELATION_TABLES_V1.triadBureaus.map(({ peak }) => peak),
);

const POSITION_INDEX: Readonly<Record<PillarPosition, number>> = {
  year: 0,
  month: 1,
  day: 2,
  hour: 3,
};

const BRANCH_POSITION_LABEL: Readonly<Record<PillarPosition, string>> = {
  year: '연지',
  month: '월지',
  day: '일지',
  hour: '시지',
};

const STEM_POSITION_LABEL: Readonly<Record<PillarPosition, string>> = {
  year: '연간',
  month: '월간',
  day: '일간',
  hour: '시간',
};

/** Position distance coefficient declared by this Pack: 인접 1.0 / 격각 0.5 / 년-시 0.2. */
export function xingchongDistanceFactor(left: PillarPosition, right: PillarPosition): number {
  const gap = Math.abs(POSITION_INDEX[left] - POSITION_INDEX[right]);
  if (gap <= 1) return 1;
  if (gap === 2) return 0.5;
  return 0.2;
}

interface PositionedBranch {
  readonly position: PillarPosition;
  readonly branch: EarthlyBranch;
}

type BureauCompleteness = 'full' | 'strong-half' | 'weak-half' | 'not-formed';

interface BureauMatch {
  readonly kind: 'directional' | 'triad';
  readonly id: string;
  readonly element: FiveElement;
  readonly completeness: BureauCompleteness;
  readonly presentMembers: readonly EarthlyBranch[];
  readonly positions: readonly PillarPosition[];
  readonly peakBranch: EarthlyBranch | null;
  readonly transparent: boolean;
  readonly transparentStems: readonly {
    readonly position: PillarPosition;
    readonly stem: string;
  }[];
  readonly state: 'manifest' | 'latent' | 'not-formed';
}

function observedBranches(context: DoctrineRuleContext): readonly PositionedBranch[] {
  return PILLAR_POSITIONS.flatMap((position) => {
    const pillar = context.pillars[position];
    return pillar === null ? [] : [{ position, branch: pillar.branch.korean }];
  });
}

function positionsOf(
  branches: readonly PositionedBranch[],
  branch: EarthlyBranch,
): readonly PillarPosition[] {
  return branches.filter((entry) => entry.branch === branch).map(({ position }) => position);
}

function triadCompleteness(
  hasGrowth: boolean,
  hasPeak: boolean,
  hasStorage: boolean,
): BureauCompleteness | null {
  if (hasGrowth && hasPeak && hasStorage) return 'full';
  if (hasGrowth && hasPeak) return 'strong-half';
  if (hasPeak && hasStorage) return 'weak-half';
  if (hasGrowth && hasStorage) return 'not-formed';
  return null;
}

function bureauMatches(context: DoctrineRuleContext): readonly BureauMatch[] {
  const branches = observedBranches(context);
  const visibleStems = visibleStemObservations(context.pillars, { includeDay: true });
  const transparencyOf = (
    element: FiveElement,
  ): Pick<BureauMatch, 'transparent' | 'transparentStems'> => {
    const transparentStems = visibleStems
      .filter(({ stem }) => getHeavenlyStemElement(stem) === element)
      .map(({ position, stem }) => ({ position, stem: stem as string }));
    return { transparent: transparentStems.length > 0, transparentStems };
  };
  const stateOf = (completeness: BureauCompleteness, transparent: boolean): BureauMatch['state'] =>
    completeness === 'not-formed' ? 'not-formed' : transparent ? 'manifest' : 'latent';

  const directional = XINGCHONG_RELATION_TABLES_V1.directionalBureaus.flatMap<BureauMatch>(
    (bureau) => {
      const present = bureau.members.filter((member) =>
        branches.some(({ branch }) => branch === member),
      );
      if (present.length < 2) return [];
      // A directional bureau needs all three branches; two are recorded as not formed.
      const completeness: BureauCompleteness = present.length === 3 ? 'full' : 'not-formed';
      const transparency = transparencyOf(bureau.element);
      return [
        {
          kind: 'directional',
          id: bureau.id,
          element: bureau.element,
          completeness,
          presentMembers: present,
          positions: present.flatMap((member) => positionsOf(branches, member)),
          peakBranch: null,
          ...transparency,
          state: stateOf(completeness, transparency.transparent),
        },
      ];
    },
  );

  const triad = XINGCHONG_RELATION_TABLES_V1.triadBureaus.flatMap<BureauMatch>((bureau) => {
    const hasGrowth = branches.some(({ branch }) => branch === bureau.growth);
    const hasPeak = branches.some(({ branch }) => branch === bureau.peak);
    const hasStorage = branches.some(({ branch }) => branch === bureau.storage);
    const completeness = triadCompleteness(hasGrowth, hasPeak, hasStorage);
    if (completeness === null) return [];
    const present = [
      ...(hasGrowth ? [bureau.growth] : []),
      ...(hasPeak ? [bureau.peak] : []),
      ...(hasStorage ? [bureau.storage] : []),
    ];
    const transparency = transparencyOf(bureau.element);
    return [
      {
        kind: 'triad',
        id: bureau.id,
        element: bureau.element,
        completeness,
        presentMembers: present,
        positions: present.flatMap((member) => positionsOf(branches, member)),
        peakBranch: bureau.peak,
        ...transparency,
        state: stateOf(completeness, transparency.transparent),
      },
    ];
  });

  return [...directional, ...triad];
}

function bureauValue(match: BureauMatch): JsonValue {
  return {
    kind: match.kind,
    id: match.id,
    element: match.element,
    completeness: match.completeness,
    presentMembers: [...match.presentMembers],
    positions: [...match.positions],
    peakBranch: match.peakBranch,
    transparent: match.transparent,
    transparentStems: match.transparentStems.map(({ position, stem }) => ({ position, stem })),
    state: match.state,
  };
}

/** 육합 화신이 갈리는 자리에서 다른 계열이 쓰는 값. 표의 divergence 태그로 찾는다. */
const SIX_HARMONY_DIVERGENCE_ALTERNATIVE: Readonly<Record<string, string | undefined>> = {
  'earth-or-fire-split': '화',
};

const COMPLETENESS_LABEL: Readonly<Record<BureauCompleteness, string>> = {
  full: '삼자가 모두 모인 국',
  'strong-half': '생지와 왕지가 모인 반합(유력)',
  'weak-half': '왕지와 고지가 모인 반합',
  'not-formed': '이 관법에서는 성립으로 보지 않는 짝',
};

function evaluateBranchBureau(context: DoctrineRuleContext): DoctrineRuleMatch {
  const branches = observedBranches(context);
  const matches = bureauMatches(context);
  const sixHarmonyPairs = XINGCHONG_RELATION_TABLES_V1.sixCombinations.flatMap((entry) => {
    const [left, right] = entry.members;
    const leftPositions = positionsOf(branches, left);
    const rightPositions = positionsOf(branches, right);
    if (leftPositions.length === 0 || rightPositions.length === 0) return [];
    return [
      {
        members: [left, right] as const,
        element: entry.element,
        positions: [leftPositions[0]!, rightPositions[0]!] as const,
        divergence: entry.divergence,
      },
    ];
  });
  const sixHarmonies = sixHarmonyPairs.map(
    ({ members, element, positions, divergence }) =>
      ({
        members: [members[0], members[1]],
        element,
        positions: [positions[0], positions[1]],
        divergence,
      }) as JsonValue,
  );
  const formed = matches.filter(({ completeness }) => completeness !== 'not-formed');
  const values = {
    table: XINGCHONG_RELATION_TABLE_ID_V1,
    bureaus: matches.map(bureauValue),
    sixHarmonies,
    partialDirectionalBureau: 'not-recognized',
    wumeiTransform: XINGCHONG_RELATION_TABLES_V1.wumeiTransform,
    sixHarmonyLockPolicy: 'not-locked-for-clash-suppression',
    status: 'bureau-formation-not-fortune',
  } as const;
  const bureauSummary = formed
    .map(
      (match) =>
        `${match.presentMembers.join('·')} ${match.element} ${match.kind === 'directional' ? '방합' : '삼합'}국(${COMPLETENESS_LABEL[match.completeness]})`,
    )
    .join(', ');
  const transparencySummary = formed
    .map((match) =>
      match.transparent
        ? `${match.id} 국의 오행 ${withTopicParticle(match.element)} ${match.transparentStems
            .map(
              ({ position, stem }) => `${STEM_POSITION_LABEL[position as PillarPosition]} ${stem}`,
            )
            .join('·')}에 투출했습니다`
        : `${match.id} 국의 오행 ${withTopicParticle(match.element)} 천간에 투출하지 않아 잠복한 자리로 봅니다`,
    )
    .join('. ');
  // 갈리는 육합(오미)은 표와 values 뿐 아니라 문장에도 갈린다는 사실을 남긴다.
  const divergentPairs = sixHarmonyPairs.filter(({ divergence }) => divergence !== null);
  const divergenceSummary =
    divergentPairs.length === 0
      ? ''
      : ` 이 가운데 ${divergentPairs
          .map(({ members, element, divergence }) => {
            const alternative = SIX_HARMONY_DIVERGENCE_ALTERNATIVE[divergence ?? ''];
            return alternative === undefined
              ? `${members[0]}${members[1]}합은 화신이 유파에 따라 갈리는 자리입니다(이 관법 ${element})`
              : `${members[0]}${members[1]}합은 화신이 유파에 따라 갈리는 자리입니다(이 관법 ${element}, 다른 계열 ${alternative})`;
          })
          .join(', ')}.`;
  const sixHarmonySummary =
    sixHarmonyPairs.length === 0
      ? ''
      : ` 육합 표에서는 ${sixHarmonyPairs
          .map(({ members, positions, element }) => {
            const ordered = [
              { position: positions[0], branch: members[0] },
              { position: positions[1], branch: members[1] },
            ].sort((left, right) => POSITION_INDEX[left.position] - POSITION_INDEX[right.position]);
            const first = ordered[0]!;
            const second = ordered[1]!;
            return `${BRANCH_POSITION_LABEL[first.position]} ${withComitativeParticle(first.branch)} ${BRANCH_POSITION_LABEL[second.position]} ${withSubjectParticle(second.branch)} ${members[0]}${members[1]}합(${element})에 해당`;
          })
          .join(
            ', ',
          )}합니다.${divergenceSummary} 이 관법은 육합을 국 성립이나 충 해소의 잠금 대상으로는 쓰지 않습니다.`;
  const statement =
    (formed.length === 0
      ? '지지에서 방합이나 삼합으로 볼 만한 국은 이 관법의 표에서 성립하지 않았습니다. 반방합과 생지·고지만의 짝은 성립으로 보지 않습니다.'
      : `지지에서 ${withObjectParticle(bureauSummary)} 이룹니다. ${transparencySummary}. 성립 여부만 계산하며 길흉은 정하지 않습니다.`) +
    sixHarmonySummary;
  const omitted = omittedPillars(context.pillars);
  return {
    key: canonicalJsonStringify(values),
    statement,
    topic: 'relationships',
    values,
    evidencePaths: ['pillars', 'facts.structure.relationships'],
    sourceReferenceIds: XINGCHONG_BUREAU_SOURCE_IDS,
    comparison: comparison(
      'xingchong.branch-bureau.v1',
      'xingchong.branch-bureau',
      'xingchong-resolution',
      branches.map(({ branch }) => branch).join(''),
      canonicalJsonStringify(
        formed.map(({ id, completeness, state }) => ({ id, completeness, state })),
      ),
    ),
    ...(omitted.length === 0 ? {} : { coverage: 'partial' as const, omittedPillars: omitted }),
  };
}

type StemCombinationState = '합화' | '기반' | '쟁합' | '원격';

interface StemCombinationMatch {
  readonly members: readonly [HeavenlyStem, HeavenlyStem];
  readonly positions: readonly [PillarPosition, PillarPosition];
  readonly transformElement: FiveElement;
  readonly distanceFactor: number;
  readonly adjacent: boolean;
  readonly monthSupport: boolean;
  readonly noAdjacentController: boolean;
  readonly noStrongRoot: boolean;
  readonly noContention: boolean;
  readonly rootedStems: readonly HeavenlyStem[];
  readonly adjacentControllers: readonly {
    readonly position: PillarPosition;
    readonly stem: HeavenlyStem;
  }[];
  readonly state: StemCombinationState;
}

function stemCombinationMatches(context: DoctrineRuleContext): readonly StemCombinationMatch[] {
  const stems = visibleStemObservations(context.pillars, { includeDay: true });
  const branches = observedBranches(context);
  const monthMainStem =
    XINGCHONG_RELATION_TABLES_V1.branchMainQi[context.pillars.month.branch.korean];
  const monthElement = getHeavenlyStemElement(monthMainStem);
  const hasMainQiRoot = (stem: HeavenlyStem): boolean =>
    branches.some(
      ({ branch }) =>
        getHeavenlyStemElement(XINGCHONG_RELATION_TABLES_V1.branchMainQi[branch]) ===
        getHeavenlyStemElement(stem),
    );

  return XINGCHONG_RELATION_TABLES_V1.stemCombinations.flatMap<StemCombinationMatch>((entry) => {
    const [left, right] = entry.members;
    const leftHits = stems.filter(({ stem }) => stem === left);
    const rightHits = stems.filter(({ stem }) => stem === right);
    if (leftHits.length === 0 || rightHits.length === 0) return [];
    const leftHit = leftHits[0]!;
    const rightHit = rightHits[0]!;
    const memberPositions = new Set<PillarPosition>([leftHit.position, rightHit.position]);
    const transformElement = entry.element;
    const monthSupport =
      monthElement === transformElement || ELEMENT_GENERATES[monthElement] === transformElement;
    const adjacentControllers = stems.filter(
      ({ position, stem }) =>
        !memberPositions.has(position) &&
        ELEMENT_CONTROLS[getHeavenlyStemElement(stem)] === transformElement &&
        (xingchongDistanceFactor(position, leftHit.position) === 1 ||
          xingchongDistanceFactor(position, rightHit.position) === 1),
    );
    // 무근 조건은 본래 오행을 버리고 화신으로 변해야 하는 천간에만 건다. 갑기합土의 기,
    // 을경합金의 경처럼 본래 오행이 곧 화신인 천간의 통근은 합화를 막는 자리가 아니라
    // 오히려 화신을 받쳐 주는 자리이므로 검사 대상에서 뺀다.
    const rootedStems = [left, right].filter(
      (stem) => getHeavenlyStemElement(stem) !== transformElement && hasMainQiRoot(stem),
    );
    const distanceFactor = xingchongDistanceFactor(leftHit.position, rightHit.position);
    const adjacent = distanceFactor === 1;
    const noContention = leftHits.length === 1 && rightHits.length === 1;
    const noAdjacentController = adjacentControllers.length === 0;
    const noStrongRoot = rootedStems.length === 0;
    const state: StemCombinationState = !noContention
      ? '쟁합'
      : // 이 관법은 붙어 있는 두 천간만 합으로 묶는다. 격각·연시처럼 떨어진 짝은
        // 표에 맞더라도 합화 4조건을 따지지 않고 원격으로 남긴다.
        !adjacent
        ? '원격'
        : monthSupport && noAdjacentController && noStrongRoot
          ? '합화'
          : '기반';
    return [
      {
        members: [left, right] as const,
        positions: [leftHit.position, rightHit.position] as const,
        transformElement,
        distanceFactor,
        adjacent,
        monthSupport,
        noAdjacentController,
        noStrongRoot,
        noContention,
        rootedStems,
        adjacentControllers: adjacentControllers.map(({ position, stem }) => ({ position, stem })),
        state,
      },
    ];
  });
}

function evaluateStemCombinationState(context: DoctrineRuleContext): DoctrineRuleMatch {
  const matches = stemCombinationMatches(context);
  const monthBranch = context.pillars.month.branch.korean;
  const values = {
    table: XINGCHONG_RELATION_TABLE_ID_V1,
    monthBranch,
    monthMainStem: XINGCHONG_RELATION_TABLES_V1.branchMainQi[monthBranch],
    transformConditions: 'month-support-no-adjacent-controller-no-main-qi-root-no-contention',
    transformRootScope: 'transforming-stem-only',
    stemCombinationAdjacency: 'adjacent-only',
    combinations: matches.map(
      ({
        members,
        positions,
        transformElement,
        distanceFactor,
        adjacent,
        monthSupport,
        noAdjacentController,
        noStrongRoot,
        noContention,
        rootedStems,
        adjacentControllers,
        state,
      }) =>
        ({
          members: [...members],
          positions: [...positions],
          transformElement,
          distanceFactor,
          adjacent,
          conditions: { monthSupport, noAdjacentController, noStrongRoot, noContention },
          rootedStems: [...rootedStems],
          adjacentControllers: adjacentControllers.map(({ position, stem }) => ({
            position,
            stem,
          })),
          state,
        }) as JsonValue,
    ),
    status: 'combination-state-not-fortune',
  } as const;
  const summary = matches
    .map((match) => {
      const [left, right] = match.members;
      const [leftPosition, rightPosition] = match.positions;
      const head = `${STEM_POSITION_LABEL[leftPosition]} ${withComitativeParticle(left)} ${STEM_POSITION_LABEL[rightPosition]} ${withTopicParticle(right)} ${left}${right}합입니다`;
      if (match.state === '쟁합') {
        return `${head}. 같은 글자가 둘 이상이라 하나를 다투는 쟁합으로 봅니다`;
      }
      if (match.state === '원격') {
        return `${head}. 다만 두 글자가 붙어 있지 않아(거리 계수 ${match.distanceFactor}) 이 관법에서는 합력이 닿지 않는 원격으로 두고 합화 조건은 따지지 않습니다`;
      }
      if (match.state === '합화') {
        return `${head}. 화신 ${withSubjectParticle(match.transformElement)} 월지 ${monthBranch}에서 힘을 받고, 화신을 막는 천간도 없고, 변해야 할 천간이 지지 정기에 뿌리를 두지 않아 이 관법의 4조건을 모두 채운 합화로 봅니다`;
      }
      const reasons = [
        ...(match.monthSupport
          ? []
          : [
              `화신 ${withSubjectParticle(match.transformElement)} 월지 ${monthBranch}에서 왕하지 않고`,
            ]),
        ...(match.noAdjacentController
          ? []
          : [
              `화신을 극하는 ${withSubjectParticle(
                match.adjacentControllers
                  .map(({ position, stem }) => `${STEM_POSITION_LABEL[position]} ${stem}`)
                  .join('·'),
              )} 인접하고`,
            ]),
        ...(match.noStrongRoot
          ? []
          : [
              `화신으로 변해야 할 ${withSubjectParticle(match.rootedStems.join('·'))} 지지 정기에 뿌리를 두어 본래 오행을 버리지 못하므로`,
            ]),
      ];
      return `${head}. ${reasons.join(' ')} 합은 하되 화하지는 않는 기반으로 봅니다`;
    })
    .join('. ');
  const statement =
    matches.length === 0
      ? '천간에서 이 관법의 합 표에 맞는 짝이 없습니다. 합화 여부를 따질 자리가 없습니다.'
      : `${summary}. 이 관법은 붙어 있는 짝만 합으로 묶고 합화 4조건으로 판정하며 길흉은 정하지 않습니다.`;
  const omitted = omittedPillars(context.pillars);
  return {
    key: canonicalJsonStringify(values),
    statement,
    topic: 'relationships',
    values,
    evidencePaths: ['pillars', 'facts.structure.relationships'],
    sourceReferenceIds: XINGCHONG_STEM_COMBINATION_SOURCE_IDS,
    comparison: comparison(
      'xingchong.stem-combination-state.four-condition.v1',
      'xingchong.stem-combination-state',
      'xingchong-resolution',
      `${context.pillars.day.stem.korean}:${monthBranch}`,
      canonicalJsonStringify(matches.map(({ members, state }) => ({ members, state }))),
    ),
    ...(omitted.length === 0 ? {} : { coverage: 'partial' as const, omittedPillars: omitted }),
  };
}

type PunishmentCompleteness = 'full-triad' | 'partial-pair' | 'self';

interface ClashResolution {
  readonly members: readonly [EarthlyBranch, EarthlyBranch];
  readonly positions: readonly [PillarPosition, PillarPosition];
  readonly distanceFactor: number;
  readonly status: 'active' | 'suppressed';
  readonly reason: string | null;
}

function punishmentCompleteness(
  kind: 'directed-cycle' | 'mutual' | 'self',
  branches: readonly PositionedBranch[],
  members: readonly EarthlyBranch[],
): PunishmentCompleteness {
  if (kind === 'self') return 'self';
  const triad = XINGCHONG_RELATION_TABLES_V1.punishmentTriads.find((entry) =>
    members.every((member) => entry.members.includes(member)),
  );
  if (triad === undefined) return 'partial-pair';
  return triad.members.every((member) => branches.some(({ branch }) => branch === member))
    ? 'full-triad'
    : 'partial-pair';
}

function evaluateResolutionOrder(context: DoctrineRuleContext): DoctrineRuleMatch {
  const branches = observedBranches(context);
  const clashes = context.structure.relationships.branchClashes;
  const punishments = context.structure.relationships.branchPunishments;
  const initialBureaus = bureauMatches(context).filter(
    ({ completeness }) => completeness !== 'not-formed',
  );

  // 이 관법의 해소 순서는 2-pass 로 고정돼 있다.
  // pass 1(충해합): 원국의 충 목록만 보고 삼합국의 왕지가 충을 맞았는지 판정해 깨진 국을 확정한다.
  //   국이 스스로 누른 충도 여기서는 그대로 읽으므로, 국의 잠금 상태가 이 판정에 되먹임되지 않는다.
  // pass 2(탐합망충): 살아남은 국이 묶은 자리에 걸린 충을 눌린 충으로 표시한다.
  // 두 pass 사이에 순환 의존이 없어 세 번째 pass 는 언제나 pass 2 와 같은 값을 낸다.
  // 그래서 반복 상한이나 미수렴(ambiguous) 상태를 두지 않는다.
  const brokenIds = new Set<string>(
    initialBureaus
      .filter(
        ({ kind, peakBranch, positions }) =>
          kind === 'triad' &&
          peakBranch !== null &&
          clashes.some(
            ({ members, positions: clashPositions }) =>
              (members[0] === peakBranch && positions.includes(clashPositions[0])) ||
              (members[1] === peakBranch && positions.includes(clashPositions[1])),
          ),
      )
      .map(({ id }) => id),
  );
  const lockedPositions = new Set<PillarPosition>(
    initialBureaus
      .filter(({ id }) => !brokenIds.has(id))
      .flatMap(({ positions }) => [...positions]),
  );
  const resolvedClashes: readonly ClashResolution[] = clashes.map(({ members, positions }) => {
    const suppressed = positions.some((position) => lockedPositions.has(position));
    return {
      members: [members[0], members[1]] as const,
      positions: [positions[0], positions[1]] as const,
      distanceFactor: xingchongDistanceFactor(positions[0], positions[1]),
      status: suppressed ? ('suppressed' as const) : ('active' as const),
      reason: suppressed ? '탐합망충' : null,
    };
  });

  const bureauStates = initialBureaus.map(
    ({ kind, id, element, completeness, presentMembers, positions, peakBranch }) =>
      ({
        kind,
        id,
        element,
        completeness,
        presentMembers: [...presentMembers],
        positions: [...positions],
        peakBranch,
        status: brokenIds.has(id) ? 'broken' : 'locked',
        reason: brokenIds.has(id) ? '충해합' : null,
      }) as JsonValue,
  );
  const resolvedPunishments = punishments.map(({ kind, members, positions }) => {
    const completeness = punishmentCompleteness(kind, branches, members);
    return {
      kind,
      members: [members[0], members[1]],
      positions: [positions[0], positions[1]],
      completeness,
      distanceFactor: xingchongDistanceFactor(positions[0], positions[1]),
    } as JsonValue;
  });
  const values = {
    table: XINGCHONG_RELATION_TABLE_ID_V1,
    resolutionOrder: 'bureau-then-clash-then-bureau-break-v1',
    passes: 2,
    directionalBureauBreakPolicy: 'not-broken-by-clash',
    bureaus: bureauStates,
    clashes: resolvedClashes.map(
      ({ members, positions, distanceFactor, status, reason }) =>
        ({
          members: [...members],
          positions: [...positions],
          distanceFactor,
          status,
          reason,
        }) as JsonValue,
    ),
    punishments: resolvedPunishments,
    distanceProfile: 'adjacent-1.0-skipped-0.5-year-hour-0.2',
    status: 'resolution-order-not-fortune',
  } as const;

  const suppressed = resolvedClashes.filter(({ status }) => status === 'suppressed');
  const active = resolvedClashes.filter(({ status }) => status === 'active');
  const clashSentence =
    resolvedClashes.length === 0
      ? '지지에서 충으로 잡히는 짝이 없습니다.'
      : [
          ...suppressed.map(
            ({ members, positions }) =>
              `${BRANCH_POSITION_LABEL[positions[0]]} ${withComitativeParticle(members[0])} ${BRANCH_POSITION_LABEL[positions[1]]} ${withTopicParticle(members[1])} 충이지만 한쪽이 국에 묶여 있어 이 관법에서는 충이 눌린 자리로 봅니다(탐합망충)`,
          ),
          ...active.map(
            ({ members, positions, distanceFactor }) =>
              `${BRANCH_POSITION_LABEL[positions[0]]} ${withComitativeParticle(members[0])} ${BRANCH_POSITION_LABEL[positions[1]]} ${members[1]}의 충은 그대로 서며 거리 계수는 ${distanceFactor}입니다`,
          ),
        ].join('. ') + '.';
  const brokenSentence =
    brokenIds.size === 0
      ? ''
      : ` ${[...brokenIds].join('·')} 삼합국은 왕지가 충을 맞아 이 관법에서는 깨진 국으로 봅니다(충해합).`;
  // 충해합은 삼합국의 왕지에만 건다. 방합의 왕지가 충을 맞은 자리는 유파가 갈리므로
  // 이 관법이 어느 쪽을 택했는지 문장에도 드러낸다.
  const directionalPeakClashed = initialBureaus.filter(
    ({ kind, presentMembers, positions }) =>
      kind === 'directional' &&
      clashes.some(
        ({ members, positions: clashPositions }) =>
          (TRIAD_PEAK_BRANCHES.has(members[0]) &&
            presentMembers.includes(members[0]) &&
            positions.includes(clashPositions[0])) ||
          (TRIAD_PEAK_BRANCHES.has(members[1]) &&
            presentMembers.includes(members[1]) &&
            positions.includes(clashPositions[1])),
      ),
  );
  const directionalPolicySentence =
    directionalPeakClashed.length === 0
      ? ''
      : ` ${directionalPeakClashed.map(({ id }) => id).join('·')} 방합은 왕지가 충을 맞았지만 이 관법은 방합을 충으로 깨지 않는 국으로 두며, 방합도 왕지 충이면 깨진다고 보는 계열과 갈리는 자리입니다.`;
  const punishmentSentence =
    punishments.length === 0
      ? ' 형으로 잡히는 짝은 없습니다.'
      : ` 형은 ${resolvedPunishments
          .map((entry) => {
            const record = entry as {
              readonly members: readonly string[];
              readonly positions: readonly string[];
              readonly completeness: string;
            };
            const label =
              record.completeness === 'full-triad'
                ? '삼형이 모두 모인 형'
                : record.completeness === 'self'
                  ? '자형'
                  : '두 글자만 모인 상형';
            return `${BRANCH_POSITION_LABEL[record.positions[0] as PillarPosition]} ${withComitativeParticle(record.members[0]!)} ${BRANCH_POSITION_LABEL[record.positions[1] as PillarPosition]} ${record.members[1]}의 ${label}`;
          })
          .join(', ')}입니다.`;
  const omitted = omittedPillars(context.pillars);
  return {
    key: canonicalJsonStringify(values),
    statement: `${clashSentence}${brokenSentence}${directionalPolicySentence}${punishmentSentence} 거리 계수와 성립 여부만 계산하며 길흉은 정하지 않습니다.`,
    topic: 'relationships',
    values,
    evidencePaths: ['pillars', 'facts.structure.relationships'],
    sourceReferenceIds: XINGCHONG_RESOLUTION_SOURCE_IDS,
    comparison: comparison(
      'xingchong.resolution-order.two-pass.v1',
      'xingchong.resolution-order',
      'xingchong-resolution',
      branches.map(({ branch }) => branch).join(''),
      canonicalJsonStringify({
        clashes: resolvedClashes.map(({ members, status }) => ({ members, status })),
        broken: [...brokenIds],
      }),
    ),
    ...(omitted.length === 0 ? {} : { coverage: 'partial' as const, omittedPillars: omitted }),
  };
}

export function evaluateXingchongResolutionRule(
  ruleId: XingchongResolutionRuleId,
  context: DoctrineRuleContext,
): DoctrineRuleMatch {
  if (ruleId === 'xingchong.branch-bureau') return evaluateBranchBureau(context);
  if (ruleId === 'xingchong.stem-combination-state') return evaluateStemCombinationState(context);
  if (ruleId === 'xingchong.resolution-order') return evaluateResolutionOrder(context);
  throw new RangeError(`지원하지 않는 형충회합 해소 규칙입니다: ${String(ruleId)}`);
}

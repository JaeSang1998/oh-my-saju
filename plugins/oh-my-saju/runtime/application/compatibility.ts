import { createHash } from 'node:crypto';
import type { EarthlyBranch, FiveElement, HeavenlyStem, Pillar, TenGod } from 'saju-engine';
import {
  analyzeKnownPillarStructure,
  analyzePillarPairRelationships,
  type PillarPairRelationshipAnalysis,
  type PillarPosition,
} from 'saju-engine/advanced';
import { canonicalJsonStringify } from '../internal/canonical-json';
import { deepFreeze } from '../internal/deep-freeze';
import { isRecord } from '../internal/guards';
import { OH_MY_SAJU_RUNTIME_MANIFEST } from '../manifest';
import { assertSafeIdentifier } from '../reading/option-validation';
import { calculateKoreanSajuAnalysis } from '../traditions/calculate-korean-analysis';
import { getBranchTenGod, getHeavenlyStemElement, getTenGod } from '../traditions/domain';
import type {
  ExactKoreanSajuAnalysisResult,
  PossibilityKoreanSajuAnalysisResult,
  SajuInterpretationCalculationRequest,
} from '../traditions/types';
import { OhMySajuApplicationError } from './errors';
import type {
  OhMySajuCompatibilityDraft,
  OhMySajuCompatibilityFinding,
  OhMySajuCompatibilityFindingKind,
  OhMySajuCompatibilityNarrationTask,
  OhMySajuCompatibilityParagraphDraft,
  OhMySajuCompatibilityParticipantRequest,
  OhMySajuCompatibilityParticipantView,
  OhMySajuCompatibilityRequest,
  OhMySajuNarratorIdentity,
  PrepareOhMySajuCompatibilityCommand,
  PreparedOhMySajuCompatibility,
  ValidateOhMySajuCompatibilityCommand,
  ValidatedOhMySajuCompatibility,
} from './types';

const PROFILE = deepFreeze({
  id: 'ziping-structural-compatibility',
  version: '1.0.0',
} as const);

const POSITIONS = ['year', 'month', 'day', 'hour'] as const satisfies readonly PillarPosition[];
const ELEMENTS = ['목', '화', '토', '금', '수'] as const satisfies readonly FiveElement[];
const POSITION_LABELS: Readonly<Record<PillarPosition, string>> = {
  year: '년주',
  month: '월주',
  day: '일주',
  hour: '시주',
};

const OUTPUT_SCHEMA = deepFreeze({
  type: 'object',
  additionalProperties: false,
  required: [
    'schemaVersion',
    'kind',
    'summary',
    'connection',
    'interaction',
    'friction',
    'durability',
  ],
  properties: {
    schemaVersion: { const: '1' },
    kind: { const: 'compatibility' },
    summary: { $ref: '#/$defs/paragraph' },
    connection: { $ref: '#/$defs/paragraph' },
    interaction: { $ref: '#/$defs/paragraph' },
    friction: { $ref: '#/$defs/paragraph' },
    durability: { $ref: '#/$defs/paragraph' },
  },
  $defs: {
    paragraph: {
      type: 'object',
      additionalProperties: false,
      required: ['text', 'findingIds', 'structure'],
      properties: {
        text: { type: 'string', minLength: 40, maxLength: 900 },
        findingIds: {
          type: 'array',
          minItems: 1,
          maxItems: 8,
          uniqueItems: true,
          items: { type: 'string' },
        },
        structure: {
          type: 'object',
          additionalProperties: false,
          required: ['basis', 'interpretation'],
          properties: {
            basis: { type: 'string', minLength: 2, maxLength: 360 },
            interpretation: { type: 'string', minLength: 10, maxLength: 600 },
          },
        },
      },
    },
  },
} as const);

type KoreanAnalysis = ExactKoreanSajuAnalysisResult | PossibilityKoreanSajuAnalysisResult;

interface NormalizedCandidate {
  readonly id: string;
  readonly pillars: Readonly<Partial<Record<PillarPosition, Pillar>>>;
}

interface CandidatePair {
  readonly id: string;
  readonly first: NormalizedCandidate;
  readonly second: NormalizedCandidate;
}

interface FindingObservation {
  readonly key: string;
  readonly pairId: string;
  readonly kind: OhMySajuCompatibilityFindingKind;
  readonly tone: OhMySajuCompatibilityFinding['tone'];
  readonly direction: OhMySajuCompatibilityFinding['direction'];
  readonly participantIds: OhMySajuCompatibilityFinding['participantIds'];
  readonly positions?: readonly [PillarPosition, PillarPosition];
  readonly punishment?: NonNullable<OhMySajuCompatibilityFinding['punishment']>;
  readonly members: readonly string[];
  readonly tenGod?: TenGod;
  readonly statement: string;
}

function containsUnsafeControl(value: string, allowPlainWhitespace = false): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0)!;
    if (
      codePoint === 127 ||
      (codePoint >= 128 && codePoint <= 159) ||
      (codePoint <= 31 &&
        (!allowPlainWhitespace || (codePoint !== 9 && codePoint !== 10 && codePoint !== 13)))
    ) {
      return true;
    }
    if (
      (codePoint >= 0x200b && codePoint <= 0x200f) ||
      (codePoint >= 0x202a && codePoint <= 0x202e) ||
      codePoint === 0x2060 ||
      (codePoint >= 0x2066 && codePoint <= 0x2069) ||
      codePoint === 0xfeff
    ) {
      return true;
    }
  }
  return false;
}

function assertOnlyKeys(
  value: Readonly<Record<string, unknown>>,
  allowed: readonly string[],
  field: string,
  code: 'INVALID_COMMAND' | 'INVALID_DRAFT_SET' = 'INVALID_COMMAND',
): void {
  const allowedSet = new Set(allowed);
  const unexpected = Object.keys(value).filter((key) => !allowedSet.has(key));
  if (unexpected.length > 0) {
    throw new OhMySajuApplicationError(code, `${field} contains unsupported keys.`, {
      details: { unexpected },
    });
  }
}

function assertVersion(value: unknown): void {
  if (value !== undefined && value !== '1') {
    throw new OhMySajuApplicationError('INVALID_COMMAND', 'schemaVersion must be "1".');
  }
}

function copyLabel(value: unknown, field: string): string {
  if (
    typeof value !== 'string' ||
    value.length < 1 ||
    value.length > 40 ||
    containsUnsafeControl(value) ||
    /[<>|`*_[\]{}#\\]/u.test(value)
  ) {
    throw new OhMySajuApplicationError(
      'INVALID_COMMAND',
      `${field} must be a plain label with 1-40 characters.`,
    );
  }
  return value;
}

function copyQuestion(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== 'string' || value.length > 4_000 || containsUnsafeControl(value, true)) {
    throw new OhMySajuApplicationError(
      'INVALID_COMMAND',
      'request.question must be null or safe text with at most 4,000 characters.',
    );
  }
  return value;
}

function copyCalculation(value: unknown, field: string): SajuInterpretationCalculationRequest {
  if (
    !isRecord(value) ||
    (value.kind !== 'exact' && value.kind !== 'possibilities') ||
    !('request' in value)
  ) {
    throw new OhMySajuApplicationError(
      'INVALID_COMMAND',
      `${field} must contain an exact or possibilities calculation.`,
    );
  }
  assertOnlyKeys(value, ['kind', 'request'], field);
  return value as unknown as SajuInterpretationCalculationRequest;
}

function copyParticipant(value: unknown, index: number): OhMySajuCompatibilityParticipantRequest {
  const field = `request.participants[${index}]`;
  if (!isRecord(value)) {
    throw new OhMySajuApplicationError('INVALID_COMMAND', `${field} must be an object.`);
  }
  assertOnlyKeys(value, ['id', 'label', 'calculation'], field);
  return {
    id: assertSafeIdentifier(value.id, `${field}.id`, 64),
    label: copyLabel(value.label, `${field}.label`),
    calculation: copyCalculation(value.calculation, `${field}.calculation`),
  };
}

function copyCompatibilityRequest(value: unknown): OhMySajuCompatibilityRequest {
  if (!isRecord(value)) {
    throw new OhMySajuApplicationError('INVALID_COMMAND', 'request must be an object.');
  }
  assertOnlyKeys(value, ['participants', 'question', 'locale', 'variantPolicy'], 'request');
  if (!Array.isArray(value.participants) || value.participants.length !== 2) {
    throw new OhMySajuApplicationError(
      'INVALID_COMMAND',
      'request.participants must contain exactly two people.',
    );
  }
  const first = copyParticipant(value.participants[0], 0);
  const second = copyParticipant(value.participants[1], 1);
  if (first.id === second.id) {
    throw new OhMySajuApplicationError(
      'INVALID_COMMAND',
      'Compatibility participant IDs must be distinct.',
    );
  }
  if (first.label.normalize('NFKC') === second.label.normalize('NFKC')) {
    throw new OhMySajuApplicationError(
      'INVALID_COMMAND',
      'Compatibility participant labels must be distinct; use labels such as A and B.',
    );
  }
  if (value.locale !== 'ko-KR') {
    throw new OhMySajuApplicationError('INVALID_COMMAND', 'request.locale must be ko-KR.');
  }
  if (
    value.variantPolicy !== 'stable-only' &&
    value.variantPolicy !== 'include-candidate-dependent'
  ) {
    throw new OhMySajuApplicationError(
      'INVALID_COMMAND',
      'request.variantPolicy is not supported.',
    );
  }
  return {
    participants: [first, second],
    question: copyQuestion(value.question),
    locale: 'ko-KR',
    variantPolicy: value.variantPolicy,
  };
}

function toPillar(value: {
  readonly stem: { readonly korean: HeavenlyStem };
  readonly branch: { readonly korean: EarthlyBranch };
}): Pillar {
  return {
    heavenlyStem: value.stem.korean,
    earthlyBranch: value.branch.korean,
  };
}

function normalizedCandidates(analysis: KoreanAnalysis): readonly NormalizedCandidate[] {
  if (analysis.calculationKind === 'exact') {
    const pillars = analysis.calculation.pillars;
    return [
      {
        id: 'exact',
        pillars: {
          year: toPillar(pillars.year),
          month: toPillar(pillars.month),
          day: toPillar(pillars.day),
          hour: toPillar(pillars.hour),
        },
      },
    ];
  }
  return analysis.calculation.candidates.map((candidate) => ({
    id: candidate.id,
    pillars: {
      year: toPillar(candidate.pillars.year),
      month: toPillar(candidate.pillars.month),
      day: toPillar(candidate.pillars.day),
      ...(candidate.pillars.hour === null ? {} : { hour: toPillar(candidate.pillars.hour) }),
    },
  }));
}

function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, 'ko'));
}

function pillarText(pillar: Pillar): string {
  return `${pillar.heavenlyStem}${pillar.earthlyBranch}`;
}

function aggregatedValues(
  candidates: readonly NormalizedCandidate[],
  position: PillarPosition,
  select: (candidate: NormalizedCandidate, pillar: Pillar) => string,
): { readonly stable: boolean; readonly values: readonly string[] } {
  const present = candidates.flatMap((candidate) => {
    const pillar = candidate.pillars[position];
    return pillar === undefined ? [] : [select(candidate, pillar)];
  });
  const values = unique(present);
  return {
    stable: values.length === 1 && present.length === candidates.length,
    values,
  };
}

function tenGodText(
  candidate: NormalizedCandidate,
  position: PillarPosition,
  pillar: Pillar,
): string {
  const dayMaster = candidate.pillars.day!.heavenlyStem;
  const stem = position === 'day' ? '일간' : getTenGod(dayMaster, pillar.heavenlyStem);
  return `${stem}·${getBranchTenGod(dayMaster, pillar.earthlyBranch)}`;
}

function participantView(
  request: OhMySajuCompatibilityParticipantRequest,
  analysis: KoreanAnalysis,
  candidates: readonly NormalizedCandidate[],
): OhMySajuCompatibilityParticipantView {
  const elementValues = candidates.map(
    ({ pillars }) => analyzeKnownPillarStructure(pillars).elementBalance.percentages,
  );
  const elementPercentages = Object.fromEntries(
    ELEMENTS.map((element) => {
      const values = elementValues.map((entry) => entry[element]);
      return [
        element,
        {
          minimum: Math.min(...values),
          maximum: Math.max(...values),
        },
      ];
    }),
  ) as OhMySajuCompatibilityParticipantView['elementPercentages'];
  return {
    id: request.id,
    label: request.label,
    calculationKind: analysis.calculationKind,
    candidateCount: candidates.length,
    pillars: Object.fromEntries(
      POSITIONS.map((position) => [
        position,
        aggregatedValues(candidates, position, (_candidate, pillar) => pillarText(pillar)),
      ]),
    ) as OhMySajuCompatibilityParticipantView['pillars'],
    tenGods: Object.fromEntries(
      POSITIONS.map((position) => [
        position,
        aggregatedValues(candidates, position, (candidate, pillar) =>
          tenGodText(candidate, position, pillar),
        ),
      ]),
    ) as OhMySajuCompatibilityParticipantView['tenGods'],
    dayMasters: unique(
      candidates.map(({ pillars }) => {
        const stem = pillars.day!.heavenlyStem;
        return `${stem}${getHeavenlyStemElement(stem)}`;
      }),
    ),
    monthBranches: unique(candidates.map(({ pillars }) => pillars.month!.earthlyBranch)),
    elementPercentages,
  };
}

function observationKey(
  kind: OhMySajuCompatibilityFindingKind,
  direction: OhMySajuCompatibilityFinding['direction'],
  participantIds: OhMySajuCompatibilityFinding['participantIds'],
  positions: readonly [PillarPosition, PillarPosition] | undefined,
  punishment: OhMySajuCompatibilityFinding['punishment'],
  members: readonly string[],
  tenGod: TenGod | undefined,
): string {
  return JSON.stringify({
    kind,
    direction,
    participantIds,
    positions,
    punishment,
    members,
    tenGod,
  });
}

function observe(observations: FindingObservation[], value: Omit<FindingObservation, 'key'>): void {
  observations.push({
    ...value,
    key: observationKey(
      value.kind,
      value.direction,
      value.participantIds,
      value.positions,
      value.punishment,
      value.members,
      value.tenGod,
    ),
  });
}

function relationStatement(
  kind: Exclude<
    OhMySajuCompatibilityFindingKind,
    | 'participant-day-master'
    | 'participant-month-branch'
    | 'participant-element-balance'
    | 'day-master-ten-god'
    | 'day-master-ten-god-range'
    | 'shared-stem'
    | 'shared-branch'
  >,
  firstLabel: string,
  secondLabel: string,
  firstPosition: PillarPosition,
  secondPosition: PillarPosition,
  members: readonly string[],
  punishment?: NonNullable<PillarPairRelationshipAnalysis['branchPunishment']>,
): string {
  const relation = {
    'stem-combination': '천간합',
    'branch-combination': '지지합',
    'branch-clash': '지지충',
    'branch-punishment': '지지형',
    'branch-break': '지지파',
    'branch-harm': '지지해',
  }[kind];
  const detail =
    punishment?.kind === 'directed-cycle'
      ? punishment.direction === 'left-to-right'
        ? `${members[0]}→${members[1]}`
        : `${members[1]}→${members[0]}`
      : members.join('·');
  return `${firstLabel} ${POSITION_LABELS[firstPosition]}와 ${secondLabel} ${POSITION_LABELS[secondPosition]} 사이에는 ${relation}(${detail})이 있습니다.`;
}

function collectPairObservations(
  pair: CandidatePair,
  firstRequest: OhMySajuCompatibilityParticipantRequest,
  secondRequest: OhMySajuCompatibilityParticipantRequest,
  observations: FindingObservation[],
): void {
  const firstDay = pair.first.pillars.day!;
  const secondDay = pair.second.pillars.day!;
  const firstToSecond = getTenGod(firstDay.heavenlyStem, secondDay.heavenlyStem);
  const secondToFirst = getTenGod(secondDay.heavenlyStem, firstDay.heavenlyStem);
  observe(observations, {
    pairId: pair.id,
    kind: 'day-master-ten-god',
    tone: 'directional',
    direction: 'first-to-second',
    participantIds: [firstRequest.id, secondRequest.id],
    members: [firstDay.heavenlyStem, secondDay.heavenlyStem],
    tenGod: firstToSecond,
    statement: `${firstRequest.label}의 ${firstDay.heavenlyStem}${getHeavenlyStemElement(firstDay.heavenlyStem)} 일간을 기준으로 보면 ${secondRequest.label}의 ${secondDay.heavenlyStem}${getHeavenlyStemElement(secondDay.heavenlyStem)} 일간은 ${firstToSecond}에 해당합니다.`,
  });
  observe(observations, {
    pairId: pair.id,
    kind: 'day-master-ten-god',
    tone: 'directional',
    direction: 'second-to-first',
    participantIds: [secondRequest.id, firstRequest.id],
    members: [secondDay.heavenlyStem, firstDay.heavenlyStem],
    tenGod: secondToFirst,
    statement: `${secondRequest.label}의 ${secondDay.heavenlyStem}${getHeavenlyStemElement(secondDay.heavenlyStem)} 일간을 기준으로 보면 ${firstRequest.label}의 ${firstDay.heavenlyStem}${getHeavenlyStemElement(firstDay.heavenlyStem)} 일간은 ${secondToFirst}에 해당합니다.`,
  });

  for (const firstPosition of POSITIONS) {
    const firstPillar = pair.first.pillars[firstPosition];
    if (firstPillar === undefined) continue;
    for (const secondPosition of POSITIONS) {
      const secondPillar = pair.second.pillars[secondPosition];
      if (secondPillar === undefined) continue;
      const positions = [firstPosition, secondPosition] as const;
      if (firstPillar.heavenlyStem === secondPillar.heavenlyStem) {
        observe(observations, {
          pairId: pair.id,
          kind: 'shared-stem',
          tone: 'descriptive',
          direction: 'symmetric',
          participantIds: [firstRequest.id, secondRequest.id],
          positions,
          members: [firstPillar.heavenlyStem],
          statement: `${firstRequest.label} ${POSITION_LABELS[firstPosition]}와 ${secondRequest.label} ${POSITION_LABELS[secondPosition]}의 천간은 둘 다 ${firstPillar.heavenlyStem}입니다.`,
        });
      }
      if (firstPillar.earthlyBranch === secondPillar.earthlyBranch) {
        observe(observations, {
          pairId: pair.id,
          kind: 'shared-branch',
          tone: 'descriptive',
          direction: 'symmetric',
          participantIds: [firstRequest.id, secondRequest.id],
          positions,
          members: [firstPillar.earthlyBranch],
          statement: `${firstRequest.label} ${POSITION_LABELS[firstPosition]}와 ${secondRequest.label} ${POSITION_LABELS[secondPosition]}의 지지는 둘 다 ${firstPillar.earthlyBranch}입니다.`,
        });
      }
      const relationships = analyzePillarPairRelationships(firstPillar, secondPillar);
      const relationSpecs = [
        ['stem-combination', relationships.stemCombination, 'connection', 'heavenlyStem'],
        ['branch-combination', relationships.branchCombination, 'connection', 'earthlyBranch'],
        ['branch-clash', relationships.branchClash, 'tension', 'earthlyBranch'],
        ['branch-break', relationships.branchBreak, 'tension', 'earthlyBranch'],
        ['branch-harm', relationships.branchHarm, 'tension', 'earthlyBranch'],
      ] as const;
      for (const [kind, present, tone, memberField] of relationSpecs) {
        if (!present) continue;
        const members =
          memberField === 'heavenlyStem'
            ? [firstPillar.heavenlyStem, secondPillar.heavenlyStem]
            : [firstPillar.earthlyBranch, secondPillar.earthlyBranch];
        observe(observations, {
          pairId: pair.id,
          kind,
          tone,
          direction: 'symmetric',
          participantIds: [firstRequest.id, secondRequest.id],
          positions,
          members,
          statement: relationStatement(
            kind,
            firstRequest.label,
            secondRequest.label,
            firstPosition,
            secondPosition,
            members,
          ),
        });
      }
      if (relationships.branchPunishment !== null) {
        const members = [firstPillar.earthlyBranch, secondPillar.earthlyBranch] as const;
        const direction =
          relationships.branchPunishment.direction === 'left-to-right'
            ? ('first-to-second' as const)
            : relationships.branchPunishment.direction === 'right-to-left'
              ? ('second-to-first' as const)
              : ('symmetric' as const);
        observe(observations, {
          pairId: pair.id,
          kind: 'branch-punishment',
          tone: 'tension',
          direction,
          participantIds: [firstRequest.id, secondRequest.id],
          positions,
          punishment: relationships.branchPunishment,
          members,
          statement: relationStatement(
            'branch-punishment',
            firstRequest.label,
            secondRequest.label,
            firstPosition,
            secondPosition,
            members,
            relationships.branchPunishment,
          ),
        });
      }
    }
  }
}

function percentageStatement(participant: OhMySajuCompatibilityParticipantView): string {
  const values = ELEMENTS.map((element) => {
    const range = participant.elementPercentages[element];
    return range.minimum === range.maximum
      ? `${element} ${range.minimum}%`
      : `${element} ${range.minimum}~${range.maximum}%`;
  });
  return `${participant.label}의 오행 분포는 ${values.join(', ')}입니다.`;
}

function addParticipantObservations(
  pairs: readonly CandidatePair[],
  participantIndex: 0 | 1,
  request: OhMySajuCompatibilityParticipantRequest,
  observations: FindingObservation[],
): void {
  for (const pair of pairs) {
    const candidate = participantIndex === 0 ? pair.first : pair.second;
    const dayMaster = candidate.pillars.day!.heavenlyStem;
    const monthBranch = candidate.pillars.month!.earthlyBranch;
    observe(observations, {
      pairId: pair.id,
      kind: 'participant-day-master',
      tone: 'descriptive',
      direction: 'participant',
      participantIds: [request.id],
      members: [dayMaster, getHeavenlyStemElement(dayMaster)],
      statement: `${request.label}의 일간은 ${dayMaster}${getHeavenlyStemElement(dayMaster)}입니다.`,
    });
    observe(observations, {
      pairId: pair.id,
      kind: 'participant-month-branch',
      tone: 'descriptive',
      direction: 'participant',
      participantIds: [request.id],
      members: [monthBranch],
      statement: `${request.label}의 월지는 ${monthBranch}입니다.`,
    });
  }
}

function findingId(key: string): string {
  return `compatibility:${createHash('sha256').update(key).digest('hex').slice(0, 16)}`;
}

function aggregateFindings(
  observations: readonly FindingObservation[],
  pairCount: number,
  variantPolicy: OhMySajuCompatibilityRequest['variantPolicy'],
): readonly OhMySajuCompatibilityFinding[] {
  const grouped = new Map<string, FindingObservation[]>();
  for (const observation of observations) {
    const current = grouped.get(observation.key) ?? [];
    current.push(observation);
    grouped.set(observation.key, current);
  }
  return [...grouped.entries()]
    .map(([key, values]) => {
      const first = values[0]!;
      const candidatePairIds = unique(values.map(({ pairId }) => pairId));
      const stability =
        candidatePairIds.length === pairCount
          ? ('stable' as const)
          : ('candidate-dependent' as const);
      return {
        id: findingId(key),
        kind: first.kind,
        tone: first.tone,
        stability,
        direction: first.direction,
        participantIds: first.participantIds,
        ...(first.positions === undefined ? {} : { positions: first.positions }),
        ...(first.punishment === undefined ? {} : { punishment: first.punishment }),
        members: first.members,
        ...(first.tenGod === undefined ? {} : { tenGod: first.tenGod }),
        statement: first.statement,
        candidatePairIds,
      } satisfies OhMySajuCompatibilityFinding;
    })
    .filter(
      ({ stability }) => variantPolicy === 'include-candidate-dependent' || stability === 'stable',
    )
    .sort((left, right) => left.id.localeCompare(right.id));
}

function directionalRangeFindings(
  observations: readonly FindingObservation[],
  pairIds: readonly string[],
  firstRequest: OhMySajuCompatibilityParticipantRequest,
  secondRequest: OhMySajuCompatibilityParticipantRequest,
): readonly OhMySajuCompatibilityFinding[] {
  return (
    [
      ['first-to-second', firstRequest, secondRequest],
      ['second-to-first', secondRequest, firstRequest],
    ] as const
  ).flatMap(([direction, from, to]) => {
    const directional = observations.filter(
      (observation) =>
        observation.kind === 'day-master-ten-god' && observation.direction === direction,
    );
    const distinctKeys = unique(directional.map(({ key }) => key));
    if (distinctKeys.length <= 1) return [];
    const tenGods = [...new Set(directional.map(({ tenGod }) => tenGod!))].sort((left, right) =>
      left.localeCompare(right, 'ko'),
    );
    const members = unique(directional.flatMap((finding) => finding.members));
    const statement =
      tenGods.length === 1
        ? `모든 후보에서 ${from.label}의 일간을 기준으로 본 ${to.label}의 일간 십신은 ${tenGods[0]}으로 같습니다.`
        : `입력 범위에 따라 ${from.label}의 일간을 기준으로 본 ${to.label}의 일간 십신은 ${tenGods.join('·')} 가운데 하나로 달라집니다.`;
    const key = JSON.stringify({
      kind: 'day-master-ten-god-range',
      direction,
      participantIds: [from.id, to.id],
      members,
      tenGods,
    });
    return [
      {
        id: findingId(key),
        kind: 'day-master-ten-god-range',
        tone: 'directional',
        stability: 'stable',
        direction,
        participantIds: [from.id, to.id],
        members,
        tenGods,
        statement,
        candidatePairIds: pairIds,
      } satisfies OhMySajuCompatibilityFinding,
    ];
  });
}

function elementBalanceFinding(
  participant: OhMySajuCompatibilityParticipantView,
  pairIds: readonly string[],
): OhMySajuCompatibilityFinding {
  const stable = ELEMENTS.every((element) => {
    const range = participant.elementPercentages[element];
    return range.minimum === range.maximum;
  });
  const key = JSON.stringify({
    kind: 'participant-element-balance',
    participant: participant.id,
    elementPercentages: participant.elementPercentages,
  });
  return {
    id: findingId(key),
    kind: 'participant-element-balance',
    tone: 'descriptive',
    stability: stable ? 'stable' : 'candidate-dependent',
    direction: 'participant',
    participantIds: [participant.id],
    members: ELEMENTS,
    statement: percentageStatement(participant),
    candidatePairIds: pairIds,
  };
}

function compatibilityTask(
  request: OhMySajuCompatibilityRequest,
  participants: PreparedOhMySajuCompatibility['participants'],
  findings: readonly OhMySajuCompatibilityFinding[],
): OhMySajuCompatibilityNarrationTask {
  return deepFreeze({
    schemaVersion: '1',
    mode: 'grounded-compatibility',
    question: request.question,
    instructions: [
      'Answer the two-person compatibility question directly in the summary.',
      'Use A→B and B→A directional ten-god findings together; compatibility is not two individual readings pasted together.',
      "Explain in ordinary Korean what draws them together, what starts a conflict, and how one person's response changes the other's next response.",
      'For durability, name what they should do after a specific disagreement instead of giving a generic relationship checklist.',
      'Use people as subjects and concrete verbs. Do not invent type labels such as 비대칭 보완형 or translated phrases such as 회복 리듬 and 연결점으로 작동합니다.',
      'Use only supplied finding IDs and keep candidate-dependent findings conditional.',
      'When a day-master-ten-god-range finding is present, name every listed ten-god candidate instead of selecting one.',
      'Do not produce a numeric score, marriage prediction, moral judgment, or implementation-limitation disclaimer.',
    ],
    evidence: {
      profile: PROFILE,
      participants,
      findings,
    },
    outputSchema: OUTPUT_SCHEMA,
  });
}

function prepare(request: OhMySajuCompatibilityRequest): PreparedOhMySajuCompatibility {
  const [firstRequest, secondRequest] = request.participants;
  const firstAnalysis = calculateKoreanSajuAnalysis(firstRequest.calculation);
  const secondAnalysis = calculateKoreanSajuAnalysis(secondRequest.calculation);
  const firstCandidates = normalizedCandidates(firstAnalysis);
  const secondCandidates = normalizedCandidates(secondAnalysis);
  const pairs = firstCandidates.flatMap((first) =>
    secondCandidates.map((second) => ({
      id: `${first.id}::${second.id}`,
      first,
      second,
    })),
  );
  if (pairs.length === 0) {
    throw new OhMySajuApplicationError(
      'INVALID_COMMAND',
      'Compatibility calculation produced no candidate pairs.',
    );
  }
  const participants = [
    participantView(firstRequest, firstAnalysis, firstCandidates),
    participantView(secondRequest, secondAnalysis, secondCandidates),
  ] as const;
  const observations: FindingObservation[] = [];
  addParticipantObservations(pairs, 0, firstRequest, observations);
  addParticipantObservations(pairs, 1, secondRequest, observations);
  for (const pair of pairs) {
    collectPairObservations(pair, firstRequest, secondRequest, observations);
  }
  const pairIds = pairs.map(({ id }) => id);
  const structuralFindings = aggregateFindings(observations, pairs.length, request.variantPolicy);
  const directionalRanges = directionalRangeFindings(
    observations,
    pairIds,
    firstRequest,
    secondRequest,
  );
  const elementFindings = participants
    .map((participant) => elementBalanceFinding(participant, pairIds))
    .filter(
      ({ stability }) =>
        request.variantPolicy === 'include-candidate-dependent' || stability === 'stable',
    );
  const findings = deepFreeze(
    [...structuralFindings, ...directionalRanges, ...elementFindings].sort((left, right) =>
      left.id.localeCompare(right.id),
    ),
  );
  const narrationTask = compatibilityTask(request, participants, findings);
  const bindingInput = {
    canonicalization: 'oh-my-saju-compatibility-preparation-v1',
    runtime: OH_MY_SAJU_RUNTIME_MANIFEST.runtime,
    profile: PROFILE,
    request,
    participants,
    candidatePairCount: pairs.length,
    findings,
    narrationTask,
  };
  const digest = createHash('sha256').update(canonicalJsonStringify(bindingInput)).digest('hex');
  return deepFreeze({
    schemaVersion: '1',
    participants,
    candidatePairCount: pairs.length,
    findings,
    narrationTask,
    binding: {
      algorithm: 'sha256',
      canonicalization: 'oh-my-saju-compatibility-preparation-v1',
      digest,
      runtimeVersion: OH_MY_SAJU_RUNTIME_MANIFEST.runtime.version,
      profile: PROFILE,
    },
  });
}

export function prepareOhMySajuCompatibilityFromUnknown(
  command: unknown,
): PreparedOhMySajuCompatibility {
  if (!isRecord(command) || command.command !== 'prepare-compatibility') {
    throw new OhMySajuApplicationError(
      'INVALID_COMMAND',
      'command must be a prepare-compatibility object.',
    );
  }
  assertOnlyKeys(command, ['schemaVersion', 'command', 'request'], 'command');
  assertVersion(command.schemaVersion);
  return prepare(copyCompatibilityRequest(command.request));
}

export function prepareOhMySajuCompatibility(
  command: PrepareOhMySajuCompatibilityCommand,
): PreparedOhMySajuCompatibility {
  return prepareOhMySajuCompatibilityFromUnknown(command);
}

const REFUSAL_OR_AUDIT_PATTERN =
  /(?:현재\s*사용한\s*규칙|검증된?\s*궁합\s*규칙|제공하지\s*않|지원하지\s*않|판정할\s*수\s*없|계산상\s*확인|그럴듯한\s*길흉|사주보다(?:도)?\s*실제|구현되지\s*않|기능\s*부재|원시\s*일치)/u;
const SCORE_OR_EVENT_PATTERN =
  /(?:궁합\s*(?:점수|확률)|(?:궁합|애정|결혼)\s*(?:은|이|도|점수)?\s*\d{1,3}\s*(?:점|%)|이혼\s*(?:확률|운)|외도\s*(?:확률|운)|임신\s*(?:여부|확률|운)|수명|천생연분|악연|반드시\s*(?:결혼|이별)|무조건\s*(?:좋|나쁘|헤어|결혼))/u;
const GENERIC_ADVICE_PATTERN =
  /(?:서로\s*배려하면|대화가\s*중요|존중해야\s*합니다|이해해야\s*합니다|노력하면\s*좋|갈등이\s*생기면\s*대화)/u;
const TRANSLATED_RELATIONSHIP_PROSE_PATTERN =
  /(?:비대칭\s*보완형|동질형|조건부\s*보완\s*관계|회복\s*리듬|이중\s*리듬|연결점으로\s*작동|거리(?:가|를)\s*(?:빨리\s*)?회복|자원을?\s*(?:빠르게\s*)?배치|현실적?\s*(?:결과|성과)|판단이\s*선명)/u;
const PLAIN_TEXT_VIOLATION = /(?:https?:\/\/|<[^>]+>|\[[^\]]+\]\([^)]+\)|[\r\n\t|>`#*_~\\])/u;
const PLAIN_LIST_PREFIX = /^\s*(?:[-+]\s|\d+[.)]\s)/u;
const PLAIN_CODE_BLOCK_PREFIX = /^ {4}/u;
const STEM_CHARACTERS = new Set<HeavenlyStem>([
  '갑',
  '을',
  '병',
  '정',
  '무',
  '기',
  '경',
  '신',
  '임',
  '계',
]);
const TEN_GOD_CLAIM_PATTERN =
  /(비견|겁재|식신|상관(?!\s*(?:없|관계))|편재|정재|편관|정관|편인|정인)/gu;
const DIRECTIONAL_TEN_GOD_CLAIM_PATTERN = /(비견|겁재|식신|상관|편재|정재|편관|정관|편인|정인)/gu;
const RELATION_CLAIM_PATTERN =
  /([갑을병정무기경신임계자축인묘진사오미신유술해])(?:\s*(?:와|과|·|↔|→|-)?\s*)(?:(?:[\p{L}\p{N}]{1,16}(?:\s+[\p{L}\p{N}]{1,16}){0,2})의\s*)?([갑을병정무기경신임계자축인묘진사오미신유술해])\s*(?:(?:사이(?:에는|에|의|는)|은|는|의)\s*)?(천간합|지지합|지지충|지지형|지지파|지지해|합|충|형|파|해)(?=$|[이가과와은는도을를의,.;:·)\s])/gu;

function assertPlainCompatibilityText(
  value: unknown,
  field: string,
  minimum = 2,
  maximum = 900,
): string {
  if (
    typeof value !== 'string' ||
    value.length < minimum ||
    value.length > maximum ||
    containsUnsafeControl(value) ||
    PLAIN_TEXT_VIOLATION.test(value) ||
    PLAIN_LIST_PREFIX.test(value) ||
    PLAIN_CODE_BLOCK_PREFIX.test(value)
  ) {
    throw new OhMySajuApplicationError(
      'INVALID_DRAFT_SET',
      `${field} must be safe plain text within the allowed length.`,
    );
  }
  if (REFUSAL_OR_AUDIT_PATTERN.test(value)) {
    throw new OhMySajuApplicationError(
      'INVALID_DRAFT_SET',
      `${field} exposes an implementation limitation instead of interpreting the pair.`,
    );
  }
  if (SCORE_OR_EVENT_PATTERN.test(value)) {
    throw new OhMySajuApplicationError(
      'INVALID_DRAFT_SET',
      `${field} contains a compatibility score or unsupported event claim.`,
    );
  }
  if (TRANSLATED_RELATIONSHIP_PROSE_PATTERN.test(value)) {
    throw new OhMySajuApplicationError(
      'INVALID_DRAFT_SET',
      `${field} uses translated or abstract relationship prose instead of ordinary Korean.`,
    );
  }
  return value;
}

function basisNamesFinding(basis: string, finding: OhMySajuCompatibilityFinding): boolean {
  if (finding.tenGod !== undefined && basis.includes(finding.tenGod)) return true;
  if (finding.tenGods !== undefined && finding.tenGods.every((tenGod) => basis.includes(tenGod))) {
    return true;
  }
  if (finding.kind === 'participant-element-balance') {
    return finding.members.some((member) => basis.includes(member));
  }
  if (
    [
      'stem-combination',
      'branch-combination',
      'branch-clash',
      'branch-punishment',
      'branch-break',
      'branch-harm',
    ].includes(finding.kind)
  ) {
    return finding.members.every((member) => basis.includes(member));
  }
  return finding.members.some((member) => basis.includes(member));
}

function relationClaimKind(
  first: string,
  second: string,
  relation: string,
): OhMySajuCompatibilityFindingKind | null {
  if (
    relation === '천간합' ||
    (relation === '합' &&
      STEM_CHARACTERS.has(first as HeavenlyStem) &&
      STEM_CHARACTERS.has(second as HeavenlyStem))
  ) {
    return 'stem-combination';
  }
  const branchKinds: Readonly<Record<string, OhMySajuCompatibilityFindingKind | undefined>> = {
    지지합: 'branch-combination',
    합: 'branch-combination',
    지지충: 'branch-clash',
    충: 'branch-clash',
    지지형: 'branch-punishment',
    형: 'branch-punishment',
    지지파: 'branch-break',
    파: 'branch-break',
    지지해: 'branch-harm',
    해: 'branch-harm',
  };
  return branchKinds[relation] ?? null;
}

function sameMembers(
  finding: OhMySajuCompatibilityFinding,
  first: string,
  second: string,
): boolean {
  if (finding.kind === 'branch-punishment' && finding.punishment?.kind === 'directed-cycle') {
    const [left, right] = finding.members;
    return finding.punishment.direction === 'left-to-right'
      ? left === first && right === second
      : right === first && left === second;
  }
  return (
    finding.members.length === 2 &&
    ((finding.members[0] === first && finding.members[1] === second) ||
      (finding.members[0] === second && finding.members[1] === first))
  );
}

function assertRelationClaimsGrounded(
  basis: string,
  findings: readonly OhMySajuCompatibilityFinding[],
  field: string,
): void {
  const claims = [...basis.matchAll(RELATION_CLAIM_PATTERN)].flatMap((match) => {
    const [, first, second, relation] = match;
    if (first === undefined || second === undefined || relation === undefined) return [];
    const kind = relationClaimKind(first, second, relation);
    return kind === null
      ? []
      : [
          {
            first,
            second,
            relation,
            kind,
            start: match.index,
            end: match.index + match[0].length,
          },
        ];
  });
  for (const claim of claims) {
    if (
      !findings.some(
        (finding) => finding.kind === claim.kind && sameMembers(finding, claim.first, claim.second),
      )
    ) {
      throw new OhMySajuApplicationError(
        'INVALID_DRAFT_SET',
        `${field} names an uncited or unsupported ${claim.relation} relationship.`,
        { details: claim },
      );
    }
  }
  for (const claim of claims) {
    const nearby = basis.slice(
      Math.max(0, claim.start - 18),
      Math.min(basis.length, claim.end + 24),
    );
    if (/(?:(?:두|2|여러)\s*(?:자리|곳|번|차례)|반복|거듭|중첩|겹쳐)/u.test(nearby)) {
      const count = findings.filter(
        (finding) => finding.kind === claim.kind && sameMembers(finding, claim.first, claim.second),
      ).length;
      if (count < 2) {
        throw new OhMySajuApplicationError(
          'INVALID_DRAFT_SET',
          `${field} claims a repeated relationship without citing both findings.`,
          { details: { ...claim, citedCount: count } },
        );
      }
    }
  }
}

interface DirectionalTenGodClaimSegment {
  readonly direction: 'first-to-second' | 'second-to-first';
  readonly claims: readonly TenGod[];
}

function directionalTenGodClaimSegments(
  text: string,
  participantLabels: readonly [string, string],
): readonly DirectionalTenGodClaimSegment[] {
  const escapePattern = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const directionSpecs = [
    {
      direction: 'first-to-second' as const,
      from: participantLabels[0],
      to: participantLabels[1],
    },
    {
      direction: 'second-to-first' as const,
      from: participantLabels[1],
      to: participantLabels[0],
    },
  ];
  const markers = directionSpecs
    .flatMap(({ direction, from, to }) => {
      const pattern = new RegExp(`${escapePattern(from)}\\s*→\\s*${escapePattern(to)}`, 'gu');
      return [...text.matchAll(pattern)].map((match) => ({
        direction,
        start: match.index,
        end: match.index + match[0].length,
      }));
    })
    .sort((left, right) => left.start - right.start);
  return markers.map((marker, index) => {
    const nextMarkerStart = markers[index + 1]?.start ?? text.length;
    const unboundedSegment = text.slice(marker.end, nextMarkerStart);
    const sentenceEnd = unboundedSegment.search(/[.!?。！？;]/u);
    const segment = sentenceEnd < 0 ? unboundedSegment : unboundedSegment.slice(0, sentenceEnd);
    return {
      direction: marker.direction,
      claims: [...segment.matchAll(DIRECTIONAL_TEN_GOD_CLAIM_PATTERN)]
        .map((match) => match[1])
        .filter((tenGod): tenGod is TenGod => tenGod !== undefined),
    };
  });
}

function assertTenGodClaimsGrounded(
  text: string,
  findings: readonly OhMySajuCompatibilityFinding[],
  participantLabels: readonly [string, string],
  field: string,
): void {
  const citedTenGods = new Set(
    findings.flatMap((finding) => [
      ...(finding.tenGod === undefined ? [] : [finding.tenGod]),
      ...(finding.tenGods ?? []),
    ]),
  );
  for (const match of text.matchAll(TEN_GOD_CLAIM_PATTERN)) {
    const tenGod = match[1];
    if (tenGod !== undefined && !citedTenGods.has(tenGod as TenGod)) {
      throw new OhMySajuApplicationError(
        'INVALID_DRAFT_SET',
        `${field} names an uncited day-master relationship.`,
        { details: { tenGod } },
      );
    }
  }
  for (const segment of directionalTenGodClaimSegments(text, participantLabels)) {
    const allowed = new Set(
      findings
        .filter(
          (finding) =>
            finding.direction === segment.direction &&
            (finding.kind === 'day-master-ten-god' || finding.kind === 'day-master-ten-god-range'),
        )
        .flatMap((finding) => [
          ...(finding.tenGod === undefined ? [] : [finding.tenGod]),
          ...(finding.tenGods ?? []),
        ]),
    );
    const misplaced = segment.claims.filter((tenGod) => !allowed.has(tenGod));
    if (misplaced.length > 0) {
      throw new OhMySajuApplicationError(
        'INVALID_DRAFT_SET',
        `${field} assigns a day-master relationship to the wrong direction.`,
        { details: { direction: segment.direction, misplaced } },
      );
    }
  }
  if (
    findings.some(({ kind }) => kind === 'day-master-ten-god-range') &&
    !/(?:후보|범위|경우|따라|달라|가능|중\s*하나)/u.test(text)
  ) {
    throw new OhMySajuApplicationError(
      'INVALID_DRAFT_SET',
      `${field} must describe a day-master range as candidate-dependent.`,
    );
  }
}

function assertDirectionalInteractionCoverage(
  paragraph: OhMySajuCompatibilityParagraphDraft,
  findings: readonly OhMySajuCompatibilityFinding[],
  participantLabels: readonly [string, string],
): void {
  const segments = directionalTenGodClaimSegments(paragraph.structure.basis, participantLabels);
  for (const direction of ['first-to-second', 'second-to-first'] as const) {
    const expected = new Set(
      findings
        .filter(
          (finding) =>
            finding.direction === direction &&
            (finding.kind === 'day-master-ten-god' || finding.kind === 'day-master-ten-god-range'),
        )
        .flatMap((finding) => [
          ...(finding.tenGod === undefined ? [] : [finding.tenGod]),
          ...(finding.tenGods ?? []),
        ]),
    );
    const claimed = new Set(
      segments.filter((segment) => segment.direction === direction).flatMap(({ claims }) => claims),
    );
    if (expected.size === 0 || [...expected].some((tenGod) => !claimed.has(tenGod))) {
      throw new OhMySajuApplicationError(
        'INVALID_DRAFT_SET',
        'interaction must state each cited day-master relationship after its canonical direction marker.',
        { details: { direction, expected: [...expected], claimed: [...claimed] } },
      );
    }
  }
}

function evidenceTokens(findings: readonly OhMySajuCompatibilityFinding[]): readonly string[] {
  return unique(
    findings.flatMap((finding) => [
      ...finding.members,
      ...(finding.tenGod === undefined ? [] : [finding.tenGod]),
      ...(finding.tenGods ?? []),
      ...(finding.positions === undefined
        ? []
        : finding.positions.map((position) => POSITION_LABELS[position])),
    ]),
  ).filter((token) => token.length > 0);
}

function copyParagraph(
  value: unknown,
  field: string,
  findingsById: ReadonlyMap<string, OhMySajuCompatibilityFinding>,
  participantLabels: readonly [string, string],
): OhMySajuCompatibilityParagraphDraft {
  if (!isRecord(value)) {
    throw new OhMySajuApplicationError('INVALID_DRAFT_SET', `${field} must be an object.`);
  }
  assertOnlyKeys(value, ['text', 'findingIds', 'structure'], field, 'INVALID_DRAFT_SET');
  const text = assertPlainCompatibilityText(value.text, `${field}.text`, 40, 900);
  if (
    !Array.isArray(value.findingIds) ||
    value.findingIds.length < 1 ||
    value.findingIds.length > 8 ||
    value.findingIds.some((id) => typeof id !== 'string') ||
    new Set(value.findingIds).size !== value.findingIds.length
  ) {
    throw new OhMySajuApplicationError(
      'INVALID_DRAFT_SET',
      `${field}.findingIds must contain 1-8 distinct finding IDs.`,
    );
  }
  const findingIds = value.findingIds as string[];
  const findings = findingIds.map((id) => {
    const finding = findingsById.get(id);
    if (finding === undefined) {
      throw new OhMySajuApplicationError(
        'INVALID_DRAFT_SET',
        `${field} cites an unknown compatibility finding.`,
        { details: { findingId: id } },
      );
    }
    return finding;
  });
  for (const finding of findings) {
    if (finding.kind !== 'day-master-ten-god') continue;
    const range = [...findingsById.values()].find(
      (candidate) =>
        candidate.kind === 'day-master-ten-god-range' && candidate.direction === finding.direction,
    );
    if (range !== undefined && !findingIds.includes(range.id)) {
      throw new OhMySajuApplicationError(
        'INVALID_DRAFT_SET',
        `${field} selects one day-master candidate even though a directional range finding is available.`,
        { details: { direction: finding.direction, requiredFindingId: range.id } },
      );
    }
  }
  if (!isRecord(value.structure)) {
    throw new OhMySajuApplicationError(
      'INVALID_DRAFT_SET',
      `${field}.structure must be an object.`,
    );
  }
  assertOnlyKeys(
    value.structure,
    ['basis', 'interpretation'],
    `${field}.structure`,
    'INVALID_DRAFT_SET',
  );
  const basis = assertPlainCompatibilityText(
    value.structure.basis,
    `${field}.structure.basis`,
    2,
    360,
  );
  const interpretation = assertPlainCompatibilityText(
    value.structure.interpretation,
    `${field}.structure.interpretation`,
    10,
    600,
  );
  const basisIndex = text.indexOf(basis);
  const interpretationIndex = text.indexOf(interpretation);
  if (
    basisIndex < 0 ||
    interpretationIndex < 0 ||
    interpretationIndex < basisIndex + basis.length
  ) {
    throw new OhMySajuApplicationError(
      'INVALID_DRAFT_SET',
      `${field} must contain the exact basis before the exact interpretation.`,
    );
  }
  const tokens = evidenceTokens(findings);
  if (!tokens.some((token) => basis.includes(token))) {
    throw new OhMySajuApplicationError(
      'INVALID_DRAFT_SET',
      `${field}.structure.basis must name a token from its cited pair evidence.`,
    );
  }
  if (!findings.every((finding) => basisNamesFinding(basis, finding))) {
    throw new OhMySajuApplicationError(
      'INVALID_DRAFT_SET',
      `${field}.structure.basis must substantively name every cited compatibility finding.`,
    );
  }
  assertRelationClaimsGrounded(text, findings, `${field}.text`);
  assertTenGodClaimsGrounded(text, findings, participantLabels, `${field}.text`);
  if (GENERIC_ADVICE_PATTERN.test(interpretation) && interpretation.length < 70) {
    throw new OhMySajuApplicationError(
      'INVALID_DRAFT_SET',
      `${field}.structure.interpretation is generic relationship advice.`,
    );
  }
  return {
    text,
    findingIds,
    structure: { basis, interpretation },
  };
}

function assertSectionLanguage(
  paragraph: OhMySajuCompatibilityParagraphDraft,
  field: keyof OhMySajuCompatibilityDraft,
): void {
  const patterns: Partial<Record<keyof OhMySajuCompatibilityDraft, RegExp>> = {
    summary: /(?:궁합|관계|조합).*(?:잘\s*맞|조건|보완|긴장|엇갈|끌림|힘겨루|형)/u,
    connection: /(?:끌|연결|편안|익숙|보완|호흡|주고받|당기|친밀)/u,
    interaction: /(?:반응|표현|받아들|요구|지원|말|대화|행동|주고받)/u,
    friction: /(?:갈등|부딪|긴장|힘겨루|엇갈|답답|충돌|압박)/u,
    durability: /(?:오래|장기|유지|생활|회복|조율|리듬|오해|다툰|풀어|습관|관계가\s*굴러)/u,
  };
  const pattern = patterns[field];
  if (pattern !== undefined && !pattern.test(paragraph.text)) {
    throw new OhMySajuApplicationError(
      'INVALID_DRAFT_SET',
      `${field} does not answer its compatibility section.`,
    );
  }
}

function findingSet(
  paragraph: OhMySajuCompatibilityParagraphDraft,
  findingsById: ReadonlyMap<string, OhMySajuCompatibilityFinding>,
): readonly OhMySajuCompatibilityFinding[] {
  return paragraph.findingIds.map((id) => findingsById.get(id)!);
}

function hasPairFinding(findings: readonly OhMySajuCompatibilityFinding[]): boolean {
  return findings.some(({ participantIds }) => participantIds.length === 2);
}

function isDirectionalFinding(finding: OhMySajuCompatibilityFinding): boolean {
  return finding.kind === 'day-master-ten-god' || finding.kind === 'day-master-ten-god-range';
}

function copyDraft(
  value: unknown,
  prepared: PreparedOhMySajuCompatibility,
): OhMySajuCompatibilityDraft {
  if (!isRecord(value)) {
    throw new OhMySajuApplicationError('INVALID_DRAFT_SET', 'draft must be an object.');
  }
  assertOnlyKeys(
    value,
    ['schemaVersion', 'kind', 'summary', 'connection', 'interaction', 'friction', 'durability'],
    'draft',
    'INVALID_DRAFT_SET',
  );
  if (value.schemaVersion !== '1' || value.kind !== 'compatibility') {
    throw new OhMySajuApplicationError(
      'INVALID_DRAFT_SET',
      'draft must use compatibility schemaVersion 1.',
    );
  }
  const findingsById = new Map(prepared.findings.map((finding) => [finding.id, finding] as const));
  const participantLabels = [
    prepared.participants[0].label,
    prepared.participants[1].label,
  ] as const;
  const draft: OhMySajuCompatibilityDraft = {
    schemaVersion: '1',
    kind: 'compatibility',
    summary: copyParagraph(value.summary, 'summary', findingsById, participantLabels),
    connection: copyParagraph(value.connection, 'connection', findingsById, participantLabels),
    interaction: copyParagraph(value.interaction, 'interaction', findingsById, participantLabels),
    friction: copyParagraph(value.friction, 'friction', findingsById, participantLabels),
    durability: copyParagraph(value.durability, 'durability', findingsById, participantLabels),
  };
  for (const field of ['summary', 'connection', 'interaction', 'friction', 'durability'] as const) {
    assertSectionLanguage(draft[field], field);
  }
  const texts = [
    draft.summary.text,
    draft.connection.text,
    draft.interaction.text,
    draft.friction.text,
    draft.durability.text,
  ];
  if (new Set(texts).size !== texts.length) {
    throw new OhMySajuApplicationError(
      'INVALID_DRAFT_SET',
      'Every compatibility section must use distinct prose.',
    );
  }
  const summaryFindings = findingSet(draft.summary, findingsById);
  const connectionFindings = findingSet(draft.connection, findingsById);
  const interactionFindings = findingSet(draft.interaction, findingsById);
  const frictionFindings = findingSet(draft.friction, findingsById);
  const durabilityFindings = findingSet(draft.durability, findingsById);
  if (summaryFindings.length < 2 || !hasPairFinding(summaryFindings)) {
    throw new OhMySajuApplicationError(
      'INVALID_DRAFT_SET',
      'summary must combine at least two findings including pair evidence.',
    );
  }
  if (
    !connectionFindings.some(({ tone }) =>
      ['connection', 'directional', 'descriptive'].includes(tone),
    ) ||
    !hasPairFinding(connectionFindings)
  ) {
    throw new OhMySajuApplicationError(
      'INVALID_DRAFT_SET',
      'connection must cite a connecting or directional pair finding.',
    );
  }
  const directional = interactionFindings.filter(isDirectionalFinding);
  if (
    !directional.some(({ direction }) => direction === 'first-to-second') ||
    !directional.some(({ direction }) => direction === 'second-to-first')
  ) {
    throw new OhMySajuApplicationError(
      'INVALID_DRAFT_SET',
      'interaction must compare both day-master directions.',
    );
  }
  assertDirectionalInteractionCoverage(draft.interaction, directional, participantLabels);
  const availableTension = prepared.findings.some(({ tone }) => tone === 'tension');
  if (
    (availableTension && !frictionFindings.some(({ tone }) => tone === 'tension')) ||
    (!availableTension &&
      (!frictionFindings.some(
        (finding) => isDirectionalFinding(finding) && finding.direction === 'first-to-second',
      ) ||
        !frictionFindings.some(
          (finding) => isDirectionalFinding(finding) && finding.direction === 'second-to-first',
        ))) ||
    !hasPairFinding(frictionFindings)
  ) {
    throw new OhMySajuApplicationError(
      'INVALID_DRAFT_SET',
      'friction must cite the available cross-chart tension evidence.',
    );
  }
  if (
    !hasPairFinding(durabilityFindings) ||
    !durabilityFindings.some(({ tone }) => tone === 'directional' || tone === 'connection') ||
    (availableTension && !durabilityFindings.some(({ tone }) => tone === 'tension'))
  ) {
    throw new OhMySajuApplicationError(
      'INVALID_DRAFT_SET',
      'durability must connect the pair dynamic to both connection and friction evidence.',
    );
  }
  const supportKeys = [connectionFindings, interactionFindings, frictionFindings].map((findings) =>
    findings
      .map(({ id }) => id)
      .sort()
      .join('|'),
  );
  if (new Set(supportKeys).size !== supportKeys.length) {
    throw new OhMySajuApplicationError(
      'INVALID_DRAFT_SET',
      'Connection, interaction, and friction must not recycle the same evidence set.',
    );
  }
  return draft;
}

function copyNarrator(value: unknown): OhMySajuNarratorIdentity {
  if (!isRecord(value)) {
    throw new OhMySajuApplicationError('INVALID_COMMAND', 'narrator must be an object.');
  }
  assertOnlyKeys(value, ['id', 'requestedModel'], 'narrator');
  return {
    id: assertSafeIdentifier(value.id, 'narrator.id'),
    requestedModel: assertSafeIdentifier(value.requestedModel, 'narrator.requestedModel'),
  };
}

function renderedCell(values: readonly string[]): string {
  if (values.length === 0) return '미상';
  if (values.length <= 3) return values.join(' / ');
  return `${values.slice(0, 3).join(' / ')} 외 ${values.length - 3}개`;
}

function paragraphUsesConditionalFinding(
  paragraph: OhMySajuCompatibilityParagraphDraft,
  findingsById: ReadonlyMap<string, OhMySajuCompatibilityFinding>,
): boolean {
  return paragraph.findingIds.some((id) => {
    const finding = findingsById.get(id);
    return (
      finding?.stability === 'candidate-dependent' ||
      (finding?.kind === 'day-master-ten-god-range' && (finding.tenGods?.length ?? 0) > 1)
    );
  });
}

function renderParagraph(
  paragraph: OhMySajuCompatibilityParagraphDraft,
  findingsById: ReadonlyMap<string, OhMySajuCompatibilityFinding>,
): string {
  return `${paragraphUsesConditionalFinding(paragraph, findingsById) ? '△ ' : ''}${paragraph.text}`;
}

function renderCompatibility(
  prepared: PreparedOhMySajuCompatibility,
  draft: OhMySajuCompatibilityDraft,
): string {
  const [first, second] = prepared.participants;
  const findingsById = new Map(prepared.findings.map((finding) => [finding.id, finding] as const));
  const hasConditional = prepared.findings.some(
    (finding) =>
      finding.stability === 'candidate-dependent' ||
      (finding.kind === 'day-master-ten-god-range' && (finding.tenGods?.length ?? 0) > 1),
  );
  const directional = prepared.findings.filter(isDirectionalFinding);
  const directionalFor = (
    direction: Extract<
      OhMySajuCompatibilityFinding['direction'],
      'first-to-second' | 'second-to-first'
    >,
  ): OhMySajuCompatibilityFinding | undefined => {
    const options = directional.filter((finding) => finding.direction === direction);
    return (
      options.find(({ kind }) => kind === 'day-master-ten-god-range') ??
      options.find(({ stability }) => stability === 'stable') ??
      (options.length === 1 ? options[0] : undefined)
    );
  };
  const firstToSecond = directionalFor('first-to-second');
  const secondToFirst = directionalFor('second-to-first');
  const lines = [
    `기준: ${first.label}·${second.label} 명식을 교차해 분석`,
    ...(hasConditional ? ['', '조건 안내: △ 생시 후보에 따라 달라지는 부분'] : []),
    '',
    `| 구분 | ${first.label} | ${second.label} |`,
    '| --- | --- | --- |',
    ...POSITIONS.map(
      (position) =>
        `| ${POSITION_LABELS[position]} | ${renderedCell(first.pillars[position].values)} | ${renderedCell(second.pillars[position].values)} |`,
    ),
    `| 일간 | ${renderedCell(first.dayMasters)} | ${renderedCell(second.dayMasters)} |`,
    '',
    '**일간으로 본 서로의 십신 관계**',
    '',
    '| 방향 | 관계 |',
    '| --- | --- |',
    `| ${first.label} → ${second.label} | ${firstToSecond?.statement ?? '생시 후보에 따라 달라짐'} |`,
    `| ${second.label} → ${first.label} | ${secondToFirst?.statement ?? '생시 후보에 따라 달라짐'} |`,
    '',
    `**궁합 총평:** ${renderParagraph(draft.summary, findingsById)}`,
    '',
    '## 서로 끌리고 맞는 지점',
    '',
    renderParagraph(draft.connection, findingsById),
    '',
    '## 관계가 굴러가는 방식',
    '',
    renderParagraph(draft.interaction, findingsById),
    '',
    '## 부딪히기 쉬운 지점',
    '',
    renderParagraph(draft.friction, findingsById),
    '',
    '## 오래 가는 조건',
    '',
    renderParagraph(draft.durability, findingsById),
  ];
  return lines.join('\n');
}

export function validateOhMySajuCompatibilityFromUnknown(
  command: unknown,
): ValidatedOhMySajuCompatibility {
  if (!isRecord(command) || command.command !== 'validate-compatibility') {
    throw new OhMySajuApplicationError(
      'INVALID_COMMAND',
      'command must be a validate-compatibility object.',
    );
  }
  assertOnlyKeys(
    command,
    ['schemaVersion', 'command', 'request', 'preparedDigest', 'narrator', 'draft'],
    'command',
  );
  assertVersion(command.schemaVersion);
  const request = copyCompatibilityRequest(command.request);
  const prepared = prepare(request);
  if (
    typeof command.preparedDigest !== 'string' ||
    !/^[a-f0-9]{64}$/u.test(command.preparedDigest) ||
    command.preparedDigest !== prepared.binding.digest
  ) {
    throw new OhMySajuApplicationError(
      'PREPARATION_MISMATCH',
      'preparedDigest does not match this two-person compatibility request.',
      {
        details: {
          expectedDigest: prepared.binding.digest,
          receivedDigest:
            typeof command.preparedDigest === 'string' ? command.preparedDigest : null,
        },
      },
    );
  }
  const narrator = copyNarrator(command.narrator);
  const draft = copyDraft(command.draft, prepared);
  return deepFreeze({
    schemaVersion: '1',
    binding: prepared.binding,
    participants: prepared.participants,
    candidatePairCount: prepared.candidatePairCount,
    findings: prepared.findings,
    narrator,
    sourceDraft: draft,
    presentation: {
      schemaVersion: '1',
      kind: 'compatibility',
      markdown: renderCompatibility(prepared, draft),
    },
  });
}

export function validateOhMySajuCompatibility(
  command: ValidateOhMySajuCompatibilityCommand,
): ValidatedOhMySajuCompatibility {
  return validateOhMySajuCompatibilityFromUnknown(command);
}

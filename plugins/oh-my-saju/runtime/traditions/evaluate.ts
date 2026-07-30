/** Shared evaluator kernel; each Pack still produces an isolated finding set. */
import type {
  PillarReport,
  SajuCandidatePillars,
  SajuPillarName,
  SajuPossibilityReport,
  SajuReport,
} from 'saju-engine';
import {
  analyzeKnownPillarStructure,
  analyzeStructure,
  type KnownPillarStructuralAnalysis,
  type PillarPosition,
  type StructuralAnalysis,
} from 'saju-engine/advanced';
import { deepFreeze } from '../internal/deep-freeze';
import { isRecord } from '../internal/guards';
import { canonicalJsonStringify } from '../internal/canonical-json';
import { OH_MY_SAJU_RUNTIME_MANIFEST } from '../manifest';
import { brandInterpretationReport } from '../internal/report-authenticity';
import type { FourPillars, Pillar } from 'saju-engine';
import {
  FIVE_ELEMENTS,
  getBranchTenGod,
  getTenGod,
  getTenGodChart,
  getVoidBranches,
} from './domain';
import { SajuInterpretationError } from './errors';
import { PROFILE_LIMITATION_ID_SET } from './profile-limitations';
import { BUILT_IN_TRADITION_PROFILES_V1 } from './catalog';
import { COMMON_STRUCTURAL_PARAMETERS_V1 } from '../../tradition-packs/calculation-baseline/profile';
import {
  GROWTH_STAGE_PROFILE_V1,
  GROWTH_STAGE_SOURCE_ID,
  growthStageFor,
} from '../../tradition-packs/calculation-baseline/growth-stages';
import { evaluateBuiltInTraditionPackRule } from './rule-registry';
import {
  INTERPRETATION_RULE_CONTRACTS_V1,
  INTERPRETATION_RULE_IDS_V1,
  interpretationRuleContract,
} from './rule-contracts';
import type {
  EvaluateSajuInterpretationOptions,
  FindingComparisonCoordinate,
  InterpretationEvidencePointer,
  InterpretationFinding,
  InterpretationRuleId,
  InterpretationSourceReference,
  InterpretationTopic,
  JsonValue,
  SajuInterpretationReport,
  TraditionRuleProfile,
  UnavailableInterpretationRule,
} from './types';

const ALL_RULE_ID_SET = new Set<string>(INTERPRETATION_RULE_IDS_V1);
const ALL_PILLARS: readonly SajuPillarName[] = ['year', 'month', 'day', 'hour'];
const COMMON_SOURCE_ID = 'saju-engine-calculation-contract-v1';
const STRUCTURE_SOURCE_ID = 'saju-engine-structural-analysis-v1';
const PROFILE_TEXTUAL_LAYERS = new Set<string>([
  'cross-school-common',
  'base-text',
  'commentary',
  'reconstruction',
  'modern-synthesis',
]);
const PROFILE_STATUSES = new Set<string>(['stable', 'experimental', 'deprecated']);
const REFERENCE_KINDS = new Set<string>([
  'engine-rule',
  'classical-text',
  'commentary',
  'academic-study',
  'modern-convention',
]);
const REFERENCE_VERIFICATIONS = new Set<string>([
  'engine-tested',
  'scan-verified',
  'transcription-reviewed',
  'bibliographic-only',
  'unverified',
]);
const REFERENCE_TEXTUAL_LAYERS = new Set<string>([
  'base-text',
  'commentary',
  'editorial',
  'modern-analysis',
  'not-applicable',
]);
const REFERENCE_KEYS = new Set<string>([
  'id',
  'kind',
  'title',
  'citation',
  'url',
  'locator',
  'textualLayer',
  'verification',
]);
const INTERPRETATION_TOPICS = new Set<string>([
  'chart-overview',
  'day-master',
  'five-elements',
  'yin-yang',
  'ten-gods',
  'relationships',
  'void-branches',
  'strength',
  'pattern',
  'useful-god',
  'growth-stages',
  'luck-cycles',
  'symbolic-stars',
  'compatibility',
  'timing',
]);
const CANONICAL_REFERENCES = new Map(
  BUILT_IN_TRADITION_PROFILES_V1.flatMap(({ references }) => references).map(
    (reference) => [reference.id, reference] as const,
  ),
);

interface EvaluationCandidate {
  readonly id: string;
  readonly pillars: SajuCandidatePillars;
  readonly exactReport: SajuReport | null;
}

interface CandidateMatch {
  readonly key: string;
  readonly statement: string;
  readonly topic: InterpretationTopic;
  readonly values: Readonly<Record<string, JsonValue>>;
  readonly evidence: readonly InterpretationEvidencePointer[];
  readonly sourceReferenceIds: readonly string[];
  readonly comparison?: FindingComparisonCoordinate;
  readonly coverage?: 'complete' | 'partial';
  readonly omittedPillars?: readonly SajuPillarName[];
}

type CandidateRuleResult =
  | { readonly kind: 'matches'; readonly matches: readonly CandidateMatch[] }
  | {
      readonly kind: 'unavailable';
      readonly missingPillars: readonly SajuPillarName[];
    };

function isExactReport(value: SajuReport | SajuPossibilityReport): value is SajuReport {
  return 'chronology' in value;
}

function copyReference(reference: InterpretationSourceReference): InterpretationSourceReference {
  return {
    id: reference.id,
    kind: reference.kind,
    title: reference.title,
    citation: reference.citation,
    ...(reference.url === undefined ? {} : { url: reference.url }),
    ...(reference.locator === undefined ? {} : { locator: reference.locator }),
    ...(reference.textualLayer === undefined ? {} : { textualLayer: reference.textualLayer }),
    verification: reference.verification,
  };
}

function copyJsonValue(value: JsonValue): JsonValue {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(copyJsonValue);
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, copyJsonValue(child)]),
  );
}

function isJsonValue(value: unknown): value is JsonValue {
  const stack: { value: unknown; depth: number }[] = [{ value, depth: 0 }];
  const seen = new WeakSet<object>();
  let nodes = 0;
  try {
    while (stack.length > 0) {
      const current = stack.pop()!;
      nodes += 1;
      if (current.depth > 20 || nodes > 1_000) return false;
      if (current.value === null || typeof current.value === 'boolean') continue;
      if (typeof current.value === 'string') {
        if (current.value.length > 2_000) return false;
        continue;
      }
      if (typeof current.value === 'number') {
        if (!Number.isFinite(current.value)) return false;
        continue;
      }
      if (typeof current.value !== 'object' || seen.has(current.value)) return false;
      seen.add(current.value);

      if (Array.isArray(current.value)) {
        const array = current.value;
        if (array.length > 100) return false;
        const keys = Reflect.ownKeys(array).filter((key) => key !== 'length');
        if (
          keys.length !== array.length ||
          keys.some(
            (key) =>
              typeof key !== 'string' ||
              !/^(?:0|[1-9][0-9]*)$/.test(key) ||
              Number(key) >= array.length,
          )
        ) {
          return false;
        }
        for (let index = 0; index < array.length; index += 1) {
          const descriptor = Object.getOwnPropertyDescriptor(array, String(index));
          if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
            return false;
          }
          stack.push({ value: descriptor.value, depth: current.depth + 1 });
        }
        continue;
      }

      const prototype = Object.getPrototypeOf(current.value);
      if (!isRecord(current.value) || (prototype !== Object.prototype && prototype !== null)) {
        return false;
      }
      const keys = Reflect.ownKeys(current.value);
      if (
        keys.length > 100 ||
        keys.some(
          (key) =>
            typeof key !== 'string' || key.length === 0 || key.length > 100 || key === '__proto__',
        )
      ) {
        return false;
      }
      for (const key of keys as string[]) {
        const descriptor = Object.getOwnPropertyDescriptor(current.value, key);
        if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
          return false;
        }
        stack.push({ value: descriptor.value, depth: current.depth + 1 });
      }
    }
  } catch {
    return false;
  }
  return true;
}

function copyProfile(profile: TraditionRuleProfile): TraditionRuleProfile {
  return {
    schemaVersion: '1',
    id: profile.id,
    version: profile.version,
    displayName: profile.displayName,
    school: profile.school,
    textualLayer: profile.textualLayer,
    status: profile.status,
    enabledRuleIds: [...profile.enabledRuleIds],
    supportedTopics: [...profile.supportedTopics],
    references: profile.references.map(copyReference),
    parameters: Object.fromEntries(
      Object.entries(profile.parameters).map(([key, value]) => [key, copyJsonValue(value)]),
    ),
    knownLimitations: [...profile.knownLimitations],
  };
}

function assertProfile(profile: unknown): asserts profile is TraditionRuleProfile {
  if (!isRecord(profile)) {
    throw new SajuInterpretationError('INVALID_PROFILE', 'profile must be an object.');
  }
  if (
    profile.schemaVersion !== '1' ||
    typeof profile.textualLayer !== 'string' ||
    !PROFILE_TEXTUAL_LAYERS.has(profile.textualLayer) ||
    typeof profile.status !== 'string' ||
    !PROFILE_STATUSES.has(profile.status)
  ) {
    throw new SajuInterpretationError(
      'INVALID_PROFILE',
      'profile schemaVersion, textualLayer, or status is unsupported.',
    );
  }
  if (
    typeof profile.id !== 'string' ||
    typeof profile.version !== 'string' ||
    typeof profile.displayName !== 'string' ||
    typeof profile.school !== 'string' ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(profile.id) ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(profile.version) ||
    profile.displayName.trim().length === 0 ||
    profile.school.trim().length === 0 ||
    profile.displayName.length > 160 ||
    profile.school.length > 160
  ) {
    throw new SajuInterpretationError(
      'INVALID_PROFILE',
      'profile IDs must be stable ASCII identifiers and labels must be short.',
    );
  }
  if (
    !Array.isArray(profile.enabledRuleIds) ||
    profile.enabledRuleIds.length === 0 ||
    profile.enabledRuleIds.length > INTERPRETATION_RULE_IDS_V1.length
  ) {
    throw new SajuInterpretationError(
      'INVALID_PROFILE',
      'profile.enabledRuleIds must contain at least one rule.',
    );
  }
  if (
    !Array.isArray(profile.supportedTopics) ||
    profile.supportedTopics.length > INTERPRETATION_TOPICS.size ||
    !Array.isArray(profile.references) ||
    profile.references.length > 64 ||
    !isRecord(profile.parameters) ||
    !isJsonValue(profile.parameters) ||
    !Array.isArray(profile.knownLimitations) ||
    profile.knownLimitations.length > PROFILE_LIMITATION_ID_SET.size
  ) {
    throw new SajuInterpretationError(
      'INVALID_PROFILE',
      'profile topics, references, parameters, and limitations must be serializable collections.',
    );
  }
  const enabledRuleIds = profile.enabledRuleIds;
  const enabledRuleIdSet = new Set<string>();
  for (const [index, ruleId] of enabledRuleIds.entries()) {
    if (
      typeof ruleId !== 'string' ||
      !/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(ruleId) ||
      !ALL_RULE_ID_SET.has(ruleId)
    ) {
      throw new SajuInterpretationError('UNKNOWN_RULE', 'Unknown interpretation rule.', {
        details: { index },
      });
    }
    if (enabledRuleIdSet.has(ruleId)) {
      throw new SajuInterpretationError('INVALID_PROFILE', 'profile contains a duplicate rule.', {
        details: { ruleId },
      });
    }
    enabledRuleIdSet.add(ruleId);
  }
  const referenceIds = new Set<string>();
  for (const reference of profile.references) {
    if (
      !isRecord(reference) ||
      Object.keys(reference).some((key) => !REFERENCE_KEYS.has(key)) ||
      typeof reference.id !== 'string' ||
      !/^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/.test(reference.id) ||
      typeof reference.title !== 'string' ||
      reference.title.length === 0 ||
      reference.title.length > 300 ||
      typeof reference.citation !== 'string' ||
      reference.citation.length === 0 ||
      reference.citation.length > 2_000 ||
      typeof reference.kind !== 'string' ||
      !REFERENCE_KINDS.has(reference.kind) ||
      typeof reference.verification !== 'string' ||
      !REFERENCE_VERIFICATIONS.has(reference.verification) ||
      (reference.url !== undefined &&
        (typeof reference.url !== 'string' ||
          reference.url.length > 2_048 ||
          !reference.url.startsWith('https://'))) ||
      (reference.locator !== undefined &&
        (typeof reference.locator !== 'string' || reference.locator.length > 2_000)) ||
      (reference.textualLayer !== undefined &&
        (typeof reference.textualLayer !== 'string' ||
          !REFERENCE_TEXTUAL_LAYERS.has(reference.textualLayer)))
    ) {
      throw new SajuInterpretationError(
        'INVALID_PROFILE',
        'Every profile reference must have an ID, title, and citation.',
      );
    }
    if (referenceIds.has(reference.id)) {
      throw new SajuInterpretationError(
        'INVALID_PROFILE',
        'profile reference IDs must be unique.',
        { details: { referenceId: reference.id } },
      );
    }
    referenceIds.add(reference.id);
    const canonical = CANONICAL_REFERENCES.get(reference.id);
    if (
      canonical !== undefined &&
      canonicalJsonStringify(reference) !== canonicalJsonStringify(canonical)
    ) {
      throw new SajuInterpretationError(
        'INVALID_PROFILE',
        'Plugin-owned Pack source references cannot be overridden.',
        { details: { referenceId: reference.id } },
      );
    }
    if (canonical === undefined && reference.verification === 'engine-tested') {
      throw new SajuInterpretationError(
        'INVALID_PROFILE',
        'engine-tested verification is reserved for plugin-owned Pack sources.',
        { details: { referenceId: reference.id } },
      );
    }
  }
  if (
    !profile.supportedTopics.every(
      (topic) => typeof topic === 'string' && INTERPRETATION_TOPICS.has(topic),
    ) ||
    new Set(profile.supportedTopics).size !== profile.supportedTopics.length ||
    !profile.knownLimitations.every(
      (limitation) => typeof limitation === 'string' && PROFILE_LIMITATION_ID_SET.has(limitation),
    ) ||
    new Set(profile.knownLimitations).size !== profile.knownLimitations.length
  ) {
    throw new SajuInterpretationError(
      'INVALID_PROFILE',
      'profile topics and limitations contain unsupported values.',
    );
  }
  const supportedTopics = new Set(profile.supportedTopics);
  const producedTopics = new Set(
    enabledRuleIds.map(
      (ruleId) => INTERPRETATION_RULE_CONTRACTS_V1[ruleId as InterpretationRuleId].topic,
    ),
  );
  const missingTopics = [...producedTopics].filter((topic) => !supportedTopics.has(topic));
  const extraTopics = [...supportedTopics].filter((topic) => !producedTopics.has(topic));
  if (missingTopics.length > 0 || extraTopics.length > 0) {
    throw new SajuInterpretationError(
      'INVALID_PROFILE',
      'profile.supportedTopics must exactly match enabled rule output topics.',
      { details: { missingTopics, extraTopics } },
    );
  }

  const usesDoctrineRules = enabledRuleIds.some((ruleId) => !ruleId.startsWith('core.'));
  if (usesDoctrineRules) {
    const canonicalProfile = BUILT_IN_TRADITION_PROFILES_V1.find(
      (candidate) => candidate.id === profile.id && candidate.version === profile.version,
    );
    if (
      canonicalProfile === undefined ||
      canonicalProfile.id === 'common-structural' ||
      canonicalJsonStringify(profile) !== canonicalJsonStringify(canonicalProfile)
    ) {
      throw new SajuInterpretationError(
        'INVALID_PROFILE',
        'Doctrine rules are executable only through an exact plugin-owned Tradition Pack.',
        { details: { profileId: profile.id, profileVersion: profile.version } },
      );
    }
    return;
  }

  const expectedLimitations = new Set<string>(['structural-profile-no-doctrine']);
  if (enabledRuleIdSet.has('core.element-balance')) {
    expectedLimitations.add('synthetic-element-balance-not-strength');
  }
  if (enabledRuleIdSet.has('core.relationships')) {
    expectedLimitations.add('raw-relationships-no-fortune');
  }
  const declaredLimitations = new Set<string>(profile.knownLimitations);
  const missingLimitations = [...expectedLimitations].filter((id) => !declaredLimitations.has(id));
  const extraLimitations = [...declaredLimitations].filter((id) => !expectedLimitations.has(id));
  if (missingLimitations.length > 0 || extraLimitations.length > 0) {
    throw new SajuInterpretationError(
      'INVALID_PROFILE',
      'profile.knownLimitations must exactly match enabled rule limitations.',
      { details: { missingLimitations, extraLimitations } },
    );
  }
  const requiredSources = new Set(
    profile.enabledRuleIds.flatMap((ruleId) =>
      ruleId === 'core.element-balance' || ruleId === 'core.relationships'
        ? [COMMON_SOURCE_ID, STRUCTURE_SOURCE_ID]
        : ruleId === 'core.growth-stages'
          ? [GROWTH_STAGE_SOURCE_ID]
          : [COMMON_SOURCE_ID],
    ),
  );
  const missingSources = [...requiredSources].filter((sourceId) => !referenceIds.has(sourceId));
  if (missingSources.length > 0) {
    throw new SajuInterpretationError(
      'INVALID_PROFILE',
      'profile does not declare every source required by its rules.',
      { details: { missingSourceIds: missingSources } },
    );
  }
  if (
    canonicalJsonStringify(profile.parameters) !==
    canonicalJsonStringify(COMMON_STRUCTURAL_PARAMETERS_V1)
  ) {
    throw new SajuInterpretationError(
      'INVALID_PROFILE',
      'Built-in Pack rule parameters are plugin-owned and must match their implementation.',
    );
  }
}

/** Validates and snapshots a serializable profile for a long-lived service. */
export function snapshotTraditionRuleProfile(profile: unknown): TraditionRuleProfile {
  assertProfile(profile);
  return deepFreeze(copyProfile(profile));
}

function candidatesFrom(
  report: SajuReport | SajuPossibilityReport,
): readonly EvaluationCandidate[] {
  if (isExactReport(report)) {
    return [
      {
        id: 'exact',
        pillars: {
          year: report.pillars.year,
          month: report.pillars.month,
          day: report.pillars.day,
          hour: report.pillars.hour,
        },
        exactReport: report,
      },
    ];
  }
  return report.candidates.map((candidate) => ({
    id: candidate.id,
    pillars: candidate.pillars,
    exactReport: null,
  }));
}

function requiredPillars(ruleId: InterpretationRuleId): readonly SajuPillarName[] {
  return interpretationRuleContract(ruleId).requiredPillars;
}

function missingPillars(
  candidate: EvaluationCandidate,
  required: readonly SajuPillarName[],
): readonly SajuPillarName[] {
  return required.filter((position) => candidate.pillars[position] === null);
}

function evidence(
  candidate: EvaluationCandidate,
  ...paths: readonly string[]
): readonly InterpretationEvidencePointer[] {
  return paths.map((path) => ({
    source:
      candidate.exactReport === null ? 'derived-from-candidate-pillars' : 'calculation-report',
    candidateId: candidate.id,
    path,
  }));
}

function toFourPillars(candidate: EvaluationCandidate): FourPillars {
  const hour = candidate.pillars.hour;
  if (hour === null) {
    throw new SajuInterpretationError(
      'INVALID_CALCULATION_REPORT',
      'A four-pillar rule received a candidate without an hour pillar.',
      { details: { candidateId: candidate.id } },
    );
  }
  return {
    year: pillarValue(candidate.pillars.year),
    month: pillarValue(candidate.pillars.month),
    day: pillarValue(candidate.pillars.day),
    hour: pillarValue(hour),
  };
}

function pillarValue(pillar: PillarReport): FourPillars['year'] {
  return {
    heavenlyStem: pillar.stem.korean,
    earthlyBranch: pillar.branch.korean,
  };
}

function structuralAnalysis(candidate: EvaluationCandidate): StructuralAnalysis {
  return candidate.exactReport?.facts.structure ?? analyzeStructure(toFourPillars(candidate));
}

function knownPillarValues(
  candidate: EvaluationCandidate,
): Readonly<Partial<Record<PillarPosition, Pillar>>> {
  return {
    year: pillarValue(candidate.pillars.year),
    month: pillarValue(candidate.pillars.month),
    day: pillarValue(candidate.pillars.day),
    ...(candidate.pillars.hour === null ? {} : { hour: pillarValue(candidate.pillars.hour) }),
  };
}

function knownStructuralAnalysis(candidate: EvaluationCandidate): KnownPillarStructuralAnalysis {
  return analyzeKnownPillarStructure(knownPillarValues(candidate));
}

function omittedPillarsFor(candidate: EvaluationCandidate): readonly SajuPillarName[] {
  return ALL_PILLARS.filter((position) => candidate.pillars[position] === null);
}

function structuralEvidence(
  candidate: EvaluationCandidate,
  exactPath: string,
): readonly InterpretationEvidencePointer[] {
  if (candidate.exactReport !== null) return evidence(candidate, exactPath, 'pillars');
  const paths = ALL_PILLARS.filter((position) => candidate.pillars[position] !== null).map(
    (position) => `pillars.${position}`,
  );
  return evidence(candidate, ...paths);
}

type RawRelationMatch = {
  readonly relation:
    | 'stem-combination'
    | 'branch-combination'
    | 'branch-clash'
    | 'branch-punishment'
    | 'branch-break'
    | 'branch-harm'
    | 'three-harmony';
  readonly positions: readonly PillarPosition[];
  readonly members: readonly string[];
  readonly kind?: 'directed-cycle' | 'mutual' | 'self';
};

const RELATION_POSITION_LABELS: Readonly<Record<PillarPosition, string>> = {
  year: '연',
  month: '월',
  day: '일',
  hour: '시',
};

function relationMatches(
  structure: Pick<StructuralAnalysis, 'relationships'>,
): readonly RawRelationMatch[] {
  return [
    ...structure.relationships.stemCombinations.map(({ positions, members }) => ({
      relation: 'stem-combination' as const,
      positions,
      members,
    })),
    ...structure.relationships.branchCombinations.map(({ positions, members }) => ({
      relation: 'branch-combination' as const,
      positions,
      members,
    })),
    ...structure.relationships.branchClashes.map(({ positions, members }) => ({
      relation: 'branch-clash' as const,
      positions,
      members,
    })),
    ...structure.relationships.branchPunishments.map(({ kind, positions, members }) => ({
      relation: 'branch-punishment' as const,
      kind,
      positions,
      members,
    })),
    ...structure.relationships.branchBreaks.map(({ positions, members }) => ({
      relation: 'branch-break' as const,
      positions,
      members,
    })),
    ...structure.relationships.branchHarms.map(({ positions, members }) => ({
      relation: 'branch-harm' as const,
      positions,
      members,
    })),
    ...structure.relationships.threeHarmonies.map(({ positions, members }) => ({
      relation: 'three-harmony' as const,
      positions,
      members,
    })),
  ];
}

function relationLabel(match: RawRelationMatch): string {
  const positions = match.positions.map((position) => RELATION_POSITION_LABELS[position]).join('-');
  const label = {
    'stem-combination': '천간합',
    'branch-combination': '지지합',
    'branch-clash': '지지충',
    'branch-punishment':
      match.kind === 'directed-cycle'
        ? '지지형(방향)'
        : match.kind === 'self'
          ? '지지형(자형)'
          : '지지형(상형)',
    'branch-break': '지지파',
    'branch-harm': '지지해',
    'three-harmony': '삼합',
  }[match.relation];
  return `${positions} ${label}:${match.members.join('')}`;
}

function positionForRule(ruleId: InterpretationRuleId): SajuPillarName | null {
  switch (ruleId) {
    case 'core.pillar-year':
      return 'year';
    case 'core.pillar-month':
      return 'month';
    case 'core.pillar-day':
      return 'day';
    case 'core.pillar-hour':
      return 'hour';
    default:
      return null;
  }
}

function evaluateCandidateRule(
  candidate: EvaluationCandidate,
  ruleId: InterpretationRuleId,
): CandidateRuleResult {
  const missing = missingPillars(candidate, requiredPillars(ruleId));
  if (missing.length > 0) return { kind: 'unavailable', missingPillars: missing };

  if (!ruleId.startsWith('core.')) {
    const structure =
      candidate.pillars.hour === null
        ? knownStructuralAnalysis(candidate)
        : structuralAnalysis(candidate);
    const match = evaluateBuiltInTraditionPackRule(ruleId, {
      pillars: candidate.pillars,
      structure,
    });
    const evidencePaths =
      candidate.exactReport === null
        ? [
            ...new Set(
              match.evidencePaths.map((path) => (path.startsWith('pillars') ? path : 'pillars')),
            ),
          ]
        : match.evidencePaths;
    return {
      kind: 'matches',
      matches: [
        {
          ...match,
          evidence: evidence(candidate, ...evidencePaths),
        },
      ],
    };
  }

  if (ruleId === 'core.day-master') {
    const stem = candidate.pillars.day.stem;
    return {
      kind: 'matches',
      matches: [
        {
          key: stem.korean,
          statement: `일간은 ${stem.korean}(${stem.hanja}), ${stem.yinYang}의 ${stem.element}입니다.`,
          topic: 'day-master',
          values: {
            stem: stem.korean,
            hanja: stem.hanja,
            element: stem.element,
            yinYang: stem.yinYang,
          },
          evidence: evidence(candidate, 'pillars.day.stem'),
          sourceReferenceIds: [COMMON_SOURCE_ID],
        },
      ],
    };
  }

  const position = positionForRule(ruleId);
  if (position !== null) {
    const pillar = candidate.pillars[position];
    if (pillar === null) {
      return { kind: 'unavailable', missingPillars: [position] };
    }
    return {
      kind: 'matches',
      matches: [
        {
          key: `${position}:${pillar.cycleIndex}`,
          statement: `${position} 기둥은 ${pillar.korean}(${pillar.hanja})입니다.`,
          topic: 'chart-overview',
          values: {
            position,
            cycleIndex: pillar.cycleIndex,
            korean: pillar.korean,
            hanja: pillar.hanja,
          },
          evidence: evidence(candidate, `pillars.${position}`),
          sourceReferenceIds: [COMMON_SOURCE_ID],
        },
      ],
    };
  }

  if (ruleId === 'core.element-balance') {
    const omittedPillars = omittedPillarsFor(candidate);
    const partial = omittedPillars.length > 0;
    const known = partial ? knownStructuralAnalysis(candidate) : null;
    const balance = known?.elementBalance ?? structuralAnalysis(candidate).elementBalance;
    const values: Record<string, JsonValue> = {
      profileId: balance.profileId,
      totalWeight: balance.totalWeight,
      scores: balance.scores,
      percentages: balance.percentages,
      strongest: balance.strongest,
      weakest: balance.weakest,
      status: 'synthetic-visualization-only',
      knownPillars: partial ? known!.knownPillars : ALL_PILLARS,
      omittedPillars,
    };
    const compact = FIVE_ELEMENTS.map(
      (element) => `${element} ${balance.percentages[element]}%`,
    ).join(', ');
    return {
      kind: 'matches',
      matches: [
        {
          key: canonicalJsonStringify(values),
          statement: partial
            ? `확인된 삼주의 합성 오행 소계는 ${compact}입니다. 시주가 빠진 부분 결과이며 신강·신약 판정이 아닙니다.`
            : `합성 오행 분포는 ${compact}입니다. 이 값은 신강·신약 판정이 아닙니다.`,
          topic: 'five-elements',
          values,
          evidence: structuralEvidence(candidate, 'facts.structure.elementBalance'),
          sourceReferenceIds: [COMMON_SOURCE_ID, STRUCTURE_SOURCE_ID],
          ...(partial ? { coverage: 'partial' as const, omittedPillars } : {}),
        },
      ],
    };
  }

  if (ruleId === 'core.yin-yang-balance') {
    const omittedPillars = omittedPillarsFor(candidate);
    const partial = omittedPillars.length > 0;
    const known = partial ? knownStructuralAnalysis(candidate) : null;
    const balance = known?.yinYangBalance ?? structuralAnalysis(candidate).yinYangBalance;
    const values: Record<string, JsonValue> = {
      basis: balance.basis,
      counts: balance.counts,
      percentages: balance.percentages,
      knownPillars: partial ? known!.knownPillars : ALL_PILLARS,
      omittedPillars,
    };
    return {
      kind: 'matches',
      matches: [
        {
          key: canonicalJsonStringify(values),
          statement: partial
            ? `확인된 삼주의 여섯 글자는 양 ${balance.counts.양}, 음 ${balance.counts.음}입니다. 시주 두 글자는 포함하지 않았습니다.`
            : `보이는 여덟 글자는 양 ${balance.counts.양}, 음 ${balance.counts.음}입니다.`,
          topic: 'yin-yang',
          values,
          evidence: structuralEvidence(candidate, 'facts.structure.yinYangBalance'),
          sourceReferenceIds: [COMMON_SOURCE_ID],
          ...(partial ? { coverage: 'partial' as const, omittedPillars } : {}),
        },
      ],
    };
  }

  if (ruleId === 'core.ten-gods') {
    const omittedPillars = omittedPillarsFor(candidate);
    const partial = omittedPillars.length > 0;
    let values: Readonly<Record<string, JsonValue>>;
    if (partial) {
      const dayMaster = candidate.pillars.day.stem.korean;
      const tenGodFor = (
        pillar: PillarReport,
        day = false,
      ): Readonly<Record<'stem' | 'branch', string>> => ({
        stem: day ? '일간' : getTenGod(dayMaster, pillar.stem.korean),
        branch: getBranchTenGod(dayMaster, pillar.branch.korean),
      });
      values = {
        year: tenGodFor(candidate.pillars.year),
        month: tenGodFor(candidate.pillars.month),
        day: tenGodFor(candidate.pillars.day, true),
        branchBasis: 'main-hidden-stem',
        knownPillars: ['year', 'month', 'day'],
        omittedPillars,
      };
    } else {
      const chart =
        candidate.exactReport?.facts.tenGods ?? getTenGodChart(toFourPillars(candidate));
      values = {
        year: chart.year,
        month: chart.month,
        day: chart.day,
        hour: chart.hour,
        branchBasis: 'main-hidden-stem',
        knownPillars: ALL_PILLARS,
        omittedPillars,
      };
    }
    return {
      kind: 'matches',
      matches: [
        {
          key: canonicalJsonStringify(values),
          statement: partial
            ? '일간 기준 십신 관계를 확인된 연주·월주·일주의 표면 천간과 지지 본기로 계산했습니다. 시주 십신은 미정입니다.'
            : '일간 기준 십신 관계를 표면 천간과 지지 본기로 계산했습니다.',
          topic: 'ten-gods',
          values,
          evidence: structuralEvidence(candidate, 'facts.tenGods'),
          sourceReferenceIds: [COMMON_SOURCE_ID],
          ...(partial ? { coverage: 'partial' as const, omittedPillars } : {}),
        },
      ],
    };
  }

  if (ruleId === 'core.relationships') {
    const omittedPillars = omittedPillarsFor(candidate);
    const partial = omittedPillars.length > 0;
    const structure = partial ? knownStructuralAnalysis(candidate) : structuralAnalysis(candidate);
    const matches = relationMatches(structure);
    const labels = matches.map(relationLabel).sort();
    const values = {
      matches,
      interpretation: 'raw-match-only',
      knownPillars: partial
        ? (structure as KnownPillarStructuralAnalysis).knownPillars
        : ALL_PILLARS,
      omittedPillars,
    } as const;
    return {
      kind: 'matches',
      matches: [
        {
          key: canonicalJsonStringify(values),
          statement: partial
            ? labels.length === 0
              ? '확인된 삼주 안에서는 현재 지원하는 합·충·형·파·해·삼합의 원시 관계가 탐지되지 않았습니다. 시주가 추가되면 결과가 달라질 수 있습니다.'
              : `확인된 삼주 안에서 ${labels.join(', ')}이 탐지됐습니다. 시주가 추가되면 관계가 더 생길 수 있으며 성립 강도나 길흉은 판단하지 않습니다.`
            : labels.length === 0
              ? '현재 지원하는 합·충·형·파·해·삼합 표에서 원시 관계 쌍이 탐지되지 않았습니다.'
              : `원시 관계 표에서 ${labels.join(', ')}이 탐지됐습니다. 성립 강도나 길흉은 판단하지 않습니다.`,
          topic: 'relationships',
          values,
          evidence: structuralEvidence(candidate, 'facts.structure.relationships'),
          sourceReferenceIds: [COMMON_SOURCE_ID, STRUCTURE_SOURCE_ID],
          ...(partial ? { coverage: 'partial' as const, omittedPillars } : {}),
        },
      ],
    };
  }

  if (ruleId === 'core.growth-stages') {
    const omittedPillars = omittedPillarsFor(candidate);
    const partial = omittedPillars.length > 0;
    const knownPillars = ALL_PILLARS.filter((position) => candidate.pillars[position] !== null);
    const dayStem = candidate.pillars.day.stem.korean;
    const stageEntries = knownPillars.map((position) => {
      const branch = candidate.pillars[position]!.branch.korean;
      return {
        position,
        branch,
        stage: growthStageFor(dayStem, branch),
      };
    });
    const stages = Object.fromEntries(
      stageEntries.map(({ position, branch, stage }) => [position, { branch, stage }]),
    );
    const stageSummary = stageEntries
      .map(
        ({ position, branch, stage }) =>
          `${RELATION_POSITION_LABELS[position]}지 ${branch}=${stage}`,
      )
      .join(', ');
    const values: Readonly<Record<string, JsonValue>> = {
      profileId: GROWTH_STAGE_PROFILE_V1.id,
      subject: GROWTH_STAGE_PROFILE_V1.subject,
      dayStem,
      yinStemDirection: GROWTH_STAGE_PROFILE_V1.yinStemDirection,
      earthStemMapping: GROWTH_STAGE_PROFILE_V1.earthStemMapping,
      interpretation: GROWTH_STAGE_PROFILE_V1.interpretation,
      stages,
      knownPillars,
      omittedPillars,
    };
    return {
      kind: 'matches',
      matches: [
        {
          key: canonicalJsonStringify(values),
          statement: partial
            ? `일간 ${dayStem} 기준 십이운성 원시 단계는 ${stageSummary}입니다. 시주는 포함하지 않았습니다. 길흉이나 강약을 판정하지 않습니다.`
            : `일간 ${dayStem} 기준 십이운성 원시 단계는 ${stageSummary}입니다. 길흉이나 강약을 판정하지 않습니다.`,
          topic: 'growth-stages',
          values,
          evidence: evidence(
            candidate,
            'pillars.day.stem',
            ...knownPillars.map((position) => `pillars.${position}.branch`),
          ),
          sourceReferenceIds: [GROWTH_STAGE_SOURCE_ID],
          ...(partial ? { coverage: 'partial' as const, omittedPillars } : {}),
        },
      ],
    };
  }

  const voidBranches = getVoidBranches(
    candidate.pillars.day.stem.korean,
    candidate.pillars.day.branch.korean,
  );
  return {
    kind: 'matches',
    matches: [
      {
        key: voidBranches.join(''),
        statement: `일주 순 기준 공망 지지는 ${voidBranches.join('·')}입니다.`,
        topic: 'void-branches',
        values: { anchor: 'day-pillar', branches: voidBranches },
        evidence: evidence(candidate, 'pillars.day'),
        sourceReferenceIds: [COMMON_SOURCE_ID],
      },
    ],
  };
}

function hashKey(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function coreComparisonCoordinate(
  ruleId: InterpretationRuleId,
  topic: InterpretationTopic,
  outcomeKey: string,
): FindingComparisonCoordinate {
  return {
    definitionId: `${ruleId}.v1`,
    conceptId: ruleId,
    methodId: 'common-structural',
    subjectKey: topic,
    outcomeKey,
  };
}

function evaluateRules(
  candidates: readonly EvaluationCandidate[],
  profile: TraditionRuleProfile,
): {
  readonly findings: readonly InterpretationFinding[];
  readonly unavailableRules: readonly UnavailableInterpretationRule[];
} {
  const candidateIds = candidates.map(({ id }) => id);
  const findings: InterpretationFinding[] = [];
  const unavailableRules: UnavailableInterpretationRule[] = [];
  const usedFindingIds = new Set<string>();

  for (const ruleId of profile.enabledRuleIds) {
    const grouped = new Map<
      string,
      { match: CandidateMatch; candidateIds: string[]; evidence: InterpretationEvidencePointer[] }
    >();
    const unavailable: {
      candidateId: string;
      missingPillars: readonly SajuPillarName[];
    }[] = [];

    for (const candidate of candidates) {
      const result = evaluateCandidateRule(candidate, ruleId);
      if (result.kind === 'unavailable') {
        unavailable.push({
          candidateId: candidate.id,
          missingPillars: result.missingPillars,
        });
        continue;
      }
      for (const match of result.matches) {
        const existing = grouped.get(match.key);
        if (existing === undefined) {
          grouped.set(match.key, {
            match,
            candidateIds: [candidate.id],
            evidence: [...match.evidence],
          });
        } else {
          existing.candidateIds.push(candidate.id);
          existing.evidence.push(...match.evidence);
        }
      }
    }

    for (const [key, group] of [...grouped.entries()].sort(([left], [right]) =>
      left.localeCompare(right),
    )) {
      const matched = [...group.candidateIds].sort();
      const matchedSet = new Set(matched);
      const baseId = `${profile.id}@${profile.version}:${ruleId}:${hashKey(key)}`;
      let findingId = baseId;
      let collisionIndex = 2;
      while (usedFindingIds.has(findingId)) {
        findingId = `${baseId}-${collisionIndex}`;
        collisionIndex += 1;
      }
      usedFindingIds.add(findingId);
      findings.push({
        id: findingId,
        ruleId,
        profileId: profile.id,
        profileVersion: profile.version,
        topic: group.match.topic,
        category: interpretationRuleContract(ruleId).category,
        stability: matched.length === candidates.length ? 'stable' : 'candidate-dependent',
        coverage: group.match.coverage ?? 'complete',
        omittedPillars: [...(group.match.omittedPillars ?? [])],
        statement: group.match.statement,
        values: group.match.values,
        candidateIds: matched,
        absentCandidateIds: candidateIds.filter((candidateId) => !matchedSet.has(candidateId)),
        evidence: group.evidence.sort((left, right) => {
          const candidateOrder = left.candidateId.localeCompare(right.candidateId);
          return candidateOrder === 0 ? left.path.localeCompare(right.path) : candidateOrder;
        }),
        sourceReferenceIds: [...group.match.sourceReferenceIds],
        comparison:
          group.match.comparison ??
          coreComparisonCoordinate(ruleId, group.match.topic, group.match.key),
      });
    }

    if (unavailable.length > 0) {
      unavailableRules.push({
        ruleId,
        reason: 'missing-required-pillar',
        missingPillars: [
          ...new Set(unavailable.flatMap(({ missingPillars: pillars }) => pillars)),
        ].sort((left, right) => ALL_PILLARS.indexOf(left) - ALL_PILLARS.indexOf(right)),
        candidateIds: unavailable.map(({ candidateId }) => candidateId).sort(),
      });
    }
  }

  return { findings, unavailableRules };
}

export function evaluateSajuInterpretation(
  report: SajuReport | SajuPossibilityReport,
  options: EvaluateSajuInterpretationOptions,
): SajuInterpretationReport {
  if (
    !Object.isFrozen(report) ||
    !isRecord(report) ||
    !isRecord(report.audit) ||
    !isRecord(report.audit.engine)
  ) {
    throw new SajuInterpretationError(
      'INVALID_CALCULATION_REPORT',
      'A frozen in-process saju-engine calculation report is required.',
    );
  }
  if (!isRecord(options)) {
    throw new SajuInterpretationError(
      'INVALID_PROFILE',
      'interpretation options must contain a profile.',
    );
  }
  assertProfile(options.profile);
  if (!isExactReport(report) && !Array.isArray(report.candidates)) {
    throw new SajuInterpretationError(
      'INVALID_CALCULATION_REPORT',
      'A possibility report must contain a candidate array.',
    );
  }
  const candidates = candidatesFrom(report);
  if (candidates.length === 0) {
    throw new SajuInterpretationError(
      'INVALID_CALCULATION_REPORT',
      'The calculation report contains no candidates.',
    );
  }
  const evaluated = evaluateRules(candidates, options.profile);
  const result: SajuInterpretationReport = {
    schemaVersion: OH_MY_SAJU_RUNTIME_MANIFEST.traditions.reportSchemaVersion,
    profile: copyProfile(options.profile),
    subject: {
      kind: isExactReport(report) ? 'exact' : 'possibilities',
      candidateCount: candidates.length,
      hourPillar: isExactReport(report)
        ? 'known'
        : report.hourPillar === 'omitted'
          ? 'omitted'
          : 'candidate',
    },
    findings: evaluated.findings,
    unavailableRules: evaluated.unavailableRules,
    audit: {
      engine: report.audit.engine,
      sourceReportSchemaVersion: report.schemaVersion,
      evaluationMethod: 'candidate-set-intersection-v1',
      supportDurationsAreProbabilities: false,
      profileIsolation: 'single-profile-no-implicit-mixing',
    },
  };
  return deepFreeze(brandInterpretationReport(result));
}

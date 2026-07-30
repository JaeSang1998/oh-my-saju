import { calculateSaju } from 'saju-engine';
import { calculateSajuPossibilities } from 'saju-engine';
import { deepFreeze } from '../internal/deep-freeze';
import { isRecord } from '../internal/guards';
import { resolveTraditionPackProfile } from './catalog';
import { SajuInterpretationError } from './errors';
import { evaluateSajuInterpretation } from './evaluate';
import { interpretationRuleContract } from './rule-contracts';
/** Side-by-side Pack comparison without voting or winner selection. */
import type {
  CalculateSajuSchoolComparisonOptions,
  ExactSajuSchoolComparisonResult,
  FindingComparisonCoordinate,
  InterpretationFinding,
  PossibilitySajuSchoolComparisonResult,
  SajuInterpretationCalculationRequest,
  TraditionPackRef,
  TraditionPackResult,
  SajuSchoolComparison,
  SchoolComparisonRow,
  SchoolComparisonStatus,
} from './types';

const MAXIMUM_PACKS = 16;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;

function copyPackRef(value: unknown, index: number): TraditionPackRef {
  if (
    !isRecord(value) ||
    Object.keys(value).some((key) => key !== 'id' && key !== 'version') ||
    typeof value.id !== 'string' ||
    typeof value.version !== 'string' ||
    !SAFE_ID.test(value.id) ||
    !SAFE_ID.test(value.version)
  ) {
    throw new SajuInterpretationError(
      'INVALID_PROFILE_SET',
      'Every Tradition Pack reference must contain safe id and version fields.',
      { details: { index } },
    );
  }
  return { id: value.id, version: value.version };
}

function resolvePacks(options: unknown): readonly {
  readonly packRef: TraditionPackRef;
  readonly profile: NonNullable<ReturnType<typeof resolveTraditionPackProfile>>;
}[] {
  if (
    !isRecord(options) ||
    !Array.isArray(options.packRefs) ||
    options.packRefs.length === 0 ||
    options.packRefs.length > MAXIMUM_PACKS
  ) {
    throw new SajuInterpretationError(
      'INVALID_PROFILE_SET',
      `packRefs must contain between 1 and ${MAXIMUM_PACKS} installed Tradition Packs.`,
    );
  }

  const seen = new Set<string>();
  return options.packRefs.map((value, index) => {
    const packRef = copyPackRef(value, index);
    const key = `${packRef.id}@${packRef.version}`;
    if (seen.has(key)) {
      throw new SajuInterpretationError(
        'INVALID_PROFILE_SET',
        'packRefs cannot contain duplicates.',
        { details: { index } },
      );
    }
    seen.add(key);
    const profile = resolveTraditionPackProfile(packRef);
    if (profile === undefined) {
      throw new SajuInterpretationError(
        'UNKNOWN_PROFILE',
        'The requested Tradition Pack is not registered.',
        { details: { index } },
      );
    }
    return { packRef, profile };
  });
}

function outcomeSignature(coordinates: readonly FindingComparisonCoordinate[]): string {
  return [...new Set(coordinates.map(({ outcomeKey }) => outcomeKey))].sort().join('\u001f');
}

function overlapExists(signatures: readonly (readonly string[])[]): boolean {
  for (let leftIndex = 0; leftIndex < signatures.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < signatures.length; rightIndex += 1) {
      const right = new Set(signatures[rightIndex]);
      if (signatures[leftIndex]?.some((value) => right.has(value))) return true;
    }
  }
  return false;
}

export function classifySchoolComparisonCoordinates(
  coordinatesByPack: readonly (readonly FindingComparisonCoordinate[])[],
): SchoolComparisonStatus {
  const withEvidence = coordinatesByPack.filter((coordinates) => coordinates.length > 0);
  if (withEvidence.length < 2) return 'insufficient-evidence';

  const definitionIds = new Set(
    withEvidence.flatMap((coordinates) => coordinates.map(({ definitionId }) => definitionId)),
  );
  const subjectKeys = new Set(
    withEvidence.flatMap((coordinates) => coordinates.map(({ subjectKey }) => subjectKey)),
  );
  if (definitionIds.size !== 1 || subjectKeys.size !== 1) return 'semantic-mismatch';

  const signatures = withEvidence.map(outcomeSignature);
  if (new Set(signatures).size === 1) return 'unanimous-agreement';
  const outcomeSets = withEvidence.map((coordinates) => [
    ...new Set(coordinates.map(({ outcomeKey }) => outcomeKey)),
  ]);
  return overlapExists(outcomeSets) ? 'partial-agreement' : 'disagreement';
}

function comparisonStatus(
  findingsByPack: readonly (readonly InterpretationFinding[])[],
): SchoolComparisonStatus {
  return classifySchoolComparisonCoordinates(
    findingsByPack.map((findings) => findings.map(({ comparison }) => comparison)),
  );
}

function buildComparison(packResults: readonly TraditionPackResult[]): SajuSchoolComparison {
  const conceptIds = [
    ...new Set(
      packResults.flatMap(({ interpretation }) => [
        ...interpretation.findings.map(({ comparison }) => comparison.conceptId),
        ...interpretation.unavailableRules.map(
          ({ ruleId }) => interpretationRuleContract(ruleId).comparisonConceptId,
        ),
      ]),
    ),
  ].sort();

  const rows: SchoolComparisonRow[] = conceptIds.map((conceptId) => {
    const findingsByPack = packResults.map(({ interpretation }) =>
      interpretation.findings.filter(({ comparison }) => comparison.conceptId === conceptId),
    );
    const allFindings = findingsByPack.flat();
    const unavailableCount = packResults.reduce(
      (count, { interpretation }) =>
        count +
        interpretation.unavailableRules.filter(
          ({ ruleId }) => interpretationRuleContract(ruleId).comparisonConceptId === conceptId,
        ).length,
      0,
    );
    const stability =
      allFindings.length === 0
        ? 'unavailable'
        : allFindings.some(({ stability: value }) => value === 'candidate-dependent')
          ? 'candidate-dependent'
          : 'stable';
    const unavailableRule = packResults
      .flatMap(({ interpretation }) => interpretation.unavailableRules)
      .find(({ ruleId }) => interpretationRuleContract(ruleId).comparisonConceptId === conceptId);
    const topic =
      allFindings[0]?.topic ??
      (unavailableRule === undefined
        ? undefined
        : interpretationRuleContract(unavailableRule.ruleId).topic);
    if (topic === undefined) {
      throw new SajuInterpretationError(
        'INCOMPATIBLE_PROFILE_SET',
        'A comparison row cannot be built without a topic.',
      );
    }

    return {
      id: `comparison:${conceptId}`,
      conceptId,
      topic,
      status:
        unavailableCount > 0 && allFindings.length < 2
          ? 'insufficient-evidence'
          : comparisonStatus(findingsByPack),
      stability,
      definitionIds: [
        ...new Set(allFindings.map(({ comparison: coordinate }) => coordinate.definitionId)),
      ].sort(),
      profiles: packResults.map(({ packRef, profileRef, interpretation }, index) => ({
        packRef,
        profileRef,
        findingIds: findingsByPack[index]!.map(({ id }) => id),
        outcomeKeys: [
          ...new Set(
            findingsByPack[index]!.map(({ comparison: coordinate }) => coordinate.outcomeKey),
          ),
        ].sort(),
        unavailableRuleIds: interpretation.unavailableRules
          .filter(
            ({ ruleId }) => interpretationRuleContract(ruleId).comparisonConceptId === conceptId,
          )
          .map(({ ruleId }) => ruleId),
      })),
      resolution: 'reported-unresolved',
    };
  });

  return {
    schemaVersion: '1',
    rows,
    resolution: 'reported-unresolved',
    majorityVoteApplied: false,
    winnerSelected: false,
    supportDurationsAreProbabilities: false,
  };
}

function packResultsFor(
  report: Parameters<typeof evaluateSajuInterpretation>[0],
  packs: ReturnType<typeof resolvePacks>,
): readonly TraditionPackResult[] {
  return packs.map(({ packRef, profile }) => ({
    packRef,
    profileRef: { id: profile.id, version: profile.version },
    interpretation: evaluateSajuInterpretation(report, { profile }),
  }));
}

/* eslint-disable no-redeclare -- TypeScript overload signatures share one implementation. */
export function calculateSajuSchoolComparison(
  calculation: Extract<SajuInterpretationCalculationRequest, { kind: 'exact' }>,
  options: CalculateSajuSchoolComparisonOptions,
): ExactSajuSchoolComparisonResult;
export function calculateSajuSchoolComparison(
  calculation: Extract<SajuInterpretationCalculationRequest, { kind: 'possibilities' }>,
  options: CalculateSajuSchoolComparisonOptions,
): PossibilitySajuSchoolComparisonResult;
export function calculateSajuSchoolComparison(
  calculation: SajuInterpretationCalculationRequest,
  options: CalculateSajuSchoolComparisonOptions,
): ExactSajuSchoolComparisonResult | PossibilitySajuSchoolComparisonResult;
export function calculateSajuSchoolComparison(
  calculation: SajuInterpretationCalculationRequest,
  options: CalculateSajuSchoolComparisonOptions,
): ExactSajuSchoolComparisonResult | PossibilitySajuSchoolComparisonResult {
  if (
    !isRecord(calculation) ||
    (calculation.kind !== 'exact' && calculation.kind !== 'possibilities') ||
    !('request' in calculation)
  ) {
    throw new SajuInterpretationError(
      'INVALID_REQUEST',
      'calculation must contain an exact or possibilities request.',
    );
  }
  const packs = resolvePacks(options);

  if (calculation.kind === 'exact') {
    const report = calculateSaju(calculation.request);
    const packResults = packResultsFor(report, packs);
    return deepFreeze({
      schemaVersion: '1',
      calculationKind: 'exact',
      calculation: report,
      packResults,
      comparison: buildComparison(packResults),
    });
  }

  const report = calculateSajuPossibilities(calculation.request);
  const packResults = packResultsFor(report, packs);
  return deepFreeze({
    schemaVersion: '1',
    calculationKind: 'possibilities',
    calculation: report,
    packResults,
    comparison: buildComparison(packResults),
  });
}
/* eslint-enable no-redeclare */

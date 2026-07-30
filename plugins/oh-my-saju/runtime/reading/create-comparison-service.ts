/** Run isolated reading tasks for a Pack comparison. */
import { calculateSajuSchoolComparison } from '../traditions/calculate-school-comparison';
import { resolveTraditionPackProfile } from '../traditions/catalog';
import type {
  ExactSajuSchoolComparisonResult,
  PossibilitySajuSchoolComparisonResult,
  TraditionPackRef,
  TraditionPackResult,
} from '../traditions/types';
import { deepFreeze } from '../internal/deep-freeze';
import { isRecord } from '../internal/guards';
import { createAiSajuReading } from './create-reading';
import { AiReadingError } from './errors';
import {
  assertReadingAudience,
  assertReadingLocale,
  assertReadingPurpose,
  assertReadingVariantPolicy,
  assertSafeIdentifier,
  snapshotNarrator,
} from './option-validation';
import type {
  AiSajuComparisonService,
  AiSajuComparisonPackReading,
  AiSajuServiceRequest,
  PrepareAiSajuNarrationRequestInput,
  CreateAiSajuComparisonServiceOptions,
  ExactAiSajuComparisonServiceResult,
  PossibilityAiSajuComparisonServiceResult,
  SajuNarrator,
  SajuReadingAudience,
  SajuReadingLocale,
  SajuReadingPurpose,
  SajuVariantPolicy,
} from './types';

export interface ComparisonReadingDefaults {
  readonly locale: SajuReadingLocale;
  readonly purpose: SajuReadingPurpose;
  readonly audience: SajuReadingAudience;
  readonly variantPolicy: SajuVariantPolicy;
}

/** Shared by the comparison service and provider-neutral agent preparation seam. */
export const DEFAULT_COMPARISON_READING_OPTIONS: ComparisonReadingDefaults = deepFreeze({
  locale: 'ko-KR',
  purpose: 'school-comparison',
  audience: 'general',
  variantPolicy: 'include-candidate-dependent',
});
const MAXIMUM_PACK_COUNT = 16;

interface ComparisonServiceSnapshot extends ComparisonReadingDefaults {
  readonly packRefs: readonly TraditionPackRef[];
  readonly narrator: SajuNarrator;
  readonly locale: SajuReadingLocale;
  readonly purpose: SajuReadingPurpose;
  readonly audience: SajuReadingAudience;
  readonly variantPolicy: SajuVariantPolicy;
}

function snapshotPackRefs(value: unknown): readonly TraditionPackRef[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAXIMUM_PACK_COUNT) {
    throw new AiReadingError(
      'INVALID_REQUEST',
      `options.packRefs must contain between 1 and ${MAXIMUM_PACK_COUNT} entries.`,
    );
  }

  const seen = new Set<string>();
  const refs = value.map((item, index) => {
    if (!isRecord(item)) {
      throw new AiReadingError('INVALID_REQUEST', `options.packRefs[${index}] must be an object.`);
    }
    const id = assertSafeIdentifier(item.id, `options.packRefs[${index}].id`);
    const version = assertSafeIdentifier(item.version, `options.packRefs[${index}].version`);
    const key = `${id}@${version}`;
    if (seen.has(key)) {
      throw new AiReadingError(
        'INVALID_REQUEST',
        `options.packRefs contains the duplicate Tradition Pack ${key}.`,
      );
    }
    seen.add(key);

    const packRef = { id, version };
    if (resolveTraditionPackProfile(packRef) === undefined) {
      throw new AiReadingError(
        'INVALID_REQUEST',
        `options.packRefs contains the unknown Tradition Pack ${key}.`,
      );
    }
    return packRef;
  });

  return deepFreeze(refs);
}

function snapshotOptions(options: unknown): ComparisonServiceSnapshot {
  if (!isRecord(options)) {
    throw new AiReadingError('INVALID_REQUEST', 'comparison service options are required.');
  }
  return deepFreeze({
    packRefs: snapshotPackRefs(options.packRefs),
    narrator: snapshotNarrator(options.narrator),
    locale: assertReadingLocale(
      options.locale ?? DEFAULT_COMPARISON_READING_OPTIONS.locale,
      'options.locale',
    ),
    purpose: assertReadingPurpose(
      options.purpose ?? DEFAULT_COMPARISON_READING_OPTIONS.purpose,
      'options.purpose',
    ),
    audience: assertReadingAudience(
      options.audience ?? DEFAULT_COMPARISON_READING_OPTIONS.audience,
      'options.audience',
    ),
    variantPolicy: assertReadingVariantPolicy(
      options.variantPolicy ?? DEFAULT_COMPARISON_READING_OPTIONS.variantPolicy,
      'options.variantPolicy',
    ),
  });
}

function assertServiceRequest(value: unknown): asserts value is AiSajuServiceRequest {
  if (
    !isRecord(value) ||
    !isRecord(value.calculation) ||
    (value.calculation.kind !== 'exact' && value.calculation.kind !== 'possibilities') ||
    !('request' in value.calculation)
  ) {
    throw new AiReadingError(
      'INVALID_REQUEST',
      'service request must contain an exact or possibilities calculation.',
    );
  }
}

function assertPackIsolation(packResult: TraditionPackResult): void {
  const { id, version } = packResult.profileRef;
  if (
    packResult.interpretation.profile.id !== id ||
    packResult.interpretation.profile.version !== version ||
    packResult.interpretation.findings.some(
      (finding) => finding.profileId !== id || finding.profileVersion !== version,
    )
  ) {
    throw new AiReadingError(
      'INVALID_REQUEST',
      'The deterministic comparison returned findings from mixed Tradition Packs.',
    );
  }
}

export function comparisonPackReadingInput(
  defaults: ComparisonReadingDefaults,
  request: AiSajuServiceRequest,
  packResult: TraditionPackResult,
): PrepareAiSajuNarrationRequestInput {
  assertPackIsolation(packResult);
  return {
    assessment: packResult.interpretation,
    locale: request.locale ?? defaults.locale,
    purpose: request.purpose ?? defaults.purpose,
    audience: request.audience ?? defaults.audience,
    variantPolicy: request.variantPolicy ?? defaults.variantPolicy,
    ...(request.question === undefined ? {} : { question: request.question }),
  };
}

async function narratePackResults(
  snapshot: ComparisonServiceSnapshot,
  request: AiSajuServiceRequest,
  packResults: readonly TraditionPackResult[],
): Promise<readonly AiSajuComparisonPackReading[]> {
  const readings: AiSajuComparisonPackReading[] = [];

  // Deliberately sequential and isolated: a provider never receives findings
  // from more than one Tradition Pack in the same request.
  for (const packResult of packResults) {
    const reading = await createAiSajuReading({
      ...comparisonPackReadingInput(snapshot, request, packResult),
      narrator: snapshot.narrator,
    });
    readings.push({
      packRef: packResult.packRef,
      profileRef: packResult.profileRef,
      interpretation: packResult.interpretation,
      reading,
    });
  }

  return deepFreeze(readings);
}

async function readFromComparisonService(
  snapshot: ComparisonServiceSnapshot,
  request: AiSajuServiceRequest,
): Promise<ExactAiSajuComparisonServiceResult | PossibilityAiSajuComparisonServiceResult> {
  assertServiceRequest(request);

  if (request.calculation.kind === 'exact') {
    const comparison = calculateSajuSchoolComparison(request.calculation, {
      packRefs: snapshot.packRefs,
    }) as ExactSajuSchoolComparisonResult;
    const packReadings = await narratePackResults(snapshot, request, comparison.packResults);
    return deepFreeze({
      schemaVersion: '1',
      calculationKind: 'exact',
      calculation: comparison.calculation,
      comparison,
      packReadings,
    });
  }

  const comparison = calculateSajuSchoolComparison(request.calculation, {
    packRefs: snapshot.packRefs,
  }) as PossibilitySajuSchoolComparisonResult;
  const packReadings = await narratePackResults(snapshot, request, comparison.packResults);
  return deepFreeze({
    schemaVersion: '1',
    calculationKind: 'possibilities',
    calculation: comparison.calculation,
    comparison,
    packReadings,
  });
}

export function createAiSajuComparisonService(
  options: CreateAiSajuComparisonServiceOptions,
): AiSajuComparisonService {
  const snapshot = snapshotOptions(options);
  return Object.freeze({
    read: (request: AiSajuServiceRequest) => readFromComparisonService(snapshot, request),
  }) as AiSajuComparisonService;
}

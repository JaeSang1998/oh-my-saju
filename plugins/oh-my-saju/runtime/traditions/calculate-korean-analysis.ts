import { deepFreeze } from '../internal/deep-freeze';
import { isRecord } from '../internal/guards';
import { DEFAULT_KOREAN_TRADITION_PACK_REFS_V1, listTraditionPacks } from './catalog';
import { calculateSajuSchoolComparison } from './calculate-school-comparison';
import { SajuInterpretationError } from './errors';
/** Default Korean analysis assembled from isolated Tradition Pack results. */
import type {
  ExactKoreanSajuAnalysisResult,
  KoreanSajuAnalysisPreset,
  PossibilityKoreanSajuAnalysisResult,
  SajuInterpretationCalculationRequest,
  TraditionPackResult,
} from './types';

const catalog = listTraditionPacks();
const presetEntries = DEFAULT_KOREAN_TRADITION_PACK_REFS_V1.map((packRef) => {
  const entry = catalog.find(
    ({ packRef: installed }) =>
      installed.id === packRef.id && installed.version === packRef.version,
  );
  if (entry === undefined) {
    throw new Error(
      `The built-in Korean interpretation preset references an unknown Tradition Pack: ${packRef.id}@${packRef.version}.`,
    );
  }
  return entry;
});
const baselineEntries = presetEntries.filter(({ kind }) => kind === 'cross-school-baseline');
const doctrineEntries = presetEntries.filter(({ kind }) => kind !== 'cross-school-baseline');

if (baselineEntries.length !== 1 || doctrineEntries.length === 0) {
  throw new Error('The built-in Korean interpretation preset is internally inconsistent.');
}
const baselineEntry = baselineEntries[0]!;

export const KOREAN_SAJU_ANALYSIS_PRESET_V1: KoreanSajuAnalysisPreset = deepFreeze({
  schemaVersion: '1',
  id: 'ko-KR-default-v1',
  baselinePackRef: baselineEntry.packRef,
  traditionPackRefs: doctrineEntries.map(({ packRef }) => packRef),
  packMaturities: presetEntries.map(({ packRef, maturity }) => ({
    packRef,
    maturity,
  })),
  unsupportedDeterministicOutputs: [
    'final-pattern',
    'final-strength',
    'final-useful-god',
    'luck-cycles',
    'personality',
    'compatibility',
    'event-prediction',
  ],
  predictiveValidity: 'not-established',
});

function partitionResults(results: readonly TraditionPackResult[]): {
  readonly baseline: TraditionPackResult;
  readonly doctrines: readonly TraditionPackResult[];
} {
  const baseline = results.find(
    ({ packRef }) =>
      packRef.id === KOREAN_SAJU_ANALYSIS_PRESET_V1.baselinePackRef.id &&
      packRef.version === KOREAN_SAJU_ANALYSIS_PRESET_V1.baselinePackRef.version,
  );
  if (baseline === undefined) {
    throw new SajuInterpretationError(
      'INCOMPATIBLE_PROFILE_SET',
      'The Korean analysis preset did not produce its structural baseline.',
    );
  }
  const doctrines = results.filter(({ packRef }) =>
    KOREAN_SAJU_ANALYSIS_PRESET_V1.traditionPackRefs.some(
      ({ id, version }) => packRef.id === id && packRef.version === version,
    ),
  );
  if (doctrines.length !== KOREAN_SAJU_ANALYSIS_PRESET_V1.traditionPackRefs.length) {
    throw new SajuInterpretationError(
      'INCOMPATIBLE_PROFILE_SET',
      'The Korean analysis preset did not produce every doctrine result.',
    );
  }
  return { baseline, doctrines };
}

/* eslint-disable no-redeclare -- TypeScript overload signatures share one implementation. */
export function calculateKoreanSajuAnalysis(
  calculation: Extract<SajuInterpretationCalculationRequest, { kind: 'exact' }>,
): ExactKoreanSajuAnalysisResult;
export function calculateKoreanSajuAnalysis(
  calculation: Extract<SajuInterpretationCalculationRequest, { kind: 'possibilities' }>,
): PossibilityKoreanSajuAnalysisResult;
export function calculateKoreanSajuAnalysis(
  calculation: SajuInterpretationCalculationRequest,
): ExactKoreanSajuAnalysisResult | PossibilityKoreanSajuAnalysisResult;
export function calculateKoreanSajuAnalysis(
  calculation: SajuInterpretationCalculationRequest,
): ExactKoreanSajuAnalysisResult | PossibilityKoreanSajuAnalysisResult {
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

  if (calculation.kind === 'exact') {
    const evaluated = calculateSajuSchoolComparison(calculation, {
      packRefs: DEFAULT_KOREAN_TRADITION_PACK_REFS_V1,
    });
    const { baseline, doctrines } = partitionResults(evaluated.packResults);
    return deepFreeze({
      schemaVersion: '1',
      calculationKind: 'exact',
      calculation: evaluated.calculation,
      preset: KOREAN_SAJU_ANALYSIS_PRESET_V1,
      baseline,
      doctrines,
      comparison: evaluated.comparison,
    });
  }

  const evaluated = calculateSajuSchoolComparison(calculation, {
    packRefs: DEFAULT_KOREAN_TRADITION_PACK_REFS_V1,
  });
  const { baseline, doctrines } = partitionResults(evaluated.packResults);
  return deepFreeze({
    schemaVersion: '1',
    calculationKind: 'possibilities',
    calculation: evaluated.calculation,
    preset: KOREAN_SAJU_ANALYSIS_PRESET_V1,
    baseline,
    doctrines,
    comparison: evaluated.comparison,
  });
}
/* eslint-enable no-redeclare */

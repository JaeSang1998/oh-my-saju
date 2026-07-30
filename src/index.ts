/**
 * saju-engine stable API.
 *
 * Calendar conversion, timing, and low-level diagnostics are available from
 * the explicit package subpaths.
 */

export { calculateSaju, tryCalculateSaju } from './auditable/calculate-saju';
export {
  calculateSajuPossibilities,
  tryCalculateSajuPossibilities,
} from './auditable/calculate-saju-possibilities';
export type {
  BirthTime,
  BirthTimeAbsentReason,
  BirthTimeConstraint,
  BirthTimeEvidence,
  BirthTimeEvidenceSource,
  BranchFact,
  DayHourClock,
  GregorianBirthDate,
  KoreanLunarBirthDate,
  PillarReport,
  SajuAggregatedCandidateOccurrence,
  SajuAggregatedPossibilityCandidate,
  SajuCandidatePillars,
  SajuCandidateWindow,
  SajuBirthDate,
  SajuCalculationResult,
  SajuPillarName,
  SajuPossibilityBoundary,
  SajuPossibilityCalculationResult,
  SajuPossibilityCandidate,
  SajuPossibilityPolicyResult,
  SajuPossibilityReport,
  SajuPossibilityRequest,
  SajuPossibilityWarning,
  SajuReport,
  SajuRequest,
  SolarTimeCorrection,
  SolarTermEvidence,
  StemFact,
  ZiHourPolicy,
} from './auditable/types';
export { SajuError, isSajuError } from './errors';
export type { SajuErrorCode } from './errors';
export { ENGINE_MANIFEST } from './manifest';
export type { EngineManifest } from './manifest';
export type { DaylightSavingMetadata } from './time/daylight-saving';
export type {
  EarthlyBranch,
  FiveElement,
  FourPillars,
  Gender,
  HeavenlyStem,
  Pillar,
  TenGod,
  YinYang,
} from './types';

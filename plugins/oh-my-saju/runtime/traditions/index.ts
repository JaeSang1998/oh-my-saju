/**
 * Versioned, provenance-carrying interpretation profiles.
 *
 * This subpath calculates and evaluates one explicit profile in the same
 * trusted call. It preserves uncertain birth-time candidates instead of
 * inventing a representative hour.
 */

export { calculateSajuInterpretation } from './calculate-interpretation';
/** Plugin-owned Tradition Pack runtime facade. */
export {
  KOREAN_SAJU_ANALYSIS_PRESET_V1,
  calculateKoreanSajuAnalysis,
} from './calculate-korean-analysis';
export { calculateSajuSchoolComparison } from './calculate-school-comparison';
export { SajuInterpretationError, isSajuInterpretationError } from './errors';
export { PROFILE_LIMITATIONS_V1 } from './profile-limitations';
export {
  BUILT_IN_TRADITION_PROFILES_V1,
  DEFAULT_KOREAN_TRADITION_PACK_REFS_V1,
  listTraditionPacks,
} from './catalog';
export { COMMON_STRUCTURAL_PROFILE_V1 } from '../../tradition-packs/calculation-baseline/profile';
export { DITIANSHUI_STRENGTH_EVIDENCE_PROFILE_V1 } from '../../tradition-packs/ditianshui/profile';
export { QIONGTONG_CLIMATE_PROFILE_V1 } from '../../tradition-packs/qiongtong/profile';
export { SANMING_SYMBOLIC_CURATED_PROFILE_V1 } from '../../tradition-packs/sanming-symbolic-curated/profile';
export { ZIPING_MONTH_COMMAND_PROFILE_V1 } from '../../tradition-packs/ziping/profile';
export type {
  AdoptionEvidence,
  CalculateSajuSchoolComparisonOptions,
  EvaluateSajuInterpretationOptions,
  ExactKoreanSajuAnalysisResult,
  ExactSajuInterpretationRequest,
  ExactSajuInterpretationResult,
  ExactSajuSchoolComparisonResult,
  FindingComparisonCoordinate,
  InterpretationEvidencePointer,
  InterpretationFinding,
  InterpretationRuleId,
  InterpretationSourceReference,
  InterpretationTopic,
  JsonPrimitive,
  JsonValue,
  KoreanSajuAnalysisPreset,
  KoreanSajuUnsupportedOutput,
  PossibilityKoreanSajuAnalysisResult,
  PossibilitySajuInterpretationRequest,
  PossibilitySajuInterpretationResult,
  PossibilitySajuSchoolComparisonResult,
  ProfileAssurance,
  ProfileLimitationId,
  TraditionPackCatalogEntry,
  TraditionPackContract,
  TraditionPackMaturity,
  TraditionPackRef,
  TraditionPackResult,
  TraditionProfileRef,
  SajuInterpretationCalculationRequest,
  SajuInterpretationErrorCode,
  SajuInterpretationReport,
  SajuSchoolComparison,
  SchoolComparisonRow,
  SchoolComparisonStatus,
  SchoolProfileCatalogEntry,
  SchoolProfileRef,
  SchoolProfileResult,
  TraditionRuleProfile,
  UnavailableInterpretationRule,
} from './types';

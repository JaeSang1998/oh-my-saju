/** Plugin-owned provider-neutral reading runtime.
 *
 * Grounded AI narration plus end-to-end single-profile and multi-Pack
 * services. The model receives only one Pack's derived findings per request,
 * never the raw birth request, time-evidence text, or a pooled school result.
 */

export { createAiSajuComparisonService } from './create-comparison-service';
export { createAiKoreanSajuService } from './create-korean-service';
export { createAiSajuService } from './create-reading';
export { AiReadingError, isAiReadingError } from './errors';
export { SAJU_NARRATIVE_JSON_SCHEMA } from './output-contract';
export type {
  AiReadingErrorCode,
  AiKoreanSajuService,
  AiSajuComparisonService,
  AiSajuComparisonServiceRequest,
  AiSajuComparisonServiceResult,
  AiSajuComparisonPackReading,
  AiSajuReadingReport,
  AiSajuService,
  AiSajuServiceRequest,
  CreateAiSajuComparisonServiceOptions,
  CreateAiKoreanSajuServiceOptions,
  CreateAiSajuServiceOptions,
  ExactAiSajuComparisonServiceResult,
  ExactAiSajuServiceRequest,
  ExactAiSajuServiceResult,
  PossibilityAiSajuComparisonServiceResult,
  PossibilityAiSajuServiceRequest,
  PossibilityAiSajuServiceResult,
  SajuNarrationEvidenceFinding,
  SajuNarrationRequest,
  SajuNarrative,
  SajuNarrativeParagraph,
  SajuNarrativeSection,
  SajuNarrator,
  SajuNarratorResponse,
  SajuReadingAudience,
  SajuReadingLocale,
  SajuReadingPurpose,
  SajuVariantPolicy,
} from './types';

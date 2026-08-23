/**
 * Provider-neutral application boundary for agent hosts.
 *
 * Ordinary callers receive one direct Korean-reading task. Audit callers can
 * still prepare isolated Pack drafts and validate claim references afterward.
 */

/** Host-neutral Oh My Saju application protocol. */
export {
  executeOhMySaju,
  executeTraditionalSystemCommand,
  analyzeOhMySajuReading,
  prepareOhMySajuReading,
  validateOhMySajuReading,
} from './execute';
export { prepareOhMySajuCompatibility, validateOhMySajuCompatibility } from './compatibility';
export {
  calculateLiurenChart,
  calculateTojeong144,
  calculateZiweiChart,
  castIChing,
  rankElectionDates,
} from '../systems';
export type {
  ElectionRequest,
  ElectionResult,
  IChingReport,
  IChingRequest,
  LiurenReport,
  LiurenRequest,
  Tojeong144Report,
  Tojeong144Request,
  TraditionalSystemRequest,
  TraditionalSystemResult,
  ZiweiReport,
  ZiweiRequest,
} from '../systems';
export { isOhMySajuApplicationError, OhMySajuApplicationError } from './errors';
export { renderOhMySajuCompact, renderOhMySajuMarkdown } from './presentation';
export type { OhMySajuApplicationErrorCode } from './errors';
export type {
  KoreanSajuAnalysisResult,
  AnalyzedOhMySajuReading,
  AnalyzeOhMySajuReadingCommand,
  OhMySajuCommand,
  OhMySajuBroadPresentation,
  OhMySajuBroadPresentationDraft,
  OhMySajuCompatibilityDraft,
  OhMySajuCompatibilityFinding,
  OhMySajuCompatibilityFindingKind,
  OhMySajuCompatibilityNarrationTask,
  OhMySajuCompatibilityParagraphDraft,
  OhMySajuCompatibilityParticipantRequest,
  OhMySajuCompatibilityParticipantView,
  OhMySajuCompatibilityPreparedSuccess,
  OhMySajuCompatibilityRequest,
  OhMySajuCompatibilityValidatedSuccess,
  OhMySajuAnalyzedSuccess,
  OhMySajuConclusionRef,
  OhMySajuDefaultProfileDraft,
  OhMySajuDefaultProfileV3Draft,
  OhMySajuFailure,
  OhMySajuLegacyBroadPresentationDraft,
  OhMySajuNarrationDraft,
  OhMySajuNarrationTask,
  OhMySajuNarratorIdentity,
  OhMySajuLivedPatternRef,
  OhMySajuParagraphRef,
  OhMySajuParagraphSource,
  OhMySajuPortraitRef,
  OhMySajuProfileParagraphRef,
  OhMySajuProfileSectionRole,
  OhMySajuProfileThesisRef,
  OhMySajuPreparedSuccess,
  OhMySajuResponse,
  OhMySajuTimingOptions,
  OhMySajuTraditionalSystemSuccess,
  OhMySajuValidatedSuccess,
  PrepareOhMySajuReadingCommand,
  PrepareOhMySajuCompatibilityCommand,
  PreparedOhMySajuCompatibility,
  PreparedOhMySajuReading,
  RunTraditionalSystemCommand,
  ValidatedOhMySajuReading,
  ValidatedOhMySajuCompatibility,
  ValidateOhMySajuCompatibilityCommand,
  ValidateOhMySajuReadingCommand,
} from './types';

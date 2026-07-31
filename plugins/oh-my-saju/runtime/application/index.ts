/**
 * Provider-neutral application boundary for agent hosts.
 *
 * The deterministic engine prepares isolated narration tasks; the host supplies
 * JSON drafts; the engine then validates every claim reference and uncertainty
 * rule before returning user-facing readings.
 */

/** Host-neutral Oh My Saju application protocol. */
export {
  executeOhMySaju,
  executeTraditionalSystemCommand,
  prepareOhMySajuReading,
  validateOhMySajuReading,
} from './execute';
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
  OhMySajuCommand,
  OhMySajuBroadPresentation,
  OhMySajuBroadPresentationDraft,
  OhMySajuConclusionRef,
  OhMySajuDefaultProfileDraft,
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
  PreparedOhMySajuReading,
  RunTraditionalSystemCommand,
  ValidatedOhMySajuReading,
  ValidateOhMySajuReadingCommand,
} from './types';

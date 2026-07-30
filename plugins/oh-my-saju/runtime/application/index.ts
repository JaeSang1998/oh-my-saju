/**
 * Provider-neutral application boundary for agent hosts.
 *
 * The deterministic engine prepares isolated narration tasks; the host supplies
 * JSON drafts; the engine then validates every claim reference and uncertainty
 * rule before returning user-facing readings.
 */

/** Host-neutral Oh My Saju application protocol. */
export { executeOhMySaju, prepareOhMySajuReading, validateOhMySajuReading } from './execute';
export { isOhMySajuApplicationError, OhMySajuApplicationError } from './errors';
export { renderOhMySajuCompact, renderOhMySajuMarkdown } from './presentation';
export type { OhMySajuApplicationErrorCode } from './errors';
export type {
  KoreanSajuAnalysisResult,
  OhMySajuCommand,
  OhMySajuFailure,
  OhMySajuNarrationDraft,
  OhMySajuNarrationTask,
  OhMySajuNarratorIdentity,
  OhMySajuPreparedSuccess,
  OhMySajuResponse,
  OhMySajuTimingOptions,
  OhMySajuValidatedSuccess,
  PrepareOhMySajuReadingCommand,
  PreparedOhMySajuReading,
  ValidatedOhMySajuReading,
  ValidateOhMySajuReadingCommand,
} from './types';

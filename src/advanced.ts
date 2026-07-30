/**
 * Low-level, versioned diagnostics for callers that need calculation evidence.
 *
 * Most applications should use `calculateSaju` from the package root.
 */

export {
  findSolarTermBoundary,
  findSolarTermsOfYear,
  solarTermLongitude,
} from './astro/astronomical-solar-terms';
export type { SolarTermBoundary } from './astro/astronomical-solar-terms';
export { analyzeKnownPillarStructure, analyzeStructure } from './analysis/structural-analysis';
export type {
  KnownPillarStructuralAnalysis,
  PillarPosition,
  StructuralAnalysis,
} from './analysis/structural-analysis';
export { resolveBirthInstant } from './time/resolve-birth-instant';
export type {
  LocalDateTime,
  LocalTimeDisambiguation,
  ResolveBirthInstantInput,
  ResolvedBirthInstant,
} from './time/resolve-birth-instant';
export type { DaylightSavingMetadata } from './time/daylight-saving';

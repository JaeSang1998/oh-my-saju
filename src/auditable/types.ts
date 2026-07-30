import type { EarthlyBranch, FiveElement, HeavenlyStem, TenGod, YinYang } from '../types';
import type { SajuError } from '../errors';
import type { LocalTimeDisambiguation } from '../time/resolve-birth-instant';
import type { DaylightSavingMetadata } from '../time/daylight-saving';
import type { StructuralAnalysis } from '../analysis/structural-analysis';
import type { EngineManifest } from '../manifest';

export interface GregorianBirthDate {
  readonly calendar: 'gregorian';
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

export interface KoreanLunarBirthDate {
  readonly calendar: 'korean-lunar';
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly monthKind: 'regular' | 'leap';
}

export type SajuBirthDate = GregorianBirthDate | KoreanLunarBirthDate;

export interface BirthTime {
  readonly hour: number;
  readonly minute: number;
  readonly second?: number;
  readonly millisecond?: number;
}

export type BirthTimeAbsentReason =
  | 'unknown'
  | 'asked-unknown'
  | 'not-asked'
  | 'asked-declined'
  | 'masked';

export type BirthTimeEvidenceSource =
  | 'birth-record'
  | 'hospital-record'
  | 'family-record'
  | 'family-memory'
  | 'self-report'
  | 'secondary-source'
  | 'rectified'
  | 'historical-record'
  | 'unknown';

export interface BirthTimeEvidence {
  readonly source: BirthTimeEvidenceSource;
  /** Optional source wording. This may contain personal data and is copied into the report. */
  readonly originalText?: string;
  readonly conflict?: 'none' | 'multiple-sources';
}

/**
 * A set of possible local wall-clock times. Every variant is normalized to a
 * half-open interval before candidate charts are calculated.
 */
export type BirthTimeConstraint =
  | {
      readonly kind: 'unknown';
      readonly reason?: BirthTimeAbsentReason;
    }
  | {
      readonly kind: 'day-period';
      readonly period: 'am' | 'pm';
    }
  | {
      readonly kind: 'approximate';
      readonly time: BirthTime;
      readonly toleranceMinutes: number;
      /** Required only when the uncertainty interval may leave the supplied birth date. */
      readonly dateRollover?: 'allow';
    }
  | {
      readonly kind: 'range';
      readonly startInclusive: BirthTime;
      readonly endExclusive: BirthTime;
      readonly crossesMidnight?: boolean;
    };

export type ZiHourPolicy = 'civilMidnight' | 'ziStart' | 'splitZi';

export type DayHourClock =
  | { readonly kind: 'civil' }
  | {
      readonly kind: 'local-apparent-solar';
      /** Degrees east, from -180 through +180. */
      readonly longitudeDegreesEast: number;
      readonly equationOfTime: 'apply' | 'omit';
    };

export interface SajuRequest {
  readonly birth: {
    readonly date: SajuBirthDate;
    readonly time: BirthTime;
    readonly timeZone: string;
    readonly disambiguation?: LocalTimeDisambiguation;
    readonly expectedOffsetSeconds?: number;
  };
  readonly rules?: {
    readonly ziHourPolicy?: ZiHourPolicy;
    readonly dayHourClock?: DayHourClock;
  };
}

export interface SajuPossibilityRequest {
  readonly birth: {
    readonly date: SajuBirthDate;
    readonly time: BirthTimeConstraint;
    readonly timeZone: string;
    readonly timeEvidence?: BirthTimeEvidence;
    /** Narrows historical fold candidates when a record preserves the UTC offset. */
    readonly expectedOffsetSeconds?: number;
  };
  readonly rules?: {
    /** Defaults to `['civilMidnight']`; use `'all'` for a 23:00 policy comparison. */
    readonly ziHourPolicies?: readonly ZiHourPolicy[] | 'all';
    readonly dayHourClock?: DayHourClock;
  };
}

export interface StemFact {
  readonly index: number;
  readonly korean: HeavenlyStem;
  readonly hanja: string;
  readonly element: FiveElement;
  readonly yinYang: YinYang;
}

export interface BranchFact {
  readonly index: number;
  readonly korean: EarthlyBranch;
  readonly hanja: string;
  readonly element: FiveElement;
  readonly yinYang: YinYang;
}

export interface PillarReport {
  readonly cycleIndex: number;
  readonly korean: string;
  readonly hanja: string;
  readonly stem: StemFact;
  readonly branch: BranchFact;
}

export interface SolarTermEvidence {
  readonly index: number;
  readonly name: string;
  readonly hanja: string;
  readonly longitudeDegrees: number;
  readonly instantUtc: string;
  readonly epochMilliseconds: number;
  readonly uncertaintyMilliseconds: number;
}

export interface SolarTimeCorrection {
  readonly longitudeSeconds: number;
  readonly equationOfTimeSeconds: number;
  readonly totalDifferenceFromCivilSeconds: number;
}

export interface SajuReport {
  readonly schemaVersion: EngineManifest['engine']['schemaVersion'];
  readonly chronology: {
    readonly inputDate: SajuBirthDate;
    readonly gregorianDate: GregorianBirthDate;
    readonly koreanLunarDate: KoreanLunarBirthDate;
    readonly civilDateTime: string;
    readonly instantUtc: string;
    readonly epochMilliseconds: number;
    readonly timeZone: string;
    readonly offsetSeconds: number;
    readonly timeZoneAbbreviation: string;
    readonly daylightSaving: DaylightSavingMetadata;
    readonly disambiguation: 'exact' | 'earlier' | 'later';
    readonly dayHourDateTime: string;
    readonly dayHourClock: DayHourClock['kind'];
    readonly solarTimeCorrection: SolarTimeCorrection | null;
  };
  readonly pillars: {
    readonly year: PillarReport;
    readonly month: PillarReport;
    readonly day: PillarReport;
    readonly hour: PillarReport;
  };
  readonly facts: {
    readonly dayMaster: StemFact;
    readonly tenGods: {
      readonly year: { readonly stem: TenGod; readonly branch: TenGod };
      readonly month: { readonly stem: TenGod; readonly branch: TenGod };
      readonly day: { readonly stem: '일간'; readonly branch: TenGod };
      readonly hour: { readonly stem: TenGod; readonly branch: TenGod };
    };
    readonly voidBranches: readonly EarthlyBranch[];
    readonly structure: StructuralAnalysis;
  };
  readonly audit: {
    readonly engine: EngineManifest['engine'];
    readonly supportedRanges: EngineManifest['supportedRanges'];
    readonly datasets: {
      readonly timezone: EngineManifest['timezone'];
      readonly solarTerms: EngineManifest['solarTerms'];
      readonly koreanLunar: EngineManifest['koreanLunar'];
    };
    readonly validation: EngineManifest['validation'];
    readonly rules: {
      readonly yearBoundary: 'lichun-instant-inclusive';
      readonly monthBoundary: 'twelve-jie-instant-inclusive';
      readonly dayCalendar: 'proleptic-gregorian';
      readonly ziHourPolicy: ZiHourPolicy;
      readonly dayHourClock: DayHourClock['kind'];
      readonly longitudeDegreesEast: number | null;
      readonly equationOfTime: 'apply' | 'omit' | null;
      readonly lunarCalendar: 'korean';
    };
    readonly evidence: {
      readonly lichun: SolarTermEvidence;
      readonly monthStart: SolarTermEvidence;
      readonly monthEnd: SolarTermEvidence;
      readonly effectiveDay: string;
      readonly epochDay: number;
      readonly distanceToNearestBoundaryMilliseconds: number;
    };
  };
  readonly warnings: readonly {
    readonly code:
      | 'BOUNDARY_WITHIN_SOURCE_UNCERTAINTY'
      | 'PRE_STANDARD_TIME_LOCAL_MEAN_APPROXIMATION';
    readonly message: string;
  }[];
}

export type SajuPillarName = 'year' | 'month' | 'day' | 'hour';

export interface SajuCandidatePillars {
  readonly year: PillarReport;
  readonly month: PillarReport;
  readonly day: PillarReport;
  /** `null` only when the caller explicitly supplied `time.kind: 'unknown'`. */
  readonly hour: PillarReport | null;
}

export interface SajuCandidateWindow {
  readonly startLocalDateTimeInclusive: string;
  readonly endLocalDateTimeExclusive: string;
  readonly instantStartUtc: string;
  readonly instantEndExclusiveUtc: string;
  readonly offsetSeconds: number;
  readonly disambiguation: 'exact' | 'earlier' | 'later';
  /** Why this interval supports the candidate; uncertainty support is epistemic, not computed truth. */
  readonly basis: 'computed' | 'solar-term-source-uncertainty';
}

export interface SajuPossibilityCandidate {
  readonly id: string;
  readonly pillars: SajuCandidatePillars;
  readonly windows: readonly SajuCandidateWindow[];
  /** Union duration of supporting real-instant lanes, not a probability. */
  readonly supportDurationMilliseconds: number;
}

export interface SajuPossibilityBoundary {
  /** Candidate changes alter possibilities; basis transitions only change computed-vs-epistemic support. */
  readonly transitionKind:
    | 'candidate-set-change'
    | 'computed-basis-transition'
    | 'source-uncertainty-transition';
  readonly atLocalDateTime: string;
  /** UTC candidates for this wall time; empty when the boundary starts a gap. */
  readonly instantUtcCandidates: readonly string[];
  readonly beforeCandidateIds: readonly string[];
  readonly afterCandidateIds: readonly string[];
  readonly changedPillars: readonly SajuPillarName[];
  readonly causes: readonly (
    | 'solar-term'
    | 'day-boundary'
    | 'hour-boundary'
    | 'time-zone-transition'
  )[];
}

export interface SajuPossibilityPolicyResult {
  readonly ziHourPolicy: ZiHourPolicy;
  readonly stablePillars: {
    readonly year: PillarReport | null;
    readonly month: PillarReport | null;
    readonly day: PillarReport | null;
    readonly hour: PillarReport | null;
  };
  readonly candidates: readonly SajuPossibilityCandidate[];
  readonly boundaries: readonly SajuPossibilityBoundary[];
  readonly unresolvableWindows: readonly {
    readonly startLocalDateTimeInclusive: string;
    readonly endLocalDateTimeExclusive: string;
    readonly reason: 'nonexistent-local-time' | 'offset-mismatch';
  }[];
}

export interface SajuAggregatedCandidateOccurrence extends SajuCandidateWindow {
  readonly ziHourPolicy: ZiHourPolicy;
}

export interface SajuAggregatedPossibilityCandidate {
  readonly id: string;
  readonly pillars: SajuCandidatePillars;
  readonly ziHourPolicies: readonly ZiHourPolicy[];
  readonly occurrences: readonly SajuAggregatedCandidateOccurrence[];
  /** Union duration of matching real instants across policies, not a probability. */
  readonly supportDurationMilliseconds: number;
}

export interface SajuPossibilityWarning {
  readonly code:
    | 'SOLAR_TERM_SOURCE_UNCERTAINTY_INTERSECTS_RANGE'
    | 'PRE_STANDARD_TIME_LOCAL_MEAN_APPROXIMATION';
  readonly message: string;
  readonly boundaryInstantUtc?: string;
  readonly boundaryLocalDateTime?: string;
  readonly uncertaintyMilliseconds?: number;
}

export interface SajuPossibilityReport {
  readonly schemaVersion: EngineManifest['engine']['schemaVersion'];
  readonly input: {
    readonly date: SajuBirthDate;
    readonly gregorianDate: GregorianBirthDate;
    readonly time: BirthTimeConstraint;
    readonly timeZone: string;
    readonly timeEvidence: BirthTimeEvidence | null;
    readonly expectedOffsetSeconds: number | null;
  };
  readonly hourPillar: 'omitted' | 'candidate';
  readonly coverage: {
    readonly startLocalDateTimeInclusive: string;
    readonly endLocalDateTimeExclusive: string;
    readonly intervalSemantics: '[start,end)';
  };
  readonly policyResults: readonly SajuPossibilityPolicyResult[];
  /** Cross-policy, cycle-index de-duplicated charts for comparison UIs. */
  readonly candidates: readonly SajuAggregatedPossibilityCandidate[];
  /** Pillars shared by every candidate under every selected Zi-hour policy. */
  readonly stablePillars: {
    readonly year: PillarReport | null;
    readonly month: PillarReport | null;
    readonly day: PillarReport | null;
    readonly hour: PillarReport | null;
  };
  readonly warnings: readonly SajuPossibilityWarning[];
  readonly audit: {
    readonly engine: EngineManifest['engine'];
    readonly supportedRanges: EngineManifest['supportedRanges'];
    readonly datasets: {
      readonly timezone: EngineManifest['timezone'];
      readonly solarTerms: EngineManifest['solarTerms'];
      readonly koreanLunar: EngineManifest['koreanLunar'];
    };
    readonly validation: EngineManifest['validation'];
    readonly method: 'exact-boundary-partition-v1';
    readonly boundaryResolutionMilliseconds: 1;
    readonly intervalSemantics: '[start,end)';
    readonly rules: {
      readonly ziHourPolicies: readonly ZiHourPolicy[];
      readonly dayHourClock: DayHourClock['kind'];
      readonly longitudeDegreesEast: number | null;
      readonly equationOfTime: 'apply' | 'omit' | null;
    };
  };
}

export type SajuCalculationResult =
  | { readonly ok: true; readonly value: SajuReport }
  | { readonly ok: false; readonly error: SajuError };

export type SajuPossibilityCalculationResult =
  | { readonly ok: true; readonly value: SajuPossibilityReport }
  | { readonly ok: false; readonly error: SajuError };

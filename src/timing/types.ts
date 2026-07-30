import type { PillarReport, SajuReport, SajuRequest } from '../auditable/types';
import type {
  PillarPairPunishmentDirection,
  PillarPosition,
} from '../analysis/structural-analysis';
import type { EarthlyBranch, Gender, HeavenlyStem, TenGod } from '../types';

export interface SajuTimingRequest {
  /** Exact natal calculation request. Unknown or ranged birth time is not accepted. */
  readonly natalRequest: SajuRequest;
  /** First Saju year, beginning at that year's exact Lichun instant. */
  readonly fromYear: number;
  /** Last Saju year, inclusive. */
  readonly throughYear: number;
  /** Optional traditional direction input for ten-year luck pillars. */
  readonly gender?: Gender;
  /** Number of ten-year luck pillars to return when gender is supplied. Defaults to 10. */
  readonly luckPillarCount?: number;
}

export interface SajuTimingBoundary {
  readonly year: number;
  readonly index: number;
  readonly name: string;
  readonly hanja: string;
  readonly longitudeDegrees: number;
  readonly instantUtc: string;
  readonly epochMilliseconds: number;
  readonly uncertaintyMilliseconds: number;
  /** Local ISO-like timestamp including the UTC offset in the natal request's IANA zone. */
  readonly localDateTime: string;
  readonly timeZone: string;
  readonly offsetSeconds: number;
}

export interface SajuTimingRepresentativeInstant {
  readonly instantUtc: string;
  readonly epochMilliseconds: number;
  readonly offsetFromBoundaryMilliseconds: number;
  readonly policy: 'after-boundary-declared-uncertainty';
}

export interface SajuTimingPillarObservation {
  readonly pillar: PillarReport;
  readonly tenGods: {
    readonly stem: TenGod;
    readonly branch: TenGod;
  };
  readonly representative: SajuTimingRepresentativeInstant;
}

export interface SajuTimingMonth extends SajuTimingPillarObservation {
  readonly sequence: number;
  readonly start: SajuTimingBoundary;
  readonly end: SajuTimingBoundary;
}

export interface SajuTimingYear {
  readonly sajuYear: number;
  readonly start: SajuTimingBoundary;
  readonly end: SajuTimingBoundary;
  readonly annualPillar: SajuTimingPillarObservation;
  readonly months: readonly SajuTimingMonth[];
}

export interface ApproximateLuckPillarStartDate {
  readonly date: string;
  readonly qualifier: 'approximate';
  readonly method: 'three-days-one-year';
}

export interface SajuTimingLuckPillars {
  readonly gender: Gender;
  readonly forward: boolean;
  readonly startAge: number;
  readonly startOffset: {
    readonly years: number;
    readonly months: number;
    readonly days: number;
  };
  readonly pillars: readonly {
    readonly age: number;
    readonly pillar: PillarReport;
    readonly tenGods: {
      readonly stem: TenGod;
      readonly branch: TenGod;
    };
    readonly approximateStartDate: ApproximateLuckPillarStartDate;
  }[];
}

export interface SajuTimingReport {
  readonly schemaVersion: '1';
  readonly natal: SajuReport;
  readonly range: {
    readonly fromSajuYear: number;
    readonly throughSajuYear: number;
    readonly yearCount: number;
  };
  readonly years: readonly SajuTimingYear[];
  readonly luckPillars: SajuTimingLuckPillars | null;
  readonly notes: readonly string[];
  readonly audit: {
    readonly engine: SajuReport['audit']['engine'];
    readonly solarTerms: SajuReport['audit']['datasets']['solarTerms'];
    readonly timingMethod: 'exact-lichun-jie-intervals-v1';
    readonly representativeInstantPolicy: 'boundary-plus-declared-uncertainty-plus-one-millisecond';
    readonly intervalSemantics: '[start,end)';
    readonly luckPillarMethod: 'three-days-one-year-v1' | null;
  };
}

export interface SajuDailyTransitRequest {
  /** Exact natal calculation request. Unknown or ranged birth time is not accepted. */
  readonly natalRequest: SajuRequest;
  /** Gregorian civil date in the natal request's IANA time zone. */
  readonly date: {
    readonly calendar: 'gregorian';
    readonly year: number;
    readonly month: number;
    readonly day: number;
  };
}

export type SajuDailyTransitNatalPosition = `natal-${PillarPosition}`;

export interface SajuDailyTransitPairRelationship<Member extends HeavenlyStem | EarthlyBranch> {
  /** Members are always ordered transit first, natal second. */
  readonly positions: readonly ['transit-day', SajuDailyTransitNatalPosition];
  readonly members: readonly [Member, Member];
  readonly direction: 'mutual';
}

export interface SajuDailyTransitPunishmentRelationship {
  /** Members are always ordered transit first, natal second. */
  readonly positions: readonly ['transit-day', SajuDailyTransitNatalPosition];
  readonly members: readonly [EarthlyBranch, EarthlyBranch];
  readonly direction:
    | 'transit-to-natal'
    | 'natal-to-transit'
    | Extract<PillarPairPunishmentDirection, 'mutual' | 'self'>;
  readonly kind: 'directed-cycle' | 'mutual' | 'self';
}

export interface SajuDailyTransitReport {
  readonly schemaVersion: '1';
  readonly natal: SajuReport;
  readonly date: SajuDailyTransitRequest['date'];
  readonly representative: {
    readonly policy: 'local-civil-noon';
    readonly localTime: '12:00:00.000';
    readonly civilDateTime: string;
    readonly dayHourDateTime: string;
    readonly instantUtc: string;
    readonly epochMilliseconds: number;
    readonly timeZone: string;
    readonly offsetSeconds: number;
    readonly dayHourClock: SajuReport['chronology']['dayHourClock'];
    readonly solarTimeCorrection: SajuReport['chronology']['solarTimeCorrection'];
  };
  readonly pillars: {
    readonly year: PillarReport;
    readonly month: PillarReport;
    readonly day: PillarReport;
  };
  readonly tenGods: {
    readonly year: { readonly stem: TenGod; readonly branch: TenGod };
    readonly month: { readonly stem: TenGod; readonly branch: TenGod };
    readonly day: { readonly stem: TenGod; readonly branch: TenGod };
  };
  readonly relationships: {
    readonly stemCombinations: readonly SajuDailyTransitPairRelationship<HeavenlyStem>[];
    readonly branchCombinations: readonly SajuDailyTransitPairRelationship<EarthlyBranch>[];
    readonly branchClashes: readonly SajuDailyTransitPairRelationship<EarthlyBranch>[];
    readonly branchPunishments: readonly SajuDailyTransitPunishmentRelationship[];
    readonly branchBreaks: readonly SajuDailyTransitPairRelationship<EarthlyBranch>[];
    readonly branchHarms: readonly SajuDailyTransitPairRelationship<EarthlyBranch>[];
  };
  readonly warnings: SajuReport['warnings'];
  readonly notes: readonly string[];
  readonly audit: {
    readonly engine: SajuReport['audit']['engine'];
    readonly solarTerms: SajuReport['audit']['datasets']['solarTerms'];
    readonly timingMethod: 'local-civil-noon-daily-transit-v1';
    readonly representativeInstantPolicy: 'local-civil-noon';
    readonly relationshipMethod: 'raw-pillar-pair-tables-v1';
    readonly interpretationScope: 'deterministic-facts-only';
    readonly inheritedRules: {
      readonly ziHourPolicy: SajuReport['audit']['rules']['ziHourPolicy'];
      readonly dayHourClock: SajuReport['audit']['rules']['dayHourClock'];
      readonly longitudeDegreesEast: number | null;
      readonly equationOfTime: 'apply' | 'omit' | null;
    };
    readonly evidence: SajuReport['audit']['evidence'];
  };
}

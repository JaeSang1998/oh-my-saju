import momentTimezone from 'moment-timezone';
import { describePillar } from '../domain/cycle-facts';
import { SajuError } from '../errors';
import { getLuckPillars } from '../features/luck-pillars';
import { getBranchTenGod, getTenGod } from '../features/ten-gods';
import { deepFreeze } from '../internal/deep-freeze';
import { isRecord } from '../internal/guards';
import { ENGINE_MANIFEST } from '../manifest';
import { findSolarTermBoundary, type SolarTermBoundary } from '../astro/astronomical-solar-terms';
import { calculateSaju } from '../auditable/calculate-saju';
import type { PillarReport, SajuReport } from '../auditable/types';
import {
  calculateAuditableFourPillars,
  type AuditablePillarsResult,
} from '../rules/auditable-four-pillars';
import type { LocalDateTime } from '../time/resolve-birth-instant';
import type { Gender, HeavenlyStem, Pillar } from '../types';
import type {
  SajuTimingBoundary,
  SajuTimingLuckPillars,
  SajuTimingMonth,
  SajuTimingPillarObservation,
  SajuTimingReport,
  SajuTimingRepresentativeInstant,
  SajuTimingRequest,
  SajuTimingYear,
} from './types';

const MINIMUM_TIMING_YEAR = ENGINE_MANIFEST.supportedRanges.solarTermYears.min;
const MAXIMUM_TIMING_YEAR = ENGINE_MANIFEST.supportedRanges.solarTermYears.max - 1;
const MAXIMUM_TIMING_YEAR_SPAN = 20;
const CURRENT_YEAR_JIE_INDICES = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22] as const;

function assertTimingRequest(value: unknown): asserts value is SajuTimingRequest {
  if (!isRecord(value) || !isRecord(value.natalRequest)) {
    throw new SajuError('INVALID_REQUEST', 'A timing request with natalRequest is required.');
  }
  const { fromYear, throughYear } = value;
  if (
    !Number.isInteger(fromYear) ||
    !Number.isInteger(throughYear) ||
    (fromYear as number) < MINIMUM_TIMING_YEAR ||
    (throughYear as number) > MAXIMUM_TIMING_YEAR ||
    (throughYear as number) < (fromYear as number) ||
    (throughYear as number) - (fromYear as number) > MAXIMUM_TIMING_YEAR_SPAN
  ) {
    throw new SajuError(
      'UNSUPPORTED_DATE_RANGE',
      `Timing years must be integers satisfying ${MINIMUM_TIMING_YEAR} <= fromYear <= throughYear <= ${MAXIMUM_TIMING_YEAR} with at most ${MAXIMUM_TIMING_YEAR_SPAN + 1} Saju years.`,
      {
        path: ['fromYear', 'throughYear'],
        details: {
          fromYear,
          throughYear,
          minimumYear: MINIMUM_TIMING_YEAR,
          maximumYear: MAXIMUM_TIMING_YEAR,
          maximumYearCount: MAXIMUM_TIMING_YEAR_SPAN + 1,
        },
      },
    );
  }
  if (value.gender !== undefined && value.gender !== 'male' && value.gender !== 'female') {
    throw new SajuError('INVALID_REQUEST', 'gender must be male or female.', {
      path: ['gender'],
      details: { gender: value.gender },
    });
  }
  if (
    value.luckPillarCount !== undefined &&
    (!Number.isInteger(value.luckPillarCount) ||
      (value.luckPillarCount as number) < 1 ||
      (value.luckPillarCount as number) > 120)
  ) {
    throw new SajuError(
      'INVALID_REQUEST',
      'luckPillarCount must be an integer from 1 through 120.',
      {
        path: ['luckPillarCount'],
        details: { luckPillarCount: value.luckPillarCount },
      },
    );
  }
  if (value.luckPillarCount !== undefined && value.gender === undefined) {
    throw new SajuError('INVALID_REQUEST', 'luckPillarCount requires gender.', {
      path: ['luckPillarCount', 'gender'],
    });
  }
}

function pillarReport(pillar: Pillar, cycleIndex: number): PillarReport {
  const report = describePillar(pillar);
  if (report.cycleIndex !== cycleIndex) {
    throw new SajuError(
      'DATA_INTEGRITY_FAILURE',
      'The timing pillar and cycle index describe different cycle positions.',
    );
  }
  return report;
}

function timingBoundary(boundary: SolarTermBoundary, timeZone: string): SajuTimingBoundary {
  const local = momentTimezone.tz(boundary.epochMilliseconds, timeZone);
  return {
    year: boundary.year,
    index: boundary.index,
    name: boundary.name,
    hanja: boundary.hanja,
    longitudeDegrees: boundary.longitudeDegrees,
    instantUtc: boundary.instantUtc,
    epochMilliseconds: boundary.epochMilliseconds,
    uncertaintyMilliseconds: boundary.uncertaintyMilliseconds,
    localDateTime: local.format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
    timeZone,
    offsetSeconds: local.utcOffset() * 60,
  };
}

function representativeAfter(
  boundary: SolarTermBoundary,
  end: SolarTermBoundary,
): SajuTimingRepresentativeInstant {
  const offsetFromBoundaryMilliseconds = boundary.uncertaintyMilliseconds + 1;
  const epochMilliseconds = boundary.epochMilliseconds + offsetFromBoundaryMilliseconds;
  if (epochMilliseconds >= end.epochMilliseconds) {
    throw new SajuError(
      'DATA_INTEGRITY_FAILURE',
      'A solar-term uncertainty interval consumed the following timing interval.',
      {
        details: {
          boundaryInstantUtc: boundary.instantUtc,
          endInstantUtc: end.instantUtc,
          uncertaintyMilliseconds: boundary.uncertaintyMilliseconds,
        },
      },
    );
  }
  return {
    instantUtc: new Date(epochMilliseconds).toISOString(),
    epochMilliseconds,
    offsetFromBoundaryMilliseconds,
    policy: 'after-boundary-declared-uncertainty',
  };
}

function localDateTimeAt(epochMilliseconds: number, timeZone: string): LocalDateTime {
  const local = momentTimezone.tz(epochMilliseconds, timeZone);
  return {
    year: local.year(),
    month: local.month() + 1,
    day: local.date(),
    hour: local.hour(),
    minute: local.minute(),
    second: local.second(),
    millisecond: local.millisecond(),
  };
}

function calculatedAt(
  representative: SajuTimingRepresentativeInstant,
  timeZone: string,
): AuditablePillarsResult {
  const localDateTime = localDateTimeAt(representative.epochMilliseconds, timeZone);
  return calculateAuditableFourPillars({
    birthInstantEpochMilliseconds: representative.epochMilliseconds,
    gregorianBirthYear: localDateTime.year,
    dayHourDateTime: localDateTime,
    ziHourPolicy: 'civilMidnight',
  });
}

function observation(
  pillar: Pillar,
  cycleIndex: number,
  dayMaster: HeavenlyStem,
  representative: SajuTimingRepresentativeInstant,
): SajuTimingPillarObservation {
  const report = pillarReport(pillar, cycleIndex);
  return {
    pillar: report,
    tenGods: {
      stem: getTenGod(dayMaster, report.stem.korean),
      branch: getBranchTenGod(dayMaster, report.branch.korean),
    },
    representative,
  };
}

function timingYear(sajuYear: number, timeZone: string, dayMaster: HeavenlyStem): SajuTimingYear {
  const starts = [
    ...CURRENT_YEAR_JIE_INDICES.map((index) => findSolarTermBoundary(sajuYear, index)),
    findSolarTermBoundary(sajuYear + 1, 0),
  ];
  const annualEnd = findSolarTermBoundary(sajuYear + 1, 2);
  const boundaries = [...starts, annualEnd];

  const evaluated = starts.map((start, index) => {
    const end = boundaries[index + 1];
    if (end === undefined) {
      throw new SajuError('DATA_INTEGRITY_FAILURE', 'A timing month had no closing Jie boundary.');
    }
    const representative = representativeAfter(start, end);
    const calculated = calculatedAt(representative, timeZone);
    const expectedMonthNumber = index + 1;
    if (calculated.sajuYear !== sajuYear || calculated.monthNumber !== expectedMonthNumber) {
      throw new SajuError(
        'DATA_INTEGRITY_FAILURE',
        'The timing representative did not resolve to the expected Saju year and month.',
        {
          details: {
            expectedSajuYear: sajuYear,
            actualSajuYear: calculated.sajuYear,
            expectedMonthNumber,
            actualMonthNumber: calculated.monthNumber,
          },
        },
      );
    }
    return { start, end, representative, calculated };
  });

  const first = evaluated[0];
  if (first === undefined) {
    throw new SajuError('DATA_INTEGRITY_FAILURE', 'A Saju year contained no timing months.');
  }
  const months: SajuTimingMonth[] = evaluated.map(
    ({ start, end, representative, calculated }, index) => ({
      sequence: index + 1,
      start: timingBoundary(start, timeZone),
      end: timingBoundary(end, timeZone),
      ...observation(
        calculated.pillars.month,
        calculated.cycleIndexes.month,
        dayMaster,
        representative,
      ),
    }),
  );

  return {
    sajuYear,
    start: timingBoundary(starts[0]!, timeZone),
    end: timingBoundary(annualEnd, timeZone),
    annualPillar: observation(
      first.calculated.pillars.year,
      first.calculated.cycleIndexes.year,
      dayMaster,
      first.representative,
    ),
    months,
  };
}

function addCalendarInterval(
  base: SajuReport['chronology']['gregorianDate'],
  years: number,
  months: number,
  days: number,
): string {
  const absoluteMonth = base.month - 1 + years * 12 + months;
  const targetYear = base.year + Math.floor(absoluteMonth / 12);
  const targetMonthIndex = ((absoluteMonth % 12) + 12) % 12;
  const endOfTargetMonth = new Date(0);
  endOfTargetMonth.setUTCFullYear(targetYear, targetMonthIndex + 1, 0);

  // Calendar years and months are applied first. If the original day does not
  // exist in the target month, clamp to that month's final day before adding
  // the remaining calendar days.
  const date = new Date(0);
  date.setUTCFullYear(
    targetYear,
    targetMonthIndex,
    Math.min(base.day, endOfTargetMonth.getUTCDate()),
  );
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function luckPillars(
  natal: SajuReport,
  gender: Gender | undefined,
  count: number | undefined,
): SajuTimingLuckPillars | null {
  if (gender === undefined) return null;
  const calculated = getLuckPillars({
    instantUTCms: natal.chronology.epochMilliseconds,
    birthYear: natal.chronology.gregorianDate.year,
    monthPillar: {
      heavenlyStem: natal.pillars.month.stem.korean,
      earthlyBranch: natal.pillars.month.branch.korean,
    },
    sajuYearStemIndex: natal.pillars.year.stem.index,
    gender,
    ...(count === undefined ? {} : { count }),
  });
  return {
    gender,
    forward: calculated.forward,
    startAge: calculated.startAge,
    startOffset: {
      years: calculated.startYears,
      months: calculated.startMonths,
      days: calculated.startDays,
    },
    pillars: calculated.pillars.map((entry, index) => {
      const cycleIndex = describePillar(entry.pillar).cycleIndex;
      return {
        age: entry.age,
        pillar: pillarReport(entry.pillar, cycleIndex),
        tenGods: {
          stem: getTenGod(natal.facts.dayMaster.korean, entry.pillar.heavenlyStem),
          branch: getBranchTenGod(natal.facts.dayMaster.korean, entry.pillar.earthlyBranch),
        },
        approximateStartDate: {
          date: addCalendarInterval(
            natal.chronology.gregorianDate,
            calculated.startYears + index * 10,
            calculated.startMonths,
            calculated.startDays,
          ),
          qualifier: 'approximate' as const,
          method: 'three-days-one-year' as const,
        },
      };
    }),
  };
}

/**
 * Calculates deterministic annual and Jie-month timing facts for an exact
 * natal request. Timing pillars describe calendar activation only; they do
 * not predict events.
 */
export function calculateSajuTiming(request: SajuTimingRequest): SajuTimingReport {
  assertTimingRequest(request);
  const natal = calculateSaju(request.natalRequest);
  const years: SajuTimingYear[] = [];
  for (let year = request.fromYear; year <= request.throughYear; year += 1) {
    years.push(timingYear(year, natal.chronology.timeZone, natal.facts.dayMaster.korean));
  }
  const calculatedLuckPillars = luckPillars(natal, request.gender, request.luckPillarCount);

  return deepFreeze({
    schemaVersion: '1',
    natal,
    range: {
      fromSajuYear: request.fromYear,
      throughSajuYear: request.throughYear,
      yearCount: request.throughYear - request.fromYear + 1,
    },
    years,
    luckPillars: calculatedLuckPillars,
    notes: [
      'Each Saju year is the half-open interval from exact Lichun to the next exact Lichun.',
      'Each month is a half-open Jie-to-Jie interval with no Gregorian-month substitution.',
      'Representative pillars are calculated one millisecond beyond the starting boundary’s declared uncertainty.',
      'Annual and monthly pillars are deterministic timing facts, not event predictions.',
      ...(calculatedLuckPillars === null
        ? []
        : [
            'Luck-pillar start dates use the traditional three-days-to-one-year conversion and are explicitly approximate.',
          ]),
    ],
    audit: {
      engine: natal.audit.engine,
      solarTerms: natal.audit.datasets.solarTerms,
      timingMethod: 'exact-lichun-jie-intervals-v1',
      representativeInstantPolicy: 'boundary-plus-declared-uncertainty-plus-one-millisecond',
      intervalSemantics: '[start,end)',
      luckPillarMethod: calculatedLuckPillars === null ? null : ('three-days-one-year-v1' as const),
    },
  });
}

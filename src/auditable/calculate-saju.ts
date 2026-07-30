import { describePillar } from '../domain/cycle-facts';
import { isSajuError, SajuError } from '../errors';
import { deepFreeze } from '../internal/deep-freeze';
import { brandCalculationReport } from '../internal/report-authenticity';
import { ENGINE_MANIFEST } from '../manifest';
import { getTenGodChart } from '../features/ten-gods';
import { getVoidBranches } from '../features/void-branches';
import type { SolarTermBoundary } from '../astro/astronomical-solar-terms';
import { analyzeStructure } from '../analysis/structural-analysis';
import {
  calculateAuditableFourPillars,
  type AuditablePillarsResult,
} from '../rules/auditable-four-pillars';
import { resolveDayHourClock } from '../time/day-hour-clock';
import { formatLocalDateTime } from '../time/local-date-time';
import { resolveBirthInstant, type LocalDateTime } from '../time/resolve-birth-instant';
import type { FourPillars, Pillar } from '../types';
import { copyBirthDate, normalizeBirthDate, toKoreanLunarBirthDate } from './birth-date';
import {
  PRE_STANDARD_TIME_LOCAL_MEAN_WARNING,
  SEOUL_STANDARD_TIME_START_INSTANT_MS,
} from './report-warnings';
import { assertRequestShape } from './validate-request';
import type {
  DayHourClock,
  GregorianBirthDate,
  PillarReport,
  SajuCalculationResult,
  SajuReport,
  SajuRequest,
  SolarTermEvidence,
  ZiHourPolicy,
} from './types';

function completeTime(date: GregorianBirthDate, time: SajuRequest['birth']['time']): LocalDateTime {
  return {
    year: date.year,
    month: date.month,
    day: date.day,
    hour: time.hour,
    minute: time.minute,
    second: time.second ?? 0,
    millisecond: time.millisecond ?? 0,
  };
}

function pillarReport(pillar: Pillar, cycleIndex: number): PillarReport {
  const report = describePillar(pillar);
  if (report.cycleIndex !== cycleIndex) {
    throw new SajuError(
      'DATA_INTEGRITY_FAILURE',
      'The calculated pillar and cycle index describe different cycle positions.',
    );
  }
  return report;
}

function solarTermEvidence(boundary: SolarTermBoundary): SolarTermEvidence {
  return {
    index: boundary.index,
    name: boundary.name,
    hanja: boundary.hanja,
    longitudeDegrees: boundary.longitudeDegrees,
    instantUtc: boundary.instantUtc,
    epochMilliseconds: boundary.epochMilliseconds,
    uncertaintyMilliseconds: boundary.uncertaintyMilliseconds,
  };
}

function minimumBoundaryDistance(
  epochMilliseconds: number,
  result: AuditablePillarsResult,
): number {
  return Math.min(
    Math.abs(epochMilliseconds - result.lichun.epochMilliseconds),
    Math.abs(epochMilliseconds - result.monthStart.epochMilliseconds),
    Math.abs(epochMilliseconds - result.monthEnd.epochMilliseconds),
  );
}

function resolvedRules(request: SajuRequest): {
  readonly ziHourPolicy: ZiHourPolicy;
  readonly dayHourClock: DayHourClock;
} {
  return {
    ziHourPolicy: request.rules?.ziHourPolicy ?? 'civilMidnight',
    dayHourClock: request.rules?.dayHourClock ?? { kind: 'civil' },
  };
}

/**
 * Calculates an auditable Korean Saju report.
 *
 * Invalid civil times, ambiguous DST folds, gaps, unsupported dates, and data
 * integrity failures throw `SajuError`. Use `tryCalculateSaju` for a result union.
 */
export function calculateSaju(request: SajuRequest): SajuReport {
  assertRequestShape(request);

  const gregorianDate = normalizeBirthDate(request.birth.date);
  const civilDateTime = completeTime(gregorianDate, request.birth.time);
  const instant = resolveBirthInstant({
    localDateTime: civilDateTime,
    timeZone: request.birth.timeZone,
    ...(request.birth.disambiguation === undefined
      ? {}
      : { disambiguation: request.birth.disambiguation }),
    ...(request.birth.expectedOffsetSeconds === undefined
      ? {}
      : { expectedOffsetSeconds: request.birth.expectedOffsetSeconds }),
  });
  const rules = resolvedRules(request);
  const dayHour = resolveDayHourClock(civilDateTime, instant.epochMilliseconds, rules.dayHourClock);
  const calculated = calculateAuditableFourPillars({
    birthInstantEpochMilliseconds: instant.epochMilliseconds,
    gregorianBirthYear: gregorianDate.year,
    dayHourDateTime: dayHour.dateTime,
    ziHourPolicy: rules.ziHourPolicy,
  });
  const pillars: FourPillars = calculated.pillars;
  const year = pillarReport(pillars.year, calculated.cycleIndexes.year);
  const month = pillarReport(pillars.month, calculated.cycleIndexes.month);
  const day = pillarReport(pillars.day, calculated.cycleIndexes.day);
  const hour = pillarReport(pillars.hour, calculated.cycleIndexes.hour);
  const tenGods = getTenGodChart(pillars);
  const boundaryDistance = minimumBoundaryDistance(instant.epochMilliseconds, calculated);

  const warnings: SajuReport['warnings'][number][] = [];
  const relevantUncertainty = Math.max(
    calculated.lichun.uncertaintyMilliseconds,
    calculated.monthStart.uncertaintyMilliseconds,
    calculated.monthEnd.uncertaintyMilliseconds,
  );
  if (boundaryDistance <= relevantUncertainty) {
    warnings.push({
      code: 'BOUNDARY_WITHIN_SOURCE_UNCERTAINTY',
      message:
        'The birth instant is close enough to a solar-term boundary that an independent high-precision oracle should be checked.',
    });
  }
  if (
    instant.timeZone === 'Asia/Seoul' &&
    instant.epochMilliseconds < SEOUL_STANDARD_TIME_START_INSTANT_MS
  ) {
    warnings.push(PRE_STANDARD_TIME_LOCAL_MEAN_WARNING);
  }

  const report: SajuReport = {
    schemaVersion: ENGINE_MANIFEST.engine.schemaVersion,
    chronology: {
      inputDate: copyBirthDate(request.birth.date),
      gregorianDate,
      koreanLunarDate: toKoreanLunarBirthDate(gregorianDate),
      civilDateTime: formatLocalDateTime(civilDateTime),
      instantUtc: instant.instantUtc,
      epochMilliseconds: instant.epochMilliseconds,
      timeZone: instant.timeZone,
      offsetSeconds: instant.offsetSeconds,
      timeZoneAbbreviation: instant.abbreviation,
      daylightSaving: instant.daylightSaving,
      disambiguation: instant.disambiguation,
      dayHourDateTime: formatLocalDateTime(dayHour.dateTime),
      dayHourClock: rules.dayHourClock.kind,
      solarTimeCorrection: dayHour.correction,
    },
    pillars: { year, month, day, hour },
    facts: {
      dayMaster: day.stem,
      tenGods,
      voidBranches: getVoidBranches(pillars.day.heavenlyStem, pillars.day.earthlyBranch),
      structure: analyzeStructure(pillars),
    },
    audit: {
      engine: ENGINE_MANIFEST.engine,
      supportedRanges: ENGINE_MANIFEST.supportedRanges,
      datasets: {
        timezone: ENGINE_MANIFEST.timezone,
        solarTerms: ENGINE_MANIFEST.solarTerms,
        koreanLunar: ENGINE_MANIFEST.koreanLunar,
      },
      validation: ENGINE_MANIFEST.validation,
      rules: {
        yearBoundary: 'lichun-instant-inclusive',
        monthBoundary: 'twelve-jie-instant-inclusive',
        dayCalendar: 'proleptic-gregorian',
        ziHourPolicy: rules.ziHourPolicy,
        dayHourClock: rules.dayHourClock.kind,
        longitudeDegreesEast:
          rules.dayHourClock.kind === 'local-apparent-solar'
            ? rules.dayHourClock.longitudeDegreesEast
            : null,
        equationOfTime:
          rules.dayHourClock.kind === 'local-apparent-solar'
            ? rules.dayHourClock.equationOfTime
            : null,
        lunarCalendar: 'korean',
      },
      evidence: {
        lichun: solarTermEvidence(calculated.lichun),
        monthStart: solarTermEvidence(calculated.monthStart),
        monthEnd: solarTermEvidence(calculated.monthEnd),
        effectiveDay: calculated.effectiveDay,
        epochDay: calculated.epochDay,
        distanceToNearestBoundaryMilliseconds: boundaryDistance,
      },
    },
    warnings,
  };
  return deepFreeze(brandCalculationReport(report));
}

export function tryCalculateSaju(request: SajuRequest): SajuCalculationResult {
  try {
    return { ok: true, value: calculateSaju(request) };
  } catch (error) {
    if (isSajuError(error)) return { ok: false, error };
    throw error;
  }
}

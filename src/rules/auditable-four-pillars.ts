import { findSolarTermBoundary, type SolarTermBoundary } from '../astro/astronomical-solar-terms';
import type { ZiHourPolicy } from '../auditable/types';
import { SajuError } from '../errors';
import { ganjiIndexOf, pillarFromGanji } from '../ganji';
import type { LocalDateTime } from '../time/resolve-birth-instant';
import type { FourPillars, Pillar } from '../types';

const JULIAN_DAY_NUMBER_AT_UNIX_EPOCH = 2_440_588;
const MILLISECONDS_PER_HOUR = 3_600_000;
const MILLISECONDS_PER_DAY = 24 * MILLISECONDS_PER_HOUR;
const MONTH_OPENING_TERM_INDICES = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22] as const;

function floorModulo(value: number, modulus: number): number {
  const remainder = value % modulus;
  return remainder < 0 ? remainder + modulus : remainder;
}

function gregorianJulianDayNumber(year: number, month: number, day: number): number {
  const previousYearMonths = Math.floor((14 - month) / 12);
  const shiftedYear = year + 4_800 - previousYearMonths;
  const shiftedMonth = month + 12 * previousYearMonths - 3;
  return (
    day +
    Math.floor((153 * shiftedMonth + 2) / 5) +
    365 * shiftedYear +
    Math.floor(shiftedYear / 4) -
    Math.floor(shiftedYear / 100) +
    Math.floor(shiftedYear / 400) -
    32_045
  );
}

function pillarFromIndexes(
  stemIndex: number,
  branchIndex: number,
): {
  readonly pillar: Pillar;
  readonly cycleIndex: number;
} {
  const cycleIndex = ganjiIndexOf(stemIndex, branchIndex);
  return { pillar: pillarFromGanji(cycleIndex), cycleIndex };
}

function yearPillar(sajuYear: number): {
  readonly pillar: Pillar;
  readonly cycleIndex: number;
} {
  const cycleIndex = floorModulo(sajuYear - 4, 60);
  return { pillar: pillarFromGanji(cycleIndex), cycleIndex };
}

function monthNumberOpenedBy(termIndex: number): number {
  return termIndex === 0 ? 12 : termIndex / 2;
}

function surroundingMonthOpenings(epochMilliseconds: number): {
  readonly start: SolarTermBoundary;
  readonly end: SolarTermBoundary;
  readonly monthNumber: number;
} {
  const year = new Date(epochMilliseconds).getUTCFullYear();
  const currentYearOpenings = MONTH_OPENING_TERM_INDICES.map((index) =>
    findSolarTermBoundary(year, index),
  );
  const start =
    [...currentYearOpenings]
      .reverse()
      .find((boundary) => boundary.epochMilliseconds <= epochMilliseconds) ??
    findSolarTermBoundary(year - 1, 22);
  const end =
    currentYearOpenings.find((boundary) => boundary.epochMilliseconds > epochMilliseconds) ??
    findSolarTermBoundary(year + 1, 0);

  if (start.epochMilliseconds > epochMilliseconds || end.epochMilliseconds <= epochMilliseconds) {
    throw new SajuError('SOLAR_TERM_NOT_FOUND', 'Could not bracket the instant by month openings.');
  }
  return { start, end, monthNumber: monthNumberOpenedBy(start.index) };
}

function monthPillar(
  sajuYear: number,
  monthNumber: number,
): { readonly pillar: Pillar; readonly cycleIndex: number } {
  const yearStemIndex = floorModulo(sajuYear - 4, 10);
  const stemIndex = floorModulo(2 * (yearStemIndex % 5) + monthNumber + 1, 10);
  const branchIndex = floorModulo(monthNumber + 1, 12);
  return pillarFromIndexes(stemIndex, branchIndex);
}

function nextGregorianDate(dateTime: LocalDateTime): string {
  const next = new Date(
    Date.UTC(dateTime.year, dateTime.month - 1, dateTime.day) + MILLISECONDS_PER_DAY,
  );
  return [
    next.getUTCFullYear().toString().padStart(4, '0'),
    (next.getUTCMonth() + 1).toString().padStart(2, '0'),
    next.getUTCDate().toString().padStart(2, '0'),
  ].join('-');
}

function sameGregorianDate(dateTime: LocalDateTime): string {
  return [
    dateTime.year.toString().padStart(4, '0'),
    dateTime.month.toString().padStart(2, '0'),
    dateTime.day.toString().padStart(2, '0'),
  ].join('-');
}

function dayAndHourPillars(
  dateTime: LocalDateTime,
  ziHourPolicy: ZiHourPolicy,
): {
  readonly day: Pillar;
  readonly hour: Pillar;
  readonly dayCycleIndex: number;
  readonly hourCycleIndex: number;
  readonly epochDay: number;
  readonly effectiveDay: string;
} {
  const julianDayNumber = gregorianJulianDayNumber(dateTime.year, dateTime.month, dateTime.day);
  const epochDay = julianDayNumber - JULIAN_DAY_NUMBER_AT_UNIX_EPOCH;
  const civilDayCycleIndex = floorModulo(julianDayNumber + 49, 60);
  const lateZiHour = dateTime.hour === 23;
  const dayRollsAtZi = lateZiHour && ziHourPolicy === 'ziStart';
  const hourUsesNextDayStem = lateZiHour && ziHourPolicy !== 'civilMidnight';
  const dayCycleIndex = floorModulo(civilDayCycleIndex + (dayRollsAtZi ? 1 : 0), 60);
  const hourDayCycleIndex = floorModulo(civilDayCycleIndex + (hourUsesNextDayStem ? 1 : 0), 60);
  const millisecondsOfDay =
    dateTime.hour * MILLISECONDS_PER_HOUR +
    dateTime.minute * 60_000 +
    dateTime.second * 1_000 +
    dateTime.millisecond;
  const hourBranchIndex = Math.floor(
    floorModulo(millisecondsOfDay + MILLISECONDS_PER_HOUR, MILLISECONDS_PER_DAY) /
      (2 * MILLISECONDS_PER_HOUR),
  );
  const hourStemIndex = floorModulo(2 * ((hourDayCycleIndex % 10) % 5) + hourBranchIndex, 10);
  const calculatedHour = pillarFromIndexes(hourStemIndex, hourBranchIndex);

  return {
    day: pillarFromGanji(dayCycleIndex),
    hour: calculatedHour.pillar,
    dayCycleIndex,
    hourCycleIndex: calculatedHour.cycleIndex,
    epochDay,
    effectiveDay: dayRollsAtZi ? nextGregorianDate(dateTime) : sameGregorianDate(dateTime),
  };
}

export interface AuditablePillarsResult {
  readonly pillars: FourPillars;
  readonly cycleIndexes: {
    readonly year: number;
    readonly month: number;
    readonly day: number;
    readonly hour: number;
  };
  readonly sajuYear: number;
  readonly monthNumber: number;
  readonly lichun: SolarTermBoundary;
  readonly monthStart: SolarTermBoundary;
  readonly monthEnd: SolarTermBoundary;
  readonly epochDay: number;
  readonly effectiveDay: string;
}

export function calculateAuditableFourPillars(input: {
  readonly birthInstantEpochMilliseconds: number;
  readonly gregorianBirthYear: number;
  readonly dayHourDateTime: LocalDateTime;
  readonly ziHourPolicy: ZiHourPolicy;
}): AuditablePillarsResult {
  const lichun = findSolarTermBoundary(input.gregorianBirthYear, 2);
  const sajuYear =
    input.birthInstantEpochMilliseconds < lichun.epochMilliseconds
      ? input.gregorianBirthYear - 1
      : input.gregorianBirthYear;
  const monthOpenings = surroundingMonthOpenings(input.birthInstantEpochMilliseconds);
  const year = yearPillar(sajuYear);
  const month = monthPillar(sajuYear, monthOpenings.monthNumber);
  const dayHour = dayAndHourPillars(input.dayHourDateTime, input.ziHourPolicy);

  return {
    pillars: {
      year: year.pillar,
      month: month.pillar,
      day: dayHour.day,
      hour: dayHour.hour,
    },
    cycleIndexes: {
      year: year.cycleIndex,
      month: month.cycleIndex,
      day: dayHour.dayCycleIndex,
      hour: dayHour.hourCycleIndex,
    },
    sajuYear,
    monthNumber: monthOpenings.monthNumber,
    lichun,
    monthStart: monthOpenings.start,
    monthEnd: monthOpenings.end,
    epochDay: dayHour.epochDay,
    effectiveDay: dayHour.effectiveDay,
  };
}

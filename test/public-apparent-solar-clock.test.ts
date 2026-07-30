import { describe, expect, test } from 'vitest';
import { calculateSaju } from '../src/index';

const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

function isGregorianLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function dayOfYear(year: number, month: number, day: number): number {
  let ordinal = day;
  for (let index = 0; index < month - 1; index += 1) {
    ordinal += MONTH_LENGTHS[index]!;
  }
  if (month > 2 && isGregorianLeapYear(year)) ordinal += 1;
  return ordinal;
}

function noaaEquationOfTimeSeconds(input: {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute?: number;
  readonly second?: number;
  readonly millisecond?: number;
}): number {
  const hour =
    input.hour +
    (input.minute ?? 0) / 60 +
    (input.second ?? 0) / 3_600 +
    (input.millisecond ?? 0) / 3_600_000;
  const daysInYear = isGregorianLeapYear(input.year) ? 366 : 365;
  const fractionalYear =
    ((2 * Math.PI) / daysInYear) *
    (dayOfYear(input.year, input.month, input.day) - 1 + (hour - 12) / 24);
  const minutes =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(fractionalYear) -
      0.032077 * Math.sin(fractionalYear) -
      0.014615 * Math.cos(2 * fractionalYear) -
      0.040849 * Math.sin(2 * fractionalYear));
  return Math.round(minutes * 60 * 1_000_000) / 1_000_000;
}

function correctionFor(
  input: {
    readonly year: number;
    readonly month: number;
    readonly day: number;
    readonly hour: number;
    readonly minute?: number;
    readonly second?: number;
    readonly millisecond?: number;
  },
  longitudeDegreesEast: number,
  equationOfTime: 'apply' | 'omit',
): NonNullable<ReturnType<typeof calculateSaju>['chronology']['solarTimeCorrection']> {
  const report = calculateSaju({
    birth: {
      date: {
        calendar: 'gregorian',
        year: input.year,
        month: input.month,
        day: input.day,
      },
      time: {
        hour: input.hour,
        minute: input.minute ?? 0,
        second: input.second ?? 0,
        millisecond: input.millisecond ?? 0,
      },
      timeZone: 'UTC',
    },
    rules: {
      dayHourClock: {
        kind: 'local-apparent-solar',
        longitudeDegreesEast,
        equationOfTime,
      },
    },
  });

  expect(report.chronology.solarTimeCorrection).not.toBeNull();
  return report.chronology.solarTimeCorrection!;
}

describe('calculateSaju public apparent-solar clock', () => {
  test.each([
    { year: 1801, month: 1, day: 15, hour: 12 },
    { year: 1900, month: 4, day: 15, hour: 12 },
    { year: 2000, month: 2, day: 29, hour: 6, minute: 30 },
    { year: 2000, month: 7, day: 15, hour: 12 },
    { year: 2100, month: 10, day: 15, hour: 18, minute: 45 },
  ] as const)('$year-$month-$day $hour시의 EOT가 NOAA fractional-year 공식과 일치한다', (input) => {
    const correction = correctionFor(input, 0, 'apply');
    const expectedEquationOfTimeSeconds = noaaEquationOfTimeSeconds(input);

    expect(correction.longitudeSeconds).toBe(0);
    expect(correction.equationOfTimeSeconds).toBe(expectedEquationOfTimeSeconds);
    expect(correction.totalDifferenceFromCivilSeconds).toBeCloseTo(
      expectedEquationOfTimeSeconds,
      3,
    );
  });

  test.each([
    [-180, -43_200],
    [0, 0],
    [126.978, 30_474.72],
    [180, 43_200],
  ] as const)(
    '경도 %f°의 평균태양시 보정은 %f초이고 EOT omit은 0초다',
    (longitudeDegreesEast, expectedLongitudeSeconds) => {
      const correction = correctionFor(
        { year: 2000, month: 7, day: 15, hour: 12 },
        longitudeDegreesEast,
        'omit',
      );

      expect(correction.longitudeSeconds).toBe(expectedLongitudeSeconds);
      expect(correction.equationOfTimeSeconds).toBe(0);
      expect(correction.totalDifferenceFromCivilSeconds).toBe(expectedLongitudeSeconds);
    },
  );
});

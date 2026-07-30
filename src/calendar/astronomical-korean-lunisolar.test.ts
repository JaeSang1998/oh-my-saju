import { SearchMoonPhase, SearchSunLongitude, type AstroTime } from 'astronomy-engine';
import { describe, expect, test } from 'vitest';
import kasiDataset from '../../test/fixtures/kasi-lunar-dataset.json';
import {
  ASTRONOMICAL_KOREAN_LUNISOLAR_MAX_YEAR,
  ASTRONOMICAL_KOREAN_LUNISOLAR_MIN_YEAR,
  astronomicalKoreanLunarToSolar,
  astronomicalSolarToKoreanLunar,
  type AstronomicalGregorianDate,
  type AstronomicalKoreanLunarDate,
} from './astronomical-korean-lunisolar';

const DAY_MILLISECONDS = 86_400_000;
const HISTORICAL_KOREAN_CALENDAR_OFFSET_MILLISECONDS = 8 * 3_600_000;
const MODERN_KOREA_STANDARD_TIME_OFFSET_MILLISECONDS = 9 * 3_600_000;
const MODERN_KOREA_STANDARD_TIME_START_YEAR = 1912;

interface KasiFixtureRow {
  readonly solar: readonly [number, number, number];
  readonly lunar: readonly [number, number, number];
  readonly leap: boolean;
}

const SUPPORTED_KASI_ROWS = (kasiDataset as KasiFixtureRow[]).filter(
  ({ solar: [year] }) =>
    year >= ASTRONOMICAL_KOREAN_LUNISOLAR_MIN_YEAR &&
    year <= ASTRONOMICAL_KOREAN_LUNISOLAR_MAX_YEAR,
);

function gregorianDateFromOrdinal(dateOrdinal: number): AstronomicalGregorianDate {
  const date = new Date(dateOrdinal * DAY_MILLISECONDS);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function gregorianDateOrdinal(date: AstronomicalGregorianDate): number {
  return Date.UTC(date.year, date.month - 1, date.day) / DAY_MILLISECONDS;
}

function koreanCalendarOffsetForInstant(instant: AstroTime): number {
  const modernKoreaStandardYear = new Date(
    instant.date.getTime() + MODERN_KOREA_STANDARD_TIME_OFFSET_MILLISECONDS,
  ).getUTCFullYear();
  return modernKoreaStandardYear < MODERN_KOREA_STANDARD_TIME_START_YEAR
    ? HISTORICAL_KOREAN_CALENDAR_OFFSET_MILLISECONDS
    : MODERN_KOREA_STANDARD_TIME_OFFSET_MILLISECONDS;
}

function koreanCalendarOffsetForDateOrdinal(dateOrdinal: number): number {
  return gregorianDateFromOrdinal(dateOrdinal).year < MODERN_KOREA_STANDARD_TIME_START_YEAR
    ? HISTORICAL_KOREAN_CALENDAR_OFFSET_MILLISECONDS
    : MODERN_KOREA_STANDARD_TIME_OFFSET_MILLISECONDS;
}

function koreanCalendarDateOrdinal(instant: AstroTime): number {
  return Math.floor(
    (instant.date.getTime() + koreanCalendarOffsetForInstant(instant)) / DAY_MILLISECONDS,
  );
}

function searchNewMoonOnOrBeforeKoreanCalendarDate(dateOrdinal: number): AstroTime {
  const nextLocalMidnightUtc =
    (dateOrdinal + 1) * DAY_MILLISECONDS - koreanCalendarOffsetForDateOrdinal(dateOrdinal);
  const newMoon = SearchMoonPhase(0, new Date(nextLocalMidnightUtc - 1), -40);
  if (newMoon === null) throw new Error('Test oracle could not find a new moon.');
  return newMoon;
}

function nextNewMoon(previous: AstroTime): AstroTime {
  const newMoon = SearchMoonPhase(0, new Date(previous.date.getTime() + DAY_MILLISECONDS), 40);
  if (newMoon === null) throw new Error('Test oracle could not find the next new moon.');
  return newMoon;
}

function sameGregorianDate(
  first: AstronomicalGregorianDate,
  second: AstronomicalGregorianDate,
): boolean {
  return first.year === second.year && first.month === second.month && first.day === second.day;
}

function sameLunarMonth(
  first: AstronomicalKoreanLunarDate,
  second: AstronomicalKoreanLunarDate,
): boolean {
  return (
    first.year === second.year &&
    first.month === second.month &&
    first.isLeapMonth === second.isLeapMonth
  );
}

function caughtErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

describe('독립 천문 한국 음양력', () => {
  test('2000년 설날을 합삭일인 음력 1월 1일로 계산한다', () => {
    expect(astronomicalSolarToKoreanLunar({ year: 2000, month: 2, day: 5 })).toEqual({
      year: 2000,
      month: 1,
      day: 1,
      isLeapMonth: false,
    });

    expect(
      astronomicalKoreanLunarToSolar({
        year: 2000,
        month: 1,
        day: 1,
        isLeapMonth: false,
      }),
    ).toEqual({ year: 2000, month: 2, day: 5 });
  });

  test('KASI 200개 중 198개를 양방향 일치시키고 전근대 역법 차이 2개를 고정한다', () => {
    expect(SUPPORTED_KASI_ROWS).toHaveLength(200);
    const differences: unknown[] = [];

    for (const row of SUPPORTED_KASI_ROWS) {
      const [solarYear, solarMonth, solarDay] = row.solar;
      const [lunarYear, lunarMonth, lunarDay] = row.lunar;
      const expectedLunar = {
        year: lunarYear,
        month: lunarMonth,
        day: lunarDay,
        isLeapMonth: row.leap,
      };
      const actualLunar = astronomicalSolarToKoreanLunar({
        year: solarYear,
        month: solarMonth,
        day: solarDay,
      });

      const expectedSolar = {
        year: solarYear,
        month: solarMonth,
        day: solarDay,
      };
      const lunarInput = {
        year: lunarYear,
        month: lunarMonth,
        day: lunarDay,
        isLeapMonth: row.leap,
      };
      let actualSolar: AstronomicalGregorianDate | { readonly error: string };
      try {
        actualSolar = astronomicalKoreanLunarToSolar(lunarInput);
      } catch (error) {
        actualSolar = { error: caughtErrorMessage(error) };
      }

      if (
        JSON.stringify(actualLunar) !== JSON.stringify(expectedLunar) ||
        JSON.stringify(actualSolar) !== JSON.stringify(expectedSolar)
      ) {
        differences.push({
          fixture: {
            solar: row.solar,
            lunar: row.lunar,
            leap: row.leap,
          },
          actualLunar,
          actualSolar,
        });
      }
    }

    expect(SUPPORTED_KASI_ROWS.length - differences.length).toBe(198);
    expect(differences).toEqual([
      {
        fixture: {
          solar: [1637, 6, 13],
          lunar: [1637, 4, 21],
          leap: true,
        },
        actualLunar: {
          year: 1637,
          month: 5,
          day: 21,
          isLeapMonth: false,
        },
        actualSolar: { error: 'Requested lunar month does not exist.' },
      },
      {
        fixture: {
          solar: [1643, 3, 13],
          lunar: [1643, 1, 23],
          leap: false,
        },
        actualLunar: {
          year: 1643,
          month: 1,
          day: 24,
          isLeapMonth: false,
        },
        actualSolar: { year: 1643, month: 3, day: 12 },
      },
    ]);
  });

  test('1391~2100년 모든 양력 날짜를 왕복하고 모든 월 경계를 검사한다', () => {
    const firstDateOrdinal =
      Date.UTC(ASTRONOMICAL_KOREAN_LUNISOLAR_MIN_YEAR, 0, 1) / DAY_MILLISECONDS;
    const endDateOrdinal =
      Date.UTC(ASTRONOMICAL_KOREAN_LUNISOLAR_MAX_YEAR + 1, 0, 1) / DAY_MILLISECONDS;
    const failureSamples: string[] = [];
    let failureCount = 0;
    let monthBoundaryCount = 0;
    let previousLunar: AstronomicalKoreanLunarDate | undefined;

    const recordFailure = (message: string): void => {
      failureCount += 1;
      if (failureSamples.length < 20) failureSamples.push(message);
    };

    for (let dateOrdinal = firstDateOrdinal; dateOrdinal < endDateOrdinal; dateOrdinal += 1) {
      const solar = gregorianDateFromOrdinal(dateOrdinal);
      const lunar = astronomicalSolarToKoreanLunar(solar);
      const roundTripSolar = astronomicalKoreanLunarToSolar(lunar);
      if (!sameGregorianDate(roundTripSolar, solar)) {
        recordFailure(
          `${JSON.stringify(solar)} -> ${JSON.stringify(lunar)} -> ${JSON.stringify(roundTripSolar)}`,
        );
      }

      if (previousLunar !== undefined) {
        if (sameLunarMonth(previousLunar, lunar)) {
          if (lunar.day !== previousLunar.day + 1) {
            recordFailure(
              `Lunar day did not increment: ${JSON.stringify(previousLunar)} -> ${JSON.stringify(lunar)}`,
            );
          }
        } else {
          monthBoundaryCount += 1;
          if (lunar.day !== 1 || (previousLunar.day !== 29 && previousLunar.day !== 30)) {
            recordFailure(
              `Invalid lunar month boundary: ${JSON.stringify(previousLunar)} -> ${JSON.stringify(lunar)}`,
            );
          }
        }
      }

      previousLunar = lunar;
    }

    expect({
      failureCount,
      failureSamples,
    }).toEqual({
      failureCount: 0,
      failureSamples: [],
    });
    expect(monthBoundaryCount).toBeGreaterThan(8_700);
  });

  test('1391~2100년의 모든 합삭이 든 한국 역법 날짜를 음력 초하루로 둔다', () => {
    const firstDateOrdinal =
      Date.UTC(ASTRONOMICAL_KOREAN_LUNISOLAR_MIN_YEAR, 0, 1) / DAY_MILLISECONDS;
    const firstUtc = new Date(
      Date.UTC(ASTRONOMICAL_KOREAN_LUNISOLAR_MIN_YEAR, 0, 1) -
        koreanCalendarOffsetForDateOrdinal(firstDateOrdinal),
    );
    const endDateOrdinal =
      Date.UTC(ASTRONOMICAL_KOREAN_LUNISOLAR_MAX_YEAR + 1, 0, 1) / DAY_MILLISECONDS;
    let newMoon = SearchMoonPhase(0, firstUtc, 40);
    if (newMoon === null) throw new Error('Test oracle could not find the first new moon.');
    let conjunctionCount = 0;

    while (koreanCalendarDateOrdinal(newMoon) < endDateOrdinal) {
      const solar = gregorianDateFromOrdinal(koreanCalendarDateOrdinal(newMoon));
      expect(astronomicalSolarToKoreanLunar(solar).day).toBe(1);
      conjunctionCount += 1;
      newMoon = nextNewMoon(newMoon);
    }

    expect(conjunctionCount).toBeGreaterThan(8_700);
  });

  test('1391~2100년의 모든 동지가 든 한국 역법 날짜를 음력 11월로 둔다', () => {
    for (
      let year = ASTRONOMICAL_KOREAN_LUNISOLAR_MIN_YEAR;
      year <= ASTRONOMICAL_KOREAN_LUNISOLAR_MAX_YEAR;
      year += 1
    ) {
      const winterSolstice = SearchSunLongitude(270, new Date(Date.UTC(year, 11, 1)), 31);
      if (winterSolstice === null) {
        throw new Error(`Test oracle could not find the ${year} winter solstice.`);
      }
      const lunar = astronomicalSolarToKoreanLunar(
        gregorianDateFromOrdinal(koreanCalendarDateOrdinal(winterSolstice)),
      );
      expect({
        year,
        lunarMonth: lunar.month,
        isLeapMonth: lunar.isLeapMonth,
      }).toEqual({
        year,
        lunarMonth: 11,
        isLeapMonth: false,
      });
    }
  });

  test('모든 13개월 동지 주기에서 첫 무중기월을 윤달로 둔다', () => {
    let thirteenMonthCycleCount = 0;

    for (
      let solsticeYear = ASTRONOMICAL_KOREAN_LUNISOLAR_MIN_YEAR - 1;
      solsticeYear < ASTRONOMICAL_KOREAN_LUNISOLAR_MAX_YEAR;
      solsticeYear += 1
    ) {
      const firstSolstice = SearchSunLongitude(270, new Date(Date.UTC(solsticeYear, 11, 1)), 31);
      const secondSolstice = SearchSunLongitude(
        270,
        new Date(Date.UTC(solsticeYear + 1, 11, 1)),
        31,
      );
      if (firstSolstice === null || secondSolstice === null) {
        throw new Error(`Test oracle could not find the ${solsticeYear} solstice cycle.`);
      }

      const firstBoundary = searchNewMoonOnOrBeforeKoreanCalendarDate(
        koreanCalendarDateOrdinal(firstSolstice),
      );
      const lastBoundary = searchNewMoonOnOrBeforeKoreanCalendarDate(
        koreanCalendarDateOrdinal(secondSolstice),
      );
      const boundaries = [firstBoundary];
      while (
        koreanCalendarDateOrdinal(boundaries[boundaries.length - 1]!) <
        koreanCalendarDateOrdinal(lastBoundary)
      ) {
        boundaries.push(nextNewMoon(boundaries[boundaries.length - 1]!));
      }
      if (boundaries.length !== 14) continue;

      thirteenMonthCycleCount += 1;
      const principalTerms = [firstSolstice];
      let previousTerm = firstSolstice;
      for (let step = 1; step <= 12; step += 1) {
        const longitude = (270 + 30 * step) % 360;
        const term = SearchSunLongitude(
          longitude,
          new Date(previousTerm.date.getTime() + 20 * DAY_MILLISECONDS),
          20,
        );
        if (term === null) {
          throw new Error(`Test oracle could not find principal term ${longitude}.`);
        }
        principalTerms.push(term);
        previousTerm = term;
      }

      const firstMonthWithoutPrincipalTerm = boundaries
        .slice(1, -1)
        .findIndex((boundary, relativeIndex) => {
          const nextBoundary = boundaries[relativeIndex + 2]!;
          const startOrdinal = koreanCalendarDateOrdinal(boundary);
          const endOrdinal = koreanCalendarDateOrdinal(nextBoundary);
          return !principalTerms.some((term) => {
            const termOrdinal = koreanCalendarDateOrdinal(term);
            return termOrdinal >= startOrdinal && termOrdinal < endOrdinal;
          });
        });
      if (firstMonthWithoutPrincipalTerm < 0) {
        throw new Error(`${solsticeYear} has 13 months but no term-free month.`);
      }

      const leapBoundary = boundaries[firstMonthWithoutPrincipalTerm + 1]!;
      const leapDateOrdinal = koreanCalendarDateOrdinal(leapBoundary);
      if (
        leapDateOrdinal >=
          Date.UTC(ASTRONOMICAL_KOREAN_LUNISOLAR_MIN_YEAR, 0, 1) / DAY_MILLISECONDS &&
        leapDateOrdinal <
          Date.UTC(ASTRONOMICAL_KOREAN_LUNISOLAR_MAX_YEAR + 1, 0, 1) / DAY_MILLISECONDS
      ) {
        const leapLunar = astronomicalSolarToKoreanLunar(gregorianDateFromOrdinal(leapDateOrdinal));
        const previousLunar = astronomicalSolarToKoreanLunar(
          gregorianDateFromOrdinal(leapDateOrdinal - 1),
        );
        expect({
          leapDay: leapLunar.day,
          isLeapMonth: leapLunar.isLeapMonth,
          repeatsMonth: leapLunar.month === previousLunar.month,
        }).toEqual({
          leapDay: 1,
          isLeapMonth: true,
          repeatsMonth: true,
        });
      }
    }

    expect(thirteenMonthCycleCount).toBeGreaterThan(250);
  });

  test('1391~2100년 모든 음력 월의 29·30일 길이와 연속성을 검사한다', () => {
    const failureSamples: string[] = [];
    let failureCount = 0;
    let validLunarDayCount = 0;

    const recordFailure = (message: string): void => {
      failureCount += 1;
      if (failureSamples.length < 20) failureSamples.push(message);
    };

    for (
      let lunarYear = ASTRONOMICAL_KOREAN_LUNISOLAR_MIN_YEAR;
      lunarYear <= ASTRONOMICAL_KOREAN_LUNISOLAR_MAX_YEAR;
      lunarYear += 1
    ) {
      let previousSolarOrdinal: number | undefined;
      let leapMonthCount = 0;

      for (let lunarMonth = 1; lunarMonth <= 12; lunarMonth += 1) {
        for (const isLeapMonth of [false, true]) {
          const firstLunarDay = {
            year: lunarYear,
            month: lunarMonth,
            day: 1,
            isLeapMonth,
          };
          let firstSolar: AstronomicalGregorianDate;
          try {
            firstSolar = astronomicalKoreanLunarToSolar(firstLunarDay);
          } catch (error) {
            if (!isLeapMonth) {
              recordFailure(
                `Missing regular lunar month ${lunarYear}-${lunarMonth}: ${caughtErrorMessage(error)}`,
              );
            }
            continue;
          }

          if (isLeapMonth) leapMonthCount += 1;
          let monthLength = 29;
          try {
            astronomicalKoreanLunarToSolar({
              ...firstLunarDay,
              day: 30,
            });
            monthLength = 30;
          } catch (error) {
            if (caughtErrorMessage(error) !== 'Lunar month has 29 days.') {
              recordFailure(
                `Unexpected day-30 error for ${lunarYear}-${lunarMonth} leap=${isLeapMonth}: ${caughtErrorMessage(error)}`,
              );
            }
          }

          for (let lunarDay = 1; lunarDay <= monthLength; lunarDay += 1) {
            const lunar = {
              ...firstLunarDay,
              day: lunarDay,
            };
            const solar = lunarDay === 1 ? firstSolar : astronomicalKoreanLunarToSolar(lunar);
            const solarOrdinal = gregorianDateOrdinal(solar);
            validLunarDayCount += 1;

            if (previousSolarOrdinal !== undefined && solarOrdinal !== previousSolarOrdinal + 1) {
              recordFailure(
                `Non-contiguous lunar calendar at ${JSON.stringify(lunar)}: ${previousSolarOrdinal} -> ${solarOrdinal}`,
              );
            }
            previousSolarOrdinal = solarOrdinal;

            if (
              solar.year >= ASTRONOMICAL_KOREAN_LUNISOLAR_MIN_YEAR &&
              solar.year <= ASTRONOMICAL_KOREAN_LUNISOLAR_MAX_YEAR
            ) {
              const roundTripLunar = astronomicalSolarToKoreanLunar(solar);
              if (JSON.stringify(roundTripLunar) !== JSON.stringify(lunar)) {
                recordFailure(
                  `${JSON.stringify(lunar)} -> ${JSON.stringify(solar)} -> ${JSON.stringify(roundTripLunar)}`,
                );
              }
            }
          }
        }
      }

      if (leapMonthCount > 1) {
        recordFailure(`${lunarYear} has ${leapMonthCount} leap months.`);
      }
    }

    expect({ failureCount, failureSamples }).toEqual({
      failureCount: 0,
      failureSamples: [],
    });
    expect(validLunarDayCount).toBeGreaterThan(259_000);
  });

  test('존재하지 않는 양력·음력 날짜를 거부한다', () => {
    expect(() => astronomicalSolarToKoreanLunar({ year: 2000, month: 2, day: 30 })).toThrow(
      'Gregorian date does not exist.',
    );
    expect(() =>
      astronomicalKoreanLunarToSolar({
        year: 2000,
        month: 1,
        day: 31,
        isLeapMonth: false,
      }),
    ).toThrow('Lunar day must be an integer from 1 through 30.');
    expect(() =>
      astronomicalKoreanLunarToSolar({
        year: 2000,
        month: 1,
        day: 1,
        isLeapMonth: true,
      }),
    ).toThrow('Requested lunar month does not exist.');
  });
});

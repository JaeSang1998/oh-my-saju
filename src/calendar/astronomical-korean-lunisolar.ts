import { SearchMoonPhase, SearchSunLongitude, type AstroTime } from 'astronomy-engine';

const DAY_MILLISECONDS = 86_400_000;
/*
 * This is a calendrical meridian policy, not a reconstruction of every
 * historical civil-time change: 120°E before 1912 and modern KST thereafter.
 */
const HISTORICAL_KOREAN_CALENDAR_OFFSET_MILLISECONDS = 8 * 3_600_000;
const MODERN_KOREA_STANDARD_TIME_OFFSET_MILLISECONDS = 9 * 3_600_000;
const MODERN_KOREA_STANDARD_TIME_START_YEAR = 1912;
const PRINCIPAL_TERM_STEP_DEGREES = 30;
const WINTER_SOLSTICE_LONGITUDE_DEGREES = 270;

export const ASTRONOMICAL_KOREAN_LUNISOLAR_MIN_YEAR = 1391;
export const ASTRONOMICAL_KOREAN_LUNISOLAR_MAX_YEAR = 2100;
const MINIMUM_BOUNDARY_LUNAR_YEAR = ASTRONOMICAL_KOREAN_LUNISOLAR_MIN_YEAR - 1;

export interface AstronomicalGregorianDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

export interface AstronomicalKoreanLunarDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly isLeapMonth: boolean;
}

interface AstronomicalEvent {
  readonly instant: AstroTime;
  readonly koreanCalendarDateOrdinal: number;
}

interface AstronomicalLunarMonth {
  readonly lunarYear: number;
  readonly lunarMonth: number;
  readonly isLeapMonth: boolean;
  readonly startDateOrdinal: number;
  readonly endDateOrdinal: number;
}

const SOLSTICE_CACHE = new Map<number, AstronomicalEvent>();
const SOLSTICE_CYCLE_CACHE = new Map<number, readonly AstronomicalLunarMonth[]>();

function positiveModulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

function koreanCalendarOffsetForInstant(epochMilliseconds: number): number {
  const modernKoreaStandardYear = new Date(
    epochMilliseconds + MODERN_KOREA_STANDARD_TIME_OFFSET_MILLISECONDS,
  ).getUTCFullYear();
  return modernKoreaStandardYear < MODERN_KOREA_STANDARD_TIME_START_YEAR
    ? HISTORICAL_KOREAN_CALENDAR_OFFSET_MILLISECONDS
    : MODERN_KOREA_STANDARD_TIME_OFFSET_MILLISECONDS;
}

function koreanCalendarOffsetForDateOrdinal(dateOrdinal: number): number {
  return gregorianDateFromDateOrdinal(dateOrdinal).year < MODERN_KOREA_STANDARD_TIME_START_YEAR
    ? HISTORICAL_KOREAN_CALENDAR_OFFSET_MILLISECONDS
    : MODERN_KOREA_STANDARD_TIME_OFFSET_MILLISECONDS;
}

function koreanCalendarDateOrdinalFromInstant(epochMilliseconds: number): number {
  return Math.floor(
    (epochMilliseconds + koreanCalendarOffsetForInstant(epochMilliseconds)) / DAY_MILLISECONDS,
  );
}

function dateOrdinalFromGregorianDate(date: AstronomicalGregorianDate): number {
  return Math.floor(Date.UTC(date.year, date.month - 1, date.day) / DAY_MILLISECONDS);
}

function gregorianDateFromDateOrdinal(dateOrdinal: number): AstronomicalGregorianDate {
  const date = new Date(dateOrdinal * DAY_MILLISECONDS);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function assertIntegerInRange(
  value: number,
  minimum: number,
  maximum: number,
  label: string,
): void {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${label} must be an integer from ${minimum} through ${maximum}.`);
  }
}

function assertGregorianDate(date: AstronomicalGregorianDate): void {
  assertIntegerInRange(
    date.year,
    ASTRONOMICAL_KOREAN_LUNISOLAR_MIN_YEAR,
    ASTRONOMICAL_KOREAN_LUNISOLAR_MAX_YEAR + 1,
    'Gregorian year',
  );
  assertIntegerInRange(date.month, 1, 12, 'Gregorian month');
  assertIntegerInRange(date.day, 1, 31, 'Gregorian day');

  const normalized = gregorianDateFromDateOrdinal(dateOrdinalFromGregorianDate(date));
  if (
    normalized.year !== date.year ||
    normalized.month !== date.month ||
    normalized.day !== date.day
  ) {
    throw new RangeError('Gregorian date does not exist.');
  }
}

function assertLunarDate(date: AstronomicalKoreanLunarDate): void {
  assertIntegerInRange(
    date.year,
    MINIMUM_BOUNDARY_LUNAR_YEAR,
    ASTRONOMICAL_KOREAN_LUNISOLAR_MAX_YEAR,
    'Lunar year',
  );
  assertIntegerInRange(date.month, 1, 12, 'Lunar month');
  assertIntegerInRange(date.day, 1, 30, 'Lunar day');
  if (typeof date.isLeapMonth !== 'boolean') {
    throw new TypeError('isLeapMonth must be a boolean.');
  }
}

function searchWinterSolstice(year: number): AstronomicalEvent {
  const cached = SOLSTICE_CACHE.get(year);
  if (cached !== undefined) return cached;

  const instant = SearchSunLongitude(
    WINTER_SOLSTICE_LONGITUDE_DEGREES,
    new Date(Date.UTC(year, 11, 1)),
    31,
  );
  if (instant === null) {
    throw new Error(`Could not find the ${year} winter solstice.`);
  }

  const result = {
    instant,
    koreanCalendarDateOrdinal: koreanCalendarDateOrdinalFromInstant(instant.date.getTime()),
  };
  SOLSTICE_CACHE.set(year, result);
  return result;
}

function searchNewMoonStartingOnOrBefore(koreanCalendarDateOrdinal: number): AstronomicalEvent {
  const nextLocalMidnightUtc =
    (koreanCalendarDateOrdinal + 1) * DAY_MILLISECONDS -
    koreanCalendarOffsetForDateOrdinal(koreanCalendarDateOrdinal);
  const instant = SearchMoonPhase(0, new Date(nextLocalMidnightUtc - 1), -40);
  if (instant === null) {
    throw new Error('Could not find the new moon starting the lunar month.');
  }
  return {
    instant,
    koreanCalendarDateOrdinal: koreanCalendarDateOrdinalFromInstant(instant.date.getTime()),
  };
}

function searchNextNewMoon(previous: AstroTime): AstronomicalEvent {
  const instant = SearchMoonPhase(0, new Date(previous.date.getTime() + DAY_MILLISECONDS), 40);
  if (instant === null) {
    throw new Error('Could not find the next new moon.');
  }
  return {
    instant,
    koreanCalendarDateOrdinal: koreanCalendarDateOrdinalFromInstant(instant.date.getTime()),
  };
}

function principalTermsBetweenSolstices(
  firstSolstice: AstronomicalEvent,
): readonly AstronomicalEvent[] {
  const terms: AstronomicalEvent[] = [firstSolstice];
  let previous = firstSolstice.instant;

  for (let step = 1; step <= 12; step += 1) {
    const longitude = positiveModulo(
      WINTER_SOLSTICE_LONGITUDE_DEGREES + PRINCIPAL_TERM_STEP_DEGREES * step,
      360,
    );
    const instant = SearchSunLongitude(
      longitude,
      new Date(previous.date.getTime() + 20 * DAY_MILLISECONDS),
      20,
    );
    if (instant === null) {
      throw new Error(`Could not find principal term at ${longitude} degrees.`);
    }
    terms.push({
      instant,
      koreanCalendarDateOrdinal: koreanCalendarDateOrdinalFromInstant(instant.date.getTime()),
    });
    previous = instant;
  }

  return terms;
}

function newMoonBoundariesBetweenSolstices(
  firstSolstice: AstronomicalEvent,
  secondSolstice: AstronomicalEvent,
): readonly AstronomicalEvent[] {
  const first = searchNewMoonStartingOnOrBefore(firstSolstice.koreanCalendarDateOrdinal);
  const last = searchNewMoonStartingOnOrBefore(secondSolstice.koreanCalendarDateOrdinal);
  const boundaries: AstronomicalEvent[] = [first];

  while (
    boundaries[boundaries.length - 1]!.koreanCalendarDateOrdinal < last.koreanCalendarDateOrdinal
  ) {
    const next = searchNextNewMoon(boundaries[boundaries.length - 1]!.instant);
    const previousDateOrdinal = boundaries[boundaries.length - 1]!.koreanCalendarDateOrdinal;
    if (next.koreanCalendarDateOrdinal <= previousDateOrdinal) {
      throw new Error('New-moon date boundaries were not strictly increasing.');
    }
    if (next.koreanCalendarDateOrdinal > last.koreanCalendarDateOrdinal) {
      throw new Error('New-moon enumeration skipped the next winter-solstice month.');
    }
    boundaries.push(next);
  }

  return boundaries;
}

function containsPrincipalTerm(
  startDateOrdinal: number,
  endDateOrdinal: number,
  terms: readonly AstronomicalEvent[],
): boolean {
  return terms.some(
    ({ koreanCalendarDateOrdinal }) =>
      koreanCalendarDateOrdinal >= startDateOrdinal && koreanCalendarDateOrdinal < endDateOrdinal,
  );
}

function buildSolsticeCycle(solsticeYear: number): readonly AstronomicalLunarMonth[] {
  const cached = SOLSTICE_CYCLE_CACHE.get(solsticeYear);
  if (cached !== undefined) return cached;

  const firstSolstice = searchWinterSolstice(solsticeYear);
  const secondSolstice = searchWinterSolstice(solsticeYear + 1);
  const boundaries = newMoonBoundariesBetweenSolstices(firstSolstice, secondSolstice);
  const monthCount = boundaries.length - 1;
  if (monthCount !== 12 && monthCount !== 13) {
    throw new Error(
      `Expected 12 or 13 lunar months between winter solstices, found ${monthCount}.`,
    );
  }

  const terms = principalTermsBetweenSolstices(firstSolstice);
  let leapMonthIndex: number | null = null;
  if (monthCount === 13) {
    for (let index = 1; index < monthCount; index += 1) {
      if (
        !containsPrincipalTerm(
          boundaries[index]!.koreanCalendarDateOrdinal,
          boundaries[index + 1]!.koreanCalendarDateOrdinal,
          terms,
        )
      ) {
        leapMonthIndex = index;
        break;
      }
    }
    if (leapMonthIndex === null) {
      throw new Error(
        `The ${solsticeYear} solstice cycle had 13 months but no month without a principal term.`,
      );
    }
  }

  const months: AstronomicalLunarMonth[] = [];
  let lunarYear = solsticeYear;
  let lunarMonth = 11;

  for (let index = 0; index < monthCount; index += 1) {
    const isLeapMonth = index === leapMonthIndex;
    if (index > 0 && !isLeapMonth) {
      lunarMonth = lunarMonth === 12 ? 1 : lunarMonth + 1;
      if (lunarMonth === 1) lunarYear += 1;
    }

    months.push({
      lunarYear,
      lunarMonth,
      isLeapMonth,
      startDateOrdinal: boundaries[index]!.koreanCalendarDateOrdinal,
      endDateOrdinal: boundaries[index + 1]!.koreanCalendarDateOrdinal,
    });
  }

  SOLSTICE_CYCLE_CACHE.set(solsticeYear, months);
  return months;
}

function cyclesForGregorianYear(year: number): readonly AstronomicalLunarMonth[] {
  return [...buildSolsticeCycle(year - 1), ...buildSolsticeCycle(year)];
}

function cyclesForLunarYear(year: number): readonly AstronomicalLunarMonth[] {
  return [...buildSolsticeCycle(year - 1), ...buildSolsticeCycle(year)];
}

export function astronomicalSolarToKoreanLunar(
  date: AstronomicalGregorianDate,
): AstronomicalKoreanLunarDate {
  assertGregorianDate(date);
  const dateOrdinal = dateOrdinalFromGregorianDate(date);
  const lunarMonth = cyclesForGregorianYear(date.year).find(
    ({ startDateOrdinal, endDateOrdinal }) =>
      dateOrdinal >= startDateOrdinal && dateOrdinal < endDateOrdinal,
  );
  if (lunarMonth === undefined) {
    throw new Error('Could not assign the Gregorian date to a lunar month.');
  }

  return {
    year: lunarMonth.lunarYear,
    month: lunarMonth.lunarMonth,
    day: dateOrdinal - lunarMonth.startDateOrdinal + 1,
    isLeapMonth: lunarMonth.isLeapMonth,
  };
}

export function astronomicalKoreanLunarToSolar(
  date: AstronomicalKoreanLunarDate,
): AstronomicalGregorianDate {
  assertLunarDate(date);
  const matchingMonths = cyclesForLunarYear(date.year).filter(
    ({ lunarYear, lunarMonth, isLeapMonth }) =>
      lunarYear === date.year && lunarMonth === date.month && isLeapMonth === date.isLeapMonth,
  );
  if (matchingMonths.length !== 1) {
    throw new RangeError('Requested lunar month does not exist.');
  }

  const lunarMonth = matchingMonths[0]!;
  const monthLength = lunarMonth.endDateOrdinal - lunarMonth.startDateOrdinal;
  if (date.day > monthLength) {
    throw new RangeError(`Lunar month has ${monthLength} days.`);
  }

  return gregorianDateFromDateOrdinal(lunarMonth.startDateOrdinal + date.day - 1);
}

/** Public Korean lunisolar conversion façade. */

import type { LunarDate, LunarMonthInfo, LunarMonthVariantInfo, SolarDate } from '../types';
import { assertIntegerInRange } from '../validation';
import {
  ASTRONOMICAL_KOREAN_LUNISOLAR_MAX_YEAR,
  ASTRONOMICAL_KOREAN_LUNISOLAR_MIN_YEAR,
  astronomicalKoreanLunarToSolar,
  astronomicalSolarToKoreanLunar,
} from './astronomical-korean-lunisolar';

const FIRST_PUBLIC_LUNAR_DATE = astronomicalKoreanLunarToSolar({
  year: ASTRONOMICAL_KOREAN_LUNISOLAR_MIN_YEAR,
  month: 1,
  day: 1,
  isLeapMonth: false,
});
const FIRST_PUBLIC_SOLAR_DATE_ORDINAL = Date.UTC(
  FIRST_PUBLIC_LUNAR_DATE.year,
  FIRST_PUBLIC_LUNAR_DATE.month - 1,
  FIRST_PUBLIC_LUNAR_DATE.day,
);
const LAST_PUBLIC_LUNAR_DATE = (() => {
  const finalMonth = {
    year: ASTRONOMICAL_KOREAN_LUNISOLAR_MAX_YEAR,
    month: 12,
    isLeapMonth: false,
  };
  try {
    return astronomicalKoreanLunarToSolar({ ...finalMonth, day: 30 });
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    return astronomicalKoreanLunarToSolar({ ...finalMonth, day: 29 });
  }
})();
const LAST_PUBLIC_SOLAR_DATE_ORDINAL = Date.UTC(
  LAST_PUBLIC_LUNAR_DATE.year,
  LAST_PUBLIC_LUNAR_DATE.month - 1,
  LAST_PUBLIC_LUNAR_DATE.day,
);

/** Returns whether the numbers identify an existing proleptic Gregorian date. */
export function isValidSolarDate(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const normalized = new Date(0);
  normalized.setUTCFullYear(year, month - 1, day);
  return (
    normalized.getUTCFullYear() === year &&
    normalized.getUTCMonth() === month - 1 &&
    normalized.getUTCDate() === day
  );
}

/** Converts a Korean lunisolar date to a proleptic Gregorian date. */
export function lunarToSolar(
  year: number,
  month: number,
  day: number,
  isLeapMonth: boolean,
): SolarDate {
  assertIntegerInRange(
    year,
    ASTRONOMICAL_KOREAN_LUNISOLAR_MIN_YEAR,
    ASTRONOMICAL_KOREAN_LUNISOLAR_MAX_YEAR,
    'Lunar year',
  );
  return astronomicalKoreanLunarToSolar({ year, month, day, isLeapMonth });
}

function lunarMonthVariant(
  year: number,
  month: number,
  isLeapMonth: boolean,
): LunarMonthVariantInfo | null {
  let firstSolarDate: SolarDate;
  try {
    firstSolarDate = astronomicalKoreanLunarToSolar({
      year,
      month,
      day: 1,
      isLeapMonth,
    });
  } catch (error) {
    if (
      isLeapMonth &&
      error instanceof RangeError &&
      error.message === 'Requested lunar month does not exist.'
    ) {
      return null;
    }
    throw error;
  }

  let dayCount: 29 | 30 = 29;
  let lastSolarDate = astronomicalKoreanLunarToSolar({
    year,
    month,
    day: 29,
    isLeapMonth,
  });
  try {
    lastSolarDate = astronomicalKoreanLunarToSolar({
      year,
      month,
      day: 30,
      isLeapMonth,
    });
    dayCount = 30;
  } catch (error) {
    if (!(error instanceof RangeError) || error.message !== 'Lunar month has 29 days.') {
      throw error;
    }
  }

  return { isLeapMonth, dayCount, firstSolarDate, lastSolarDate };
}

/**
 * Returns the regular and optional leap variant of one Korean lunar month,
 * including each variant's exact Gregorian boundary dates.
 */
export function getLunarMonthInfo(year: number, month: number): LunarMonthInfo {
  assertIntegerInRange(
    year,
    ASTRONOMICAL_KOREAN_LUNISOLAR_MIN_YEAR,
    ASTRONOMICAL_KOREAN_LUNISOLAR_MAX_YEAR,
    'Lunar year',
  );
  assertIntegerInRange(month, 1, 12, 'Lunar month');
  const regular = lunarMonthVariant(year, month, false);
  if (regular === null) {
    throw new Error(`Regular lunar month ${year}-${month} does not exist.`);
  }
  return {
    year,
    month,
    regular,
    leap: lunarMonthVariant(year, month, true),
  };
}

/** Converts a proleptic Gregorian date to a Korean lunisolar date. */
export function solarToLunar(year: number, month: number, day: number): LunarDate {
  if (isValidSolarDate(year, month, day)) {
    const dateOrdinal = Date.UTC(year, month - 1, day);
    if (dateOrdinal < FIRST_PUBLIC_SOLAR_DATE_ORDINAL) {
      throw new RangeError(
        `Korean lunisolar conversion begins at Gregorian ${FIRST_PUBLIC_LUNAR_DATE.year}-${String(
          FIRST_PUBLIC_LUNAR_DATE.month,
        ).padStart(2, '0')}-${String(FIRST_PUBLIC_LUNAR_DATE.day).padStart(2, '0')}.`,
      );
    }
    if (dateOrdinal > LAST_PUBLIC_SOLAR_DATE_ORDINAL) {
      throw new RangeError(
        `Korean lunisolar conversion ends at Gregorian ${LAST_PUBLIC_LUNAR_DATE.year}-${String(
          LAST_PUBLIC_LUNAR_DATE.month,
        ).padStart(2, '0')}-${String(LAST_PUBLIC_LUNAR_DATE.day).padStart(2, '0')}.`,
      );
    }
  }
  return astronomicalSolarToKoreanLunar({ year, month, day });
}

import { isValidSolarDate, lunarToSolar, solarToLunar } from '../calendar/convert';
import { SajuError } from '../errors';
import { ENGINE_MANIFEST } from '../manifest';
import type { GregorianBirthDate, KoreanLunarBirthDate, SajuBirthDate, SajuRequest } from './types';

const { min: MIN_BIRTH_YEAR, max: MAX_BIRTH_YEAR } = ENGINE_MANIFEST.supportedRanges.sajuBirthYears;

function assertSupportedYear(year: number): void {
  if (!Number.isInteger(year) || year < MIN_BIRTH_YEAR || year > MAX_BIRTH_YEAR) {
    throw new SajuError(
      'UNSUPPORTED_DATE_RANGE',
      `Birth dates are supported from ${MIN_BIRTH_YEAR} through ${MAX_BIRTH_YEAR}.`,
      {
        path: ['birth', 'date', 'year'],
        details: { year, minYear: MIN_BIRTH_YEAR, maxYear: MAX_BIRTH_YEAR },
      },
    );
  }
}

export function normalizeBirthDate(date: SajuRequest['birth']['date']): GregorianBirthDate {
  if (date.calendar === 'gregorian') {
    assertSupportedYear(date.year);
    if (!isValidSolarDate(date.year, date.month, date.day)) {
      throw new SajuError('INVALID_DATE', 'The Gregorian birth date does not exist.', {
        path: ['birth', 'date'],
        details: {
          calendar: date.calendar,
          year: date.year,
          month: date.month,
          day: date.day,
        },
      });
    }
    return {
      calendar: 'gregorian',
      year: date.year,
      month: date.month,
      day: date.day,
    };
  }

  let solar: ReturnType<typeof lunarToSolar>;
  try {
    solar = lunarToSolar(date.year, date.month, date.day, date.monthKind === 'leap');
  } catch (cause) {
    throw new SajuError('INVALID_LEAP_MONTH', 'The Korean lunar birth date does not exist.', {
      path: ['birth', 'date'],
      details: {
        calendar: date.calendar,
        year: date.year,
        month: date.month,
        day: date.day,
        monthKind: date.monthKind,
      },
      cause,
    });
  }
  assertSupportedYear(solar.year);
  return { calendar: 'gregorian', ...solar };
}

export function copyBirthDate(date: SajuBirthDate): SajuBirthDate {
  return date.calendar === 'gregorian'
    ? {
        calendar: 'gregorian',
        year: date.year,
        month: date.month,
        day: date.day,
      }
    : {
        calendar: 'korean-lunar',
        year: date.year,
        month: date.month,
        day: date.day,
        monthKind: date.monthKind,
      };
}

export function toKoreanLunarBirthDate(date: GregorianBirthDate): KoreanLunarBirthDate {
  const lunar = solarToLunar(date.year, date.month, date.day);
  return {
    calendar: 'korean-lunar',
    year: lunar.year,
    month: lunar.month,
    day: lunar.day,
    monthKind: lunar.isLeapMonth ? 'leap' : 'regular',
  };
}

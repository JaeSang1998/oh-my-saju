import { describe, expect, test } from 'vitest';
import {
  isValidSolarDate,
  LUNAR_MAX_YEAR,
  LUNAR_MIN_YEAR,
  lunarToSolar,
  solarToLunar,
} from '../calendar';

const DAY_MILLISECONDS = 86_400_000;

describe('한국 음양력 공개 API 불변식', () => {
  test('0~99년을 포함한 전향 Gregorian 날짜를 JavaScript 연도 보정 없이 판정한다', () => {
    expect(isValidSolarDate(0, 2, 29)).toBe(true);
    expect(isValidSolarDate(1, 1, 1)).toBe(true);
    expect(isValidSolarDate(1, 2, 29)).toBe(false);
    expect(isValidSolarDate(99, 12, 31)).toBe(true);
    expect(isValidSolarDate(100, 1, 1)).toBe(true);
  });

  test(
    '지원 하한일부터 변환하며 공개 음력 입력 범위 안에서는 정확히 왕복한다',
    { timeout: 180_000 },
    () => {
      expect(() => lunarToSolar(LUNAR_MIN_YEAR - 1, 12, 1, false)).toThrow(
        `Lunar year must be from ${LUNAR_MIN_YEAR} through ${LUNAR_MAX_YEAR}`,
      );

      const firstPublicLunarDate = lunarToSolar(LUNAR_MIN_YEAR, 1, 1, false);
      expect(firstPublicLunarDate).toEqual({ year: 1391, month: 2, day: 13 });
      expect(() => solarToLunar(1391, 2, 12)).toThrow(
        'Korean lunisolar conversion begins at Gregorian 1391-02-13.',
      );
      const first = Date.UTC(
        firstPublicLunarDate.year,
        firstPublicLunarDate.month - 1,
        firstPublicLunarDate.day,
      );
      let finalLunarDay = 30;
      let lastPublicLunarDate;
      try {
        lastPublicLunarDate = lunarToSolar(LUNAR_MAX_YEAR, 12, finalLunarDay, false);
      } catch (error) {
        if (!(error instanceof RangeError)) throw error;
        finalLunarDay = 29;
        lastPublicLunarDate = lunarToSolar(LUNAR_MAX_YEAR, 12, finalLunarDay, false);
      }
      const end =
        Date.UTC(lastPublicLunarDate.year, lastPublicLunarDate.month - 1, lastPublicLunarDate.day) +
        DAY_MILLISECONDS;
      let count = 0;

      for (let epoch = first; epoch < end; epoch += DAY_MILLISECONDS) {
        const date = new Date(epoch);
        const solar = {
          year: date.getUTCFullYear(),
          month: date.getUTCMonth() + 1,
          day: date.getUTCDate(),
        };
        const lunar = solarToLunar(solar.year, solar.month, solar.day);

        expect(
          lunarToSolar(lunar.year, lunar.month, lunar.day, lunar.isLeapMonth),
          `${solar.year}-${solar.month}-${solar.day}`,
        ).toEqual(solar);
        count += 1;
      }

      expect(
        solarToLunar(lastPublicLunarDate.year, lastPublicLunarDate.month, lastPublicLunarDate.day),
      ).toEqual({
        year: LUNAR_MAX_YEAR,
        month: 12,
        day: finalLunarDay,
        isLeapMonth: false,
      });
      const afterLast = new Date(end);
      expect(() =>
        solarToLunar(
          afterLast.getUTCFullYear(),
          afterLast.getUTCMonth() + 1,
          afterLast.getUTCDate(),
        ),
      ).toThrow('Korean lunisolar conversion ends at Gregorian');
      expect(count).toBe(259_307);
    },
  );

  test('지원하는 모든 음력 평달·윤달의 첫날과 마지막 날이 왕복한다', () => {
    for (let year = LUNAR_MIN_YEAR; year <= LUNAR_MAX_YEAR; year += 1) {
      for (let month = 1; month <= 12; month += 1) {
        for (const isLeapMonth of [false, true]) {
          let firstSolar;
          try {
            firstSolar = lunarToSolar(year, month, 1, isLeapMonth);
          } catch (error) {
            if (isLeapMonth && error instanceof RangeError) continue;
            throw error;
          }

          let lastDay = 29;
          try {
            lunarToSolar(year, month, 30, isLeapMonth);
            lastDay = 30;
          } catch (error) {
            if (!(error instanceof RangeError)) throw error;
          }

          for (const [day, solar] of [
            [1, firstSolar],
            [lastDay, lunarToSolar(year, month, lastDay, isLeapMonth)],
          ] as const) {
            expect(solarToLunar(solar.year, solar.month, solar.day)).toEqual({
              year,
              month,
              day,
              isLeapMonth,
            });
          }
        }
      }
    }
  });
});

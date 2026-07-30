import { describe, expect, test } from 'vitest';
import { getLunarMonthInfo } from '../calendar';

describe('한국 음력 월 정보 공개 API', () => {
  test('평달과 윤달의 일수 및 양력 경계를 함께 반환한다', () => {
    expect(getLunarMonthInfo(2023, 2)).toEqual({
      year: 2023,
      month: 2,
      regular: {
        isLeapMonth: false,
        dayCount: 30,
        firstSolarDate: { year: 2023, month: 2, day: 20 },
        lastSolarDate: { year: 2023, month: 3, day: 21 },
      },
      leap: {
        isLeapMonth: true,
        dayCount: 29,
        firstSolarDate: { year: 2023, month: 3, day: 22 },
        lastSolarDate: { year: 2023, month: 4, day: 19 },
      },
    });
  });

  test('윤달이 없는 달은 leap을 null로 반환한다', () => {
    expect(getLunarMonthInfo(2024, 2)).toEqual({
      year: 2024,
      month: 2,
      regular: {
        isLeapMonth: false,
        dayCount: 30,
        firstSolarDate: { year: 2024, month: 3, day: 10 },
        lastSolarDate: { year: 2024, month: 4, day: 8 },
      },
      leap: null,
    });
  });

  test('지원 범위와 월 번호를 공개 변환 API와 같은 방식으로 검증한다', () => {
    expect(() => getLunarMonthInfo(1390, 12)).toThrow('Lunar year must be from 1391 through 2100');
    expect(() => getLunarMonthInfo(2024, 0)).toThrow('Lunar month must be from 1 through 12');
    expect(() => getLunarMonthInfo(2024, 13)).toThrow('Lunar month must be from 1 through 12');
  });
});

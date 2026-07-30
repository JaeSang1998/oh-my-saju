import { describe, expect, test } from 'vitest';
import { findSolarTermBoundary } from './astronomical-solar-terms';

describe('findSolarTermBoundary', () => {
  test('겉보기 지심 황경 315°로 2024년 입춘 UTC 순간을 독립 계산한다', () => {
    const lichun = findSolarTermBoundary(2024, 2);

    expect(lichun.name).toBe('입춘');
    expect(lichun.longitudeDegrees).toBe(315);
    expect(lichun.engine).toBe('astronomy-engine@2.1.19');
    expect(lichun.epochMilliseconds).toBeGreaterThan(Date.parse('2024-02-04T08:26:00Z'));
    expect(lichun.epochMilliseconds).toBeLessThan(Date.parse('2024-02-04T08:29:00Z'));
    expect(lichun).not.toHaveProperty('reference');
  });

  test.each([
    [0, '2024-01-05T20:49:00.000Z'],
    [2, '2024-02-04T08:27:00.000Z'],
    [4, '2024-03-05T02:23:00.000Z'],
    [6, '2024-04-04T07:02:00.000Z'],
    [8, '2024-05-05T00:10:00.000Z'],
    [10, '2024-06-05T04:10:00.000Z'],
    [12, '2024-07-06T14:20:00.000Z'],
    [14, '2024-08-07T00:09:00.000Z'],
    [16, '2024-09-07T03:11:00.000Z'],
    [18, '2024-10-07T19:00:00.000Z'],
    [20, '2024-11-06T22:20:00.000Z'],
    [22, '2024-12-06T15:17:00.000Z'],
  ] as const)(
    '2024년 절기 index=%i가 일본 국립천문대 분 단위 역서와 60초 이내다',
    (index, officialMinuteUtc) => {
      const actual = findSolarTermBoundary(2024, index).epochMilliseconds;
      expect(Math.abs(actual - Date.parse(officialMinuteUtc))).toBeLessThanOrEqual(60_000);
    },
  );
});

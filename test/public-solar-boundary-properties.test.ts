import { describe, expect, test } from 'vitest';
import { findSolarTermBoundary } from '../src/advanced';
import { calculateSaju } from '../src/index';

const JIE_INDICES = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22] as const;
const QI_INDICES = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23] as const;
const STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const;
const BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'] as const;

function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function cycleIndex(stemIndex: number, branchIndex: number): number {
  for (let index = 0; index < 60; index += 1) {
    if (index % 10 === stemIndex && index % 12 === branchIndex) return index;
  }
  throw new Error(`Invalid sexagenary pair: ${stemIndex}/${branchIndex}`);
}

function pillarName(index: number): string {
  return `${STEMS[index % 10]}${BRANCHES[index % 12]}`;
}

function expectedYearAndMonth(
  sajuYear: number,
  monthNumber: number,
): {
  readonly yearCycleIndex: number;
  readonly monthCycleIndex: number;
  readonly yearName: string;
  readonly monthName: string;
} {
  const yearCycleIndex = mod(sajuYear - 4, 60);
  const yearStemIndex = yearCycleIndex % 10;
  const monthStemIndex = mod(2 * (yearStemIndex % 5) + monthNumber + 1, 10);
  const monthBranchIndex = mod(monthNumber + 1, 12);
  const monthCycleIndex = cycleIndex(monthStemIndex, monthBranchIndex);
  return {
    yearCycleIndex,
    monthCycleIndex,
    yearName: pillarName(yearCycleIndex),
    monthName: pillarName(monthCycleIndex),
  };
}

function calculateAtUtc(epochMilliseconds: number): ReturnType<typeof calculateSaju> {
  const date = new Date(epochMilliseconds);
  return calculateSaju({
    birth: {
      date: {
        calendar: 'gregorian',
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
      },
      time: {
        hour: date.getUTCHours(),
        minute: date.getUTCMinutes(),
        second: date.getUTCSeconds(),
        millisecond: date.getUTCMilliseconds(),
      },
      timeZone: 'UTC',
    },
  });
}

function expectYearAndMonth(
  report: ReturnType<typeof calculateSaju>,
  expected: ReturnType<typeof expectedYearAndMonth>,
  label: string,
): void {
  expect(report.pillars.year.cycleIndex, `${label} year cycle`).toBe(expected.yearCycleIndex);
  expect(report.pillars.year.korean, `${label} year name`).toBe(expected.yearName);
  expect(report.pillars.month.cycleIndex, `${label} month cycle`).toBe(expected.monthCycleIndex);
  expect(report.pillars.month.korean, `${label} month name`).toBe(expected.monthName);
}

describe('calculateSaju public solar-boundary properties', () => {
  test(
    '1801~2100 모든 12절에서 -1ms는 이전 월이고 경계와 +1ms는 새 월이다',
    { timeout: 180_000 },
    () => {
      for (let year = 1801; year <= 2100; year += 1) {
        for (const index of JIE_INDICES) {
          const boundary = findSolarTermBoundary(year, index);
          const before = calculateAtUtc(boundary.epochMilliseconds - 1);
          const exact = calculateAtUtc(boundary.epochMilliseconds);
          const after = calculateAtUtc(boundary.epochMilliseconds + 1);
          const previousMonthNumber = index === 0 ? 11 : index === 2 ? 12 : index / 2 - 1;
          const newMonthNumber = index === 0 ? 12 : index / 2;
          const beforeSajuYear = index === 0 || index === 2 ? year - 1 : year;
          const afterSajuYear = index === 0 ? year - 1 : year;
          const expectedBefore = expectedYearAndMonth(beforeSajuYear, previousMonthNumber);
          const expectedAfter = expectedYearAndMonth(afterSajuYear, newMonthNumber);
          const location = `${year} ${boundary.name}(index=${index})`;

          expectYearAndMonth(before, expectedBefore, `${location} -1ms`);
          expectYearAndMonth(exact, expectedAfter, `${location} exact`);
          expectYearAndMonth(after, expectedAfter, `${location} +1ms`);

          expect(
            before.audit.evidence.monthEnd.epochMilliseconds,
            `${location} previous month end`,
          ).toBe(boundary.epochMilliseconds);
          for (const [point, report] of [
            ['exact', exact],
            ['+1ms', after],
          ] as const) {
            expect(
              report.audit.evidence.monthStart.epochMilliseconds,
              `${location} ${point} month start`,
            ).toBe(boundary.epochMilliseconds);
          }

          if (index === 2) {
            expect(
              before.audit.evidence.lichun.epochMilliseconds,
              `${location} lichun evidence -1ms`,
            ).toBe(boundary.epochMilliseconds);
            expect(
              exact.audit.evidence.lichun.epochMilliseconds,
              `${location} lichun evidence exact`,
            ).toBe(boundary.epochMilliseconds);
          }
        }
      }
    },
  );

  test(
    '1801~2100 모든 12중기에서는 -1ms·경계·+1ms의 연주와 월주가 같다',
    { timeout: 180_000 },
    () => {
      for (let year = 1801; year <= 2100; year += 1) {
        for (const index of QI_INDICES) {
          const boundary = findSolarTermBoundary(year, index);
          const before = calculateAtUtc(boundary.epochMilliseconds - 1);
          const exact = calculateAtUtc(boundary.epochMilliseconds);
          const after = calculateAtUtc(boundary.epochMilliseconds + 1);
          const location = `${year} ${boundary.name}(index=${index})`;

          expect(exact.pillars.year, `${location} exact year`).toEqual(before.pillars.year);
          expect(after.pillars.year, `${location} +1ms year`).toEqual(before.pillars.year);
          expect(exact.pillars.month, `${location} exact month`).toEqual(before.pillars.month);
          expect(after.pillars.month, `${location} +1ms month`).toEqual(before.pillars.month);
        }
      }
    },
  );
});

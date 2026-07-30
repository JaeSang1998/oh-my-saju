import fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import { calculateSaju } from '../src/index';

const DAY_MILLISECONDS = 86_400_000;

const DOCUMENTED_STEMS = [
  { korean: '갑', element: '목', yinYang: '양' },
  { korean: '을', element: '목', yinYang: '음' },
  { korean: '병', element: '화', yinYang: '양' },
  { korean: '정', element: '화', yinYang: '음' },
  { korean: '무', element: '토', yinYang: '양' },
  { korean: '기', element: '토', yinYang: '음' },
  { korean: '경', element: '금', yinYang: '양' },
  { korean: '신', element: '금', yinYang: '음' },
  { korean: '임', element: '수', yinYang: '양' },
  { korean: '계', element: '수', yinYang: '음' },
] as const;

const DOCUMENTED_BRANCHES = [
  { korean: '자', element: '수', yinYang: '양', mainStem: '계' },
  { korean: '축', element: '토', yinYang: '음', mainStem: '기' },
  { korean: '인', element: '목', yinYang: '양', mainStem: '갑' },
  { korean: '묘', element: '목', yinYang: '음', mainStem: '을' },
  { korean: '진', element: '토', yinYang: '양', mainStem: '무' },
  { korean: '사', element: '화', yinYang: '음', mainStem: '병' },
  { korean: '오', element: '화', yinYang: '양', mainStem: '정' },
  { korean: '미', element: '토', yinYang: '음', mainStem: '기' },
  { korean: '신', element: '금', yinYang: '양', mainStem: '경' },
  { korean: '유', element: '금', yinYang: '음', mainStem: '신' },
  { korean: '술', element: '토', yinYang: '양', mainStem: '무' },
  { korean: '해', element: '수', yinYang: '음', mainStem: '임' },
] as const;

const ELEMENTS = ['목', '화', '토', '금', '수'] as const;
const PILLAR_POSITIONS = ['year', 'month', 'day', 'hour'] as const;
const ZI_HOUR_POLICIES = ['civilMidnight', 'splitZi', 'ziStart'] as const;

type DocumentedStem = (typeof DOCUMENTED_STEMS)[number];
type ZiHourPolicy = (typeof ZI_HOUR_POLICIES)[number];

function utcDate(epochMilliseconds: number): {
  readonly year: number;
  readonly month: number;
  readonly day: number;
} {
  const date = new Date(epochMilliseconds);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function calculateAtUtc(
  date: { readonly year: number; readonly month: number; readonly day: number },
  hour: number,
  ziHourPolicy: ZiHourPolicy = 'civilMidnight',
): ReturnType<typeof calculateSaju> {
  return calculateAtUtcTime(date, { hour, minute: 0 }, ziHourPolicy);
}

function calculateAtUtcTime(
  date: { readonly year: number; readonly month: number; readonly day: number },
  time: {
    readonly hour: number;
    readonly minute: number;
    readonly second?: number;
    readonly millisecond?: number;
  },
  ziHourPolicy: ZiHourPolicy = 'civilMidnight',
): ReturnType<typeof calculateSaju> {
  return calculateSaju({
    birth: {
      date: { calendar: 'gregorian', ...date },
      time,
      timeZone: 'UTC',
    },
    rules: { ziHourPolicy },
  });
}

function documentedStem(korean: string): DocumentedStem {
  const fact = DOCUMENTED_STEMS.find((candidate) => candidate.korean === korean);
  if (fact === undefined) throw new Error(`Unknown documented stem: ${korean}`);
  return fact;
}

function documentedBranch(korean: string): (typeof DOCUMENTED_BRANCHES)[number] {
  const fact = DOCUMENTED_BRANCHES.find((candidate) => candidate.korean === korean);
  if (fact === undefined) throw new Error(`Unknown documented branch: ${korean}`);
  return fact;
}

function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function cycleIndex(stemIndex: number, branchIndex: number): number {
  for (let index = 0; index < 60; index += 1) {
    if (index % 10 === stemIndex && index % 12 === branchIndex) return index;
  }
  throw new Error(`Invalid sexagenary pair: ${stemIndex}/${branchIndex}`);
}

function gregorianJdn(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const adjustedYear = year + 4800 - a;
  const adjustedMonth = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * adjustedMonth + 2) / 5) +
    365 * adjustedYear +
    Math.floor(adjustedYear / 4) -
    Math.floor(adjustedYear / 100) +
    Math.floor(adjustedYear / 400) -
    32_045
  );
}

function expectCyclePillar(
  pillar: { readonly cycleIndex: number; readonly korean: string },
  expectedIndex: number,
): void {
  expect(pillar.cycleIndex).toBe(expectedIndex);
  expect(pillar.korean).toBe(
    `${DOCUMENTED_STEMS[expectedIndex % 10]!.korean}${DOCUMENTED_BRANCHES[expectedIndex % 12]!.korean}`,
  );
}

function expectedTenGod(dayMaster: DocumentedStem, target: DocumentedStem): string {
  const dayElementIndex = ELEMENTS.indexOf(dayMaster.element);
  const targetElementIndex = ELEMENTS.indexOf(target.element);
  const samePolarity = dayMaster.yinYang === target.yinYang;

  if (targetElementIndex === dayElementIndex) return samePolarity ? '비견' : '겁재';
  if (targetElementIndex === (dayElementIndex + 1) % 5) {
    return samePolarity ? '식신' : '상관';
  }
  if (targetElementIndex === (dayElementIndex + 2) % 5) {
    return samePolarity ? '편재' : '정재';
  }
  if (targetElementIndex === (dayElementIndex + 3) % 5) {
    return samePolarity ? '편관' : '정관';
  }
  return samePolarity ? '편인' : '정인';
}

describe('calculateSaju public calculation properties', () => {
  test('2000-01-07 정오 UTC의 갑자일부터 60일이 정확한 60갑자 한 주기를 이룬다', () => {
    const anchor = Date.UTC(2000, 0, 7);

    for (let offset = 0; offset < 60; offset += 1) {
      const report = calculateAtUtc(utcDate(anchor + offset * DAY_MILLISECONDS), 12);
      expectCyclePillar(report.pillars.day, offset);
    }
  });

  test(
    '공개 지원 300년 범위의 임의 연속일은 일주가 항상 +1 mod 60이다',
    { timeout: 180_000 },
    () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1801, max: 2100 }),
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 10, max: 14 }),
          (year, month, day) => {
            const current = calculateAtUtc({ year, month, day }, 12).pillars.day;
            const next = calculateAtUtc({ year, month, day: day + 1 }, 12).pillars.day;

            expect(next.cycleIndex).toBe((current.cycleIndex + 1) % 60);
            expectCyclePillar(next, (current.cycleIndex + 1) % 60);
          },
        ),
        { numRuns: 2_000, seed: 20_260_730 },
      );
    },
  );

  test('23:00와 다음날 00:00에서 세 자시 정책의 일주·시주가 각각의 경계를 지킨다', () => {
    const anchorDate = { year: 2000, month: 1, day: 7 } as const;
    const nextDate = { year: 2000, month: 1, day: 8 } as const;
    const at2300 = {
      civilMidnight: { day: 0, hour: 0 },
      splitZi: { day: 0, hour: 12 },
      ziStart: { day: 1, hour: 12 },
    } as const;

    for (const policy of ZI_HOUR_POLICIES) {
      const lateZi = calculateAtUtc(anchorDate, 23, policy);
      expectCyclePillar(lateZi.pillars.day, at2300[policy].day);
      expectCyclePillar(lateZi.pillars.hour, at2300[policy].hour);

      const midnight = calculateAtUtc(nextDate, 0, policy);
      expectCyclePillar(midnight.pillars.day, 1);
      expectCyclePillar(midnight.pillars.hour, 12);
    }
  });

  test('10개 일간 각각에서 12개 시진 지지와 오서둔 시주 천간 공식이 일치한다', () => {
    const anchor = Date.UTC(2000, 0, 7);

    for (let dayStemIndex = 0; dayStemIndex < 10; dayStemIndex += 1) {
      const date = utcDate(anchor + dayStemIndex * DAY_MILLISECONDS);
      for (let branchIndex = 0; branchIndex < 12; branchIndex += 1) {
        const representativeHour = branchIndex === 0 ? 0 : branchIndex * 2;
        const report = calculateAtUtc(date, representativeHour);
        const expectedHourStemIndex = (2 * (dayStemIndex % 5) + branchIndex) % 10;

        expect(report.pillars.day.stem.korean).toBe(DOCUMENTED_STEMS[dayStemIndex]!.korean);
        expect(report.pillars.hour.branch.korean).toBe(DOCUMENTED_BRANCHES[branchIndex]!.korean);
        expect(report.pillars.hour.stem.korean).toBe(
          DOCUMENTED_STEMS[expectedHourStemIndex]!.korean,
        );
        expect(report.pillars.hour.cycleIndex).toBe(cycleIndex(expectedHourStemIndex, branchIndex));
      }
    }
  });

  test('01·03·…·23시의 모든 시진 경계가 -1ms와 exact에서 다음 지지로 바뀐다', () => {
    const date = { year: 2000, month: 1, day: 7 } as const;

    for (let branchIndex = 0; branchIndex < 12; branchIndex += 1) {
      const boundaryHour = branchIndex * 2 + 1;
      const before = calculateAtUtcTime(date, {
        hour: boundaryHour - 1,
        minute: 59,
        second: 59,
        millisecond: 999,
      });
      const exact = calculateAtUtcTime(date, {
        hour: boundaryHour,
        minute: 0,
        second: 0,
        millisecond: 0,
      });
      const nextBranchIndex = (branchIndex + 1) % 12;

      expectCyclePillar(before.pillars.hour, cycleIndex(branchIndex % 10, branchIndex));
      expectCyclePillar(exact.pillars.hour, cycleIndex(nextBranchIndex % 10, nextBranchIndex));
    }
  });

  test.each([
    [1801, 1, 1, 31, '을미'],
    [1900, 2, 28, 8, '임신'],
    [1900, 3, 1, 9, '계유'],
    [2000, 2, 28, 52, '병진'],
    [2000, 2, 29, 53, '정사'],
    [2000, 3, 1, 54, '무오'],
    [2100, 2, 28, 37, '신축'],
    [2100, 3, 1, 38, '임인'],
  ] as const)(
    '%i-%i-%i의 세기 윤년 경계 일주를 고정한다',
    (year, month, day, expectedIndex, expectedName) => {
      const actual = calculateAtUtc({ year, month, day }, 12).pillars.day;
      expect(actual.cycleIndex).toBe(expectedIndex);
      expect(actual.korean).toBe(expectedName);
    },
  );

  test('1801~2100 임의 날짜의 일주가 독립 Gregorian JDN 공식과 일치한다', () => {
    const minimumEpochDay = Math.floor(Date.UTC(1801, 0, 1) / DAY_MILLISECONDS);
    const maximumEpochDay = Math.floor(Date.UTC(2100, 11, 31) / DAY_MILLISECONDS);

    fc.assert(
      fc.property(fc.integer({ min: minimumEpochDay, max: maximumEpochDay }), (epochDay) => {
        const date = utcDate(epochDay * DAY_MILLISECONDS);
        const expectedIndex = mod(gregorianJdn(date.year, date.month, date.day) + 49, 60);
        const actual = calculateAtUtc(date, 12).pillars.day;

        expectCyclePillar(actual, expectedIndex);
      }),
      { numRuns: 1_000, seed: 20_260_731 },
    );
  });

  test('10개 일간 표본의 공개 오행·음양·십신 사실이 독립 생극 공식과 일치한다', () => {
    const anchor = Date.UTC(2000, 0, 7);
    const observedDayMasters = new Set<string>();

    for (let offset = 0; offset < 10; offset += 1) {
      const report = calculateAtUtc(utcDate(anchor + offset * DAY_MILLISECONDS), 12);
      const dayMaster = documentedStem(report.pillars.day.stem.korean);
      observedDayMasters.add(dayMaster.korean);

      expect(report.facts.dayMaster).toEqual(report.pillars.day.stem);

      for (const position of PILLAR_POSITIONS) {
        const pillar = report.pillars[position];
        const stem = documentedStem(pillar.stem.korean);
        const branch = documentedBranch(pillar.branch.korean);

        expect({ element: pillar.stem.element, yinYang: pillar.stem.yinYang }).toEqual({
          element: stem.element,
          yinYang: stem.yinYang,
        });
        expect({ element: pillar.branch.element, yinYang: pillar.branch.yinYang }).toEqual({
          element: branch.element,
          yinYang: branch.yinYang,
        });

        expect(report.facts.tenGods[position].stem).toBe(
          position === 'day' ? '일간' : expectedTenGod(dayMaster, stem),
        );
        expect(report.facts.tenGods[position].branch).toBe(
          expectedTenGod(dayMaster, documentedStem(branch.mainStem)),
        );
      }
    }

    expect(observedDayMasters).toEqual(new Set(DOCUMENTED_STEMS.map(({ korean }) => korean)));
  });
});

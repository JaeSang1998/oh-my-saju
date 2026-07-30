import { describe, expect, test } from 'vitest';
import { isSajuError } from '../errors';
import { calculateSajuTiming, type SajuTimingRequest } from '../timing';
import type { SajuRequest } from '../auditable/types';

const SEOUL_NATAL: SajuRequest = {
  birth: {
    date: { calendar: 'gregorian', year: 1992, month: 10, day: 24 },
    time: { hour: 5, minute: 30 },
    timeZone: 'Asia/Seoul',
  },
};

function addClampedGregorianInterval(
  base: { readonly year: number; readonly month: number; readonly day: number },
  interval: { readonly years: number; readonly months: number; readonly days: number },
): string {
  const absoluteMonth = base.month - 1 + interval.years * 12 + interval.months;
  const targetYear = base.year + Math.floor(absoluteMonth / 12);
  const targetMonthIndex = ((absoluteMonth % 12) + 12) % 12;
  const finalDayOfTargetMonth = new Date(
    Date.UTC(targetYear, targetMonthIndex + 1, 0),
  ).getUTCDate();
  const date = new Date(
    Date.UTC(targetYear, targetMonthIndex, Math.min(base.day, finalDayOfTargetMonth)),
  );
  date.setUTCDate(date.getUTCDate() + interval.days);
  return date.toISOString().slice(0, 10);
}

describe('calculateSajuTiming', () => {
  test('입춘부터 다음 입춘까지 한 사주년과 12개 절월을 감사 가능한 기둥으로 반환한다', () => {
    const report = calculateSajuTiming({
      natalRequest: SEOUL_NATAL,
      fromYear: 2024,
      throughYear: 2024,
    });

    expect(report.schemaVersion).toBe('1');
    expect(report.range).toEqual({
      fromSajuYear: 2024,
      throughSajuYear: 2024,
      yearCount: 1,
    });
    expect(report.natal.pillars.day.korean).toBe('계유');
    expect(report.years).toHaveLength(1);

    const year = report.years[0]!;
    expect(year.sajuYear).toBe(2024);
    expect(year.start).toMatchObject({
      index: 2,
      name: '입춘',
      localDateTime: '2024-02-04T17:26:49.630+09:00',
      timeZone: 'Asia/Seoul',
      offsetSeconds: 32_400,
    });
    expect(year.end).toMatchObject({ index: 2, name: '입춘' });
    expect(year.annualPillar).toMatchObject({
      pillar: { korean: '갑진', hanja: '甲辰' },
      tenGods: { stem: '상관', branch: '정관' },
    });
    expect(year.months).toHaveLength(12);
    expect(year.months.map(({ pillar }) => pillar.korean)).toEqual([
      '병인',
      '정묘',
      '무진',
      '기사',
      '경오',
      '신미',
      '임신',
      '계유',
      '갑술',
      '을해',
      '병자',
      '정축',
    ]);
    expect(year.months[0]).toMatchObject({
      sequence: 1,
      pillar: { korean: '병인', hanja: '丙寅' },
      tenGods: { stem: '정재', branch: '상관' },
    });
    expect(year.months[11]).toMatchObject({
      sequence: 12,
      start: { index: 0, name: '소한' },
      end: { index: 2, name: '입춘' },
    });
    expect(
      year.months.every(
        (month, index) =>
          index === year.months.length - 1 ||
          month.end.epochMilliseconds === year.months[index + 1]!.start.epochMilliseconds,
      ),
    ).toBe(true);
    expect(year.months[0]!.representative.epochMilliseconds).toBe(
      year.months[0]!.start.epochMilliseconds + year.months[0]!.start.uncertaintyMilliseconds + 1,
    );
    expect(report.audit).toMatchObject({
      timingMethod: 'exact-lichun-jie-intervals-v1',
      representativeInstantPolicy: 'boundary-plus-declared-uncertainty-plus-one-millisecond',
      intervalSemantics: '[start,end)',
      luckPillarMethod: null,
    });
    expect(report.luckPillars).toBeNull();
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(year.months)).toBe(true);
    expect(() => JSON.parse(JSON.stringify(report))).not.toThrow();
  });

  test('성별이 있으면 감사된 출생 순간에서 대운을 계산하고 시작일을 근사값으로 표시한다', () => {
    const withoutGender = calculateSajuTiming({
      natalRequest: SEOUL_NATAL,
      fromYear: 2024,
      throughYear: 2024,
    });
    const withGender = calculateSajuTiming({
      natalRequest: SEOUL_NATAL,
      fromYear: 2024,
      throughYear: 2024,
      gender: 'male',
    });

    expect(withoutGender.luckPillars).toBeNull();
    expect(withGender.luckPillars).toMatchObject({
      gender: 'male',
      forward: true,
      startAge: 5,
      startOffset: { years: 4, months: 9, days: 7 },
    });
    expect(withGender.luckPillars?.pillars[0]).toMatchObject({
      age: 5,
      pillar: { korean: '신해', hanja: '辛亥' },
      approximateStartDate: {
        date: '1997-07-31',
        qualifier: 'approximate',
        method: 'three-days-one-year',
      },
    });
    expect(withGender.audit.luckPillarMethod).toBe('three-days-one-year-v1');
  });

  test('요청한 개수만큼 대운을 반환하고 각 대운의 일간 기준 십신을 붙인다', () => {
    const report = calculateSajuTiming({
      natalRequest: SEOUL_NATAL,
      fromYear: 2024,
      throughYear: 2024,
      gender: 'male',
      luckPillarCount: 3,
    });

    expect(report.luckPillars?.pillars).toHaveLength(3);
    expect(report.luckPillars?.pillars).toMatchObject([
      {
        pillar: { korean: '신해' },
        tenGods: { stem: '편인', branch: '겁재' },
      },
      {
        pillar: { korean: '임자' },
        tenGods: { stem: '겁재', branch: '비견' },
      },
      {
        pillar: { korean: '계축' },
        tenGods: { stem: '비견', branch: '편관' },
      },
    ]);
  });

  test.each([
    { year: 2001, month: 1, day: 29 },
    { year: 2001, month: 1, day: 30 },
    { year: 2001, month: 1, day: 31 },
    { year: 2000, month: 2, day: 29 },
  ] as const)(
    '월말 출생 $year-$month-$day의 대운 근사일은 년·월을 월말 보정한 뒤 일수를 더한다',
    (birthDate) => {
      const report = calculateSajuTiming({
        natalRequest: {
          birth: {
            date: { calendar: 'gregorian', ...birthDate },
            time: { hour: 12, minute: 0 },
            timeZone: 'UTC',
          },
        },
        fromYear: 2024,
        throughYear: 2024,
        gender: 'male',
      });
      const luckPillars = report.luckPillars;
      expect(luckPillars).not.toBeNull();

      expect(luckPillars!.pillars[0]!.approximateStartDate.date).toBe(
        addClampedGregorianInterval(birthDate, luckPillars!.startOffset),
      );
    },
  );

  test.each([
    { fromYear: 1799, throughYear: 2024 },
    { fromYear: 2024, throughYear: 2300 },
    { fromYear: 2025, throughYear: 2024 },
    { fromYear: 2000, throughYear: 2021 },
    { fromYear: 2024.5, throughYear: 2025 },
  ])('지원하지 않는 timing 범위 $fromYear..$throughYear를 거부한다', (range) => {
    try {
      calculateSajuTiming({
        natalRequest: SEOUL_NATAL,
        ...range,
      } as SajuTimingRequest);
      throw new Error('expected calculateSajuTiming to reject the range');
    } catch (error) {
      expect(isSajuError(error)).toBe(true);
      expect(error).toMatchObject({ code: 'UNSUPPORTED_DATE_RANGE' });
    }
  });

  test.each([
    { gender: 'male' as const, luckPillarCount: 0 },
    { gender: 'female' as const, luckPillarCount: 121 },
    { luckPillarCount: 3 },
  ])('잘못된 대운 개수 옵션 $luckPillarCount를 거부한다', (options) => {
    try {
      calculateSajuTiming({
        natalRequest: SEOUL_NATAL,
        fromYear: 2024,
        throughYear: 2024,
        ...options,
      });
      throw new Error('expected calculateSajuTiming to reject luckPillarCount');
    } catch (error) {
      expect(isSajuError(error)).toBe(true);
      expect(error).toMatchObject({ code: 'INVALID_REQUEST' });
    }
  });

  test('생시 미상·범위 요청은 exact timing seam에서 거부한다', () => {
    try {
      calculateSajuTiming({
        natalRequest: {
          birth: {
            date: { calendar: 'gregorian', year: 1992, month: 10, day: 24 },
            time: { kind: 'unknown' },
            timeZone: 'Asia/Seoul',
          },
        } as unknown as SajuRequest,
        fromYear: 2024,
        throughYear: 2024,
      });
      throw new Error('expected calculateSajuTiming to reject an unknown birth time');
    } catch (error) {
      expect(isSajuError(error)).toBe(true);
    }
  });

  test('지원 범위의 양 끝 1800년과 2299년 사주년을 계산한다', () => {
    const first = calculateSajuTiming({
      natalRequest: SEOUL_NATAL,
      fromYear: 1800,
      throughYear: 1800,
    });
    const last = calculateSajuTiming({
      natalRequest: SEOUL_NATAL,
      fromYear: 2299,
      throughYear: 2299,
    });

    expect(first.years[0]).toMatchObject({
      sajuYear: 1800,
      annualPillar: { pillar: { korean: '경신' } },
    });
    expect(last.years[0]).toMatchObject({
      sajuYear: 2299,
      annualPillar: { pillar: { korean: '기묘' } },
    });
    expect(first.years[0]?.months).toHaveLength(12);
    expect(last.years[0]?.months).toHaveLength(12);
  });

  test('절입 순간을 출생 요청의 IANA 시간대로 표시한다', () => {
    const report = calculateSajuTiming({
      natalRequest: {
        birth: {
          date: { calendar: 'gregorian', year: 1992, month: 10, day: 24 },
          time: { hour: 5, minute: 30 },
          timeZone: 'America/New_York',
        },
      },
      fromYear: 2024,
      throughYear: 2024,
    });

    expect(report.years[0]?.start).toMatchObject({
      instantUtc: '2024-02-04T08:26:49.630Z',
      localDateTime: '2024-02-04T03:26:49.630-05:00',
      timeZone: 'America/New_York',
      offsetSeconds: -18_000,
    });
  });
});

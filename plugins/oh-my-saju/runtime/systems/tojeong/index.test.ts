import { describe, expect, test } from 'vitest';
import { calculateTojeong144 } from './index';

const CONVENTIONS = {
  profileId: 'tojeong-number-144',
  profileVersion: '1.0.0',
  countingAge: 'target-year-minus-normalized-lunar-birth-year-plus-one',
  targetDate: 'same-regular-korean-lunar-month-and-day',
  yearBoundary: 'explicit-target-year',
  monthGanzhi: 'target-lunar-month-number',
} as const;

describe('calculateTojeong144', () => {
  test('reproduces the 2023 age-31 lunar 3/8 worked oracle as code 663', () => {
    const report = calculateTojeong144({
      kind: 'tojeong-144',
      sajuRequest: {
        birth: {
          date: {
            calendar: 'korean-lunar',
            year: 1993,
            month: 3,
            day: 8,
            monthKind: 'regular',
          },
          time: { hour: 12, minute: 0 },
          timeZone: 'Asia/Seoul',
        },
        rules: {
          ziHourPolicy: 'civilMidnight',
          dayHourClock: { kind: 'civil' },
        },
      },
      targetYear: 2023,
      conventions: CONVENTIONS,
    });

    expect(report.value).toMatchObject({
      upper: 6,
      middle: 6,
      lower: 3,
      code: 663,
      calendarFacts: {
        normalizedBirthLunarDate: {
          calendar: 'korean-lunar',
          year: 1993,
          month: 3,
          day: 8,
          monthKind: 'regular',
        },
        countingAgeInTargetYear: 31,
        targetLunarDate: {
          calendar: 'korean-lunar',
          year: 2023,
          month: 3,
          day: 8,
          monthKind: 'regular',
        },
        targetGregorianDate: {
          calendar: 'gregorian',
          year: 2023,
          month: 4,
          day: 27,
        },
        targetLunarMonthDays: 30,
        targetYearGanzhi: { korean: '계묘', hanja: '癸卯' },
        targetMonthGanzhi: { korean: '병진', hanja: '丙辰' },
        targetDayGanzhi: { korean: '을묘', hanja: '乙卯' },
      },
      numberTableDigest: expect.stringMatching(/^sha256:[a-f0-9]{64}$/u),
    });
    expect(report.audit.trace.formulas).toEqual({
      upper: {
        tableKind: 'taese',
        stemNumber: 6,
        branchNumber: 9,
        ganzhiNumber: 15,
        calendarValue: 31,
        sum: 46,
        divisor: 8,
        rawRemainder: 6,
        normalizedResidue: 6,
      },
      middle: {
        tableKind: 'wolgeon',
        stemNumber: 8,
        branchNumber: 4,
        ganzhiNumber: 12,
        calendarValue: 30,
        sum: 42,
        divisor: 6,
        rawRemainder: 0,
        normalizedResidue: 6,
      },
      lower: {
        tableKind: 'iljin',
        stemNumber: 9,
        branchNumber: 7,
        ganzhiNumber: 16,
        calendarValue: 8,
        sum: 24,
        divisor: 3,
        rawRemainder: 0,
        normalizedResidue: 3,
      },
    });
    expect(report.audit.trace.ganzhiDerivation).toEqual({
      targetYear: {
        targetYear: 2023,
        cycleIndex: 39,
        cycleAnchor: '4-甲子',
      },
      targetMonth: {
        yearStemIndex: 9,
        lunarMonth: 3,
        stemIndex: 2,
        branchIndex: 4,
        formula: 'stem=2*(yearStemIndex mod 5)+lunarMonth+1; branch=lunarMonth+1',
      },
      targetDay: {
        cycleIndex: 51,
        source: 'saju-engine-civil-midnight-day-pillar',
      },
    });
  });

  test('applies the primary-source 甲午 taese unit example and zero-safe residue rule', () => {
    const report = calculateTojeong144({
      kind: 'tojeong-144',
      sajuRequest: {
        birth: {
          date: {
            calendar: 'korean-lunar',
            year: 1977,
            month: 3,
            day: 8,
            monthKind: 'regular',
          },
          time: { hour: 12, minute: 0 },
          timeZone: 'Asia/Seoul',
        },
      },
      targetYear: 2014,
      conventions: CONVENTIONS,
    });

    expect(report.audit.trace.formulas.upper).toEqual({
      tableKind: 'taese',
      stemNumber: 10,
      branchNumber: 8,
      ganzhiNumber: 18,
      calendarValue: 38,
      sum: 56,
      divisor: 8,
      rawRemainder: 0,
      normalizedResidue: 8,
    });
  });

  test('rejects a birth normalized to a leap month without inventing a mapping policy', () => {
    expect(() =>
      calculateTojeong144({
        kind: 'tojeong-144',
        sajuRequest: {
          birth: {
            date: {
              calendar: 'korean-lunar',
              year: 2023,
              month: 2,
              day: 1,
              monthKind: 'leap',
            },
            time: { hour: 12, minute: 0 },
            timeZone: 'Asia/Seoul',
          },
        },
        targetYear: 2024,
        conventions: CONVENTIONS,
      }),
    ).toThrowError(
      expect.objectContaining({
        code: 'MISSING_EXPLICIT_POLICY',
        path: ['sajuRequest', 'birth', 'date'],
      }),
    );
  });

  test('rejects lunar day 30 when the target regular lunar month has only 29 days', () => {
    expect(() =>
      calculateTojeong144({
        kind: 'tojeong-144',
        sajuRequest: {
          birth: {
            date: {
              calendar: 'korean-lunar',
              year: 2023,
              month: 3,
              day: 30,
              monthKind: 'regular',
            },
            time: { hour: 12, minute: 0 },
            timeZone: 'Asia/Seoul',
          },
        },
        targetYear: 2024,
        conventions: CONVENTIONS,
      }),
    ).toThrowError(
      expect.objectContaining({
        code: 'UNSUPPORTED_SYSTEM_DATE',
        path: ['targetYear'],
        details: expect.objectContaining({
          targetLunarMonth: 3,
          targetLunarDay: 30,
          targetLunarMonthDays: 29,
          implicitRepairApplied: false,
        }),
      }),
    );
  });

  test('returns a deeply frozen JSON-safe audit with no interpretation corpus', () => {
    const report = calculateTojeong144({
      kind: 'tojeong-144',
      sajuRequest: {
        birth: {
          date: {
            calendar: 'korean-lunar',
            year: 1993,
            month: 3,
            day: 8,
            monthKind: 'regular',
          },
          time: { hour: 12, minute: 0 },
          timeZone: 'Asia/Seoul',
        },
      },
      targetYear: 2023,
      conventions: CONVENTIONS,
    });

    expect(report.audit).toMatchObject({
      module: { id: 'tojeong-144', version: '1.0.0', schemaVersion: '1' },
      profile: { id: 'tojeong-number-144', version: '1.0.0' },
      implementation: 'oh-my-saju-independent',
      implicitAdjustments: [],
      predictiveValidity: 'not-established',
      interpretationScope: 'calculation-and-classical-classification-only',
    });
    expect(report.value.interpretations).toEqual([]);
    expect(report.audit.limitations.map(({ id }) => id)).toEqual(
      expect.arrayContaining([
        'counting-age-lunar-year-convention',
        'month-ganzhi-lunar-number-convention',
        'interpretation-corpus-not-shipped',
      ]),
    );
    expect(report.audit.policies).toContainEqual({
      id: 'target-day-pillar-clock',
      version: '1.0.0',
      value: 'Asia/Seoul-local-civil-noon-with-civil-midnight-day-boundary',
    });
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.audit.trace.formulas.upper)).toBe(true);
    expect(JSON.parse(JSON.stringify(report))).toEqual(report);
  });

  test('normalizes an exact Gregorian birth through saju-engine before selecting lunar facts', () => {
    const report = calculateTojeong144({
      kind: 'tojeong-144',
      sajuRequest: {
        birth: {
          date: { calendar: 'gregorian', year: 1993, month: 3, day: 30 },
          time: { hour: 12, minute: 0 },
          timeZone: 'Asia/Seoul',
        },
      },
      targetYear: 2023,
      conventions: CONVENTIONS,
    });

    expect(report.value).toMatchObject({
      code: 663,
      calendarFacts: {
        inputBirthDate: { calendar: 'gregorian', year: 1993, month: 3, day: 30 },
        normalizedBirthLunarDate: {
          calendar: 'korean-lunar',
          year: 1993,
          month: 3,
          day: 8,
          monthKind: 'regular',
        },
      },
    });
  });

  test('makes normalized lunar birth year—not Gregorian year—the explicit counting-age input', () => {
    const report = calculateTojeong144({
      kind: 'tojeong-144',
      sajuRequest: {
        birth: {
          date: { calendar: 'gregorian', year: 2000, month: 1, day: 1 },
          time: { hour: 12, minute: 0 },
          timeZone: 'Asia/Seoul',
        },
      },
      targetYear: 2001,
      conventions: CONVENTIONS,
    });

    expect(report.value.calendarFacts).toMatchObject({
      inputBirthDate: { calendar: 'gregorian', year: 2000, month: 1, day: 1 },
      normalizedBirthLunarDate: { year: 1999 },
      countingAgeInTargetYear: 3,
    });
  });

  test('accepts the lunar birth year as age one and rejects a preceding target year', () => {
    const sameYear = calculateTojeong144({
      kind: 'tojeong-144',
      sajuRequest: {
        birth: {
          date: {
            calendar: 'korean-lunar',
            year: 2020,
            month: 1,
            day: 1,
            monthKind: 'regular',
          },
          time: { hour: 12, minute: 0 },
          timeZone: 'Asia/Seoul',
        },
      },
      targetYear: 2020,
      conventions: CONVENTIONS,
    });
    expect(sameYear.value.calendarFacts.countingAgeInTargetYear).toBe(1);

    expect(() =>
      calculateTojeong144({
        kind: 'tojeong-144',
        sajuRequest: {
          birth: {
            date: {
              calendar: 'korean-lunar',
              year: 2020,
              month: 1,
              day: 1,
              monthKind: 'regular',
            },
            time: { hour: 12, minute: 0 },
            timeZone: 'Asia/Seoul',
          },
        },
        targetYear: 2019,
        conventions: CONVENTIONS,
      }),
    ).toThrowError(
      expect.objectContaining({
        code: 'INVALID_SYSTEM_INPUT',
        path: ['targetYear'],
      }),
    );
  });

  test('rejects unknown kind, profile, and calendar-dataset boundary inputs', () => {
    expect(() =>
      calculateTojeong144({
        kind: 'tojeong',
        sajuRequest: {
          birth: {
            date: {
              calendar: 'korean-lunar',
              year: 2000,
              month: 1,
              day: 1,
              monthKind: 'regular',
            },
            time: { hour: 12, minute: 0 },
            timeZone: 'Asia/Seoul',
          },
        },
        targetYear: 2023,
        conventions: CONVENTIONS,
      } as never),
    ).toThrowError(
      expect.objectContaining({
        code: 'INVALID_SYSTEM_INPUT',
        path: ['kind'],
      }),
    );
    expect(() =>
      calculateTojeong144({
        kind: 'tojeong-144',
        sajuRequest: {
          birth: {
            date: {
              calendar: 'korean-lunar',
              year: 2000,
              month: 1,
              day: 1,
              monthKind: 'regular',
            },
            time: { hour: 12, minute: 0 },
            timeZone: 'Asia/Seoul',
          },
        },
        targetYear: 2023,
        conventions: { ...CONVENTIONS, profileVersion: '9.0.0' },
      } as never),
    ).toThrowError(
      expect.objectContaining({
        code: 'UNSUPPORTED_SYSTEM_PROFILE',
        path: ['conventions'],
      }),
    );
    expect(() =>
      calculateTojeong144({
        kind: 'tojeong-144',
        sajuRequest: {
          birth: {
            date: {
              calendar: 'korean-lunar',
              year: 2000,
              month: 1,
              day: 1,
              monthKind: 'regular',
            },
            time: { hour: 12, minute: 0 },
            timeZone: 'Asia/Seoul',
          },
        },
        targetYear: 2101,
        conventions: CONVENTIONS,
      }),
    ).toThrowError(
      expect.objectContaining({
        code: 'UNSUPPORTED_SYSTEM_DATE',
        path: ['targetYear'],
      }),
    );
  });
});

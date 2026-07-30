import { describe, expect, expectTypeOf, test } from 'vitest';
import { calculateZiweiChart, locateZiweiStar } from './index';
import type { ZiweiRequest } from './types';

const PROFILE = {
  id: 'ziwei-quanshu-core' as const,
  version: '1.0.0' as const,
  leapMonthPolicy: 'whole-leap-as-next-month' as const,
  birthYearBoundary: 'lunar-new-year' as const,
};

function request(hour: number, minute: number): ZiweiRequest {
  return {
    kind: 'ziwei' as const,
    subject: {
      birth: {
        date: {
          calendar: 'korean-lunar' as const,
          year: 2000,
          month: 1,
          day: 1,
          monthKind: 'regular' as const,
        },
        time: { hour, minute },
        timeZone: 'Asia/Seoul',
      },
      rules: {
        ziHourPolicy: 'civilMidnight',
        dayHourClock: { kind: 'civil' },
      },
    },
    profile: PROFILE,
  };
}

describe('calculateZiweiChart', () => {
  test('원전의 정월 子·丑시 명궁·신궁 예를 재현한다', () => {
    const ziHour = calculateZiweiChart(request(0, 30));
    const chouHour = calculateZiweiChart(request(1, 30));

    expect(ziHour.value).toMatchObject({
      lifePalaceBranch: '인',
      bodyPalaceBranch: '인',
    });
    expect(chouHour.value).toMatchObject({
      lifePalaceBranch: '축',
      bodyPalaceBranch: '묘',
    });
  });

  test('오행국 5종 × 음력 30일의 자미 위치가 항상 12궁 안에서 끝난다', () => {
    for (const bureauNumber of [2, 3, 4, 5, 6] as const) {
      for (let lunarDay = 1; lunarDay <= 30; lunarDay += 1) {
        const location = locateZiweiStar(bureauNumber, lunarDay);
        expect(location.index).toBeGreaterThanOrEqual(0);
        expect(location.index).toBeLessThan(12);
      }
    }
    expect(locateZiweiStar(6, 1)).toMatchObject({ branch: '유' });
    expect(locateZiweiStar(3, 27)).toMatchObject({ branch: '술' });
    expect(locateZiweiStar(6, 13)).toMatchObject({ branch: '해' });
    expect(locateZiweiStar(5, 6)).toMatchObject({ branch: '미' });
  });

  test('12궁과 14주성을 중복 누락 없이 배치하고 전체 trace를 동결한다', () => {
    const report = calculateZiweiChart(request(0, 30));

    expect(report.value.palaces).toHaveLength(12);
    expect(report.value.mainStars).toHaveLength(14);
    expect(new Set(report.value.mainStars.map(({ name }) => name)).size).toBe(14);
    expect(report.value.palaces.flatMap(({ mainStars }) => mainStars)).toHaveLength(14);
    expectTypeOf(report.kind).toEqualTypeOf<'ziwei'>();
    expect(report.audit).toMatchObject({
      module: { id: 'ziwei', version: '1.0.0' },
      profile: { id: 'ziwei-quanshu-core', version: '1.0.0' },
      implementation: 'oh-my-saju-independent',
      predictiveValidity: 'not-established',
      implicitAdjustments: [],
    });
    expect(report.audit.policies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'saju.zi-hour-policy',
          value: 'civilMidnight',
        }),
        expect.objectContaining({
          id: 'saju.day-hour-clock',
          value: 'civil',
        }),
      ]),
    );
    expect(report.audit.trace.normalizedChronology).toMatchObject({
      inputDate: {
        calendar: 'korean-lunar',
        year: 2000,
        month: 1,
        day: 1,
        monthKind: 'regular',
      },
      gregorianDate: {
        calendar: 'gregorian',
      },
      koreanLunarDate: {
        calendar: 'korean-lunar',
        year: 2000,
        month: 1,
        day: 1,
        monthKind: 'regular',
      },
      civilDateTime: '2000-02-05T00:30:00.000',
      instantUtc: '2000-02-04T15:30:00.000Z',
      timeZone: 'Asia/Seoul',
      offsetSeconds: 32_400,
      effectiveDay: '2000-02-05',
      dayHourDateTime: '2000-02-05T00:30:00.000',
      dayHourClock: 'civil',
    });
    expect(
      report.audit.profile.sources.every(
        ({ editionOrSnapshot }) => editionOrSnapshot.trim().length > 0,
      ),
    ).toBe(true);
    expect(Object.isFrozen(report)).toBe(true);
  });

  test.each([
    ['ziHourPolicy', { dayHourClock: { kind: 'civil' as const } }],
    ['dayHourClock', { ziHourPolicy: 'civilMidnight' as const }],
  ] as const)('subject.rules.%s 누락을 기본값으로 메우지 않는다', (missingPolicy, rules) => {
    const explicit = request(0, 30);
    expect(() =>
      calculateZiweiChart({
        ...explicit,
        subject: { ...explicit.subject, rules } as never,
      }),
    ).toThrowError(
      expect.objectContaining({
        code: 'MISSING_EXPLICIT_POLICY',
        path: ['subject', 'rules', missingPolicy],
      }),
    );
  });

  test('지원하지 않는 학파 정책을 암묵 보정하지 않는다', () => {
    expect(() =>
      calculateZiweiChart({
        ...request(0, 30),
        profile: { ...PROFILE, leapMonthPolicy: 'split-at-fifteen' as never },
      }),
    ).toThrow(/leapMonthPolicy/u);
  });
});

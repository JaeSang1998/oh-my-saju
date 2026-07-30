import { describe, expect, test } from 'vitest';
import { runTraditionalSystem } from './registry';
import type { TraditionalSystemRequest } from './types';

const EXACT_SUBJECT = {
  birth: {
    date: { calendar: 'gregorian' as const, year: 1996, month: 5, day: 27 },
    time: { hour: 6, minute: 50 },
    timeZone: 'Asia/Seoul',
  },
  rules: {
    ziHourPolicy: 'civilMidnight' as const,
    dayHourClock: { kind: 'civil' as const },
  },
};

describe('runTraditionalSystem', () => {
  test('닫힌 레지스트리의 다섯 수직 모듈을 kind로 실행한다', () => {
    const requests = [
      {
        kind: 'election',
        eventType: 'daily',
        dateRange: {
          start: { calendar: 'gregorian', year: 2026, month: 1, day: 1 },
          endInclusive: { calendar: 'gregorian', year: 2026, month: 1, day: 1 },
        },
        timeZone: 'Asia/Seoul',
        representativeInstantPolicy: 'local-civil-noon',
        rankingPolicy: { id: 'oh-my-saju-election-ranking', version: '1.0.0' },
        participants: [{ id: 'subject-a', natalRequest: EXACT_SUBJECT }],
      },
      {
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
        conventions: {
          profileId: 'tojeong-number-144',
          profileVersion: '1.0.0',
          countingAge: 'target-year-minus-normalized-lunar-birth-year-plus-one',
          targetDate: 'same-regular-korean-lunar-month-and-day',
          yearBoundary: 'explicit-target-year',
          monthGanzhi: 'target-lunar-month-number',
        },
      },
      {
        kind: 'iching',
        method: 'manual-lines',
        lines: [9, 7, 7, 7, 7, 7],
      },
      {
        kind: 'ziwei',
        subject: {
          birth: {
            date: {
              calendar: 'korean-lunar',
              year: 2000,
              month: 1,
              day: 1,
              monthKind: 'regular',
            },
            time: { hour: 0, minute: 30 },
            timeZone: 'Asia/Seoul',
          },
          rules: {
            ziHourPolicy: 'civilMidnight',
            dayHourClock: { kind: 'civil' },
          },
        },
        profile: {
          id: 'ziwei-quanshu-core',
          version: '1.0.0',
          leapMonthPolicy: 'whole-leap-as-next-month',
          birthYearBoundary: 'lunar-new-year',
        },
      },
      {
        kind: 'liuren',
        subject: EXACT_SUBJECT,
        profile: {
          id: 'liuren-quanshu-nine-gates',
          version: '1.0.0',
          monthGeneralBoundary: 'middle-qi-instant-inclusive',
          shehaiTieBreak: 'depth-then-season-position-then-day-side',
        },
      },
    ] as const;

    expect(requests.map((request) => runTraditionalSystem(request).kind)).toEqual([
      'election',
      'tojeong-144',
      'iching',
      'ziwei',
      'liuren',
    ]);
  });

  test('알 수 없는 kind를 다른 시스템으로 추측하지 않는다', () => {
    expect(() =>
      runTraditionalSystem({ kind: 'tarot' } as unknown as TraditionalSystemRequest),
    ).toThrowError(
      expect.objectContaining({
        code: 'INVALID_SYSTEM_INPUT',
        path: ['request', 'kind'],
      }),
    );
  });
});

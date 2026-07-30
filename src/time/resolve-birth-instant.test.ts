import { describe, expect, test } from 'vitest';
import { SajuError } from '../errors';
import { resolveBirthInstant, type LocalDateTime } from './resolve-birth-instant';

interface SeoulDstTransition {
  readonly instantUtc: string;
  readonly beforeOffsetSeconds: number;
  readonly afterOffsetSeconds: number;
}

const SEOUL_DST_TRANSITIONS: readonly SeoulDstTransition[] = [
  {
    instantUtc: '1948-05-31T15:00:00.000Z',
    beforeOffsetSeconds: 32_400,
    afterOffsetSeconds: 36_000,
  },
  {
    instantUtc: '1948-09-12T14:00:00.000Z',
    beforeOffsetSeconds: 36_000,
    afterOffsetSeconds: 32_400,
  },
  {
    instantUtc: '1949-04-02T15:00:00.000Z',
    beforeOffsetSeconds: 32_400,
    afterOffsetSeconds: 36_000,
  },
  {
    instantUtc: '1949-09-10T14:00:00.000Z',
    beforeOffsetSeconds: 36_000,
    afterOffsetSeconds: 32_400,
  },
  {
    instantUtc: '1950-03-31T15:00:00.000Z',
    beforeOffsetSeconds: 32_400,
    afterOffsetSeconds: 36_000,
  },
  {
    instantUtc: '1950-09-09T14:00:00.000Z',
    beforeOffsetSeconds: 36_000,
    afterOffsetSeconds: 32_400,
  },
  {
    instantUtc: '1951-05-05T15:00:00.000Z',
    beforeOffsetSeconds: 32_400,
    afterOffsetSeconds: 36_000,
  },
  {
    instantUtc: '1951-09-08T14:00:00.000Z',
    beforeOffsetSeconds: 36_000,
    afterOffsetSeconds: 32_400,
  },
  {
    instantUtc: '1955-05-04T15:30:00.000Z',
    beforeOffsetSeconds: 30_600,
    afterOffsetSeconds: 34_200,
  },
  {
    instantUtc: '1955-09-08T14:30:00.000Z',
    beforeOffsetSeconds: 34_200,
    afterOffsetSeconds: 30_600,
  },
  {
    instantUtc: '1956-05-19T15:30:00.000Z',
    beforeOffsetSeconds: 30_600,
    afterOffsetSeconds: 34_200,
  },
  {
    instantUtc: '1956-09-29T14:30:00.000Z',
    beforeOffsetSeconds: 34_200,
    afterOffsetSeconds: 30_600,
  },
  {
    instantUtc: '1957-05-04T15:30:00.000Z',
    beforeOffsetSeconds: 30_600,
    afterOffsetSeconds: 34_200,
  },
  {
    instantUtc: '1957-09-21T14:30:00.000Z',
    beforeOffsetSeconds: 34_200,
    afterOffsetSeconds: 30_600,
  },
  {
    instantUtc: '1958-05-03T15:30:00.000Z',
    beforeOffsetSeconds: 30_600,
    afterOffsetSeconds: 34_200,
  },
  {
    instantUtc: '1958-09-20T14:30:00.000Z',
    beforeOffsetSeconds: 34_200,
    afterOffsetSeconds: 30_600,
  },
  {
    instantUtc: '1959-05-02T15:30:00.000Z',
    beforeOffsetSeconds: 30_600,
    afterOffsetSeconds: 34_200,
  },
  {
    instantUtc: '1959-09-19T14:30:00.000Z',
    beforeOffsetSeconds: 34_200,
    afterOffsetSeconds: 30_600,
  },
  {
    instantUtc: '1960-04-30T15:30:00.000Z',
    beforeOffsetSeconds: 30_600,
    afterOffsetSeconds: 34_200,
  },
  {
    instantUtc: '1960-09-17T14:30:00.000Z',
    beforeOffsetSeconds: 34_200,
    afterOffsetSeconds: 30_600,
  },
  {
    instantUtc: '1987-05-09T17:00:00.000Z',
    beforeOffsetSeconds: 32_400,
    afterOffsetSeconds: 36_000,
  },
  {
    instantUtc: '1987-10-10T17:00:00.000Z',
    beforeOffsetSeconds: 36_000,
    afterOffsetSeconds: 32_400,
  },
  {
    instantUtc: '1988-05-07T17:00:00.000Z',
    beforeOffsetSeconds: 32_400,
    afterOffsetSeconds: 36_000,
  },
  {
    instantUtc: '1988-10-08T17:00:00.000Z',
    beforeOffsetSeconds: 36_000,
    afterOffsetSeconds: 32_400,
  },
];

function fieldsFromNaiveEpoch(epochMilliseconds: number): LocalDateTime {
  const date = new Date(epochMilliseconds);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
    millisecond: date.getUTCMilliseconds(),
  };
}

function localFields(epochMilliseconds: number, offsetSeconds: number): LocalDateTime {
  return fieldsFromNaiveEpoch(epochMilliseconds + offsetSeconds * 1_000);
}

describe('resolveBirthInstant', () => {
  test('Asia/Seoul 벽시계를 고정 IANA 데이터로 UTC 순간과 오프셋으로 해석한다', () => {
    const resolved = resolveBirthInstant({
      localDateTime: {
        year: 1988,
        month: 7,
        day: 1,
        hour: 12,
        minute: 0,
        second: 0,
        millisecond: 0,
      },
      timeZone: 'Asia/Seoul',
      disambiguation: 'reject',
    });

    expect(resolved).toEqual({
      instantUtc: '1988-07-01T02:00:00.000Z',
      epochMilliseconds: Date.UTC(1988, 6, 1, 2),
      timeZone: 'Asia/Seoul',
      offsetSeconds: 36_000,
      abbreviation: 'KDT',
      daylightSaving: {
        representation: 'iana-tzif-isdst-with-derived-save',
        isDaylightSavingTime: true,
        offsetSeconds: 3_600,
      },
      disambiguation: 'exact',
      timezoneEngine: 'moment-timezone@0.6.3',
      tzdbVersion: '2026c',
    });
  });

  test('DST로 존재하지 않는 벽시계 시각을 자동 이동하지 않고 거부한다', () => {
    expect(() =>
      resolveBirthInstant({
        localDateTime: {
          year: 1988,
          month: 5,
          day: 8,
          hour: 2,
          minute: 30,
          second: 0,
          millisecond: 0,
        },
        timeZone: 'Asia/Seoul',
      }),
    ).toThrow(
      expect.objectContaining<Partial<SajuError>>({
        code: 'NONEXISTENT_LOCAL_TIME',
      }),
    );
  });

  test('DST 중복 시각은 기본 거부하고 earlier/later를 명시하면 두 실제 순간을 구분한다', () => {
    const localDateTime = {
      year: 1988,
      month: 10,
      day: 9,
      hour: 2,
      minute: 30,
      second: 0,
      millisecond: 0,
    };

    expect(() => resolveBirthInstant({ localDateTime, timeZone: 'Asia/Seoul' })).toThrow(
      expect.objectContaining<Partial<SajuError>>({
        code: 'AMBIGUOUS_LOCAL_TIME',
      }),
    );

    const earlier = resolveBirthInstant({
      localDateTime,
      timeZone: 'Asia/Seoul',
      disambiguation: 'earlier',
    });
    const later = resolveBirthInstant({
      localDateTime,
      timeZone: 'Asia/Seoul',
      disambiguation: 'later',
    });

    expect(earlier.instantUtc).toBe('1988-10-08T16:30:00.000Z');
    expect(earlier.offsetSeconds).toBe(36_000);
    expect(earlier.disambiguation).toBe('earlier');
    expect(later.instantUtc).toBe('1988-10-08T17:30:00.000Z');
    expect(later.offsetSeconds).toBe(32_400);
    expect(later.disambiguation).toBe('later');
    expect(earlier.daylightSaving).toMatchObject({
      isDaylightSavingTime: true,
      offsetSeconds: 3_600,
    });
    expect(later.daylightSaving).toMatchObject({
      isDaylightSavingTime: false,
      offsetSeconds: 0,
    });
  });

  test('TZif의 음수·0초 DST save와 isdst 상태를 총 오프셋과 별개로 보존한다', () => {
    const dublinWinter = resolveBirthInstant({
      localDateTime: {
        year: 2024,
        month: 1,
        day: 15,
        hour: 12,
        minute: 0,
        second: 0,
        millisecond: 0,
      },
      timeZone: 'Europe/Dublin',
    });
    expect(dublinWinter.daylightSaving).toEqual({
      representation: 'iana-tzif-isdst-with-derived-save',
      isDaylightSavingTime: true,
      offsetSeconds: -3_600,
    });

    const marengoZeroSave = resolveBirthInstant({
      localDateTime: {
        year: 1974,
        month: 1,
        day: 6,
        hour: 14,
        minute: 0,
        second: 0,
        millisecond: 0,
      },
      timeZone: 'America/Indiana/Marengo',
    });
    expect(marengoZeroSave.daylightSaving).toMatchObject({
      isDaylightSavingTime: true,
      offsetSeconds: 0,
    });

    const ojinaga = resolveBirthInstant({
      localDateTime: {
        year: 2022,
        month: 11,
        day: 1,
        hour: 12,
        minute: 0,
        second: 0,
        millisecond: 0,
      },
      timeZone: 'America/Ojinaga',
    });
    expect(ojinaga.offsetSeconds).toBe(-21_600);
    expect(ojinaga.daylightSaving).toMatchObject({
      isDaylightSavingTime: false,
      offsetSeconds: 0,
    });
  });

  test('DST 메타데이터 생성 범위 밖은 상태와 보정량을 null로 명시한다', () => {
    const resolved = resolveBirthInstant({
      localDateTime: {
        year: 1799,
        month: 1,
        day: 1,
        hour: 12,
        minute: 0,
        second: 0,
        millisecond: 0,
      },
      timeZone: 'Asia/Seoul',
    });

    expect(resolved.daylightSaving).toEqual({
      representation: 'iana-tzif-isdst-with-derived-save',
      isDaylightSavingTime: null,
      offsetSeconds: null,
    });
  });

  test.each([
    {
      label: '1908 표준시 도입 직전 LMT',
      localDateTime: {
        year: 1908,
        month: 3,
        day: 31,
        hour: 23,
        minute: 59,
        second: 59,
        millisecond: 0,
      },
      instantUtc: '1908-03-31T15:32:07.000Z',
      offsetSeconds: 30_472,
    },
    {
      label: '1908 표준시 도입 이후 UTC+08:30',
      localDateTime: {
        year: 1908,
        month: 4,
        day: 1,
        hour: 0,
        minute: 3,
        second: 0,
        millisecond: 0,
      },
      instantUtc: '1908-03-31T15:33:00.000Z',
      offsetSeconds: 30_600,
    },
    {
      label: '1908 초 단위 gap의 정확한 끝',
      localDateTime: {
        year: 1908,
        month: 4,
        day: 1,
        hour: 0,
        minute: 2,
        second: 8,
        millisecond: 0,
      },
      instantUtc: '1908-03-31T15:32:08.000Z',
      offsetSeconds: 30_600,
    },
    {
      label: '1912 UTC+09:00 전환 이후',
      localDateTime: {
        year: 1912,
        month: 1,
        day: 1,
        hour: 0,
        minute: 30,
        second: 0,
        millisecond: 0,
      },
      instantUtc: '1911-12-31T15:30:00.000Z',
      offsetSeconds: 32_400,
    },
    {
      label: '1961 UTC+09:00 재도입 이후',
      localDateTime: {
        year: 1961,
        month: 8,
        day: 10,
        hour: 0,
        minute: 30,
        second: 0,
        millisecond: 0,
      },
      instantUtc: '1961-08-09T15:30:00.000Z',
      offsetSeconds: 32_400,
    },
  ])(
    '$label의 역사적 초 단위 오프셋을 보존한다',
    ({ localDateTime, instantUtc, offsetSeconds }) => {
      const resolved = resolveBirthInstant({
        localDateTime,
        timeZone: 'Asia/Seoul',
      });

      expect(resolved.instantUtc).toBe(instantUtc);
      expect(resolved.offsetSeconds).toBe(offsetSeconds);
    },
  );

  test.each([
    {
      label: '1908 표준시 전환',
      localDateTime: {
        year: 1908,
        month: 4,
        day: 1,
        hour: 0,
        minute: 1,
        second: 0,
        millisecond: 0,
      },
    },
    {
      label: '1912 표준시 전환',
      localDateTime: {
        year: 1912,
        month: 1,
        day: 1,
        hour: 0,
        minute: 15,
        second: 0,
        millisecond: 0,
      },
    },
    {
      label: '1961 표준시 전환',
      localDateTime: {
        year: 1961,
        month: 8,
        day: 10,
        hour: 0,
        minute: 15,
        second: 0,
        millisecond: 0,
      },
    },
  ])('$label으로 사라진 30분을 거부한다', ({ localDateTime }) => {
    expect(() =>
      resolveBirthInstant({
        localDateTime,
        timeZone: 'Asia/Seoul',
      }),
    ).toThrow(
      expect.objectContaining<Partial<SajuError>>({
        code: 'NONEXISTENT_LOCAL_TIME',
      }),
    );
  });

  test('1954 표준시 후퇴로 중복된 23시대의 두 실제 순간을 구분한다', () => {
    const localDateTime = {
      year: 1954,
      month: 3,
      day: 20,
      hour: 23,
      minute: 45,
      second: 0,
      millisecond: 0,
    };

    const earlier = resolveBirthInstant({
      localDateTime,
      timeZone: 'Asia/Seoul',
      disambiguation: 'earlier',
    });
    const later = resolveBirthInstant({
      localDateTime,
      timeZone: 'Asia/Seoul',
      disambiguation: 'later',
    });

    expect(earlier.instantUtc).toBe('1954-03-20T14:45:00.000Z');
    expect(earlier.offsetSeconds).toBe(32_400);
    expect(later.instantUtc).toBe('1954-03-20T15:15:00.000Z');
    expect(later.offsetSeconds).toBe(30_600);
  });

  test.each(SEOUL_DST_TRANSITIONS)(
    '$instantUtc 서울 DST 경계의 직전·정확한 순간과 gap/fold를 보존한다',
    ({ instantUtc, beforeOffsetSeconds, afterOffsetSeconds }) => {
      const transition = Date.parse(instantUtc);
      const before = resolveBirthInstant({
        localDateTime: localFields(transition - 1, beforeOffsetSeconds),
        timeZone: 'Asia/Seoul',
        disambiguation: 'earlier',
        expectedOffsetSeconds: beforeOffsetSeconds,
      });
      const after = resolveBirthInstant({
        localDateTime: localFields(transition, afterOffsetSeconds),
        timeZone: 'Asia/Seoul',
        disambiguation: 'later',
        expectedOffsetSeconds: afterOffsetSeconds,
      });

      expect(before.epochMilliseconds).toBe(transition - 1);
      expect(after.epochMilliseconds).toBe(transition);
      expect(before.abbreviation).toBe(beforeOffsetSeconds > 32_400 ? 'KDT' : 'KST');
      expect(after.abbreviation).toBe(afterOffsetSeconds > 32_400 ? 'KDT' : 'KST');

      const beforeLocalBoundary = transition + beforeOffsetSeconds * 1_000;
      const afterLocalBoundary = transition + afterOffsetSeconds * 1_000;
      const middleLocalEpoch = (beforeLocalBoundary + afterLocalBoundary) / 2;
      const middleLocalDateTime = fieldsFromNaiveEpoch(middleLocalEpoch);

      if (afterOffsetSeconds > beforeOffsetSeconds) {
        expect(() =>
          resolveBirthInstant({
            localDateTime: middleLocalDateTime,
            timeZone: 'Asia/Seoul',
          }),
        ).toThrow(
          expect.objectContaining<Partial<SajuError>>({
            code: 'NONEXISTENT_LOCAL_TIME',
          }),
        );
      } else {
        expect(() =>
          resolveBirthInstant({
            localDateTime: middleLocalDateTime,
            timeZone: 'Asia/Seoul',
          }),
        ).toThrow(
          expect.objectContaining<Partial<SajuError>>({
            code: 'AMBIGUOUS_LOCAL_TIME',
          }),
        );
        expect(
          resolveBirthInstant({
            localDateTime: middleLocalDateTime,
            timeZone: 'Asia/Seoul',
            disambiguation: 'earlier',
          }).epochMilliseconds,
        ).toBe(middleLocalEpoch - beforeOffsetSeconds * 1_000);
        expect(
          resolveBirthInstant({
            localDateTime: middleLocalDateTime,
            timeZone: 'Asia/Seoul',
            disambiguation: 'later',
          }).epochMilliseconds,
        ).toBe(middleLocalEpoch - afterOffsetSeconds * 1_000);
      }
    },
  );

  test('한국 밖 IANA zone의 현대 DST gap과 fold도 같은 정책으로 처리한다', () => {
    expect(() =>
      resolveBirthInstant({
        localDateTime: {
          year: 2024,
          month: 3,
          day: 10,
          hour: 2,
          minute: 30,
          second: 0,
          millisecond: 0,
        },
        timeZone: 'America/New_York',
      }),
    ).toThrow(
      expect.objectContaining<Partial<SajuError>>({
        code: 'NONEXISTENT_LOCAL_TIME',
      }),
    );

    const localDateTime = {
      year: 2024,
      month: 11,
      day: 3,
      hour: 1,
      minute: 30,
      second: 0,
      millisecond: 0,
    };
    const earlier = resolveBirthInstant({
      localDateTime,
      timeZone: 'America/New_York',
      disambiguation: 'earlier',
    });
    const later = resolveBirthInstant({
      localDateTime,
      timeZone: 'America/New_York',
      disambiguation: 'later',
    });
    expect([earlier.instantUtc, earlier.offsetSeconds]).toEqual([
      '2024-11-03T05:30:00.000Z',
      -14_400,
    ]);
    expect([later.instantUtc, later.offsetSeconds]).toEqual(['2024-11-03T06:30:00.000Z', -18_000]);
  });

  test('런타임에서 잘못된 해소 정책과 기대 오프셋을 명시적 오류로 거부한다', () => {
    const base = {
      localDateTime: {
        year: 2024,
        month: 1,
        day: 1,
        hour: 12,
        minute: 0,
        second: 0,
        millisecond: 0,
      },
      timeZone: 'Asia/Seoul',
    };

    expect(() =>
      resolveBirthInstant({
        ...base,
        disambiguation: 'invalid' as 'reject',
      }),
    ).toThrow(expect.objectContaining<Partial<SajuError>>({ code: 'INVALID_REQUEST' }));
    expect(() =>
      resolveBirthInstant({
        ...base,
        expectedOffsetSeconds: Number.NaN,
      }),
    ).toThrow(expect.objectContaining<Partial<SajuError>>({ code: 'INVALID_REQUEST' }));
  });
});

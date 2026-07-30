import { describe, expect, test } from 'vitest';
import type { SajuPossibilityRequest } from './types';
import {
  calculateSajuPossibilities,
  tryCalculateSajuPossibilities,
} from './calculate-saju-possibilities';

describe('calculateSajuPossibilities', () => {
  test('생시를 모르면 임의 시각을 만들지 않고 그 날짜에 공통인 삼주만 반환한다', () => {
    const report = calculateSajuPossibilities({
      birth: {
        date: { calendar: 'gregorian', year: 1992, month: 10, day: 24 },
        time: { kind: 'unknown', reason: 'asked-unknown' },
        timeZone: 'Asia/Seoul',
      },
    });

    expect(report.input.time).toEqual({
      kind: 'unknown',
      reason: 'asked-unknown',
    });
    expect(report.hourPillar).toBe('omitted');
    expect(report.coverage).toEqual({
      startLocalDateTimeInclusive: '1992-10-24T00:00:00.000',
      endLocalDateTimeExclusive: '1992-10-25T00:00:00.000',
      intervalSemantics: '[start,end)',
    });

    const result = report.policyResults[0];
    expect(result?.ziHourPolicy).toBe('civilMidnight');
    expect(result?.stablePillars).toMatchObject({
      year: { korean: '임신' },
      month: { korean: '경술' },
      day: { korean: '계유' },
      hour: null,
    });
    expect(result?.candidates).toHaveLength(1);
    expect(result?.candidates[0]?.pillars).toMatchObject({
      year: { korean: '임신' },
      month: { korean: '경술' },
      day: { korean: '계유' },
      hour: null,
    });
    expect(JSON.stringify(report)).not.toContain('"hour":12');
    expect(Object.isFrozen(report)).toBe(true);
  });

  test('오전만 알면 오전 구간의 중복 없는 시주 후보와 각 성립 구간을 반환한다', () => {
    const report = calculateSajuPossibilities({
      birth: {
        date: { calendar: 'gregorian', year: 1992, month: 10, day: 24 },
        time: { kind: 'day-period', period: 'am' },
        timeZone: 'Asia/Seoul',
        timeEvidence: { source: 'family-memory', originalText: '오전에 태어남' },
      },
    });

    expect(report.hourPillar).toBe('candidate');
    expect(report.coverage).toMatchObject({
      startLocalDateTimeInclusive: '1992-10-24T00:00:00.000',
      endLocalDateTimeExclusive: '1992-10-24T12:00:00.000',
    });
    expect(report.input.timeEvidence).toEqual({
      source: 'family-memory',
      originalText: '오전에 태어남',
    });

    const result = report.policyResults[0]!;
    expect(result.stablePillars).toMatchObject({
      year: { korean: '임신' },
      month: { korean: '경술' },
      day: { korean: '계유' },
      hour: null,
    });
    expect(result.candidates.map(({ pillars }) => pillars.hour?.branch.korean)).toEqual([
      '자',
      '축',
      '인',
      '묘',
      '진',
      '사',
      '오',
    ]);
    expect(result.candidates[0]?.windows).toMatchObject([
      {
        startLocalDateTimeInclusive: '1992-10-24T00:00:00.000',
        endLocalDateTimeExclusive: '1992-10-24T01:00:00.000',
        disambiguation: 'exact',
      },
    ]);
  });

  test('23시 전후 추정은 세 자시 정책을 나란히 계산하고 23:00 경계를 설명한다', () => {
    const report = calculateSajuPossibilities({
      birth: {
        date: { calendar: 'gregorian', year: 2024, month: 3, day: 10 },
        time: {
          kind: 'approximate',
          time: { hour: 23, minute: 0 },
          toleranceMinutes: 15,
        },
        timeZone: 'Asia/Seoul',
      },
      rules: { ziHourPolicies: 'all' },
    });

    expect(report.coverage).toMatchObject({
      startLocalDateTimeInclusive: '2024-03-10T22:45:00.000',
      endLocalDateTimeExclusive: '2024-03-10T23:15:00.000',
    });
    expect(report.policyResults.map(({ ziHourPolicy }) => ziHourPolicy)).toEqual([
      'civilMidnight',
      'ziStart',
      'splitZi',
    ]);

    const [civil, ziStart, splitZi] = report.policyResults;
    expect(
      civil?.candidates.map(({ pillars }) => [pillars.day.korean, pillars.hour?.korean]),
    ).toEqual([
      ['계유', '계해'],
      ['계유', '임자'],
    ]);
    expect(
      ziStart?.candidates.map(({ pillars }) => [pillars.day.korean, pillars.hour?.korean]),
    ).toEqual([
      ['계유', '계해'],
      ['갑술', '갑자'],
    ]);
    expect(
      splitZi?.candidates.map(({ pillars }) => [pillars.day.korean, pillars.hour?.korean]),
    ).toEqual([
      ['계유', '계해'],
      ['계유', '갑자'],
    ]);
    expect(ziStart?.boundaries).toEqual([
      expect.objectContaining({
        atLocalDateTime: '2024-03-10T23:00:00.000',
        changedPillars: ['day', 'hour'],
        causes: ['day-boundary', 'hour-boundary'],
      }),
    ]);
    expect(report.candidates).toHaveLength(4);
    expect(report.candidates[0]).toMatchObject({
      ziHourPolicies: ['civilMidnight', 'ziStart', 'splitZi'],
      supportDurationMilliseconds: 15 * 60_000,
    });
    expect(report.stablePillars).toMatchObject({
      year: { korean: '갑진' },
      month: { korean: '정묘' },
      day: null,
      hour: null,
    });
  });

  test('입춘 추정 순간을 포함하면 천문 불확실성 때문에 양쪽 원국을 함께 보존한다', () => {
    const report = calculateSajuPossibilities({
      birth: {
        date: { calendar: 'gregorian', year: 2024, month: 2, day: 4 },
        time: {
          kind: 'range',
          startInclusive: { hour: 17, minute: 26, second: 49, millisecond: 629 },
          endExclusive: { hour: 17, minute: 26, second: 49, millisecond: 631 },
        },
        timeZone: 'Asia/Seoul',
      },
    });

    const result = report.policyResults[0]!;
    expect(
      result.candidates.map(({ pillars }) => [pillars.year.korean, pillars.month.korean]),
    ).toEqual([
      ['계묘', '을축'],
      ['갑진', '병인'],
    ]);
    expect(result.stablePillars).toMatchObject({
      year: null,
      month: null,
      day: { korean: '무술' },
      hour: { korean: '신유' },
    });
    expect(result.boundaries).toEqual([
      expect.objectContaining({
        transitionKind: 'computed-basis-transition',
        atLocalDateTime: '2024-02-04T17:26:49.630',
        changedPillars: [],
        causes: ['solar-term'],
      }),
    ]);
    expect(report.warnings).toContainEqual(
      expect.objectContaining({
        code: 'SOLAR_TERM_SOURCE_UNCERTAINTY_INTERSECTS_RANGE',
        boundaryInstantUtc: '2024-02-04T08:26:49.630Z',
        boundaryLocalDateTime: '2024-02-04T17:26:49.630',
        uncertaintyMilliseconds: 1_500_000,
      }),
    );
  });

  test('계산된 입춘 전이라도 천문 소스 불확실성 안이면 경계 양쪽 원국을 보존한다', () => {
    const report = calculateSajuPossibilities({
      birth: {
        date: { calendar: 'gregorian', year: 2024, month: 2, day: 4 },
        time: {
          kind: 'range',
          startInclusive: { hour: 17, minute: 10 },
          endExclusive: { hour: 17, minute: 20 },
        },
        timeZone: 'Asia/Seoul',
      },
    });

    expect(
      report.candidates.map(({ pillars }) => [pillars.year.korean, pillars.month.korean]),
    ).toEqual([
      ['계묘', '을축'],
      ['갑진', '병인'],
    ]);
    expect(report.stablePillars).toMatchObject({
      year: null,
      month: null,
      day: { korean: '무술' },
      hour: { korean: '신유' },
    });
    expect(
      report.candidates.every((candidate) => candidate.supportDurationMilliseconds === 600_000),
    ).toBe(true);
  });

  test('천문 불확실성 구간의 시작과 끝을 원국 후보 경계로 분할한다', () => {
    const report = calculateSajuPossibilities({
      birth: {
        date: { calendar: 'gregorian', year: 2024, month: 2, day: 4 },
        time: {
          kind: 'range',
          startInclusive: { hour: 16, minute: 55 },
          endExclusive: { hour: 17, minute: 55 },
        },
        timeZone: 'Asia/Seoul',
      },
    });

    expect(
      report.policyResults[0]?.boundaries.filter((boundary) =>
        boundary.causes.includes('solar-term'),
      ),
    ).toEqual([
      expect.objectContaining({
        atLocalDateTime: '2024-02-04T17:01:49.630',
        transitionKind: 'source-uncertainty-transition',
        changedPillars: ['year', 'month'],
        causes: ['solar-term'],
      }),
      expect.objectContaining({
        atLocalDateTime: '2024-02-04T17:26:49.630',
        transitionKind: 'computed-basis-transition',
        changedPillars: [],
        causes: ['solar-term'],
      }),
      expect.objectContaining({
        atLocalDateTime: '2024-02-04T17:51:49.630',
        transitionKind: 'source-uncertainty-transition',
        changedPillars: ['year', 'month'],
        causes: ['solar-term'],
      }),
    ]);
  });

  test('DST fold 안의 절입 오차 후보를 UTC 순간 기준으로 계산한다', () => {
    const report = calculateSajuPossibilities({
      birth: {
        date: { calendar: 'gregorian', year: 2021, month: 11, day: 7 },
        time: {
          kind: 'range',
          startInclusive: { hour: 1, minute: 50 },
          endExclusive: { hour: 1, minute: 55 },
        },
        timeZone: 'America/Halifax',
      },
    });

    expect(
      report.candidates
        .flatMap((candidate) => candidate.occurrences)
        .map(({ disambiguation }) => disambiguation),
    ).toContain('earlier');
    expect(
      report.candidates
        .flatMap((candidate) => candidate.occurrences)
        .map(({ disambiguation }) => disambiguation),
    ).toContain('later');
    expect(
      report.candidates.flatMap((candidate) => candidate.occurrences).map(({ basis }) => basis),
    ).toContain('solar-term-source-uncertainty');
    expect(report.warnings).toContainEqual(
      expect.objectContaining({ code: 'SOLAR_TERM_SOURCE_UNCERTAINTY_INTERSECTS_RANGE' }),
    );
  });

  test('DST fold 이후지만 실제 UTC 절입 오차 밖인 구간에는 잘못된 경고를 내지 않는다', () => {
    const report = calculateSajuPossibilities({
      birth: {
        date: { calendar: 'gregorian', year: 2021, month: 11, day: 7 },
        time: {
          kind: 'range',
          startInclusive: { hour: 2, minute: 10 },
          endExclusive: { hour: 2, minute: 20 },
        },
        timeZone: 'America/Halifax',
      },
    });

    expect(report.warnings).not.toContainEqual(
      expect.objectContaining({ code: 'SOLAR_TERM_SOURCE_UNCERTAINTY_INTERSECTS_RANGE' }),
    );
  });

  test('DST fold에서도 절입 추정 순간과 오차 시작·끝의 provenance를 구분한다', () => {
    const report = calculateSajuPossibilities({
      birth: {
        date: { calendar: 'gregorian', year: 2021, month: 11, day: 7 },
        time: {
          kind: 'range',
          startInclusive: { hour: 1, minute: 0 },
          endExclusive: { hour: 2, minute: 30 },
        },
        timeZone: 'America/Halifax',
      },
    });

    const solarBoundaries = report.policyResults[0]!.boundaries.filter((boundary) =>
      boundary.causes.includes('solar-term'),
    );
    expect(solarBoundaries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          atLocalDateTime: '2021-11-07T01:23:53.603',
          transitionKind: 'source-uncertainty-transition',
        }),
        expect.objectContaining({
          atLocalDateTime: '2021-11-07T01:33:53.603',
          transitionKind: 'source-uncertainty-transition',
        }),
        expect.objectContaining({
          atLocalDateTime: '2021-11-07T01:58:53.603',
          transitionKind: 'computed-basis-transition',
        }),
      ]),
    );
  });

  test('계산 불가 구간만 있어도 잘못된 진태양시 경도를 먼저 거부한다', () => {
    const result = tryCalculateSajuPossibilities({
      birth: {
        date: { calendar: 'gregorian', year: 1961, month: 8, day: 10 },
        time: {
          kind: 'range',
          startInclusive: { hour: 0, minute: 0 },
          endExclusive: { hour: 0, minute: 30 },
        },
        timeZone: 'Asia/Seoul',
      },
      rules: {
        dayHourClock: {
          kind: 'local-apparent-solar',
          longitudeDegreesEast: 999,
          equationOfTime: 'apply',
        },
      },
    });

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: 'INVALID_RULE',
        path: ['rules', 'dayHourClock', 'longitudeDegreesEast'],
      },
    });
  });

  test('시간 미상 날짜 안에 절입이 있으면 확정되지 않는 연·월주를 삼주로 가장하지 않는다', () => {
    const report = calculateSajuPossibilities({
      birth: {
        date: { calendar: 'gregorian', year: 2024, month: 2, day: 4 },
        time: { kind: 'unknown' },
        timeZone: 'Asia/Seoul',
      },
    });

    const result = report.policyResults[0]!;
    expect(result.stablePillars).toMatchObject({
      year: null,
      month: null,
      day: { korean: '무술' },
      hour: null,
    });
    expect(result.candidates.map(({ pillars }) => pillars.hour)).toEqual([null, null]);
    expect(
      result.candidates.map(({ pillars }) => [pillars.year.korean, pillars.month.korean]),
    ).toEqual([
      ['계묘', '을축'],
      ['갑진', '병인'],
    ]);
  });

  test('1961년 서울 표준시 gap을 다음 시각으로 밀지 않고 계산 불가 구간으로 남긴다', () => {
    const report = calculateSajuPossibilities({
      birth: {
        date: { calendar: 'gregorian', year: 1961, month: 8, day: 10 },
        time: {
          kind: 'range',
          startInclusive: { hour: 0, minute: 0 },
          endExclusive: { hour: 1, minute: 0 },
        },
        timeZone: 'Asia/Seoul',
      },
    });

    const result = report.policyResults[0]!;
    expect(result.unresolvableWindows).toEqual([
      {
        startLocalDateTimeInclusive: '1961-08-10T00:00:00.000',
        endLocalDateTimeExclusive: '1961-08-10T00:30:00.000',
        reason: 'nonexistent-local-time',
      },
    ]);
    expect(result.candidates[0]?.windows[0]).toMatchObject({
      startLocalDateTimeInclusive: '1961-08-10T00:30:00.000',
      disambiguation: 'exact',
    });
    expect(result.boundaries[0]).toMatchObject({
      atLocalDateTime: '1961-08-10T00:30:00.000',
      beforeCandidateIds: [],
      causes: ['time-zone-transition'],
    });
  });

  test('1948년 서울 DST 시작 gap과 1988년 종료 fold 경계를 후보 범위에 보존한다', () => {
    const dstStart = calculateSajuPossibilities({
      birth: {
        date: { calendar: 'gregorian', year: 1948, month: 5, day: 31 },
        time: {
          kind: 'range',
          startInclusive: { hour: 23, minute: 50 },
          endExclusive: { hour: 1, minute: 10 },
          crossesMidnight: true,
        },
        timeZone: 'Asia/Seoul',
      },
    });
    expect(dstStart.policyResults[0]?.unresolvableWindows).toEqual([
      {
        startLocalDateTimeInclusive: '1948-06-01T00:00:00.000',
        endLocalDateTimeExclusive: '1948-06-01T01:00:00.000',
        reason: 'nonexistent-local-time',
      },
    ]);

    const dstEnd = calculateSajuPossibilities({
      birth: {
        date: { calendar: 'gregorian', year: 1988, month: 10, day: 9 },
        time: {
          kind: 'range',
          startInclusive: { hour: 1, minute: 50 },
          endExclusive: { hour: 3, minute: 10 },
        },
        timeZone: 'Asia/Seoul',
      },
    });
    expect(dstEnd.policyResults[0]?.boundaries).toEqual([
      expect.objectContaining({
        atLocalDateTime: '1988-10-09T02:00:00.000',
        causes: ['time-zone-transition'],
      }),
      expect.objectContaining({
        atLocalDateTime: '1988-10-09T03:00:00.000',
        causes: ['hour-boundary', 'time-zone-transition'],
      }),
    ]);
  });

  test('1954년 서울 표준시 fold의 두 실제 순간을 한쪽으로 임의 선택하지 않는다', () => {
    const report = calculateSajuPossibilities({
      birth: {
        date: { calendar: 'gregorian', year: 1954, month: 3, day: 20 },
        time: {
          kind: 'range',
          startInclusive: { hour: 23, minute: 40 },
          endExclusive: { hour: 23, minute: 50 },
        },
        timeZone: 'Asia/Seoul',
      },
    });

    const result = report.policyResults[0]!;
    expect(result.unresolvableWindows).toEqual([]);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.windows).toEqual([
      {
        startLocalDateTimeInclusive: '1954-03-20T23:40:00.000',
        endLocalDateTimeExclusive: '1954-03-20T23:50:00.000',
        instantStartUtc: '1954-03-20T14:40:00.000Z',
        instantEndExclusiveUtc: '1954-03-20T14:50:00.000Z',
        offsetSeconds: 32_400,
        disambiguation: 'earlier',
        basis: 'computed',
      },
      {
        startLocalDateTimeInclusive: '1954-03-20T23:40:00.000',
        endLocalDateTimeExclusive: '1954-03-20T23:50:00.000',
        instantStartUtc: '1954-03-20T15:10:00.000Z',
        instantEndExclusiveUtc: '1954-03-20T15:20:00.000Z',
        offsetSeconds: 30_600,
        disambiguation: 'later',
        basis: 'computed',
      },
    ]);
  });

  test('기록된 UTC offset으로 역사적 fold 후보를 안전하게 좁힌다', () => {
    const report = calculateSajuPossibilities({
      birth: {
        date: { calendar: 'gregorian', year: 1954, month: 3, day: 20 },
        time: {
          kind: 'range',
          startInclusive: { hour: 23, minute: 40 },
          endExclusive: { hour: 23, minute: 50 },
        },
        timeZone: 'Asia/Seoul',
        expectedOffsetSeconds: 32_400,
        timeEvidence: {
          source: 'rectified',
          conflict: 'multiple-sources',
        },
      },
    });

    expect(report.input).toMatchObject({
      expectedOffsetSeconds: 32_400,
      timeEvidence: {
        source: 'rectified',
        conflict: 'multiple-sources',
      },
    });
    expect(report.policyResults[0]?.candidates[0]?.windows).toHaveLength(1);
    expect(report.policyResults[0]?.candidates[0]?.windows[0]).toMatchObject({
      offsetSeconds: 32_400,
      disambiguation: 'earlier',
    });
  });

  test('1954년 fold 종료가 자정과 겹쳐도 시간대 전환 원인을 누락하지 않는다', () => {
    const report = calculateSajuPossibilities({
      birth: {
        date: { calendar: 'gregorian', year: 1954, month: 3, day: 20 },
        time: {
          kind: 'range',
          startInclusive: { hour: 23, minute: 20 },
          endExclusive: { hour: 0, minute: 10 },
          crossesMidnight: true,
        },
        timeZone: 'Asia/Seoul',
      },
    });

    const boundaries = report.policyResults[0]!.boundaries;
    expect(boundaries).toEqual([
      expect.objectContaining({
        atLocalDateTime: '1954-03-20T23:30:00.000',
        causes: ['time-zone-transition'],
      }),
      expect.objectContaining({
        atLocalDateTime: '1954-03-21T00:00:00.000',
        causes: ['day-boundary', 'hour-boundary', 'time-zone-transition'],
      }),
    ]);
  });

  test('1908년 표준시 도입 전 서울 LMT 범위에는 출생지 경도 확인 경고를 남긴다', () => {
    const report = calculateSajuPossibilities({
      birth: {
        date: { calendar: 'gregorian', year: 1801, month: 1, day: 1 },
        time: { kind: 'day-period', period: 'am' },
        timeZone: 'Asia/Seoul',
      },
    });

    expect(report.warnings).toContainEqual({
      code: 'PRE_STANDARD_TIME_LOCAL_MEAN_APPROXIMATION',
      message: expect.stringContaining('local mean time'),
    });
    expect(report.policyResults[0]?.stablePillars).toMatchObject({
      year: { korean: '경신' },
      month: { korean: '무자' },
      day: { korean: '을미' },
    });
  });

  test('진태양시 시진 경계도 민간시 정각을 복사하지 않고 보정식의 근으로 분할한다', () => {
    const report = calculateSajuPossibilities({
      birth: {
        date: { calendar: 'gregorian', year: 1990, month: 5, day: 15 },
        time: {
          kind: 'approximate',
          time: { hour: 7, minute: 30 },
          toleranceMinutes: 10,
        },
        timeZone: 'Asia/Seoul',
      },
      rules: {
        dayHourClock: {
          kind: 'local-apparent-solar',
          longitudeDegreesEast: 126.978,
          equationOfTime: 'apply',
        },
      },
    });

    const result = report.policyResults[0]!;
    expect(result.candidates.map(({ pillars }) => pillars.hour?.branch.korean)).toEqual([
      '묘',
      '진',
    ]);
    expect(result.boundaries).toHaveLength(1);
    expect(result.boundaries[0]).toMatchObject({
      changedPillars: ['hour'],
      causes: ['hour-boundary'],
    });
    expect(report.audit.rules).toEqual({
      ziHourPolicies: ['civilMidnight'],
      dayHourClock: 'local-apparent-solar',
      longitudeDegreesEast: 126.978,
      equationOfTime: 'apply',
    });
    expect(report.audit.datasets).toMatchObject({
      timezone: { version: 'IANA-2026c' },
      solarTerms: { engine: 'astronomy-engine@2.1.19' },
      koreanLunar: { engine: 'astronomy-engine@2.1.19' },
    });
    expect(result.boundaries[0]?.atLocalDateTime).toMatch(/^1990-05-15T07:2\d:/);
    expect(result.boundaries[0]?.atLocalDateTime).not.toBe('1990-05-15T07:00:00.000');
  });

  test('진태양시의 자정 통과와 균시차 적용·생략을 각각 근으로 계산한다', () => {
    const base = {
      birth: {
        date: { calendar: 'gregorian' as const, year: 1990, month: 5, day: 15 },
        time: {
          kind: 'approximate' as const,
          time: { hour: 0, minute: 30 },
          toleranceMinutes: 20,
        },
        timeZone: 'Asia/Seoul',
      },
    };
    const apply = calculateSajuPossibilities({
      ...base,
      rules: {
        dayHourClock: {
          kind: 'local-apparent-solar',
          longitudeDegreesEast: 126.978,
          equationOfTime: 'apply',
        },
      },
    });
    const omit = calculateSajuPossibilities({
      ...base,
      rules: {
        dayHourClock: {
          kind: 'local-apparent-solar',
          longitudeDegreesEast: 126.978,
          equationOfTime: 'omit',
        },
      },
    });

    const applyBoundary = apply.policyResults[0]?.boundaries[0];
    const omitBoundary = omit.policyResults[0]?.boundaries[0];
    expect(applyBoundary).toMatchObject({
      changedPillars: ['day', 'hour'],
      causes: ['day-boundary', 'hour-boundary'],
    });
    expect(omitBoundary).toMatchObject({
      changedPillars: ['day', 'hour'],
      causes: ['day-boundary', 'hour-boundary'],
    });
    expect(applyBoundary?.atLocalDateTime).not.toBe(omitBoundary?.atLocalDateTime);
    expect(apply.audit.rules.equationOfTime).toBe('apply');
    expect(omit.audit.rules.equationOfTime).toBe('omit');
  });

  test('자정을 넘는 근사 범위는 날짜 불확실성을 명시하지 않으면 거부한다', () => {
    const request = {
      birth: {
        date: { calendar: 'gregorian' as const, year: 2024, month: 3, day: 10 },
        time: {
          kind: 'approximate' as const,
          time: { hour: 0, minute: 5 },
          toleranceMinutes: 10,
        },
        timeZone: 'Asia/Seoul',
      },
    };

    const rejected = tryCalculateSajuPossibilities(request);
    expect(rejected.ok).toBe(false);
    if (rejected.ok) return;
    expect(rejected.error).toMatchObject({
      code: 'INVALID_REQUEST',
      path: ['birth', 'time', 'dateRollover'],
    });
    expect(() => JSON.stringify(rejected)).not.toThrow();

    const allowed = calculateSajuPossibilities({
      ...request,
      birth: {
        ...request.birth,
        time: { ...request.birth.time, dateRollover: 'allow' },
      },
    });
    expect(allowed.coverage).toMatchObject({
      startLocalDateTimeInclusive: '2024-03-09T23:55:00.000',
      endLocalDateTimeExclusive: '2024-03-10T00:15:00.000',
    });
  });

  test('한국 음력·오후·자정 통과 범위를 같은 공개 seam에서 정규화한다', () => {
    const afternoon = calculateSajuPossibilities({
      birth: {
        date: {
          calendar: 'korean-lunar',
          year: 1992,
          month: 9,
          day: 29,
          monthKind: 'regular',
        },
        time: { kind: 'day-period', period: 'pm' },
        timeZone: 'Asia/Seoul',
      },
      rules: { ziHourPolicies: ['civilMidnight', 'civilMidnight'] },
    });
    expect(afternoon.input.gregorianDate).toEqual({
      calendar: 'gregorian',
      year: 1992,
      month: 10,
      day: 24,
    });
    expect(afternoon.policyResults).toHaveLength(1);
    expect(afternoon.coverage).toMatchObject({
      startLocalDateTimeInclusive: '1992-10-24T12:00:00.000',
      endLocalDateTimeExclusive: '1992-10-25T00:00:00.000',
    });

    const overnight = calculateSajuPossibilities({
      birth: {
        date: { calendar: 'gregorian', year: 2024, month: 3, day: 10 },
        time: {
          kind: 'range',
          startInclusive: { hour: 23, minute: 50 },
          endExclusive: { hour: 0, minute: 10 },
          crossesMidnight: true,
        },
        timeZone: 'Asia/Seoul',
      },
    });
    expect(overnight.coverage.endLocalDateTimeExclusive).toBe('2024-03-11T00:10:00.000');
  });

  test.each([
    [null, 'INVALID_REQUEST'],
    [{}, 'INVALID_REQUEST'],
    [{ birth: {} }, 'INVALID_REQUEST'],
    [
      {
        birth: {
          date: { calendar: 'julian', year: 1992, month: 10, day: 24 },
          time: { kind: 'unknown' },
          timeZone: 'Asia/Seoul',
        },
      },
      'INVALID_DATE',
    ],
    [
      {
        birth: {
          date: { calendar: 'korean-lunar', year: 1992, month: 9, day: 29 },
          time: { kind: 'unknown' },
          timeZone: 'Asia/Seoul',
        },
      },
      'INVALID_LEAP_MONTH',
    ],
    [
      {
        birth: {
          date: { calendar: 'gregorian', year: 1992, month: 10, day: 24 },
          time: null,
          timeZone: 'Asia/Seoul',
        },
      },
      'INVALID_REQUEST',
    ],
    [
      {
        birth: {
          date: { calendar: 'gregorian', year: 1992, month: 10, day: 24 },
          time: { kind: 'sometimes' },
          timeZone: 'Asia/Seoul',
        },
      },
      'INVALID_REQUEST',
    ],
    [
      {
        birth: {
          date: { calendar: 'gregorian', year: 1992, month: 10, day: 24 },
          time: { kind: 'unknown', reason: 'guessed' },
          timeZone: 'Asia/Seoul',
        },
      },
      'INVALID_REQUEST',
    ],
    [
      {
        birth: {
          date: { calendar: 'gregorian', year: 1992, month: 10, day: 24 },
          time: { kind: 'day-period', period: 'evening' },
          timeZone: 'Asia/Seoul',
        },
      },
      'INVALID_REQUEST',
    ],
    [
      {
        birth: {
          date: { calendar: 'gregorian', year: 1992, month: 10, day: 24 },
          time: {
            kind: 'approximate',
            time: { hour: 24, minute: 0 },
            toleranceMinutes: 10,
          },
          timeZone: 'Asia/Seoul',
        },
      },
      'INVALID_REQUEST',
    ],
    [
      {
        birth: {
          date: { calendar: 'gregorian', year: 1992, month: 10, day: 24 },
          time: {
            kind: 'approximate',
            time: { hour: 12, minute: 0 },
            toleranceMinutes: 0,
          },
          timeZone: 'Asia/Seoul',
        },
      },
      'INVALID_REQUEST',
    ],
    [
      {
        birth: {
          date: { calendar: 'gregorian', year: 1992, month: 10, day: 24 },
          time: {
            kind: 'approximate',
            time: { hour: 12, minute: 0 },
            toleranceMinutes: 10,
            dateRollover: 'clamp',
          },
          timeZone: 'Asia/Seoul',
        },
      },
      'INVALID_REQUEST',
    ],
    [
      {
        birth: {
          date: { calendar: 'gregorian', year: 1992, month: 10, day: 24 },
          time: {
            kind: 'range',
            startInclusive: { hour: 22, minute: 0 },
            endExclusive: { hour: 21, minute: 0 },
          },
          timeZone: 'Asia/Seoul',
        },
      },
      'INVALID_REQUEST',
    ],
    [
      {
        birth: {
          date: { calendar: 'gregorian', year: 1992, month: 10, day: 24 },
          time: { kind: 'unknown' },
          timeZone: '',
        },
      },
      'UNKNOWN_TIME_ZONE',
    ],
    [
      {
        birth: {
          date: { calendar: 'gregorian', year: 1992, month: 10, day: 24 },
          time: { kind: 'unknown' },
          timeZone: 'Asia/Seoul',
          expectedOffsetSeconds: 100_000,
        },
      },
      'INVALID_REQUEST',
    ],
    [
      {
        birth: {
          date: { calendar: 'gregorian', year: 1992, month: 10, day: 24 },
          time: { kind: 'unknown' },
          timeZone: 'Asia/Seoul',
          timeEvidence: { source: 'rumor' },
        },
      },
      'INVALID_REQUEST',
    ],
    [
      {
        birth: {
          date: { calendar: 'gregorian', year: 1992, month: 10, day: 24 },
          time: { kind: 'unknown' },
          timeZone: 'Asia/Seoul',
        },
        rules: { ziHourPolicies: [] },
      },
      'INVALID_REQUEST',
    ],
    [
      {
        birth: {
          date: { calendar: 'gregorian', year: 1992, month: 10, day: 24 },
          time: { kind: 'unknown' },
          timeZone: 'Asia/Seoul',
        },
        rules: { ziHourPolicies: ['tomorrow'] },
      },
      'INVALID_REQUEST',
    ],
    [
      {
        birth: {
          date: { calendar: 'gregorian', year: 1992, month: 10, day: 24 },
          time: { kind: 'unknown' },
          timeZone: 'Asia/Seoul',
        },
        rules: { dayHourClock: { kind: 'sidereal' } },
      },
      'INVALID_RULE',
    ],
  ])('잘못된 불확실 시각 요청 %#을 JSON-safe 기계 판독 오류로 반환한다', (request, code) => {
    const result = tryCalculateSajuPossibilities(request as unknown as SajuPossibilityRequest);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe(code);
    expect(JSON.parse(JSON.stringify(result.error))).toMatchObject({
      name: 'SajuError',
      code,
    });
  });
});

import { describe, expect, test } from 'vitest';
import { findSolarTermBoundary } from '../astro/astronomical-solar-terms';
import { SajuError } from '../errors';
import type { SajuRequest } from './types';
import { calculateSaju, tryCalculateSaju } from './calculate-saju';

function seoulRequestAtInstant(epochMilliseconds: number): SajuRequest {
  const local = new Date(epochMilliseconds + 9 * 60 * 60 * 1_000);
  return {
    birth: {
      date: {
        calendar: 'gregorian',
        year: local.getUTCFullYear(),
        month: local.getUTCMonth() + 1,
        day: local.getUTCDate(),
      },
      time: {
        hour: local.getUTCHours(),
        minute: local.getUTCMinutes(),
        second: local.getUTCSeconds(),
        millisecond: local.getUTCMilliseconds(),
      },
      timeZone: 'Asia/Seoul',
    },
  };
}

describe('calculateSaju', () => {
  test('명시적 IANA 시간대에서 한국 원국과 계산 근거를 JSON 보고서로 반환한다', () => {
    const report = calculateSaju({
      birth: {
        date: { calendar: 'gregorian', year: 1992, month: 10, day: 24 },
        time: { hour: 5, minute: 30 },
        timeZone: 'Asia/Seoul',
      },
    });

    expect(report.pillars).toMatchObject({
      year: { korean: '임신', hanja: '壬申', cycleIndex: 8 },
      month: { korean: '경술', hanja: '庚戌' },
      day: { korean: '계유', hanja: '癸酉', cycleIndex: 9 },
      hour: { korean: '을묘', hanja: '乙卯' },
    });
    expect(report.chronology).toMatchObject({
      instantUtc: '1992-10-23T20:30:00.000Z',
      timeZone: 'Asia/Seoul',
      offsetSeconds: 32_400,
      daylightSaving: {
        representation: 'iana-tzif-isdst-with-derived-save',
        isDaylightSavingTime: false,
        offsetSeconds: 0,
      },
      koreanLunarDate: {
        calendar: 'korean-lunar',
        year: 1992,
        month: 9,
        day: 29,
        monthKind: 'regular',
      },
    });
    expect(report.audit).toMatchObject({
      engine: { name: 'saju-engine', version: '0.9.0', ruleset: 'korean-standard-v2' },
      datasets: {
        timezone: { engine: 'moment-timezone@0.6.3', version: 'IANA-2026c' },
        solarTerms: {
          engine: 'astronomy-engine@2.1.19',
          sourceCommit: '61dc07020aaa6885d2c7f688a4d82beaf6edb9ef',
        },
        koreanLunar: {
          engine: 'astronomy-engine@2.1.19',
          regressionFixtureImportedOn: '2026-07-26',
        },
      },
    });
    expect(JSON.parse(JSON.stringify(report))).toEqual(report);
  });

  test('입춘 정확한 순간을 새 연주·월주에 포함한다', () => {
    const boundary = findSolarTermBoundary(2024, 2).epochMilliseconds;

    const before = calculateSaju(seoulRequestAtInstant(boundary - 1));
    const exact = calculateSaju(seoulRequestAtInstant(boundary));
    const after = calculateSaju(seoulRequestAtInstant(boundary + 1));

    expect([before.pillars.year.korean, before.pillars.month.korean]).toEqual(['계묘', '을축']);
    expect([exact.pillars.year.korean, exact.pillars.month.korean]).toEqual(['갑진', '병인']);
    expect([after.pillars.year.korean, after.pillars.month.korean]).toEqual(['갑진', '병인']);
    expect(exact.audit.evidence.distanceToNearestBoundaryMilliseconds).toBe(0);
    expect(exact.warnings.map((warning) => warning.code)).toContain(
      'BOUNDARY_WITHIN_SOURCE_UNCERTAINTY',
    );
  });

  test('23시 자시에서 세 일경계 관법을 서로 섞지 않는다', () => {
    const base = {
      birth: {
        date: { calendar: 'gregorian' as const, year: 2024, month: 3, day: 10 },
        time: { hour: 23, minute: 0 },
        timeZone: 'Asia/Seoul',
      },
    };

    const civilMidnight = calculateSaju({
      ...base,
      rules: { ziHourPolicy: 'civilMidnight' },
    });
    const ziStart = calculateSaju({
      ...base,
      rules: { ziHourPolicy: 'ziStart' },
    });
    const splitZi = calculateSaju({
      ...base,
      rules: { ziHourPolicy: 'splitZi' },
    });

    expect([civilMidnight.pillars.day.korean, civilMidnight.pillars.hour.korean]).toEqual([
      '계유',
      '임자',
    ]);
    expect([ziStart.pillars.day.korean, ziStart.pillars.hour.korean]).toEqual(['갑술', '갑자']);
    expect([splitZi.pillars.day.korean, splitZi.pillars.hour.korean]).toEqual(['계유', '갑자']);
  });

  test('진태양시는 일·시 시계에만 적용하고 연·월 절입 순간은 이동시키지 않는다', () => {
    const birth = {
      birth: {
        date: { calendar: 'gregorian' as const, year: 1990, month: 5, day: 15 },
        time: { hour: 7, minute: 5 },
        timeZone: 'Asia/Seoul',
      },
    };
    const civil = calculateSaju(birth);
    const apparent = calculateSaju({
      ...birth,
      rules: {
        dayHourClock: {
          kind: 'local-apparent-solar',
          longitudeDegreesEast: 126.978,
          equationOfTime: 'apply',
        },
      },
    });

    expect(apparent.chronology.dayHourDateTime).toMatch(/^1990-05-15T06:36:/);
    expect(apparent.pillars.year).toEqual(civil.pillars.year);
    expect(apparent.pillars.month).toEqual(civil.pillars.month);
    expect(civil.pillars.hour.branch.korean).toBe('진');
    expect(apparent.pillars.hour.branch.korean).toBe('묘');
    expect(apparent.chronology.solarTimeCorrection).toMatchObject({
      longitudeSeconds: 30_474.72,
    });
  });

  test('한국 음력 입력을 같은 벽시계 양력 입력과 동일한 순간·원국으로 정규화한다', () => {
    const solar = calculateSaju({
      birth: {
        date: { calendar: 'gregorian', year: 1992, month: 10, day: 24 },
        time: { hour: 5, minute: 30 },
        timeZone: 'Asia/Seoul',
      },
    });
    const lunar = calculateSaju({
      birth: {
        date: {
          calendar: 'korean-lunar',
          year: 1992,
          month: 9,
          day: 29,
          monthKind: 'regular',
        },
        time: { hour: 5, minute: 30 },
        timeZone: 'Asia/Seoul',
      },
    });

    expect(lunar.chronology.gregorianDate).toEqual(solar.chronology.gregorianDate);
    expect(lunar.chronology.instantUtc).toBe(solar.chronology.instantUtc);
    expect(lunar.pillars).toEqual(solar.pillars);
  });

  test('한국과 중국 음력 날짜가 갈리는 1997년 설을 한국 정본으로 보존한다', () => {
    const report = calculateSaju({
      birth: {
        date: { calendar: 'gregorian', year: 1997, month: 2, day: 8 },
        time: { hour: 12, minute: 0 },
        timeZone: 'Asia/Seoul',
      },
    });

    expect(report.chronology.koreanLunarDate).toEqual({
      calendar: 'korean-lunar',
      year: 1997,
      month: 1,
      day: 1,
      monthKind: 'regular',
    });
  });

  test('지원 하한의 서울 LMT 날짜도 불필요한 1799년 절기 조회 없이 계산한다', () => {
    const report = calculateSaju({
      birth: {
        date: { calendar: 'gregorian', year: 1801, month: 1, day: 1 },
        time: { hour: 0, minute: 0 },
        timeZone: 'Asia/Seoul',
      },
    });

    expect(report.chronology.instantUtc).toBe('1800-12-31T15:32:08.000Z');
    expect(report.pillars.year.korean).toBe('경신');
    expect(report.pillars.month.korean).toBe('무자');
    expect(report.warnings.map(({ code }) => code)).toContain(
      'PRE_STANDARD_TIME_LOCAL_MEAN_APPROXIMATION',
    );
  });

  test('지원 하한 양력 날짜가 속한 음력 1800년 날짜도 정규화 후 같은 결과로 왕복한다', () => {
    const birth = {
      time: { hour: 0, minute: 0 },
      timeZone: 'Asia/Seoul',
    } as const;
    const gregorian = calculateSaju({
      birth: {
        ...birth,
        date: { calendar: 'gregorian', year: 1801, month: 1, day: 1 },
      },
    });

    expect(gregorian.chronology.koreanLunarDate).toEqual({
      calendar: 'korean-lunar',
      year: 1800,
      month: 11,
      day: 17,
      monthKind: 'regular',
    });

    const lunar = calculateSaju({
      birth: {
        ...birth,
        date: gregorian.chronology.koreanLunarDate,
      },
    });

    expect(lunar.chronology.gregorianDate).toEqual(gregorian.chronology.gregorianDate);
    expect(lunar.chronology.instantUtc).toBe(gregorian.chronology.instantUtc);
    expect(lunar.pillars).toEqual(gregorian.pillars);
  });

  test('입력 참조를 결과에 보관하지 않고 반환 보고서를 런타임에서도 동결한다', () => {
    const date = {
      calendar: 'gregorian' as const,
      year: 1992,
      month: 10,
      day: 24,
    };
    const report = calculateSaju({
      birth: {
        date,
        time: { hour: 5, minute: 30 },
        timeZone: 'Asia/Seoul',
      },
    });

    date.year = 2000;
    expect(report.chronology.inputDate.year).toBe(1992);
    expect(report.chronology.gregorianDate.year).toBe(1992);
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.pillars.year)).toBe(true);
  });

  test.each([
    [null, 'INVALID_REQUEST'],
    [{}, 'INVALID_REQUEST'],
    [{ birth: {} }, 'INVALID_REQUEST'],
    [
      {
        birth: {
          date: { calendar: 'julian', year: 1992, month: 10, day: 24 },
          time: { hour: 5, minute: 30 },
          timeZone: 'Asia/Seoul',
        },
      },
      'INVALID_DATE',
    ],
    [
      {
        birth: {
          date: { calendar: 'gregorian', year: 1992, month: 10, day: 24 },
          time: { hour: 5, minute: 30 },
          timeZone: 'Asia/Seoul',
        },
        rules: { ziHourPolicy: 'tomorrow' },
      },
      'INVALID_RULE',
    ],
    [
      {
        birth: {
          date: { calendar: 'gregorian', year: 1992, month: 10, day: 24 },
          time: { hour: 5, minute: 30 },
          timeZone: 'Asia/Seoul',
        },
        rules: {
          dayHourClock: {
            kind: 'local-apparent-solar',
            longitudeDegreesEast: 127,
            equationOfTime: 'sometimes',
          },
        },
      },
      'INVALID_RULE',
    ],
  ])('잘못된 런타임 요청 %#을 TypeError 대신 기계 판독 오류로 반환한다', (request, code) => {
    const result = tryCalculateSaju(request as SajuRequest);
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error).toBeInstanceOf(SajuError);
    expect(result.error.code).toBe(code);
    expect(JSON.parse(JSON.stringify(result.error))).toMatchObject({
      name: 'SajuError',
      code,
      message: expect.any(String),
    });
  });

  test('오류 세부정보에 BigInt나 순환 참조가 들어와도 결과 union을 JSON으로 직렬화한다', () => {
    const invalidDate: Record<string, unknown> = {
      calendar: 1n,
      year: 1992,
      month: 10,
      day: 24,
    };
    invalidDate.self = invalidDate;
    const result = tryCalculateSaju({
      birth: {
        date: invalidDate,
        time: { hour: 5, minute: 30 },
        timeZone: 'Asia/Seoul',
      },
    } as unknown as SajuRequest);

    expect(result.ok).toBe(false);
    expect(() => JSON.stringify(result)).not.toThrow();
    expect(JSON.parse(JSON.stringify(result))).toMatchObject({
      ok: false,
      error: {
        name: 'SajuError',
        code: 'INVALID_DATE',
        message: expect.any(String),
      },
    });
  });
});

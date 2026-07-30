import { describe, expect, test } from 'vitest';
import type { SajuRequest } from '../auditable/types';
import { isSajuError } from '../errors';
import { calculateSajuDailyTransit } from '../timing';

const SEOUL_NATAL: SajuRequest = {
  birth: {
    date: { calendar: 'gregorian', year: 1992, month: 10, day: 24 },
    time: { hour: 5, minute: 30 },
    timeZone: 'Asia/Seoul',
  },
};

describe('calculateSajuDailyTransit', () => {
  test('현지 정오의 일진과 원국 네 기둥 사이의 원시 관계를 감사 가능한 사실로 반환한다', () => {
    const report = calculateSajuDailyTransit({
      natalRequest: SEOUL_NATAL,
      date: { calendar: 'gregorian', year: 2026, month: 6, day: 28 },
    });

    expect(report).toMatchObject({
      schemaVersion: '1',
      date: { calendar: 'gregorian', year: 2026, month: 6, day: 28 },
      representative: {
        policy: 'local-civil-noon',
        localTime: '12:00:00.000',
        civilDateTime: '2026-06-28T12:00:00.000',
        instantUtc: '2026-06-28T03:00:00.000Z',
        timeZone: 'Asia/Seoul',
        offsetSeconds: 32_400,
      },
      pillars: {
        year: { korean: '병오', hanja: '丙午' },
        month: { korean: '갑오', hanja: '甲午' },
        day: { korean: '계유', hanja: '癸酉' },
      },
      tenGods: {
        year: { stem: '정재', branch: '편재' },
        month: { stem: '상관', branch: '편재' },
        day: { stem: '비견', branch: '편인' },
      },
      relationships: {
        stemCombinations: [],
        branchCombinations: [],
        branchClashes: [
          {
            positions: ['transit-day', 'natal-hour'],
            members: ['유', '묘'],
            direction: 'mutual',
          },
        ],
        branchPunishments: [
          {
            positions: ['transit-day', 'natal-day'],
            members: ['유', '유'],
            direction: 'self',
            kind: 'self',
          },
        ],
        branchBreaks: [],
        branchHarms: [
          {
            positions: ['transit-day', 'natal-month'],
            members: ['유', '술'],
            direction: 'mutual',
          },
        ],
      },
      audit: {
        timingMethod: 'local-civil-noon-daily-transit-v1',
        representativeInstantPolicy: 'local-civil-noon',
        relationshipMethod: 'raw-pillar-pair-tables-v1',
        interpretationScope: 'deterministic-facts-only',
        inheritedRules: {
          ziHourPolicy: 'civilMidnight',
          dayHourClock: 'civil',
          longitudeDegreesEast: null,
          equationOfTime: null,
        },
      },
    });
    expect(report.notes.join(' ')).toContain('scores');
    expect(report.notes.join(' ')).toContain('predictions');
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.relationships.branchClashes)).toBe(true);
    expect(() => JSON.parse(JSON.stringify(report))).not.toThrow();
  });

  test('원국의 자시 정책과 진태양시 규약을 상속하고 형의 방향을 보존한다', () => {
    const report = calculateSajuDailyTransit({
      natalRequest: {
        ...SEOUL_NATAL,
        rules: {
          ziHourPolicy: 'ziStart',
          dayHourClock: {
            kind: 'local-apparent-solar',
            longitudeDegreesEast: 127,
            equationOfTime: 'apply',
          },
        },
      },
      date: { calendar: 'gregorian', year: 2026, month: 6, day: 21 },
    });

    expect(report.pillars).toMatchObject({
      year: { korean: '병오' },
      month: { korean: '갑오' },
      day: { korean: '병인' },
    });
    expect(report.audit.inheritedRules).toEqual({
      ziHourPolicy: 'ziStart',
      dayHourClock: 'local-apparent-solar',
      longitudeDegreesEast: 127,
      equationOfTime: 'apply',
    });
    expect(report.representative).toMatchObject({
      policy: 'local-civil-noon',
      civilDateTime: '2026-06-21T12:00:00.000',
      dayHourClock: 'local-apparent-solar',
    });
    expect(report.representative.solarTimeCorrection).not.toBeNull();
    expect(report.relationships.branchPunishments).toContainEqual({
      positions: ['transit-day', 'natal-year'],
      members: ['인', '신'],
      direction: 'natal-to-transit',
      kind: 'directed-cycle',
    });
    expect(report.relationships.branchClashes).toContainEqual({
      positions: ['transit-day', 'natal-year'],
      members: ['인', '신'],
      direction: 'mutual',
    });
  });

  test.each([
    {
      date: { calendar: 'gregorian' as const, year: 2026, month: 2, day: 29 },
      code: 'INVALID_DATE',
      path: ['date'],
    },
    {
      date: {
        calendar: 'korean-lunar' as unknown as 'gregorian',
        year: 2026,
        month: 1,
        day: 1,
      },
      code: 'INVALID_DATE',
      path: ['date', 'calendar'],
    },
    {
      date: { calendar: 'gregorian' as const, year: 2101, month: 1, day: 1 },
      code: 'UNSUPPORTED_DATE_RANGE',
      path: ['date', 'year'],
    },
  ])('잘못된 현지 일진 날짜를 거부한다: $date', ({ date, code, path }) => {
    try {
      calculateSajuDailyTransit({ natalRequest: SEOUL_NATAL, date });
      throw new Error('expected calculateSajuDailyTransit to reject the date');
    } catch (error) {
      expect(isSajuError(error)).toBe(true);
      expect(error).toMatchObject({ code, path });
    }
  });

  test('누락되거나 exact가 아닌 원국 요청을 거부한다', () => {
    for (const request of [
      {},
      {
        natalRequest: {
          birth: {
            date: { calendar: 'gregorian', year: 1992, month: 10, day: 24 },
            time: { kind: 'unknown' },
            timeZone: 'Asia/Seoul',
          },
        },
        date: { calendar: 'gregorian', year: 2026, month: 6, day: 28 },
      },
    ]) {
      try {
        calculateSajuDailyTransit(request as never);
        throw new Error('expected calculateSajuDailyTransit to reject the natal request');
      } catch (error) {
        expect(isSajuError(error)).toBe(true);
      }
    }
  });
});

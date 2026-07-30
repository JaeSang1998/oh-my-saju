import { findSolarTermBoundary } from 'saju-engine/advanced';
import { describe, expect, expectTypeOf, test } from 'vitest';
import type { EarthlyBranch, HeavenlyStem } from 'saju-engine';
import {
  calculateLiurenChart,
  calculateLiurenCore,
  heavenBranchAbove,
  resolveMonthGeneral,
} from './index';
import type { LiurenRequest } from './types';

const PROFILE = {
  id: 'liuren-quanshu-nine-gates' as const,
  version: '1.0.0' as const,
  monthGeneralBoundary: 'middle-qi-instant-inclusive' as const,
  shehaiTieBreak: 'depth-then-season-position-then-day-side' as const,
};

function utcRequestAt(epochMilliseconds: number): LiurenRequest['subject'] {
  const instant = new Date(epochMilliseconds);
  return {
    birth: {
      date: {
        calendar: 'gregorian',
        year: instant.getUTCFullYear(),
        month: instant.getUTCMonth() + 1,
        day: instant.getUTCDate(),
      },
      time: {
        hour: instant.getUTCHours(),
        minute: instant.getUTCMinutes(),
        second: instant.getUTCSeconds(),
        millisecond: instant.getUTCMilliseconds(),
      },
      timeZone: 'UTC',
    },
    rules: {
      ziHourPolicy: 'civilMidnight',
      dayHourClock: { kind: 'civil' },
    },
  };
}

describe('calculateLiurenCore', () => {
  test('雨水 뒤 亥將을 午시에 얹은 천반 오라클을 재현한다', () => {
    expect(heavenBranchAbove('오', '해', '오')).toBe('해');
    expect(heavenBranchAbove('미', '해', '오')).toBe('자');
  });

  test('《六壬大全》 丁卯日 丑時 亥將 섭해 예를 계산 추적으로 재현한다', () => {
    const result = calculateLiurenCore({
      dayStem: '정',
      dayBranch: '묘',
      hourBranch: '축',
      monthGeneral: '해',
    });

    expect(result.rulePath).toContain('涉害');
    expect(result.threeTransmissions).toEqual(['해', '유', '미']);
    expect(result.shehaiCandidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ upper: '해', depth: 5 }),
        expect.objectContaining({ upper: '축', depth: 1 }),
      ]),
    );
  });

  test('乙丑 복음에서 직접 賊克 후보를 초전으로 삼고 형의 연쇄를 잇는다', () => {
    const result = calculateLiurenCore({
      dayStem: '을',
      dayBranch: '축',
      hourBranch: '자',
      monthGeneral: '자',
    });

    expect(result.directControlCandidates).toEqual([
      expect.objectContaining({
        upper: '진',
        direction: 'lower-controls-upper',
      }),
    ]);
    expect(result.rulePath).toEqual(['伏吟', '賊克', '下賊上']);
    expect(result.threeTransmissions).toEqual(['진', '진', '술']);
  });

  test('60일주 × 12월장 × 12시지 8,640국이 모두 세 전으로 끝난다', () => {
    const stems = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const;
    const branches = [
      '자',
      '축',
      '인',
      '묘',
      '진',
      '사',
      '오',
      '미',
      '신',
      '유',
      '술',
      '해',
    ] as const;
    const paths = new Set<string>();
    const rules = new Set<string>();

    for (let cycleIndex = 0; cycleIndex < 60; cycleIndex += 1) {
      const dayStem = stems[cycleIndex % 10]!;
      const dayBranch = branches[cycleIndex % 12]!;
      for (const monthGeneral of branches) {
        for (const hourBranch of branches) {
          const result = calculateLiurenCore({
            dayStem,
            dayBranch,
            hourBranch,
            monthGeneral,
          });
          expect(result.threeTransmissions).toHaveLength(3);
          expect(result.threeTransmissions.every((branch) => branches.includes(branch))).toBe(true);
          paths.add(result.rulePath.join('>'));
          result.rulePath.forEach((rule) => rules.add(rule));
        }
      }
    }

    expect(paths.size).toBeGreaterThanOrEqual(7);
    expect([...rules]).toEqual(
      expect.arrayContaining([
        '伏吟',
        '返吟',
        '賊克',
        '比用',
        '涉害',
        '遙克',
        '井欄',
        '昴星',
        '別責',
        '八專',
      ]),
    );
    expect(rules.has('不備歸一')).toBe(false);
  });
});

describe('calculateLiurenChart', () => {
  test.each([
    [1, '자'],
    [3, '해'],
    [5, '술'],
    [7, '유'],
    [9, '신'],
    [11, '미'],
    [13, '오'],
    [15, '사'],
    [17, '진'],
    [19, '묘'],
    [21, '인'],
    [23, '축'],
  ] as const)('중기 index %i의 정확한 순간부터 월장 %s를 적용한다', (termIndex, expected) => {
    const boundary = findSolarTermBoundary(2024, termIndex);
    expect(resolveMonthGeneral(boundary.epochMilliseconds).branch).toBe(expected);
    expect(resolveMonthGeneral(boundary.epochMilliseconds - 1).branch).not.toBe(expected);
  });

  test('사주 코어의 일주·시지와 중기 월장을 소비하고 감사 흔적을 동결한다', () => {
    const instant = findSolarTermBoundary(2024, 3).epochMilliseconds;
    const report = calculateLiurenChart({
      kind: 'liuren',
      subject: utcRequestAt(instant),
      profile: PROFILE,
    });

    expect(report.kind).toBe('liuren');
    expect(report.value.monthGeneral).toBe('해');
    expect(report.value.threeTransmissions).toHaveLength(3);
    expectTypeOf(report.kind).toEqualTypeOf<'liuren'>();
    expect(report.audit).toMatchObject({
      module: { id: 'liuren', version: '1.0.0' },
      profile: { id: 'liuren-quanshu-nine-gates', version: '1.0.0' },
      implementation: 'oh-my-saju-independent',
      implicitAdjustments: [],
      predictiveValidity: 'not-established',
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
        calendar: 'gregorian',
        year: 2024,
      },
      gregorianDate: {
        calendar: 'gregorian',
        year: 2024,
      },
      koreanLunarDate: {
        calendar: 'korean-lunar',
      },
      civilDateTime: expect.any(String),
      instantUtc: expect.any(String),
      epochMilliseconds: instant,
      timeZone: 'UTC',
      offsetSeconds: 0,
      effectiveDay: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/u),
      dayHourDateTime: expect.any(String),
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
    const subject = utcRequestAt(findSolarTermBoundary(2024, 3).epochMilliseconds);
    expect(() =>
      calculateLiurenChart({
        kind: 'liuren',
        subject: { ...subject, rules } as never,
        profile: PROFILE,
      }),
    ).toThrowError(
      expect.objectContaining({
        code: 'MISSING_EXPLICIT_POLICY',
        path: ['subject', 'rules', missingPolicy],
      }),
    );
  });

  test('지원하지 않는 월장 경계 정책을 암묵 보정하지 않는다', () => {
    const subject = utcRequestAt(findSolarTermBoundary(2024, 3).epochMilliseconds);
    expect(() =>
      calculateLiurenChart({
        kind: 'liuren',
        subject,
        profile: { ...PROFILE, monthGeneralBoundary: 'lunar-month' as never },
      }),
    ).toThrow(/monthGeneralBoundary/u);
  });
});

// Keep the public core input types honest at the test boundary.
const _typeCheck: {
  readonly dayStem: HeavenlyStem;
  readonly dayBranch: EarthlyBranch;
} = { dayStem: '갑', dayBranch: '자' };
void _typeCheck;

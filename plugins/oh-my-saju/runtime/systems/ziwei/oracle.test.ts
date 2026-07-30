import { describe, expect, test } from 'vitest';
import type { EarthlyBranch, SajuRequest } from 'saju-engine';
import { calculateZiweiChart, locateZiweiStar } from './index';
import type { ZiweiRequest } from './types';

const PROFILE = {
  id: 'ziwei-quanshu-core' as const,
  version: '1.0.0' as const,
  leapMonthPolicy: 'whole-leap-as-next-month' as const,
  birthYearBoundary: 'lunar-new-year' as const,
};

/**
 * 《紫微斗數全書》 권2의 오국별 1~30일 자미 위치표를 행 단위로 옮긴 독립 fixture.
 *
 * 이 표는 런타임의 locateZiweiStar 수식이나 공유 상수에서 생성하지 않는다. 구현 수식이
 * 바뀌어도 이 150개 고정 셀이 별도의 회귀 오라클로 남아야 한다.
 */
const ZIWEI_BRANCH_BY_BUREAU_AND_LUNAR_DAY = {
  2: [
    '축',
    '인',
    '인',
    '묘',
    '묘',
    '진',
    '진',
    '사',
    '사',
    '오',
    '오',
    '미',
    '미',
    '신',
    '신',
    '유',
    '유',
    '술',
    '술',
    '해',
    '해',
    '자',
    '자',
    '축',
    '축',
    '인',
    '인',
    '묘',
    '묘',
    '진',
  ],
  3: [
    '진',
    '축',
    '인',
    '사',
    '인',
    '묘',
    '오',
    '묘',
    '진',
    '미',
    '진',
    '사',
    '신',
    '사',
    '오',
    '유',
    '오',
    '미',
    '술',
    '미',
    '신',
    '해',
    '신',
    '유',
    '자',
    '유',
    '술',
    '축',
    '술',
    '해',
  ],
  4: [
    '해',
    '진',
    '축',
    '인',
    '자',
    '사',
    '인',
    '묘',
    '축',
    '오',
    '묘',
    '진',
    '인',
    '미',
    '진',
    '사',
    '묘',
    '신',
    '사',
    '오',
    '진',
    '유',
    '오',
    '미',
    '사',
    '술',
    '미',
    '신',
    '오',
    '해',
  ],
  5: [
    '오',
    '해',
    '진',
    '축',
    '인',
    '미',
    '자',
    '사',
    '인',
    '묘',
    '신',
    '축',
    '오',
    '묘',
    '진',
    '유',
    '인',
    '미',
    '진',
    '사',
    '술',
    '묘',
    '신',
    '사',
    '오',
    '해',
    '진',
    '유',
    '오',
    '미',
  ],
  6: [
    '유',
    '오',
    '해',
    '진',
    '축',
    '인',
    '술',
    '미',
    '자',
    '사',
    '인',
    '묘',
    '해',
    '신',
    '축',
    '오',
    '묘',
    '진',
    '자',
    '유',
    '인',
    '미',
    '진',
    '사',
    '축',
    '술',
    '묘',
    '신',
    '사',
    '오',
  ],
} as const satisfies Readonly<Record<2 | 3 | 4 | 5 | 6, readonly EarthlyBranch[]>>;

/**
 * 《全書》의 “寅起正月, 順數至生月, 逆數生時安命/順數生時安身”을
 * 12개월×12시진 고정 셀로 펼친 독립 fixture. 문자열의 각 글자는
 * 子·丑·寅…亥 시진 순서의 기대 궁지다.
 */
const LIFE_AND_BODY_PALACE_BY_MONTH = [
  { month: 1, life: '인축자해술유신미오사진묘', body: '인묘진사오미신유술해자축' },
  { month: 2, life: '묘인축자해술유신미오사진', body: '묘진사오미신유술해자축인' },
  { month: 3, life: '진묘인축자해술유신미오사', body: '진사오미신유술해자축인묘' },
  { month: 4, life: '사진묘인축자해술유신미오', body: '사오미신유술해자축인묘진' },
  { month: 5, life: '오사진묘인축자해술유신미', body: '오미신유술해자축인묘진사' },
  { month: 6, life: '미오사진묘인축자해술유신', body: '미신유술해자축인묘진사오' },
  { month: 7, life: '신미오사진묘인축자해술유', body: '신유술해자축인묘진사오미' },
  { month: 8, life: '유신미오사진묘인축자해술', body: '유술해자축인묘진사오미신' },
  { month: 9, life: '술유신미오사진묘인축자해', body: '술해자축인묘진사오미신유' },
  { month: 10, life: '해술유신미오사진묘인축자', body: '해자축인묘진사오미신유술' },
  { month: 11, life: '자해술유신미오사진묘인축', body: '자축인묘진사오미신유술해' },
  { month: 12, life: '축자해술유신미오사진묘인', body: '축인묘진사오미신유술해자' },
] as const;

const HOUR_BRANCH_MIDPOINTS = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22] as const;

function explicitRules(): NonNullable<SajuRequest['rules']> {
  return {
    ziHourPolicy: 'civilMidnight',
    dayHourClock: { kind: 'civil' },
  };
}

function lunarRequest(
  year: number,
  month: number,
  day: number,
  monthKind: 'regular' | 'leap',
  hour: number,
  minute = 0,
): ZiweiRequest {
  return {
    kind: 'ziwei',
    subject: {
      birth: {
        date: { calendar: 'korean-lunar', year, month, day, monthKind },
        time: { hour, minute },
        timeZone: 'Asia/Seoul',
      },
      rules: explicitRules(),
    },
    profile: PROFILE,
  };
}

function gregorianRequest(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): ZiweiRequest {
  return {
    kind: 'ziwei' as const,
    subject: {
      birth: {
        date: { calendar: 'gregorian' as const, year, month, day },
        time: { hour, minute },
        timeZone: 'Asia/Seoul',
      },
      rules: explicitRules(),
    },
    profile: PROFILE,
  };
}

describe('Zi Wei independent regression oracle', () => {
  test('원전 일자표 5국×30일의 150개 자미 위치 셀과 전수 대조한다', () => {
    let comparedCells = 0;

    for (const bureauNumber of [2, 3, 4, 5, 6] as const) {
      const expectedRow = ZIWEI_BRANCH_BY_BUREAU_AND_LUNAR_DAY[bureauNumber];
      expect(expectedRow).toHaveLength(30);

      for (const [dayIndex, expectedBranch] of expectedRow.entries()) {
        expect(locateZiweiStar(bureauNumber, dayIndex + 1).branch).toBe(expectedBranch);
        comparedCells += 1;
      }
    }

    expect(comparedCells).toBe(150);
  });

  test('원전 명·신궁 12개월×12시진의 288개 독립 셀과 전수 대조한다', () => {
    let comparedCells = 0;

    for (const fixture of LIFE_AND_BODY_PALACE_BY_MONTH) {
      const expectedLifeBranches = [...fixture.life] as EarthlyBranch[];
      const expectedBodyBranches = [...fixture.body] as EarthlyBranch[];
      expect(expectedLifeBranches).toHaveLength(12);
      expect(expectedBodyBranches).toHaveLength(12);

      for (const [hourIndex, hour] of HOUR_BRANCH_MIDPOINTS.entries()) {
        const report = calculateZiweiChart(
          lunarRequest(2000, fixture.month, 1, 'regular', hour, 30),
        );
        expect(report.value.lifePalaceBranch).toBe(expectedLifeBranches[hourIndex]);
        expect(report.value.bodyPalaceBranch).toBe(expectedBodyBranches[hourIndex]);
        comparedCells += 2;
      }
    }

    expect(comparedCells).toBe(288);
  });
});

describe('Zi Wei lunar and time boundary gates', () => {
  test('윤월 전체를 다음 달로 보내며 같은 번호의 평달과 섞지 않는다', () => {
    const regular = calculateZiweiChart(lunarRequest(2028, 5, 2, 'regular', 0, 30));
    const leap = calculateZiweiChart(lunarRequest(2028, 5, 2, 'leap', 0, 30));

    expect(regular.value.normalizedLunarDate).toMatchObject({
      year: 2028,
      month: 5,
      day: 2,
      isLeapMonth: false,
      effectiveMonth: 5,
    });
    expect(leap.value.normalizedLunarDate).toMatchObject({
      year: 2028,
      month: 5,
      day: 2,
      isLeapMonth: true,
      effectiveMonth: 6,
    });
    expect(regular.value.lifePalaceBranch).toBe('오');
    expect(leap.value.lifePalaceBranch).toBe('미');
  });

  test('음력 설이 되는 자정 전후의 연·월·일을 서로 다른 입력으로 보존한다', () => {
    const before = calculateZiweiChart(gregorianRequest(2000, 2, 4, 23, 59));
    const atBoundary = calculateZiweiChart(gregorianRequest(2000, 2, 5, 0, 0));

    expect(before.value.normalizedLunarDate).toMatchObject({
      year: 1999,
      month: 12,
      day: 29,
      isLeapMonth: false,
    });
    expect(atBoundary.value.normalizedLunarDate).toMatchObject({
      year: 2000,
      month: 1,
      day: 1,
      isLeapMonth: false,
    });
    expect(before.value.lunarYearStem).toBe('기');
    expect(atBoundary.value.lunarYearStem).toBe('경');
  });

  test.each([
    { hour: 0, minute: 59, branch: '자' },
    { hour: 1, minute: 0, branch: '축' },
    { hour: 22, minute: 59, branch: '해' },
    { hour: 23, minute: 0, branch: '자' },
  ] as const)('$hour:$minute 시진 경계를 $branch로 고정한다', ({ hour, minute, branch }) => {
    const report = calculateZiweiChart(lunarRequest(2000, 1, 1, 'regular', hour, minute));

    expect(report.audit.trace.hourBranch).toBe(branch);
  });

  test.each([
    { month: 0, day: 1 },
    { month: 13, day: 1 },
    { month: 1, day: 0 },
    { month: 1, day: 31 },
  ])('존재할 수 없는 음력 $month월 $day일을 보정하지 않는다', ({ month, day }) => {
    expect(() => calculateZiweiChart(lunarRequest(2000, month, day, 'regular', 0, 30))).toThrow();
  });
});

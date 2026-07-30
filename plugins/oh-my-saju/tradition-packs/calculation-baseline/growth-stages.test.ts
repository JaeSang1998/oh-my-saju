import type { EarthlyBranch, HeavenlyStem } from 'saju-engine';
import { describe, expect, test } from 'vitest';
import { calculateKoreanSajuAnalysis } from '../../runtime/traditions';
import { EARTHLY_BRANCHES, HEAVENLY_STEMS } from '../../runtime/traditions/domain';
import { GROWTH_STAGE_PROFILE_V1, growthStageFor, type GrowthStage } from './growth-stages';

const LITERAL_ORACLE: Readonly<Record<HeavenlyStem, readonly GrowthStage[]>> = {
  갑: ['목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양', '장생'],
  을: ['병', '쇠', '제왕', '건록', '관대', '목욕', '장생', '양', '태', '절', '묘', '사'],
  병: ['태', '양', '장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절'],
  정: ['절', '묘', '사', '병', '쇠', '제왕', '건록', '관대', '목욕', '장생', '양', '태'],
  무: ['태', '양', '장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절'],
  기: ['절', '묘', '사', '병', '쇠', '제왕', '건록', '관대', '목욕', '장생', '양', '태'],
  경: ['사', '묘', '절', '태', '양', '장생', '목욕', '관대', '건록', '제왕', '쇠', '병'],
  신: ['장생', '양', '태', '절', '묘', '사', '병', '쇠', '제왕', '건록', '관대', '목욕'],
  임: ['제왕', '쇠', '병', '사', '묘', '절', '태', '양', '장생', '목욕', '관대', '건록'],
  계: ['건록', '관대', '목욕', '장생', '양', '태', '절', '묘', '사', '병', '쇠', '제왕'],
};

describe('calculation-baseline 십이운성', () => {
  test('명시된 음간 역행·토간 화간 추종 표를 10간 × 12지 전수로 고정한다', () => {
    expect(GROWTH_STAGE_PROFILE_V1).toEqual({
      id: 'day-stem-yin-reverse-earth-follows-fire-v1',
      subject: 'day-stem',
      yinStemDirection: 'reverse',
      earthStemMapping: 'follows-fire',
      interpretation: 'raw-stage-only',
    });

    for (const stem of HEAVENLY_STEMS) {
      for (const [index, branch] of EARTHLY_BRANCHES.entries()) {
        expect(
          growthStageFor(stem as HeavenlyStem, branch as EarthlyBranch),
          `${stem}-${branch}`,
        ).toBe(LITERAL_ORACLE[stem as HeavenlyStem][index]);
      }
    }
  });

  test('한국 기본 분석은 일간 기준 각 지지의 원시 단계와 프로필 ID를 노출한다', () => {
    const result = calculateKoreanSajuAnalysis({
      kind: 'exact',
      request: {
        birth: {
          date: { calendar: 'gregorian', year: 1996, month: 5, day: 27 },
          time: { hour: 6, minute: 50 },
          timeZone: 'Asia/Seoul',
        },
      },
    });
    const finding = result.baseline.interpretation.findings.find(
      ({ ruleId }) => ruleId === 'core.growth-stages',
    );

    expect(finding).toMatchObject({
      topic: 'growth-stages',
      category: 'structural-observation',
      stability: 'stable',
      coverage: 'complete',
      omittedPillars: [],
      values: {
        profileId: 'day-stem-yin-reverse-earth-follows-fire-v1',
        subject: 'day-stem',
        dayStem: '갑',
        interpretation: 'raw-stage-only',
        stages: {
          year: { branch: '자', stage: '목욕' },
          month: { branch: '사', stage: '병' },
          day: { branch: '자', stage: '목욕' },
          hour: { branch: '묘', stage: '제왕' },
        },
        knownPillars: ['year', 'month', 'day', 'hour'],
        omittedPillars: [],
      },
      sourceReferenceIds: ['sanming-tonghui-growth-stages-v1'],
    });
    expect(finding?.statement).toContain('연지 자=목욕');
    expect(finding?.statement).toContain('월지 사=병');
    expect(finding?.statement).toContain('일지 자=목욕');
    expect(finding?.statement).toContain('시지 묘=제왕');
    expect(finding?.statement).toContain('길흉이나 강약을 판정하지 않습니다');
    expect(finding?.values).not.toHaveProperty('meaning');
    expect(finding?.values).not.toHaveProperty('strength');
    expect(finding?.values).not.toHaveProperty('auspiciousness');
  });

  test('생시 미상은 시주를 합성하지 않고 연·월·일 단계만 partial로 반환한다', () => {
    const result = calculateKoreanSajuAnalysis({
      kind: 'possibilities',
      request: {
        birth: {
          date: { calendar: 'gregorian', year: 1996, month: 5, day: 27 },
          time: { kind: 'unknown' },
          timeZone: 'Asia/Seoul',
        },
      },
    });
    const finding = result.baseline.interpretation.findings.find(
      ({ ruleId }) => ruleId === 'core.growth-stages',
    );

    expect(finding).toMatchObject({
      coverage: 'partial',
      omittedPillars: ['hour'],
      values: {
        stages: {
          year: { branch: '자', stage: '목욕' },
          month: { branch: '사', stage: '병' },
          day: { branch: '자', stage: '목욕' },
        },
        knownPillars: ['year', 'month', 'day'],
        omittedPillars: ['hour'],
      },
    });
    expect(finding?.statement).toContain('연지 자=목욕');
    expect(finding?.statement).toContain('월지 사=병');
    expect(finding?.statement).toContain('일지 자=목욕');
    expect(finding?.statement).not.toContain('시지');
    expect(finding?.values.stages).not.toHaveProperty('hour');
    expect(finding?.statement).toContain('시주는 포함하지 않았습니다');
  });
});

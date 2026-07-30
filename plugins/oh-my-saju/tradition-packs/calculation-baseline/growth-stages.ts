/** Explicit L2 convention table for day-stem 十二運 observations. */
import type { EarthlyBranch, HeavenlyStem } from 'saju-engine';
import { deepFreeze } from '../../runtime/internal/deep-freeze';
import { assertEarthlyBranch, assertHeavenlyStem } from '../../runtime/traditions/domain';

export type GrowthStage =
  | '장생'
  | '목욕'
  | '관대'
  | '건록'
  | '제왕'
  | '쇠'
  | '병'
  | '사'
  | '묘'
  | '절'
  | '태'
  | '양';

export const GROWTH_STAGE_SOURCE_ID = 'sanming-tonghui-growth-stages-v1';

export const GROWTH_STAGE_PROFILE_V1 = deepFreeze({
  id: 'day-stem-yin-reverse-earth-follows-fire-v1',
  subject: 'day-stem',
  yinStemDirection: 'reverse',
  earthStemMapping: 'follows-fire',
  interpretation: 'raw-stage-only',
} as const);

/**
 * Branch order is 子·丑·寅·卯·辰·巳·午·未·申·酉·戌·亥.
 *
 * The table uses the profile above: yin stems run in reverse, 戊 follows 丙,
 * and 己 follows 丁. It deliberately assigns no luck, strength, or life-stage
 * meaning to a lookup result.
 */
export const GROWTH_STAGE_TABLE_V1: Readonly<
  Record<HeavenlyStem, Readonly<Record<EarthlyBranch, GrowthStage>>>
> = deepFreeze({
  갑: {
    자: '목욕',
    축: '관대',
    인: '건록',
    묘: '제왕',
    진: '쇠',
    사: '병',
    오: '사',
    미: '묘',
    신: '절',
    유: '태',
    술: '양',
    해: '장생',
  },
  을: {
    자: '병',
    축: '쇠',
    인: '제왕',
    묘: '건록',
    진: '관대',
    사: '목욕',
    오: '장생',
    미: '양',
    신: '태',
    유: '절',
    술: '묘',
    해: '사',
  },
  병: {
    자: '태',
    축: '양',
    인: '장생',
    묘: '목욕',
    진: '관대',
    사: '건록',
    오: '제왕',
    미: '쇠',
    신: '병',
    유: '사',
    술: '묘',
    해: '절',
  },
  정: {
    자: '절',
    축: '묘',
    인: '사',
    묘: '병',
    진: '쇠',
    사: '제왕',
    오: '건록',
    미: '관대',
    신: '목욕',
    유: '장생',
    술: '양',
    해: '태',
  },
  무: {
    자: '태',
    축: '양',
    인: '장생',
    묘: '목욕',
    진: '관대',
    사: '건록',
    오: '제왕',
    미: '쇠',
    신: '병',
    유: '사',
    술: '묘',
    해: '절',
  },
  기: {
    자: '절',
    축: '묘',
    인: '사',
    묘: '병',
    진: '쇠',
    사: '제왕',
    오: '건록',
    미: '관대',
    신: '목욕',
    유: '장생',
    술: '양',
    해: '태',
  },
  경: {
    자: '사',
    축: '묘',
    인: '절',
    묘: '태',
    진: '양',
    사: '장생',
    오: '목욕',
    미: '관대',
    신: '건록',
    유: '제왕',
    술: '쇠',
    해: '병',
  },
  신: {
    자: '장생',
    축: '양',
    인: '태',
    묘: '절',
    진: '묘',
    사: '사',
    오: '병',
    미: '쇠',
    신: '제왕',
    유: '건록',
    술: '관대',
    해: '목욕',
  },
  임: {
    자: '제왕',
    축: '쇠',
    인: '병',
    묘: '사',
    진: '묘',
    사: '절',
    오: '태',
    미: '양',
    신: '장생',
    유: '목욕',
    술: '관대',
    해: '건록',
  },
  계: {
    자: '건록',
    축: '관대',
    인: '목욕',
    묘: '장생',
    진: '양',
    사: '태',
    오: '절',
    미: '묘',
    신: '사',
    유: '병',
    술: '쇠',
    해: '제왕',
  },
});

export function growthStageFor(stem: HeavenlyStem, branch: EarthlyBranch): GrowthStage {
  assertHeavenlyStem(stem, '십이운성 기준 천간');
  assertEarthlyBranch(branch, '십이운성 대상 지지');
  return GROWTH_STAGE_TABLE_V1[stem][branch];
}

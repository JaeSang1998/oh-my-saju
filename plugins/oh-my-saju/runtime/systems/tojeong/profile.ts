import { deepFreeze } from '../../internal/deep-freeze';
import type {
  TraditionalSystemLimitation,
  TraditionalSystemPolicySelection,
  TraditionalSystemProfile,
} from '../shared';
import type { Tojeong144Conventions } from './types';

export const TOJEONG_144_CONVENTIONS_V1 = deepFreeze({
  profileId: 'tojeong-number-144',
  profileVersion: '1.0.0',
  countingAge: 'target-year-minus-normalized-lunar-birth-year-plus-one',
  targetDate: 'same-regular-korean-lunar-month-and-day',
  yearBoundary: 'explicit-target-year',
  monthGanzhi: 'target-lunar-month-number',
} satisfies Tojeong144Conventions);

export const TOJEONG_144_PROFILE = deepFreeze({
  id: 'tojeong-number-144',
  version: '1.0.0',
  displayName: 'Tojeong 144 number mechanics',
  outputBoundary: 'casting-mechanics',
  sources: [
    {
      id: 'yamazato-ryukyu-reisen',
      title: '琉球の霊籤について',
      work: '琉球大学法文学部紀要 日本東洋文化論集 12',
      editionOrSnapshot: '日本東洋文化論集 제12호, repository record 2002227',
      url: 'https://u-ryukyu.repo.nii.ac.jp/record/2002227/files/No12p187-213.pdf',
      locator: 'pp. 200–203, especially table 1 on p. 201',
      textualLayer: 'modern-research',
      verification: 'scan-verified',
    },
    {
      id: 'aks-tojeong-overview',
      title: '토정비결',
      work: '한국민족문화대백과사전',
      editionOrSnapshot: '한국민족문화대백과사전 온라인 항목 E0059207',
      url: 'https://encykorea.aks.ac.kr/Article/E0059207',
      locator: 'upper/middle/lower construction and 48-of-64 classification',
      textualLayer: 'modern-research',
      verification: 'transcription-reviewed',
    },
    {
      id: 'tojeong-2023-worked-example',
      title: '2023 Tojeong worked numeric example',
      work: '2023 토정비결 공개 미리보기',
      editionOrSnapshot: 'YES24 상품 116992201 공개 미리보기 snapshot',
      url: 'https://www.yes24.com/product/goods/116992201#book_inside',
      locator: 'age 31, lunar 3/8, result 663',
      textualLayer: 'modern-research',
      verification: 'partially-verified',
    },
  ],
} satisfies TraditionalSystemProfile);

export const TOJEONG_144_POLICIES = deepFreeze([
  {
    id: 'counting-age',
    version: '1.0.0',
    value: TOJEONG_144_CONVENTIONS_V1.countingAge,
  },
  {
    id: 'target-date',
    version: '1.0.0',
    value: TOJEONG_144_CONVENTIONS_V1.targetDate,
  },
  {
    id: 'year-boundary',
    version: '1.0.0',
    value: TOJEONG_144_CONVENTIONS_V1.yearBoundary,
  },
  {
    id: 'month-ganzhi',
    version: '1.0.0',
    value: TOJEONG_144_CONVENTIONS_V1.monthGanzhi,
  },
  {
    id: 'target-day-pillar-clock',
    version: '1.0.0',
    value: 'Asia/Seoul-local-civil-noon-with-civil-midnight-day-boundary',
  },
  {
    id: 'leap-month-birth',
    version: '1.0.0',
    value: 'reject-without-explicit-future-profile',
  },
  {
    id: 'nonexistent-target-lunar-day',
    version: '1.0.0',
    value: 'reject-without-repair',
  },
] satisfies readonly TraditionalSystemPolicySelection[]);

export const TOJEONG_144_LIMITATIONS = deepFreeze([
  {
    id: 'counting-age-lunar-year-convention',
    message:
      'V1 computes counting age from the saju-engine-normalized Korean lunar birth year; Gregorian input year and caller-supplied age are different future profiles.',
  },
  {
    id: 'month-ganzhi-lunar-number-convention',
    message:
      'V1 derives month ganzhi from the explicit target year stem and lunar month number; it does not substitute the Saju Jie-season month pillar.',
  },
  {
    id: 'leap-month-convention-unresolved',
    message: 'This profile rejects births normalized to a Korean lunar leap month.',
  },
  {
    id: 'target-day-repair-unresolved',
    message:
      'When lunar birth day 30 does not exist in the target lunar month, this profile rejects the request instead of truncating or rolling it.',
  },
  {
    id: 'explicit-year-boundary',
    message:
      'The caller supplies targetYear explicitly; the profile does not infer a year boundary from today, lunar New Year, or Ipchun.',
  },
  {
    id: 'interpretation-corpus-not-shipped',
    message:
      'No 144-entry interpretation corpus is included pending a single-edition transcription and rights review.',
  },
  {
    id: 'traditional-attribution-not-authorship',
    message:
      'The work is traditionally attributed to 李之菡; this report does not assert authorship of the received method.',
  },
  {
    id: 'predictive-validity-not-established',
    message: 'No predictive validity for real-world events has been established.',
  },
] satisfies readonly TraditionalSystemLimitation[]);

import { deepFreeze } from '../../internal/deep-freeze';
import type { TraditionalSystemProfile } from '../shared';

export const ELECTION_MODULE_V1 = deepFreeze({
  id: 'election',
  version: '1.0.0',
  schemaVersion: '1',
} as const);

export const NAM_BYEONG_GIL_ELECTIONAL_PROFILE_V1: TraditionalSystemProfile = deepFreeze({
  id: 'nam-byeong-gil-electional',
  version: '1.0.0',
  displayName: '남병길 《선택기요》 택일 사실(검증 범위)',
  outputBoundary: 'classical-rule-matches',
  sources: [
    {
      id: 'selection-1867-officer-path-relations-v1',
      title: '《選擇紀要》 상편',
      work: '選擇紀要',
      editionOrSnapshot: '1867 간행본 계열; Wikisource 상편 공개 전사 profile-1.0.0 snapshot',
      url: 'https://zh.wikisource.org/zh-hant/選擇紀要/上編',
      locator: '十二建除, 黃黑道, 六禮, 入宅 항목',
      textualLayer: 'public-transcription',
      verification: 'transcription-reviewed',
    },
    {
      id: 'xieji-qing-month-break-v1',
      title: '《欽定協紀辨方書》 절월·월파 규칙',
      work: '欽定協紀辨方書',
      editionOrSnapshot: '四庫全書本; Wikisource 공개 전사 profile-1.0.0 snapshot',
      url: 'https://zh.wikisource.org/zh-hant/欽定協紀辨方書_(四庫全書本)',
      locator: '월건·월파와 절입 월표',
      textualLayer: 'public-transcription',
      verification: 'partially-verified',
    },
  ],
});

export const OH_MY_SAJU_ELECTION_RANKING_POLICY_V1 = deepFreeze({
  id: 'oh-my-saju-election-ranking',
  version: '1.0.0',
  base: 50,
  clamp: { minimum: 0, maximum: 100 },
  weights: {
    yellowPath: 4,
    monthBreak: -16,
    participantYearBranch: {
      combination: 0,
      clash: -10,
      harm: -6,
      punishment: -4,
    },
    officer: {
      daily: {
        establish: 0,
        remove: 0,
        full: 0,
        balance: 0,
        settle: 0,
        hold: 0,
        break: 0,
        danger: 0,
        complete: 0,
        receive: 0,
        open: 0,
        close: 0,
      },
      wedding: {
        establish: -12,
        remove: 4,
        full: 0,
        balance: -6,
        settle: 4,
        hold: 4,
        break: -12,
        danger: 4,
        complete: 8,
        receive: -6,
        open: 8,
        close: -12,
      },
      moving: {
        establish: 0,
        remove: 0,
        full: 0,
        balance: 0,
        settle: 0,
        hold: 0,
        break: 0,
        danger: 0,
        complete: 4,
        receive: 0,
        open: 4,
        close: -12,
      },
    },
  },
  scoreMeaning:
    '오마이사주 v1 후보 정렬에 쓰는 가산 지표. 성공률, 길운 확률, 신뢰도, 사건 예측값이 아님',
  tieBreak: [
    'schedule-constraint-satisfied-desc',
    'negative-classical-match-count-asc',
    'score-desc',
    'date-asc',
  ],
} as const);

export const ELECTION_LIMITATIONS_V1 = deepFreeze([
  {
    id: 'election-ranking-not-probability',
    message:
      '정렬 점수는 후보의 순서를 정하려고 만든 값입니다. 성공률·길운 확률·경험적 예측값이나 고전에 나오는 숫자가 아닙니다.',
  },
  {
    id: 'election-local-noon-representative',
    message:
      '요청에 명시한 참가자 시간대의 현지 시각 정오를 각 날짜의 대표 순간으로 삼습니다. 하루 내내 같은 결과가 나온다는 뜻은 아닙니다.',
  },
  {
    id: 'election-shared-participant-zone-v1',
    message:
      'v1에서는 일진 계산의 시간대 기준을 맞추기 위해 모든 참가자의 요청 시간대와 후보 시간대를 같게 받습니다.',
  },
  {
    id: 'election-move-in-direction-excluded-v1',
    message:
      'v1의 이사(`moving`)는 입주·이삿짐 반입을 뜻합니다. 건축·수리·토목의 산향·방위 규칙을 현대 주소의 이동 방향에 대입하지 않습니다.',
  },
  {
    id: 'election-unverified-virtue-tables-excluded-v1',
    message: '영인본 대조가 끝나지 않은 육덕·음양불장 등 표는 추측하거나 점수에 사용하지 않습니다.',
  },
  {
    id: 'election-combination-unweighted-v1',
    message:
      '참가자 연지와 후보 일지의 합은 기둥 관계로 표시합니다. 다만 v1 조사에서 검증된 숫자 가중치가 없어 점수에는 0점으로 반영합니다.',
  },
]);

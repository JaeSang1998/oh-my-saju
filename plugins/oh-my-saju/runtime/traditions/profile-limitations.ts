/** Safe display messages for Pack limitations. */
import { deepFreeze } from '../internal/deep-freeze';
import type { ProfileLimitationId } from './types';

export const PROFILE_LIMITATIONS_V1: Readonly<Record<ProfileLimitationId, string>> = deepFreeze({
  'synthetic-element-balance-not-strength':
    '오행 비율은 시각화를 위한 현대 합성 지표이며 신강·신약 판정이 아닙니다.',
  'raw-relationships-no-fortune':
    '관계는 합·충·형·파·해·삼합의 원시 위치 일치만 제공하며 성립 강도나 길흉을 판단하지 않습니다.',
  'structural-profile-no-doctrine':
    '이 프로필의 내장 finding은 원국·오행·음양·십신·관계·십이운성 원시 단계·공망의 구조 계산으로 구성됩니다.',
  'doctrine-not-scientifically-validated':
    '이 해석 규칙은 전통 문헌을 재현한 것으로 현실 예측의 과학적 타당성이 확립되지 않았습니다.',
  'ziping-candidate-not-complete-pattern':
    '월령과 투간으로 격국 후보만 만들며 사령·성패·구응을 모두 판정한 최종 격국이 아닙니다.',
  'ditianshui-evidence-no-strength-verdict':
    '계절·통근·생조·설극모 증거를 나눠 보여 줄 뿐 신강·신약을 확정하지 않습니다.',
  'qiongtong-candidates-no-final-useful-god':
    '공개 전사를 옮긴 일간·월령 조후 후보표입니다. 대표 5개 fixture(7개 월 셀) 외에는 기준 판면 대조가 남아 있으며, 격국·억부 용신과 병합한 최종 용신 판정은 아직 구현되지 않았습니다.',
  'sanming-symbolic-raw-observation-only':
    '출전이 확인된 연지 기준 역마 표의 원시 일치만 표시하며, 생시 미상은 전체 부재로 확정하지 않고 길흉·성격·이동·여행·사건을 해석하거나 예측하지 않습니다.',
});

export const PROFILE_LIMITATION_ID_SET: ReadonlySet<string> = new Set(
  Object.keys(PROFILE_LIMITATIONS_V1),
);

export function profileLimitationMessage(id: ProfileLimitationId): string {
  return PROFILE_LIMITATIONS_V1[id];
}

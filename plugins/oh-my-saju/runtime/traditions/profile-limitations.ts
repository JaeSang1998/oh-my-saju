/** Safe display messages for Pack limitations. */
import { deepFreeze } from '../internal/deep-freeze';
import type { ProfileLimitationId } from './types';

export const PROFILE_LIMITATIONS_V1: Readonly<Record<ProfileLimitationId, string>> = deepFreeze({
  'synthetic-element-balance-not-strength':
    '오행 비율은 시각화에 쓰는 현대 합성 지표로, 신강·신약을 판정한 값이 아닙니다.',
  'raw-relationships-no-fortune':
    '합·충·형·파·해·삼합 가운데 기둥 위치가 일치하는 관계만 보여 줍니다. 성립 강도와 길흉은 판단하지 않습니다.',
  'structural-profile-no-doctrine':
    '이 프로필에 담긴 근거는 원국·오행·음양·십신·기둥 관계·십이운성의 기본 단계·공망을 계산한 결과입니다.',
  'doctrine-not-scientifically-validated':
    '전통 문헌을 옮긴 해석 규칙입니다. 실제 사건을 맞힌다고 과학적으로 검증된 규칙은 아닙니다.',
  'ziping-candidate-not-complete-pattern':
    '월령과 투간으로 격국 후보만 만들며 사령·성패·구응을 모두 판정한 최종 격국이 아닙니다.',
  'ditianshui-evidence-no-strength-verdict':
    '계절·통근·생조·설극모의 근거를 나눠 보여 줄 뿐, 신강·신약은 확정하지 않습니다.',
  'qiongtong-candidates-no-final-useful-god':
    '공개 전사를 옮긴 일간·월령별 조후 후보표입니다. 대표 대조 사례 5개(월별 항목 7개)만 기준 판면과 확인을 마쳤습니다. 격국·억부 용신을 합친 최종 용신 판정도 아직 구현되지 않았습니다.',
  'sanming-symbolic-raw-observation-only':
    '출전이 확인된 연지·일간 기준 신살표에서 지지가 일치하는 경우만 표시합니다. 생시를 모를 때는 해당 신살이 하나도 없다고 단정하지 않습니다. 함지의 천간·납음 자격과 양인 두 정의의 충돌을 임의로 해결하지 않으며, 길흉·성격·사건도 해석하거나 예측하지 않습니다.',
});

export const PROFILE_LIMITATION_ID_SET: ReadonlySet<string> = new Set(
  Object.keys(PROFILE_LIMITATIONS_V1),
);

export function profileLimitationMessage(id: ProfileLimitationId): string {
  return PROFILE_LIMITATIONS_V1[id];
}

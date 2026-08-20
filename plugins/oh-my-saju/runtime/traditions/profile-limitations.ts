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
    '월령과 투간으로 격을 정하고 이 관법의 상신·파격 표로 성패까지 판정합니다. 상신은 이 관법 안의 용신이며, 유파 간 최종 격국과 최종 용신은 확정하지 않습니다.',
  'ditianshui-evidence-no-strength-verdict':
    '이 관법의 배점 기준으로 강약을 판정하며, 유파 간 최종 신강·신약은 확정하지 않습니다.',
  'xingchong-resolution-no-fortune':
    '방합·삼합·육합·천간합과 충·형의 성립 여부, 합화 조건, 충이 눌리는지를 이 관법의 표와 순서로만 계산합니다. 유파마다 기준이 다르며 길흉이나 사건은 판단하지 않습니다.',
  'qiongtong-candidates-no-final-useful-god':
    '공개 전사를 옮긴 일간·월령별 조후 후보표입니다. 대표 대조 사례 5개(월별 항목 7개)만 기준 판면과 확인을 마쳤습니다. 후보의 투간·뿌리를 따져 이 팩 기준 1순위까지는 정하지만, 격국·억부를 합친 유파 간 최종 용신은 확정하지 않습니다.',
  'sanming-symbolic-raw-observation-only':
    '출전이 확인된 연지·일간 기준 신살표에서 지지가 일치하는 경우만 표시합니다. 생시를 모를 때는 해당 신살이 하나도 없다고 단정하지 않습니다. 함지의 천간·납음 자격과 양인 두 정의의 충돌을 임의로 해결하지 않으며, 길흉·성격·사건도 해석하거나 예측하지 않습니다. 원진·귀문은 원전 대조를 마치지 않은 통용표이며, 여섯 쌍 가운데 네 쌍만 겹치므로 두 표를 합치지 않고 따로 대조합니다.',
});

export const PROFILE_LIMITATION_ID_SET: ReadonlySet<string> = new Set(
  Object.keys(PROFILE_LIMITATIONS_V1),
);

export function profileLimitationMessage(id: ProfileLimitationId): string {
  return PROFILE_LIMITATIONS_V1[id];
}

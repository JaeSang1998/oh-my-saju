/** Ditianshui Tradition Pack profile declaration. */
import { deepFreeze } from '../../runtime/internal/deep-freeze';
import type { JsonValue, TraditionRuleProfile } from '../../runtime/traditions/types';
import {
  DITIANSHUI_ENGINE_RECONSTRUCTION_REFERENCE_V1,
  DITIANSHUI_KOREAN_METHODS_REFERENCE_V1,
  DITIANSHUI_STRENGTH_REFERENCE_V1,
  SANMING_SEASONAL_STATE_REFERENCE_V1,
} from './sources';

export const DITIANSHUI_STRENGTH_EVIDENCE_PARAMETERS_V1: Readonly<Record<string, JsonValue>> =
  deepFreeze({
    seasonalStateTable: 'five-phases-wang-xiang-xiu-qiu-si-v1',
    earthTransitionPolicy: 'four-season-endings',
    supportEvidence: ['same-element', 'resource-element', 'hidden-root'],
    oppositionEvidence: ['output-element', 'wealth-element', 'officer-element'],
    numericVerdict: 'none',
    outputStatus: 'evidence-ledger-no-strength-verdict',
  });

export const DITIANSHUI_STRENGTH_EVIDENCE_PROFILE_V1: TraditionRuleProfile = deepFreeze({
  schemaVersion: '1',
  id: 'ditianshui-strength-evidence',
  version: '1.0.0',
  displayName: '삼명통회 계절표·적천수 왕쇠 증거 장부',
  school: 'ditianshui-strength-flow-reconstruction',
  textualLayer: 'reconstruction',
  status: 'stable',
  enabledRuleIds: ['ditianshui.seasonal-state', 'ditianshui.support-ledger'],
  supportedTopics: ['strength'],
  references: [
    DITIANSHUI_STRENGTH_REFERENCE_V1,
    SANMING_SEASONAL_STATE_REFERENCE_V1,
    DITIANSHUI_ENGINE_RECONSTRUCTION_REFERENCE_V1,
    DITIANSHUI_KOREAN_METHODS_REFERENCE_V1,
  ],
  parameters: DITIANSHUI_STRENGTH_EVIDENCE_PARAMETERS_V1,
  knownLimitations: [
    'doctrine-not-scientifically-validated',
    'ditianshui-evidence-no-strength-verdict',
  ],
});

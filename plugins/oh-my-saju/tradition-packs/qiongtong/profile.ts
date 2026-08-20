/** Qiongtong Tradition Pack profile declaration. */
import { deepFreeze } from '../../runtime/internal/deep-freeze';
import type { JsonValue, TraditionRuleProfile } from '../../runtime/traditions/types';
import {
  QIONGTONG_CLIMATE_REFERENCE_V1,
  QIONGTONG_ENGINE_RECONSTRUCTION_REFERENCE_V1,
  QIONGTONG_KOREAN_METHODS_REFERENCE_V1,
} from './sources';

export const QIONGTONG_CLIMATE_PARAMETERS_V1: Readonly<Record<string, JsonValue>> = deepFreeze({
  lookupTable: 'qiongtong-day-stem-month-branch-candidates-v1',
  monthBasis: 'solar-term-month-branch',
  outputScope: 'candidate-stems-presence-and-source-status',
  sourceVerifiedScope: 'five-curated-fixtures-covering-seven-cells',
  sourceVerifiedCells: '7-of-120-scan-collated',
  baseTextCorrectedCells: '4-of-120-jia-wei-ding-chen-xin-you-gui-wu',
  cellVerificationDisclosure: 'every-candidate-statement-declares-cell-verification',
  functionTags: 'source-explicit-only-null-when-not-explicit',
  conditionalOutcomeRules: 'transcribed-not-evaluated-for-curated-fixtures',
  climateBaselineTable: 'qiongtong-climate-baseline-v1',
  climateIndexStatus: 'modern-reconstruction-not-classical',
  hiddenStemTable: 'qiongtong-hidden-stems-v1',
  conditionEvaluation: 'transparency-and-branch-root-v1',
  conditionRootBasis: 'same-element-in-branch-hidden-stems',
  climatePriorityTieBreak: 'candidate-state-then-transcribed-order',
  transcribedOrderMeaning: 'pack-local-tie-break-only-not-a-source-ranking',
  climateGradeAxis: 'temperature-only-moisture-is-display-only',
  climatePriorityScope: 'pack-local-not-plugin-final-useful-god',
  outputStatus: 'pack-local-climate-priority-not-cross-school-final',
});

export const QIONGTONG_CLIMATE_PROFILE_V1: TraditionRuleProfile = deepFreeze({
  schemaVersion: '1',
  id: 'qiongtong-climate',
  version: '1.2.0',
  displayName: '궁통보감 조후 후보',
  school: 'qiongtong-baojian-climate-reconstruction',
  textualLayer: 'reconstruction',
  status: 'stable',
  enabledRuleIds: [
    'qiongtong.climate-candidates',
    'qiongtong.climate-tendency',
    'qiongtong.candidate-condition',
    'qiongtong.pack-climate-priority',
  ],
  supportedTopics: ['useful-god', 'season-climate'],
  references: [
    QIONGTONG_CLIMATE_REFERENCE_V1,
    QIONGTONG_ENGINE_RECONSTRUCTION_REFERENCE_V1,
    QIONGTONG_KOREAN_METHODS_REFERENCE_V1,
  ],
  parameters: QIONGTONG_CLIMATE_PARAMETERS_V1,
  knownLimitations: [
    'doctrine-not-scientifically-validated',
    'qiongtong-candidates-no-final-useful-god',
  ],
});

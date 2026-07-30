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
  functionTags: 'source-explicit-only-null-when-not-explicit',
  conditionalOutcomeRules: 'transcribed-not-evaluated-for-curated-fixtures',
  outputStatus: 'source-status-candidates-not-final',
});

export const QIONGTONG_CLIMATE_PROFILE_V1: TraditionRuleProfile = deepFreeze({
  schemaVersion: '1',
  id: 'qiongtong-climate',
  version: '1.0.0',
  displayName: '궁통보감 조후 후보',
  school: 'qiongtong-baojian-climate-reconstruction',
  textualLayer: 'reconstruction',
  status: 'stable',
  enabledRuleIds: ['qiongtong.climate-candidates'],
  supportedTopics: ['useful-god'],
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

/** Ziping Tradition Pack profile declaration. */
import { deepFreeze } from '../../runtime/internal/deep-freeze';
import type { JsonValue, TraditionRuleProfile } from '../../runtime/traditions/types';
import {
  ZIPING_KOREAN_METHODS_REFERENCE_V1,
  ZIPING_ENGINE_RECONSTRUCTION_REFERENCE_V1,
  ZIPING_MONTH_COMMAND_REFERENCE_V1,
} from './sources';

export const ZIPING_MONTH_COMMAND_PARAMETERS_V1: Readonly<Record<string, JsonValue>> = deepFreeze({
  monthHiddenStemTable: 'saju-engine-hidden-stems-v1',
  hiddenStemEnumeration: 'table-order-membership-not-strength-v1',
  transparencyDetection: 'year-month-hour-visible-stems-v1',
  candidatePriority: 'none',
  specialMonthPatternRecognition: ['建祿', '陽刃'],
  successDefeatRescueRules: 'not-implemented',
  outputStatus: 'candidate-or-indeterminate-not-final',
});

export const ZIPING_MONTH_COMMAND_PROFILE_V1: TraditionRuleProfile = deepFreeze({
  schemaVersion: '1',
  id: 'ziping-month-command',
  version: '1.0.0',
  displayName: '자평진전 월령·격국 후보',
  school: 'ziping-zhenquan-month-command-reconstruction',
  textualLayer: 'reconstruction',
  status: 'stable',
  enabledRuleIds: ['ziping.month-command', 'ziping.pattern-candidate'],
  supportedTopics: ['pattern'],
  references: [
    ZIPING_MONTH_COMMAND_REFERENCE_V1,
    ZIPING_ENGINE_RECONSTRUCTION_REFERENCE_V1,
    ZIPING_KOREAN_METHODS_REFERENCE_V1,
  ],
  parameters: ZIPING_MONTH_COMMAND_PARAMETERS_V1,
  knownLimitations: [
    'doctrine-not-scientifically-validated',
    'ziping-candidate-not-complete-pattern',
  ],
});

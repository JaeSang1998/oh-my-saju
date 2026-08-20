/** Ziping Tradition Pack profile declaration. */
import { deepFreeze } from '../../runtime/internal/deep-freeze';
import type { JsonValue, TraditionRuleProfile } from '../../runtime/traditions/types';
import {
  ZIPING_KOREAN_METHODS_REFERENCE_V1,
  ZIPING_ENGINE_RECONSTRUCTION_REFERENCE_V1,
  ZIPING_MONTH_COMMAND_REFERENCE_V1,
  ZIPING_YUELING_FENYE_REFERENCE_V1,
} from './sources';

export const ZIPING_MONTH_COMMAND_PARAMETERS_V1: Readonly<Record<string, JsonValue>> = deepFreeze({
  monthHiddenStemTable: 'yueling-fenye-yuanhai-v1',
  hiddenStemEnumeration: 'yueling-fenye-order-yuqi-jungqi-jeonggi-v1',
  transparencyDetection: 'year-month-hour-visible-stems-v1',
  candidatePriority: 'none',
  specialMonthPatternRecognition: ['建祿', '陽刃', '月劫'],
  successDefeatRescueRules: 'ziping-pattern-integrity-v1',
  patternIntegrityTable: 'ziping-pattern-integrity-v1',
  patternPriority: 'main-qi-first',
  patternPriorityAlternatives: ['commanding-first'],
  peerMonthBranchHandling: 'lu-blade-peer-excluded-from-inner-eight-patterns',
  peerTransparencyHandling: 'peer-transparency-never-establishes-inner-eight-pattern',
  yangBladeScope: 'yang-day-stems-only-no-yin-blade',
  reliefAbsentBasis: 'relief-gods-transparent-in-heavenly-stems-only',
  reliefGodRootBasis: 'pack-local-yueling-fenye-branch-hidden-stems',
  rescueTableStatus: 'pack-reconstruction-not-source-transcribed',
  reliefGodScope: 'pack-local-not-plugin-final-useful-god',
  monthCommandDayTable: 'yueling-fenye-yuanhai-v1',
  outputStatus: 'pack-local-pattern-and-relief-god-not-cross-school-final',
});

export const ZIPING_MONTH_COMMAND_PROFILE_V1: TraditionRuleProfile = deepFreeze({
  schemaVersion: '1',
  id: 'ziping-month-command',
  version: '1.2.0',
  displayName: '자평진전 월령·격국 후보',
  school: 'ziping-zhenquan-month-command-reconstruction',
  textualLayer: 'reconstruction',
  status: 'stable',
  enabledRuleIds: [
    'ziping.month-command',
    'ziping.pattern-candidate',
    'ziping.governing-day',
    'ziping.pattern-integrity',
    'ziping.pattern-relief-god',
  ],
  supportedTopics: ['pattern', 'season-climate', 'useful-god'],
  references: [
    ZIPING_MONTH_COMMAND_REFERENCE_V1,
    ZIPING_ENGINE_RECONSTRUCTION_REFERENCE_V1,
    ZIPING_KOREAN_METHODS_REFERENCE_V1,
    ZIPING_YUELING_FENYE_REFERENCE_V1,
  ],
  parameters: ZIPING_MONTH_COMMAND_PARAMETERS_V1,
  knownLimitations: [
    'doctrine-not-scientifically-validated',
    'ziping-candidate-not-complete-pattern',
  ],
});

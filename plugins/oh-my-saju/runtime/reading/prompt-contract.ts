/** Versioned provider-facing narration and compact-presentation contract. */
import { deepFreeze } from '../internal/deep-freeze';

export const SAJU_NARRATION_PROMPT_TEMPLATE = deepFreeze({
  id: 'saju-grounded-narration',
  version: '5.0.0',
} as const);

export type SajuNarrationPromptTemplate = typeof SAJU_NARRATION_PROMPT_TEMPLATE;

export const SAJU_NARRATION_PRESENTATION_POLICY = deepFreeze({
  mode: 'chart-first-profile',
  format: 'chart-and-short-sections',
  maxParagraphSentences: 3,
  maxSections: 6,
  maxParagraphsPerSection: 3,
  maxNarrativeCharacters: 4_800,
  maxParagraphCharacters: 900,
  advancedDoctrine: 'only-when-explicitly-requested',
  neverEndWithLimitations: true,
  broadReading: {
    finalSelectionRequired: true,
    minimumDistinctParagraphs: 10,
    profileV2MinimumDistinctParagraphs: 7,
    legacyMinimumDistinctParagraphs: 9,
    maxSelectedParagraphCharacters: 460,
    maxPresentationCharacters: 3_800,
    structuredLivedPatternRequired: false,
    structuredEvidenceBridgeRequired: true,
  },
} as const);

export type SajuNarrationPresentationPolicy = typeof SAJU_NARRATION_PRESENTATION_POLICY;

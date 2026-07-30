/** Versioned provider-facing narration and compact-presentation contract. */
import { deepFreeze } from '../internal/deep-freeze';

export const SAJU_NARRATION_PROMPT_TEMPLATE = deepFreeze({
  id: 'saju-grounded-narration',
  version: '3.0.0',
} as const);

export type SajuNarrationPromptTemplate = typeof SAJU_NARRATION_PROMPT_TEMPLATE;

export const SAJU_NARRATION_PRESENTATION_POLICY = deepFreeze({
  mode: 'compact-layperson',
  format: 'sectioned-bullets',
  maxParagraphSentences: 2,
  maxSections: 4,
  maxParagraphsPerSection: 2,
  maxNarrativeCharacters: 2_400,
  maxParagraphCharacters: 800,
  advancedDoctrine: 'only-when-explicitly-requested',
  neverEndWithLimitations: true,
  broadReading: {
    finalSelectionRequired: true,
    minimumDistinctParagraphs: 9,
    maxSelectedParagraphCharacters: 240,
    maxPresentationCharacters: 1_000,
    structuredLivedPatternRequired: true,
  },
} as const);

export type SajuNarrationPresentationPolicy = typeof SAJU_NARRATION_PRESENTATION_POLICY;

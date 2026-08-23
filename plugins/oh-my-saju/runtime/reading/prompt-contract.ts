/** Versioned provider-facing narration and compact-presentation contract. */
import { deepFreeze } from '../internal/deep-freeze';

export const SAJU_NARRATION_PROMPT_TEMPLATE = deepFreeze({
  id: 'saju-grounded-narration',
  version: '7.0.0',
} as const);

export type SajuNarrationPromptTemplate = typeof SAJU_NARRATION_PROMPT_TEMPLATE;

/**
 * A provider-facing, complete Korean-output pass. Keep this policy in the
 * narration request so Korean clarity is a delivery requirement, not merely
 * host-side editorial advice.
 */
export const SAJU_FLUENT_KOREAN_WRITING_POLICY = deepFreeze({
  id: 'fluent-korean-full-output-pass',
  version: '1.0.0',
  required: true,
  passPosition: 'before-validation',
  ruleSet: 'fluent-korean',
  scope: {
    applyTo: 'all-user-facing-korean-prose',
    exclude: ['quoted-source-text', 'code', 'code-comments', 'JSON-keys', 'finding-ids'],
  },
  instructions: [
    'Apply every fluent-korean rule to the completed Korean answer; do not replace this pass with a short checklist.',
    'Apply this policy to Korean prose only. Keep foreign-language text when needed and exclude quoted sources, code, code comments, JSON keys, and finding IDs.',
    'Use established Korean translations or transliterations for proper names and technical terms; otherwise preserve the source term.',
    "Do not imitate the user's fragments, typos, slang, or sentence omissions.",
    'Keep every meaning-bearing sentence component. Do not overuse the possessive particle 의 in a way that hides the actor, action, condition, or relation.',
    'Except for headings and list labels, end every Korean sentence with a predicate and final ending, never a noun, adverbial phrase, or connective ending.',
    'Keep particles and endings whenever they clarify a relationship; do not shorten by omitting a needed subject, object, condition, auxiliary, or pre-final ending.',
    'Prefer a concrete Sino-Korean term with natural Korean syntax over a noun stack or compressed phrase.',
    "Use ordinary words where ordinary words are needed. Do not use unestablished metaphors, translated consulting language, or abstract nouns as the actor of a person's life.",
    'Avoid em dashes in user-facing Korean. Use a colon or a connective that states the relation between the chart basis and its meaning.',
    'Apply the same full pass to Korean instructions sent to another agent and to Korean prose received from another agent before it reaches the user.',
  ],
} as const);

export type SajuFluentKoreanWritingPolicy = typeof SAJU_FLUENT_KOREAN_WRITING_POLICY;

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

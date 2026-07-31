/** Local schema used to constrain narration output. */
import { deepFreeze } from '../internal/deep-freeze';
import { SAJU_NARRATION_PRESENTATION_POLICY } from './prompt-contract';

export const SAJU_NARRATIVE_TITLE = '사주 해석';

export const SAJU_TOPIC_TITLES = deepFreeze({
  'chart-overview': '원국 개요',
  'day-master': '일간',
  'five-elements': '오행 분포',
  'yin-yang': '음양 분포',
  'ten-gods': '십신',
  relationships: '합·충 등 기둥 관계',
  'void-branches': '공망',
  strength: '신강·신약',
  pattern: '격국',
  'useful-god': '용신',
  'growth-stages': '십이운성',
  'luck-cycles': '대운·세운',
  'symbolic-stars': '신살',
  compatibility: '궁합',
  timing: '시기',
} as const);

/** Provider-facing prose contract with mandatory package finding references. */
export const SAJU_NARRATIVE_JSON_SCHEMA = deepFreeze({
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://saju-engine.local/schemas/ai-narrative-v3.json',
  title: 'Saju finding-referenced narrative',
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'sections'],
  properties: {
    summary: { $ref: '#/$defs/paragraph' },
    sections: {
      type: 'array',
      maxItems: SAJU_NARRATION_PRESENTATION_POLICY.maxSections,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['topic', 'paragraphs'],
        properties: {
          topic: { enum: Object.keys(SAJU_TOPIC_TITLES) },
          paragraphs: {
            type: 'array',
            minItems: 1,
            maxItems: SAJU_NARRATION_PRESENTATION_POLICY.maxParagraphsPerSection,
            items: { $ref: '#/$defs/paragraph' },
          },
        },
      },
    },
  },
  $defs: {
    paragraph: {
      type: 'object',
      additionalProperties: false,
      required: ['text', 'findingIds'],
      properties: {
        text: {
          type: 'string',
          minLength: 1,
          maxLength: SAJU_NARRATION_PRESENTATION_POLICY.maxParagraphCharacters,
        },
        findingIds: {
          type: 'array',
          minItems: 1,
          maxItems: 16,
          uniqueItems: true,
          items: {
            type: 'string',
            minLength: 1,
            maxLength: 240,
            pattern: '^[A-Za-z0-9_.@:-]+$',
          },
        },
      },
    },
  },
} as const);

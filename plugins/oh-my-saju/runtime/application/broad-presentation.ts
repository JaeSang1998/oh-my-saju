/** Validate selected Pack prose and render the fixed Korean broad-reading layout. */
import type { SajuBirthDate, SajuPillarName } from 'saju-engine';
import { deepFreeze } from '../internal/deep-freeze';
import { isRecord } from '../internal/guards';
import { assertSafeIdentifier } from '../reading/option-validation';
import { SAJU_TOPIC_TITLES } from '../reading/output-contract';
import { SAJU_NARRATION_PRESENTATION_POLICY } from '../reading/prompt-contract';
import { getBranchTenGod, getTenGod } from '../traditions/domain';
import type {
  AiSajuComparisonPackReading,
  AiSajuComparisonServiceResult,
  SajuNarrativeParagraph,
} from '../reading/types';
import type { InterpretationTopic, TraditionPackRef } from '../traditions/types';
import { OhMySajuApplicationError } from './errors';
import type {
  OhMySajuBroadPresentation,
  OhMySajuConclusionRef,
  OhMySajuDefaultProfileDraft,
  OhMySajuLegacyBroadPresentationDraft,
  OhMySajuLivedPatternRef,
  OhMySajuParagraphRef,
  OhMySajuParagraphSource,
  OhMySajuPortraitRef,
  OhMySajuProfileParagraphRef,
  OhMySajuProfileSectionRole,
  OhMySajuProfileThesisRef,
} from './types';

const PILLAR_POSITIONS = [
  'year',
  'month',
  'day',
  'hour',
] as const satisfies readonly SajuPillarName[];
const SITUATION_END_PATTERN =
  /(?:할 때|일 때|될 때|때는|때에|때|하면|다면|으면|면|할수록|일수록|수록|경우|상황|에서는|에서도)$/u;
const GENERIC_SITUATION_PATTERN =
  /^(?:(?:새로운|낯선|어려운|힘든|좋은|나쁜|중요한|여러|다양한|어떤)\s*)?(?:상황|경우|삶|일상|평소)(?:에서는|에서도|라면|이면|일 때)?$/u;
const BEHAVIOR_PATTERN = /(?:고|며|면서|해서|하여|해|하고|하려|하는|는|찾아|하면|습니다)$/u;
const RESULT_PATTERN = /(?:니다|됩니다|집니다|납니다|수 있습니다)$/u;
const SPECIFIC_BEHAVIOR_PATTERN =
  /(?:살피|훑|비교|정리|설명|검토|찾|잡|나누|구조화|밀고|미루|조율|확인|분리|질문|기록|완성|집중|추진|맞추|바꾸|연결|말하|대응|점검|압축|구분|조정|우선순위|계획|기다리|재확인|분석|합의|결정|시작|마무리)/u;
const SPECIFIC_RESULT_PATTERN =
  /(?:늦|빨라|길어|짧아|줄|늘|높|낮|살아|흐려|분명|놓치|오해|마무리|완성도|성과|부담|갈등|안정|집중|정확|효율|지연|막히|소진|과해|압박)/u;
const BENEFIT_RESULT_PATTERN =
  /(?:(?:속도|완성도|성과|안정|집중|정확도?|효율|힘|강점|실행|결론|방향|기준)[^.?!\n]{0,16}(?:빨라|높|살아|분명|좋아|향상|안정|잡|찾|정리|진행)|(?:오해|갈등|부담|누락|빠뜨림|지연|실수|소진|압박|비용|시간|기간|대기)[^.?!\n]{0,12}(?:줄|낮|덜|짧|막|피하))/u;
const COST_RESULT_PATTERN =
  /(?:(?:결정|마무리|실행|시작|진행|기준|방향)[^.?!\n]{0,18}(?:늦|길어|흐려|막히|놓치|미루|못)|(?:속도|완성도|성과|집중|정확도?|효율)[^.?!\n]{0,14}(?:낮|떨어|줄어)|(?:오해|갈등|부담|지연|실수|소진|압박|비용)[^.?!\n]{0,12}(?:늘|커|높|생기|쌓|과해)|(?:늦어|지연되|놓치|막히|소진되|과해지|압박이\s*커))/u;
const NEGATED_DIRECTION_PATTERN =
  /(?:지(?:는|도)?\s*(?:못|않)|안\s*(?:하|되|줄|높|낮|늘|살|잡|찾|막|피하)|못\s*(?:하|되|줄|높|낮|늘|살|잡|찾|막|피하)|않(?:습|아|았|을|는)|아니|아닙)/u;
const GENERIC_BARNUM_PATTERN =
  /(?:책임감|성실|신뢰|배려|열정|긍정|노력|리더십|인정받|주변\s*사람|충분히\s*생각|신중하게\s*판단|(?:더\s*)?좋은\s*(?:결과|선택)|최선의\s*선택|잘\s*(?:됩니다|풀립니다))/u;
const PORTRAIT_IDENTITY_PATTERN = /(?:사람|방식|성향|편입니다|편이다)/u;
const DOMAIN_PATTERNS = {
  disposition: /(?:정보|변수|맥락|관점|기준|생각|감정|관찰|낯선|문제|선택|판단)/u,
  execution: /(?:결정|실행|마감|속도|완주|시작|계획|우선순위|추진|준비|선택)/u,
  relationships: /(?:관계|사이|의견|대화|오해|갈등|상대|역할|합의|소통|말(?:을|로|하면|할))/u,
  'work-study': /(?:업무|직장|과제|공부|학습|시험|제출|자료|보고서|성과|완성도|프로젝트|피드백)/u,
} as const;
const PROFILE_ROLE_VALUES = new Set<OhMySajuProfileSectionRole>([
  'core',
  'strength',
  'blind-spot',
  'work',
  'money',
  'relationships',
]);
const PROFILE_BASIS_PATTERN =
  /(?:일간|월령|연지|월지|일지|시지|연주|월주|일주|시주|천간|지지|지장간|계절|사령|통근|뿌리|투간|반복|중첩|겹치|오행|음양|비견|겁재|인성|식상|상관|재성|정재|편재|관성|정관|편관|천간합|지지합|합충|충형|형파|파해|(?:봄|여름|가을|겨울|한겨울)(?:철|의)?|(?:목|화|토|금|수|나무|불|흙|쇠|물)(?:의|\s)?(?:기운|세력)|[갑을병정무기경신임계](?:목|화|토|금|수)|[자축인묘진사오미신유술해]월|[갑을병정무기경신임계][자축인묘진사오미신유술해])/u;
const MISFRAMED_SEASON_PATTERN =
  /(?:봄|여름|가을|겨울|계절)\s*(?:기운|기세)?[^.?!\n]{0,20}(?:환경|상황)(?:에서는|에서|일 때)/u;
const PRESENTATION_AUDIT_PATTERN =
  /(?:최종\s*(?:판정|확정)|확정할 수 없|과학적\s*타당성|현실\s*예측|프로필|\bfinding\b|\bpack\b)/iu;
const PROFILE_ROLE_PATTERNS = {
  work: /(?:업무|직업|직장|조직|프로젝트|과제|공부|학습|시험|기획|분석|창작|표현|전문성|결과물|성과|마감|실행|일하는|역할)/u,
  money: /(?:돈|재물|수입|지출|소비|저축|축적|현금|보상|비용|투자|자원|재정|경제|재성|정재|편재)/u,
  relationships:
    /(?:관계|상대|사람|가까운|대화|소통|의견|갈등|조언|통제|독립\s*영역|힘겨루기|연애|배우자|친구|동료)/u,
} as const;
const PROFILE_STRENGTH_PATTERN =
  /(?:강점|힘|유지|밀고|끝내|완주|집중|주도|독립|버티|붙들|파고들|흔들리지|선명|빠르|높|살아)/u;
const PROFILE_BLIND_SPOT_PATTERN =
  /(?:과해|늦|굳|간섭|갈등|힘겨루기|막히|고집|소진|압박|놓치|미루|부담|좁아|독단)/u;
const PROFILE_GENERIC_COACHING_PATTERN =
  /(?:여러\s*조건을\s*빠르게\s*읽|맥락과\s*논리를\s*함께\s*정리|판단\s*기준이\s*다를\s*때|이유를\s*먼저\s*공유|현재\s*환경의\s*규칙|실제\s*행동\s*기준|마무리\s*속도가\s*빨라|관계의\s*오해가\s*줄|결론을\s*잠시\s*보류|기준을\s*다시\s*비교|습관이\s*균형|서로의\s*(?:방식|결정\s*영역)[^.?!\n]{0,24}분명)/u;
const PROFILE_INTERNAL_JARGON_PATTERN =
  /(?:비겁\s*근거|(?:겉|속)장부|지장간\s*장부|표면에는[^.?!\n]{0,80}지장간에는|원시\s*일치|후보로\s*표시|명식\s*중심에\s*놓)/u;
const PROFILE_TRANSLATIONESE_PATTERN =
  /(?:현실적?\s*(?:결과|성과)[^.?!\n]{0,20}(?:흘려|이어|연결)|복원력으로\s*(?:쓰|작동)|자원을?\s*(?:빠르게\s*)?배치|이중\s*리듬|(?:판단|기준|강점|추진력)(?:이|가)\s*선명|거리(?:가|를)\s*(?:빨리\s*)?회복|(?:구조|흐름|통로|중심축)(?:이|가|은|는)?\s*(?:작동|완성|열리))/u;
const PROFILE_RELATIONSHIP_REACTION_PATTERN =
  /(?:가까워|친밀|신뢰|서운|감정|마음|오해|갈등|말을\s*줄|버티|밀어붙|거리(?:를|가)|회피|다투|화해|풀어|연애|가족|친구)/u;
const PROFILE_RECYCLED_CONCEPTS = [
  {
    id: 'self-direction',
    pattern:
      /(?:자기\s*(?:기준|판단|판단권|방식|동력)|스스로\s*납득|남의\s*속도|판단권을\s*(?:지키|넘기))/u,
  },
  {
    id: 'abstract-output',
    pattern: /(?:실제\s*(?:산출물|결과물)|현실\s*(?:결과|성과)|결과물로\s*(?:옮기|흘리))/u,
  },
  {
    id: 'expansive-processing',
    pattern:
      /(?:여러\s*(?:선택지|가능성)|가능한\s*경로|(?:선택지|경로)[^.?!\n]{0,20}(?:넓|많|늘)|(?:많은|여러)\s*(?:정보|자료|변수)|(?:정보|자료)[^.?!\n]{0,24}(?:넓|많|모으|흡수|재구성|분류|정리)|(?:판단|검토|관심)[^.?!\n]{0,16}(?:범위|넓|퍼지))/u,
  },
  {
    id: 'deliverable-output',
    pattern:
      /(?:산출물|결과물|프로토타입|첫\s*안|초안|표현과\s*성과|밖으로\s*(?:꺼내|흘려|내놓)|말[·,\s]*기획)/u,
  },
] as const;
const DEFAULT_PROFILE_TOPICS = new Set<InterpretationTopic>([
  'chart-overview',
  'day-master',
  'five-elements',
  'ten-gods',
  'relationships',
  'strength',
]);

type LivedPatternDomain = OhMySajuLivedPatternRef['structure']['domain'];
type LivedPatternDirection = OhMySajuLivedPatternRef['structure']['direction'];
type UncertaintyMarker = '△' | '◇' | '△◇';

interface ExpectedLivedPatternRole {
  readonly domains: readonly LivedPatternDomain[];
  readonly direction?: LivedPatternDirection;
}

interface ResolvedParagraphRef {
  readonly ref: OhMySajuParagraphRef;
  readonly refKey: string;
  readonly text: string;
  readonly findingIds: readonly string[];
  readonly topics: readonly InterpretationTopic[];
  readonly uncertaintyMarker: UncertaintyMarker | null;
}

interface ResolvedLivedPatternRef extends ResolvedParagraphRef {
  readonly structure: OhMySajuLivedPatternRef['structure'];
}

interface ResolvedBroadPresentation {
  readonly portrait: ResolvedParagraphRef;
  readonly atAGlance: {
    readonly disposition: ResolvedLivedPatternRef;
    readonly execution: ResolvedLivedPatternRef;
    readonly relationships: ResolvedLivedPatternRef;
  };
  readonly doubleEdge: {
    readonly strength: ResolvedLivedPatternRef;
    readonly friction: ResolvedLivedPatternRef;
  };
  readonly workStudy: readonly ResolvedLivedPatternRef[];
  readonly relationships: readonly ResolvedLivedPatternRef[];
  readonly conclusion: ResolvedParagraphRef;
}

interface ResolvedProfileParagraphRef extends ResolvedParagraphRef {
  readonly structure: OhMySajuProfileParagraphRef['structure'];
}

interface ResolvedProfileThesisRef extends ResolvedParagraphRef {
  readonly structure: OhMySajuProfileThesisRef['structure'];
}

interface ResolvedDefaultProfile {
  readonly thesis: ResolvedProfileThesisRef;
  readonly core: readonly [ResolvedProfileParagraphRef, ResolvedProfileParagraphRef];
  readonly temperament: {
    readonly strength: ResolvedProfileParagraphRef;
    readonly blindSpot: ResolvedProfileParagraphRef;
  };
  readonly work: readonly ResolvedProfileParagraphRef[];
  readonly money?: readonly ResolvedProfileParagraphRef[];
  readonly relationships: readonly ResolvedProfileParagraphRef[];
}

function fail(message: string, details: Readonly<Record<string, unknown>> = {}): never {
  throw new OhMySajuApplicationError('INVALID_PRESENTATION_DRAFT', message, { details });
}

function assertOnlyKeys(
  value: Readonly<Record<string, unknown>>,
  allowed: readonly string[],
  path: string,
): void {
  const allowedSet = new Set(allowed);
  if (Object.keys(value).some((key) => !allowedSet.has(key))) {
    fail(`${path} contains unsupported keys.`, { path });
  }
}

function copyPackRef(value: unknown, path: string): TraditionPackRef {
  if (!isRecord(value)) fail(`${path} must be an object.`, { path });
  assertOnlyKeys(value, ['id', 'version'], path);
  try {
    return {
      id: assertSafeIdentifier(value.id, `${path}.id`),
      version: assertSafeIdentifier(value.version, `${path}.version`),
    };
  } catch {
    fail(`${path} must identify a safe Tradition Pack.`, { path });
  }
}

function copySource(value: unknown, path: string): OhMySajuParagraphSource {
  if (!isRecord(value)) fail(`${path} must be an object.`, { path });
  if (value.kind === 'summary') {
    assertOnlyKeys(value, ['kind'], path);
    return { kind: 'summary' };
  }
  if (value.kind !== 'section') fail(`${path}.kind is not supported.`, { path });
  assertOnlyKeys(value, ['kind', 'topic', 'paragraphIndex'], path);
  if (
    typeof value.topic !== 'string' ||
    !(value.topic in SAJU_TOPIC_TITLES) ||
    (value.paragraphIndex !== 0 && value.paragraphIndex !== 1 && value.paragraphIndex !== 2)
  ) {
    fail(`${path} must select a supported section paragraph.`, { path });
  }
  return {
    kind: 'section',
    topic: value.topic as InterpretationTopic,
    paragraphIndex: value.paragraphIndex,
  };
}

function copyParagraphRef(value: unknown, path: string): OhMySajuParagraphRef {
  if (!isRecord(value)) fail(`${path} must be an object.`, { path });
  assertOnlyKeys(value, ['packRef', 'source'], path);
  return {
    packRef: copyPackRef(value.packRef, `${path}.packRef`),
    source: copySource(value.source, `${path}.source`),
  };
}

function copyFacet(value: unknown, path: string): string {
  if (typeof value !== 'string') fail(`${path} must be a string.`, { path });
  const normalized = value.normalize('NFKC').replace(/\s+/gu, ' ').trim();
  if (normalized.length < 4 || normalized.length > 120) {
    fail(`${path} must be a compact, non-empty text span.`, { path });
  }
  return normalized;
}

function copyLivedPatternRef(value: unknown, path: string): OhMySajuLivedPatternRef {
  if (!isRecord(value)) fail(`${path} must be an object.`, { path });
  assertOnlyKeys(value, ['paragraph', 'structure'], path);
  if (!isRecord(value.structure)) fail(`${path}.structure must be an object.`, { path });
  assertOnlyKeys(
    value.structure,
    ['domain', 'direction', 'situation', 'behavior', 'result'],
    `${path}.structure`,
  );
  if (
    value.structure.domain !== 'disposition' &&
    value.structure.domain !== 'execution' &&
    value.structure.domain !== 'relationships' &&
    value.structure.domain !== 'work-study'
  ) {
    fail(`${path}.structure.domain is not supported.`, { path });
  }
  if (
    value.structure.direction !== 'benefit' &&
    value.structure.direction !== 'cost' &&
    value.structure.direction !== 'descriptive'
  ) {
    fail(`${path}.structure.direction is not supported.`, { path });
  }
  return {
    paragraph: copyParagraphRef(value.paragraph, `${path}.paragraph`),
    structure: {
      domain: value.structure.domain,
      direction: value.structure.direction,
      situation: copyFacet(value.structure.situation, `${path}.structure.situation`),
      behavior: copyFacet(value.structure.behavior, `${path}.structure.behavior`),
      result: copyFacet(value.structure.result, `${path}.structure.result`),
    },
  };
}

function copyPortraitRef(value: unknown, path: string): OhMySajuPortraitRef {
  if (!isRecord(value)) fail(`${path} must be an object.`, { path });
  assertOnlyKeys(value, ['paragraph', 'structure'], path);
  if (!isRecord(value.structure)) fail(`${path}.structure must be an object.`, { path });
  assertOnlyKeys(value.structure, ['process', 'identity'], `${path}.structure`);
  return {
    paragraph: copyParagraphRef(value.paragraph, `${path}.paragraph`),
    structure: {
      process: copyFacet(value.structure.process, `${path}.structure.process`),
      identity: copyFacet(value.structure.identity, `${path}.structure.identity`),
    },
  };
}

function copyConclusionRef(value: unknown, path: string): OhMySajuConclusionRef {
  if (!isRecord(value)) fail(`${path} must be an object.`, { path });
  assertOnlyKeys(value, ['paragraph', 'structure'], path);
  if (!isRecord(value.structure)) fail(`${path}.structure must be an object.`, { path });
  assertOnlyKeys(value.structure, ['condition', 'payoff'], `${path}.structure`);
  return {
    paragraph: copyParagraphRef(value.paragraph, `${path}.paragraph`),
    structure: {
      condition: copyFacet(value.structure.condition, `${path}.structure.condition`),
      payoff: copyFacet(value.structure.payoff, `${path}.structure.payoff`),
    },
  };
}

function copyLivedPair(
  value: unknown,
  keys: readonly string[],
  path: string,
): Readonly<Record<string, OhMySajuLivedPatternRef>> {
  if (!isRecord(value)) fail(`${path} must be an object.`, { path });
  assertOnlyKeys(value, keys, path);
  return Object.fromEntries(
    keys.map((key) => [key, copyLivedPatternRef(value[key], `${path}.${key}`)]),
  );
}

function copyRefList(
  value: unknown,
  path: string,
): readonly [OhMySajuLivedPatternRef, OhMySajuLivedPatternRef?] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 2) {
    fail(`${path} must contain one or two paragraph references.`, { path });
  }
  const first = copyLivedPatternRef(value[0], `${path}[0]`);
  const second = value[1] === undefined ? undefined : copyLivedPatternRef(value[1], `${path}[1]`);
  return second === undefined ? [first] : [first, second];
}

function copyLegacyBroadPresentationDraft(value: unknown): OhMySajuLegacyBroadPresentationDraft {
  if (!isRecord(value)) fail('presentationDraft must be an object.');
  assertOnlyKeys(
    value,
    [
      'schemaVersion',
      'kind',
      'portrait',
      'atAGlance',
      'doubleEdge',
      'workStudy',
      'relationships',
      'conclusion',
    ],
    'presentationDraft',
  );
  if (value.schemaVersion !== '1' || value.kind !== 'broad-reading') {
    fail('presentationDraft has an unsupported schema or kind.');
  }
  const atAGlance = copyLivedPair(
    value.atAGlance,
    ['disposition', 'execution', 'relationships'],
    'presentationDraft.atAGlance',
  );
  const doubleEdge = copyLivedPair(
    value.doubleEdge,
    ['strength', 'friction'],
    'presentationDraft.doubleEdge',
  );
  return {
    schemaVersion: '1',
    kind: 'broad-reading',
    portrait: copyPortraitRef(value.portrait, 'presentationDraft.portrait'),
    atAGlance: {
      disposition: atAGlance.disposition!,
      execution: atAGlance.execution!,
      relationships: atAGlance.relationships!,
    },
    doubleEdge: {
      strength: doubleEdge.strength!,
      friction: doubleEdge.friction!,
    },
    workStudy: copyRefList(value.workStudy, 'presentationDraft.workStudy'),
    relationships: copyRefList(value.relationships, 'presentationDraft.relationships'),
    conclusion: copyConclusionRef(value.conclusion, 'presentationDraft.conclusion'),
  };
}

function copyProfileParagraphRef(
  value: unknown,
  path: string,
  expectedRole: OhMySajuProfileSectionRole,
): OhMySajuProfileParagraphRef {
  if (!isRecord(value)) fail(`${path} must be an object.`, { path });
  assertOnlyKeys(value, ['paragraph', 'structure'], path);
  if (!isRecord(value.structure)) fail(`${path}.structure must be an object.`, { path });
  assertOnlyKeys(value.structure, ['role', 'basis', 'interpretation'], `${path}.structure`);
  if (!PROFILE_ROLE_VALUES.has(value.structure.role as OhMySajuProfileSectionRole)) {
    fail(`${path}.structure.role is not supported.`, { path });
  }
  if (value.structure.role !== expectedRole) {
    fail(`${path}.structure.role does not match its profile section.`, {
      path,
      expectedRole,
    });
  }
  return {
    paragraph: copyParagraphRef(value.paragraph, `${path}.paragraph`),
    structure: {
      role: expectedRole,
      basis: copyFacet(value.structure.basis, `${path}.structure.basis`),
      interpretation: copyFacet(value.structure.interpretation, `${path}.structure.interpretation`),
    },
  };
}

function copyProfileRefList(
  value: unknown,
  path: string,
  role: OhMySajuProfileSectionRole,
): readonly [OhMySajuProfileParagraphRef, OhMySajuProfileParagraphRef?] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 2) {
    fail(`${path} must contain one or two paragraph references.`, { path });
  }
  const first = copyProfileParagraphRef(value[0], `${path}[0]`, role);
  const second =
    value[1] === undefined ? undefined : copyProfileParagraphRef(value[1], `${path}[1]`, role);
  return second === undefined ? [first] : [first, second];
}

function copyProfileThesisRef(value: unknown, path: string): OhMySajuProfileThesisRef {
  if (!isRecord(value)) fail(`${path} must be an object.`, { path });
  assertOnlyKeys(value, ['paragraph', 'structure'], path);
  if (!isRecord(value.structure)) fail(`${path}.structure must be an object.`, { path });
  assertOnlyKeys(value.structure, ['basis', 'portrait'], `${path}.structure`);
  return {
    paragraph: copyParagraphRef(value.paragraph, `${path}.paragraph`),
    structure: {
      basis: copyFacet(value.structure.basis, `${path}.structure.basis`),
      portrait: copyFacet(value.structure.portrait, `${path}.structure.portrait`),
    },
  };
}

function copyDefaultProfileDraft(value: unknown): OhMySajuDefaultProfileDraft {
  if (!isRecord(value)) fail('presentationDraft must be an object.');
  assertOnlyKeys(
    value,
    ['schemaVersion', 'kind', 'thesis', 'core', 'temperament', 'work', 'money', 'relationships'],
    'presentationDraft',
  );
  if (value.schemaVersion !== '2' || value.kind !== 'default-profile') {
    fail('presentationDraft has an unsupported schema or kind.');
  }
  if (!Array.isArray(value.core) || value.core.length !== 2) {
    fail('presentationDraft.core must contain exactly two central mechanisms.');
  }
  if (!isRecord(value.temperament)) {
    fail('presentationDraft.temperament must be an object.');
  }
  assertOnlyKeys(value.temperament, ['strength', 'blindSpot'], 'presentationDraft.temperament');
  const coreFirst = copyProfileParagraphRef(value.core[0], 'presentationDraft.core[0]', 'core');
  const coreSecond = copyProfileParagraphRef(value.core[1], 'presentationDraft.core[1]', 'core');
  const money =
    value.money === undefined
      ? undefined
      : copyProfileRefList(value.money, 'presentationDraft.money', 'money');
  return {
    schemaVersion: '2',
    kind: 'default-profile',
    thesis: copyProfileThesisRef(value.thesis, 'presentationDraft.thesis'),
    core: [coreFirst, coreSecond],
    temperament: {
      strength: copyProfileParagraphRef(
        value.temperament.strength,
        'presentationDraft.temperament.strength',
        'strength',
      ),
      blindSpot: copyProfileParagraphRef(
        value.temperament.blindSpot,
        'presentationDraft.temperament.blindSpot',
        'blind-spot',
      ),
    },
    work: copyProfileRefList(value.work, 'presentationDraft.work', 'work'),
    ...(money === undefined ? {} : { money }),
    relationships: copyProfileRefList(
      value.relationships,
      'presentationDraft.relationships',
      'relationships',
    ),
  };
}

function sourceKey(source: OhMySajuParagraphSource): string {
  return source.kind === 'summary' ? 'summary' : `section:${source.topic}:${source.paragraphIndex}`;
}

function paragraphForSource(
  packReading: AiSajuComparisonPackReading,
  source: OhMySajuParagraphSource,
): SajuNarrativeParagraph {
  if (source.kind === 'summary') return packReading.reading.narrative.summary;
  const section = packReading.reading.narrative.sections.find(({ id }) => id === source.topic);
  const paragraph = section?.paragraphs[source.paragraphIndex];
  if (paragraph === undefined) {
    fail('A presentation reference does not resolve to a validated paragraph.', {
      policy: 'validated-paragraph-reference',
    });
  }
  return paragraph;
}

function forbiddenIdentityTokens(reading: AiSajuComparisonServiceResult): readonly string[] {
  return [
    ...reading.packReadings.flatMap(({ packRef, profileRef, interpretation }) => [
      packRef.id,
      `${packRef.id}@${packRef.version}`,
      profileRef.id,
      `${profileRef.id}@${profileRef.version}`,
      interpretation.profile.displayName,
    ]),
  ]
    .map((token) => token.normalize('NFKC').toLocaleLowerCase('en'))
    .filter((token) => token.length > 2);
}

function presentationText(paragraph: SajuNarrativeParagraph): {
  readonly text: string;
  readonly uncertaintyMarker: UncertaintyMarker | null;
} {
  if (paragraph.certainty === 'grounded') {
    return { text: paragraph.text, uncertaintyMarker: null };
  }
  const labels = [
    {
      prefix: '생시 후보에 따라 달라지는 내용입니다. 확인된 기둥만 반영했습니다. ',
      marker: '△◇',
    },
    { prefix: '생시 후보에 따라 달라질 수 있습니다. ', marker: '△' },
    { prefix: '확인된 기둥만 반영한 내용입니다. ', marker: '◇' },
  ] as const;
  const label = labels.find(({ prefix }) => paragraph.text.startsWith(prefix));
  if (label === undefined) {
    fail('Conditional prose must retain its validated uncertainty metadata.', {
      policy: 'conditional-presentation-marker',
    });
  }
  return {
    text: paragraph.text.slice(label.prefix.length),
    uncertaintyMarker: label.marker,
  };
}

function resolveParagraphRef(
  reading: AiSajuComparisonServiceResult,
  ref: OhMySajuParagraphRef,
  forbiddenTokens: readonly string[],
): ResolvedParagraphRef {
  const packReading = reading.packReadings.find(
    ({ packRef }) => packRef.id === ref.packRef.id && packRef.version === ref.packRef.version,
  );
  if (packReading === undefined || !packReading.reading.generatedByAI) {
    fail('A presentation reference does not identify generated, validated Pack prose.', {
      policy: 'validated-paragraph-reference',
    });
  }
  const paragraph = paragraphForSource(packReading, ref.source);
  if (paragraph.findingIds.length === 0) {
    fail('A presentation reference cannot select limitation-only prose.', {
      policy: 'finding-backed-presentation',
    });
  }
  if (
    paragraph.text.length >
    SAJU_NARRATION_PRESENTATION_POLICY.broadReading.maxSelectedParagraphCharacters
  ) {
    fail('A selected presentation paragraph is too long.', {
      policy: 'compact-broad-presentation',
      maximumCharacters:
        SAJU_NARRATION_PRESENTATION_POLICY.broadReading.maxSelectedParagraphCharacters,
    });
  }
  const normalizedText = paragraph.text.normalize('NFKC').toLocaleLowerCase('en');
  if (forbiddenTokens.some((token) => normalizedText.includes(token))) {
    fail('Pack and profile identities cannot appear in ordinary presentation prose.', {
      policy: 'no-internal-identities',
    });
  }
  const display = presentationText(paragraph);
  const findingTopics = new Map(
    packReading.interpretation.findings.map(({ id, topic }) => [id, topic] as const),
  );
  const topics = [
    ...new Set(
      paragraph.findingIds
        .map((findingId) => findingTopics.get(findingId))
        .filter((topic): topic is InterpretationTopic => topic !== undefined),
    ),
  ];
  return {
    ref,
    refKey: `${ref.packRef.id}@${ref.packRef.version}:${sourceKey(ref.source)}`,
    text: display.text,
    findingIds: paragraph.findingIds,
    topics,
    uncertaintyMarker: display.uncertaintyMarker,
  };
}

function orderedFacetPositions(text: string, facets: readonly string[]): readonly number[] | null {
  const positions: number[] = [];
  let fromIndex = 0;
  for (const facet of facets) {
    const position = text.indexOf(facet, fromIndex);
    if (position < 0) return null;
    positions.push(position);
    fromIndex = position + facet.length;
  }
  return positions;
}

function assertLivedPatternStructure(
  resolved: ResolvedParagraphRef,
  structure: OhMySajuLivedPatternRef['structure'],
  path: string,
  expected: ExpectedLivedPatternRole,
): ResolvedLivedPatternRef {
  const { domain, direction, situation, behavior, result } = structure;
  if (orderedFacetPositions(resolved.text, [situation, behavior, result]) === null) {
    fail('Lived-pattern structure must quote three ordered, non-overlapping paragraph spans.', {
      policy: 'structured-lived-pattern',
      path,
    });
  }
  if (
    !SITUATION_END_PATTERN.test(situation) ||
    GENERIC_SITUATION_PATTERN.test(situation) ||
    !BEHAVIOR_PATTERN.test(behavior) ||
    !RESULT_PATTERN.test(result) ||
    !SPECIFIC_BEHAVIOR_PATTERN.test(behavior) ||
    !SPECIFIC_RESULT_PATTERN.test(result) ||
    GENERIC_BARNUM_PATTERN.test(`${behavior} ${result}`)
  ) {
    fail('A lived pattern must name a concrete situation, behavior, and observable result.', {
      policy: 'structured-lived-pattern',
      path,
    });
  }
  const roleText = `${situation} ${result}`;
  const conflictsWithNeighborDomain =
    (domain === 'work-study' && DOMAIN_PATTERNS.relationships.test(roleText)) ||
    (domain === 'relationships' && DOMAIN_PATTERNS['work-study'].test(roleText));
  if (
    !expected.domains.includes(domain) ||
    !DOMAIN_PATTERNS[domain].test(roleText) ||
    conflictsWithNeighborDomain
  ) {
    fail('A lived pattern must match the semantic role of its presentation slot.', {
      policy: 'structured-lived-pattern-role',
      path,
      domain,
    });
  }
  const benefitResult = BENEFIT_RESULT_PATTERN.test(result);
  const costResult = COST_RESULT_PATTERN.test(result);
  const negatedDirection = NEGATED_DIRECTION_PATTERN.test(result);
  if (
    expected.direction !== undefined &&
    (direction !== expected.direction ||
      (direction === 'benefit' && (!benefitResult || costResult || negatedDirection)) ||
      (direction === 'cost' && (!costResult || benefitResult || negatedDirection)))
  ) {
    fail('A double-edge pattern must point in the declared benefit or cost direction.', {
      policy: 'structured-lived-pattern-direction',
      path,
      direction,
    });
  }
  return { ...resolved, structure };
}

function assertPortraitStructure(
  resolved: ResolvedParagraphRef,
  structure: OhMySajuPortraitRef['structure'],
): void {
  if (
    orderedFacetPositions(resolved.text, [structure.process, structure.identity]) === null ||
    !BEHAVIOR_PATTERN.test(structure.process) ||
    !SPECIFIC_BEHAVIOR_PATTERN.test(structure.process) ||
    GENERIC_BARNUM_PATTERN.test(structure.process) ||
    !PORTRAIT_IDENTITY_PATTERN.test(structure.identity)
  ) {
    fail('The portrait must connect a concrete mental or behavioral process to identity.', {
      policy: 'structured-portrait',
    });
  }
}

function assertConclusionStructure(
  resolved: ResolvedParagraphRef,
  structure: OhMySajuConclusionRef['structure'],
): void {
  if (
    orderedFacetPositions(resolved.text, [structure.condition, structure.payoff]) === null ||
    !SITUATION_END_PATTERN.test(structure.condition) ||
    GENERIC_SITUATION_PATTERN.test(structure.condition) ||
    !RESULT_PATTERN.test(structure.payoff) ||
    !SPECIFIC_RESULT_PATTERN.test(structure.payoff) ||
    GENERIC_BARNUM_PATTERN.test(structure.payoff)
  ) {
    fail('The conclusion must connect a concrete condition to an observable payoff.', {
      policy: 'structured-conclusion',
    });
  }
}

function resolveBroadPresentation(
  reading: AiSajuComparisonServiceResult,
  draft: OhMySajuLegacyBroadPresentationDraft,
): ResolvedBroadPresentation {
  const forbiddenTokens = forbiddenIdentityTokens(reading);
  const resolve = (ref: OhMySajuParagraphRef): ResolvedParagraphRef =>
    resolveParagraphRef(reading, ref, forbiddenTokens);
  const resolveLived = (
    value: OhMySajuLivedPatternRef,
    path: string,
    expected: ExpectedLivedPatternRole,
  ): ResolvedLivedPatternRef =>
    assertLivedPatternStructure(resolve(value.paragraph), value.structure, path, expected);
  const portrait = resolve(draft.portrait.paragraph);
  assertPortraitStructure(portrait, draft.portrait.structure);
  const conclusion = resolve(draft.conclusion.paragraph);
  assertConclusionStructure(conclusion, draft.conclusion.structure);
  const resolved = {
    portrait,
    atAGlance: {
      disposition: resolveLived(draft.atAGlance.disposition, 'atAGlance.disposition', {
        domains: ['disposition'],
        direction: 'descriptive',
      }),
      execution: resolveLived(draft.atAGlance.execution, 'atAGlance.execution', {
        domains: ['execution'],
        direction: 'descriptive',
      }),
      relationships: resolveLived(draft.atAGlance.relationships, 'atAGlance.relationships', {
        domains: ['relationships'],
        direction: 'descriptive',
      }),
    },
    doubleEdge: {
      strength: resolveLived(draft.doubleEdge.strength, 'doubleEdge.strength', {
        domains: ['disposition', 'execution', 'relationships', 'work-study'],
        direction: 'benefit',
      }),
      friction: resolveLived(draft.doubleEdge.friction, 'doubleEdge.friction', {
        domains: ['disposition', 'execution', 'relationships', 'work-study'],
        direction: 'cost',
      }),
    },
    workStudy: draft.workStudy
      .filter((ref): ref is OhMySajuLivedPatternRef => ref !== undefined)
      .map((ref, index) =>
        resolveLived(ref, `workStudy[${index}]`, {
          domains: ['work-study'],
          direction: 'descriptive',
        }),
      ),
    relationships: draft.relationships
      .filter((ref): ref is OhMySajuLivedPatternRef => ref !== undefined)
      .map((ref, index) =>
        resolveLived(ref, `relationships[${index}]`, {
          domains: ['relationships'],
          direction: 'descriptive',
        }),
      ),
    conclusion,
  } as const;
  const all = [
    resolved.portrait,
    ...Object.values(resolved.atAGlance),
    ...Object.values(resolved.doubleEdge),
    ...resolved.workStudy,
    ...resolved.relationships,
    resolved.conclusion,
  ];
  if (
    all.length < SAJU_NARRATION_PRESENTATION_POLICY.broadReading.legacyMinimumDistinctParagraphs
  ) {
    fail('The broad reading is missing required presentation slots.', {
      policy: 'broad-presentation-required',
    });
  }
  if (new Set(all.map(({ refKey }) => refKey)).size !== all.length) {
    fail('Each broad-reading slot must select a distinct validated paragraph.', {
      policy: 'distinct-presentation-sources',
    });
  }
  const normalizedTexts = all.map(({ text }) =>
    text.normalize('NFKC').replace(/\s+/gu, ' ').trim(),
  );
  if (new Set(normalizedTexts).size !== normalizedTexts.length) {
    fail('The same prose cannot be copied into multiple broad-reading slots.', {
      policy: 'distinct-presentation-prose',
    });
  }
  const { strength, friction } = resolved.doubleEdge;
  if (
    strength.ref.packRef.id !== friction.ref.packRef.id ||
    strength.ref.packRef.version !== friction.ref.packRef.version ||
    strength.structure.domain !== friction.structure.domain ||
    !strength.findingIds.some((findingId) => friction.findingIds.includes(findingId))
  ) {
    fail(
      'The strength and friction cells must use two sides of the same finding-backed mechanism.',
      {
        policy: 'shared-double-edge-mechanism',
      },
    );
  }
  if (all.some(({ text }) => text.length < 24)) {
    fail('Every broad-reading slot must contain a substantive compact paragraph.', {
      policy: 'substantive-broad-paragraph',
    });
  }
  const characterCount = all.reduce((total, item) => total + item.text.length, 0);
  if (characterCount > SAJU_NARRATION_PRESENTATION_POLICY.broadReading.maxPresentationCharacters) {
    fail('The selected broad reading is too long.', {
      policy: 'compact-broad-presentation',
      characterCount,
      maximumCharacters: SAJU_NARRATION_PRESENTATION_POLICY.broadReading.maxPresentationCharacters,
    });
  }
  return resolved;
}

function assertProfileBridge(
  resolved: ResolvedParagraphRef,
  structure: OhMySajuProfileParagraphRef['structure'],
  path: string,
): ResolvedProfileParagraphRef {
  if (orderedFacetPositions(resolved.text, [structure.basis, structure.interpretation]) === null) {
    fail('A default-profile paragraph must quote its chart basis before its interpretation.', {
      policy: 'chart-to-interpretation-bridge',
      path,
    });
  }
  if (
    !PROFILE_BASIS_PATTERN.test(structure.basis) ||
    structure.interpretation.length < 12 ||
    MISFRAMED_SEASON_PATTERN.test(resolved.text) ||
    PRESENTATION_AUDIT_PATTERN.test(resolved.text) ||
    PROFILE_INTERNAL_JARGON_PATTERN.test(resolved.text) ||
    PROFILE_TRANSLATIONESE_PATTERN.test(resolved.text)
  ) {
    fail('A default-profile paragraph must expose a specific Saju basis and its plain meaning.', {
      policy: 'chart-to-interpretation-bridge',
      path,
    });
  }
  if (PROFILE_GENERIC_COACHING_PATTERN.test(structure.interpretation)) {
    fail('A default-profile interpretation cannot substitute generic coaching for chart meaning.', {
      policy: 'generic-profile-coaching',
      path,
    });
  }
  if (
    (structure.role === 'work' && !PROFILE_ROLE_PATTERNS.work.test(structure.interpretation)) ||
    (structure.role === 'money' &&
      (!PROFILE_ROLE_PATTERNS.money.test(structure.interpretation) ||
        !resolved.topics.includes('ten-gods'))) ||
    (structure.role === 'relationships' &&
      (!PROFILE_ROLE_PATTERNS.relationships.test(structure.interpretation) ||
        !PROFILE_RELATIONSHIP_REACTION_PATTERN.test(structure.interpretation))) ||
    (structure.role === 'strength' && !PROFILE_STRENGTH_PATTERN.test(structure.interpretation)) ||
    (structure.role === 'blind-spot' && !PROFILE_BLIND_SPOT_PATTERN.test(structure.interpretation))
  ) {
    fail('A default-profile paragraph must match the semantic role of its section.', {
      policy: 'default-profile-role',
      path,
      role: structure.role,
    });
  }
  if (
    resolved.topics.length === 0 ||
    resolved.topics.some((topic) => !DEFAULT_PROFILE_TOPICS.has(topic))
  ) {
    fail('A default profile cannot launder specialist or audit-only topics through a summary.', {
      policy: 'default-profile-topic-boundary',
      path,
      topics: resolved.topics,
    });
  }
  return { ...resolved, structure };
}

function assertProfileThesis(
  resolved: ResolvedParagraphRef,
  structure: OhMySajuProfileThesisRef['structure'],
): void {
  if (
    orderedFacetPositions(resolved.text, [structure.basis, structure.portrait]) === null ||
    !PROFILE_BASIS_PATTERN.test(structure.basis) ||
    structure.portrait.length < 12 ||
    PROFILE_GENERIC_COACHING_PATTERN.test(structure.portrait) ||
    MISFRAMED_SEASON_PATTERN.test(resolved.text) ||
    PRESENTATION_AUDIT_PATTERN.test(resolved.text) ||
    PROFILE_INTERNAL_JARGON_PATTERN.test(resolved.text) ||
    PROFILE_TRANSLATIONESE_PATTERN.test(resolved.text)
  ) {
    fail('The default-profile thesis must connect specific chart evidence to a clear portrait.', {
      policy: 'chart-to-interpretation-bridge',
      path: 'thesis',
    });
  }
  if (
    resolved.topics.length === 0 ||
    resolved.topics.some((topic) => !DEFAULT_PROFILE_TOPICS.has(topic))
  ) {
    fail('A default-profile thesis cannot rely on specialist or audit-only topics.', {
      policy: 'default-profile-topic-boundary',
      path: 'thesis',
      topics: resolved.topics,
    });
  }
}

function resolveDefaultProfile(
  reading: AiSajuComparisonServiceResult,
  draft: OhMySajuDefaultProfileDraft,
): ResolvedDefaultProfile {
  const forbiddenTokens = forbiddenIdentityTokens(reading);
  const resolve = (ref: OhMySajuParagraphRef): ResolvedParagraphRef =>
    resolveParagraphRef(reading, ref, forbiddenTokens);
  const resolveProfile = (
    value: OhMySajuProfileParagraphRef,
    path: string,
  ): ResolvedProfileParagraphRef =>
    assertProfileBridge(resolve(value.paragraph), value.structure, path);
  const resolveProfileList = (
    values: readonly (OhMySajuProfileParagraphRef | undefined)[],
    path: string,
  ): readonly ResolvedProfileParagraphRef[] =>
    values
      .filter((value): value is OhMySajuProfileParagraphRef => value !== undefined)
      .map((value, index) => resolveProfile(value, `${path}[${index}]`));
  const thesisParagraph = resolve(draft.thesis.paragraph);
  assertProfileThesis(thesisParagraph, draft.thesis.structure);
  const thesis: ResolvedProfileThesisRef = {
    ...thesisParagraph,
    structure: draft.thesis.structure,
  };
  const core = [
    resolveProfile(draft.core[0], 'core[0]'),
    resolveProfile(draft.core[1], 'core[1]'),
  ] as const;
  const work = resolveProfileList(draft.work, 'work');
  const relationships = resolveProfileList(draft.relationships, 'relationships');
  const money = draft.money === undefined ? undefined : resolveProfileList(draft.money, 'money');
  const tenGodRow = profileTenGodTexts(reading);
  const visibleWealthCount =
    tenGodRow?.reduce((count, text) => count + (text.match(/(?:정재|편재)/gu)?.length ?? 0), 0) ??
    0;
  if (visibleWealthCount >= 2 && money === undefined) {
    fail('A chart with repeated visible wealth placements requires a distinct money reading.', {
      policy: 'default-profile-money-required',
      visibleWealthCount,
    });
  }
  const resolved: ResolvedDefaultProfile = {
    thesis,
    core,
    temperament: {
      strength: resolveProfile(draft.temperament.strength, 'temperament.strength'),
      blindSpot: resolveProfile(draft.temperament.blindSpot, 'temperament.blindSpot'),
    },
    work,
    ...(money === undefined ? {} : { money }),
    relationships,
  };
  const all = [
    resolved.thesis,
    ...resolved.core,
    resolved.temperament.strength,
    resolved.temperament.blindSpot,
    ...resolved.work,
    ...(resolved.money ?? []),
    ...resolved.relationships,
  ];
  if (all.length < SAJU_NARRATION_PRESENTATION_POLICY.broadReading.minimumDistinctParagraphs) {
    fail('The default profile is missing required evidence-backed sections.', {
      policy: 'default-profile-required',
    });
  }
  if (new Set(all.map(({ refKey }) => refKey)).size !== all.length) {
    fail('Each default-profile item must select a distinct validated paragraph.', {
      policy: 'distinct-presentation-sources',
    });
  }
  const normalizedTexts = all.map(({ text }) =>
    text.normalize('NFKC').replace(/\s+/gu, ' ').trim(),
  );
  if (new Set(normalizedTexts).size !== normalizedTexts.length) {
    fail('The same prose cannot be copied into multiple default-profile sections.', {
      policy: 'distinct-presentation-prose',
    });
  }
  const interpretationTexts = [
    draft.thesis.structure.portrait,
    ...resolved.core.map(({ structure }) => structure.interpretation),
    resolved.temperament.strength.structure.interpretation,
    resolved.temperament.blindSpot.structure.interpretation,
    ...resolved.work.map(({ structure }) => structure.interpretation),
    ...(resolved.money ?? []).map(({ structure }) => structure.interpretation),
    ...resolved.relationships.map(({ structure }) => structure.interpretation),
  ];
  for (const concept of PROFILE_RECYCLED_CONCEPTS) {
    const reusedAcross = interpretationTexts.filter((text) => concept.pattern.test(text)).length;
    if (reusedAcross >= 3) {
      fail('A default profile cannot recycle one abstract conclusion across life areas.', {
        policy: 'recycled-profile-conclusion',
        concept: concept.id,
        reusedAcross,
      });
    }
  }
  const centralTopics = new Set(
    [resolved.thesis, ...resolved.core].flatMap(({ topics }) => topics),
  );
  if (
    !['day-master', 'strength'].some((topic) => centralTopics.has(topic as InterpretationTopic)) ||
    !['chart-overview', 'five-elements', 'ten-gods', 'relationships'].some((topic) =>
      centralTopics.has(topic as InterpretationTopic),
    )
  ) {
    fail(
      'The central profile must combine seasonal/day-master evidence with chart relationships.',
      {
        policy: 'central-mechanism-evidence',
        topics: [...centralTopics],
      },
    );
  }
  const firstCoreFindingIds = new Set(resolved.core[0].findingIds);
  const secondCoreFindingIds = new Set(resolved.core[1].findingIds);
  if (
    !resolved.core[0].findingIds.some((findingId) => !secondCoreFindingIds.has(findingId)) ||
    !resolved.core[1].findingIds.some((findingId) => !firstCoreFindingIds.has(findingId))
  ) {
    fail('The two central mechanisms must be supported by meaningfully distinct findings.', {
      policy: 'distinct-central-mechanisms',
    });
  }
  const { strength, blindSpot } = resolved.temperament;
  if (
    strength.ref.packRef.id !== blindSpot.ref.packRef.id ||
    strength.ref.packRef.version !== blindSpot.ref.packRef.version ||
    !strength.findingIds.some((findingId) => blindSpot.findingIds.includes(findingId))
  ) {
    fail('Strength and blind spot must explain two sides of one finding-backed mechanism.', {
      policy: 'shared-double-edge-mechanism',
    });
  }
  if (all.some(({ text }) => text.length < 36)) {
    fail('Every default-profile item must contain a substantive interpretation.', {
      policy: 'substantive-profile-paragraph',
    });
  }
  const characterCount = all.reduce((total, item) => total + item.text.length, 0);
  if (characterCount > SAJU_NARRATION_PRESENTATION_POLICY.broadReading.maxPresentationCharacters) {
    fail('The selected default profile is too long.', {
      policy: 'compact-broad-presentation',
      characterCount,
      maximumCharacters: SAJU_NARRATION_PRESENTATION_POLICY.broadReading.maxPresentationCharacters,
    });
  }
  return resolved;
}

function inputCalendarLabel(date: SajuBirthDate): string {
  if (date.calendar === 'gregorian') return '양력';
  return `한국 음력 ${date.monthKind === 'leap' ? '윤달' : '평달'}`;
}

function dateText(date: Pick<SajuBirthDate, 'year' | 'month' | 'day'>): string {
  return `${date.year}.${String(date.month).padStart(2, '0')}.${String(date.day).padStart(2, '0')}`;
}

function timeZoneLabel(timeZone: string): string {
  return timeZone === 'Asia/Seoul' ? '한국 표준시' : timeZone;
}

function exactBasis(reading: AiSajuComparisonServiceResult): string {
  if (reading.calculationKind !== 'exact') fail('Expected an exact calculation.');
  const chronology = reading.calculation.chronology;
  const time = /T(\d{2}:\d{2})/u.exec(chronology.civilDateTime)?.[1] ?? '시각 미상';
  return `기준: ${inputCalendarLabel(chronology.inputDate)} ${dateText(
    chronology.inputDate,
  )} ${time}, ${timeZoneLabel(chronology.timeZone)}`;
}

function possibilityBasis(reading: AiSajuComparisonServiceResult): string {
  if (reading.calculationKind !== 'possibilities') fail('Expected a possibility calculation.');
  const input = reading.calculation.input;
  const time =
    input.time.kind === 'unknown'
      ? '생시 미상'
      : input.time.kind === 'day-period'
        ? input.time.period === 'am'
          ? '오전'
          : '오후'
        : input.time.kind === 'approximate'
          ? `약 ${String(input.time.time.hour).padStart(2, '0')}:${String(
              input.time.time.minute,
            ).padStart(2, '0')}`
          : `${String(input.time.startInclusive.hour).padStart(2, '0')}:${String(
              input.time.startInclusive.minute,
            ).padStart(2, '0')}~${String(input.time.endExclusive.hour).padStart(
              2,
              '0',
            )}:${String(input.time.endExclusive.minute).padStart(2, '0')}`;
  return `기준: ${inputCalendarLabel(input.date)} ${dateText(input.date)}, ${time}, ${timeZoneLabel(
    input.timeZone,
  )}`;
}

function pillarTexts(reading: AiSajuComparisonServiceResult): readonly string[] {
  if (reading.calculationKind === 'exact') {
    return PILLAR_POSITIONS.map((position) => reading.calculation.pillars[position].korean);
  }
  return PILLAR_POSITIONS.map((position) => {
    const pillar = reading.calculation.stablePillars[position];
    if (pillar !== null) return pillar.korean;
    if (position === 'hour' && reading.calculation.hourPillar === 'omitted') return '미상';
    return '후보별';
  });
}

function profilePillarTexts(reading: AiSajuComparisonServiceResult): readonly string[] {
  if (reading.calculationKind === 'exact') {
    return PILLAR_POSITIONS.map((position) => {
      const pillar = reading.calculation.pillars[position];
      return `${pillar.korean}(${pillar.hanja})`;
    });
  }
  return PILLAR_POSITIONS.map((position) => {
    const pillar = reading.calculation.stablePillars[position];
    if (pillar !== null) return `${pillar.korean}(${pillar.hanja})`;
    if (position === 'hour' && reading.calculation.hourPillar === 'omitted') return '미상';
    return '후보별';
  });
}

/** @internal Visible ten-god row for exact charts and the known pillars of possibility charts. */
export function profileTenGodTexts(
  reading: AiSajuComparisonServiceResult,
): readonly string[] | null {
  if (reading.calculationKind === 'exact') {
    return PILLAR_POSITIONS.map((position) => {
      const pair = reading.calculation.facts.tenGods[position];
      return `${pair.stem}·${pair.branch}`;
    });
  }
  const dayMaster = reading.calculation.stablePillars.day?.stem.korean;
  if (dayMaster === undefined) return null;
  return PILLAR_POSITIONS.map((position) => {
    const pillar = reading.calculation.stablePillars[position];
    if (pillar === null) {
      return position === 'hour' && reading.calculation.hourPillar === 'omitted'
        ? '미상'
        : '후보별';
    }
    const stem = position === 'day' ? '일간' : getTenGod(dayMaster, pillar.stem.korean);
    const branch = getBranchTenGod(dayMaster, pillar.branch.korean);
    return `${stem}·${branch}`;
  });
}

function formatPercentage(value: number): string {
  return `${Number.isInteger(value) ? value : String(value)}%`;
}

function profileElementTable(reading: AiSajuComparisonServiceResult): readonly string[] {
  if (reading.calculationKind !== 'exact') return [];
  const percentages = reading.calculation.facts.structure.elementBalance.percentages;
  return [
    '**오행 분포(지장간 포함)**',
    '',
    '| 목 | 화 | 토 | 금 | 수 |',
    '| ---: | ---: | ---: | ---: | ---: |',
    `| ${(['목', '화', '토', '금', '수'] as const)
      .map((element) => formatPercentage(percentages[element]))
      .join(' | ')} |`,
  ];
}

/** @internal Escape one selected prose line without allowing it to reshape the fixed layout. */
export function escapeBroadPresentationMarkdownText(value: string): string {
  const escaped = value
    .normalize('NFKC')
    .replace(/\s+/gu, ' ')
    .trim()
    .replace(/\\/gu, '\\\\')
    .replace(/([*_`[\]#>~])/gu, '\\$1')
    .replaceAll('|', '\\|');
  return escaped
    .replace(/^([-+])\s/u, '\\$1 ')
    .replace(/^(\d+)([.)])\s/u, '$1\\$2 ')
    .replace(/^(-{3,})/u, '\\$1');
}

function markedMarkdownText(value: ResolvedParagraphRef): string {
  const marker = value.uncertaintyMarker;
  return `${marker === null ? '' : `${marker} `}${escapeBroadPresentationMarkdownText(value.text)}`;
}

function markedProfileFacet(value: ResolvedParagraphRef, text: string): string {
  const marker = value.uncertaintyMarker;
  return `${marker === null ? '' : `${marker} `}${escapeBroadPresentationMarkdownText(text)}`;
}

function renderedProfileBridge(value: ResolvedProfileParagraphRef): string {
  return `${markedProfileFacet(value, value.structure.interpretation)} _(근거: ${escapeBroadPresentationMarkdownText(value.structure.basis)})_`;
}

function presentationItems(resolved: ResolvedBroadPresentation): readonly ResolvedParagraphRef[] {
  return [
    resolved.portrait,
    ...Object.values(resolved.atAGlance),
    ...Object.values(resolved.doubleEdge),
    ...resolved.workStudy,
    ...resolved.relationships,
    resolved.conclusion,
  ];
}

function uncertaintyLegend(resolved: ResolvedBroadPresentation): string | null {
  return uncertaintyLegendForItems(presentationItems(resolved));
}

function uncertaintyLegendForItems(items: readonly ResolvedParagraphRef[]): string | null {
  const markers = items
    .map(({ uncertaintyMarker }) => uncertaintyMarker)
    .filter((marker): marker is UncertaintyMarker => marker !== null);
  if (markers.length === 0) return null;
  const includesCandidate = markers.some((marker) => marker.includes('△'));
  const includesPartial = markers.some((marker) => marker.includes('◇'));
  const definitions = [
    ...(includesCandidate ? ['△ 생시 후보에 따라 달라지는 부분'] : []),
    ...(includesPartial ? ['◇ 확인된 기둥만 반영한 결과'] : []),
  ];
  return `조건 표시: ${definitions.join(' · ')}`;
}

function renderMarkdown(
  reading: AiSajuComparisonServiceResult,
  resolved: ResolvedBroadPresentation,
): string {
  const pillars = pillarTexts(reading);
  const legend = uncertaintyLegend(resolved);
  const lines = [
    reading.calculationKind === 'exact' ? exactBasis(reading) : possibilityBasis(reading),
    ...(legend === null ? [] : ['', legend]),
    '',
    '| 년주 | 월주 | 일주 | 시주 |',
    '| --- | --- | --- | --- |',
    `| ${pillars.join(' | ')} |`,
    '',
    markedMarkdownText(resolved.portrait),
    '',
    '## 한눈에 보면',
    '',
    `- **중심 성향:** ${markedMarkdownText(resolved.atAGlance.disposition)}`,
    `- **결정과 실행:** ${markedMarkdownText(resolved.atAGlance.execution)}`,
    `- **사람을 대할 때:** ${markedMarkdownText(resolved.atAGlance.relationships)}`,
    '',
    '## 강점이 살아날 때와 꼬일 때',
    '',
    '| 잘 풀릴 때 | 꼬일 때 |',
    '| --- | --- |',
    `| ${markedMarkdownText(resolved.doubleEdge.strength)} | ${markedMarkdownText(
      resolved.doubleEdge.friction,
    )} |`,
    '',
    '## 일·공부',
    '',
    ...resolved.workStudy.map((item) => `- ${markedMarkdownText(item)}`),
    '',
    '## 관계',
    '',
    ...resolved.relationships.map((item) => `- ${markedMarkdownText(item)}`),
    '',
    `**한 줄 정리:** ${markedMarkdownText(resolved.conclusion)}`,
  ];
  return lines.join('\n');
}

function defaultProfileItems(resolved: ResolvedDefaultProfile): readonly ResolvedParagraphRef[] {
  return [
    resolved.thesis,
    ...resolved.core,
    resolved.temperament.strength,
    resolved.temperament.blindSpot,
    ...resolved.work,
    ...(resolved.money ?? []),
    ...resolved.relationships,
  ];
}

function renderDefaultProfileMarkdown(
  reading: AiSajuComparisonServiceResult,
  resolved: ResolvedDefaultProfile,
): string {
  const pillars = profilePillarTexts(reading);
  const tenGods = profileTenGodTexts(reading);
  const legend = uncertaintyLegendForItems(defaultProfileItems(resolved));
  const moneyLines =
    resolved.money === undefined
      ? []
      : [
          '',
          '## 돈과 현실 감각',
          '',
          ...resolved.money.map((item) => `- ${renderedProfileBridge(item)}`),
        ];
  const lines = [
    reading.calculationKind === 'exact' ? exactBasis(reading) : possibilityBasis(reading),
    ...(legend === null ? [] : ['', legend]),
    '',
    '| 구분 | 년주 | 월주 | 일주 | 시주 |',
    '| --- | --- | --- | --- | --- |',
    `| 간지 | ${pillars.join(' | ')} |`,
    ...(tenGods === null ? [] : [`| 십신 | ${tenGods.join(' | ')} |`]),
    ...(profileElementTable(reading).length === 0 ? [] : ['', ...profileElementTable(reading)]),
    '',
    `**핵심 요약:** ${markedProfileFacet(resolved.thesis, resolved.thesis.structure.portrait)}`,
    '',
    `_(근거: ${escapeBroadPresentationMarkdownText(resolved.thesis.structure.basis)})_`,
    '',
    '## 성격과 행동 방식',
    '',
    ...resolved.core.map((item) => `- ${renderedProfileBridge(item)}`),
    '',
    '## 강점과 주의점',
    '',
    `- **잘 풀릴 때:** ${renderedProfileBridge(resolved.temperament.strength)}`,
    `- **압박을 받을 때:** ${renderedProfileBridge(resolved.temperament.blindSpot)}`,
    '',
    '## 일·재능',
    '',
    ...resolved.work.map((item) => `- ${renderedProfileBridge(item)}`),
    ...moneyLines,
    '',
    '## 관계',
    '',
    ...resolved.relationships.map((item) => `- ${renderedProfileBridge(item)}`),
  ];
  return lines.join('\n');
}

export function validateAndRenderOhMySajuBroadPresentation(
  value: unknown,
  reading: AiSajuComparisonServiceResult,
): OhMySajuBroadPresentation {
  if (isRecord(value) && value.schemaVersion === '2' && value.kind === 'default-profile') {
    const sourceRefs = copyDefaultProfileDraft(value);
    const resolved = resolveDefaultProfile(reading, sourceRefs);
    return deepFreeze({
      schemaVersion: '2',
      kind: 'default-profile',
      sourceRefs,
      markdown: renderDefaultProfileMarkdown(reading, resolved),
    });
  }
  const sourceRefs = copyLegacyBroadPresentationDraft(value);
  const resolved = resolveBroadPresentation(reading, sourceRefs);
  return deepFreeze({
    schemaVersion: '1',
    kind: 'broad-reading',
    sourceRefs,
    markdown: renderMarkdown(reading, resolved),
  });
}

/** Two-phase application command and response contracts. */
import type {
  AiSajuComparisonServiceResult,
  AiSajuServiceRequest,
  SajuNarrationRequest,
} from '../reading/types';
import type { SajuNarrationPromptTemplate } from '../reading/prompt-contract';
import type {
  ExactKoreanSajuAnalysisResult,
  InterpretationTopic,
  PossibilityKoreanSajuAnalysisResult,
  SajuInterpretationCalculationRequest,
  TraditionProfileRef,
  TraditionPackRef,
} from '../traditions/types';
import type { FiveElement, Gender, TenGod } from 'saju-engine';
import type { PillarPairPunishmentDirection, PillarPosition } from 'saju-engine/advanced';
import type { SajuTimingReport } from 'saju-engine/timing';
import type { TraditionalSystemRequest, TraditionalSystemResult } from '../systems/types';

export type KoreanSajuAnalysisResult =
  | ExactKoreanSajuAnalysisResult
  | PossibilityKoreanSajuAnalysisResult;

export interface OhMySajuNarrationTask {
  readonly packRef: TraditionPackRef;
  /**
   * False when the deterministic Pack profile has no finding that may be narrated.
   * The request remains visible so hosts can explain why no model call is needed.
   */
  readonly requiresDraft: boolean;
  readonly request: SajuNarrationRequest;
}

export interface PreparedOhMySajuReading {
  readonly schemaVersion: '1';
  readonly calculationKind: KoreanSajuAnalysisResult['calculationKind'];
  /** Complete audited calculation, baseline, doctrine results, and unresolved comparison. */
  readonly analysis: KoreanSajuAnalysisResult;
  /** Exact Lichun/Jie timing facts when the caller explicitly requested them. */
  readonly timing: SajuTimingReport | null;
  /** One provider-neutral prompt contract per isolated Tradition Pack. */
  readonly narrationTasks: readonly OhMySajuNarrationTask[];
  /**
   * Content binding over analysis, timing, and every narration task. This
   * detects a draft validated against a different preparation command.
   */
  readonly binding: {
    readonly algorithm: 'sha256';
    readonly canonicalization: 'oh-my-saju-preparation-v2';
    readonly digest: string;
    readonly engineSourceRevision: string;
    readonly core: {
      readonly name: string;
      readonly version: string;
      readonly schemaVersion: string;
      readonly sourceRevision: string;
    };
    readonly runtime: {
      readonly name: 'oh-my-saju';
      readonly version: string;
      readonly schemaVersion: '1';
    };
    readonly packs: readonly {
      readonly packRef: TraditionPackRef;
      readonly profileRef: TraditionProfileRef;
      readonly contractSchemaVersion: '1';
      readonly rulesArtifactDigest: string;
      readonly fixturesArtifactDigest: string;
      readonly contractDigest: string;
      readonly knowledgeSnapshot: {
        readonly providerContract: 'tradition-knowledge-provider-v1';
        readonly adapter: 'static-files' | 'ontology-snapshot' | 'knowledge-graph-snapshot';
        readonly kind: 'static-file-snapshot' | 'ontology-snapshot' | 'knowledge-graph-snapshot';
        readonly version: string;
        readonly immutability: 'content-addressed';
        readonly algorithm: 'sha256';
        readonly canonicalization: 'ordered-file-bytes-with-path-v1';
        readonly digest: string;
        readonly provenanceContract: 'tradition-provenance-v1';
        readonly queryContract:
          | 'static-resource-query-v1'
          | 'ontology-query-v1'
          | 'knowledge-graph-query-v1';
        readonly paths: readonly string[];
      };
    }[];
    readonly reading: {
      readonly promptTemplate: SajuNarrationPromptTemplate;
      readonly outputSchemaVersion: '3';
      readonly claimGateVersion: '3';
    };
  };
}

export interface OhMySajuTimingOptions {
  readonly fromYear: number;
  readonly throughYear: number;
  readonly gender?: Gender;
  readonly luckPillarCount?: number;
}

export interface OhMySajuNarratorIdentity {
  readonly id: string;
  readonly requestedModel: string;
}

export interface OhMySajuCompatibilityParticipantRequest {
  readonly id: string;
  /** Short user-facing label such as `남성`, `여성`, `A`, or a first name. */
  readonly label: string;
  readonly calculation: SajuInterpretationCalculationRequest;
}

export interface OhMySajuCompatibilityRequest {
  readonly participants: readonly [
    OhMySajuCompatibilityParticipantRequest,
    OhMySajuCompatibilityParticipantRequest,
  ];
  /** Untrusted user question, supplied to the host only as task context. */
  readonly question: string | null;
  readonly locale: 'ko-KR';
  readonly variantPolicy: 'stable-only' | 'include-candidate-dependent';
}

export type OhMySajuCompatibilityFindingKind =
  | 'participant-day-master'
  | 'participant-month-branch'
  | 'participant-element-balance'
  | 'day-master-ten-god'
  | 'day-master-ten-god-range'
  | 'shared-stem'
  | 'shared-branch'
  | 'stem-combination'
  | 'branch-combination'
  | 'branch-clash'
  | 'branch-punishment'
  | 'branch-break'
  | 'branch-harm';

export interface OhMySajuCompatibilityFinding {
  readonly id: string;
  readonly kind: OhMySajuCompatibilityFindingKind;
  readonly tone: 'connection' | 'tension' | 'directional' | 'descriptive';
  readonly stability: 'stable' | 'candidate-dependent';
  readonly direction: 'first-to-second' | 'second-to-first' | 'symmetric' | 'participant';
  readonly participantIds: readonly [string] | readonly [string, string];
  readonly positions?: readonly [PillarPosition, PillarPosition];
  readonly punishment?: {
    readonly kind: 'directed-cycle' | 'mutual' | 'self';
    readonly direction: PillarPairPunishmentDirection;
  };
  readonly members: readonly string[];
  readonly tenGod?: TenGod;
  readonly tenGods?: readonly TenGod[];
  readonly statement: string;
  readonly candidatePairIds: readonly string[];
}

export interface OhMySajuCompatibilityParticipantView {
  readonly id: string;
  readonly label: string;
  readonly calculationKind: 'exact' | 'possibilities';
  readonly candidateCount: number;
  readonly pillars: Readonly<
    Record<
      PillarPosition,
      {
        readonly stable: boolean;
        readonly values: readonly string[];
      }
    >
  >;
  readonly tenGods: Readonly<
    Record<
      PillarPosition,
      {
        readonly stable: boolean;
        readonly values: readonly string[];
      }
    >
  >;
  readonly dayMasters: readonly string[];
  readonly monthBranches: readonly string[];
  readonly elementPercentages: Readonly<
    Record<
      FiveElement,
      {
        readonly minimum: number;
        readonly maximum: number;
      }
    >
  >;
}

export interface OhMySajuCompatibilityNarrationTask {
  readonly schemaVersion: '1';
  readonly mode: 'grounded-compatibility';
  readonly question: string | null;
  readonly instructions: readonly string[];
  readonly evidence: {
    readonly profile: {
      readonly id: 'ziping-structural-compatibility';
      readonly version: '1.0.0';
    };
    readonly participants: readonly [
      OhMySajuCompatibilityParticipantView,
      OhMySajuCompatibilityParticipantView,
    ];
    readonly findings: readonly OhMySajuCompatibilityFinding[];
  };
  readonly outputSchema: Readonly<Record<string, unknown>>;
}

export interface OhMySajuCompatibilityParagraphDraft {
  readonly text: string;
  readonly findingIds: readonly string[];
  readonly structure: {
    /** Exact ordered substring naming the two-chart basis. */
    readonly basis: string;
    /** Exact ordered substring translating the basis into an interaction. */
    readonly interpretation: string;
  };
}

export interface OhMySajuCompatibilityDraft {
  readonly schemaVersion: '1';
  readonly kind: 'compatibility';
  readonly summary: OhMySajuCompatibilityParagraphDraft;
  readonly connection: OhMySajuCompatibilityParagraphDraft;
  readonly interaction: OhMySajuCompatibilityParagraphDraft;
  readonly friction: OhMySajuCompatibilityParagraphDraft;
  readonly durability: OhMySajuCompatibilityParagraphDraft;
}

export interface PreparedOhMySajuCompatibility {
  readonly schemaVersion: '1';
  readonly participants: readonly [
    OhMySajuCompatibilityParticipantView,
    OhMySajuCompatibilityParticipantView,
  ];
  readonly candidatePairCount: number;
  readonly findings: readonly OhMySajuCompatibilityFinding[];
  readonly narrationTask: OhMySajuCompatibilityNarrationTask;
  readonly binding: {
    readonly algorithm: 'sha256';
    readonly canonicalization: 'oh-my-saju-compatibility-preparation-v1';
    readonly digest: string;
    readonly runtimeVersion: string;
    readonly profile: {
      readonly id: 'ziping-structural-compatibility';
      readonly version: '1.0.0';
    };
  };
}

export interface ValidatedOhMySajuCompatibility {
  readonly schemaVersion: '1';
  readonly binding: PreparedOhMySajuCompatibility['binding'];
  readonly participants: PreparedOhMySajuCompatibility['participants'];
  readonly candidatePairCount: number;
  readonly findings: readonly OhMySajuCompatibilityFinding[];
  readonly narrator: OhMySajuNarratorIdentity;
  readonly sourceDraft: OhMySajuCompatibilityDraft;
  readonly presentation: {
    readonly schemaVersion: '1';
    readonly kind: 'compatibility';
    readonly markdown: string;
  };
}

export interface OhMySajuNarrationDraft {
  readonly packRef: TraditionPackRef;
  /** JSON object generated against the matching narration task's outputSchema. */
  readonly output: unknown;
  readonly metadata?: {
    readonly actualModel?: string;
    readonly providerRequestId?: string;
    readonly finishReason?: string;
  };
}

export type OhMySajuParagraphSource =
  | {
      readonly kind: 'summary';
    }
  | {
      readonly kind: 'section';
      readonly topic: InterpretationTopic;
      readonly paragraphIndex: 0 | 1 | 2;
    };

/** Selects one atomic paragraph that already passed the Pack claim gate. */
export interface OhMySajuParagraphRef {
  readonly packRef: TraditionPackRef;
  readonly source: OhMySajuParagraphSource;
}

export interface OhMySajuLivedPatternRef {
  readonly paragraph: OhMySajuParagraphRef;
  /** Exact, ordered substrings of the selected paragraph. */
  readonly structure: {
    readonly domain: 'disposition' | 'execution' | 'relationships' | 'work-study';
    readonly direction: 'benefit' | 'cost' | 'descriptive';
    readonly situation: string;
    readonly behavior: string;
    readonly result: string;
  };
}

export interface OhMySajuPortraitRef {
  readonly paragraph: OhMySajuParagraphRef;
  /** Exact, ordered substrings that describe a process and the resulting self-portrait. */
  readonly structure: {
    readonly process: string;
    readonly identity: string;
  };
}

export interface OhMySajuConclusionRef {
  readonly paragraph: OhMySajuParagraphRef;
  /** Exact, ordered substrings that connect a condition to a concrete payoff. */
  readonly structure: {
    readonly condition: string;
    readonly payoff: string;
  };
}

/** @deprecated Accepted for 0.4.3 compatibility; new hosts should use the v2 default profile. */
export interface OhMySajuLegacyBroadPresentationDraft {
  readonly schemaVersion: '1';
  readonly kind: 'broad-reading';
  readonly portrait: OhMySajuPortraitRef;
  readonly atAGlance: {
    readonly disposition: OhMySajuLivedPatternRef;
    readonly execution: OhMySajuLivedPatternRef;
    readonly relationships: OhMySajuLivedPatternRef;
  };
  readonly doubleEdge: {
    readonly strength: OhMySajuLivedPatternRef;
    readonly friction: OhMySajuLivedPatternRef;
  };
  readonly workStudy: readonly [OhMySajuLivedPatternRef, OhMySajuLivedPatternRef?];
  readonly relationships: readonly [OhMySajuLivedPatternRef, OhMySajuLivedPatternRef?];
  readonly conclusion: OhMySajuConclusionRef;
}

export type OhMySajuProfileSectionRole =
  | 'core'
  | 'strength'
  | 'blind-spot'
  | 'work'
  | 'money'
  | 'relationships';

/**
 * Selects finding-backed prose and exposes the exact chart-to-interpretation
 * bridge without prescribing Korean sentence endings or coaching vocabulary.
 */
export interface OhMySajuProfileParagraphRef {
  readonly paragraph: OhMySajuParagraphRef;
  readonly structure: {
    readonly role: OhMySajuProfileSectionRole;
    /** Exact substring naming the chart placement, season, repetition, or ten-god mechanism. */
    readonly basis: string;
    /** Exact substring translating that mechanism into a lived interpretation. */
    readonly interpretation: string;
  };
}

export interface OhMySajuProfileThesisRef {
  readonly paragraph: OhMySajuParagraphRef;
  readonly structure: {
    /** Exact substring naming the chart's central evidence. */
    readonly basis: string;
    /** Exact substring giving the memorable plain-language portrait. */
    readonly portrait: string;
  };
}

/** Chart-first, evidence-visible default profile used by new broad readings. */
export interface OhMySajuDefaultProfileDraft {
  readonly schemaVersion: '2';
  readonly kind: 'default-profile';
  readonly thesis: OhMySajuProfileThesisRef;
  readonly core: readonly [OhMySajuProfileParagraphRef, OhMySajuProfileParagraphRef];
  readonly temperament: {
    readonly strength: OhMySajuProfileParagraphRef;
    readonly blindSpot: OhMySajuProfileParagraphRef;
  };
  readonly work: readonly [OhMySajuProfileParagraphRef, OhMySajuProfileParagraphRef?];
  readonly money?: readonly [OhMySajuProfileParagraphRef, OhMySajuProfileParagraphRef?];
  readonly relationships: readonly [OhMySajuProfileParagraphRef, OhMySajuProfileParagraphRef?];
}

export type OhMySajuBroadPresentationDraft =
  | OhMySajuLegacyBroadPresentationDraft
  | OhMySajuDefaultProfileDraft;

export type OhMySajuBroadPresentation =
  | {
      readonly schemaVersion: '1';
      readonly kind: 'broad-reading';
      /** Canonical references retained for audits; ordinary display uses only markdown. */
      readonly sourceRefs: OhMySajuLegacyBroadPresentationDraft;
      readonly markdown: string;
    }
  | {
      readonly schemaVersion: '2';
      readonly kind: 'default-profile';
      /** Canonical references retained for audits; ordinary display uses only markdown. */
      readonly sourceRefs: OhMySajuDefaultProfileDraft;
      readonly markdown: string;
    };

export interface PrepareOhMySajuReadingCommand {
  readonly schemaVersion?: '1';
  readonly command: 'prepare-reading';
  readonly request: AiSajuServiceRequest;
  /** Exact-time requests only. Produces exact Lichun years and Jie months. */
  readonly timing?: OhMySajuTimingOptions;
}

interface ValidateOhMySajuReadingCommandBase {
  readonly schemaVersion?: '1';
  readonly command: 'validate-reading';
  /** Must match the timing options used during preparation, when any. */
  readonly timing?: OhMySajuTimingOptions;
  /** Copy `result.binding.digest` from the matching prepare-reading response. */
  readonly preparedDigest: string;
  readonly narrator: OhMySajuNarratorIdentity;
  readonly drafts: readonly OhMySajuNarrationDraft[];
}

/** The type contract mirrors the runtime: only explicit broad mode requires final assembly. */
export type ValidateOhMySajuReadingCommand =
  | (ValidateOhMySajuReadingCommandBase & {
      readonly request: AiSajuServiceRequest & { readonly readingMode: 'broad' };
      readonly presentationDraft: OhMySajuBroadPresentationDraft;
    })
  | (ValidateOhMySajuReadingCommandBase & {
      readonly request: AiSajuServiceRequest & {
        readonly readingMode?: 'auto' | 'focused' | 'technical-audit';
      };
      readonly presentationDraft?: never;
    });

export interface RunTraditionalSystemCommand {
  readonly schemaVersion?: '1';
  readonly command: 'run-traditional-system';
  readonly request: TraditionalSystemRequest;
}

export interface PrepareOhMySajuCompatibilityCommand {
  readonly schemaVersion?: '1';
  readonly command: 'prepare-compatibility';
  readonly request: OhMySajuCompatibilityRequest;
}

export interface ValidateOhMySajuCompatibilityCommand {
  readonly schemaVersion?: '1';
  readonly command: 'validate-compatibility';
  readonly request: OhMySajuCompatibilityRequest;
  readonly preparedDigest: string;
  readonly narrator: OhMySajuNarratorIdentity;
  readonly draft: OhMySajuCompatibilityDraft;
}

export type OhMySajuCommand =
  | PrepareOhMySajuReadingCommand
  | ValidateOhMySajuReadingCommand
  | PrepareOhMySajuCompatibilityCommand
  | ValidateOhMySajuCompatibilityCommand
  | RunTraditionalSystemCommand;

export interface OhMySajuPreparedSuccess {
  readonly schemaVersion: '1';
  readonly ok: true;
  readonly command: 'prepare-reading';
  readonly result: PreparedOhMySajuReading;
}

export interface OhMySajuValidatedSuccess {
  readonly schemaVersion: '1';
  readonly ok: true;
  readonly command: 'validate-reading';
  readonly result: ValidatedOhMySajuReading;
}

export interface OhMySajuTraditionalSystemSuccess {
  readonly schemaVersion: '1';
  readonly ok: true;
  readonly command: 'run-traditional-system';
  readonly result: TraditionalSystemResult;
}

export interface OhMySajuCompatibilityPreparedSuccess {
  readonly schemaVersion: '1';
  readonly ok: true;
  readonly command: 'prepare-compatibility';
  readonly result: PreparedOhMySajuCompatibility;
}

export interface OhMySajuCompatibilityValidatedSuccess {
  readonly schemaVersion: '1';
  readonly ok: true;
  readonly command: 'validate-compatibility';
  readonly result: ValidatedOhMySajuCompatibility;
}

export interface ValidatedOhMySajuReading {
  readonly schemaVersion: '1';
  readonly calculationKind: AiSajuComparisonServiceResult['calculationKind'];
  /** The preparation contract that this validated artifact approved. */
  readonly binding: PreparedOhMySajuReading['binding'];
  readonly reading: AiSajuComparisonServiceResult;
  readonly timing: SajuTimingReport | null;
  readonly presentation: OhMySajuBroadPresentation | null;
}

export interface OhMySajuFailure {
  readonly schemaVersion: '1';
  readonly ok: false;
  readonly command: OhMySajuCommand['command'] | 'unknown';
  readonly error: {
    readonly name: string;
    readonly code: string;
    readonly message: string;
    readonly path?: readonly (string | number)[];
    readonly details?: Readonly<Record<string, unknown>>;
  };
}

export type OhMySajuResponse =
  | OhMySajuPreparedSuccess
  | OhMySajuValidatedSuccess
  | OhMySajuCompatibilityPreparedSuccess
  | OhMySajuCompatibilityValidatedSuccess
  | OhMySajuTraditionalSystemSuccess
  | OhMySajuFailure;

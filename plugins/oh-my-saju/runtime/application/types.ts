/** Two-phase application command and response contracts. */
import type {
  AiSajuComparisonServiceResult,
  AiSajuServiceRequest,
  SajuNarrationRequest,
} from '../reading/types';
import type {
  ExactKoreanSajuAnalysisResult,
  PossibilityKoreanSajuAnalysisResult,
  TraditionProfileRef,
  TraditionPackRef,
} from '../traditions/types';
import type { Gender } from 'saju-engine';
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
      readonly promptTemplate: {
        readonly id: 'saju-grounded-narration';
        readonly version: '2.0.0';
      };
      readonly outputSchemaVersion: '2';
      readonly claimGateVersion: '2';
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

export interface PrepareOhMySajuReadingCommand {
  readonly schemaVersion?: '1';
  readonly command: 'prepare-reading';
  readonly request: AiSajuServiceRequest;
  /** Exact-time requests only. Produces exact Lichun years and Jie months. */
  readonly timing?: OhMySajuTimingOptions;
}

export interface ValidateOhMySajuReadingCommand {
  readonly schemaVersion?: '1';
  readonly command: 'validate-reading';
  readonly request: AiSajuServiceRequest;
  /** Must match the timing options used during preparation, when any. */
  readonly timing?: OhMySajuTimingOptions;
  /** Copy `result.binding.digest` from the matching prepare-reading response. */
  readonly preparedDigest: string;
  readonly narrator: OhMySajuNarratorIdentity;
  readonly drafts: readonly OhMySajuNarrationDraft[];
}

export interface RunTraditionalSystemCommand {
  readonly schemaVersion?: '1';
  readonly command: 'run-traditional-system';
  readonly request: TraditionalSystemRequest;
}

export type OhMySajuCommand =
  | PrepareOhMySajuReadingCommand
  | ValidateOhMySajuReadingCommand
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

export interface ValidatedOhMySajuReading {
  readonly schemaVersion: '1';
  readonly calculationKind: AiSajuComparisonServiceResult['calculationKind'];
  /** The preparation contract that this validated artifact approved. */
  readonly binding: PreparedOhMySajuReading['binding'];
  readonly reading: AiSajuComparisonServiceResult;
  readonly timing: SajuTimingReport | null;
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
  | OhMySajuTraditionalSystemSuccess
  | OhMySajuFailure;

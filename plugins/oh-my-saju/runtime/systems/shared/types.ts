/** Shared audit contracts for plugin-owned traditional-system modules. */
import type { EngineManifest } from 'saju-engine';

export type TraditionalSystemKind = 'election' | 'tojeong-144' | 'iching' | 'ziwei' | 'liuren';

export interface TraditionalSystemModuleRef {
  readonly id: TraditionalSystemKind;
  readonly version: string;
  readonly schemaVersion: '1';
}

export interface TraditionalSystemSourceReference {
  readonly id: string;
  readonly title: string;
  readonly work: string;
  /** Stable edition, publication, revision, or captured page identity. */
  readonly editionOrSnapshot: string;
  readonly url: string;
  readonly locator: string;
  readonly textualLayer: 'base-text' | 'commentary' | 'public-transcription' | 'modern-research';
  readonly verification: 'scan-verified' | 'transcription-reviewed' | 'partially-verified';
}

export interface TraditionalSystemProfile {
  readonly id: string;
  readonly version: string;
  readonly displayName: string;
  readonly outputBoundary:
    | 'classical-rule-matches'
    | 'casting-mechanics'
    | 'natal-chart-mechanics'
    | 'divination-chart-mechanics';
  readonly sources: readonly TraditionalSystemSourceReference[];
}

export interface TraditionalSystemPolicySelection {
  readonly id: string;
  readonly version: string;
  readonly value: string;
}

export interface TraditionalSystemLimitation {
  readonly id: string;
  readonly message: string;
}

export interface TraditionalSystemAudit<Trace> {
  readonly module: TraditionalSystemModuleRef;
  readonly profile: TraditionalSystemProfile;
  readonly calculationCore: EngineManifest['engine'];
  readonly implementation: 'oh-my-saju-independent';
  readonly policies: readonly TraditionalSystemPolicySelection[];
  readonly implicitAdjustments: readonly [];
  readonly predictiveValidity: 'not-established';
  readonly interpretationScope: 'calculation-and-classical-classification-only';
  readonly limitations: readonly TraditionalSystemLimitation[];
  readonly trace: Trace;
}

export interface TraditionalSystemReport<Value, Trace> {
  readonly schemaVersion: '1';
  readonly kind: TraditionalSystemKind;
  readonly value: Value;
  readonly audit: TraditionalSystemAudit<Trace>;
}

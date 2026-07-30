import type { TraditionalSystemReport } from '../shared';

export type IChingLineValue = 6 | 7 | 8 | 9;
export type IChingLinePolarity = 'yin' | 'yang';

export type IChingTrigramId = 'qian' | 'dui' | 'li' | 'zhen' | 'xun' | 'kan' | 'gen' | 'kun';

export interface IChingTrigramArrangementSelection {
  readonly id: 'shaoyong-xiantian' | 'shuogua-houtian';
  readonly version: '1.0.0';
}

export interface IChingTrigramArrangementRequest {
  /**
   * Optional, explicit directional-arrangement metadata to attach to the cast.
   * When omitted, no Xiantian or Houtian arrangement is assumed.
   */
  readonly trigramArrangement?: IChingTrigramArrangementSelection;
}

export interface IChingManualLinesRequest extends IChingTrigramArrangementRequest {
  readonly kind: 'iching';
  readonly method: 'manual-lines';
  /** Six explicit values, ordered from the bottom line to the top line. */
  readonly lines: readonly IChingLineValue[];
}

export type IChingCoinFace = 'back' | 'inscribedFace';
export type IChingCoinCast = readonly [IChingCoinFace, IChingCoinFace, IChingCoinFace];

export interface IChingThreeCoinsRequest extends IChingTrigramArrangementRequest {
  readonly kind: 'iching';
  readonly method: 'three-coins';
  /** Six explicit casts, ordered from the bottom line to the top line. */
  readonly casts: readonly IChingCoinCast[];
}

export interface IChingYarrowSplit {
  readonly left: number;
  readonly right: number;
}

export interface IChingYarrowLineInputTrace {
  /** Three explicit splits in chronological order for one line. */
  readonly changes: readonly IChingYarrowSplit[];
}

export interface IChingYarrowRequest extends IChingTrigramArrangementRequest {
  readonly kind: 'iching';
  readonly method: 'yarrow';
  /** Six explicit line traces, ordered from the bottom line to the top line. */
  readonly traces: readonly IChingYarrowLineInputTrace[];
}

export type IChingRequest =
  | IChingManualLinesRequest
  | IChingThreeCoinsRequest
  | IChingYarrowRequest;

export interface IChingLine {
  readonly position: 1 | 2 | 3 | 4 | 5 | 6;
  readonly value: IChingLineValue;
  readonly traditionalClass: 'old-yin' | 'young-yang' | 'young-yin' | 'old-yang';
  readonly polarity: IChingLinePolarity;
  readonly changedPolarity: IChingLinePolarity;
  readonly moving: boolean;
}

export interface IChingTrigram {
  readonly id: IChingTrigramId;
  readonly hanja: '乾' | '兌' | '離' | '震' | '巽' | '坎' | '艮' | '坤';
  readonly symbol: string;
  /** Three binary lines in bottom-to-top order. */
  readonly bits: string;
  readonly lineOrder: 'bottom-to-top';
}

export type IChingCompassDirection =
  | 'north'
  | 'northeast'
  | 'east'
  | 'southeast'
  | 'south'
  | 'southwest'
  | 'west'
  | 'northwest';

export interface IChingTrigramArrangementProfile extends IChingTrigramArrangementSelection {
  readonly displayName: string;
  readonly sourceIds: readonly string[];
}

export interface IChingTrigramArrangementPosition {
  readonly direction: IChingCompassDirection;
  readonly trigram: IChingTrigram;
  /** Present only for the Xiantian 乾一…坤八 sequence. */
  readonly number?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
}

export interface IChingTrigramArrangement {
  readonly profile: IChingTrigramArrangementProfile;
  readonly orientation: 'south-at-top';
  readonly lineOrder: 'bottom-to-top';
  readonly numbering: 'xiantian-sequence' | 'none';
  readonly positions: readonly IChingTrigramArrangementPosition[];
  /** Related conventions deliberately not merged into this profile. */
  readonly excludedConventions?: readonly ['luoshu-number'];
}

export interface IChingHexagram {
  readonly number: number;
  readonly hanja: string;
  readonly symbol: string;
  /** Six binary lines in bottom-to-top order. */
  readonly bits: string;
  readonly lineOrder: 'bottom-to-top';
  readonly lowerTrigram: IChingTrigram;
  readonly upperTrigram: IChingTrigram;
}

export interface IChingProfileRef {
  readonly id: string;
  readonly version: '1.0.0';
}

export interface IChingProfiles {
  readonly mechanics: IChingProfileRef;
  readonly casting: IChingProfileRef;
  readonly hexagramOrder: IChingProfileRef;
  readonly trigramArrangement?: IChingTrigramArrangementSelection;
}

export interface IChingManualCastTrace {
  readonly method: 'manual-lines';
  readonly suppliedLines: readonly IChingLineValue[];
  readonly derivedLines: readonly IChingLineValue[];
}

export interface IChingCoinCastTraceEntry {
  readonly position: 1 | 2 | 3 | 4 | 5 | 6;
  readonly faces: IChingCoinCast;
  readonly backCount: 0 | 1 | 2 | 3;
  readonly lineValue: IChingLineValue;
}

export interface IChingThreeCoinsCastTrace {
  readonly method: 'three-coins';
  readonly casts: readonly IChingCoinCastTraceEntry[];
  readonly derivedLines: readonly IChingLineValue[];
  readonly exactFairIndependentCoinWeights: {
    readonly values: readonly [6, 7, 8, 9];
    readonly weightsOutOfEight: readonly [1, 3, 3, 1];
  };
}

export interface IChingYarrowChangeTrace {
  readonly change: 1 | 2 | 3;
  readonly startStalks: number;
  readonly left: number;
  readonly right: number;
  readonly hangFromRight: 1;
  readonly rightAfterHang: number;
  readonly leftRemainder: 1 | 2 | 3 | 4;
  readonly rightRemainder: 1 | 2 | 3 | 4;
  readonly removedStalks: number;
  readonly remainingStalks: number;
}

export interface IChingYarrowLineTrace {
  readonly position: 1 | 2 | 3 | 4 | 5 | 6;
  readonly startStalks: 49;
  readonly changes: readonly IChingYarrowChangeTrace[];
  readonly finalStalks: 24 | 28 | 32 | 36;
  readonly lineValue: IChingLineValue;
}

export interface IChingYarrowCastTrace {
  readonly method: 'yarrow';
  readonly traces: readonly IChingYarrowLineTrace[];
  readonly derivedLines: readonly IChingLineValue[];
  readonly probabilityModel: 'not-specified-by-classical-trace-profile';
}

export type IChingCastTrace =
  | IChingManualCastTrace
  | IChingThreeCoinsCastTrace
  | IChingYarrowCastTrace;

export interface IChingValue {
  readonly lineOrder: 'bottom-to-top';
  readonly method: IChingRequest['method'];
  readonly lines: readonly IChingLine[];
  readonly baseHexagram: IChingHexagram;
  readonly changedHexagram: IChingHexagram;
  readonly movingLines: readonly (1 | 2 | 3 | 4 | 5 | 6)[];
  readonly castTrace: IChingCastTrace;
  readonly profiles: IChingProfiles;
  readonly trigramArrangement?: IChingTrigramArrangement;
  readonly interpretations: readonly [];
}

export interface IChingAuditTrace {
  readonly cast: IChingCastTrace;
  readonly baseBits: string;
  readonly changedBits: string;
  readonly lookup: {
    readonly sequence: 'received-king-wen-order';
    readonly unicodeFormula: 'U+4DBF + hexagram number';
  };
}

export type IChingReport = TraditionalSystemReport<IChingValue, IChingAuditTrace> & {
  readonly kind: 'iching';
};

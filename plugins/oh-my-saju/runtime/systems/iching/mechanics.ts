import { ENGINE_MANIFEST } from 'saju-engine';
import { deepFreeze } from '../../internal/deep-freeze';
import { TraditionalSystemError } from '../shared';
import { getIChingTrigramArrangement } from './arrangements';
import { lookupKingWenHexagram } from './hexagrams';
import { ICHING_LIMITATIONS, ICHING_POLICIES, ICHING_PROFILE, ichingProfiles } from './profiles';
import type {
  IChingAuditTrace,
  IChingCoinCast,
  IChingCoinCastTraceEntry,
  IChingCoinFace,
  IChingHexagram,
  IChingLine,
  IChingLinePolarity,
  IChingLineValue,
  IChingProfiles,
  IChingReport,
  IChingRequest,
  IChingTrigram,
  IChingCastTrace,
  IChingYarrowChangeTrace,
  IChingYarrowLineTrace,
} from './types';

const TRIGRAMS: Readonly<Record<string, IChingTrigram>> = deepFreeze({
  '111': { id: 'qian', hanja: '乾', symbol: '☰', bits: '111', lineOrder: 'bottom-to-top' },
  '110': { id: 'dui', hanja: '兌', symbol: '☱', bits: '110', lineOrder: 'bottom-to-top' },
  '101': { id: 'li', hanja: '離', symbol: '☲', bits: '101', lineOrder: 'bottom-to-top' },
  '100': { id: 'zhen', hanja: '震', symbol: '☳', bits: '100', lineOrder: 'bottom-to-top' },
  '011': { id: 'xun', hanja: '巽', symbol: '☴', bits: '011', lineOrder: 'bottom-to-top' },
  '010': { id: 'kan', hanja: '坎', symbol: '☵', bits: '010', lineOrder: 'bottom-to-top' },
  '001': { id: 'gen', hanja: '艮', symbol: '☶', bits: '001', lineOrder: 'bottom-to-top' },
  '000': { id: 'kun', hanja: '坤', symbol: '☷', bits: '000', lineOrder: 'bottom-to-top' },
});

function invalidInput(message: string, path: readonly (string | number)[]): never {
  throw new TraditionalSystemError('INVALID_SYSTEM_INPUT', message, { path });
}

function missingCastEvidence(message: string, path: readonly (string | number)[]): never {
  throw new TraditionalSystemError('MISSING_CAST_EVIDENCE', message, { path });
}

function linePolarity(value: IChingLineValue): IChingLinePolarity {
  return value === 6 || value === 8 ? 'yin' : 'yang';
}

function changedPolarity(value: IChingLineValue): IChingLinePolarity {
  if (value === 6) return 'yang';
  if (value === 9) return 'yin';
  return linePolarity(value);
}

function lineClass(value: IChingLineValue): IChingLine['traditionalClass'] {
  if (value === 6) return 'old-yin';
  if (value === 7) return 'young-yang';
  if (value === 8) return 'young-yin';
  return 'old-yang';
}

function validateManualLines(
  request: Extract<IChingRequest, { readonly method: 'manual-lines' }>,
): readonly IChingLineValue[] {
  const linesValue: unknown = request.lines;
  if (!Array.isArray(linesValue) || linesValue.length !== 6) {
    missingCastEvidence('Manual I Ching casts require exactly six lines.', ['lines']);
  }
  const lines: readonly unknown[] = linesValue;
  return lines.map((value, index) => {
    if (value !== 6 && value !== 7 && value !== 8 && value !== 9) {
      invalidInput('Each I Ching line must be 6, 7, 8, or 9.', ['lines', index]);
    }
    return value;
  });
}

function isCoinFace(value: unknown): value is IChingCoinFace {
  return value === 'back' || value === 'inscribedFace';
}

function deriveThreeCoinCast(request: Extract<IChingRequest, { readonly method: 'three-coins' }>): {
  readonly values: readonly IChingLineValue[];
  readonly trace: Extract<IChingCastTrace, { readonly method: 'three-coins' }>;
} {
  const castsValue: unknown = request.casts;
  if (!Array.isArray(castsValue) || castsValue.length !== 6) {
    missingCastEvidence('Three-coin I Ching casts require exactly six casts.', ['casts']);
  }
  const casts: readonly unknown[] = castsValue;
  const entries = casts.map((cast, index): IChingCoinCastTraceEntry => {
    if (!Array.isArray(cast) || cast.length !== 3) {
      invalidInput('Each three-coin cast requires exactly three faces.', ['casts', index]);
    }
    const faceValues: readonly unknown[] = cast;
    const [first, second, third] = faceValues;
    if (!isCoinFace(first)) {
      invalidInput('Coin faces must be "back" or "inscribedFace".', ['casts', index, 0]);
    }
    if (!isCoinFace(second)) {
      invalidInput('Coin faces must be "back" or "inscribedFace".', ['casts', index, 1]);
    }
    if (!isCoinFace(third)) {
      invalidInput('Coin faces must be "back" or "inscribedFace".', ['casts', index, 2]);
    }
    const faces: IChingCoinCast = [first, second, third];
    const backCount = faces.filter((face) => face === 'back').length as 0 | 1 | 2 | 3;
    return {
      position: (index + 1) as IChingCoinCastTraceEntry['position'],
      faces,
      backCount,
      lineValue: ([6, 7, 8, 9] as const)[backCount],
    };
  });
  const values = entries.map(({ lineValue }) => lineValue);
  return {
    values,
    trace: {
      method: 'three-coins',
      casts: entries,
      derivedLines: values,
      exactFairIndependentCoinWeights: {
        values: [6, 7, 8, 9],
        weightsOutOfEight: [1, 3, 3, 1],
      },
    },
  };
}

function fourRemainder(stalks: number): 1 | 2 | 3 | 4 {
  return (((stalks - 1) % 4) + 1) as 1 | 2 | 3 | 4;
}

function deriveYarrowCast(request: Extract<IChingRequest, { readonly method: 'yarrow' }>): {
  readonly values: readonly IChingLineValue[];
  readonly trace: Extract<IChingCastTrace, { readonly method: 'yarrow' }>;
} {
  const tracesValue: unknown = request.traces;
  if (!Array.isArray(tracesValue) || tracesValue.length !== 6) {
    missingCastEvidence('Yarrow I Ching casts require exactly six line traces.', ['traces']);
  }
  const traceValues: readonly unknown[] = tracesValue;
  const traces = traceValues.map((lineTrace, lineIndex): IChingYarrowLineTrace => {
    if (
      lineTrace === null ||
      typeof lineTrace !== 'object' ||
      !('changes' in lineTrace) ||
      !Array.isArray(lineTrace.changes) ||
      lineTrace.changes.length !== 3
    ) {
      invalidInput('Each yarrow line requires exactly three explicit changes.', [
        'traces',
        lineIndex,
        'changes',
      ]);
    }
    const changeValues: readonly unknown[] = lineTrace.changes;
    let startStalks = 49;
    const changes = changeValues.map((split, changeIndex): IChingYarrowChangeTrace => {
      const path = ['traces', lineIndex, 'changes', changeIndex] as const;
      if (
        split === null ||
        typeof split !== 'object' ||
        !('left' in split) ||
        typeof split.left !== 'number' ||
        !Number.isInteger(split.left) ||
        !('right' in split) ||
        typeof split.right !== 'number' ||
        !Number.isInteger(split.right) ||
        split.left <= 0 ||
        split.right <= 1
      ) {
        invalidInput(
          'A yarrow split requires positive integer left and right piles, with a stalk left after hanging one from the right.',
          path,
        );
      }
      if (split.left + split.right !== startStalks) {
        invalidInput('A yarrow split must equal the stalks remaining from the prior change.', path);
      }
      const rightAfterHang = split.right - 1;
      const leftRemainder = fourRemainder(split.left);
      const rightRemainder = fourRemainder(rightAfterHang);
      const removedStalks = 1 + leftRemainder + rightRemainder;
      const remainingStalks = startStalks - removedStalks;
      const allowedRemoved = changeIndex === 0 ? [5, 9] : [4, 8];
      if (
        !allowedRemoved.includes(removedStalks) ||
        remainingStalks <= 0 ||
        remainingStalks % 4 !== 0
      ) {
        invalidInput('The yarrow change does not produce a valid four-stalk remainder.', path);
      }
      const changeTrace: IChingYarrowChangeTrace = {
        change: (changeIndex + 1) as 1 | 2 | 3,
        startStalks,
        left: split.left,
        right: split.right,
        hangFromRight: 1,
        rightAfterHang,
        leftRemainder,
        rightRemainder,
        removedStalks,
        remainingStalks,
      };
      startStalks = remainingStalks;
      return changeTrace;
    });
    if (startStalks !== 24 && startStalks !== 28 && startStalks !== 32 && startStalks !== 36) {
      invalidInput('A completed yarrow line must leave 24, 28, 32, or 36 stalks.', [
        'traces',
        lineIndex,
      ]);
    }
    return {
      position: (lineIndex + 1) as IChingYarrowLineTrace['position'],
      startStalks: 49,
      changes,
      finalStalks: startStalks,
      lineValue: startStalks === 24 ? 6 : startStalks === 28 ? 7 : startStalks === 32 ? 8 : 9,
    };
  });
  const values = traces.map(({ lineValue }) => lineValue);
  return {
    values,
    trace: {
      method: 'yarrow',
      traces,
      derivedLines: values,
      probabilityModel: 'not-specified-by-classical-trace-profile',
    },
  };
}

function deriveCast(request: IChingRequest): {
  readonly values: readonly IChingLineValue[];
  readonly trace: IChingCastTrace;
  readonly profiles: IChingProfiles;
} {
  if (request.method === 'manual-lines') {
    const values = validateManualLines(request);
    return {
      values,
      trace: {
        method: 'manual-lines',
        suppliedLines: [...values],
        derivedLines: [...values],
      },
      profiles: ichingProfiles('manual-lines-explicit'),
    };
  }
  if (request.method === 'three-coins') {
    const derived = deriveThreeCoinCast(request);
    return {
      values: derived.values,
      trace: derived.trace,
      profiles: ichingProfiles('three-coin-yiyin'),
    };
  }
  const derived = deriveYarrowCast(request);
  return {
    values: derived.values,
    trace: derived.trace,
    profiles: ichingProfiles('zhuxi-yarrow'),
  };
}

function trigram(bits: string): IChingTrigram {
  const found = TRIGRAMS[bits];
  if (found === undefined) {
    throw new TraditionalSystemError(
      'SYSTEM_INVARIANT_VIOLATION',
      `Unknown trigram bit pattern: ${bits}.`,
    );
  }
  return found;
}

function hexagram(bits: string): IChingHexagram {
  const found = lookupKingWenHexagram(bits);
  return {
    ...found,
    symbol: String.fromCodePoint(0x4dbf + found.number),
    bits,
    lineOrder: 'bottom-to-top',
    lowerTrigram: trigram(bits.slice(0, 3)),
    upperTrigram: trigram(bits.slice(3, 6)),
  };
}

export function castIChing(request: IChingRequest): IChingReport {
  if (request === null || typeof request !== 'object' || request.kind !== 'iching') {
    invalidInput('I Ching request.kind must be "iching".', ['kind']);
  }
  if (
    request.method !== 'manual-lines' &&
    request.method !== 'three-coins' &&
    request.method !== 'yarrow'
  ) {
    throw new TraditionalSystemError('UNSUPPORTED_SYSTEM_PROFILE', 'Unknown I Ching cast method.', {
      path: ['method'],
    });
  }

  const derived = deriveCast(request);
  const values = derived.values;
  const lines = values.map(
    (value, index): IChingLine => ({
      position: (index + 1) as IChingLine['position'],
      value,
      traditionalClass: lineClass(value),
      polarity: linePolarity(value),
      changedPolarity: changedPolarity(value),
      moving: value === 6 || value === 9,
    }),
  );
  const baseBits = lines.map(({ polarity }) => (polarity === 'yang' ? '1' : '0')).join('');
  const changedBits = lines
    .map(({ changedPolarity: polarity }) => (polarity === 'yang' ? '1' : '0'))
    .join('');
  const castTrace = derived.trace;
  const trigramArrangement =
    request.trigramArrangement === undefined
      ? undefined
      : getIChingTrigramArrangement(request.trigramArrangement);
  const profiles =
    request.trigramArrangement === undefined
      ? derived.profiles
      : {
          ...derived.profiles,
          trigramArrangement: request.trigramArrangement,
        };
  const trace: IChingAuditTrace = {
    cast: castTrace,
    baseBits,
    changedBits,
    lookup: {
      sequence: 'received-king-wen-order',
      unicodeFormula: 'U+4DBF + hexagram number',
    },
  };

  return deepFreeze({
    schemaVersion: '1',
    kind: 'iching',
    value: {
      lineOrder: 'bottom-to-top',
      method: request.method,
      lines,
      baseHexagram: hexagram(baseBits),
      changedHexagram: hexagram(changedBits),
      movingLines: lines.filter(({ moving }) => moving).map(({ position }) => position),
      castTrace,
      profiles,
      ...(trigramArrangement === undefined ? {} : { trigramArrangement }),
      interpretations: [],
    },
    audit: {
      module: { id: 'iching', version: '1.0.0', schemaVersion: '1' },
      profile: ICHING_PROFILE,
      calculationCore: ENGINE_MANIFEST.engine,
      implementation: 'oh-my-saju-independent',
      policies:
        request.trigramArrangement === undefined
          ? ICHING_POLICIES
          : [
              ...ICHING_POLICIES,
              {
                id: 'trigram-arrangement',
                version: request.trigramArrangement.version,
                value: request.trigramArrangement.id,
              },
            ],
      implicitAdjustments: [],
      predictiveValidity: 'not-established',
      interpretationScope: 'calculation-and-classical-classification-only',
      limitations: ICHING_LIMITATIONS,
      trace,
    },
  });
}

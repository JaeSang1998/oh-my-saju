import { describe, expect, test } from 'vitest';
import { castIChing } from './index';

const TRIGRAM_BITS = ['111', '110', '101', '100', '011', '010', '001', '000'] as const;
const KING_WEN_NUMBERS_BY_UPPER_AND_LOWER = [
  [1, 10, 13, 25, 44, 6, 33, 12],
  [43, 58, 49, 17, 28, 47, 31, 45],
  [14, 38, 30, 21, 50, 64, 56, 35],
  [34, 54, 55, 51, 32, 40, 62, 16],
  [9, 61, 37, 42, 57, 59, 53, 20],
  [5, 60, 63, 3, 48, 29, 39, 8],
  [26, 41, 22, 27, 18, 4, 52, 23],
  [11, 19, 36, 24, 46, 7, 15, 2],
] as const;
const KING_WEN_HANJA = [
  '乾',
  '坤',
  '屯',
  '蒙',
  '需',
  '訟',
  '師',
  '比',
  '小畜',
  '履',
  '泰',
  '否',
  '同人',
  '大有',
  '謙',
  '豫',
  '隨',
  '蠱',
  '臨',
  '觀',
  '噬嗑',
  '賁',
  '剝',
  '復',
  '無妄',
  '大畜',
  '頤',
  '大過',
  '坎',
  '離',
  '咸',
  '恆',
  '遯',
  '大壯',
  '晉',
  '明夷',
  '家人',
  '睽',
  '蹇',
  '解',
  '損',
  '益',
  '夬',
  '姤',
  '萃',
  '升',
  '困',
  '井',
  '革',
  '鼎',
  '震',
  '艮',
  '漸',
  '歸妹',
  '豐',
  '旅',
  '巽',
  '兌',
  '渙',
  '節',
  '中孚',
  '小過',
  '既濟',
  '未濟',
] as const;
const OLD_YANG_YARROW_TRACE = {
  changes: [
    { left: 1, right: 48 },
    { left: 1, right: 43 },
    { left: 1, right: 39 },
  ],
} as const;
const OLD_YIN_YARROW_TRACE = {
  changes: [
    { left: 4, right: 45 },
    { left: 4, right: 36 },
    { left: 4, right: 28 },
  ],
} as const;
const YOUNG_YANG_YARROW_TRACE = {
  changes: [
    { left: 4, right: 45 },
    { left: 1, right: 39 },
    { left: 4, right: 32 },
  ],
} as const;
const YOUNG_YIN_YARROW_TRACE = {
  changes: [
    { left: 1, right: 48 },
    { left: 1, right: 43 },
    { left: 4, right: 36 },
  ],
} as const;

describe('castIChing', () => {
  test('stores manual lines bottom-to-top and changes old yang at line one', () => {
    const report = castIChing({
      kind: 'iching',
      method: 'manual-lines',
      lines: [9, 7, 7, 7, 7, 7],
    });

    expect(report.value).toMatchObject({
      lineOrder: 'bottom-to-top',
      lines: [
        { position: 1, value: 9, polarity: 'yang', moving: true },
        { position: 2, value: 7, polarity: 'yang', moving: false },
        { position: 3, value: 7, polarity: 'yang', moving: false },
        { position: 4, value: 7, polarity: 'yang', moving: false },
        { position: 5, value: 7, polarity: 'yang', moving: false },
        { position: 6, value: 7, polarity: 'yang', moving: false },
      ],
      baseHexagram: { number: 1, hanja: '乾', symbol: '䷀' },
      changedHexagram: { number: 44, hanja: '姤', symbol: '䷫' },
      movingLines: [1],
    });
  });

  test.each([
    {
      lines: [8, 8, 8, 8, 8, 8] as const,
      number: 2,
      hanja: '坤',
      symbol: '䷁',
      lowerTrigram: '坤',
      upperTrigram: '坤',
    },
    {
      lines: [7, 8, 7, 8, 7, 8] as const,
      number: 63,
      hanja: '既濟',
      symbol: '䷾',
      lowerTrigram: '離',
      upperTrigram: '坎',
    },
    {
      lines: [8, 7, 8, 7, 8, 7] as const,
      number: 64,
      hanja: '未濟',
      symbol: '䷿',
      lowerTrigram: '坎',
      upperTrigram: '離',
    },
  ])('resolves received hexagram #$number from bottom-to-top lines', (fixture) => {
    const report = castIChing({
      kind: 'iching',
      method: 'manual-lines',
      lines: fixture.lines,
    });

    expect(report.value.baseHexagram).toMatchObject({
      number: fixture.number,
      hanja: fixture.hanja,
      symbol: fixture.symbol,
      lowerTrigram: { hanja: fixture.lowerTrigram },
      upperTrigram: { hanja: fixture.upperTrigram },
    });
  });

  test('covers every lower/upper trigram pair in the received 64-hexagram sequence', () => {
    for (const [upperIndex, row] of KING_WEN_NUMBERS_BY_UPPER_AND_LOWER.entries()) {
      for (const [lowerIndex, expectedNumber] of row.entries()) {
        const bits = `${TRIGRAM_BITS[lowerIndex]}${TRIGRAM_BITS[upperIndex]}`;
        const report = castIChing({
          kind: 'iching',
          method: 'manual-lines',
          lines: [...bits].map((bit) => (bit === '1' ? 7 : 8)),
        });

        expect(report.value.baseHexagram).toMatchObject({
          number: expectedNumber,
          hanja: KING_WEN_HANJA[expectedNumber - 1],
          symbol: String.fromCodePoint(0x4dbf + expectedNumber),
        });
      }
    }
  });

  test.each([
    {
      face: 'back' as const,
      lineValue: 9,
      baseNumber: 1,
      changedNumber: 2,
      backCount: 3,
    },
    {
      face: 'inscribedFace' as const,
      lineValue: 6,
      baseNumber: 2,
      changedNumber: 1,
      backCount: 0,
    },
  ])('derives all-$face three-coin casts without hidden randomness', (fixture) => {
    const cast = [fixture.face, fixture.face, fixture.face] as const;
    const report = castIChing({
      kind: 'iching',
      method: 'three-coins',
      casts: [cast, cast, cast, cast, cast, cast],
    });

    expect(report.value).toMatchObject({
      baseHexagram: { number: fixture.baseNumber },
      changedHexagram: { number: fixture.changedNumber },
      movingLines: [1, 2, 3, 4, 5, 6],
      profiles: { casting: { id: 'three-coin-yiyin', version: '1.0.0' } },
      castTrace: {
        method: 'three-coins',
        casts: [1, 2, 3, 4, 5, 6].map((position) => ({
          faces: cast,
          backCount: fixture.backCount,
          lineValue: fixture.lineValue,
          position,
        })),
        derivedLines: [
          fixture.lineValue,
          fixture.lineValue,
          fixture.lineValue,
          fixture.lineValue,
          fixture.lineValue,
          fixture.lineValue,
        ],
      },
    });
  });

  test.each([
    {
      cast: ['back', 'inscribedFace', 'inscribedFace'] as const,
      backCount: 1,
      lineValue: 7,
      hexagramNumber: 1,
    },
    {
      cast: ['back', 'back', 'inscribedFace'] as const,
      backCount: 2,
      lineValue: 8,
      hexagramNumber: 2,
    },
  ])('maps $backCount backs to stable line $lineValue', (fixture) => {
    const report = castIChing({
      kind: 'iching',
      method: 'three-coins',
      casts: [fixture.cast, fixture.cast, fixture.cast, fixture.cast, fixture.cast, fixture.cast],
    });

    expect(report.value.lines.map(({ value, moving }) => ({ value, moving }))).toEqual([
      { value: fixture.lineValue, moving: false },
      { value: fixture.lineValue, moving: false },
      { value: fixture.lineValue, moving: false },
      { value: fixture.lineValue, moving: false },
      { value: fixture.lineValue, moving: false },
      { value: fixture.lineValue, moving: false },
    ]);
    expect(report.value.baseHexagram.number).toBe(fixture.hexagramNumber);
    expect(report.value.changedHexagram.number).toBe(fixture.hexagramNumber);
  });

  test('replays six explicit Zhu Xi yarrow traces from 49 stalks per line', () => {
    const report = castIChing({
      kind: 'iching',
      method: 'yarrow',
      traces: [
        OLD_YANG_YARROW_TRACE,
        OLD_YANG_YARROW_TRACE,
        OLD_YANG_YARROW_TRACE,
        OLD_YANG_YARROW_TRACE,
        OLD_YANG_YARROW_TRACE,
        OLD_YANG_YARROW_TRACE,
      ],
    });

    expect(report.value).toMatchObject({
      baseHexagram: { number: 1, hanja: '乾' },
      changedHexagram: { number: 2, hanja: '坤' },
      movingLines: [1, 2, 3, 4, 5, 6],
      profiles: { casting: { id: 'zhuxi-yarrow', version: '1.0.0' } },
      castTrace: {
        method: 'yarrow',
        derivedLines: [9, 9, 9, 9, 9, 9],
        probabilityModel: 'not-specified-by-classical-trace-profile',
      },
    });
    if (report.value.castTrace.method !== 'yarrow') {
      throw new Error('Expected a yarrow cast trace.');
    }
    expect(report.value.castTrace.traces[0]).toMatchObject({
      position: 1,
      startStalks: 49,
      changes: [
        {
          change: 1,
          startStalks: 49,
          left: 1,
          right: 48,
          hangFromRight: 1,
          leftRemainder: 1,
          rightRemainder: 3,
          removedStalks: 5,
          remainingStalks: 44,
        },
        {
          change: 2,
          startStalks: 44,
          left: 1,
          right: 43,
          hangFromRight: 1,
          leftRemainder: 1,
          rightRemainder: 2,
          removedStalks: 4,
          remainingStalks: 40,
        },
        {
          change: 3,
          startStalks: 40,
          left: 1,
          right: 39,
          hangFromRight: 1,
          leftRemainder: 1,
          rightRemainder: 2,
          removedStalks: 4,
          remainingStalks: 36,
        },
      ],
      finalStalks: 36,
      lineValue: 9,
    });
  });

  test('rejects a yarrow change whose explicit split does not equal the prior remainder', () => {
    expect(() =>
      castIChing({
        kind: 'iching',
        method: 'yarrow',
        traces: [
          {
            changes: [
              { left: 1, right: 48 },
              { left: 1, right: 43 },
              { left: 1, right: 38 },
            ],
          },
          OLD_YANG_YARROW_TRACE,
          OLD_YANG_YARROW_TRACE,
          OLD_YANG_YARROW_TRACE,
          OLD_YANG_YARROW_TRACE,
          OLD_YANG_YARROW_TRACE,
        ],
      }),
    ).toThrowError(
      expect.objectContaining({
        code: 'INVALID_SYSTEM_INPUT',
        path: ['traces', 0, 'changes', 2],
      }),
    );
  });

  test('replays the documented 49-to-24 old-yin yarrow trace as moving yin', () => {
    const report = castIChing({
      kind: 'iching',
      method: 'yarrow',
      traces: [
        OLD_YIN_YARROW_TRACE,
        OLD_YIN_YARROW_TRACE,
        OLD_YIN_YARROW_TRACE,
        OLD_YIN_YARROW_TRACE,
        OLD_YIN_YARROW_TRACE,
        OLD_YIN_YARROW_TRACE,
      ],
    });

    expect(report.value).toMatchObject({
      lines: [
        { value: 6, polarity: 'yin', changedPolarity: 'yang', moving: true },
        { value: 6, polarity: 'yin', changedPolarity: 'yang', moving: true },
        { value: 6, polarity: 'yin', changedPolarity: 'yang', moving: true },
        { value: 6, polarity: 'yin', changedPolarity: 'yang', moving: true },
        { value: 6, polarity: 'yin', changedPolarity: 'yang', moving: true },
        { value: 6, polarity: 'yin', changedPolarity: 'yang', moving: true },
      ],
      baseHexagram: { number: 2, hanja: '坤' },
      changedHexagram: { number: 1, hanja: '乾' },
    });
    if (report.value.castTrace.method !== 'yarrow') {
      throw new Error('Expected a yarrow cast trace.');
    }
    expect(report.value.castTrace.traces[0]).toMatchObject({
      finalStalks: 24,
      lineValue: 6,
      changes: [
        { removedStalks: 9, remainingStalks: 40 },
        { removedStalks: 8, remainingStalks: 32 },
        { removedStalks: 8, remainingStalks: 24 },
      ],
    });
  });

  test.each([
    {
      trace: YOUNG_YANG_YARROW_TRACE,
      finalStalks: 28,
      lineValue: 7,
      polarity: 'yang',
      hexagramNumber: 1,
    },
    {
      trace: YOUNG_YIN_YARROW_TRACE,
      finalStalks: 32,
      lineValue: 8,
      polarity: 'yin',
      hexagramNumber: 2,
    },
  ])('replays stable yarrow outcome $finalStalks as line $lineValue', (fixture) => {
    const report = castIChing({
      kind: 'iching',
      method: 'yarrow',
      traces: [
        fixture.trace,
        fixture.trace,
        fixture.trace,
        fixture.trace,
        fixture.trace,
        fixture.trace,
      ],
    });

    expect(
      report.value.lines.map(({ value, polarity, moving }) => ({ value, polarity, moving })),
    ).toEqual([
      { value: fixture.lineValue, polarity: fixture.polarity, moving: false },
      { value: fixture.lineValue, polarity: fixture.polarity, moving: false },
      { value: fixture.lineValue, polarity: fixture.polarity, moving: false },
      { value: fixture.lineValue, polarity: fixture.polarity, moving: false },
      { value: fixture.lineValue, polarity: fixture.polarity, moving: false },
      { value: fixture.lineValue, polarity: fixture.polarity, moving: false },
    ]);
    expect(report.value.baseHexagram.number).toBe(fixture.hexagramNumber);
    expect(report.value.changedHexagram.number).toBe(fixture.hexagramNumber);
  });

  test('rejects missing or malformed cast evidence instead of generating a random cast', () => {
    expect(() =>
      castIChing({
        kind: 'iching',
        method: 'three-coins',
        casts: [
          ['back', 'back', 'back'],
          ['back', 'back', 'back'],
          ['back', 'back', 'back'],
          ['back', 'back', 'back'],
          ['back', 'back', 'back'],
        ],
      }),
    ).toThrowError(
      expect.objectContaining({
        code: 'MISSING_CAST_EVIDENCE',
        path: ['casts'],
      }),
    );
    expect(() =>
      castIChing({
        kind: 'iching',
        method: 'manual-lines',
        lines: [7, 7, 7, 7, 7, 5] as never,
      }),
    ).toThrowError(
      expect.objectContaining({
        code: 'INVALID_SYSTEM_INPUT',
        path: ['lines', 5],
      }),
    );
    expect(() =>
      castIChing({
        kind: 'iching',
        method: 'three-coins',
        casts: [
          ['back', 'back'] as never,
          ['back', 'back', 'back'],
          ['back', 'back', 'back'],
          ['back', 'back', 'back'],
          ['back', 'back', 'back'],
          ['back', 'back', 'back'],
        ],
      }),
    ).toThrowError(
      expect.objectContaining({
        code: 'INVALID_SYSTEM_INPUT',
        path: ['casts', 0],
      }),
    );
    expect(() =>
      castIChing({
        kind: 'iching',
        method: 'yarrow',
        traces: [
          {
            changes: [
              { left: 1, right: 48 },
              { left: 1, right: 43 },
            ],
          },
          OLD_YANG_YARROW_TRACE,
          OLD_YANG_YARROW_TRACE,
          OLD_YANG_YARROW_TRACE,
          OLD_YANG_YARROW_TRACE,
          OLD_YANG_YARROW_TRACE,
        ],
      } as never),
    ).toThrowError(
      expect.objectContaining({
        code: 'INVALID_SYSTEM_INPUT',
        path: ['traces', 0, 'changes'],
      }),
    );
  });

  test('rejects unknown kind and method instead of guessing another casting profile', () => {
    expect(() =>
      castIChing({
        kind: 'juyeok',
        method: 'manual-lines',
        lines: [7, 7, 7, 7, 7, 7],
      } as never),
    ).toThrowError(
      expect.objectContaining({
        code: 'INVALID_SYSTEM_INPUT',
        path: ['kind'],
      }),
    );
    expect(() =>
      castIChing({
        kind: 'iching',
        method: 'time-number',
        timestamp: '2026-07-30T00:00:00Z',
      } as never),
    ).toThrowError(
      expect.objectContaining({
        code: 'UNSUPPORTED_SYSTEM_PROFILE',
        path: ['method'],
      }),
    );
  });

  test('returns a deeply frozen JSON-safe mechanics audit and no interpretations', () => {
    const report = castIChing({
      kind: 'iching',
      method: 'manual-lines',
      lines: [7, 7, 7, 7, 7, 7],
    });

    expect(report.audit).toMatchObject({
      module: { id: 'iching', version: '1.0.0', schemaVersion: '1' },
      profile: { id: 'zhouyi-mechanics', version: '1.0.0' },
      implementation: 'oh-my-saju-independent',
      implicitAdjustments: [],
      predictiveValidity: 'not-established',
      interpretationScope: 'calculation-and-classical-classification-only',
    });
    expect(report.value.interpretations).toEqual([]);
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.value.baseHexagram.lowerTrigram)).toBe(true);
    expect(JSON.parse(JSON.stringify(report))).toEqual(report);
  });
});

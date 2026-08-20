import { describe, expect, it } from 'vitest';

/** Pack-local table contract tests. */
import { EARTHLY_BRANCHES, HEAVENLY_STEMS } from '../../runtime/traditions/domain';
import {
  QIONGTONG_CLIMATE_CANDIDATES_V1,
  QIONGTONG_CLIMATE_TABLE_V1_METADATA,
  getQiongtongClimateCandidates,
  getQiongtongClimateCellSource,
} from './qiongtong-table-v1';

describe('궁통보감 조후 후보 10 × 12 전사표', () => {
  it('10개 일간과 12개 절기월의 120개 셀을 빠짐없이 제공한다', () => {
    expect(Object.keys(QIONGTONG_CLIMATE_CANDIDATES_V1)).toEqual([...HEAVENLY_STEMS]);

    let cellCount = 0;
    for (const dayStem of HEAVENLY_STEMS) {
      const row = QIONGTONG_CLIMATE_CANDIDATES_V1[dayStem];
      expect(Object.keys(row)).toEqual([...EARTHLY_BRANCHES]);

      for (const monthBranch of EARTHLY_BRANCHES) {
        const candidates = getQiongtongClimateCandidates(dayStem, monthBranch);
        expect(candidates.length).toBeGreaterThan(0);
        expect(candidates.every((stem) => HEAVENLY_STEMS.includes(stem))).toBe(true);
        expect(new Set(candidates).size).toBe(candidates.length);
        expect(candidates).toBe(row[monthBranch]);
        cellCount += 1;
      }
    }

    expect(cellCount).toBe(120);
    expect(QIONGTONG_CLIMATE_TABLE_V1_METADATA).toMatchObject({
      transcriptionStatus: 'partial-source-reviewed',
      releaseStatus: 'experimental',
      dayStemCount: 10,
      solarMonthBranchCount: 12,
      cellCount: 120,
      sourceFixtureScope: 'five-curated-fixtures-covering-seven-cells',
      remainingCellVerification: 'experimental-transcription-only',
    });
  });

  it('대표 fixture와 전사된 후보 순서를 보존한다', () => {
    expect(getQiongtongClimateCandidates('갑', '사')).toEqual(['계', '정']);
    expect(getQiongtongClimateCandidates('갑', '진')).toEqual(['경', '임']);
    expect(getQiongtongClimateCandidates('을', '인')).toEqual(['병', '계']);
    expect(getQiongtongClimateCandidates('경', '인')).toEqual(['병', '갑', '정']);
    expect(getQiongtongClimateCandidates('기', '오')).toEqual(['계', '병']);
    expect(getQiongtongClimateCellSource('갑', '사')).toEqual(
      expect.objectContaining({
        fixtureId: 'climate.jia-si',
        sourceLocator: 'Wikisource oldid 2294674, 三夏甲木, lines 242-252; 1937 scan p.22',
        candidates: [
          expect.objectContaining({
            stem: '계',
            priority: 'primary',
            function: {
              tag: null,
              evidence: null,
              status: 'not-explicit-in-base-text',
            },
          }),
          expect.objectContaining({
            stem: '정',
            priority: 'secondary',
            function: {
              tag: null,
              evidence: null,
              status: 'not-explicit-in-base-text',
            },
          }),
        ],
      }),
    );
    expect(getQiongtongClimateCellSource('을', '인')?.candidates).toEqual([
      expect.objectContaining({
        stem: '병',
        function: expect.objectContaining({ tag: 'warming', status: 'source-explicit' }),
      }),
      expect.objectContaining({
        stem: '계',
        function: expect.objectContaining({ tag: 'moistening', status: 'source-explicit' }),
      }),
    ]);
    expect(getQiongtongClimateCellSource('경', '인')?.candidates).toEqual([
      expect.objectContaining({ stem: '병', priority: 'co-primary' }),
      expect.objectContaining({ stem: '갑', priority: 'co-primary' }),
      expect.objectContaining({ stem: '정', priority: 'secondary' }),
    ]);
    expect(getQiongtongClimateCellSource('갑', '오')).toBeNull();
  });

  it('저본 문구와 어긋났던 4칸을 원문 나열대로 되돌린 상태를 유지한다', () => {
    // 六月甲木 「先丁後庚，無癸亦可」 — 壬은 원문에 없다.
    expect(getQiongtongClimateCandidates('갑', '미')).toEqual(['계', '정', '경']);
    // 三月丁火 「先用甲木引丁制土，次看庚金」 — 戊土는 제거 대상이지 용신이 아니다.
    expect(getQiongtongClimateCandidates('정', '진')).toEqual(['갑', '경']);
    // 八月辛金 「專用壬水淘洗 … 見甲制土方妙」 — 丁은 원문에 없고 辛金의 칠살이다.
    expect(getQiongtongClimateCandidates('신', '유')).toEqual(['임', '갑']);
    // 五月癸水 「必須庚辛為生身之本 … 方得辛金之用」 — 辛이 빠져 있었다.
    expect(getQiongtongClimateCandidates('계', '오')).toEqual(['경', '신', '임', '계']);

    expect(
      QIONGTONG_CLIMATE_TABLE_V1_METADATA.baseTextCorrectedCells.map(({ cell }) => cell),
    ).toEqual(['갑:미', '정:진', '신:유', '계:오']);
  });

  it('표, 행, 후보 배열과 메타데이터를 모두 재귀적으로 동결한다', () => {
    expect(Object.isFrozen(QIONGTONG_CLIMATE_CANDIDATES_V1)).toBe(true);
    expect(Object.isFrozen(QIONGTONG_CLIMATE_CANDIDATES_V1.갑)).toBe(true);
    expect(Object.isFrozen(QIONGTONG_CLIMATE_CANDIDATES_V1.갑.사)).toBe(true);
    expect(Object.isFrozen(QIONGTONG_CLIMATE_TABLE_V1_METADATA)).toBe(true);
    expect(Object.isFrozen(QIONGTONG_CLIMATE_TABLE_V1_METADATA.cautions)).toBe(true);

    expect(() => {
      (QIONGTONG_CLIMATE_CANDIDATES_V1.갑.사 as HeavenlyStemForMutation[]).push('병');
    }).toThrow(TypeError);
    expect(getQiongtongClimateCandidates('갑', '사')).toEqual(['계', '정']);
  });

  it('런타임에 잘못된 일간이나 월지를 조용히 undefined로 바꾸지 않는다', () => {
    expect(() => getQiongtongClimateCandidates('x' as never, '사')).toThrow(RangeError);
    expect(() => getQiongtongClimateCandidates('갑', 'x' as never)).toThrow(RangeError);
    expect(() => getQiongtongClimateCellSource('x' as never, '사')).toThrow(RangeError);
    expect(() => getQiongtongClimateCellSource('갑', 'x' as never)).toThrow(RangeError);
  });
});

type HeavenlyStemForMutation = (typeof HEAVENLY_STEMS)[number];

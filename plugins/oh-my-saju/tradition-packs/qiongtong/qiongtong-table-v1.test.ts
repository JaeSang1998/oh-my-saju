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

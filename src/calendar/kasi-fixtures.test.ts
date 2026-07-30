import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { describe, expect, test } from 'vitest';
import kasiDataset from '../../test/fixtures/kasi-lunar-dataset.json';
import { calculateSaju } from '../auditable/calculate-saju';
import { lunarToSolar, solarToLunar } from '../calendar';

interface KasiRow {
  readonly solar: readonly [number, number, number];
  readonly lunar: readonly [number, number, number];
  readonly leap: boolean;
  readonly ko: readonly [string, string, string];
  readonly cn: readonly [string, string, string];
}

const KASI_ROWS = kasiDataset as KasiRow[];
const FIXTURE_SHA256 = 'd651d5a77d7970cde4b36f414995b6ea833b4d50760f23fe0f462c96fdf8ca1a';

describe('KASI 음양력 독립 회귀 픽스처를 거치는 공개 API', () => {
  test('공식 data.go.kr에서 수집된 200건 원본의 개수와 해시가 고정되어 있다', () => {
    const fixture = readFileSync(
      new URL('../../test/fixtures/kasi-lunar-dataset.json', import.meta.url),
    );

    expect(KASI_ROWS).toHaveLength(200);
    expect(createHash('sha256').update(fixture).digest('hex')).toBe(FIXTURE_SHA256);
  });

  test('198건은 양방향 일치하고 전근대 역법 차이 2건은 명시적으로 고정된다', () => {
    const exactRows = KASI_ROWS.filter(
      ({ solar: [year, month, day] }) =>
        !(year === 1637 && month === 6 && day === 13) &&
        !(year === 1643 && month === 3 && day === 13),
    );
    expect(exactRows).toHaveLength(198);

    for (const row of exactRows) {
      const [solarYear, solarMonth, solarDay] = row.solar;
      const [lunarYear, lunarMonth, lunarDay] = row.lunar;

      expect(solarToLunar(solarYear, solarMonth, solarDay), `solar ${row.solar.join('-')}`).toEqual(
        {
          year: lunarYear,
          month: lunarMonth,
          day: lunarDay,
          isLeapMonth: row.leap,
        },
      );
      expect(
        lunarToSolar(lunarYear, lunarMonth, lunarDay, row.leap),
        `lunar ${row.lunar.join('-')} leap=${row.leap}`,
      ).toEqual({
        year: solarYear,
        month: solarMonth,
        day: solarDay,
      });
    }

    expect(solarToLunar(1637, 6, 13)).toEqual({
      year: 1637,
      month: 5,
      day: 21,
      isLeapMonth: false,
    });
    expect(() => lunarToSolar(1637, 4, 21, true)).toThrow('Requested lunar month does not exist.');

    expect(solarToLunar(1643, 3, 13)).toEqual({
      year: 1643,
      month: 1,
      day: 24,
      isLeapMonth: false,
    });
    expect(lunarToSolar(1643, 1, 23, false)).toEqual({
      year: 1643,
      month: 3,
      day: 12,
    });
  });

  test('공개 사주 범위에 든 115건의 일주가 KASI 일진과 일치한다', () => {
    const supportedRows = KASI_ROWS.filter(({ solar: [year] }) => year >= 1801 && year <= 2100);
    expect(supportedRows).toHaveLength(115);

    for (const row of supportedRows) {
      const [year, month, day] = row.solar;
      const report = calculateSaju({
        birth: {
          date: { calendar: 'gregorian', year, month, day },
          time: { hour: 12, minute: 0 },
          timeZone: 'Asia/Seoul',
        },
      });
      expect(report.pillars.day.korean, row.solar.join('-')).toBe(row.ko[2]);
    }
  });
});

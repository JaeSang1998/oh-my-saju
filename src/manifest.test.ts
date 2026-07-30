import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { describe, expect, test } from 'vitest';
import { LUNAR_MAX_YEAR, LUNAR_MIN_YEAR } from './calendar';
import { ENGINE_MANIFEST } from './manifest';

function collectKeys(value: unknown, keys: string[] = []): readonly string[] {
  if (value === null || typeof value !== 'object') return keys;
  for (const [key, child] of Object.entries(value)) {
    keys.push(key);
    collectKeys(child, keys);
  }
  return keys;
}

describe('ENGINE_MANIFEST', () => {
  test('공개 계산 계약과 한국 음양력 데이터 범위를 기록한다', () => {
    expect(ENGINE_MANIFEST.supportedRanges.solarTermYears).toEqual({
      min: 1800,
      max: 2300,
    });
    expect(ENGINE_MANIFEST.supportedRanges.koreanLunarYears).toEqual({
      min: LUNAR_MIN_YEAR,
      max: LUNAR_MAX_YEAR,
    });
  });

  test('고정 런타임·데이터 버전과 정확한 소스 커밋을 기록한다', () => {
    expect(ENGINE_MANIFEST.engine).toMatchObject({
      name: 'saju-engine',
      version: '0.9.0',
      schemaVersion: '5',
      ruleset: 'korean-standard-v2',
    });
    expect(ENGINE_MANIFEST.timezone).toMatchObject({
      engine: 'moment-timezone@0.6.3',
      runtime: 'moment@2.30.1',
      ianaVersion: '2026c',
      sourceCommit: 'f5373b73ed47995924b53a0cac1e59730799887d',
      daylightSavingRepresentation: 'iana-tzif-isdst-with-derived-save',
      daylightSavingMetadataSha256:
        'a85d029decb3f71259f6668f8cd8659895d0abd39bbf447de56c65c5a769fbb7',
    });
    expect(ENGINE_MANIFEST.solarTerms).toMatchObject({
      engine: 'astronomy-engine@2.1.19',
      sourceCommit: '61dc07020aaa6885d2c7f688a4d82beaf6edb9ef',
    });
    expect(ENGINE_MANIFEST.koreanLunar).toMatchObject({
      engine: 'astronomy-engine@2.1.19',
      sourceCommit: '61dc07020aaa6885d2c7f688a4d82beaf6edb9ef',
      supportedYears: '1391-2100',
      regressionFixtureRows: 200,
      regressionFixtureExactRows: 198,
      knownHistoricalCalendarDifferences: 2,
    });
  });

  test('공개 manifest에는 다른 구현과의 비교 메타데이터가 없다', () => {
    const lineageKeys = collectKeys(ENGINE_MANIFEST).filter((key) =>
      /^(?:upstream|comparison)/iu.test(key),
    );

    expect(lineageKeys).toEqual([]);
  });

  test('공개 manifest와 중첩 범위를 런타임에서도 변경할 수 없다', () => {
    expect(Object.isFrozen(ENGINE_MANIFEST)).toBe(true);
    expect(Object.isFrozen(ENGINE_MANIFEST.engine)).toBe(true);
    expect('interpretation' in ENGINE_MANIFEST).toBe(false);
    expect(Object.isFrozen(ENGINE_MANIFEST.supportedRanges)).toBe(true);
    expect(Object.isFrozen(ENGINE_MANIFEST.supportedRanges.sajuBirthYears)).toBe(true);
  });

  test('생성된 DST 테이블의 바이트 해시가 manifest와 일치한다', () => {
    const source = readFileSync(new URL('./time/dst-offsets-data.ts', import.meta.url));
    const sha256 = createHash('sha256').update(source).digest('hex');
    expect(sha256).toBe(ENGINE_MANIFEST.timezone.daylightSavingMetadataSha256);
  });
});

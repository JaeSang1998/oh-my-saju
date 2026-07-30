import momentTimezone from 'moment-timezone';

declare const __SAJU_ENGINE_SOURCE_REVISION__: string | undefined;

const SOURCE_REVISION =
  typeof __SAJU_ENGINE_SOURCE_REVISION__ === 'string'
    ? __SAJU_ENGINE_SOURCE_REVISION__
    : 'source-tree-unbuilt';

const SUPPORTED_RANGES = Object.freeze({
  sajuBirthYears: Object.freeze({ min: 1801, max: 2100 }),
  solarTermYears: Object.freeze({ min: 1800, max: 2300 }),
  koreanLunarYears: Object.freeze({ min: 1391, max: 2100 }),
});

function rangeLabel(range: { readonly min: number; readonly max: number }): string {
  return `${range.min}-${range.max}`;
}

/** Single source of truth for calculation engines and datasets. */
export const ENGINE_MANIFEST = Object.freeze({
  engine: Object.freeze({
    name: 'saju-engine' as const,
    version: '0.9.0' as const,
    schemaVersion: '5' as const,
    ruleset: 'korean-standard-v2' as const,
    sourceRevision: SOURCE_REVISION,
  }),
  supportedRanges: SUPPORTED_RANGES,
  timezone: Object.freeze({
    engine: `moment-timezone@${momentTimezone.tz.version}`,
    version: `IANA-${momentTimezone.tz.dataVersion}`,
    ianaVersion: momentTimezone.tz.dataVersion,
    sourceUrl: 'https://www.iana.org/time-zones',
    sourceReleaseUrl: `https://data.iana.org/time-zones/releases/tzdata${momentTimezone.tz.dataVersion}.tar.gz`,
    sourceArchiveSha256:
      'e4a178a4477f3d0ea77cc31828ff72aa38feff8d61aa13e7e99e142e9d902be4' as const,
    sourceCommit: 'f5373b73ed47995924b53a0cac1e59730799887d' as const,
    packageIntegrity:
      'sha512-pVEPA/HCFHHbwJ130ywnzYuZpkEGcP6Daa/OwNebpA18MybeFHmQilAGGovXgWijQ8vQtmud9jZrziUBgsykfg==' as const,
    runtime: 'moment@2.30.1' as const,
    runtimeSourceCommit: '485d9a7d709bd5f3869a7ad24630cf0746d072dc' as const,
    runtimePackageIntegrity:
      'sha512-uEmtNhbDOrWPFS+hdjFCBfy9f2YoyzRpwcl+DqpC6taX21FzsTLQVbMV/W7PzNSX6x/bhC1zA3c2UQ5NzH6how==' as const,
    daylightSavingRepresentation: 'iana-tzif-isdst-with-derived-save' as const,
    daylightSavingMetadataUtcRange: '1800-01-01/2102-01-01' as const,
    daylightSavingMetadataGeneratedOn: '2026-07-26' as const,
    daylightSavingMetadataSha256:
      'a85d029decb3f71259f6668f8cd8659895d0abd39bbf447de56c65c5a769fbb7' as const,
    daylightSavingCompiler: 'tzcode-zic@2026c' as const,
    daylightSavingCompilerSourceUrl:
      'https://data.iana.org/time-zones/releases/tzcode2026c.tar.gz' as const,
    daylightSavingCompilerSourceArchiveSha256:
      'b1cffc3ace4c4c7cd0efba2f7add86ec3d0b79da48bcf03582671fd3c8feace8' as const,
    daylightSavingMetadataGenerator: 'tools/gen-dst-offsets.mjs' as const,
    daylightSavingSaveDerivation:
      'nearest-surrounding-standard-time-type-with-zone-evidence' as const,
  }),
  solarTerms: Object.freeze({
    engine: 'astronomy-engine@2.1.19' as const,
    sourceUrl: 'https://github.com/cosinekitty/astronomy',
    sourceCommit: '61dc07020aaa6885d2c7f688a4d82beaf6edb9ef' as const,
    packageIntegrity:
      'sha512-8yWKNf7UeNbH458h3sAJ6ZgAjE5jTXp/mNNRFoC20j2SHwZIjAQeEsBB2Q3uCFRaTCCJRv33K2XhkhZQMXoX6w==' as const,
    supportedYears: rangeLabel(SUPPORTED_RANGES.solarTermYears),
  }),
  koreanLunar: Object.freeze({
    engine: 'astronomy-engine@2.1.19' as const,
    sourceUrl: 'https://github.com/cosinekitty/astronomy',
    sourceCommit: '61dc07020aaa6885d2c7f688a4d82beaf6edb9ef' as const,
    packageIntegrity:
      'sha512-8yWKNf7UeNbH458h3sAJ6ZgAjE5jTXp/mNNRFoC20j2SHwZIjAQeEsBB2Q3uCFRaTCCJRv33K2XhkhZQMXoX6w==' as const,
    supportedYears: rangeLabel(SUPPORTED_RANGES.koreanLunarYears),
    monthRule: 'winter-solstice-month-11-and-first-no-principal-term-leap-month' as const,
    calendarMeridianPolicy: '120-degrees-east-before-1912;135-degrees-east-from-1912' as const,
    regressionFixtureSourceUrl: 'https://www.data.go.kr/data/15012679/openapi.do',
    regressionFixtureCollector: 'jinill1/korean-lunar-calendar' as const,
    regressionFixtureCollectorCommit: '6f988e3f50a424d165b9834f9e28cd3ea962da63' as const,
    regressionFixtureImportedOn: '2026-07-26' as const,
    regressionFixtureSha256: 'd651d5a77d7970cde4b36f414995b6ea833b4d50760f23fe0f462c96fdf8ca1a',
    regressionFixtureRows: 200 as const,
    regressionFixtureExactRows: 198 as const,
    knownHistoricalCalendarDifferences: 2 as const,
  }),
  validation: Object.freeze({
    kasi: Object.freeze({
      sourceUrl: 'https://www.data.go.kr/data/15012679/openapi.do',
      fixtureRows: 200 as const,
      fixtureImportedOn: '2026-07-26' as const,
    }),
    naoj2024: Object.freeze({
      sourceUrl: 'https://eco.mtk.nao.ac.jp/koyomi/yoko/2024/rekiyou242.html',
      solarTermRows: 12 as const,
    }),
  }),
});

export type EngineManifest = typeof ENGINE_MANIFEST;

# Third-party notices

Saju Engine and Oh My Saju

Copyright 2026 Jaesang Lee

The project is licensed under Apache-2.0. The following third-party components
and validation material remain under their own terms.

## Runtime dependencies

- Astronomy Engine 2.1.19 — MIT License. Copyright (c) 2019-2023 Don Cross
  `<cosinekitty@gmail.com>`. The project uses it to calculate apparent
  geocentric solar longitude and lunar phases.
- Moment 2.30.1 — MIT License. Copyright (c) JS Foundation and other
  contributors.
- Moment Timezone 0.6.3 — MIT License. Copyright (c) JS Foundation and other
  contributors. Its bundled time-zone data comes from the IANA Time Zone
  Database.
- IANA Time Zone Database 2026c — public-domain time-zone data. Generated DST
  metadata is derived from the matching `tzdata` and `tzcode` releases; release
  and generated-file hashes are recorded in `ENGINE_MANIFEST`.

## Validation fixture

The 200-row KASI lunisolar fixture in
`test/fixtures/kasi-lunar-dataset.json` was collected with
`jinill1/korean-lunar-calendar` revision
`6f988e3f50a424d165b9834f9e28cd3ea962da63`, under the MIT License,
Copyright (c) 2022 Jinil Lee. The copied fixture's license text is reproduced
in `LICENSES/korean-lunar-calendar-MIT.txt`.

The fixture records results from the Korea Astronomy and Space Science
Institute OpenAPI distributed through data.go.kr. Its provenance, import date,
and SHA-256 are recorded in
`test/fixtures/kasi-lunar-dataset.provenance.md` and `ENGINE_MANIFEST`.

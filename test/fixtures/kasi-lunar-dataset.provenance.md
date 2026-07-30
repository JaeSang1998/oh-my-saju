# KASI lunisolar fixture provenance

- Rows: 200 Gregorian-to-Korean-lunar samples.
- Primary oracle: Korea Astronomy and Space Science Institute (KASI/KARI)
  `getLunCalInfo` OpenAPI distributed through data.go.kr.
- Primary source: <https://www.data.go.kr/data/15012679/openapi.do>
- Fixture collector: `jinill1/korean-lunar-calendar`
- Collector revision: `6f988e3f50a424d165b9834f9e28cd3ea962da63`
- Imported on: 2026-07-26
- SHA-256:
  `d651d5a77d7970cde4b36f414995b6ea833b4d50760f23fe0f462c96fdf8ca1a`
- License for the copied fixture: MIT, Copyright (c) 2022 Jinil Lee.

The upstream collector states that these rows were pulled from the official
data.go.kr API and restricted to Gregorian dates from 1583 onward so that the
API's pre-reform Julian-calendar convention does not enter the fixture.

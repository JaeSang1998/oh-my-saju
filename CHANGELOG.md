# Changelog

## Oh My Saju plugin 0.4.1 — 2026-07-30

- Applied Korean civil-time defaults without blocking confirmation, including
  unknown-time readings when only the birth date is supplied.
- Expanded open-ended readings into concrete personality, work/execution, and
  relationship interpretation.
- Moved generic workflow, limitation, and scientific-validity prose out of the
  ordinary user-facing reading while preserving the validated audit record.

## Oh My Saju plugin 0.4.0 — 2026-07-30

- Expanded `sanming-symbolic-curated` to 1.1.0 with 15 cited raw symbolic-star
  rules, separate blade variants, explicit partial-observation states, and no
  automatic event or favorability claims.
- Added independent, source-profiled vertical modules for election-date
  ranking, Tojeong 144-number mechanics, I Ching casting, Zi Wei natal-chart
  mechanics, and Liu Ren plates/four-lessons/nine-gate transmissions.
- Added the `run-traditional-system` JSON command and direct typed functions;
  every result preserves policies, sources, intermediate traces, limitations,
  and the fact that predictive validity is not established.
- Kept classical matches separate from the modern election-ranking policy and
  omitted unverified interpretation corpora instead of copying them.

## 0.9.0 — 2026-07-30

- Added `getLunarMonthInfo()` for regular/leap lunar-month lengths and Gregorian boundaries.
- Added configurable luck-pillar counts and day-master-relative stem/branch ten gods.
- Added local-noon `calculateSajuDailyTransit()` facts with natal-relative ten gods and raw
  all-pillar relationships.
- Completed all-pair raw branch combination, clash, punishment, break, and harm observations
  with pillar positions and directed-punishment metadata.
- Added deterministic Compact and Markdown renderers for prepared Oh My Saju results.
- Added an explicit-profile 12 growth-stage observation to calculation-baseline 1.1.0.
- Added the narrowly curated `sanming-symbolic-curated` 1.0.0 Pack for raw travel-horse branch
  matches without broad symbolic-star or event claims; unknown hour remains partial.
- Added fail-closed rejection of unsupported calendar Ganzhi claims in AI narration.

## 0.8.0 — 2026-07-30

- Rebuilt the Four Pillars calculation core from documented Gregorian JDN,
  sexagenary-cycle, Jie-boundary, five-tiger, and five-rat formulas.
- Replaced embedded solar-term comparisons with direct Astronomy Engine
  calculations and independent NAOJ fixtures.
- Replaced the generated lunisolar lookup table with an independent
  conjunction, principal-term, and winter-solstice calendar engine.
- Added public-interface property tests for every 1801–2100 Jie and Qi boundary,
  day and hour cycles, Zi-hour policies, elements, and ten-god relationships.
- Removed the retired compatibility subpath and its build, package, test, and
  documentation surfaces.
- Adopted Apache License 2.0 for the project and retained only notices required
  by current third-party dependencies and fixtures.
- Moved plugin repository and provenance links to `JaeSang1998/oh-my-saju`.

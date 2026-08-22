# Changelog

## Oh My Saju plugin 0.7.0 — 2026-08-22

- Made `deep-traditional` the default narration depth. Supported traditional findings now carry
  through the seasonal, month-command, strength, relation, past-pattern, and timing cross-check
  into direct relationship and job-change scenarios; `grounded` remains available for compact
  evidence-first output.
- Added audited nearest distances from birth to 입춘·입하·입추·입동 and extended exact-time timing
  requests from 21 to 60 Saju years.
- Reworked Korean input, output, and style guidance to require complete prose and to explain
  relationship initiation/maintenance/distance and job-offer fit/failure without generic
  implementation disclaimers.

## Oh My Saju plugin 0.6.0 — 2026-08-20

- Added the `xingchong-resolution@1.0.0` Tradition Pack for 형충회합 with Pack-local
  방합·삼합·육합·천간합 tables and three rules: `xingchong.branch-bureau`,
  `xingchong.stem-combination-state`, and `xingchong.resolution-order` (a bounded two-pass
  탐합망충·충해합 order with distance coefficients).
- Added `ziping.pattern-integrity` and `ziping.pattern-relief-god`: the Pack now fixes one pattern
  by `main-qi-first` priority, judges 성격·파격 against its own relief-god and breaking-factor
  tables, and states the fall back to strength balancing when no relief god stands.
- Added `ditianshui.strength-verdict` and `ditianshui.follow-transform-patterns`, and applied clash
  (×0.5) and punishment (×0.8) damage to `ditianshui.rooting-ledger`.
- Added `qiongtong.candidate-condition` and `qiongtong.pack-climate-priority`, which grade each
  transcribed climate candidate by transparency and branch root and name this Pack's first
  priority.
- Added `sanming.resentment-pair` and `sanming.ghost-gate-pair` under the opt-in `symbolic-stars`
  topic, which stays out of a default reading unless the user asks for 신살;
  the 원진 and 귀문 tables are kept apart because they agree on only four of six pairs, and both
  rules report table matches without event meaning.
- Kept every new verdict Pack-local: `final-pattern`, `final-strength`, and `final-useful-god`
  remain declared unsupported deterministic outputs, and each Pack now records a
  `cross-school-*` unresolved capability instead.
- Bumped `ziping`, `ditianshui`, `qiongtong`, and `sanming-symbolic-curated` to 1.2.0 and updated
  the 구현된 것 / 구현되지 않은 것 ledger in `docs/research/korean-saju-practical-order.md`.

## Oh My Saju plugin 0.5.0 — 2026-08-20

- Added the `season-climate` reading topic and five new Tradition Pack rules that place a birth
  instant in the Korean practical interpretation order: `core.solar-term-position`
  (calculation-baseline), `ziping.governing-day`, `qiongtong.climate-tendency`,
  `ditianshui.rooting-ledger`, and `ditianshui.command-position`.
- Raised the default broad reading to display contract v3: `절기와 계절` and
  `타고난 힘과 쓰는 법` sections, ten required distinct paragraphs, and `근거 — 해석` bullets
  that read the chart basis before its meaning instead of appending it in parentheses.
- Added `climate` and `resource` presentation slots, a Barnum gate and an element-to-virtue gate
  on interpretation spans, and a season-as-environment exemption limited to the climate slot;
  schema 2 presentation drafts stay accepted.
- Rewrote the Korean style reference around `~로 봅니다` judgments, a wider banned-translationese
  list, uneven paragraph length, element-and-season metaphors only, and at least one hard
  sentence per reading.
- Published `docs/research/korean-saju-practical-order.md` with the graded evidence behind the
  new rules, including the school-dependent tables that remain uncollated against primary texts.
- Bumped `calculation-baseline` to 1.2.0 and `ziping`, `ditianshui`, and `qiongtong` to 1.1.0.

## Oh My Saju plugin 0.4.5 — 2026-07-31

- Added the `ziping-structural-compatibility@1.0.0` two-person workflow with separate natal
  charts, directional A→B/B→A ten-god findings, cross-chart stem/branch relations, and
  uncertain-time candidate-pair aggregation.
- Added validated qualitative compatibility Markdown covering the overall pairing, connection,
  interaction, friction, and durability while rejecting total scores, event predictions,
  missing-feature disclaimers, and generic relationship checklists.
- Removed chart-specific example anchoring from the broad-reading guide and tightened default
  profile validation against recycled abstract conclusions and internal audit jargon.
- Made the default profile explicitly cover personality, pressure, work, money, and close
  relationships when supported, including a distinct money section for repeated visible wealth
  placements and stricter anti-repetition validation.
- Rewrote Korean-facing prompts, readings, compatibility reports, and runtime notices in natural
  Korean, and added validation that rejects recurring translated-consulting phrases.

## Oh My Saju plugin 0.4.4 — 2026-07-31

- Rebuilt the default Saju profile around visible chart evidence: pillars, ten gods, element
  distribution, central mechanisms, temperament, work, optional money, and relationships.
- Replaced the nine forced situation/behavior/result sentences with schema 2 evidence bridges and
  short connected paragraphs; schema 1 remains accepted for existing integrations.
- Basic terms such as 일간, 월지, 오행, and 십신 may now appear with immediate plain-language
  translation, while unresolved advanced doctrines stay out of ordinary readings.

## Oh My Saju plugin 0.4.3 — 2026-07-30

- Added a required broad-reading presentation contract that selects
  finding-backed atomic paragraphs, verifies domain/direction and
  situation/behavior/result structure, and deterministically renders the final
  four-section Markdown without a post-validation free-form rewrite.
- Replaced repeated birth-time uncertainty sentences in broad output with local
  `△`/`◇` claim markers and one shared legend near the basis line.
- Added a prepare-time capacity check so sparse stable-only evidence cannot
  enter a broad-reading workflow that has no valid nine-slot presentation.
- Separated named-doctrine requests from science, uncertainty, and audit
  metadata opt-ins so narrow technical questions cannot re-enable generic
  defense paragraphs.

## Oh My Saju plugin 0.4.2 — 2026-07-30

- Made open-ended readings compact, sectioned, and focused on recognizable
  personality, execution, and relationship patterns.
- Hid advanced doctrine and unresolved candidates until the user explicitly
  asks for technical detail.
- Reclassified profile limitations and unavailable rules as internal
  non-display guardrails instead of user-facing caveats.
- Enforced the compact, jargon-opt-in contract during local narrator-output
  validation and marked runtime notices as audit-only.

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

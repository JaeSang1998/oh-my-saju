# AI saju service expansion map

## Destination

Build a Korean-first service in which:

- calendar and chart calculation is reproducible across historical time-zone and
  solar-term boundaries;
- each traditional judgment belongs to a versioned, cited school profile;
- unknown birth time and profile disagreements remain visible;
- an AI model writes the requested interpretation while citing actual findings;
- privacy, provider changes, malformed output, and failures have explicit technical controls.

This map is being executed because the user asked for implementation, not planning only.
One vertical slice is delivered first; later doctrine profiles require source verification
and expert review rather than hurried synthesis.

## Ground truth

- Deterministic engine: `saju-engine` root and `calendar`/`advanced`/`timing` subpaths
- Research:
  - `docs/research/SAJU_SCHOOL_RULES_RESEARCH.md`
  - `docs/research/AI_SAJU_SERVICE_RESEARCH.md`
- Domain language: `CONTEXT.md`
- Current package-layer decision: `docs/adr/0006-core-pack-skill-boundaries.md`
- Historical layering context: `docs/adr/0001-layered-interpretation-and-ai.md`

## Route

| Phase | Deliverable                                                                                            | Dependencies                                             | Exit gate                                                     | State                                                               |
| ----- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------- |
| P0    | IANA/Korean lunar/solar-term/pillar core and uncertain-time candidates                                 | Independent calendar fixtures                            | Boundary and package tests pass                               | Complete                                                            |
| P1    | Raw features: full hidden-stem membership, 형·파·원진, growth stages, exact transit/luck policy APIs   | Verified tables and convention IDs                       | Lookup tables exhaustively tested                             | Next                                                                |
| P2    | Profile manifest, finding provenance, candidate aggregation, conflict model                            | P0                                                       | Every result traces to rule/source/candidate                  | First vertical slice complete                                       |
| P3a   | Verified month-command/pattern profile from a defined 《子平真詮》 textual layer                       | Scan verification, source/minimal-pair/disputed fixtures | Independent expert reproduction                               | Research-backed backlog                                             |
| P3b   | Verified strength/flow profile from a defined 《滴天髓闡微》 textual layer                             | Strength evidence vector, commentary separation          | No synthetic element score reuse                              | Research-backed backlog                                             |
| P3c   | Verified climate profile from a defined 《窮通寶鑑》 textual layer                                     | Seasonal facts and stem conditions                       | Climate result stays separate from other useful-god methods   | Research-backed backlog                                             |
| P4    | Source-curated symbolic-star overlay and structural compatibility                                      | Profile compatibility and source registry                | Raw matches retain anchor, position, source, and uncertainty  | 15-rule overlay and first structural compatibility profile complete |
| P5    | Provider-authored grounded AI, finding citations, provider provenance, integrated service API          | P2                                                       | Actual prose returned; fake IDs and candidate mixing rejected | Complete in v0.6.0                                                  |
| P6    | Production application: auth, consent, no-save/save modes, deletion, provider contracts, observability | Legal/privacy review, storage design                     | P0 launch checklist and red-team gates pass                   | Application backlog                                                 |
| P7    | Election, Tojeong, I Ching, Zi Wei, and Liu Ren vertical systems                                       | Primary-source profiles, P0 calendar facts               | Every result exposes source, convention, trace, and limits    | Initial verticals complete                                          |

## Work packages

### P1 raw feature package

- Move current hidden-stem membership out of the synthetic `0.6/0.3/0.1` visualization.
- Add relation matches for 형, 파, 원진 and keep match/activation/transformation/meaning
  separate.
- Add 10 stems × 12 branches growth-stage tables per convention profile.
- Keep major-luck duration exact and preserve explicit direction/boundary/conversion/display
  policies.
- Add annual and monthly transit pillars using exact Lichun/Jie instants.

### P2 profile platform

- Extend the initial serializable `SchoolRuleProfile` into immutable signed artifacts with
  `rulesHash`, release metadata, dependencies, and compatibility constraints.
- Add a rule AST/dependency graph rather than arbitrary plugin callbacks.
- Add source registry entries that distinguish base text, commentary, editorial text, and
  modern reconstruction.
- Add `establishedBy`, `defeatedBy`, alternatives, and explicit cross-profile conflicts.
- Produce semantic diffs when a profile version changes.

### P3 doctrine profiles

Implement one profile at a time. Each requires:

- verified edition and exact text locations;
- formalized predicates and rule priority;
- positive, negative, boundary, minimal-pair, near-miss, and disputed fixtures;
- two-person expert review;
- profile-to-profile conflict fixtures;
- no global `usefulGod`: structure, balance, climate, bridging, illness–medicine, and
  follow-pattern outputs remain separate.

### P4 overlays

- Expand the source-verified symbolic-star pack with triad stars, seasonal solitude patterns,
  day-stem stars, and explicit disputed variants.
- The first structural compatibility profile now returns directional A→B/B→A day-master ten-god
  findings plus symmetric cross-chart relation findings.
- The compatibility application evaluates the Cartesian product of both users’ time candidates
  and separates stable from candidate-dependent results.
- Do not expose divorce, fidelity, pregnancy, lifespan, or total compatibility scores. Election
  ranking is a separate product policy and never a Saju compatibility score.

### P7 independent traditional systems

- Keep `saju-engine` calculation-only and place non-Saju systems in plugin-owned vertical modules.
- Expose explicit typed functions and one closed `run-traditional-system` JSON command.
- Implement election calendar facts, classical matches, and product ranking as separate fields.
- Implement Tojeong 144 code calculation without bundling unverified modern interpretation text.
- Implement deterministic I Ching line evidence, base hexagram, moving lines, and changed
  hexagram; never generate hidden randomness.
- Implement Zi Wei's declared minimum chart: life/body palaces, twelve palaces, five-element
  bureau, and fourteen main stars.
- Implement Liu Ren's exact middle-qi month general, plates, four lessons, nine-gate trace, and
  three transmissions.
- Reject implicit leap-month, missing-time, lunar-day, DST, or school-policy repairs.
- Bind every output to a source/profile version, limitations, and reproducible intermediate trace.

### P5/P6 narration and operations

- Keep the provider port narrow and tool-free.
- Pass the user question as untrusted data without classifying its topic into an allow/deny policy.
- Require provider-authored text and actual finding IDs in every paragraph.
- Keep chart facts, school rules, model inference, counterevidence, and conclusion distinguishable.
- Add a deterministic template fallback, one bounded repair attempt, timeout, rate/cost
  controls, and circuit breaker in the application adapter.
- Validate provider retention, training use, sub-processors, and region before enabling it.
- Log only non-content metadata by default.
- Add AI disclosure in UI/API/export and easy language for minors.
- Implement storage choices, guardian consent where applicable, and deletion cascade.

## Parallel tracks

- Source/editorial: scan verification, source registry, expert review
- Calculation: P1 raw tables and transit policies
- Rule platform: AST, trace, conflicts, semantic diff
- AI quality: schemas, red-team corpus, deterministic fallback, provider adapters
- Product/compliance: consent, privacy notices, retention/deletion, minors, AI disclosure

Doctrine profile implementation depends on source/editorial approval but calculation and AI
quality work can proceed in parallel.

## Release metrics

- Calculation boundary fixtures and supported year ranges
- Exhaustive lookup-table coverage
- Rule predicate branch coverage
- Source-fixture and disputed-fixture coverage
- Provenance completeness
- Unknown-time invariant/variant correctness
- Unsupported/fake claim rejection rate
- Forged-finding, cross-topic, candidate-support-mixing, malformed-output, and
  prompt-injection violation count: zero
- Model/ruleset/prompt/policy semantic diff reviewed before release

## Current handoff

Plugin 0.4.5 adds:

- `ziping-structural-compatibility@1.0.0`, with separate natal charts, directional A→B/B→A
  day-master ten gods, symmetric cross-chart stem/branch findings, and Cartesian evaluation of
  uncertain-time candidate pairs;
- a dedicated prepare/draft/validate contract that requires a qualitative overall reading plus
  connection, interaction, friction, and durability sections while rejecting total scores and
  event verdicts;
- stricter broad-profile quality checks against recycled abstract conclusions, internal audit
  jargon, and chart-specific example leakage.

Plugin 0.4 also includes:

- a 15-rule, source-profiled symbolic-star overlay with explicit anchor, matched position,
  partial coverage, and disputed blade variants;
- an initial election core for daily, wedding, and moving dates, with 12 officers,
  yellow/black paths, month break, participant year-branch relations, and classical matches
  separated from the versioned modern score policy;
- independent Tojeong 144, I Ching, Zi Wei, and Liu Ren vertical modules;
- direct typed functions plus the closed `run-traditional-system` JSON command;
- deterministic intermediate traces, explicit policy choices, no silent repairs, and
  `predictiveValidity: "not-established"` on every new system.

The Tojeong interpretation corpus, I Ching judgment/line-text layer, Zi Wei auxiliary stars and
periods, Liu Ren heavenly generals and judgment layer, domain-specific election corpora, and
historically distinct compatibility methods such as year-pillar, Nayin, or nine-palace profiles
remain future source/editorial work. The structural profile does not produce a numeric or
event-predictive compatibility verdict. P3 doctrine profiles remain intentionally incomplete; none
of these gaps should be filled with undocumented “common saju” heuristics.

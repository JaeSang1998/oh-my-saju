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

| Phase | Deliverable                                                                                            | Dependencies                                             | Exit gate                                                     | State                         |
| ----- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------- |
| P0    | IANA/Korean lunar/solar-term/pillar core and uncertain-time candidates                                 | Independent calendar fixtures                            | Boundary and package tests pass                               | Complete                      |
| P1    | Raw features: full hidden-stem membership, 형·파·원진, growth stages, exact transit/luck policy APIs   | Verified tables and convention IDs                       | Lookup tables exhaustively tested                             | Next                          |
| P2    | Profile manifest, finding provenance, candidate aggregation, conflict model                            | P0                                                       | Every result traces to rule/source/candidate                  | First vertical slice complete |
| P3a   | Verified month-command/pattern profile from a defined 《子平真詮》 textual layer                       | Scan verification, source/minimal-pair/disputed fixtures | Independent expert reproduction                               | Research-backed backlog       |
| P3b   | Verified strength/flow profile from a defined 《滴天髓闡微》 textual layer                             | Strength evidence vector, commentary separation          | No synthetic element score reuse                              | Research-backed backlog       |
| P3c   | Verified climate profile from a defined 《窮通寶鑑》 textual layer                                     | Seasonal facts and stem conditions                       | Climate result stays separate from other useful-god methods   | Research-backed backlog       |
| P4    | Curated symbolic-star and compatibility overlays                                                       | Profile compatibility and source registry                | No total auspiciousness/compatibility score                   | Backlog                       |
| P5    | Provider-authored grounded AI, finding citations, provider provenance, integrated service API          | P2                                                       | Actual prose returned; fake IDs and candidate mixing rejected | Complete in v0.6.0            |
| P6    | Production application: auth, consent, no-save/save modes, deletion, provider contracts, observability | Legal/privacy review, storage design                     | P0 launch checklist and red-team gates pass                   | Application backlog           |

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

- Curate a small source-verified symbolic-star pack with variants and raw matches.
- Implement structural compatibility as directional A→B/B→A findings plus symmetric
  relation findings.
- Evaluate the Cartesian product of both users’ time candidates.
- Do not expose divorce, fidelity, pregnancy, lifespan, or total compatibility scores.

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

The first usable slice adds:

- Oh My Saju Tradition Packs and runtime: common structural facts, finding provenance,
  stable/candidate-dependent aggregation, three-pillar partial coverage, and unavailable rules
- Oh My Saju Reading/Application runtime: redacted provider-neutral requests,
  provider-authored prose contracts, mandatory finding references, provider provenance, and a
  calculation → interpretation → narration service

It deliberately does not claim that the P3 doctrine profiles are complete. Those profiles
are the next evidence-heavy milestones and should not be replaced with undocumented
“common saju” heuristics.

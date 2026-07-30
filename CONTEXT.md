# Domain context

## Purpose

The repository separates reproducible calendar calculation, traditional doctrine, AI-written
explanation, and agent delivery. `saju-engine` owns only deterministic calculation facts.
Tradition Packs and the reading/application runtime live in the `oh-my-saju` plugin. “Complete”
means that calculations, assumptions, sources, conflicts, and uncertainty are complete and
traceable. It does not mean that a traditional interpretation is an empirically verified
description or prediction of a person.

## Evidence layers

| Layer | Term                     | Meaning                                                                                                   |
| ----- | ------------------------ | --------------------------------------------------------------------------------------------------------- |
| L0    | Birth evidence           | What the user or record actually says, including unknown/approximate time and provenance                  |
| L1    | Chart fact               | Reproducible chronology, solar-term, calendar, pillar, or direct relation result                          |
| L2    | Convention result        | A deterministic result after choosing a policy or table, such as Zi-hour policy                           |
| L3    | Doctrine finding         | A conclusion made by one cited and versioned Tradition Pack                                               |
| L4    | Narrative interpretation | Provider-authored prose that cites L1–L3 findings and makes its inference distinct from calculation facts |

An L4 claim may explain, weigh counterevidence, and reach an interpretive conclusion from L1–L3.
It may never silently promote an L2 convention, L3 doctrine, or model inference to an L1 fact.

Dependency tiers do not create new evidence levels:

| Tier | Term                | Meaning                                                                                        |
| ---- | ------------------- | ---------------------------------------------------------------------------------------------- |
| D1   | Calculation core    | `saju-engine` calendar, chronology, chart, structural, uncertainty, and timing facts           |
| D2   | Tradition Pack      | A plugin-owned source/rule/table/helper/provenance module producing an isolated finding set    |
| D3   | Pack runtime        | Pack evaluation and unresolved comparison, with no voting or flattening                        |
| D4   | Reading/application | Narration task construction, claim validation, and the host-neutral JSON command interface     |
| D5   | Agent Skill         | A portable `SKILL.md` workflow that interviews, invokes D4, and presents validated output      |
| D6   | Host adapter        | Codex, Claude Code, or another host's installation, discovery, permissions, and UI translation |

Higher tiers may orchestrate lower tiers. They do not move doctrine into the calculation core or
gain new claim authority.

## Core terms

### Birth evidence

The supplied date, time knowledge, location/time zone, source, and known conflicts. An
unknown time is evidence of absence, not a request to synthesize noon.

### Candidate chart

One chart supported by the supplied time interval, time-zone resolution, solar-term source
uncertainty, and calculation policies. A candidate’s supporting duration is coverage, not
probability.

### Chart facts

The immutable output of `calculateSaju()` or `calculateSajuPossibilities()`. It contains
chronology, pillars, deterministic structural facts, warnings, and calculation provenance.
It never contains personality or event predictions.

### Calculation convention profile

An explicit selection among deterministic conventions: Zi-hour boundary, civil/apparent
solar clock, hidden-stem table, growth-stage table, void anchor, or luck-cycle start policy.

### Tradition Pack

A plugin-owned, versioned vertical module for a specific work, textual layer, commentator,
reconstruction, shared structural baseline, or named modern system. Its interface is a manifest
and isolated finding-set contract. Its implementation keeps source locators, rules, tables,
helpers, fixtures, and provenance together. Pattern, strength, and useful-god conclusions require
an identified Pack; `korean-traditional` is not sufficiently precise.
_Avoid_: Treating a Tradition Pack as part of `saju-engine`, or treating it as a prompt-only data
file

### Tradition profile

The Pack-local serializable rule contract selected by `{ id, version }`. It declares required
chart facts, output limits, supported topics, and rule/source lineage. It does not own calendar
calculation and is not an Agent Skill.
_Avoid_: Using profile, Pack, and Agent Skill as synonyms

### Agent Skill

A portable instruction bundle rooted at `SKILL.md`. It teaches an agent host how to interview for
inputs, call the bundled application runtime, validate narration drafts, and present results. It
does not calculate pillars from prose, define Tradition Pack rules, authenticate caller-built
reports, or replace the engine.
_Avoid_: Moving sources or executable doctrine into `SKILL.md`

### Host plugin

A self-contained distribution package that carries the calculation bundle, Tradition Packs,
reading/application runtime, and the same Agent Skill into Codex, Claude Code, or another
compatible host. Host manifests describe installation, UI, and discovery; the Pack directories,
not those manifests, are the source of doctrine behavior.
_Avoid_: Making a host manifest the source of domain behavior

### Tradition Pack reference

A stable `id` and `version` pair resolving to one plugin-owned Tradition Pack. Multi-Pack analysis
accepts Pack references rather than caller-assembled rule lists.

### Profile reference

A stable `id` and `version` pair resolving to the profile exposed by a Tradition Pack. It is
recorded separately from the Pack reference so Pack packaging and finding semantics can evolve
without losing provenance.

### Profile assurance

Separate evidence about source fidelity, fixture maturity, expert review, implementation release,
and adoption evidence. It measures implementation auditability, never predictive truth.
_Avoid_: Reliability score, accuracy score, confidence score

### Pack maturity

A multi-axis statement of what a Tradition Pack can safely promise. `runtime` says whether the
Pack implementation and finding contract are stable. `implementation` says whether every output
in the Pack's deliberately bounded contract is implemented and tested. `doctrineCoverage` says
whether the selected textual tradition has been formalized beyond that bounded output, while
`sourceCoverage` gives the audited rule or table-cell count. `outputBoundary` distinguishes chart
observations, traditional candidate sets, and traditional evidence vectors.

A Pack may therefore be runtime-stable and complete for its declared candidate/evidence output
while doctrine and source coverage remain partial. That combination is not an experimental
runtime and is not a final traditional verdict.
_Avoid_: One `experimental` label that conflates code stability, source audit, expert review, and
predictive validity

### Declared output

The strongest deterministic result kind a Pack is allowed to return: reproducible chart observation,
traditional candidate set, or traditional evidence vector. Completing a declared output means
that its fields, uncertainty behavior, sources, and tests are complete. It does not silently add a
final pattern, strength, useful-god, personality, or event verdict.

The AI explanation layer may reason about a user's requested topic from those results. Such a
conclusion remains an L4 interpretation with finding references; it is not written back into the
Tradition Pack result.

### Capability inventory

Stable string identifiers for the deterministic capabilities a Pack implements and the
capabilities it explicitly leaves unresolved. This inventory makes omission machine-readable and
prevents an AI narrator or application from treating an absent final verdict as an accidental
gap.

### Adoption evidence

Evidence that a method is documented or measured in a specified market and date. Canonical-text
status and academic discussion are not a market-share measurement.
_Avoid_: Popularity score without a survey

### Overlay pack

An optional, compatibility-checked Tradition Pack such as curated symbolic stars or a particular
compatibility method. It does not override the calculation report or another Pack.

### Rule profile

A serializable Pack-local manifest selecting known, tested rules and declaring sources,
parameters, status, Pack-owned limitation IDs, and supported topics. Executable helpers remain
inside the same Pack implementation; user-visible free prose is not embedded in the profile
artifact.

### Source reference

A stable bibliographic identity including work/edition, textual layer, location, URL, and
verification state. A base text, commentary, editorial interpolation, and modern analysis
are distinct sources even if presented on one webpage.

### Finding

A rule result connected to a profile/version, rule ID, input fact pointers, source
references, candidate support, and limitations. A structural observation and a traditional
judgment are different finding categories.

### Stability

- `stable`: the same normalized finding occurs in every candidate chart.
- `candidate-dependent`: it occurs in only part of the candidate set.
- `unavailable`: required evidence such as the hour pillar is missing.

Stability is set membership, not confidence or likelihood.

### Coverage

- `complete`: the finding uses every pillar required for its complete chart form.
- `partial`: the finding is a valid subtotal over explicitly listed known pillars and carries
  `omittedPillars`.
- `unavailable`: no useful result can be computed because a required pillar is absent.

Coverage and stability are independent: a three-pillar subtotal can be stable across every
candidate while still being partial.

Each rule declares `requiredPillars` and `observedPillars` separately. Missing a required pillar
makes the rule unavailable. Missing only an observed pillar keeps the valid subtotal or candidate
result, marks it partial, and records the omitted pillar; it never synthesizes noon.

### Rule conflict

An explicit disagreement in definition, lookup table, activation, priority, classification,
or semantics between profiles. Conflicts are surfaced; they are not averaged or resolved by
the narrator.

### Comparison coordinate

A finding’s definition, concept, method, subject, and normalized outcome identity. Only findings
with compatible definition and subject coordinates may be called agreements or disagreements.

### Semantic mismatch

Two profiles use the same broad label but define or derive it differently, such as climate
useful-god and balancing useful-god. A semantic mismatch is reported, not resolved.

### School comparison

Independent profile results over the same candidate charts plus unresolved agreements,
disagreements, semantic mismatches, and unavailable evidence. It has no winner or consensus value.

### Useful-god method

“용신” is not one global element. The domain distinguishes at least structure, balancing,
climate, bridging, illness–medicine, and follow-pattern methods. Each method has independent
prerequisites, candidates, and profile provenance.

### Narrative interpretation

A bounded provider-authored text unit whose finding IDs exist in the current single-Pack
assessment. The model may explain the traditional rule, draw an inference, consider opposing
evidence, and answer the user's requested topic. The plugin reading runtime validates the
references and labels a paragraph conditional when any cited finding is candidate-dependent or
partial.

A narrative interpretation cannot invent a source, calculation fact, rule result, candidate
support set, or probability. Its prose and conclusion remain L4 even when expressed directly.
_Avoid_: Reducing the narrator to an ID selector, or rejecting a question because of its topic

### Claim gate

The plugin application validation between an untrusted model response and user-visible output. It checks
the prose schema, plain-text and size limits, allowed finding IDs, topic membership, candidate
support compatibility, and uncertainty labeling. It does not classify the user's question by
medical, education, finance, relationship, personality, or event keywords.

## Bounded contexts

```text
Birth Evidence
  → saju-engine: Chronology / Calendar / Candidate Charts / Timing Facts
      → Tradition Packs: isolated Profile Rule Evaluation
          → plugin runtime: Candidate Aggregation / unresolved Pack Comparison
              → Reading / Claim Gate
                  → Agent Skill workflow
                      → Host Adapter / Safe Rendering
```

- `saju-engine` owns UTC, IANA, solar terms, Korean lunar conversion, pillar boundaries,
  deterministic structural analysis, uncertainty, and timing facts.
- Timing includes exact Lichun/Jie intervals and optional approximate luck-pillar facts. It does not
  produce interpretation findings or event predictions.
- Each Tradition Pack owns its profile, findings, source references, rules, tables, helpers,
  fixtures, and provenance.
- The Pack runtime owns evaluation and unresolved comparison. It preserves each Pack's namespace
  and never votes, averages, ranks, or flattens Pack results.
- Reading owns natural-language interpretation and claim validation. It has no calculation
  authority and may not alter finding values, sources, candidate support, or profile identity.
- Agent Skill owns the workflow, not domain facts.
- Product/application code owns consent, storage, deletion, provider contracts, and rendering.

A future ontology adapter may sit at the comparison seam when two Pack-native vocabularies need
explicit mapping. It must be versioned and provenance-bearing, preserve unmapped and
semantic-mismatch states, and leave each Pack's original finding untouched.

## Invalid states

- A four-pillar claim derived from a three-pillar unknown-time input
- A doctrine finding without Pack ID/version, profile ID/version, rule ID, and source reference
- A runtime-stable candidate/evidence Pack described only as `experimental`
- A declared-output completion claim without implemented and unresolved capability inventories
- One undifferentiated `usefulGod` value made from different methods
- One scalar “reliability” value combining textual fidelity, reproducibility, adoption, and truth
- Calling a canonical or frequently discussed method scientifically validated
- Comparing two findings as agreement or disagreement when their definition coordinates differ
- A Pack winner, majority-vote useful god, averaged school result, or flattened consensus finding
- A support duration represented as probability or confidence
- A model paragraph without a finding ID
- A candidate-dependent finding rendered as certain
- A deserialized or caller-forged calculation report trusted as core provenance
- A caller-forged Pack result trusted as plugin runtime provenance
- Structured birth input, chronology, or `timeEvidence.originalText` sent to a narrator by
  default; optional user questions are separately disclosed as untrusted free text
- A user question rejected before narration solely because it mentions education, work,
  relationships, personality, health, money, death, pregnancy, accidents, or future events
- A core-owned allowlist, prohibited-use list, or admonition inserted instead of the requested
  interpretation

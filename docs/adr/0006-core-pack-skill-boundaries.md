# ADR 0006: Separate calculation core, Tradition Packs, plugin runtime, and Agent Skill

- Status: Accepted
- Date: 2026-07-29
- Supersedes:
  - ADR 0001's placement of interpretation and AI as `saju-engine` subpaths
  - ADR 0003's placement of vertical doctrine modules inside the npm package
  - ADR 0005's placement of the application seam at `saju-engine/agent`

## Context

The existing design correctly separates calculation facts, doctrine findings, model narration,
and host delivery. It also preserves birth-time uncertainty, source lineage, finding references,
and unresolved school disagreement.

The original package placement no longer communicates that hierarchy. Publishing
`saju-engine/interpretation`, `saju-engine/ai`, and `saju-engine/agent` makes the deterministic
calculation package appear to own traditional doctrine and product workflow. It also ties
Tradition Pack provenance and release cadence to the core manifest.

The Git-distributed `Oh My Saju` plugin is the deployable module that actually needs doctrine,
reading validation, application commands, an Agent Skill, and host adapters. A self-contained
plugin can keep those implementations together without weakening the calculation interface.

## Decision

Use this one-way dependency graph:

```text
saju-engine
  deterministic calendar, chart, uncertainty, structural, and timing facts
    ↓
Oh My Saju Tradition Packs
  source + rules + tables + helpers + fixtures + provenance
    ↓
plugin Pack runtime
  evaluation + unresolved comparison
    ↓
plugin Reading/Application runtime
  narration tasks + claim gate + prepare/validate JSON interface
    ↓
Agent Skill
  interview + invocation + draft + validation + presentation workflow
    ↓
Codex / Claude Code / other host adapters
```

### 1. Keep `saju-engine` calculation-only

The npm package exposes:

- `saju-engine`
- `saju-engine/calendar`
- `saju-engine/advanced`
- `saju-engine/timing`

These interfaces return reproducible calculation facts. The core does not contain Tradition Pack
catalogs, doctrine source locators, narration schemas, model policy, application commands, Agent
Skills, or host manifests.

The removed `interpretation`, `ai`, and `agent` subpaths are not replaced by pass-through aliases.
Application callers use the plugin runtime's command interface.

### 2. Make a Tradition Pack the vertical doctrine module

A Tradition Pack owns one coherent implementation:

- a versioned `tradition-pack.json` interface;
- source and edition locators;
- rule declarations;
- lookup tables;
- evaluator and helper code;
- fixtures and limitations;
- artifact inventory, digests, and review status.

The Pack consumes only public calculation facts. It must not import `saju-engine` private modules
or move calendar logic into doctrine code.

Pack provenance is Pack-owned. `ENGINE_MANIFEST` records calculation provenance only.

### 3. Keep Pack results isolated

Each Pack produces an isolated finding set carrying Pack/profile/rule/source/evidence identity.
Comparison may expose:

- agreement on compatible coordinates;
- disagreement;
- semantic mismatch;
- Pack-only coordinates;
- unavailable or candidate-dependent results.

Comparison must not flatten findings into a shared mutable object, count votes, average values,
rank Packs, select a winner, or manufacture a consensus useful god, strength, pattern, or
prediction.

### 4. Put reading and application in the plugin runtime

The plugin runtime owns the provider-neutral two-phase interface:

- `prepare-reading` calculates from the raw request, evaluates Packs independently, emits one
  redacted narration task per Pack, and binds core/Pack/runtime versions and task content;
- `validate-reading` recalculates from the same raw request and accepts exactly the prepared Pack
  draft set only after schema, finding-reference, support-set, and uncertainty validation.

Serialized calculation reports and Pack results remain exportable evidence, not authenticated
input to the reading interface. Persistent reuse requires a future signed-envelope seam rather
than bypassing recalculation.

### 5. Keep Agent Skill as workflow

The Agent Skill is the portable `SKILL.md` instruction module. It collects the minimum valid input,
invokes the bundled application interface, drafts Pack-isolated narration, validates it, and
presents the result.

It does not implement pillars, copy Pack rules into prose, load arbitrary doctrine code, or decide
cross-Pack consensus. Codex and Claude Code metadata are host adapters for the same Skill and
runtime.

### 6. Reserve a future ontology adapter seam

Pack-native vocabularies may eventually need richer comparison than today's explicit coordinates.
When at least two real mappings justify it, add a versioned ontology adapter at the comparison
seam.

The adapter must:

- map without rewriting the original Pack finding;
- record mapping version and provenance;
- preserve unmapped and semantic-mismatch states;
- avoid declaring one tradition's vocabulary canonical;
- remain outside `saju-engine`.

An ontology is not required for the first Pack set. The seam remains deliberately unmaterialized
until multiple adapters or concrete comparison needs justify it.

## Consequences

- The calculation package has a smaller interface and clearer semantic versioning.
- Doctrine changes can release with the plugin or individual Pack without implying a calendar
  engine change.
- Pack authors can audit sources, rules, tables, helpers, fixtures, and digests in one locality.
- The bundled plugin remains self-contained in marketplace caches.
- Agent hosts may change workflow and UI without changing calculation or Pack findings.
- Cross-Pack disagreements remain visible rather than becoming a synthetic verdict.
- Build, package-consumer, documentation, and verification gates must assert that the core no
  longer exports or ships the removed layers.
- Plugin verification must cover Pack provenance, prepare/validate parity, and generated runtime
  byte equality separately from npm package verification.
- Removing the three public npm subpaths is a breaking package change.

## Preserved decisions from earlier ADRs

This ADR changes package placement, not the following behavior:

- L1/L2 calculation facts, L3 doctrine findings, and L4 narration remain distinct.
- Unknown birth time is represented explicitly and never replaced with noon.
- Candidate coverage is not probability.
- Every doctrine finding retains versioned source and rule lineage.
- Model output is untrusted and must cite allowed finding IDs.
- Per-Pack narration remains isolated.
- Timing remains a calculation-fact branch and is not silently turned into event prediction.
- Host plugins remain thin adapters around one shared Agent Skill.

ADR 0001 through ADR 0005 remain historical records. Where their package locations conflict with
this ADR, this ADR governs.

## Alternatives rejected

### Keep deprecated npm aliases for the moved layers

Aliases would preserve the misleading ownership seam and force the calculation package to depend
on plugin implementation. Migration documentation is clearer than permanent pass-through modules.

### Publish every Pack as part of `saju-engine`

This couples doctrine provenance and release cadence to deterministic calendar calculation and
makes one distribution look like canonical Saju doctrine.

### Put Pack rules in `SKILL.md`

Prompt execution is not a reproducible rule runtime and cannot preserve source, fixture, digest,
or uncertainty invariants.

### Merge Pack results before narration

Flattening or voting erases semantic conflicts and makes a synthetic conclusion appear
deterministic.

### Build a universal ontology into the core now

There is not yet enough adapter diversity to justify that seam. A premature ontology would force
traditional concepts into a single vocabulary and expand the calculation interface without
calculation leverage.

# ADR 0003: Separate skill maturity axes and package doctrine as vertical modules

- Status: Accepted
- Date: 2026-07-29

## Context

The first interpretation catalog used `stable | experimental | deprecated` both on a rule profile
and on its assurance record. That single word mixed at least five different questions:

1. Is the TypeScript implementation and public contract stable?
2. Is every output promised by the deliberately bounded skill implemented and tested?
3. How much of the selected doctrine has been formalized?
4. How much of the cited edition has been audited at rule or table-cell level?
5. Has an independent expert reproduced the work, and is any predictive validity established?

The three classical skills already return deterministic, tested candidate or evidence results.
Calling those runtimes experimental is misleading. Calling the full doctrines complete would be
equally misleading: final pattern, strength, and useful-god judgments still contain edition,
commentary, convention, and semantic choices.

The implementation also dispatched all classical rules through one global switch. Adding a school
therefore required editing global rule, profile, catalog, and provenance files, making it easier
for one doctrine's semantics to leak into another.

## Decision

Every built-in interpretation skill exposes a `maturity` record with independent axes:

- `runtime`
- `implementation`
- `doctrineCoverage`
- `sourceCoverage`
- `outputBoundary`
- `implementedCapabilityIds`
- `unresolvedCapabilityIds`

`runtime: stable` means the package-owned implementation and public result contract are supported.
`implementation: complete-for-declared-output` means the bounded observation, candidate-set, or
evidence-vector contract is implemented and tested. It does not mean that the entire doctrine or a
final traditional verdict is complete.

Source fidelity, fixture maturity, expert review, predictive validity, and Korean adoption evidence
remain separate assurance axes. The legacy `release` and profile `status` fields remain for
compatibility, but now describe runtime release only and are deprecated as sole quality signals.

Classical rule implementations are package-owned vertical modules. Each module owns its
deterministic evaluation and may later own its manifest, sources, fixtures, comparison projection,
and narration policy. Callers continue to select immutable `{ id, version }` references; arbitrary
executable plugins are not accepted.

The interpretation kernel receives chart facts and dispatches to one built-in skill at a time.
Skills cannot consume another skill's findings. Comparison remains deterministic and does not
select a winner. AI receives only findings from one skill and may write a finding-referenced
interpretation; it cannot calculate or promote an inference into a chart fact.

## Consequences

- Runtime-stable candidate/evidence skills no longer appear broken merely because source or
  doctrine coverage is partial.
- Applications can render exact, machine-readable limitations rather than inferring them from an
  `experimental` badge.
- Adding a doctrine primarily changes its own module and registry entry instead of a global
  doctrine switch.
- Existing `1.0.0` profile semantics and result shapes remain compatible.
- A future final-verdict profile must use a new profile/version and pass its own source, dispute,
  fixture, and review gates.
- External rule packs remain out of scope. If they are later needed, they require a separate
  signed declarative format and an engine-owned interpreter.

## Rejected alternatives

### Treat every non-final doctrine as experimental

Rejected because it conflates stable software with incomplete textual or expert assurance and
does not tell a consumer which part is incomplete.

### Mark the classical doctrines complete

Rejected because the current outputs deliberately stop at candidates and evidence. A complete
runtime contract is not evidence for a unique final traditional judgment or real-world prediction.

### Load executable third-party skills

Rejected because arbitrary callbacks could bypass source provenance, uncertainty rules, claim
gates, and cross-school isolation.

### Rewrite all rules as a generic AST immediately

Rejected for now because lookup tables and typed predicates are clearer in TypeScript. A
declarative rule graph can be introduced inside a vertical module when repeated rule structure
justifies it.

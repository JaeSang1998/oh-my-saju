# ADR 0004: Let the provider write grounded interpretation prose

- Status: Accepted
- Date: 2026-07-29
- Supersedes: ADR 0001 decisions 6, 7, and the selection-only consequences

## Context

The first AI contract treated the model as a finding-ID selector. All visible sentences were
package-owned restatements, and a keyword policy rejected questions classified as medical,
financial, educational, personality, relationship, minor-related, or event-prediction requests.

That design protected calculation integrity, but it did not perform the service's main job:
answering a user's Saju interpretation question. It also mixed technical trust boundaries with
product-level moral choices. A question such as choosing between two fields of study could be
rejected before the narrator saw it, even though the caller explicitly requested a traditional
interpretation.

The technical risks are different from the topic of the question. Forged findings, mixed
candidate support, oversized JSON, prototype pollution, control characters, HTML injection,
provider error reflection, and leaking structured birth records are integrity and security
problems. Whether a user asks about study, work, personality, relationships, health, money, or
future events is not such a problem.

## Decision

The AI narration contract is version 2.

1. The provider writes the actual paragraph `text`.
2. Every paragraph must cite one or more finding IDs from exactly one authenticated
   interpretation skill.
3. The claim gate validates schema, plain-text form, size/depth, finding membership, topic
   compatibility, and candidate-support compatibility.
4. A paragraph citing candidate-dependent or partial evidence is labeled conditional by the
   engine. The provider cannot override that label.
5. Candidate-dependent evidence is included by default. Callers may explicitly request
   `stable-only`.
6. Structured birth input, chronology, internal finding values, and original time-evidence text
   are not sent to the narrator. An optional user question is sent as explicitly untrusted free
   text.
7. The engine does not inspect question meaning to reject education, career, personality,
   compatibility, relationship, luck-cycle, timing, health, finance, death, pregnancy, accident,
   or other event topics. It does not require a “for fun” disclaimer.
8. The runtime report contains source, profile, coverage, uncertainty, and
   `empiricalValidation: not-established` metadata. It contains no allowed-use list,
   prohibited-use list, or engine-owned admonition in place of an interpretation.
9. Provider errors are normalized without reflecting secret provider payloads.
10. Model prose remains an L4 interpretation. It may reason from and weigh cited findings, but it
    cannot alter L1 calculation facts, L2 conventions, L3 rule results, profile identity, source
    references, or candidate support.

## Consequences

- A normal Saju question reaches the narrator without semantic pre-screening.
- The service can answer directly with a reasoned interpretation instead of returning a
  structural-value list.
- Grounding is auditable at paragraph level, while the prose is no longer falsely presented as
  deterministic engine output.
- Applications can show which school and findings support a conclusion and whether the evidence
  depends on an uncertain birth time.
- Technical validation remains strict and topic-neutral.
- The deterministic engine still does not manufacture one universal final pattern, strength, or
  useful-god value. The narrator may discuss such a conclusion as interpretation when the cited
  evidence supports the reasoning.

## Rejected alternatives

### Keep selection-only local prose

Rejected because it cannot provide an actual contextual interpretation or answer the user's
question.

### Keep a keyword-based high-stakes gate

Rejected because it converts topic vocabulary into a product refusal policy and blocks ordinary
interpretation requests before grounded narration.

### Send raw birth data and ask the model to recalculate

Rejected because it duplicates the calendar engine, leaks more personal data, and makes
calculation provenance unverifiable.

### Remove validation because prose is interpretive

Rejected because interpretive freedom does not justify forged finding IDs, mixed candidate
support, unsafe structured data, or unbounded provider output.

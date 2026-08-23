---
name: oh-my-saju
description: Calculate and interpret Korean Saju (Four Pillars), compatibility, timing, election dates, Tojeong 144, I Ching, Zi Wei, and Liu Ren with auditable calculations and natural Korean prose. Use for 사주·만세력·궁합·오행·십신·십이운성·신살·택일·토정비결·주역·자미두수·육임, approximate birth time, tradition comparison, decision, or timing questions. Do not use for Western astrology, tarot, generic Korean editing, or choices the user does not want viewed through these systems.
license: Apache-2.0
---

# Oh My Saju

Use the bundled runtime for every pillar, solar-term, timing, and Tradition Pack fact. Never
calculate them from memory or replace an unknown birth time with noon.

## Normal Korean reading: use the fast path

Most requests for 사주, 연애, 이직, 대운, 시험, or a broad personality reading use one
`analyze-reading` command. Read [references/fast-reading.md](references/fast-reading.md),
[references/fluent-korean-output-pass.md](references/fluent-korean-output-pass.md), and
[references/deep-traditional-analysis.md](references/deep-traditional-analysis.md) in full before
writing Korean prose. Do not create `preparedDigest`, Pack-by-Pack drafts, a `presentationDraft`,
or validation JSON for this path.

The command returns the complete deterministic analysis and one direct-reading task. Answer from
`result.analysis`; follow `result.task.readingPolicy` and every `result.task.instructions`; apply
the entire `result.task.writing` policy before replying. Use the 0–7 cross-check internally, but
do not expose it as a rigid checklist. Keep a narrow question narrow.

Default `inferenceDepth` is `deep-traditional`. Carry supported findings into concrete patterns:
how a relationship starts, stays close, cools, and repairs; or which job offer fits the working
style and which pace, authority, reward, or role structure tends to fail. Use `grounded` only for
a short calculation- or evidence-first answer.

For Korean civil-time requests with an unqualified numbered date, use Gregorian civil time in
`Asia/Seoul`. State that assumption briefly and proceed. Use an unknown-time input when the time
is absent. Read [references/input-and-runtime.md](references/input-and-runtime.md) only when the
user gives a lunar date, a non-Korean location or time zone, a constrained time, a Zi-hour policy,
or apparent-solar-time request.

## Strict audit path: use only when requested

Use `prepare-reading` → independent Pack drafts → `validate-reading` only when the user asks for
Pack-by-Pack provenance, finding IDs, reproducible Markdown, an audit of another reading, or API
integration. Read [references/architecture-and-contract.md](references/architecture-and-contract.md)
and the strict sections of [references/input-and-runtime.md](references/input-and-runtime.md)
before using this path. Preserve the exact validated Markdown afterward.

## Compatibility and timing

For two-person 궁합, use `prepare-compatibility` → one pair draft → `validate-compatibility`.
Read [references/input-and-runtime.md](references/input-and-runtime.md) for its input shape.
Answer the pair question directly, use A→B and B→A together, and describe the connection,
interaction loop, friction, and repair condition rather than two separate personality profiles.

For timing, request only the years the question needs. Exact birth time can return up to 60
사주년, each from 입춘 to the next 입춘 with 12 절월. Explain a repeated, eased, or pressured
relationship, work, or decision pattern from an already-supported natal mechanism; do not turn a
timing table into a dated-event guarantee.

For election dates, Tojeong 144, I Ching, Zi Wei, or Liu Ren, use `run-traditional-system` and
read the matching section of [references/input-and-runtime.md](references/input-and-runtime.md).
Do not substitute another system or calculate its tables from memory.

## Korean delivery standard

The Fluent Korean pass is mandatory for all Korean prose that users read, including a compatibility
draft and text received from another agent. It applies before strict validation; if a sentence is
awkward, revise the draft and validate again. It does not alter quoted sources, code, JSON keys,
finding IDs, or established technical terms.

Use [references/korean-interpretation-style.md](references/korean-interpretation-style.md) only
when a Saju-specific wording or display example is needed. It supplements the full Fluent Korean
pass and cannot weaken it. Write complete sentences with needed particles, predicates, and endings;
keep people and actions as the subjects of lived interpretation; use a colon or a natural connective
instead of an em dash; and omit generic personality praise or unsupported life scenes.

## Final check

- Every chart fact came from the runtime.
- A traditional conclusion has a current Pack finding behind it, and a personal-life scene remains
  an interpretation rather than a fact.
- Birth-time uncertainty stays local to the affected conclusion.
- The response answers the actual question without generic limitation or audit filler.
- The Korean delivery pass is complete before the user sees the answer.

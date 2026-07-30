# ADR 0001: Separate deterministic calculation, profile rules, and AI narration

- Status: Superseded in part by ADR 0004
- Date: 2026-07-28

## Context

The deterministic engine can audit chronology and chart facts, while strength, pattern,
useful-god, symbolic-star, compatibility, and timing meanings vary by work, textual layer,
commentator, and modern school. An LLM cannot reliably recover those boundaries from a
prompt and is not a trustworthy calculator.

Birth date, time, location, and free-form evidence can also be personal data. Unknown birth
time produces a set of valid charts, not one representative chart. A narration layer must
not erase that set or turn coverage into probability.

## Decision

Use four one-way layers:

```text
saju-engine
  → saju-engine/interpretation
  → candidate aggregation
  → saju-engine/ai
```

1. The package root remains the deterministic chart API.
2. The public `saju-engine/interpretation` call calculates and evaluates one serializable,
   versioned rule profile inside one trust boundary. Every finding carries rule, profile,
   source, evidence, and candidate support.
3. Candidate results are grouped by normalized value. A result is stable only when it is
   present in every candidate. A valid subtotal over known pillars is marked partial with
   omitted pillars; a rule that cannot run is reported as unavailable.
4. Different doctrine profiles are evaluated independently. Comparison may show agreement
   and conflict but may not merge them into a single hidden consensus.
5. `saju-engine/ai` accepts an injected narration function. Its evidence context contains
   only derived findings and limitations—not structured birth input, chronology, account
   data, or original time-evidence text. An optional free-form question is separate,
   explicitly untrusted data and may itself contain information typed by the user.
6. Model output is untrusted and is a selection plan, not prose. It contains only real finding
   IDs grouped by declared topics. The local renderer supplies all titles and paragraph text,
   and mechanically adds conditional wording for candidate-dependent evidence.
7. Candidate-dependent evidence is excluded from model input by default. Explicit opt-in
   preserves candidate support, and findings with different support sets cannot be joined in
   one paragraph.
8. Engine-owned report identity and built-in source/parameter registries are checked inside
   integrated trust seams. JSON round-trips remain valid exports but are not silently
   reaccepted as authenticated provenance.
9. When no findings are available, the provider is not called and a deterministic
   limitations-only response is returned.
10. AI use, requested and actual model identity, provider request metadata,
    prompt/policy/schema versions, and the non-scientific
    traditional nature of the result are part of every reading report.

## Consequences

- The deterministic package stays usable without an LLM or any model SDK.
- Providers can be replaced without changing chart or profile findings.
- A provider can select and organize findings but cannot inject unsupported user-visible prose.
- New schools require explicit profiles, sources, fixtures, and compatibility decisions.
- Unknown-time users receive useful stable findings while hour-dependent findings remain
  conditional or unavailable.
- The first shipped profile is intentionally cross-school structural observation, not a
  claim that pattern/strength/useful-god algorithms are already verified.
- The renderer proves that displayed prose came from package-owned findings; whether a future
  doctrine finding is a faithful interpretation still requires source fixtures, expert review,
  and adversarial evaluation.

## Alternatives rejected

### Ask the LLM to calculate and interpret from birth data

This is non-reproducible, exposes extra personal data, mixes schools, and permits invented
calculations and citations.

### Add interpretation fields directly to `SajuReport`

This would mix L1 chart facts with L3 doctrine, force core schema churn, and make one school
look canonical.

### Average school outputs into one score

Disagreements are often semantic or priority conflicts, not noisy measurements of one
quantity. Averaging hides the very information the service must preserve.

### Use a representative noon when time is unknown

This creates unsupported hour facts and may alter the day, month, or year around relevant
boundaries.

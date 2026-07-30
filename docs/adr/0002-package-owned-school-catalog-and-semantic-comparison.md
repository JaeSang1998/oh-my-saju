# ADR 0002: Package-owned school catalog and semantic comparison

- Status: Accepted; maturity model amended by ADR 0003 and AI prose contract amended by ADR 0004
- Date: 2026-07-28

## Context

Users want several widely referenced interpretation traditions, ordered by trustworthiness and
usefulness. “Trustworthiness” is overloaded: source fidelity, rule reproducibility, fixture
coverage, expert review, market adoption, and predictive validity are different claims. No
credible Korean market-share survey or scientific validation establishes one Four Pillars school
as the most accurate.

The existing interpretation interface accepts a serializable rule profile and evaluates one
profile inside the calculation trust boundary. Letting callers assemble arbitrary doctrine rules
for a multi-school run would make source, parameter, compatibility, and limitation validation
shallow and easy to misconfigure. Comparing every finding with the same topic would also falsely
treat 격국용신, 억부용신, and 조후용신 as measurements of one variable.

## Decision

1. Keep the existing single-profile interface for compatibility.
2. Add a package-owned interpretation-skill catalog addressed by immutable `{ id, version }`
   references. Each skill wraps exactly one doctrine profile, its source corpus, fixtures, required
   facts, output contract, and AI policy.
3. Order the default Korean catalog by an explicitly documented product priority, not by claimed
   predictive accuracy.
4. Publish source fidelity, fixture maturity, expert review, release maturity, adoption evidence,
   and `predictiveValidity: 'not-established'` as separate fields. Do not collapse them into a
   score.
5. Evaluate every selected profile independently over the same authenticated calculation report.
   A profile finding never becomes another profile’s input.
6. Give every finding a comparison coordinate containing definition, concept, method, subject,
   and normalized outcome identities.
7. Call results agreement or disagreement only when their definition and subject coordinates are
   compatible. Results under different definitions are `semantic-mismatch`.
8. Keep every comparison unresolved. Do not select a winning profile, vote, average candidate
   elements, or synthesize one useful god.
9. The multi-school AI interface produces a separately grounded reading for each profile and
   always returns the deterministic comparison table. It does not let the model combine raw
   findings from different profiles into cross-school prose.
10. Initial doctrine profiles may be `experimental`. A profile becomes `stable` only after its
    cited edition, disputed cases, independent fixtures, and expert reproduction are complete.
11. Deterministic tables and candidate extraction run inside the skill as a grounding stage.
    Context-sensitive synthesis may use AI, but the result remains an L3 doctrine claim and never
    becomes an L1 chart fact.
12. Do not register an anonymous “modern balancing” formula. A modern school needs an identified
    author/system, usable rights, a complete rule table, fixed parameters, and reviewed fixtures
    before it can become a separate versioned skill.

## Consequences

- Callers choose a few stable profile references instead of understanding internal rule graphs.
- “Most used” and “most trustworthy” remain inspectable claims with explicit evidence gaps.
- Different meanings of 용신 can coexist without being silently merged.
- Unknown-time candidate aggregation remains profile-local before comparison.
- Adding a new school requires a catalog entry, package-owned rule implementation, source
  locations, limitations, and public-interface fixtures.
- AI narration stays within the existing finding-ID claim gate.

## Alternatives rejected

### One composite Korean profile

This hides contradictions and makes an editorial synthesis look traditional or canonical.

### Numeric confidence or popularity score

Weights would be arbitrary, invite false precision, and confuse implementation reproducibility
with predictive truth.

### Let the model reconcile schools

The model could invent doctrine, erase unavailable evidence, or present a semantic mismatch as
consensus.

### Expose executable custom rules in profile objects

This breaks serialization, provenance validation, deterministic packaging, and the current trust
boundary.

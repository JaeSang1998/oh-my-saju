# Oh My Saju plugin

Oh My Saju packages the deterministic `saju-engine` core, versioned Tradition Packs, grounded
reading runtime, and workflow as one portable plugin with Codex and Claude Code adapters.

The plugin is self-contained. Its bundled Node.js runtime does not import files outside this
directory and does not require an npm install or network connection.

```text
saju-engine (calculation facts only)
  → Tradition Packs (sources, tables, rules, profiles, provenance)
  → isolated finding sets + unresolved Pack comparison
  → finding-referenced reading + local claim validation
  → prepare/validate application protocol
  → Agent Skill
  → Codex, Claude Code, or another host
```

Packs are knowledge artifacts, not Agent Skills. Their `knowledge.providerContract` is the seam
where a later version can materialize the same identifiers and provenance from an ontology or
knowledge graph. Pack findings are kept separate; the runtime never votes them into one verdict.

Plugin 0.3 adds:

- deterministic `renderOhMySajuCompact()` and `renderOhMySajuMarkdown()` views over a prepared
  result, preserving birth-time uncertainty, Pack identity, timing qualifiers, and audit binding;
- `calculation-baseline@1.1.0` with an explicit-profile 12 growth-stage table whose output is a raw
  stage observation, not an automatic strength or favorability judgment;
- `sanming-symbolic-curated@1.0.0`, limited to a cited year-branch travel-horse match, complete-chart
  absence, or explicitly partial observation and deliberately not advertised as broad 신살 support;
- Korean lunar-month metadata through the bundled engine's `getLunarMonthInfo()` API;
- caller-selected luck-pillar counts and day-master-relative stem/branch ten gods.

Source integrations can render the same prepared object without constructing a lossy projection:

```ts
import {
  prepareOhMySajuReading,
  renderOhMySajuCompact,
  renderOhMySajuMarkdown,
} from './runtime/application';

const prepared = prepareOhMySajuReading({
  command: 'prepare-reading',
  request,
  timing: {
    fromYear: 2026,
    throughYear: 2026,
    gender: 'female',
    luckPillarCount: 6,
  },
});

const compact = renderOhMySajuCompact(prepared);
const markdown = renderOhMySajuMarkdown(prepared);
```

These views add no narration, 길흉, or event prediction. The full prepared JSON remains the input
to the isolated draft-and-validate workflow.

Requires Node.js 18 or newer. See the repository README and `skills/oh-my-saju/SKILL.md` for usage
and installation. Redistribution notices for the bundled runtime are recorded in `NOTICE.md` and
`THIRD_PARTY_NOTICES.md`.

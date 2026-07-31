# Oh My Saju plugin

Oh My Saju packages the deterministic `saju-engine` core, versioned Tradition Packs,
source-profiled traditional-system modules, grounded reading runtime, and workflow as one portable
plugin with Codex and Claude Code adapters.

The plugin is self-contained. Its bundled Node.js runtime does not import files outside this
directory and does not require an npm install or network connection.

```text
saju-engine (calculation facts only)
  ├→ Tradition Packs → isolated finding sets → grounded narration validation
  └→ election / Tojeong / I Ching / Zi Wei / Liu Ren deterministic reports
  → prepare-reading / validate-reading / run-traditional-system protocol
  → validated chart-to-interpretation profile assembly → deterministic broad-reading Markdown
  → Agent Skill
  → Codex, Claude Code, or another host
```

Packs are knowledge artifacts, not Agent Skills. Their `knowledge.providerContract` is the seam
where a later version can materialize the same identifiers and provenance from an ontology or
knowledge graph. Pack findings are kept separate; the runtime never votes them into one verdict.

Plugin 0.4 adds:

- `sanming-symbolic-curated@1.1.0` with 15 cited raw symbolic-star rules, including triad,
  season-corner, day-stem, and separately named blade variants;
- daily, wedding, and moving election-date ranking whose classical matches and modern product score
  are separate, fully traced fields;
- Tojeong 144-number mechanics without an unverified interpretation corpus;
- I Ching manual-line, three-coin, and replayable yarrow-stalk casts;
- Zi Wei 12 palaces, five-element bureau, and 14 main stars;
- Liu Ren astronomical middle-Qi month generals, heaven/earth plates, four lessons, nine-gate rule
  paths, and three transmissions;
- a closed `run-traditional-system` JSON command plus direct typed functions for every module.

Each module records its source profile, convention choices, calculation trace, known limitations,
and `predictiveValidity: "not-established"`. No module silently converts a classical match into an
empirical probability.

For example, this command casts six explicit I Ching lines without hidden randomness:

```json
{
  "schemaVersion": "1",
  "command": "run-traditional-system",
  "request": {
    "kind": "iching",
    "method": "manual-lines",
    "lines": [9, 7, 7, 7, 7, 7]
  }
}
```

The result contains 乾 as the base hexagram, line 1 as the moving line, 姤 as the changed hexagram,
and the complete line-order and lookup audit. The other request shapes are documented in
`skills/oh-my-saju/references/input-and-runtime.md`.

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

For an open-ended reading, set `request.readingMode: "broad"` and include the final
schema 2 `presentationDraft` in `validate-reading`. The runtime selects distinct, already-validated
Pack prose; requires exact chart-basis and interpretation spans; keeps strength and blind spot on
one finding-backed mechanism; requires distinct finding support for the two central mechanisms;
checks work, money, and relationship section semantics; and rejects specialist-topic laundering,
generic coaching substitutions, or season-as-environment wording. It renders the four pillars, ten
gods, exact-chart element distribution, central mechanisms, temperament, work, optional money, and
relationships. Candidate-dependent selections receive a local `△` marker, partial selections
receive `◇`, and the marker definitions appear once near the basis line. Schema 1 remains accepted
for 0.4.3 callers. The exact user-facing answer is returned at
`result.presentation.markdown`; focused and technical-audit requests omit that field.

Requires Node.js 18 or newer. See the repository README and `skills/oh-my-saju/SKILL.md` for usage
and installation. Redistribution notices for the bundled runtime are recorded in `NOTICE.md` and
`THIRD_PARTY_NOTICES.md`.

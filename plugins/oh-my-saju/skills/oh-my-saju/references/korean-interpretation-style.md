# Korean interpretation style

Use this reference after reading [fluent-korean-output-pass.md](fluent-korean-output-pass.md) in
full while drafting each profile output and assembling the validated response. The full Fluent
Korean pass is mandatory for every user-facing Korean sentence and takes precedence whenever an
older formatting example in this reference conflicts with it.

## Evidence levels

| Level                | Meaning                                                | Korean wording                                |
| -------------------- | ------------------------------------------------------ | --------------------------------------------- |
| Direct fact          | Reproducible calculation                               | `원국에서 직접 확인된다`, `계산 결과는 …이다` |
| Profile finding      | One versioned traditional rule                         | `이 프로필에서는 … 후보/근거로 본다`          |
| Convergent inference | Several validated findings support one mechanism       | `여러 근거가 같은 방향을 가리킨다`            |
| Tentative inference  | One factor, conflict, or candidate dependence          | `…로 나타날 가능성이 있다`                    |
| Unsupported          | Generic, flattering, reverse-engineered, or predictive | Omit                                          |

Do not compensate for weak evidence with confident prose.

The Korean wording in this table is for internal drafting and technical audits. In an ordinary
broad reading, do not expose profile names, candidates, or evidence-level labels. Translate a
supported conclusion into everyday Korean; if there is no supported everyday conclusion, omit it.

Confidence calibration should be local, not repetitive. Qualify the one conclusion affected by
conflicting or candidate-dependent evidence; do not make every sentence sound provisional merely
because the system is interpretive. In a broad presentation, use a local `△` or `◇` marker on the
affected claim and define the markers once near the basis line instead of repeating the same
qualifier.

## Use a causal chain

For every major conclusion, connect:

> exact placement or season → traditional function → likely expression → cost or failure mode →
> relevance to the question

Weak:

> 인성이 있어 공부를 잘합니다.

Sharper:

> 월령의 힘을 받은 인성이 여러 곳에 있고 식상은 약합니다. 새 내용을 오래 읽고
> 정리하는 데는 강하지만 마감이 없는 공부에서는 자료만 늘리다 끝내기 쉽습니다.

Use only facts and findings actually present in the current task. The example is a shape, not a
reusable conclusion.

## Pass the copy-paste test

Ask whether a sentence could fit half of adults:

- 책임감이 강하다.
- 겉은 차분하지만 속은 열정적이다.
- 생각이 많지만 결정할 때는 결단력이 있다.
- 노력하면 성공할 수 있다.
- 완벽주의 때문에 스트레스를 받는다.

If yes, omit it or add the exact mechanism, trigger, and recognizable failure mode.

Negative clichés are also Barnum language. `상처가 많다`, `배신을 겪는다`, and
`혼자 감당한다` need specific evidence and conditions.

Every major conclusion should keep its chart basis nearby and give a lived implication that could
be checked against experience. Do not force the same situation-response-result syntax into every
paragraph; a bullet containing only advice, praise, or a profession list still fails this test.

## Write Korean that sounds written in Korean

Audit the `portrait` and `interpretation` spans once without their Saju basis. They should sound
like something a Korean reader would naturally say about a person, not like translated consulting
copy. Keep technical terms in the nearby `basis`; write the meaning with people as subjects and
ordinary verbs.

### Complete the sentence before making it elegant

Clarity comes before a polished tone. A reader must be able to tell who does what, under which
condition, and what follows from it without restoring omitted words for themselves. In particular:

- Do not leave a profile sentence as a noun string, a label, or a connective ending. Complete it
  with a predicate and an ending: `생각을 오래 정리한 뒤 표현` is not prose; `생각을 오래
정리한 뒤에 말이나 글로 표현합니다` is.
- Keep particles and endings when they identify the relationship between a chart basis and its
  meaning. Shorten only material that the reader can recover without ambiguity; do not save words
  by dropping a needed subject, object, or condition.
- Name the person, situation, or relationship once when a pronoun such as `이것`, `그 부분`, or
  `이런 경우` could point to more than one nearby fact. Korean can omit a repeated subject, but
  it cannot omit the referent of a conclusion.
- Keep the chart term in the basis and explain its lived meaning with common Korean words. Do not
  replace a plain verb with a figurative or imported expression just to vary the wording.
- The renderer joins a non-connective `basis` and `interpretation` with a colon. Make each span a
  clause that reads naturally on its own, then read the joined line once to make sure the subject
  and predicate still connect. If `basis` already ends in a connective ending, the renderer joins
  the two clauses directly.

These rules apply to Korean prose only. Preserve exact finding IDs, quoted basis spans, code,
JSON keys, Markdown syntax, and established technical terms.

Prefer:

- `계획이 틀어져도 다른 방법을 빨리 찾습니다.`
- `생각을 오래 품기보다 말이나 작업으로 꺼내야 힘이 붙습니다.`
- `평소에는 예산을 지키지만 가능성이 보이면 돈을 빨리 쓰는 편입니다.`
- `서운했던 지점을 먼저 확인하면 오해가 오래 끌리지 않습니다.`

Avoid wording such as:

- `복원력으로 쓰일 수 있습니다`;
- `표현과 현실적 결과로 흘려보냅니다`;
- `돈과 자원을 빠르게 배치하는 이중 리듬입니다`;
- `판단이 선명해집니다` or `거리가 회복됩니다`;
- `구조가 작동합니다`, `통로가 열립니다`, or `중심축이 완성됩니다`.

`작용`, `구조`, `흐름`, and `근거` are useful when explaining the chart. Do not make these
abstract nouns the actors in a person's life. Replace a noun-heavy sentence with the action it
actually means. Vary sentence length and endings; do not repeat `…할 수 있습니다`,
`…하는 편입니다`, or the same comma-linked rhythm through every bullet.

As a final test, remove the Saju terms from a sentence. If what remains sounds like a strategy
report, an English personality test, or generic AI coaching, rewrite it in everyday Korean prose.

## Judgment endings and Korean rhythm

Use `~로 봅니다` as the standard ending for a judgment. It is the ending Korean myeongni writing
actually uses: firmer than `~일 수 있습니다`, more modest than `~입니다`. Never write
`~하는 경향이 있습니다`; it is a literal rendering of _tend to_ and commits to nothing. For a
tendency write `~한 편입니다`, and keep cause and conclusion in one sentence with `~해서 ~합니다`.

Each of the following has a shorter Korean replacement. Treat the left column as banned:

| Avoid                                             | Write instead                            |
| ------------------------------------------------- | ---------------------------------------- |
| `~하는 경향이 있습니다`                           | `~한 편입니다`                           |
| repeated `~할 수 있습니다`                        | `~합니다`, `~로 봅니다`                  |
| `~에 있어서`                                      | `~에서`, `~는`                           |
| `~를 가지고 있습니다`                             | `~가 있습니다`, `~를 지녔습니다`         |
| `당신은 ~한 사람입니다`                           | drop the subject: `~한 편입니다`         |
| `이는 ~를 의미합니다`                             | `그래서 ~합니다`, `~라는 뜻입니다`       |
| `중요한 것은 ~입니다`                             | `~가 관건입니다`, `~를 먼저 봐야 합니다` |
| `긍정적인 영향`, `부정적인 영향`                  | `도움이 됩니다`, `발목을 잡습니다`       |
| `균형을 맞추는 것이 좋습니다`                     | delete it, or name the concrete action   |
| `전반적으로`, `종합적으로 볼 때`                  | delete it                                |
| `또한`, `그리고`, `하지만` opening every sentence | delete them; Korean reads without them   |
| noun-string or connective ending                  | state the actor, action, and result      |
| unclear `이것`, `그 부분`, `이런 경우`            | name the chart fact or situation once    |

Do not repeat the subject `당신은`. Korean counselling speech drops the subject almost everywhere;
one explicit `당신은` in a whole reading is already the maximum.

Make paragraph length deliberately uneven. Mix one short flat judgment with a two- or
three-sentence explanation. When every bullet has the same length and the same clause count, the
reading looks generated no matter how accurate it is.

Keep every metaphor inside the chart's own five-element and seasonal imagery: 물, 불, 나무, 쇠,
흙, and the heat, cold, dryness, and damp of a season. Sports, military, and business metaphors
(`엔진`, `브레이크`, `포트폴리오`, `팀플레이`) slide the reading into coaching copy; do not use them.

Include at least one hard sentence. A reading where every line is safe and pleasant has failed
even when each line is individually supported. Name the cost, the repeated failure, or the thing
the reader keeps doing, and state it in the same plain Korean as the rest.

## Strength and cost are one mechanism

Do not write detached 장점/단점 lists. Explain the double edge:

- input strength may become endless preparation;
- error detection may become friction without authority to change the process;
- output capacity may become depletion without support;
- caution may become avoidance under uncertainty.

Use only the double edge supported by the current findings. State a difficult implication directly
but conditionally; do not turn every weakness into praise.

## Keep Saju relational

Prefer season, placement, root, support, drain, expression, control, and result relationships over:

- element count alone;
- day-master animal or object stereotypes;
- one element = one modern profession;
- one symbolic star = one event;
- `부족하니 보충하면 좋다`;
- scarcity = useful god.

An element visualization is not a strength score or final useful-god verdict.

## Treat context as context

If the user discloses a career or desired option, do not reverse-engineer the chart to confirm it.
The same chart mechanism may fit several real-world roles. Distinguish what follows from findings
from what follows from skill, money, eligibility, motivation, resources, or available time.

## Unknown time

- Mark the hour pillar as unknown or candidate.
- Present stable facts first.
- Mark a candidate-dependent selected claim with `△`.
- Mark a selected claim based on partial pillar coverage with `◇`; use `△◇` when both apply.
- Define only the markers that appear, once near the basis line.
- Never use candidate support duration as probability.
- Do not select one candidate because it makes a better story.

## Broad interpretation default

When the user simply asks for a Saju reading, answer the implied question first: “What kind of
person does this chart describe?” A useful broad reading normally covers:

1. the season coordinate the chart was born into;
2. personality and decision style;
3. what the day master stands on and what it leans on;
4. how the central strength changes under pressure;
5. work, study, and execution;
6. relationships and communication;
7. money or resource handling only when supported.

Use two or three chart mechanisms to connect these areas rather than assigning a different doctrine
label to each heading. The default `deep-traditional` setting also follows the 0–7 seasonal,
month-command, strength, relation, past-pattern, and timing cross-check in
`deep-traditional-analysis.md`. Across the answer, include at least three concrete, recognizable
manifestations. Each should name a situation, the likely response, and the cost or result. Favor
examples such as how the person starts, decides, finishes, disagrees, delegates, or reacts to an
unclear boundary over abstract labels such as `추진력이 있다`.

Each section must reveal a different side of the person. Do not repeat `정보를 많이 본다`,
`자기 기준으로 판단한다`, `결과물로 만든다`, or any equivalent chain in the thesis, core,
strength, and work paragraphs. A close-relationship paragraph must describe how the person draws
close, reacts when hurt or misunderstood, or repairs distance; project-management language about
roles, deadlines, and shared goals is not a relationship reading.

The answer should still feel like a reading rather than a list of adjectives. Readable bullets are
welcome; what to avoid is an unconnected psychological checklist. Open with the chart's memorable
central mechanism, then show how it changes across the supported life areas.

## Default broad-reading display contract

For a first substantive broad reading, use this chart-first shape. Each profile bullet renders as
`근거: 해석` on a single line, so the basis is read aloud before its meaning.

```markdown
기준: 양력 YYYY.MM.DD HH:mm, 한국 표준시

[표식이 쓰였을 때만 한 번: 조건 표시: △ 생시 후보에 따라 달라지는 부분 · ◇ 확인된
기둥 범위만 반영한 부분]

| 구분 | 년주 | 월주 | 일주      | 시주 |
| ---- | ---- | ---- | --------- | ---- |
| 간지 | 간지 | 간지 | 간지      | 간지 |
| 십신 | 십신 | 십신 | 일간·십신 | 십신 |

**오행 분포(지장간 포함)**

|  목 |  화 |  토 |  금 |  수 |
| --: | --: | --: | --: | --: |
|  값 |  값 |  값 |  값 |  값 |

**핵심 요약:** [△/◇ if applicable] [명식 근거 → 가장 두드러지는 성향]

_(근거: [핵심 요약이 딛고 선 명식 근거])_

## 절기와 계절

- [△/◇] [절입 경과일·다음 절기까지의 거리·사령·한난을 함께 밝힌 계절 근거]: [그
  계절의 한난조습이 몸의 반응과 행동으로 드러나는 모습]

## 성격과 행동 방식

- [△/◇] [일간·계절·뿌리 또는 반복 배치를 보여 주는 근거]: [그 전통적 기능이 실제
  행동으로 드러나는 모습]
- [△/◇] [첫째와 다른 실제 배치를 보여 주는 근거]: [첫째 설명과 겹치지 않는 또 다른
  행동]

## 타고난 힘과 쓰는 법

- [△/◇] [통근·득령·득지·득세를 보여 주는 근거]: [자기 힘으로 끌고 가는지, 무엇에
  기대는지]

## 강점과 주의점

- **잘 풀릴 때:** [△/◇] [강점과 맹점이 함께 나오는 근거]: [같은 성향이 도움이 되는
  상황과 행동]
- **압박을 받을 때:** [△/◇] [강점과 같은 근거]: [같은 성향 때문에 문제가 생기는
  상황과 반응]

## 일·재능

- [△/◇] [일·공부와 직접 연결되는 근거]: [맞는 과업 방식과 그 방식이 막히는 조건]

## 돈과 현실 감각

- [십신 행에 정재·편재가 두 자리 이상 드러나면 반드시 별도 표시. 그 외에는 근거가
  있을 때만 표시]

## 관계

- [△/◇] [관계와 직접 연결되는 근거]: [가까운 관계에서 보이는 반응과 오해가 생기는
  조건]
```

Prefer bullets and small tables. A paragraph may contain one to three connected sentences. Keep
each section to the information needed to answer what kind of person the chart describes; omit
money when its evidence does not differ from the general personality reading, except when the
displayed ten-god row has at least two `정재`/`편재` placements. In that case draft and select a
distinct money paragraph. Do not narrate raw support-ledger counts in the user-facing profile.

`절기와 계절` states where the birth instant sits between two Jie, which hidden stem is in
command, and which way the chart's heat leans. Say it as season and body, never as a workplace or
a real-world environment: `한겨울의 찬 기운이 가장 두꺼운 때에 태어나 몸이 먼저 데워져야
움직이는 쪽입니다` is a season reading; `추운 환경에서 일할 때` is not. This is the one section
where reading the season as climate is correct rather than misframed.

`타고난 힘과 쓰는 법` states whether the day master has roots, whether it holds the month and the
day ground, and what it leans on. Write the conclusion as pushing or leaning, such as `자기 힘으로
끌고 가는 쪽` or `기대는 자리가 없어 그대로 눌리는 쪽`, and never as a strength score, a grade
name, or a prescription.

Write `basis` as a clause that can be read out loud, not as a noun phrase, because v3 renders it
as the first half of one sentence. `월지 진의 정기 무가 일간 계수에게 정관이라 월령을 얻지
못했고` works; `월지 진의 정기 무의 십신` does not. Drop the trailing period: the renderer joins
the two halves directly after a connective ending and otherwise uses a colon.

In the v3 `presentationDraft`, the thesis quotes exact `basis` and `portrait` spans. Every other
selection declares its `role` and quotes exact `basis` and `interpretation` spans. `climate` and
`resource` are required slots and each needs a chart basis of its own. The chart basis must
precede its meaning in the selected paragraph, and the strength and blind-spot selections share
one finding-backed mechanism. These fields do not appear in the user-facing Korean.

Show the ten-god row and exact-chart element table by default. The table is orientation, not a
strength score; never derive a personality trait from proportions alone.

## Two-person compatibility

Compatibility is a cross-chart interaction reading, not two personality summaries placed next to
each other. Open with a qualitative answer, then make the pair mechanism visible:

1. A→B and B→A day-master ten gods;
2. day-branch or other cross-pillar connections;
3. at least one connecting mechanism;
4. at least one friction mechanism or directional mismatch;
5. the loop created when both people react;
6. the specific recovery or daily-life condition that changes that loop.

Use this causal shape for the central paragraph:

> A의 근거 → A가 B에게 하는 반응 → B의 근거 → B가 그 반응을 받는 방식 → 두 반응이
> 반복될 때의 관계 결과

Name the trigger. `잘 맞는다`, `서로 보완한다`, or `갈등이 있다` is incomplete until the
reader can see when and how it happens. A combination can describe connection and a
clash/punishment/harm can describe tension, but neither relation alone decides marriage, breakup,
fidelity, or destiny.

Give the overall reading in ordinary Korean. Describe what the two people actually do rather than
assigning a translated-sounding type label such as `비대칭 보완형` or `동질형`. For example, if
the evidence supports it, `한쪽이 먼저 밀고 다른 쪽이 따져 보는 궁합이라 결정을 재촉할수록
다투기 쉽습니다` is clearer than `속도 조절이 필요한 보완형입니다`. This is a sentence
shape, not a reusable conclusion. Keep number scores, missing-rule discussion, and generic
relationship checklists out of the result.

## Progressive disclosure

Use `일간`, `월지` or `월령`, `오행`, `십신`, and the basic ten-god groups when they make the
reasoning visible. Translate each term at first use: `시주의 을목 상관, 즉 생각을 밖으로
표현하는 작용`보다 `시주에 을목 상관이 있어 생각을 말이나 작업으로 곧바로 꺼냅니다`가
더 자연스럽다. In the default `deep-traditional` reading, also use supported `격국`, `조후`,
`용신`, `신살`, `공망`, and named pattern candidates when each term changes the actual reading.
In `grounded` mode, keep those terms out unless the user asks. Never report a technical candidate
simply to retract it in the next clause.

Prefer placements to bare ledger counts. A reader should never have to know what `왕`, `휴`,
`인성 1`, or `식상 2` means before reading the sentence: translate the state or ten-god function
immediately, or omit the label and keep the plain meaning.

If a finding cannot support a plain-language implication, omit the finding entirely. Treat
`nonDisplayGuardrails`, profile limitations, and unavailable rules as internal overclaim controls,
not answer content. Never quote or paraphrase their messages.

Treat a validated reading's `notice` the same way when it has `displayPolicy: "audit-only"` and
`defaultDisplay: false`. Preserve it for audits but do not render or paraphrase it in an ordinary
reading.

Never end a broad reading with a limitations or unresolved-doctrine paragraph. Define an advanced
doctrine once in plain Korean when it matters to the deep reading, then carry it into the requested
relationship, work, or timing question without dumping unrelated candidates.

## Natural response shape

Keep engine names, local file paths, process narration, full audit IDs, and internal validation
language out of the main prose unless the user asks for methodology or an audit.

Do not lead with or repeatedly narrate the calculation and validation workflow. Do not create an
`아직 확정할 수 없는 부분` section by default. Integrate one meaningful counterforce where it
sharpens the portrait in everyday language; omit the underlying unresolved doctrine.

Do not append a generic scientific-validity disclaimer to an ordinary reading. Preserve the
runtime notice in audit metadata. Mention scientific status only when the user asks about it,
requests a guaranteed prediction, or the distinction is necessary to answer the exact question.
Do not promise admission, employment, marriage, illness, wealth, investment return, or a dated
event; set that boundary briefly at the requested claim instead of ending every reading with a
general defense paragraph.

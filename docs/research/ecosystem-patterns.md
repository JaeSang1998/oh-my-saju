# 오 마이 사주: Agent Skills·Claude Code·Codex 플러그인 생태계 리서치

> 조사 기준일: 2026-07-29
>
> 범위: 공개 Git 저장소와 공식 사양의 현재 스냅샷
>
> 표기: **확인 사실**은 링크된 1차 소스에서 직접 확인한 내용이고, **권고**는 그 사실을 현재 `saju-engine` 설계에 적용한 판단이다.
>
> 구현 업데이트(2026-07-30): 현재 배포 정본은 `saju-engine@0.9.0`,
> `oh-my-saju@0.3.0`, `calculation-baseline@1.1.0`과 네 개의 1.0.0 전통 Pack이다.
> 아래 전환 단계의 0.8/0.2 표기는 해당 경계를 처음 도입한 역사적 단계다.

## 결론

이 프로젝트는 “사주 앱을 플러그인으로 다시 만드는 것”보다 아래처럼 배포 외피를 씌우는 편이 맞다.

```text
Claude Code / Codex / 기타 Agent Skills 클라이언트
                         │
                호스트별 얇은 어댑터
            (.claude-plugin / .codex-plugin)
                         │
              표준 Agent Skill workflow
                         │
          plugin Reading/Application runtime
                         │
              plugin Tradition Packs
       (source/rules/tables/helpers/provenance)
                         │
                saju-engine 0.9.0
       (역법·시간대·원국·불확실성·timing 사실)
```

핵심 판단은 다섯 가지다.

1. **이식성의 정본은 Agent Skills 표준의 `skills/*/SKILL.md`다.** Claude와 Codex는 이 정본을 감싸는 배포 어댑터다.
2. **`saju-engine`은 결정론적 계산 정본만 남긴다.** 학파 규칙·해설·application과
   호스트 이름, 도구 이름, 마켓플레이스 규칙을 엔진에 넣지 않는다.
3. **플러그인과 v0.3의 단일 end-to-end Agent Skill ID는 `oh-my-saju`로 맞춘다.** 기존
   로컬 `interpret-korean-saju` artifact는 사용자 작업으로 보존하되 플러그인의 정본으로
   복제하지 않는다. npm 코어까지 서둘러 이름을 바꿀 이유는 없다.
4. **처음부터 MCP를 붙이지 않는다.** 로컬 Node CLI로 충분한 도메인에는 skill-only plugin이 더 작고 이식성이 높다. MCP는 훗날 원격 서비스가 실제로 필요할 때 같은 JSON 계약을 운반하는 선택적 전송 계층으로 둔다.
5. **호스트별 `SKILL.md` 복사본을 만들지 않는다.** 한 정본을 그대로 설치하거나, 불가피하면 생성물로 만들고 CI에서 drift를 막는다.
6. **학파는 source/rule/table/helper/provenance가 함께 움직이는 Tradition Pack이다.**
   Pack 결과는 나란히 비교하되 평탄화·투표·평균하지 않는다.

현재 프로젝트의 가장 큰 경쟁력은 계산 근거, 시간 미상 후보 집합, Pack별
규칙·fixture·해시, finding ID 검증이 분리돼 있다는 점이다. 공개 생태계의 많은 사주
스킬은 “프롬프트가 npm 함수를 한 번 호출하는 구조”에 머무른다. 오 마이 사주는 이
계층을 평평하게 만들지 않고, **감사 가능한 계산 코어와 판본화된 Pack을 어느
에이전트에서도 같은 workflow로 사용하는 배포 제품**으로 포지셔닝하는 편이 차별화된다.

---

## 1. 조사 방법과 소스

광고성 디렉터리나 2차 요약은 근거로 쓰지 않았다. 공식 사양, 벤더 공식 예제 저장소, 실제로 여러 에이전트에 배포되는 공개 저장소, 역법/사주 엔진의 소스·테스트·변경 이력을 조사했다. 저장소가 계속 변하므로 재현이 필요한 링크는 조사한 commit에 고정했다.

| 소스                                                                                                                | 조사 commit | 확인한 용도                                                    | 라이선스 주의                                                   |
| ------------------------------------------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------- | --------------------------------------------------------------- |
| [agentskills/agentskills](https://github.com/agentskills/agentskills/tree/38a2ff82958afee88dadf4831509e6f7e9d8ef4e) | `38a2ff8`   | 표준 디렉터리, frontmatter, progressive disclosure, 검증·eval  | 코드 Apache-2.0, `docs/`는 CC BY 4.0                            |
| [anthropics/skills](https://github.com/anthropics/skills/tree/b29e7cf65e5cb78a5ac33d582270551bc74a14eb)             | `b29e7cf`   | Claude Code marketplace가 여러 skill bundle을 묶는 방식        | skill별 상이. 문서 skill 일부는 source-available이지 OSS가 아님 |
| [openai/plugins](https://github.com/openai/plugins/tree/11c74d6ba24d3a6d48f54a194cd00ef3beea18f9)                   | `11c74d6`   | 현재 Codex plugin·marketplace·skill-only·router 예제           | plugin별 상이. MIT, proprietary, vendor terms가 섞여 있음       |
| [epoko77-ai/im-not-ai](https://github.com/epoko77-ai/im-not-ai/tree/53e24e8f92cf344efcb812103f7c2b203e7efffc)       | `53e24e8`   | 한글 humanizer의 Claude/Codex 분기, 결정론적 gate, golden test | MIT                                                             |
| [DaleSeo/korean-skills](https://github.com/DaleSeo/korean-skills/tree/ae12ba27982ebeff03b46dc738365aaa34260d9a)     | `ae12ba2`   | 표준 skill 묶음, Claude plugin, 설치·버전 CI                   | MIT                                                             |
| [vercel-labs/skills](https://github.com/vercel-labs/skills/tree/e173b8c88f2581cfdaa1b6767c6519a08155790e)           | `e173b8c`   | 한 Git 저장소를 여러 에이전트 경로에 설치하는 CLI              | MIT                                                             |
| [obra/superpowers](https://github.com/obra/superpowers/tree/44c9b2d6e889982ac18c27d05a19fefe335194e1)               | `44c9b2d`   | 한 skill 정본 + 여러 harness 어댑터, 포팅·동작 eval            | MIT                                                             |
| [NomaDamas/k-skill](https://github.com/NomaDamas/k-skill/tree/42473dad91ca919fd21d6d8b7fc6dbae3fa48b2c)             | `42473da`   | 대형 한국어 skill catalog, 로컬 CLI thin wrapper, 사주 skill   | MIT                                                             |
| [modu-ai/cowork-plugins](https://github.com/modu-ai/cowork-plugins/tree/6311343fe766379d7e7f2e1571211556b760db31)   | `6311343`   | 28 plugin·176 skill catalog 무결성 검사와 provenance           | 현재 본체 NC-ND. 내용 복제·개작 대상으로 쓰면 안 됨             |
| [6tail/lunar-javascript](https://github.com/6tail/lunar-javascript/tree/4c45a59f79b856125516f31aefa8295035c16afd)   | `4c45a59`   | 폭넓은 음력·팔자 API와 boundary regression test                | MIT                                                             |

추가로 [OpenAI의 옛 `openai/skills` 저장소](https://github.com/openai/skills)는 조사일 현재 README에서 deprecated라고 명시하고, 현재 예제는 `openai/plugins`와 “Build plugins” 문서로 안내한다. 따라서 새 배포 구조를 옛 Codex skills catalog에 맞추면 안 된다.

---

## 2. 먼저 고정해야 할 용어

공개 문서에서는 Pack, runtime, Agent Skill을 서로 바꿔 부르지 않는다.

| 권장 용어                   | 의미                                                                    | 소유자                      |
| --------------------------- | ----------------------------------------------------------------------- | --------------------------- |
| **Engine / Core**           | 역법, 시간대, 원국, 불확실성, 구조, timing 계산 사실                    | `saju-engine`               |
| **Tradition Pack**          | source/rule/table/helper/fixture/provenance를 묶은 버전형 전통 module   | `plugins/oh-my-saju`        |
| **Pack runtime**            | Pack adapter, 평가, candidate 집계, 미해결 비교                         | plugin `runtime/traditions` |
| **Reading/Application**     | narration task, claim gate, prepare/validate JSON interface             | plugin runtime              |
| **Agent Skill**             | `SKILL.md` 기반 입력·호출·초안·검증·제시 workflow                       | plugin `skills/oh-my-saju`  |
| **Host Adapter**            | 같은 Skill/runtime을 Claude 또는 Codex에 설치·발견시키는 얇은 metadata  | host manifest               |
| **Future ontology adapter** | Pack-native 용어를 provenance 있는 비교 좌표로 매핑하는 선택적 seam     | plugin comparison seam      |
| **MCP transport**           | 훗날 같은 application interface를 원격 도구로 운반하는 선택적 전송 방식 | 별도 adapter/server         |

**권고:** 제거된 `saju-engine/interpretation`, `/ai`, `/agent` subpath는 호환 alias로
남기지 않는다. 이 breaking refactor를 `saju-engine` 0.8.0에서 명시하고, 계산 코어
interface와 plugin application interface를 각각 검증한다.

이 구분은 [ADR 0006](../adr/0006-core-pack-skill-boundaries.md)의 결정과 일치한다.
Agent Skill을 설치해도 core 계산이나 Pack rule이 변하면 안 된다.

---

## 3. 공식 표준과 벤더 패키징에서 확인된 사실

### 3.1 Agent Skills가 공통분모다

[Agent Skills 사양](https://github.com/agentskills/agentskills/blob/38a2ff82958afee88dadf4831509e6f7e9d8ef4e/docs/specification.mdx)의 최소 단위는 `skill-name/SKILL.md`다. `scripts/`, `references/`, `assets/`는 선택 사항이다.

확인된 핵심 제약은 다음과 같다.

- `name`은 1~64자의 영문 소문자·숫자·하이픈이며 디렉터리명과 같아야 한다.
- `description`은 1~1024자로 “무엇을 하는지”와 “언제 쓰는지”를 함께 써야 한다.
- 표준 선택 필드는 `license`, `compatibility`, `metadata`, `allowed-tools`다.
- `allowed-tools`는 experimental이고 클라이언트별 지원이 다르다.
- top-level `version`은 표준 필드가 아니다. 이 프로젝트는 portable frontmatter의
  version을 생략하고 plugin release에서 workflow 변경을 추적한다.
- 시작할 때 모든 skill의 name·description만 읽고, 활성화된 `SKILL.md` 본문을 읽은 뒤, 상세 reference를 필요할 때만 읽는 progressive disclosure 구조다.
- 본문은 5,000 token·500 line 미만이 권장되고 reference chain은 얕게 유지한다.
- `skills-ref validate <skill-dir>`가 표준 검증기다.

[공식 작성 모범 사례](https://github.com/agentskills/agentskills/blob/38a2ff82958afee88dadf4831509e6f7e9d8ef4e/docs/skill-creation/best-practices.mdx)는 범용 설명을 길게 쓰는 대신 실제 프로젝트의 schema, incident, bug fix, fixture, gotcha를 넣으라고 권한다. 반복해서 모델이 재작성하는 결정론적 작업은 `scripts/`로 옮기고, fragile한 단계에는 validator를 둔다. 이것은 이미 계산 스크립트와 evidence 계약이 있는 이 프로젝트에 잘 맞는다.

[공식 eval 가이드](https://github.com/agentskills/agentskills/blob/38a2ff82958afee88dadf4831509e6f7e9d8ef4e/docs/skill-creation/evaluating-skills.mdx)는 skill 내부 `evals/evals.json`, skill 사용/미사용 baseline, 깨끗한 세션, 기계적 assertion과 사람 검토의 결합을 제시한다. [trigger description 가이드](https://github.com/agentskills/agentskills/blob/38a2ff82958afee88dadf4831509e6f7e9d8ef4e/docs/skill-creation/optimizing-descriptions.mdx)는 should-trigger뿐 아니라 가까운 should-not-trigger query를 반복 실행하라고 한다.

**권고:** 오 마이 사주의 portable baseline은 이 사양만 요구한다. 호스트 전용 frontmatter나 도구 이름을 정본 `SKILL.md`에 넣지 않는다.

### 3.2 Claude Code marketplace는 여러 skill을 한 plugin으로 묶을 수 있다

Anthropic 공식 저장소의 [marketplace.json](https://github.com/anthropics/skills/blob/b29e7cf65e5cb78a5ac33d582270551bc74a14eb/.claude-plugin/marketplace.json)은 한 저장소에서 `document-skills`, `example-skills`, `claude-api` 같은 여러 plugin bundle을 만들고 각 bundle에 정확한 skill 경로를 열거한다. [README](https://github.com/anthropics/skills/blob/b29e7cf65e5cb78a5ac33d582270551bc74a14eb/README.md)는 다음 설치 UX를 실제 예로 제공한다.

```text
/plugin marketplace add anthropics/skills
/plugin install example-skills@anthropic-agent-skills
```

여기서 얻을 수 있는 패턴은 다음과 같다.

- 저장소 하나에 여러 skill이 있어도 사용자에게는 하나의 제품 plugin으로 보일 수 있다.
- skill은 self-contained directory로 유지한다.
- marketplace가 묶음을 정의하므로 skill 디렉터리를 호스트별로 복제할 필요가 없다.
- 저장소 전체가 한 라이선스라고 가정하면 안 된다. Anthropic README 자체가 많은 예제는 Apache-2.0이지만 문서 제작 skill은 source-available이라고 구분한다.

**권고:** Claude 사용자에게는 `oh-my-saju` 하나를 설치하게 한다. v0.2는 한 end-to-end
Agent Skill로 계산·해석·비교·감사를 라우팅하고, 실제 trigger eval이 분리 필요성을
보일 때만 같은 플러그인 안에 vertical skill을 추가한다.

### 3.3 Codex는 현재 plugin이 배포 단위다

[OpenAI 공식 plugin 예제 저장소 README](https://github.com/openai/plugins/blob/11c74d6ba24d3a6d48f54a194cd00ef3beea18f9/README.md)는 각 plugin이 `plugins/<name>/` 아래 있고 `.codex-plugin/plugin.json`이 필수라고 명시한다. `skills/`, `.app.json`, `.mcp.json`, `agents/`, `commands/`, `hooks.json`, `assets/`는 필요할 때 추가하는 companion surface다. 기본 marketplace는 `.agents/plugins/marketplace.json`이다.

중요한 공식 예제는 두 종류다.

- [`superpowers` plugin manifest](https://github.com/openai/plugins/blob/11c74d6ba24d3a6d48f54a194cd00ef3beea18f9/plugins/superpowers/.codex-plugin/plugin.json)는 `skills: "./skills/"`만으로 유용한 plugin이 성립함을 보여 준다.
- [`figma` plugin manifest](https://github.com/openai/plugins/blob/11c74d6ba24d3a6d48f54a194cd00ef3beea18f9/plugins/figma/.codex-plugin/plugin.json)는 실제 외부 통합이 있을 때 `apps`와 `mcpServers`, agent, command, hook, asset을 더하는 풍부한 형태다.

[현재 Codex plugin creator의 manifest sample](https://github.com/openai/codex/blob/main/codex-rs/skills/src/assets/samples/plugin-creator/references/plugin-json-spec.md)은 kebab-case name, strict semver, author, relative component path, `interface` 메타데이터, marketplace의 installation/authentication policy를 설명한다. 이 사양은 빠르게 변하고 sample 안에서도 optional field 설명과 validator 허용 범위가 완전히 같지 않은 부분이 있으므로, 문서를 복사하는 것보다 **출시 때의 공식 validator를 실행하는 것이 정본**이다.

현재 기준으로 특히 확인할 사항은 다음과 같다.

- `.codex-plugin/plugin.json`의 name과 plugin 디렉터리명을 같게 둔다.
- `interface.defaultPrompt`는 최대 세 개의 짧은 문자열 배열로 다룬다.
- icon·logo·screenshot 경로는 archive 안에 실제 파일이 있어야 한다.
- `.app.json`이나 `.mcp.json`이 없으면 manifest에서도 `apps`, `mcpServers`를 생략한다.
- marketplace entry에는 source, installation/authentication policy, category를 명시한다.

**권고:** 오 마이 사주 v1은 skill-only Codex plugin으로 시작한다. “언젠가 쓸 수도 있다”는 이유로 MCP, app, hook, command를 넣지 않는다.

### 3.4 router + vertical skill 패턴은 도메인이 커졌을 때 유효하다

OpenAI의 [`ngs-analysis`](https://github.com/openai/plugins/tree/11c74d6ba24d3a6d48f54a194cd00ef3beea18f9/plugins/ngs-analysis)는 하나의 plugin 아래 router skill, assay별 vertical skill, 공통 registry/schema/reference, deterministic runner와 test를 둔다. [`ngs-analysis-router`](https://github.com/openai/plugins/blob/11c74d6ba24d3a6d48f54a194cd00ef3beea18f9/plugins/ngs-analysis/skills/ngs-analysis-router/SKILL.md)는 broad intent를 받은 뒤 최소 입력을 묻고 전문 workflow로 넘긴다.

이 구조는 “하나의 거대한 prompt”보다 계층이 잘 보이지만, skill 수가 적을 때 router까지 만들면 description 경합과 context 중복이 생길 수 있다.

**권고:** v0.2는 `oh-my-saju` 하나를 end-to-end 진입점으로 둔다. 공개 workflow가
늘고 broad intent가 실제 eval에서 오동작할 때만 vertical skill이나
`oh-my-saju-router`를 추가한다.

---

## 4. 실제 다중 에이전트 저장소에서 확인된 패턴

### 4.1 한 정본과 설치 경로의 분리

[Vercel `skills` CLI README](https://github.com/vercel-labs/skills/blob/e173b8c88f2581cfdaa1b6767c6519a08155790e/README.md)는 GitHub shorthand, Git URL, 로컬 경로에서 skill을 찾아 Claude Code, Codex, Cursor 등 여러 agent 경로에 설치한다.

```text
npx skills add owner/repo
npx skills add owner/repo -a claude-code -a codex
```

이 도구의 현재 매핑은 프로젝트 기준 Claude Code가 `.claude/skills/`, Codex가 `.agents/skills/`, 전역 기준 각각 `~/.claude/skills/`, `~/.codex/skills/`다. 기본은 canonical copy에서 호스트 경로로 symlink하고, 지원이 약한 환경은 `--copy`를 제공한다. add/list/update/remove와 로컬 설치도 지원한다.

이 CLI가 “모든 agent에서 행동이 동일하다”는 보증은 아니다. **파일을 올바른 위치로 배포하는 것**과 **호스트별 도구·권한·모델 차이에도 workflow가 같은 결과를 내는 것**은 별도 문제다.

**권고:**

- README의 범용 설치 경로로 `npx skills add <org>/oh-my-saju`를 제공한다.
- CI에서는 `--copy`로 임시 디렉터리에 설치해 support file이 빠지지 않았는지 검사한다.
- 설치 성공을 cross-agent 동작 검증으로 간주하지 않고 별도 host behavior eval을 둔다.
- 이 CLI 자체가 현재 Node 22 이상을 요구하므로 설치 smoke job은 Node 22를 쓰되, 실제 오 마이 사주 계산 runtime은 기존 Node 18 계약을 유지한다.

### 4.2 shared skill body + thin harness adapter

[Superpowers 포팅 가이드](https://github.com/obra/superpowers/blob/44c9b2d6e889982ac18c27d05a19fefe335194e1/docs/porting-to-a-new-harness.md)는 여러 agent 배포에서 가장 명확한 패턴을 제공한다.

확인된 핵심은 다음과 같다.

- 모든 harness가 같은 `skills/` 내용을 사용한다.
- skill 본문은 특정 도구 이름이 아니라 “파일을 읽는다”, “subagent를 보낸다” 같은 action vocabulary를 쓴다.
- 도구명 번역과 bootstrap만 harness adapter에 둔다.
- installer가 배달할 수 있는 파일만 사용하고 사용자의 전역 설정을 몰래 편집하지 않는다.
- subagent가 없으면 inline 실행 또는 capability 부족 보고, task tracker가 없으면 plan file 같은 명시적 fallback을 쓴다.
- 포팅 완료 조건에 clean session behavior transcript를 포함한다.

Superpowers는 [Claude, Codex, Cursor 등의 manifest](https://github.com/obra/superpowers/tree/44c9b2d6e889982ac18c27d05a19fefe335194e1)를 나란히 두고 같은 버전 `6.2.0`을 사용한다. Codex 정식 카탈로그로 보낼 때는 [deterministic sync script](https://github.com/obra/superpowers/blob/44c9b2d6e889982ac18c27d05a19fefe335194e1/scripts/sync-to-codex-plugin.sh)와 [sync test](https://github.com/obra/superpowers/blob/44c9b2d6e889982ac18c27d05a19fefe335194e1/tests/codex-plugin-sync/test-sync-to-codex-plugin.sh)로 개발 파일을 제외한 archive를 생성한다.

[테스트 문서](https://github.com/obra/superpowers/blob/44c9b2d6e889982ac18c27d05a19fefe335194e1/docs/testing.md)는 plugin code test인 `tests/`와 실제 LLM session behavior인 `evals/`를 분리한다. 실모델 eval은 느려 현재 CI에 넣지 못하고, 빠른 PR subset과 nightly full sweep를 후속안으로 적는다.

**오 마이 사주에 그대로 적용할 부분:**

- `skills/`는 한 번만 작성한다.
- Claude/Codex adapter는 manifest·UI metadata·선택적 tool mapping만 갖는다.
- 학파 비교의 parallelism은 선택적 최적화다. subagent가 없는 host에서는 순차 평가한다.
- package archive는 allowlist로 만들고, 생성물이 정본과 같은지 CI가 확인한다.

**적용하지 않을 부분:** Superpowers는 모든 세션에 자체 방법론을 주입해야 해서 bootstrap hook이 핵심이다. 사주처럼 사용자가 명시적으로 요청하는 도메인 skill에는 항상 켜지는 session bootstrap이 필요 없다. description 기반 activation이면 충분하다.

---

## 5. 한국어 humanizer·catalog 사례에서 배울 점

### 5.1 `im-not-ai`: 결정론적 전처리·LLM·결정론적 gate의 샌드위치

[`im-not-ai`의 Claude skill](https://github.com/epoko77-ai/im-not-ai/blob/53e24e8f92cf344efcb812103f7c2b203e7efffc/.claude/skills/humanize-korean/SKILL.md)은 다음 구조를 쓴다.

```text
결정론적 script가 route_hint 계산
        → LLM이 진단·윤문
        → 결정론적 script가 변경률·구조 gate 검증
```

큰 taxonomy를 매번 읽지 않고 runtime용 compact reference를 생성한다. 조사한 snapshot에서 main `SKILL.md`는 257줄, 전체 taxonomy는 692줄, 생성된 diagnosis index는 180줄, quick rules는 113줄이다. [CI](https://github.com/epoko77-ai/im-not-ai/blob/53e24e8f92cf344efcb812103f7c2b203e7efffc/.github/workflows/test.yml)는 pytest와 함께 생성된 reference drift를 검사한다. 저장소에는 golden, metric, route, gate, install, e2e, live test가 분리돼 있다.

Claude는 여러 agent를 쓰는 full 경로를, [Codex adapter](https://github.com/epoko77-ai/im-not-ai/blob/53e24e8f92cf344efcb812103f7c2b203e7efffc/codex/skills/humanize-korean/SKILL.md)는 single-call 경로를 제공한다. 즉, **portable baseline + host-enhanced mode**라는 현실적인 모델을 보여 준다.

사주에 적용하면 다음과 같다.

```text
결정론적 생년월일·시간 정규화와 사주 계산
        → 판본화된 규칙 평가
        → LLM이 finding ID만 근거로 자연어 해설
        → 로컬 validator가 ID·불확실성·금지 단정을 검증
```

이것은 이미 현재 엔진이 가진 설계다. Agent Skill은 이 순서를 강제하고 필요한 script를 실행하는 역할만 하면 된다.

동시에 이 저장소는 복제 배포의 위험도 보여 준다. 조사 commit에서:

- main [Claude `SKILL.md`](https://github.com/epoko77-ai/im-not-ai/blob/53e24e8f92cf344efcb812103f7c2b203e7efffc/.claude/skills/humanize-korean/SKILL.md)와 [README](https://github.com/epoko77-ai/im-not-ai/blob/53e24e8f92cf344efcb812103f7c2b203e7efffc/README.md)는 `2.3.0`이다.
- [Claude plugin manifest](https://github.com/epoko77-ai/im-not-ai/blob/53e24e8f92cf344efcb812103f7c2b203e7efffc/.claude-plugin/plugin.json)와 [marketplace](https://github.com/epoko77-ai/im-not-ai/blob/53e24e8f92cf344efcb812103f7c2b203e7efffc/.claude-plugin/marketplace.json)는 `2.1.0`이다.
- Codex 복사본은 `40+` pattern이라고 적지만 main은 `70` pattern이라고 적는다.
- [RELEASING.md](https://github.com/epoko77-ai/im-not-ai/blob/53e24e8f92cf344efcb812103f7c2b203e7efffc/RELEASING.md)도 과거 수동 버전 갱신 누락을 사고로 기록한다.

**권고:** 체크리스트만으로 해결하지 말고 manifest·adapter·release note의 버전과 canonical content를 생성 또는 drift check한다.

### 5.2 `DaleSeo/korean-skills`: 작은 composable skill과 배포 CI

이 저장소는 `humanizer`, `grammar-checker`, `style-guide`를 각각 `SKILL.md`, `references/`, `examples/`로 나눈다. [humanizer frontmatter](https://github.com/DaleSeo/korean-skills/blob/ae12ba27982ebeff03b46dc738365aaa34260d9a/skills/humanizer/SKILL.md)는 `license`, `metadata.version`, experimental `allowed-tools`를 사용한다.

[CI](https://github.com/DaleSeo/korean-skills/blob/ae12ba27982ebeff03b46dc738365aaa34260d9a/.github/workflows/ci.yml)는 다음을 자동 검사한다.

- skill 또는 plugin 파일이 바뀌면 plugin version이 올랐는지
- 개별 skill 내용이 바뀌면 `metadata.version`이 strict하게 증가했는지
- 모든 skill이 `skills-ref validate`를 통과하는지
- publish dry-run이 통과하는지
- 로컬 경로와 원격 GitHub에서 실제 install이 되는지
- 설치된 `.agents/skills/*/SKILL.md`가 모두 존재하는지

[release workflow](https://github.com/DaleSeo/korean-skills/blob/ae12ba27982ebeff03b46dc738365aaa34260d9a/.github/workflows/release.yml)는 plugin manifest에서 version을 읽어 tag와 publish를 연결한다. README는 한국어와 영어를 따로 제공한다.

**권고:** 오 마이 사주도 정적 사양 검증, 로컬 설치, 원격 설치, version bump를 CI에서 분리한다. 다만 experimental `allowed-tools`를 portable core에 복사하지는 않는다.

### 5.3 `k-skill`: 로컬 package thin wrapper와 인터뷰 우선

[`k-skill`의 `saju-fortune` Agent Skill](https://github.com/NomaDamas/k-skill/blob/42473dad91ca919fd21d6d8b7fc6dbae3fa48b2c/saju-fortune/SKILL.md)은 출생 정보를 먼저 인터뷰하고 로컬 npm package를 호출한다. 시간 미상, 음력·윤달 미지원, 출생지 누락을 failure mode로 적고, 별도 MCP 서버를 띄우지 않는다. [`saju-fortune` package test](https://github.com/NomaDamas/k-skill/blob/42473dad91ca919fd21d6d8b7fc6dbae3fa48b2c/packages/saju-fortune/test/index.test.js)는 missing input, 시간 미상, CLI JSON, tool-name adapter를 검사한다.

이 사례는 두 가지를 보여 준다.

- 로컬 라이브러리 호출만으로 Agent Skill 제품을 만들 수 있어 MCP가 필수는 아니다.
- “정보가 없으면 묻고, 모르는 시주는 만들지 않는다”는 계약을 skill 자체에 명시해야 한다.

오 마이 사주는 이 thin wrapper보다 훨씬 강한 계산·불확실성 코어를 갖고 있다. 이 사례의 배포 단순성만 취하고, 계산·학파 해석을 prompt에 다시 구현해서는 안 된다.

### 5.4 대형 catalog에서 취할 것은 무결성 검사이지 콘텐츠가 아니다

`modu-ai/cowork-plugins`의 조사 snapshot은 marketplace metadata 기준 28 plugin·176 skill이다. [marketplace validator](https://github.com/modu-ai/cowork-plugins/blob/6311343fe766379d7e7f2e1571211556b760db31/scripts/validate-marketplace.sh)는 version sync point, marketplace와 plugin count, subagent가 참조하는 phantom skill, frontmatter key를 검사한다. [NOTICE.md](https://github.com/modu-ai/cowork-plugins/blob/6311343fe766379d7e7f2e1571211556b760db31/NOTICE.md)는 imported component별 원 저장소와 라이선스를 기록한다.

좋은 패턴은 다음 두 가지다.

- catalog가 커지면 파일 존재 여부만이 아니라 **skill 간 참조가 실제로 resolve되는지** 검사한다.
- imported rule/data/skill의 provenance와 license를 한 ledger에 유지한다.

그러나 현재 [본체 라이선스](https://github.com/modu-ai/cowork-plugins/blob/6311343fe766379d7e7f2e1571211556b760db31/LICENSE)는 비상업·변경금지 NC-ND다. 또한 이 저장소가 강제하는 top-level `version` 같은 frontmatter 정책은 Agent Skills 표준이 아니라 해당 catalog의 정책이다.

**권고:** validator의 아이디어만 독립 구현하고 현재 skill 본문은 복제·개작하지 않는다. 표준과 충돌하는 frontmatter 정책도 따라 하지 않는다.

---

## 6. 사주·역법 엔진 사례가 주는 테스트 교훈

### 6.1 API가 넓은 것과 계층이 좋은 것은 다르다

[`lunar-javascript`](https://github.com/6tail/lunar-javascript/tree/4c45a59f79b856125516f31aefa8295035c16afd)는 의존성 없이 양력·중국 음력, 절기, 팔자, 오행, 십신, 대운뿐 아니라 길흉·금기 데이터까지 한 API에 제공한다. [`EightChar.test.js`](https://github.com/6tail/lunar-javascript/blob/4c45a59f79b856125516f31aefa8295035c16afd/__tests__/EightChar.test.js), [`JieQi.test.js`](https://github.com/6tail/lunar-javascript/blob/4c45a59f79b856125516f31aefa8295035c16afd/__tests__/JieQi.test.js), [`Yun.test.js`](https://github.com/6tail/lunar-javascript/blob/4c45a59f79b856125516f31aefa8295035c16afd/__tests__/Yun.test.js)에 concrete fixture가 많고, [CHANGELOG](https://github.com/6tail/lunar-javascript/blob/4c45a59f79b856125516f31aefa8295035c16afd/CHANGELOG.md)는 절기 당일, 윤달 이후 간지, 극단 팔자 역변환 같은 경계 오류를 기록한다.

**권고:** 이 프로젝트는 oracle/교차 fixture로 활용할 수 있지만 제품 구조를 따라가지는 않는다. 오 마이 사주의 장점은 달력·원국 사실과 학파 규칙·길흉 해석을 섞지 않는 데 있다.

### 6.2 역법 데이터가 맞아도 사주 의미 매핑은 틀릴 수 있다

KASI의 음력 월 정보는 음양력 변환의 원 데이터이지 절입 기준 사주 월주가 아니다.
따라서 “권위 있는 원 데이터”와 “사주 규칙에 맞는 파생 의미”는 별도 검증 대상이다.

**권고:** 오 마이 사주의 plugin test가 최종 prose만 snapshot해서는 안 된다. 다음 층을 따로 검증한다.

1. 원 입력 정규화와 역법 사실
2. 입춘·12절·자시·진태양시·DST gap/fold 경계
3. Tradition Pack의 source/rule/table/helper/fixture hash
4. Agent Skill이 JSON 사실을 변형하지 않는지
5. Reading/Application runtime이 Pack 격리와 허용된 finding ID를 검증하는지

---

## 7. 권장 제품 구조

### 7.1 의존 방향

아래 방향만 허용한다. `D`는 dependency tier이며 기존 도메인의 `L0–L4` evidence
level과 다른 표기다.

| tier | 책임                                                         | 아래 tier를 호출     | 위 tier를 알아도 되는가           |
| ---- | ------------------------------------------------------------ | -------------------- | --------------------------------- |
| D0   | tzdb, 천문, 한국 음력, 독립 fixture                          | 없음                 | 아니오                            |
| D1   | `saju-engine`: 원국, 불확실 후보, 구조, timing 계산 사실     | D0                   | 아니오                            |
| D2   | Tradition Packs: source/rule/table/helper/fixture/provenance | D1 public interface  | 아니오                            |
| D3   | Pack runtime: 평가와 미해결 비교                             | D1·D2                | 아니오                            |
| D4   | Reading/Application: narration, claim gate, JSON command     | D1·D3                | 아니오                            |
| D5   | Agent Skill: 입력 인터뷰, workflow, 결과 제시                | D4 command interface | 아니오                            |
| D6   | host 설치·discovery·UI와 선택적 transport adapter            | D5 또는 D4           | transport 외 규칙을 소유하지 않음 |

현재 `src/**`는 D0~D1 계산 코어의 정본이고 `plugins/oh-my-saju`가 D2~D6을 소유한다.
Pack과 runtime은 core private source를 import하지 않고 package public interface만
호출해야 self-contained artifact에서도 같은 행동을 한다.

### 7.2 정본과 생성물

후속 구현에서는 `plugins/oh-my-saju`를 self-contained plugin root로 선택했다. v0.2의
conceptual tree는 다음과 같으며 “skill source는 하나”라는 원칙이 중요하다.

```text
/
├── src/                                  # saju-engine 계산 코어 정본
├── plugins/oh-my-saju/                   # self-contained 배포 정본
│   ├── plugin.json                       # Agent Plugins 1.0
│   ├── .claude-plugin/plugin.json        # Claude thin adapter
│   ├── .codex-plugin/plugin.json         # Codex thin adapter
│   ├── tradition-packs/
│   │   ├── calculation-baseline/
│   │   ├── ziping/
│   │   ├── ditianshui/
│   │   └── qiongtong/
│   ├── runtime/
│   │   ├── traditions/                   # Pack adapter·평가·비교
│   │   ├── reading/                      # narration task·claim gate
│   │   └── application/                  # prepare/validate interface
│   └── skills/oh-my-saju/
│       ├── SKILL.md                      # 단일 portable workflow
│       ├── scripts/oh-my-saju.mjs        # bundled application runtime
│       └── references/
├── .claude-plugin/marketplace.json
├── .agents/plugins/
│   └── marketplace.json                  # repo/team Codex marketplace
├── tools/
│   ├── build-agent-plugin.mjs
│   └── verify-agent-plugin.mjs
├── release/versions.json                 # engine/plugin/Pack 버전 정본
└── docs/
    ├── ARCHITECTURE.md
    ├── adr/
    └── research/
```

기존 최상위 `skills/interpret-korean-saju`는 이번 변환 이전의 사용자 소유 artifact라
수정하거나 플러그인 정본으로 연결하지 않는다. symlink가 Git archive·Windows·
marketplace packer에서 보존된다고 가정하지 않으며, host별 `SKILL.md` 복사본을 두지
않는다.

Tradition Pack은 단순 manifest나 데이터 폴더가 아니다. source, rule, table, helper,
fixture, provenance를 함께 검증하는 수직 module이다. `runtime/traditions`는 Pack
interface를 실행하는 adapter이고, `SKILL.md`는 그 adapter의 규칙을 복제하지 않는다.

### 7.3 공개 skill 경계

v0.2의 `oh-my-saju` 한 Agent Skill은 아래 네 사용자 의도를 workflow mode로
구분한다. 각각의 trigger와 instruction이 실제 eval에서 충돌할 때만 별도 skill로
분리한다.

| workflow mode   | 사용자 의도                                    | application 동작                  | 해석 범위                         |
| --------------- | ---------------------------------------------- | --------------------------------- | --------------------------------- |
| calculate       | “명식만 계산”, 개발·감사·JSON 결과             | core 원국/불확실 후보 계산        | 해석하지 않음                     |
| interpret       | 기본 종합 풀이, 선택·성격·직업 질문            | core + Tradition Pack 평가        | Pack 근거형 reading               |
| compare-schools | 학파별 결론과 충돌을 나란히 비교               | 같은 원국으로 Pack별 독립 평가    | 평탄화·평균·투표·승자 선정 금지   |
| audit-reading   | 외부 풀이 또는 생성 결과의 계산·근거·과신 감사 | 원 요청 재계산 + claim validation | 오류·근거 누락·불확실성 위반 판정 |

이 경계는 “한 번의 실제 사용자 작업” 단위다. `오행만`, `십신만`, `신살만` 같은 지나치게 작은 skill을 양산하지 않는다. 세부 지식은 각 skill의 reference가 된다.

`oh-my-saju`는 기본 end-to-end 진입점을 유지한다. 사용자가 “사주 봐줘”라고 했을 때
`calculate`와 `interpret`를 연속으로 수동 선택하게 만들지 않는다.

### 7.4 표준 frontmatter

portable skill은 아래 정도가 적당하다.

```yaml
---
name: oh-my-saju
description: Calculate and interpret Korean Saju with an audited local runtime, explicit birth-time uncertainty, versioned Tradition Packs, and finding-referenced narration. Use for 사주, 만세력, school comparison, timing facts, or reading audits.
license: Apache-2.0
---
```

원칙:

- `version`을 top-level에 두지 않는다.
- portable 정본에는 별도 skill version metadata를 두지 않고 plugin release로 추적한다.
- `allowed-tools`는 portable 정본에서 생략한다.
- description에는 “무엇/언제”와 주요 한국어 intent를 포함하되 다른 skill과 겹치는 문구를 줄인다.
- compatibility 요구사항은 본문에 명시한다. 공개 사양은 frontmatter 필드를 허용하지만
  현재 OpenAI validator와 교집합을 유지하기 위해 v0.2 정본에서는 생략한다.
- host UI의 display name, icon, starter prompt는 plugin manifest 또는 host metadata에 둔다.

---

## 8. 이름과 브랜드

권장 이름 체계는 다음과 같다.

| 표면                   | 권장 이름          | 이유                                                      |
| ---------------------- | ------------------ | --------------------------------------------------------- |
| 한국어 제품명          | **오 마이 사주**   | 기억하기 쉽고 친근한 public brand                         |
| 영문 display           | **Oh My Saju**     | README·marketplace의 병기                                 |
| plugin/repo machine ID | `oh-my-saju`       | Agent Skills/Codex의 kebab-case 제약 충족                 |
| npm 계산 코어          | `saju-engine` 유지 | 기존 API 신뢰·검색어·semver 연속성 유지                   |
| Agent Skill ID         | `oh-my-saju`       | v0.2는 한 end-to-end 계약; 필요가 입증되면 vertical split |

제품 tagline 예:

> 오 마이 사주 — 계산 근거와 해석의 층이 보이는 한국 사주 도구
>
> Oh My Saju — Auditable Korean Four Pillars for any agent

조사 시점의 일반 웹·GitHub·npm 검색에서는 exact `oh-my-saju`가 뚜렷한 기존 공개 패키지로 노출되지 않았지만, 이것은 이름 사용 가능성이나 상표 clearance가 아니다. 공개 전 GitHub repository, npm, 주요 도메인·소셜 handle, KIPRIS 상표를 별도로 확인한다.

---

## 9. Cross-agent 동작 계약

“어떤 에이전트에 물려도 동작”은 모든 호스트 기능을 공통분모로 낮춘다는 뜻이 아니라, **baseline과 enhancement를 명시적으로 나눈다**는 뜻이다.

### Portable baseline

- `SKILL.md`, relative references, assets, self-contained JavaScript CLI
- Node.js 18+
- file read와 shell execution
- 네트워크 없이 원국·Tradition Pack 평가
- 한 명의 agent로 순차 실행 가능
- JSON stdout 또는 명시한 output file
- 생시 미상, 음력 윤달, timezone ambiguity를 질문하거나 structured error로 반환
- 특정 Claude/Codex tool name이나 subagent를 요구하지 않음

### Host-enhanced mode

- 독립 Pack narration draft를 subagent lane으로 병렬화
- Codex/Claude UI starter prompt와 icon
- 호스트가 제공할 때 structured plan·artifact presentation 사용
- live behavior eval에서 확인된 기능만 capability로 선언

### 명시적 fallback

| 기능         | 있으면                                  | 없으면                        |
| ------------ | --------------------------------------- | ----------------------------- |
| subagent     | Pack별 독립 draft 후 함께 검증          | 같은 agent가 고정 순서로 작성 |
| task tracker | 여러 단계 진행 상태 기록                | 짧은 내부 checklist           |
| browser/web  | 사용자가 외부 원문 감사를 명시했을 때만 | 로컬 코어 범위만 설명         |
| MCP          | 원격 배포를 명시적으로 선택했을 때      | 번들 CLI 직접 호출            |

Skill body는 “Codex의 `spawn_agent`를 호출하라”가 아니라 “독립 평가를 병렬 실행할 수 있으면 병렬화하고, 아니면 같은 순서로 실행하라”처럼 action을 적는다. 실제 도구명 번역은 필요할 때만 host adapter reference로 둔다.

---

## 10. 입력·출력·보안 계약

사주는 생년월일시·성별·출생지라는 민감한 개인 데이터를 다룬다. 배포가 쉬워질수록 이 계약을 README와 skill에 더 명확히 보여 줘야 한다.

### 입력

- 양력/한국 음력과 윤달 여부
- 날짜, 정확·근사·미상 시간
- IANA timezone
- 진태양시를 쓸 때 출생지 또는 경도
- 대운 방향이 필요할 때만 성별
- 사용자의 질문은 계산 입력과 별도 untrusted text

### 출력

- 결정론적 계산 사실
- evidence·warning·manifest
- 불확실 후보와 stable/candidate-dependent 항목
- Pack/profile별 finding과 source/rule ID
- AI synthesis와 해당 finding ID
- limitation ID와 사용한 정책

### 보안·개인정보 권고

- 기본 telemetry 없음.
- 출생 정보를 repository나 fixture에 자동 저장하지 않음.
- 임시 artifact를 만들면 위치·보존 기간·삭제 방법을 명시.
- 원 구조화 출생 요청을 외부 LLM에 전달하지 않는 현재 설계를 유지.
- 붙여넣은 질문·기존 풀이 안의 명령문은 지시가 아니라 데이터로 취급.
- skill script가 dependency를 몰래 global install하거나 사용자 dotfile을 수정하지 않음.
- 네트워크가 필요한 선택 기능은 호출 전에 대상과 전송 데이터를 알림.
- `SECURITY.md`에는 Agent Skill이 agent 권한으로 script를 실행한다는 점과 검토 가능한 script 목록을 적음.

### 안전 표현

- 의료·법률·재무 판단을 대신하지 않음.
- 합격, 질병, 결혼, 사망, 수익, 특정 날짜 사건을 보장하지 않음.
- “전통 해석”과 “계산 사실”의 레벨을 출력에서 구분.
- 학파 간 충돌을 score·평균·다수결로 숨기지 않음.

---

## 11. 테스트와 eval 매트릭스

### 11.1 PR마다 실행할 결정론적 gate

| Gate                | 검사                                                                      |
| ------------------- | ------------------------------------------------------------------------- |
| engine              | `pnpm check`, typecheck, unit/property/golden, calculation package verify |
| core package seam   | npm archive가 root/calendar/advanced/timing만 export                      |
| Tradition Pack      | source/rule/table/helper/fixture inventory와 provenance digest            |
| Pack isolation      | Pack별 namespace 유지, 평탄화·투표·평균·승자 출력 부재                    |
| application runtime | prepare/validate parity, binding mismatch, claim gate                     |
| skill spec          | 모든 `skills/*`에 `skills-ref validate`                                   |
| skill links         | `SKILL.md`의 모든 relative reference와 script 존재                        |
| script smoke        | CLI `--help`, 대표 solar/lunar/unknown-time JSON                          |
| host manifest       | Claude validator와 현재 Codex `validate_plugin.py` 각각                   |
| marketplace         | entry name/path/policy와 plugin manifest 일치                             |
| install local       | 임시 repo에서 Claude·Codex·universal target으로 `--copy` 설치             |
| install contents    | 설치된 skill에서 runtime·Pack·reference가 모두 실행·조회 가능             |
| generated drift     | bundled runtime과 adapter를 재생성해 diff가 없어야 함                     |
| versions            | engine/plugin/Pack version 정본과 모든 생성 지점 일치                     |
| licenses            | 각 archive에 해당 LICENSE·NOTICE·provenance ledger 포함                   |

### 11.2 도메인 경계 fixture

- 입춘 순간 직전/정확히/직후
- 12절 진입 순간 직전/정확히/직후
- DST gap과 fold, `earlier`/`later`
- 자시 정책 전후
- 민간시와 지방 진태양시가 시주 경계를 넘는 경우
- 한국 음력 평달/윤달 왕복
- 지원 범위 첫날·마지막 날
- 태어난 시간 unknown, am/pm, approximate, range
- 절입 계산 오차 구간에서 양쪽 epistemic 후보
- 같은 명식이 Tradition Pack별로 다른 finding을 내는 fixture
- Pack 순서가 바뀌어도 finding이 평탄화되거나 winner가 생기지 않는 fixture
- future ontology adapter의 mapping version·unmapped·semantic-mismatch fixture
- AI가 존재하지 않는 finding ID를 인용하거나 candidate finding을 확정 표현하는 경우

### 11.3 Trigger eval

각 query를 깨끗한 세션에서 여러 번 실행한다.

Should trigger:

- “1997년 4월 21일 12시 18분 서울 출생 사주를 근거까지 보여줘”
- “태어난 시간은 모르는데 가능한 명식 차이를 보고 싶어”
- “이 만세력의 월주가 맞는지 검증해줘”
- “자평과 궁통보감 해석이 왜 다른지 나란히 보여줘”
- “이 사주 풀이가 바넘 효과나 근거 없는 단정인지 감사해줘”

Should not trigger:

- “서양 별자리 궁합 봐줘”
- “타로 세 장 뽑아줘”
- “Korean lunar calendar npm package 추천해줘”
- “사주라는 단어가 들어간 이 문장을 맞춤법 교정해줘”
- “내 진로를 일반적인 장단점만으로 비교해줘”처럼 사주 계산을 원하지 않는 요청

### 11.4 Behavior eval

Skill 사용/미사용 baseline을 비교하고 다음 assertion을 둔다.

- 계산 표의 네 기둥이 CLI JSON과 정확히 같다.
- 시간 미상에 시주를 만들지 않는다.
- 원국 fact, Pack finding, 모델 추론을 구분한다.
- 외부 인터넷 만세력을 로컬 정본보다 우선하지 않는다.
- Pack의 용신 정의를 하나로 합치거나 투표하지 않는다.
- 선택 질문에서 차트 근거와 현실 조건을 분리한다.
- 제공하지 않은 생애 정보를 명식 정확성의 증거로 사용하지 않는다.
- unsupported certainty와 위해한 단정이 없다.
- 각 주요 해설이 허용된 finding ID로 추적된다.
- 원 질문과 무관한 장문 방법론을 출력하지 않는다.

### 11.5 Host matrix

| 주기           | 환경                                                | 목적                        |
| -------------- | --------------------------------------------------- | --------------------------- |
| PR             | 표준 validator + 로컬 install                       | 구조·배포 회귀              |
| PR fast subset | Claude Code 1회, Codex 1회                          | 핵심 trigger와 script 실행  |
| Nightly        | Claude, Codex, `.agents/skills` 호환 제3 클라이언트 | 실제 행동·도구 차이         |
| Release        | 깨끗한 VM/컨테이너에서 Git 설치부터 end-to-end      | README 명령이 실제로 맞는지 |

실모델 eval은 느리고 비결정적이므로 engine unit test를 대신하지 않는다. PR에는 작고 안정적인 subset, nightly에는 여러 반복과 transcript 보존을 둔다.

---

## 12. 버전과 릴리스

엔진과 배포 plugin은 변경 이유가 다르다.

- `saju-engine` version: 계산 interface·schema·data의 SemVer
- Tradition Pack version: Pack의 source/rule/table/helper/finding 계약 SemVer
- `oh-my-saju` plugin version: Pack/runtime·skill workflow·host metadata·배포 package SemVer
- Agent Skill workflow version: plugin release로 추적하고 필요한 host 표시값은
  `agents/openai.yaml` 같은 sidecar에 둠; portable `SKILL.md`에는 version을 두지 않음

한 숫자로 전부 묶으면 단순하지만, README 문구 하나 때문에 계산 엔진 major/minor를 올리는 문제가 생긴다. 반대로 숫자를 여러 곳에서 손으로 관리하면 `im-not-ai` 사례처럼 drift가 생긴다.

**권고:** `release/versions.json` 같은 한 기계 판독 파일에 다음을 둔다.

```json
{
  "engine": "0.9.0",
  "plugin": "0.3.0",
  "traditionPacks": {
    "calculation-baseline": "1.1.0",
    "ziping": "1.0.0",
    "ditianshui": "1.0.0",
    "qiongtong": "1.0.0",
    "sanming-symbolic-curated": "1.0.0"
  }
}
```

generator가 Pack manifest, Claude/Codex plugin manifest, release artifact metadata,
필요한 `agents/openai.yaml` 표시값을 갱신한다. portable `SKILL.md` frontmatter에는
version을 생성하지 않는다. CI는 generator `--check`로 수동 편집·누락을 막는다. npm
`package.json` version과 계산 전용 `ENGINE_MANIFEST` 일치는 기존 검사를 계속 사용한다.

권장 release 순서:

1. version 정본 변경
2. manifest·adapter 생성
3. engine/Pack/runtime/skill/host/install/eval gate
4. README 설치 명령을 clean environment에서 재실행
5. npm pack과 plugin archive allowlist 검증
6. 문서·NOTICE·asset까지 main에 반영
7. engine과 plugin tag를 명확히 구분해 tag/release
8. npm publish
9. Claude/Codex marketplace 제출 또는 self-host marketplace 갱신

공개 tag는 release note보다 먼저 찍지 않는다. 출시 archive가 정확한 정본이다.

---

## 13. 문서 구조와 공개 Git 배포

### README 상단에서 바로 보여 줄 것

1. 한 줄 가치: 감사 가능한 한국 사주 계산·해석을 어떤 agent에서도 사용
2. 30초 예시와 실제 출력의 작은 일부
3. 설치 matrix
4. “왜 다른가”: 시간 미상 집합, 경계 계산, Tradition Pack, finding ID
5. 개인정보·한계
6. architecture 링크

### 목표 설치 matrix

명령은 구현 후 release smoke가 확인한 것만 README에 넣는다.

| 사용자                         | 기본 배포 경로                                           |
| ------------------------------ | -------------------------------------------------------- |
| 어느 Agent Skills 클라이언트든 | GitHub repo에서 `npx skills add`                         |
| Claude Code                    | repository marketplace add → `oh-my-saju` plugin install |
| Codex App/CLI                  | Codex marketplace 또는 plugin install UI                 |
| TypeScript/JavaScript 개발자   | npm의 `saju-engine`                                      |
| 검토만 원하는 기여자           | Git clone 후 bundled CLI                                 |

### 권장 문서

- `README.md`: 한국어 기본, 위에 English link
- `README_EN.md`: 영문 설치·설계·용어
- `docs/ARCHITECTURE.md`: evidence level과 구분한 D0–D6 dependency graph
- `docs/INSTALL.md`: host별 exact 명령과 제거·업데이트
- `docs/SKILL-CATALOG.md`: 각 skill의 입력, 출력, trigger, dependency
- `docs/PORTABILITY.md`: baseline, enhanced capability, fallback
- `docs/PRIVACY.md`: 데이터 흐름과 외부 provider 전송 여부
- `docs/SECURITY.md`: script 권한, prompt injection, vulnerability report
- `docs/PROVENANCE.md` 또는 `NOTICE.md`: core data와 Pack별 rule·table·reference provenance
- `docs/RELEASING.md`: version 정본, 생성, 검증, tag 순서
- `CONTRIBUTING.md`: 새 Tradition Pack과 새 Agent Skill을 추가하는 절차를 분리

README는 “Claude용”, “Codex용”, “npm용” 세 개의 다른 제품처럼 설명하지 않는다.
하나의 계산 코어와 plugin-owned Pack/runtime/Skill이 여러 설치 표면을 갖는다고
설명한다.

---

## 14. 라이선스와 provenance

현재 프로젝트는 자체 구현을 Apache-2.0으로 배포하고, MIT 런타임 의존성과 검증
fixture 수집기의 제3자 고지는 별도로 보존한다. 다만 참조한 저장소가 공개라고 해서
모두 복제 가능한 것은 아니다.

### 조사에서 확인한 구분

- Agent Skills reference code: Apache-2.0, docs: CC BY 4.0
- Anthropic skill: skill별 라이선스. document skill 일부 source-available
- OpenAI plugin: plugin별 라이선스. 같은 저장소 안에 MIT·proprietary·vendor terms가 공존
- `im-not-ai`, `korean-skills`, `vercel-labs/skills`, `superpowers`, `k-skill`, `lunar-javascript`: 조사 snapshot의 본체 MIT
- `modu-ai/cowork-plugins`: 현재 본체 NC-ND, 과거 release의 MIT와 혼동 금지

### 권고

- pattern을 독립 구현한 것과 code/text를 복제한 것을 NOTICE에서 구분한다.
- 실제로 가져온 파일은 원 저장소, commit/tag, 파일 경로, license, 수정 여부를 기록한다.
- MIT 코드라도 copyright notice와 license text를 archive에 보존한다.
- Apache-2.0 코드를 가져오면 NOTICE·변경 고지·특허 조항까지 확인한다.
- CC BY 문서를 번역·개작하면 attribution과 수정 표시를 한다.
- source-available·NC-ND·proprietary skill 본문은 참고만 하고 복제하지 않는다.
- 역법 표·천문 자료·문헌 rule table은 코드 license와 별도의 데이터·저작권 provenance 항목으로 관리한다.
- 자동 생성물에도 원천 digest와 generator version을 기록한다.

이 문서는 법률 의견이 아니다. 공개 release 전 실제 포함 파일과 데이터셋 단위로 최종 license review가 필요하다.

---

## 15. 단계별 전환안

### Phase 0 — 용어와 정본 고정

- public brand `오 마이 사주 / Oh My Saju`, machine ID `oh-my-saju` 확정
- 계산 코어, Tradition Pack, Agent Skill 용어 구분
- `saju-engine` 0.8.0을 결정론적 계산 interface로 제한
- source/rule/table/helper/fixture/provenance를 Pack별로 수직 이동
- `plugins/oh-my-saju/skills/oh-my-saju`를 canonical skill source로 선언
- engine/plugin/Pack version 정본 도입; Agent Skill workflow는 plugin release로 추적
- 어떤 파일이 source이고 어떤 파일이 generated인지 문서화

완료 조건: core package에 해석·AI·agent public subpath가 없고, Pack 지식과 skill body를
각각 한 곳에서 관리한다.

### Phase 1 — Portable Agent Skill suite

- 단일 `oh-my-saju`가 calculate·interpret·compare-schools·audit-reading intent를 처리
- plugin runtime이 Pack을 독립 평가하고 비교 결과를 평탄화·투표하지 않음
- bundled runtime에 prepare→host draft→validate 계약 추가
- 모든 script가 설치된 skill 디렉터리 밖의 저장소나 `node_modules` 없이 실행
- trigger positive/negative set와 behavior fixture 작성
- `skills-ref validate`와 local `npx skills add --copy` smoke

완료 조건: Claude/Codex plugin 없이도 표준 skill installer로 end-to-end 동작한다.

### Phase 2 — Claude와 Codex thin adapter

- Claude plugin/marketplace manifest
- Codex `.codex-plugin/plugin.json`과 repo marketplace
- 실제 icon, description, privacy·terms URL, starter prompt
- host별 archive/install/uninstall/update smoke
- clean Claude/Codex session transcript

완료 조건: 두 host 모두 같은 계산 JSON과 핵심 해석 assertion을 만족한다.

### Phase 3 — 공개 release

- 한국어/영문 README, architecture, privacy, security, provenance
- npm package + plugin archive 동시 검증
- GitHub release
- self-host marketplace 설치 경로 공개
- 필요하면 Anthropic/OpenAI 공식 catalog에 별도 제출

완료 조건: 새 사용자가 README만으로 설치·실행·제거할 수 있다.

### Phase 4 — 실제 수요가 생긴 뒤의 확장

- remote API 또는 MCP transport
- 웹/앱 UI
- 추가 Tradition Pack
- 두 개 이상의 실제 mapping 필요가 생겼을 때 versioned ontology adapter
- router skill
- 더 많은 agent harness adapter

이 단계는 초기 Git 배포의 선행 조건이 아니다.

---

## 16. 피해야 할 구조

1. Claude용 `SKILL.md`와 Codex용 `SKILL.md`를 각각 수동 편집
2. host manifest나 `SKILL.md` 안에 사주 계산 규칙·학파 표를 재작성
3. Tradition Pack이 core private `src/**`를 직접 import하는 구조
4. 외부 Agent Skill이 같은 Pack rule ID를 덮어쓰거나 여러 Pack finding을 섞는 구조
5. 시간 미상에 임의 정오를 넣고 자연어 disclaimer만 붙이는 구조
6. “어떤 agent든”을 이유로 모든 도구를 prompt-only 계산으로 낮추는 구조
7. local CLI면 충분한데 MCP와 auth를 먼저 추가
8. 일반 도메인 skill에 항상 켜지는 session bootstrap/hook 추가
9. Agent Skills 표준에 없는 top-level `version`을 portable 정본에 사용
10. README에 검증하지 않은 설치 명령이나 marketplace publication을 기재
11. repository가 공개라는 이유로 하위 skill·data의 license를 한꺼번에 MIT로 간주
12. 결과 prose snapshot만 있고 역법·경계·Pack provenance·finding ID test가 없는 구조
13. 사용자 home 설정과 global dependency를 installer가 조용히 변경
14. Pack 충돌을 “종합 점수”로 평탄화·투표·평균해 계층과 근거를 숨김
15. 실제 mapping 수요 전에 하나의 보편 ontology를 계산 코어에 강제

---

## 최종 설계 판단

오 마이 사주의 공개 구조는 아래 문장으로 설명할 수 있어야 한다.

> `saju-engine`은 계산 사실만 만들고, plugin의 Tradition Pack은 판본화된 학파 근거를
> 만든다. Reading/Application runtime은 이를 검증된 command로 조립하고, 표준 Agent
> Skill과 Claude Code·Codex adapter는 같은 workflow를 설치한다.

이 구조라면 현재 설계 관점—결정론적 계산, 불확실성의 명시, Pack 간 비합성, AI의 근거
제한—을 잃지 않으면서 GitHub에서 설치 가능한 제품으로 확장할 수 있다. plugin은 단순한
host 외피가 아니라 Pack과 runtime의 올바른 소유 위치이지만, host prompt나 manifest가
domain 규칙을 소유해서는 안 된다. **중심은 작은 계산 interface, 수직 Pack의 locality,
검증된 runtime seam, 공유 Agent Skill workflow의 위계**여야 한다.

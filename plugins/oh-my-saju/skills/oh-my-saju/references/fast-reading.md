# 일반 사주 풀이의 빠른 경로

보통의 사주·연애·이직·대운 질문은 이 경로를 쓴다. 한 번의 `analyze-reading` 계산으로
완전한 분석 결과와 해석 지침을 받고, 그 결과를 바탕으로 바로 한국어 답변을 작성한다.
`prepare-reading`, `validate-reading`, `preparedDigest`, Pack별 초안, `presentationDraft`는
사용자가 감사·재현성 검증·코드 통합을 명시적으로 요청할 때만 사용한다.

## 입력

한국어로 날짜만 주면 양력·`Asia/Seoul` 민간시를 기본으로 한다. 생시를 모르면 noon으로
채우지 말고 `time: { "kind": "unknown" }`을 쓴다. 음력, 해외 출생, 다른 시간대, 자시 경계,
진태양시를 사용자가 언급한 경우에만 [input-and-runtime.md](input-and-runtime.md)의 해당 입력을
확인한다.

정확한 생시의 기본 명령은 다음과 같다.

```json
{
  "command": "analyze-reading",
  "request": {
    "calculation": {
      "kind": "exact",
      "request": {
        "birth": {
          "date": { "calendar": "gregorian", "year": 1997, "month": 4, "day": 21 },
          "time": { "hour": 12, "minute": 18 },
          "timeZone": "Asia/Seoul"
        }
      }
    },
    "question": "성격, 일, 관계와 앞으로의 흐름을 자세히 풀어줘.",
    "inferenceDepth": "deep-traditional"
  }
}
```

대운·세운을 함께 볼 때만 최상위 `timing`에 `fromYear`, `throughYear`, `gender`를 넣는다.
정확한 생시가 있다면 최대 60 사주년을 요청할 수 있다.

## 응답 작성

1. `result.analysis`의 계산 사실과 Pack finding만 근거로 쓴다. Pack별 초안을 다시 만들거나
   finding ID를 사용자에게 나열하지 않는다.
2. `result.task.readingPolicy`의 기본 심층 모드를 따라 0–7 순서로 교차 확인한다. 출력에서는
   번호를 기계적으로 복제하지 말고, 성격·일·관계·시기 안에 판단 순서를 녹인다.
3. `result.task.instructions`와 `result.task.writing`은 사용자용 답변을 쓰기 위한 필수 지침이다.
   [fluent-korean-output-pass.md](fluent-korean-output-pass.md)를 모두 적용한 뒤 답한다.
4. 기본 출력은 핵심 구조, 계절·월령, 강점과 압박, 일과 제안, 관계, 대운·가까운 시기의
   순서로 묶는다. 길이는 질문에 맞추되 같은 설명을 여러 제목에 되풀이하지 않는다.
5. 계산 사실, 전통적인 판정, 생활 장면으로 옮긴 해석을 한 문장 안에서 구분한다. 생시가
   불확실하면 그 결론에만 조건을 붙인다.

이 경로는 검증 JSON을 작성하지 않는다. 초안 문장을 새로 지어 검증하는 대신, 계산 결과 안에
이미 있는 근거를 직접 읽어 답하는 빠른 사용자용 경로다.

## 엄격 검증 경로로 전환할 때

사용자가 Pack별 출처, finding ID, 초안의 재현성, 기존 풀이 감사, API 통합, 또는 결정론적
Markdown 렌더링을 요청할 때만 `prepare-reading` → `validate-reading`을 쓴다. 그때만
[architecture-and-contract.md](architecture-and-contract.md)와
[input-and-runtime.md](input-and-runtime.md)의 엄격 프로토콜을 읽고 따른다.

# 초기 진단 테스트

> 담당: 전예랑 · 상태: **초안** (문항·해설은 AI가 만든 초안이라 팀 검수 필요)
>
> 레벨 0 사용자가 처음 푸는 15문항 진단. 결과로 **영역별 점수·등급, "~형", 더 키울 능력, 추천 시작 단계, 틀린 문제 해설**을 보여준다.

---

## 1. 파일 위치

| 무엇 | 어디 |
|---|---|
| 문항·채점 기준 (엑셀 원본) | [`tools/source/초기진단_문항_ver2.xlsx`](../tools/source/) |
| 엑셀 → JSON 변환 | [`tools/convert-diagnostic.mjs`](../tools/convert-diagnostic.mjs) |
| 변환된 JSON (앱이 읽음) | [`app/src/content/diagnostic.json`](../app/src/content/diagnostic.json) |
| JSON 읽기 | [`app/src/content/diagnostic.js`](../app/src/content/diagnostic.js) — `getDiagnostic()`, `getPassage(id)` |
| 채점 | [`app/src/logic/diagnostic.js`](../app/src/logic/diagnostic.js) — `scoreDiagnostic`, `toSkills`, `buildDiagnosisRecord` |
| 채점 테스트 | [`app/src/logic/diagnostic.test.js`](../app/src/logic/diagnostic.test.js) — `cd app && npm test` |
| 화면 | [`app/src/pages/DiagnosisPage.jsx`](../app/src/pages/DiagnosisPage.jsx) (`/diagnosis`) |
| 결과 화면 | `components/result/DiagnosisResult.jsx` + `DiagnosisSummary.jsx` + `DiagnosisReview.jsx` |
| 저장 | [`app/src/services/diagnosisService.js`](../app/src/services/diagnosisService.js) |

**엑셀을 고쳤을 때**: 프로젝트 맨 위 폴더에서 `node tools/convert-diagnostic.mjs tools/source/초기진단_문항_ver2.xlsx` (엑셀 읽기용 `exceljs`는 `tools/`에서 쓰는 것과 같다). 정답 번호·오답 태그 누락·배점이 맞지 않으면 알려주고 멈춘다. 채점 코드는 고칠 필요 없다. 배점·커트라인·형 이름·동점 순서가 모두 JSON에 들어 있기 때문이다.

---

## 2. 문항 구성

- 지문 5개(서시·동백꽃·속미인곡·운수 좋은 날·허생전), 문항 15개, 보기는 4개, 정답은 1~4.
- 영역: 어휘 4 · 내용 이해 4 · 추론 4 · 글쓰기 3. 글쓰기는 AI 없이 채점되는 객관식(조건에 맞는 문장 고르기)이다.
- 난이도 하 · 중 · 상. 허생전 4문항(`kind`가 "킬러")이 각 영역의 상 문항을 겸한다.
- 오답 보기마다 **오답 태그**(어떤 실수를 노린 보기인가)와 **왜 틀렸는지 해설**이 붙어 있다.

## 3. 점수

| | 하 | 중 | 상 | 영역 만점 |
|---|---|---|---|---|
| 어휘 · 내용 이해 · 추론 | 1 | 1 | 2 | 5 |
| 글쓰기 | 1 | 2 | 2 | 5 |

- 전체 20점. 영역 만점이 **모두 5점**이라 영역 %는 항상 0·20·40·60·80·100%.
- 영역 등급: 80% 이상 **잘해요** · 40~60% **보통** · 20% 이하 **연습 필요**.
- 앱 공통 능력치(`skills`)에는 `{ correct: 영역 획득 점수, total: 5 }`로 넣는다. 그래서 기존 `accuracy()`·레이더 차트·이야기 완독 리포트의 "처음 진단" 비교가 그대로 동작한다.

## 4. 형 · 더 키울 능력 · 시작 단계

**형** (위에서부터 먼저 맞는 것)
1. 전체 85% 이상이고 모든 영역 80% 이상 → 만능 문해력형
2. 모든 영역 40% 이하 → 새싹형
3. 최고 − 최저가 20%p 이하 → 균형형
4. 그 외에는 가장 높은 영역: 추론 → 눈치 탐정형 · 글쓰기 → 말솜씨 작가형 · 어휘 → 낱말 수집가형 · 내용 이해 → 꼼꼼한 정독형
   (최고 영역이 동점이면 **추론 > 글쓰기 > 어휘 > 내용 이해** 순)

**더 키울 능력**: 영역 %가 가장 낮은 영역. 동점이면 **어휘 → 내용 이해 → 추론 → 글쓰기** 순으로 먼저 추천(기초 → 응용). 모든 영역이 "잘해요"이면 "모두 잘해요! 도전 과제: ○○".

**추천 시작 단계(Lv.1~4)**: 하 → 중 → 상 난이도별로 정답 수가 기준(60%, 올림: 하 3/4 · 중 5/7 · 상 3/4)을 넘는지 보고, **처음 못 넘은 단계**에서 시작한다. Lv.1 어휘 · Lv.2 문장 · Lv.3 문단 · Lv.4 긴 글. 모두 넘으면 Lv.4.
> 사용자 `level`(경험치로 오르는 레벨)과는 별개다. 진단을 마치면 `level`은 1이 되고, 추천 시작 단계는 `diagnosis.startLevel`에만 저장한다.

## 5. 저장: `users/{uid}.diagnosis`

| 필드 | 타입 | 예시 | 설명 |
|---|---|---|---|
| `version` | number | `1` | 진단 JSON의 `schemaVersion` (문항이 바뀐 걸 구분) |
| `skills` | map | `{ vocab: { correct: 4, total: 5 }, ... }` | 영역별 획득 점수 / 만점. 결과 화면·완독 리포트 비교가 읽음 |
| `grades` | map | `{ vocab: "잘해요", inference: "연습 필요", ... }` | 영역별 등급 |
| `type` | map | `{ key: "area", name: "낱말 수집가형", bestSkill: "vocab" }` | 형. 만능·새싹·균형형이면 `bestSkill: null` |
| `weakestSkill` | string | `"inference"` | 더 키울 능력 |
| `startLevel` | number | `2` | 추천 시작 단계 (1~4) |
| `answers` | map | `{ "dx-01": { choice: 1, correct: false }, ... }` | 문항별 고른 답 (푼 문항만) |
| `errorTags` | map | `{ "반대로 이해": 2, ... }` | 오답 태그별 횟수 |
| `completedAt` | timestamp | | |

학습 기록 초기화 때 `diagnosis`를 통째로 지우는 기존 동작은 그대로다.

## 6. 팀 확인이 필요한 것

1. **문항·정답·해설 검수**: AI가 만든 초안이다. 낱말 뜻(예: ‘쌩이질’)은 표준국어대사전으로 확인.
2. **지문 출처**: 속미인곡 "현대어 풀이"와 허생전 본문은 번역본일 수 있어 번역자·출처 확인 필요 (엑셀 `지문` 시트 메모).
3. **난이도는 설계 값**: 몇 명에게 풀려 보고 정답률로 조정.
4. **형 이름·등급 문구·동점 순서**는 임시안.
5. JSON에 정답이 들어 있어 브라우저에서 볼 수 있다. 과제 범위에서는 허용하고, 필요하면 서버에서 채점하도록 옮긴다. (`logic/diagnostic.js`는 의존성이 없어 서버로 옮겨도 된다.)

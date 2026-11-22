# 학습 진행 저장 데이터 구조

> 담당: 김초은 · 작성: 2026-11-16 · 상태: **초안** (팀 확인 필요 항목은 맨 아래)
>
> 진행 상태 저장·복원, 학습 결과 화면, 출석 체크·누적 보상, 레벨업이 공통으로 쓰는 Firestore 데이터 구조입니다.

---

## 1. 설계 원칙

1. **ID는 콘텐츠 JSON 값을 그대로 쓴다.**
   진행 데이터에는 `episodeId`, `questionId` 같은 **ID만** 저장하고, 지문·선택지·해설 같은 내용은 복사하지 않는다. 화면에 보여줄 때는 ID로 콘텐츠 JSON에서 찾는다.
2. **자주 같이 읽는 것은 한 문서에, 계속 쌓이는 것은 하위 컬렉션에.**
   홈 화면은 `users/{uid}` 문서 하나만 읽으면 된다.
3. **날짜는 한국 시간 기준 `"YYYY-MM-DD"` 문자열.** (Day.js, `Asia/Seoul`)
4. **규칙 숫자(에너지, 경험치, 보상)는 코드 한 곳에 모은다.** → [`app/src/config/gameRules.js`](../app/src/config/gameRules.js)

---

## 2. 전체 구조

```
users/{uid}                      ← 요약 (프로필 + 레벨·에너지·이어하기·능력치·출석 요약)
 ├─ progress/{episodeId}         ← 에피소드별 진행·결과 (문서 ID = 콘텐츠 episodeId)
 └─ attendance/{YYYY-MM-DD}      ← 날짜별 출석 기록
```

---

## 3. `users/{uid}`: 요약 문서

로그인/회원가입 때 만든 문서에 아래 필드를 추가한다.

| 필드 | 타입 | 예시 | 용도 |
|---|---|---|---|
| `name`, `email`, `provider`, `needsNickname`, `createdAt`, `updatedAt` | | | 기존 (로그인/회원가입) |
| `level` | number | `2` | 0 = 진단 전, 진단 완료 시 1, 이후 경험치로 상승 |
| `exp` | number | `95` | **누적 총 경험치** (레벨은 이 값으로 계산) |
| `energy` | map | `{ current: 3, date: "2026-11-16" }` | 에너지 (4절 참고) |
| `current` | map \| null | `{ episodeId: "chunhyang-ep2", step: 2 }` | 이어하기. 진행 중인 에피소드가 없으면 `null` |
| `completedEpisodeIds` | array | `["chunhyang-ep1"]` | 한 번이라도 완료한 에피소드 → 다음 에피소드 잠금 해제 |
| `stats` | map | 아래 참고 | 누적 능력치 → 학습 결과의 "부족한 능력" |
| `attendance` | map | `{ lastDate: "2026-11-16", streak: 3, totalDays: 8 }` | 출석 요약 |
| `diagnosis` | map | `{ skills: { vocab: { correct, total }, ... }, type, grades, startLevel, answers, ..., completedAt }` | 초기 진단 결과 → 진단 결과 화면(형·영역별 등급·사각형 차트·정답률 막대·틀린 문제 해설). 진단 완료 시 `level: 1`. 필드 설명은 [`diagnosis.md`](./diagnosis.md) |

```js
stats: {
  vocab:         { correct: 4, total: 5 },   // 어휘
  comprehension: { correct: 3, total: 5 },   // 내용 이해
  inference:     { correct: 1, total: 5 },   // 추론
  writing:       { correct: 7, total: 15 }   // 글쓰기: 평가 기준 충족 개수 / 전체 기준 개수
}
```

- `stats`는 다시 풀기를 포함해 **풀 때마다 누적**된다.
- 문제 수는 정해두지 않는다. 유형별로 몇 문제든 센다.
- 부족한 능력 = `correct / total`(정답률)이 가장 낮은 유형. 계산: [`app/src/logic/result.js`](../app/src/logic/result.js)

---

## 4. `users/{uid}/progress/{episodeId}`: 에피소드 기록

문서 ID = 콘텐츠 JSON의 `episodeId`. **다시 풀면 덮어쓰고 `attempts` +1.**

| 필드 | 타입 | 예시 | 설명 |
|---|---|---|---|
| `storyId` | string | `"chunhyang"` | 콘텐츠 JSON의 storyId |
| `status` | string | `"in_progress"` / `"completed"` | |
| `step` | number | `2` | 에피소드 안에서 **다음에 할 단계 순서**(0부터). 순서는 콘텐츠 JSON이 정함 |
| `answers` | map | 아래 참고 | 키 = 콘텐츠 JSON의 `questionId` |
| `writing` | map \| null | 아래 참고 | 글쓰기 답안 + AI 피드백 |
| `result` | map \| null | `stats`와 같은 모양 | 마지막으로 완료한 회차의 결과 (다시 풀다 그만둬도 남김) → 이야기 완독 리포트 |
| `lastAnswers` | map \| null | `answers`와 같은 모양 | 마지막 완료 회차의 답 → 완독 리포트의 "틀린 문제 모아보기" |
| `stars`, `bestStars` | number | `2`, `3` | 이번·최고 별점 (정답률 80% 이상 ★★★, 60% 이상 ★★, 그 외 ★) |
| `expGained` | number | `35` | 이 회차에 얻은 경험치 |
| `attempts` | number | `1` | 시작한 횟수 |
| `startedAt`, `completedAt`, `updatedAt` | timestamp | | |

```js
answers: {
  "chunhyang-ep1-q1": { choice: 2, correct: true },   // choice: 1~4 (①=1)
  "chunhyang-ep1-q2": { choice: 1, correct: false }
}

writing: {
  text: "사용자가 쓴 글",
  feedback: {
    criteria: [true, true, false],   // 평가 기준 ①②③ 충족 여부
    good: "잘한 점",
    improve: "보완할 점",
    pending: false                   // 판단 보류 여부
  },
  submittedAt: timestamp
}
```

- 에피소드 흐름(엑셀 기준): `지문 → 어휘 → 내용 이해 → 추론 → 글쓰기`. 따라서 `step`은 0~4, 5가 되면 완료.
- **AI 피드백은 한 번 받으면 저장**해서 다시 열어도 AI를 또 호출하지 않는다. (비용 절약)

---

## 5. `users/{uid}/attendance/{YYYY-MM-DD}`: 날짜별 출석

| 필드 | 타입 | 예시 | 설명 |
|---|---|---|---|
| `completedEpisodeIds` | array | `["chunhyang-ep1"]` | 이날 완료한 에피소드. **이 문서가 있으면 그날 출석** |
| `reward` | map | `{ exp: 10, bonusExp: 0 }` | 이날 받은 출석 보상 |
| `streak`, `totalDays` | number | `3`, `8` | 출석 당시 연속·누적 일수 (기록용) |
| `createdAt` | timestamp | | |

앱에 접속하기만 해서는 문서가 생기지 않는다. **에피소드를 완료해야** 생긴다.

---

## 6. 게임 규칙

### 에너지
- 하루 **4개**, 최대 **4개**. 에피소드를 **시작할 때 1개** 차감. 0개면 시작할 수 없다.
- 이어하기는 차감하지 않는다.
- **매일 초기화**: 서버가 밤 12시에 바꾸는 방식이 아니다. 에너지를 읽을 때 `energy.date`가 오늘이 아니면 4개로 본다.
  ```
  energy.date == 오늘   → energy.current 그대로
  energy.date != 오늘   → 4개 (차감할 때 { current: 3, date: 오늘 }로 저장)
  ```

### 출석 (자동)
- 그날 **처음 에피소드를 완료하면 자동으로 출석**된다.
- 화면: `에피소드 마지막 → 학습 결과 화면 → (오늘 첫 완료면) "출석체크 완료!" 화면 → 에피소드 목록`
- `streak`: 마지막 출석이 어제면 +1, 아니면 1로 다시 시작
- `totalDays`: +1
- **보상은 경험치**

| | 보상 |
|---|---|
| 매일 출석 | **+10 XP** |
| 누적 5일마다 (5, 10, 15…일째) | **+20 XP** 추가 |

### 경험치
| 항목 | 경험치 |
|---|---|
| 에피소드 완료 | 10 |
| 객관식 정답 1개 | +5 (3문제, 최대 15) |
| 글쓰기 평가 기준 충족 1개 | +5 (3개, 최대 15) |
| 다시 풀기 | 위 합계의 **절반** (내림) |

### 레벨
- 0 → 1: **진단 테스트 완료**
- 1 이상: 누적 `exp`로 계산. 레벨 n → n+1에 필요한 경험치 = **40 + 20 × n**

| 레벨 | 다음까지 | 도달 누적 exp |
|---|---|---|
| 1 → 2 | 60 | 60 |
| 2 → 3 | 80 | 140 |
| 3 → 4 | 100 | 240 |
| 4 → 5 | 120 | 360 |

---

## 7. 언제 무엇을 저장하나

| 순간 | 저장 | 방식 |
|---|---|---|
| **에피소드 시작** (새로 · 처음부터 · 다시 풀기) | 에너지 −1, progress 초기화(`step: 0`, `attempts +1`), `current` 설정 | transaction |
| **이어하기** | 저장 없음, 에너지 안 씀. `current`와 progress의 `step`·`answers`·`writing`으로 멈춘 단계부터 복원 | |
| **이야기 넘기기** | `step +1` (progress와 `current` 함께) | batch |
| **객관식 답 제출** | `answers.{questionId}`, `step +1` | 1회 쓰기 |
| **글쓰기 제출** | `writing`, `step +1` | 1회 쓰기 |
| **에피소드 완료** | 아래 전부 한 번에 | transaction |

**결과 화면 두 가지**
| 언제 | 화면 | 내용 |
|---|---|---|
| 에피소드 하나 끝날 때 | 에피소드 완료 화면 (`EpisodeResult`) | 별점, +XP·정답률·연속 출석, 문제별 ⭕❌, 이야기 진행도, 틀린 문제·글쓰기 피드백(접기) → 출석체크 |
| 이야기(예: 춘향전) 전체를 끝냈을 때 | 완독 리포트 (`/report/:storyId`) | 에피소드별 `progress.result`를 합쳐 사각형 차트·정답률 막대 (**처음 진단과 비교**), 잘하는/부족한 능력, 에피소드별 별점, 틀린 문제 모아보기. 목록에서 다시 볼 수 있음 |

**에피소드 목록의 버튼**
| 상태 | 버튼 |
|---|---|
| 처음 | [시작] ⚡−1 |
| 진행 중 (`progress.status == "in_progress"`) | [이어하기] (에너지 안 씀) · [처음부터] ⚡−1 |
| 완료 | [다시 풀기] ⚡−1, 경험치 절반 |

함수: [`app/src/services/progressService.js`](../app/src/services/progressService.js) — `startEpisode`, `loadProgress`, `saveStep`, `saveAnswer`, `saveWriting`, `completeEpisode`. 스토리·퀴즈 화면은 단계를 넘길 때 이 함수만 부르면 된다.

**완료 transaction에서 바뀌는 것**
1. progress: `status: "completed"`, `result`, `expGained`, `completedAt`
2. users: `stats` 누적, `completedEpisodeIds`에 추가, `current: null`, `exp` 증가, 레벨 재계산
3. 오늘 첫 완료면: `attendance/{오늘}` 생성, `attendance` 요약 갱신, 출석 보상 exp 추가
   오늘 이미 출석했으면: `attendance/{오늘}.completedEpisodeIds`에 추가만

→ 결과를 화면에 돌려준다: `{ expGained, levelUp, attendance: { isNew, streak, totalDays, rewardExp } | null }`

> **transaction**: 여러 문서를 "전부 저장되거나 전부 안 되거나"로 묶는 Firestore 기능이다. 중간에 앱이 꺼져서 "완료는 됐는데 출석은 안 됨" 같은 상태가 생기는 걸 막는다.
>
> 무료 한도(하루 쓰기 2만 회) 대비 에피소드 1개당 쓰기 약 7~8회라 여유 있다.

---

## 8. 콘텐츠 JSON에 필요한 것 (콘텐츠 담당 확인)

진행 저장이 동작하려면 콘텐츠 JSON에 아래가 있어야 한다. **이름은 JSON에서 정한 대로 따라간다.**

1. **storyId**: 이야기 구분 (예: `chunhyang`, `heungbu`)
2. **episodeId**: **이야기끼리 겹치지 않아야 함.** 엑셀의 `ep1`은 춘향전·흥부놀부가 겹치므로 `chunhyang-ep1`처럼 구분 필요
3. **questionId**: 전체에서 유일 (예: `chunhyang-ep1-q1`)
4. **문제 유형**: 어휘 / 내용 이해 / 추론 / 글쓰기 → 코드에서 `vocab` / `comprehension` / `inference` / `writing`으로 매핑
5. **정답**: 숫자 1~4 (엑셀의 ②는 `2`)
6. **에피소드 안 순서 (`steps`)**: 이야기 도중에 문제가 나오므로, 이야기·문제·글쓰기가 섞인 순서가 배열로 정해져 있을 것. 진행 저장의 `step`은 이 배열의 위치다. 예시: [`app/src/content/sample-content.json`](../app/src/content/sample-content.json)
   ```json
   "steps": [
     { "type": "story", "text": "숙종 임금 때 전라도 남원에…" },
     { "type": "question", "questionId": "chunhyang-ep1-q1" },
     { "type": "story", "text": "도령은 방자에게…" },
     { "type": "writing", "questionId": "chunhyang-ep1-w1" }
   ]
   ```
7. **글쓰기 평가 기준 개수** (현재 3개)

---

## 9. 보안 규칙

[`app/firestore.rules`](../app/firestore.rules): 본인 `users/{uid}` 문서와 그 아래 `progress`, `attendance`만 읽고 쓸 수 있다.

> 현재는 앱(클라이언트)이 경험치·레벨을 직접 계산해서 저장하는 구조라, 마음먹고 조작하면 값을 바꿀 수 있다. 과제 범위에서는 허용하고, 필요하면 이후 Cloud Functions로 옮긴다.

---

## 10. 설정 (`users/{uid}.settings`)

| 필드 | 값 | 기본값 | 설명 |
|---|---|---|---|
| `fontSize` | `small` / `medium` / `large` | `medium` | 지문 글자 크기 (15 / 17 / 20px) |
| `lineHeight` | `normal` / `wide` | `normal` | 지문 줄 간격 (1.7 / 2.1) |
| `theme` | `system` / `light` / `dark` | `system` | 테마 |
| `notifications.enabled` | boolean | `false` | 알림 받기 (켜기/끄기만) |

- `fcmTokens` (users 문서, array): 알림 받을 기기 토큰. 알림을 켤 때 추가하고, 끌 때 삭제한다.
- 설정 기본값과 선택지는 [`app/src/config/settings.js`](../app/src/config/settings.js)에 있다.

**스토리·지문 화면 담당에게**: 글자 크기와 줄 간격 설정이 적용되도록 지문에 아래 CSS 변수를 써주세요.
```css
font-size: var(--reading-font-size);
line-height: var(--reading-line-height);
```

**알림 발송**
- **출석 리마인더(자동)**: GitHub Actions가 매일 한국 시간 저녁 8시쯤, 알림을 켰는데 오늘 출석하지 않은 사용자에게 보낸다. → [`scripts/send-reminders/`](../scripts/send-reminders/README.md)
  - `reminder: { lastSentDate, kind }` (users 문서): 하루 1번만 보내기 위한 기록. 스크립트만 쓴다.
- **그 밖의 공지**: Firebase 콘솔 > Messaging에서 직접 보낸다.

**학습 기록 초기화**: `progress` 전부 삭제, `level: 0`, `exp: 0`, `stats`·`diagnosis` 삭제, `completedEpisodeIds: []`, `current: null`. 레벨 0이 되므로 **초기 진단부터 다시** 한다. 계정, 닉네임, 설정, **출석 기록은 남긴다**(지우면 누적 보상을 다시 받을 수 있게 되므로).

---

## 11. 팀 확인 필요

| # | 내용 | 기본값 |
|---|---|---|
| 1 | 출석 보상을 **에너지 → 경험치**로 변경 (노션 기획과 다름) | 경험치 |
| 2 | 에피소드 수: 간트차트는 4개, 엑셀은 5개 | 콘텐츠 JSON 따름 |
| 3 | 오각형 능력치 5번째 축 (퀴즈 유형은 4개) | 미정 |
| 4 | 글쓰기 "판단 보류" 기준을 충족으로 볼지 | 미충족으로 계산 |
| 5 | 문제·에피소드 ID 규칙 (8절) | `chunhyang-ep1-q1` 형식 |
| 6 | 초기 진단 결과 저장 필드 (학습 기록 초기화 때 같이 지움) | `users.diagnosis` — 확정, [`diagnosis.md`](./diagnosis.md) |
| 7 | 개인정보 처리방침·이용약관 초안의 문의 이메일, AI 서비스 이름 | 미정 |

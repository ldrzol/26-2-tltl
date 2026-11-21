# 출석 리마인더 (send-reminders)

매일 한국 시간 저녁 8시쯤 GitHub Actions가 실행해서, **알림을 켰는데 오늘 아직 출석하지 않은 사용자**에게 푸시 알림을 보냅니다.

| 상황 | 알림 |
|---|---|
| 어제까지 2일 이상 연속 출석했는데 오늘 아직 안 옴 | 🔥 N일 연속 기록이 사라지기 직전! / 😱 딱 한 편만요. 오늘 에피소드 하나면 기록이 이어져요. |
| 그 밖에 오늘 출석 안 함 | 또랑또랑이 삐졌어요… 🥺 / 오늘 한 편만 읽어주면 풀릴지도? |

문구를 바꾸려면 [`decide.js`](decide.js)만 고치면 됩니다.

- 하루 1번만 보냅니다 (`users.reminder.lastSentDate`).
- 쓸 수 없는 기기 토큰은 자동으로 `fcmTokens`에서 지웁니다.
- 판단 규칙: [`decide.js`](decide.js) · 테스트: `npm test`

## 처음 설정 (레포 관리자 1회)

1. Firebase 콘솔 → 프로젝트 설정 → **서비스 계정** 탭 → **새 비공개 키 생성** → JSON 파일 다운로드
2. GitHub 레포 → **Settings → Secrets and variables → Actions → New repository secret**
   - Name: `FIREBASE_SERVICE_ACCOUNT`
   - Secret: 다운로드한 JSON 파일 **내용 전체**를 붙여넣기
3. 다운로드한 JSON 파일은 **삭제**하거나 안전한 곳에 보관 (⚠️ 절대 커밋 금지 — DB 전체 권한이 있는 키)

## 테스트

GitHub 레포 → **Actions → Daily reminder → Run workflow**
- `dry_run` 체크(기본값): 누구에게 보낼지 로그만 출력
- 체크 해제: 실제 발송

내 컴퓨터에서:
```bash
cd scripts/send-reminders
npm install
npm test                      # 판단 규칙 테스트 (Firebase 불필요)
# 실제 DB 조회 (키 파일 필요)
GOOGLE_APPLICATION_CREDENTIALS=키파일.json npm run dry-run
```

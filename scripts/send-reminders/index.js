/**
 * 출석 리마인더 발송 — GitHub Actions가 매일 한국 시간 저녁 8시쯤 실행
 * (.github/workflows/daily-reminder.yml)
 *
 * 1. 알림을 켠 사용자 조회 (users.settings.notifications.enabled == true)
 * 2. 오늘 출석 안 한 사람을 골라 (decide.js)
 * 3. 그 사람의 기기 토큰(fcmTokens)으로 푸시 발송
 * 4. 만료된 토큰은 정리하고, 보낸 날짜를 기록 (하루 1번만)
 *
 * 실행:  node index.js            실제 발송
 *        node index.js --dry-run  누구에게 보낼지 출력만 (발송·저장 안 함)
 *
 * 인증 (둘 중 하나):
 *  - FIREBASE_SERVICE_ACCOUNT  = 서비스 계정 키 JSON 내용 (GitHub Secrets)
 *  - GOOGLE_APPLICATION_CREDENTIALS = 키 파일 경로 (내 컴퓨터에서 테스트할 때)
 */
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import { decideReminder, kstDateKey } from './decide.js'

const DRY_RUN = process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true'

// 다시 등록해야 하는(쓸 수 없는) 토큰 → DB에서 지운다
const DEAD_TOKEN_ERRORS = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
])

function credential() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT
  if (json) return cert(JSON.parse(json))
  return applicationDefault()
}

async function main() {
  initializeApp({ credential: credential() })
  const db = getFirestore()
  const messaging = getMessaging()
  const today = kstDateKey()

  console.log(`[reminder] ${today} (KST) 시작${DRY_RUN ? ' — DRY RUN' : ''}`)

  const snap = await db.collection('users').where('settings.notifications.enabled', '==', true).get()
  console.log(`[reminder] 알림 켠 사용자 ${snap.size}명`)

  let sent = 0
  let skipped = 0
  let failed = 0

  for (const doc of snap.docs) {
    const user = doc.data()
    const reminder = decideReminder(user, today)
    if (!reminder) {
      skipped += 1
      continue
    }

    const who = `${doc.id.slice(0, 6)}… (${reminder.kind})`
    if (DRY_RUN) {
      console.log(`  → ${who}: ${reminder.title}`)
      sent += 1
      continue
    }

    const tokens = user.fcmTokens
    const res = await messaging.sendEachForMulticast({
      tokens,
      notification: { title: reminder.title, body: reminder.body },
      data: { url: '/', kind: reminder.kind },
    })

    const deadTokens = res.responses
      .map((r, i) => (!r.success && DEAD_TOKEN_ERRORS.has(r.error?.code) ? tokens[i] : null))
      .filter(Boolean)

    const update = { reminder: { lastSentDate: today, kind: reminder.kind } }
    if (deadTokens.length) update.fcmTokens = FieldValue.arrayRemove(...deadTokens)
    await doc.ref.update(update)

    if (res.successCount > 0) {
      sent += 1
      console.log(`  ✓ ${who} 기기 ${res.successCount}대`)
    } else {
      failed += 1
      console.log(`  ✗ ${who} 발송 실패`, res.responses.map((r) => r.error?.code))
    }
    if (deadTokens.length) console.log(`    만료 토큰 ${deadTokens.length}개 삭제`)
  }

  console.log(`[reminder] 끝 — 발송 ${sent}, 대상 아님 ${skipped}, 실패 ${failed}`)
}

main().catch((e) => {
  console.error('[reminder] 오류', e)
  process.exit(1)
})

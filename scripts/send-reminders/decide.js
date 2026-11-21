/**
 * 누구에게 어떤 리마인더를 보낼지 결정 (Firebase 없이 계산만 → 테스트 가능)
 */

const TIMEZONE = 'Asia/Seoul'

/** 한국 시간 기준 "YYYY-MM-DD" */
export function kstDateKey(now = new Date()) {
  // en-CA 형식이 YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(now)
}

/** "2026-11-16" → "2026-11-15" */
export function previousDateKey(key) {
  const d = new Date(`${key}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

/**
 * @param user  users/{uid} 문서 데이터
 * @param today 한국 날짜 "YYYY-MM-DD"
 * @returns null(안 보냄) 또는 { kind, title, body }
 */
export function decideReminder(user, today) {
  if (!user?.settings?.notifications?.enabled) return null
  if (!Array.isArray(user.fcmTokens) || user.fcmTokens.length === 0) return null
  if ((user.level ?? 0) < 1) return null // 진단 전 사용자는 제외
  if (user.reminder?.lastSentDate === today) return null // 하루 1번만

  const lastDate = user.attendance?.lastDate ?? null
  if (lastDate === today) return null // 오늘 이미 출석

  const streak = user.attendance?.streak ?? 0

  // 어제까지 출석했는데 오늘 아직 안 옴 → 연속 출석이 끊기기 직전
  if (lastDate === previousDateKey(today) && streak >= 2) {
    return {
      kind: 'streak',
      title: `🔥 ${streak}일 연속 기록이 사라지기 직전!`,
      body: '😱 딱 한 편만요. 오늘 에피소드 하나면 기록이 이어져요.',
    }
  }

  return {
    kind: 'comeback',
    title: '또랑또랑이 삐졌어요… 🥺',
    body: '오늘 한 편만 읽어주면 풀릴지도?',
  }
}

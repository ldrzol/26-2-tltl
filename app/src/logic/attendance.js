import { attendanceRewardExp, ATTENDANCE_REWARD } from '../config/gameRules.js'
import { previousDayKey } from '../utils/date.js'

/**
 * 오늘 에피소드를 완료했을 때 출석 결과 계산 (Firebase 없이 계산만)
 *
 * @param summary users 문서의 attendance 요약 { lastDate, streak, totalDays } (없으면 undefined)
 * @param today   "YYYY-MM-DD"
 * @returns 오늘 이미 출석했으면 { isNew: false, ...기존 값 }
 *          오늘 첫 출석이면   { isNew: true, streak, totalDays, reward: { exp, bonusExp } }
 */
export function computeAttendance(summary, today) {
  const lastDate = summary?.lastDate ?? null
  const streak = summary?.streak ?? 0
  const totalDays = summary?.totalDays ?? 0

  if (lastDate === today) {
    return { isNew: false, lastDate, streak, totalDays, reward: null }
  }

  const nextStreak = lastDate === previousDayKey(today) ? streak + 1 : 1
  const nextTotal = totalDays + 1

  return {
    isNew: true,
    lastDate: today,
    streak: nextStreak,
    totalDays: nextTotal,
    reward: attendanceRewardExp(nextTotal),
  }
}

/** 다음 누적 보상까지 남은 출석 일수 (보상 받은 날이면 0이 아니라 다음 주기 기준) */
export function daysUntilBonus(totalDays) {
  const every = ATTENDANCE_REWARD.BONUS_EVERY_DAYS
  const rest = totalDays % every
  return rest === 0 ? every : every - rest
}

import { ENERGY } from '../config/gameRules.js'

/**
 * 에너지 계산 (Firebase 없이 계산만)
 * 저장 모양: users.energy = { current: 3, date: "2026-11-16" }
 * 매일 초기화: date가 오늘이 아니면 하루 최대치(4)로 본다 → 서버가 밤 12시에 바꿀 필요 없음
 */

/** 오늘 남은 에너지 */
export function currentEnergy(energy, today) {
  if (!energy || energy.date !== today) return ENERGY.DAILY_MAX
  return energy.current
}

/**
 * 에피소드 시작에 에너지 사용
 * @returns { ok: false, remaining } 부족하면
 *          { ok: true, remaining, next: { current, date } } 쓸 수 있으면 (next를 저장)
 */
export function spendEnergy(energy, today, cost = ENERGY.COST_PER_EPISODE) {
  const now = currentEnergy(energy, today)
  if (now < cost) return { ok: false, remaining: now }
  const remaining = now - cost
  return { ok: true, remaining, next: { current: remaining, date: today } }
}

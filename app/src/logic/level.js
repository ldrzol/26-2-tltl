import { expToNextLevel, levelFromExp } from '../config/gameRules.js'

/**
 * 경험치를 더하고 레벨을 다시 계산 (Firebase 없이 계산만)
 * - 레벨 0(진단 전)은 경험치로 오르지 않는다 (0 → 1은 진단 테스트 완료로만)
 * - 레벨은 내려가지 않는다
 */
export function applyExp({ exp = 0, level = 0 }, gained) {
  const nextExp = exp + gained
  const nextLevel = level >= 1 ? Math.max(level, levelFromExp(nextExp)) : level
  return {
    exp: nextExp,
    level: nextLevel,
    levelUp: nextLevel > level,
    prevLevel: level,
  }
}

/** 현재 레벨 안에서의 경험치 진행도 → 경험치 바 표시용 */
export function levelProgress({ exp = 0, level = 1 }) {
  if (level < 1) return { current: 0, needed: expToNextLevel(1), ratio: 0 }
  let spent = 0
  for (let l = 1; l < level; l += 1) spent += expToNextLevel(l)
  const needed = expToNextLevel(level)
  const current = Math.max(0, Math.min(exp - spent, needed))
  return { current, needed, ratio: current / needed }
}

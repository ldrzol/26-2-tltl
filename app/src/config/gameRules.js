/**
 * 게임 규칙 숫자 모음 — 밸런스 조정은 이 파일만 고치면 된다.
 * 설명: docs/data-structure.md 6절
 */

export const TIMEZONE = 'Asia/Seoul'

// 에너지: 하루 4개, 에피소드 시작 시 1개, 매일 초기화
export const ENERGY = {
  DAILY_MAX: 4,
  COST_PER_EPISODE: 1,
}

// 출석 보상 (경험치)
export const ATTENDANCE_REWARD = {
  DAILY_EXP: 10,
  BONUS_EVERY_DAYS: 5, // 누적 5일마다
  BONUS_EXP: 30,
}

// 에피소드 경험치
export const EPISODE_EXP = {
  COMPLETE: 10,
  PER_CORRECT_ANSWER: 5,
  PER_WRITING_CRITERION: 5,
  REPLAY_RATE: 0.5, // 다시 풀기는 절반
}

// 능력치 키 (콘텐츠 JSON의 유형 이름 → 저장용 키)
export const SKILLS = ['vocab', 'comprehension', 'inference', 'writing']
export const SKILL_LABELS = {
  vocab: '어휘',
  comprehension: '내용 이해',
  inference: '추론',
  writing: '글쓰기',
}

/** 레벨 n → n+1 에 필요한 경험치 (n ≥ 1) */
export function expToNextLevel(level) {
  return 40 + 20 * level
}

/** 누적 경험치 → 레벨 (진단 완료 후 기준, 최소 1) */
export function levelFromExp(totalExp) {
  let level = 1
  let remaining = totalExp
  while (remaining >= expToNextLevel(level)) {
    remaining -= expToNextLevel(level)
    level += 1
  }
  return level
}

/** 에피소드 한 회차 경험치 */
export function episodeExp({ correctCount, writingMetCount, isReplay }) {
  const base =
    EPISODE_EXP.COMPLETE +
    correctCount * EPISODE_EXP.PER_CORRECT_ANSWER +
    writingMetCount * EPISODE_EXP.PER_WRITING_CRITERION
  return isReplay ? Math.floor(base * EPISODE_EXP.REPLAY_RATE) : base
}

/** 출석 보상 경험치 (totalDays = 이번 출석을 포함한 누적 일수) */
export function attendanceRewardExp(totalDays) {
  const bonus =
    totalDays % ATTENDANCE_REWARD.BONUS_EVERY_DAYS === 0 ? ATTENDANCE_REWARD.BONUS_EXP : 0
  return { exp: ATTENDANCE_REWARD.DAILY_EXP, bonusExp: bonus }
}

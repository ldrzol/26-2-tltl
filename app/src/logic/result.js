import { SKILLS, STARS } from '../config/gameRules.js'

/**
 * 학습 결과 집계 (Firebase 없이 계산만)
 * 문제 수는 정해두지 않는다 — 유형별로 몇 문제든 센다.
 */

function emptySkills() {
  return Object.fromEntries(SKILLS.map((s) => [s, { correct: 0, total: 0 }]))
}

/**
 * 에피소드 한 회차 집계
 * @param episode   content/index.js의 getEpisode 결과
 * @param answers   { [questionId]: { choice } }  (choice: 1~4)
 * @param writingFeedback { criteria: [true, false, ...] } | null  (AI 피드백)
 */
export function aggregateEpisode(episode, answers = {}, writingFeedback = null) {
  const skills = emptySkills()
  const wrong = []
  let correctCount = 0

  for (const q of episode.questions) {
    const chosen = answers[q.id]?.choice ?? null
    const isCorrect = chosen === q.answer
    skills[q.skill] ??= { correct: 0, total: 0 }
    skills[q.skill].total += 1
    if (isCorrect) {
      skills[q.skill].correct += 1
      correctCount += 1
    } else {
      wrong.push({ ...q, chosen })
    }
  }

  // 글쓰기: 평가 기준 충족 개수를 정답처럼 센다 (판단 보류는 미충족)
  let writingMet = 0
  if (episode.writing) {
    const criteria = writingFeedback?.criteria ?? []
    writingMet = criteria.filter((c) => c === true).length
    skills.writing.total += episode.writing.criteria.length
    skills.writing.correct += writingMet
  }

  return {
    skills,
    correctCount,
    questionCount: episode.questions.length,
    writingMet,
    writingTotal: episode.writing?.criteria.length ?? 0,
    wrong,
  }
}

/** 정답률 0~100 (기록이 없으면 null) */
export function accuracy(stat) {
  if (!stat || !stat.total) return null
  return Math.round((stat.correct / stat.total) * 100)
}

/** 가장 부족한 능력 (정답률이 가장 낮은 유형, 기록 없으면 null) */
export function weakestSkill(skills) {
  let weakest = null
  for (const key of SKILLS) {
    const a = accuracy(skills?.[key])
    if (a === null) continue
    if (weakest === null || a < weakest.accuracy) weakest = { skill: key, accuracy: a }
  }
  return weakest
}

/** 이번 회차 전체 정답률 0~100 (객관식 정답 + 글쓰기 충족 기준) */
export function episodeAccuracy(result) {
  const total = result.questionCount + result.writingTotal
  if (!total) return 0
  return Math.round(((result.correctCount + result.writingMet) / total) * 100)
}

/** 별점 1~3 */
export function starsFor(result) {
  const a = episodeAccuracy(result)
  if (a >= STARS.THREE_AT) return 3
  if (a >= STARS.TWO_AT) return 2
  return 1
}

/** 능력치 여러 개 합치기 (이야기 완독 리포트: 에피소드별 결과를 모을 때) */
export function sumSkills(list) {
  return list.reduce((acc, s) => mergeSkills(acc, s), {})
}

/** 누적 능력치 + 이번 회차 (화면에 바로 보여줄 때) */
export function mergeSkills(base = {}, add = {}) {
  const out = emptySkills()
  for (const key of SKILLS) {
    out[key] = {
      correct: (base[key]?.correct ?? 0) + (add[key]?.correct ?? 0),
      total: (base[key]?.total ?? 0) + (add[key]?.total ?? 0),
    }
  }
  return out
}

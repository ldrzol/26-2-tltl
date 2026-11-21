import { SKILLS, SKILL_LABELS } from '../config/gameRules.js'
import { accuracy } from './result.js'

/**
 * 능력 진단 리포트 (초기 진단 결과 화면) — 무엇을 잘하고 무엇이 부족한지 문장으로
 * Firebase 없이 계산만
 */

export const STRONG_AT = 70 // 이 정답률 이상이면 "잘해요"
export const WEAK_BELOW = 40 // 이 정답률 미만이면 "연습이 필요해요"

const COMMENTS = {
  vocab: {
    strong: '낱말의 뜻을 정확히 알고 있어요. 어려운 고전 낱말도 문맥으로 잘 풀어내요.',
    normal: '익숙한 낱말은 잘 알지만, 낯선 낱말에서 가끔 막혀요.',
    weak: '낯선 낱말이 나오면 글 전체가 어렵게 느껴질 수 있어요. 어휘 문제로 낱말을 하나씩 늘려 봐요.',
  },
  comprehension: {
    strong: '글에 나온 내용을 꼼꼼하고 정확하게 짚어내요.',
    normal: '큰 흐름은 잘 잡지만, 세부 내용을 놓칠 때가 있어요.',
    weak: '읽은 내용을 정확히 기억하고 확인하는 연습이 필요해요. 지문을 다시 보며 답을 찾아봐요.',
  },
  inference: {
    strong: '글에 직접 나오지 않은 인물의 마음과 숨은 뜻까지 잘 짐작해요.',
    normal: '분명한 단서는 잘 찾지만, 숨은 뜻을 짐작하는 데는 조금 더 연습이 필요해요.',
    weak: '인물의 마음이나 숨은 뜻을 짐작하는 연습이 필요해요. "왜 그랬을까?"를 생각하며 읽어봐요.',
  },
  writing: {
    strong: '생각을 조건에 맞춰 문장으로 잘 표현해요.',
    normal: '하고 싶은 말은 잘 쓰지만, 조건을 빠뜨릴 때가 있어요.',
    weak: '조건에 맞춰 내 생각을 문장으로 쓰는 연습이 필요해요. 예시 답안과 비교해 봐요.',
  },
}

/** 받침에 따라 을/를 고르기 ("추론을", "어휘를") */
function eulReul(word) {
  const code = word.charCodeAt(word.length - 1) - 0xac00
  const hasBatchim = code >= 0 && code <= 11171 && code % 28 !== 0
  return word + (hasBatchim ? '을' : '를')
}

function levelOf(a) {
  if (a >= STRONG_AT) return 'strong'
  if (a < WEAK_BELOW) return 'weak'
  return 'normal'
}

/**
 * @param skills { vocab: { correct, total }, ... }
 * @returns {
 *   items: [{ skill, label, accuracy, level: 'strong'|'normal'|'weak', comment }],  기록 있는 능력만
 *   best:  { skill, label, accuracy } | null   가장 잘하는 능력
 *   worst: { skill, label, accuracy } | null   가장 부족한 능력 (best와 같으면 null)
 *   summary: 한 줄 요약
 * }
 */
export function buildSkillReport(skills) {
  const items = []
  for (const key of SKILLS) {
    const a = accuracy(skills?.[key])
    if (a === null) continue
    const level = levelOf(a)
    items.push({ skill: key, label: SKILL_LABELS[key], accuracy: a, level, comment: COMMENTS[key][level] })
  }

  if (items.length === 0) {
    return { items, best: null, worst: null, summary: '아직 진단 기록이 없어요.' }
  }

  // 같은 점수면 SKILLS 순서가 앞선 것
  const best = items.reduce((m, it) => (it.accuracy > m.accuracy ? it : m))
  const worst = items.reduce((m, it) => (it.accuracy < m.accuracy ? it : m))
  const allSame = best.accuracy === worst.accuracy

  let summary
  if (allSame && best.level === 'strong') summary = '모든 능력이 고르게 뛰어나요! 🎉'
  else if (allSame && best.level === 'weak') summary = '이제 막 시작이에요. 차근차근 함께 키워가요!'
  else if (allSame) summary = '모든 능력이 고르게 자라고 있어요.'
  else summary = `${best.label}에 강하고, ${eulReul(worst.label)} 키우면 더 좋아져요.`

  return {
    items,
    best: { skill: best.skill, label: best.label, accuracy: best.accuracy },
    worst: allSame ? null : { skill: worst.skill, label: worst.label, accuracy: worst.accuracy },
    summary,
  }
}

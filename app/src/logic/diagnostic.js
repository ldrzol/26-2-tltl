import { SKILLS, SKILL_LABELS } from '../config/gameRules.js'

/**
 * 초기 진단 테스트 채점 (Firebase 없이 계산만)
 * 담당: 전예랑 · 설명: docs/diagnosis.md
 *
 * 기준값(배점·커트라인·형 이름·동점 순서)은 전부 진단 JSON(content/diagnostic.json)에서 읽는다.
 * 엑셀을 고친 뒤 `node tools/convert-diagnostic.mjs`로 JSON만 다시 만들면 이 코드는 고치지 않아도 된다.
 *
 * answers: { [문항ID]: 고른 보기 번호(1~4) } — 비었거나 없는 문항은 오답(0점)으로 본다.
 */

const EPS = 1e-9
const ge = (a, b) => a >= b - EPS // 부동소수점 오차를 피하는 비교
const le = (a, b) => a <= b + EPS

// 진단 JSON의 영역 이름 → 앱 공통 능력치 키 (gameRules.js의 SKILLS)
const AREA_TO_SKILL = Object.fromEntries(SKILLS.map((k) => [SKILL_LABELS[k], k]))

/** 영역 비율(0~1) → '잘해요' | '보통' | '연습 필요' */
export function gradeOf(rate, thresholds) {
  if (ge(rate, thresholds.grade.good)) return '잘해요'
  if (ge(rate, thresholds.grade.normal)) return '보통'
  return '연습 필요'
}

export function scoreDiagnostic(data, answers = {}) {
  const { scoring, questions, errorTags } = data
  const { areas, thresholds } = scoring
  const tagInfo = Object.fromEntries(errorTags.map((t) => [t.tag, t]))

  // 1) 문항별 채점
  const items = questions.map((q) => {
    const raw = answers[q.id]
    const selected = Number.isInteger(raw) && raw >= 1 && raw <= 4 ? raw : null
    const correct = selected === q.answer
    const opt = selected ? q.options[selected - 1] : null
    return {
      id: q.id,
      area: q.area,
      difficulty: q.difficulty,
      points: q.points,
      earned: correct ? q.points : 0,
      selected,
      correct,
      answered: selected !== null,
      errorTag: correct || !opt ? null : opt.errorTag,
    }
  })

  // 2) 영역별 점수 · 비율 · 등급 (영역 만점이 5점이라 비율은 20% 단위)
  const areaResults = areas.map((area) => {
    const own = items.filter((i) => i.area === area)
    const earned = own.reduce((s, i) => s + i.earned, 0)
    const max = own.reduce((s, i) => s + i.points, 0)
    const rate = max ? earned / max : 0
    const grade = gradeOf(rate, thresholds)
    return {
      area,
      skill: AREA_TO_SKILL[area],
      earned,
      max,
      rate,
      percent: Math.round(rate * 100),
      grade,
      message: scoring.gradeMessages[grade],
    }
  })
  const totalEarned = items.reduce((s, i) => s + i.earned, 0)
  const totalMax = items.reduce((s, i) => s + i.points, 0)
  const totalRate = totalMax ? totalEarned / totalMax : 0

  const rates = areaResults.map((a) => a.rate)
  const best = Math.max(...rates)
  const worst = Math.min(...rates)
  const rateOf = (area) => areaResults.find((r) => r.area === area).rate

  // 3) 형 판정: 만능 → 새싹 → 균형 → 최고 영역형 (최고 영역이 동점이면 typeTieOrder 순)
  let type
  if (ge(totalRate, thresholds.allRounder.total) && ge(worst, thresholds.allRounder.eachArea)) {
    type = { key: 'allRounder', ...scoring.overallTypes.allRounder, bestArea: null }
  } else if (le(best, thresholds.sprout.maxAll)) {
    type = { key: 'sprout', ...scoring.overallTypes.sprout, bestArea: null }
  } else if (le(Math.round((best - worst) * 1e6) / 1e6, thresholds.balanced.maxGap)) {
    type = { key: 'balanced', ...scoring.overallTypes.balanced, bestArea: null }
  } else {
    const bestArea = scoring.typeTieOrder.find((a) => Math.abs(rateOf(a) - best) < EPS)
    type = { key: 'area', ...scoring.areaTypes[bestArea], bestArea }
  }

  // 4) 더 키울 능력: 가장 낮은 영역 (동점이면 weakestTieOrder 순: 어휘 → 내용 이해 → 추론 → 글쓰기)
  const weakestArea = scoring.weakestTieOrder.find((a) => Math.abs(rateOf(a) - worst) < EPS)
  const allGood = ge(worst, thresholds.grade.good)
  const weakest = {
    area: weakestArea,
    skill: AREA_TO_SKILL[weakestArea],
    allGood,
    reason: scoring.weakestReasons[weakestArea],
    message: allGood ? `모두 잘해요! 도전 과제: ${weakestArea}` : `${weakestArea} 영역을 먼저 키워 봐요`,
  }

  // 5) 시작 레벨(학습 단계 Lv.1~4): 하 → 중 → 상 순으로 통과 여부를 보고, 처음 못 넘은 단계에서 시작
  const tiers = scoring.difficulties.map((d) => {
    const own = items.filter((i) => i.difficulty === d)
    const correct = own.filter((i) => i.correct).length
    const need = Math.ceil(own.length * thresholds.startLevelPass - EPS)
    return { difficulty: d, count: own.length, correct, need, passed: correct >= need }
  })
  const firstFail = tiers.findIndex((t) => !t.passed)
  const levelId = firstFail === -1 ? scoring.levels.length : firstFail + 1
  const startLevel = scoring.levels.find((l) => l.id === levelId)

  // 6) 틀린 문제 해설 (결과 화면의 "왜 틀렸는지")
  const wrongAnswers = questions
    .filter((q) => !items.find((i) => i.id === q.id).correct)
    .map((q) => {
      const it = items.find((i) => i.id === q.id)
      const chosen = it.selected ? q.options[it.selected - 1] : null
      return {
        id: q.id,
        passageId: q.passageId,
        area: q.area,
        skill: AREA_TO_SKILL[q.area],
        difficulty: q.difficulty,
        stem: q.stem,
        options: q.options,
        selected: it.selected,
        errorTag: chosen?.errorTag ?? null,
        whyWrong: chosen?.whyWrong ?? null,
        answer: q.answer,
        evidence: q.evidence,
        explanation: q.explanation,
        unanswered: !it.answered,
      }
    })

  // 7) 오답 유형 집계 (가장 많이 한 실수 → 맞춤 문구. 동점이면 태그 사전 순서)
  const tagCounts = {}
  items.forEach((i) => {
    if (i.errorTag) tagCounts[i.errorTag] = (tagCounts[i.errorTag] || 0) + 1
  })
  const order = errorTags.map((t) => t.tag)
  const topName =
    Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a] || order.indexOf(a) - order.indexOf(b))[0] ?? null
  const topTag = topName ? { tag: topName, count: tagCounts[topName], message: tagInfo[topName].message } : null

  return {
    total: { earned: totalEarned, max: totalMax, rate: totalRate, percent: Math.round(totalRate * 100) },
    areas: areaResults,
    type,
    weakest,
    startLevel,
    tiers,
    wrongAnswers,
    tagCounts,
    topTag,
    unanswered: items.filter((i) => !i.answered).map((i) => i.id),
    items,
  }
}

/**
 * 앱 공통 능력치 모양으로 바꾸기 → { vocab: { correct, total }, ... }
 * correct = 영역 획득 점수, total = 영역 만점(5점) 이라서 accuracy()가 20% 단위로 나온다.
 * 진단 결과 화면(DiagnosisResult)과 이야기 완독 리포트의 "처음 진단" 비교가 이 값을 쓴다.
 */
export function toSkills(result) {
  return Object.fromEntries(result.areas.map((a) => [a.skill, { correct: a.earned, total: a.max }]))
}

/**
 * Firestore `users/{uid}.diagnosis`에 저장할 값 (completedAt은 서비스에서 붙인다)
 * undefined가 들어가면 Firestore가 거부하므로 값이 없으면 null로 둔다.
 */
export function buildDiagnosisRecord(data, result) {
  return {
    version: data.schemaVersion,
    skills: toSkills(result),
    grades: Object.fromEntries(result.areas.map((a) => [a.skill, a.grade])),
    type: { key: result.type.key, name: result.type.name, bestSkill: result.type.bestArea ? AREA_TO_SKILL[result.type.bestArea] : null },
    weakestSkill: result.weakest.skill,
    startLevel: result.startLevel.id,
    answers: Object.fromEntries(result.items.filter((i) => i.answered).map((i) => [i.id, { choice: i.selected, correct: i.correct }])),
    errorTags: result.tagCounts,
  }
}

// 초기 진단 테스트 채점 모듈 (의존성 없음 — Node와 브라우저/React 모두에서 사용 가능)
//
//   import data from '../../data/diagnostic.json' with { type: 'json' };
//   import { scoreDiagnostic } from './score.mjs';
//   const result = scoreDiagnostic(data, { 'dx-01': 3, 'dx-02': 1, ... });
//
// answers: { 문항ID: 고른 보기 번호(1~4) }. 비워 두거나 없는 문항은 오답(0점)으로 처리합니다.
// 모든 기준값(배점·커트라인·형 이름·동점 순서)은 data(JSON)에서 읽으므로
// 엑셀을 고친 뒤 JSON만 다시 만들면 코드 수정 없이 반영됩니다.

const EPS = 1e-9;
const ge = (a, b) => a >= b - EPS;      // 부동소수점 오차를 피하려는 비교
const le = (a, b) => a <= b + EPS;

/** 영역 비율 → 등급 이름 ('잘해요' | '보통' | '연습 필요') */
export function gradeOf(rate, thresholds) {
  if (ge(rate, thresholds.grade.good)) return '잘해요';
  if (ge(rate, thresholds.grade.normal)) return '보통';
  return '연습 필요';
}

export function scoreDiagnostic(data, answers = {}) {
  const { scoring, questions, errorTags } = data;
  const { areas, thresholds } = scoring;
  const tagInfo = Object.fromEntries(errorTags.map((t) => [t.tag, t]));

  // 1) 문항별 채점
  const items = questions.map((q) => {
    const raw = answers[q.id];
    const selected = Number.isInteger(raw) && raw >= 1 && raw <= 4 ? raw : null;
    const correct = selected === q.answer;
    const opt = selected ? q.options[selected - 1] : null;
    return {
      id: q.id, area: q.area, difficulty: q.difficulty, isKiller: q.isKiller,
      points: q.points, earned: correct ? q.points : 0,
      selected, correct, answered: selected !== null,
      errorTag: correct || !opt ? null : opt.errorTag,
    };
  });

  // 2) 영역별 점수 / 비율 / 등급
  const areaResults = areas.map((area) => {
    const own = items.filter((i) => i.area === area);
    const earned = own.reduce((s, i) => s + i.earned, 0);
    const max = own.reduce((s, i) => s + i.points, 0);
    const rate = max ? earned / max : 0;
    const grade = gradeOf(rate, thresholds);
    return { area, earned, max, rate, percent: Math.round(rate * 100), grade, message: scoring.gradeMessages[grade] };
  });
  const totalEarned = items.reduce((s, i) => s + i.earned, 0);
  const totalMax = items.reduce((s, i) => s + i.points, 0);
  const totalRate = totalMax ? totalEarned / totalMax : 0;

  const rates = areaResults.map((a) => a.rate);
  const best = Math.max(...rates);
  const worst = Math.min(...rates);

  // 3) 형(유형) 판정: 만능 → 새싹 → 균형 → 최고 영역 (동점이면 typeTieOrder 순)
  let type;
  if (ge(totalRate, thresholds.allRounder.total) && ge(worst, thresholds.allRounder.eachArea)) {
    type = { key: 'allRounder', ...scoring.overallTypes.allRounder, bestArea: null };
  } else if (le(best, thresholds.sprout.maxAll)) {
    type = { key: 'sprout', ...scoring.overallTypes.sprout, bestArea: null };
  } else if (le(Math.round((best - worst) * 1e6) / 1e6, thresholds.balanced.maxGap)) {
    type = { key: 'balanced', ...scoring.overallTypes.balanced, bestArea: null };
  } else {
    const bestArea = scoring.typeTieOrder.find((a) => Math.abs(areaResults.find((r) => r.area === a).rate - best) < EPS);
    type = { key: 'area', ...scoring.areaTypes[bestArea], bestArea };
  }

  // 4) 더 키울 능력: 가장 낮은 영역, 동점이면 weakestTieOrder 순
  const weakestArea = scoring.weakestTieOrder.find((a) => Math.abs(areaResults.find((r) => r.area === a).rate - worst) < EPS);
  const allGood = ge(worst, thresholds.grade.good);
  const weakest = {
    area: weakestArea,
    allGood,
    reason: scoring.weakestReasons[weakestArea],
    message: allGood ? `모두 잘해요! 도전 과제: ${weakestArea}` : `${weakestArea} 영역을 먼저 키워 봐요`,
  };

  // 5) 시작 레벨: 하 → 중 → 상 순으로 통과 여부 확인
  const tiers = scoring.difficulties.map((d) => {
    const own = items.filter((i) => i.difficulty === d);
    const count = own.length;
    const correct = own.filter((i) => i.correct).length;
    const need = Math.ceil(count * thresholds.startLevelPass - EPS);   // 엑셀 ROUNDUP과 같은 규칙
    return { difficulty: d, count, correct, need, passed: correct >= need };
  });
  const firstFail = tiers.findIndex((t) => !t.passed);
  const levelId = firstFail === -1 ? scoring.levels.length : firstFail + 1;
  const level = scoring.levels.find((l) => l.id === levelId);

  // 6) 틀린 문제 해설 (결과 화면의 "왜 틀렸는지")
  const wrongAnswers = questions
    .filter((q) => !items.find((i) => i.id === q.id).correct)
    .map((q) => {
      const it = items.find((i) => i.id === q.id);
      const chosen = it.selected ? q.options[it.selected - 1] : null;
      return {
        id: q.id, area: q.area, difficulty: q.difficulty, stem: q.stem,
        selected: it.selected, selectedText: chosen?.text ?? null,
        errorTag: chosen?.errorTag ?? null, whyWrong: chosen?.whyWrong ?? null,
        answer: q.answer, answerText: q.options[q.answer - 1].text,
        evidence: q.evidence, explanation: q.explanation,
        unanswered: !it.answered,
      };
    });

  // 7) 오답 유형 집계 (많이 한 실수 → 맞춤 문구)
  const tagCounts = {};
  items.forEach((i) => { if (i.errorTag) tagCounts[i.errorTag] = (tagCounts[i.errorTag] || 0) + 1; });
  const order = errorTags.map((t) => t.tag);                           // 동점이면 태그 사전 순
  const topTagName = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a] || order.indexOf(a) - order.indexOf(b))[0] ?? null;
  const topTag = topTagName ? { tag: topTagName, count: tagCounts[topTagName], message: tagInfo[topTagName].message } : null;

  return {
    total: { earned: totalEarned, max: totalMax, rate: totalRate, percent: Math.round(totalRate * 100), grade: gradeOf(totalRate, thresholds) },
    areas: areaResults,
    type, weakest, level, tiers,
    wrongAnswers, tagCounts, topTag,
    unanswered: items.filter((i) => !i.answered).map((i) => i.id),
    items,
  };
}

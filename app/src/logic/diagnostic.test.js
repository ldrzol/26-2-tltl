import { test } from 'node:test'
import assert from 'node:assert/strict'
import data from '../content/diagnostic.json' with { type: 'json' }
import { buildDiagnosisRecord, scoreDiagnostic, toSkills } from './diagnostic.js'
import { accuracy } from './result.js'

const key = Object.fromEntries(data.questions.map((q) => [q.id, q.answer]))
const wrongOf = (id) => (key[id] % 4) + 1 // 항상 틀리는 보기
const pct = (r) => Object.fromEntries(r.areas.map((a) => [a.area, a.percent]))

// 엑셀 채점시뮬레이터의 예시 답안 (어휘 80 / 내용 60 / 추론 20 / 글쓰기 60)
const SAMPLE = { 'dx-01': 1, 'dx-02': 1, 'dx-03': 1, 'dx-04': 2, 'dx-05': 1, 'dx-06': 1, 'dx-07': 1, 'dx-08': 4, 'dx-09': 3, 'dx-10': 1, 'dx-11': 4, 'dx-12': 2, 'dx-13': 4, 'dx-14': 2, 'dx-15': 1 }

test('JSON: 15문항, 총 20점, 영역 만점은 모두 5점', () => {
  assert.equal(data.questions.length, 15)
  assert.equal(data.meta.totalPoints, 20)
  assert.deepEqual(Object.values(data.meta.areaMaxPoints), [5, 5, 5, 5])
})

test('전부 정답 → 만능 문해력형 · 100% · Lv.4 · "모두 잘해요"', () => {
  const r = scoreDiagnostic(data, key)
  assert.equal(r.total.earned, 20)
  assert.equal(r.type.name, '만능 문해력형')
  assert.deepEqual(pct(r), { 어휘: 100, '내용 이해': 100, 추론: 100, 글쓰기: 100 })
  assert.equal(r.startLevel.name, 'Lv.4 긴 글')
  assert.equal(r.weakest.area, '어휘')
  assert.match(r.weakest.message, /모두 잘해요/)
  assert.equal(r.wrongAnswers.length, 0)
})

test('전부 오답 → 새싹형 · 0% · Lv.1', () => {
  const r = scoreDiagnostic(data, Object.fromEntries(data.questions.map((q) => [q.id, wrongOf(q.id)])))
  assert.equal(r.total.earned, 0)
  assert.equal(r.type.name, '새싹형')
  assert.equal(r.startLevel.name, 'Lv.1 어휘')
  assert.equal(r.wrongAnswers.length, 15)
  assert.ok(r.topTag)
})

test('무응답 → 0점, unanswered 15개, 오답 사유는 없음', () => {
  const r = scoreDiagnostic(data, {})
  assert.equal(r.total.earned, 0)
  assert.equal(r.unanswered.length, 15)
  assert.equal(r.wrongAnswers[0].errorTag, null)
  assert.equal(r.topTag, null)
})

test('엑셀 예시 답안 → 80/60/20/60 · 낱말 수집가형 · 추론 · Lv.2', () => {
  const r = scoreDiagnostic(data, SAMPLE)
  assert.deepEqual(pct(r), { 어휘: 80, '내용 이해': 60, 추론: 20, 글쓰기: 60 })
  assert.equal(r.total.earned, 11)
  assert.equal(r.type.name, '낱말 수집가형')
  assert.equal(r.weakest.area, '추론')
  assert.equal(r.weakest.message, '추론 영역을 먼저 키워 봐요')
  assert.equal(r.startLevel.name, 'Lv.2 문장')
  assert.deepEqual(r.areas.map((a) => a.grade), ['잘해요', '보통', '연습 필요', '보통'])
})

test('영역 %는 항상 20% 단위 (무작위 2000회)', () => {
  let seed = 7
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  for (let t = 0; t < 2000; t++) {
    const a = Object.fromEntries(data.questions.map((q) => [q.id, 1 + Math.floor(rnd() * 4)]))
    scoreDiagnostic(data, a).areas.forEach((x) => assert.equal(x.percent % 20, 0, `${x.area} ${x.percent}`))
  }
})

test('더 키울 능력 동점: 어휘 → 내용 이해 → 추론 → 글쓰기 순으로 먼저 추천', () => {
  const a = { ...key }
  ;['dx-01', 'dx-04', 'dx-09', 'dx-12', 'dx-02', 'dx-05', 'dx-07', 'dx-13'].forEach((id) => (a[id] = wrongOf(id)))
  const r = scoreDiagnostic(data, a) // 어휘 0%, 내용 이해 0%, 추론·글쓰기 100%
  assert.equal(r.areas[0].percent, 0)
  assert.equal(r.areas[1].percent, 0)
  assert.equal(r.weakest.area, '어휘')

  const b = { ...key }
  ;['dx-02', 'dx-05', 'dx-07', 'dx-13', 'dx-03', 'dx-06', 'dx-10', 'dx-14'].forEach((id) => (b[id] = wrongOf(id)))
  assert.equal(scoreDiagnostic(data, b).weakest.area, '내용 이해') // 내용 이해·추론 동점 → 내용 이해 먼저
})

test('최고 영역 동점: 추론 > 글쓰기 > 어휘 > 내용 이해 (눈치 탐정형)', () => {
  const a = { ...key }
  a['dx-12'] = wrongOf('dx-12')
  a['dx-13'] = wrongOf('dx-13')
  const r = scoreDiagnostic(data, a)
  assert.deepEqual(pct(r), { 어휘: 60, '내용 이해': 60, 추론: 100, 글쓰기: 100 })
  assert.equal(r.type.name, '눈치 탐정형')
})

test('균형형: 최고−최저가 정확히 20%p (부동소수점 오차 없이)', () => {
  const a = { ...key }
  a['dx-12'] = wrongOf('dx-12') // 어휘 60%
  ;['dx-02', 'dx-06', 'dx-11'].forEach((id) => (a[id] = wrongOf(id))) // 나머지 80%
  const r = scoreDiagnostic(data, a)
  assert.deepEqual(pct(r), { 어휘: 60, '내용 이해': 80, 추론: 80, 글쓰기: 80 })
  assert.equal(r.type.name, '균형형')
})

test('어휘만 80%, 나머지 100% → 만능 문해력형', () => {
  const a = { ...key }
  a['dx-01'] = wrongOf('dx-01')
  assert.equal(scoreDiagnostic(data, a).type.name, '만능 문해력형')
})

test('toSkills: 앱 공통 능력치 모양 (정답률이 영역 %와 같음)', () => {
  const skills = toSkills(scoreDiagnostic(data, SAMPLE))
  assert.deepEqual(skills, {
    vocab: { correct: 4, total: 5 },
    comprehension: { correct: 3, total: 5 },
    inference: { correct: 1, total: 5 },
    writing: { correct: 3, total: 5 },
  })
  assert.equal(accuracy(skills.inference), 20)
})

test('buildDiagnosisRecord: Firestore에 저장 가능한 값 (undefined 없음)', () => {
  const record = buildDiagnosisRecord(data, scoreDiagnostic(data, SAMPLE))
  assert.equal(record.weakestSkill, 'inference')
  assert.equal(record.startLevel, 2)
  assert.equal(record.type.bestSkill, 'vocab')
  assert.equal(record.answers['dx-01'].correct, false)
  assert.equal(record.answers['dx-02'].correct, true)
  assert.doesNotMatch(JSON.stringify(record, (_, v) => (v === undefined ? '__undefined__' : v)), /__undefined__/)

  const none = buildDiagnosisRecord(data, scoreDiagnostic(data, key)) // 형이 만능형이면 bestSkill은 null
  assert.equal(none.type.bestSkill, null)
  assert.deepEqual(none.answers['dx-01'], { choice: 3, correct: true })
})

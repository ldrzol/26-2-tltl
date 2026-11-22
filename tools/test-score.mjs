// 채점 로직 테스트: node tools/test-score.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { scoreDiagnostic } from '../src/diagnostic/score.mjs';

const data = JSON.parse(fs.readFileSync(new URL('../data/diagnostic.json', import.meta.url), 'utf8'));
const key = Object.fromEntries(data.questions.map((q) => [q.id, q.answer]));
const wrongOf = (id) => (key[id] % 4) + 1;                          // 항상 틀리는 보기
const pct = (r) => Object.fromEntries(r.areas.map((a) => [a.area, a.percent]));
let n = 0; const ok = (name, fn) => { fn(); n++; console.log('  ✓', name); };

ok('전부 정답 → 만능 문해력형 · 100% · Lv.4 · "모두 잘해요"', () => {
  const r = scoreDiagnostic(data, key);
  assert.equal(r.total.earned, 20); assert.equal(r.type.name, '만능 문해력형');
  assert.deepEqual(pct(r), { 어휘: 100, '내용 이해': 100, 추론: 100, 글쓰기: 100 });
  assert.equal(r.level.name, 'Lv.4 긴 글'); assert.equal(r.weakest.area, '어휘'); assert.match(r.weakest.message, /모두 잘해요/);
  assert.equal(r.wrongAnswers.length, 0);
});
ok('전부 오답 → 새싹형 · 0% · Lv.1', () => {
  const r = scoreDiagnostic(data, Object.fromEntries(data.questions.map((q) => [q.id, wrongOf(q.id)])));
  assert.equal(r.total.earned, 0); assert.equal(r.type.name, '새싹형'); assert.equal(r.level.name, 'Lv.1 어휘');
  assert.equal(r.wrongAnswers.length, 15); assert.ok(r.topTag);
});
ok('무응답 → 0점, unanswered 15개, 오답 해설은 정답 해설만', () => {
  const r = scoreDiagnostic(data, {});
  assert.equal(r.total.earned, 0); assert.equal(r.unanswered.length, 15); assert.equal(r.wrongAnswers[0].errorTag, null);
});
// 엑셀 채점시뮬레이터 예시 답안 (어휘 80 / 내용 60 / 추론 20 / 글쓰기 60)
const sample = { 'dx-01': 1, 'dx-02': 1, 'dx-03': 1, 'dx-04': 2, 'dx-05': 1, 'dx-06': 1, 'dx-07': 1, 'dx-08': 4, 'dx-09': 3, 'dx-10': 1, 'dx-11': 4, 'dx-12': 2, 'dx-13': 4, 'dx-14': 2, 'dx-15': 1 };
ok('엑셀 예시 답안 → 80/60/20/60 · 낱말 수집가형 · 추론 · Lv.2', () => {
  const r = scoreDiagnostic(data, sample);
  assert.deepEqual(pct(r), { 어휘: 80, '내용 이해': 60, 추론: 20, 글쓰기: 60 });
  assert.equal(r.total.earned, 11); assert.equal(r.type.name, '낱말 수집가형');
  assert.equal(r.weakest.area, '추론'); assert.equal(r.weakest.message, '추론 영역을 먼저 키워 봐요');
  assert.equal(r.level.name, 'Lv.2 문장');
  assert.deepEqual(r.areas.map((a) => a.grade), ['잘해요', '보통', '연습 필요', '보통']);
});
ok('영역 %는 항상 20% 단위 (무작위 2000회)', () => {
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let t = 0; t < 2000; t++) {
    const a = Object.fromEntries(data.questions.map((q) => [q.id, 1 + Math.floor(rnd() * 4)]));
    scoreDiagnostic(data, a).areas.forEach((x) => assert.ok(x.percent % 20 === 0, `${x.area} ${x.percent}`));
  }
});
ok('동점: 가장 부족한 영역은 어휘→내용→추론→글쓰기 순', () => {
  // 어휘·내용 이해 둘 다 20%, 나머지는 만점
  const a = { ...key };
  ['dx-04', 'dx-09', 'dx-12', 'dx-05', 'dx-07', 'dx-13'].forEach((id) => { a[id] = wrongOf(id); });
  a['dx-01'] = wrongOf('dx-01'); a['dx-02'] = wrongOf('dx-02');   // 어휘 하·내용 하 → 둘 다 0점, 나머지 만점
  const r = scoreDiagnostic(data, a);
  assert.equal(r.areas[0].percent, 0); assert.equal(r.areas[1].percent, 0);
  assert.equal(r.weakest.area, '어휘');
});
ok('동점: 최고 영역 동점이면 추론 > 글쓰기 > 어휘 > 내용 이해', () => {
  // 추론·글쓰기 100%, 어휘·내용 60% → 눈치 탐정형
  const a = { ...key }; a['dx-12'] = wrongOf('dx-12'); a['dx-13'] = wrongOf('dx-13');   // 상(2점) 틀림 → 60%
  const r = scoreDiagnostic(data, a);
  assert.deepEqual(pct(r), { 어휘: 60, '내용 이해': 60, 추론: 100, 글쓰기: 100 });
  assert.equal(r.type.name, '눈치 탐정형');
});
ok('균형형: 최고−최저가 정확히 20%p (80% vs 60%, 부동소수점 오차 없이)', () => {
  const a = { ...key };
  a['dx-12'] = wrongOf('dx-12');                                   // 어휘 60%
  ['dx-02', 'dx-06', 'dx-11'].forEach((id) => { a[id] = wrongOf(id); });   // 내용·추론·글쓰기 80%
  const r = scoreDiagnostic(data, a);
  assert.deepEqual(pct(r), { 어휘: 60, '내용 이해': 80, 추론: 80, 글쓰기: 80 });
  assert.equal(r.type.name, '균형형');
});
ok('어휘만 80%, 나머지 100% → 만능 문해력형 (전체 95%, 모든 영역 80% 이상)', () => {
  const a = { ...key }; a['dx-01'] = wrongOf('dx-01');
  assert.equal(scoreDiagnostic(data, a).type.name, '만능 문해력형');
});
console.log(`\n${n}개 테스트 통과`);

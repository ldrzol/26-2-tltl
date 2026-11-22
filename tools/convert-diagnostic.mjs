// 초기 진단 테스트 엑셀 → JSON 변환기
// 사용법: node tools/convert-diagnostic.mjs <엑셀파일.xlsx> [출력.json]
//   예) node tools/convert-diagnostic.mjs source/진단테스트_ver2.xlsx data/diagnostic.json
import ExcelJS from 'exceljs';
import fs from 'node:fs';

const [, , inFile, outFile = 'data/diagnostic.json'] = process.argv;
if (!inFile) {
  console.error('사용법: node tools/convert-diagnostic.mjs <엑셀파일.xlsx> [출력.json]');
  process.exit(1);
}

const AREAS = ['어휘', '내용 이해', '추론', '글쓰기'];
const DIFFS = ['하', '중', '상'];

// ---------- 셀 읽기 도우미 ----------
function val(cell) {
  let v = cell.value;
  if (v === null || v === undefined) return null;
  if (typeof v === 'object') {
    if ('result' in v) v = v.result;            // 수식 셀 → 계산된 값
    else if (v.richText) v = v.richText.map((t) => t.text).join('');
    else if (v.text) v = v.text;
  }
  if (v === null || v === undefined) return null;
  return typeof v === 'string' ? v.trim() : v;
}
const str = (cell) => { const v = val(cell); return v === null ? '' : String(v); };
const num = (cell) => { const v = val(cell); return v === null || v === '' ? null : Number(v); };

function headerMap(ws, row) {                    // { '헤더이름': 열번호 }
  const m = {};
  ws.getRow(row).eachCell((c, col) => { const t = str(c); if (t) m[t] = col; });
  return m;
}
function findRow(ws, pred, from = 1) {           // 조건에 맞는 첫 행 번호
  for (let r = from; r <= ws.rowCount; r++) if (pred(ws.getRow(r))) return r;
  return -1;
}
function need(ws, pred, what) {
  const r = findRow(ws, pred);
  if (r < 0) throw new Error(`'${ws.name}' 시트에서 ${what}을(를) 찾지 못했어요.`);
  return r;
}

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(inFile);
const sheet = (n) => { const s = wb.getWorksheet(n); if (!s) throw new Error(`'${n}' 시트가 없어요.`); return s; };

// ---------- 지문 ----------
const wsP = sheet('지문');
const hP = need(wsP, (r) => str(r.getCell(1)) === 'ID', "'ID' 머리글 행");
const pm = headerMap(wsP, hP);
const passages = [];
for (let r = hP + 1; r <= wsP.rowCount; r++) {
  const id = str(wsP.getCell(r, pm['ID']));
  if (!/^P\d+/.test(id)) continue;
  const text = str(wsP.getCell(r, pm['본문']));
  passages.push({
    id,
    title: str(wsP.getCell(r, pm['작품'])),
    author: str(wsP.getCell(r, pm['작가'])),
    range: str(wsP.getCell(r, pm['발췌 범위'])),
    text,
    charCount: [...text].length,
  });
}

// ---------- 점수규칙 ----------
const wsR = sheet('점수규칙');

// (1) 영역 × 난이도 배점표
const hM = need(wsR, (r) => str(r.getCell(2)) === '영역' && str(r.getCell(3)) === '하', '배점표 머리글');
const points = {};
for (let r = hM + 1; r <= hM + 8; r++) {
  const a = str(wsR.getCell(r, 2));
  if (!AREAS.includes(a)) break;
  points[a] = {};
  DIFFS.forEach((d, i) => { points[a][d] = num(wsR.getCell(r, 3 + i)); });
}

// (2) 기준값 (라벨로 찾기)
const labelVal = (prefix) => {
  const r = need(wsR, (row) => str(row.getCell(2)).startsWith(prefix), `'${prefix}' 기준값`);
  return num(wsR.getCell(r, 3));
};
const thresholds = {
  startLevelPass: labelVal('시작 레벨 통과 기준'),
  allRounder: { total: labelVal('만능형: 전체'), eachArea: labelVal('만능형: 모든 영역') },
  sprout: { maxAll: labelVal('새싹형') },
  balanced: { maxGap: labelVal('균형형') },
  grade: { good: labelVal('영역 등급 ‘잘해요’'), normal: labelVal('영역 등급 ‘보통’') },
};
const readingSpeed = labelVal('읽기 속도');

// (3) 형 판정 표: [순서, 조건, 이름, 설명]
const hT = need(wsR, (r) => str(r.getCell(1)) === '순서' && str(r.getCell(3)) === '형 이름(임시)', '형 판정 표');
const typeRows = [];
for (let r = hT + 1; str(wsR.getCell(r, 1)); r++) {
  typeRows.push({ order: num(wsR.getCell(r, 1)), cond: str(wsR.getCell(r, 2)), name: str(wsR.getCell(r, 3)), desc: str(wsR.getCell(r, 4)) });
}
const typeByRule = (re) => typeRows.find((t) => re.test(t.cond));
const overallTypes = {
  allRounder: typeByRule(/전체 ≥/),
  sprout: typeByRule(/모든 영역 ≤/),
  balanced: typeByRule(/격차/),
};
const areaTypes = {};      // 영역 → {name, desc}
const typeTieOrder = [];   // 동점이면 앞선 영역이 우선
for (const t of typeRows) {
  if (!t.cond.includes('최고 영역')) continue;
  const area = AREAS.find((a) => t.cond.includes(a));
  if (!area) continue;
  areaTypes[area] = { name: t.name, desc: t.desc };
  typeTieOrder.push(area);
}
for (const [k, v] of Object.entries(overallTypes)) {
  if (!v) throw new Error(`형 판정 표에서 '${k}' 행을 찾지 못했어요.`);
  overallTypes[k] = { name: v.name, desc: v.desc };
}

// (4) 시작 레벨 표
const hL = need(wsR, (r) => str(r.getCell(1)) === '순서' && str(r.getCell(3)) === '시작 레벨', '시작 레벨 표');
const levels = [];
for (let r = hL + 1; str(wsR.getCell(r, 1)); r++) {
  levels.push({ id: num(wsR.getCell(r, 1)), name: str(wsR.getCell(r, 3)), desc: str(wsR.getCell(r, 4)) });
}

// (5) 영역 등급 문구
const hG = need(wsR, (r) => str(r.getCell(1)) === '등급' && str(r.getCell(2)) === '결과 화면 문구', '영역 등급 표');
const gradeMessages = {};
for (let r = hG + 1; str(wsR.getCell(r, 1)); r++) gradeMessages[str(wsR.getCell(r, 1))] = str(wsR.getCell(r, 2));

// (6) 더 키울 능력 동점 우선순위
const hW = need(wsR, (r) => str(r.getCell(1)) === '우선순위' && str(r.getCell(2)) === '영역', '우선순위 표');
const prio = [];
for (let r = hW + 1; str(wsR.getCell(r, 2)); r++) prio.push({ rank: num(wsR.getCell(r, 1)), area: str(wsR.getCell(r, 2)), reason: str(wsR.getCell(r, 3)) });
prio.sort((a, b) => a.rank - b.rank);
const weakestTieOrder = prio.map((p) => p.area);

// ---------- 오답 태그 ----------
const wsT = sheet('오답태그');
const hTag = need(wsT, (r) => str(r.getCell(1)) === '태그', "'태그' 머리글");
const tm = headerMap(wsT, hTag);
const errorTags = [];
for (let r = hTag + 1; str(wsT.getCell(r, 1)); r++) {
  errorTags.push({
    tag: str(wsT.getCell(r, tm['태그'])),
    areas: str(wsT.getCell(r, tm['주로 나오는 영역'])),
    meaning: str(wsT.getCell(r, tm['의미'])),
    message: str(wsT.getCell(r, tm['결과 화면 문구(안)'])),
  });
}
const tagNames = new Set(errorTags.map((t) => t.tag));

// ---------- 문항 ----------
const wsQ = sheet('문항');
const qm = headerMap(wsQ, 1);
const circ = ['①', '②', '③', '④'];
const questions = [];
const problems = [];
for (let r = 2; r <= wsQ.rowCount; r++) {
  const id = str(wsQ.getCell(r, qm['번호']));
  if (!id) continue;
  const area = str(wsQ.getCell(r, qm['영역']));
  const difficulty = str(wsQ.getCell(r, qm['난이도']));
  const answer = num(wsQ.getCell(r, qm['정답']));
  const kind = str(wsQ.getCell(r, qm['유형']));
  const options = circ.map((c, i) => {
    const no = i + 1;
    const isAnswer = no === answer;
    const tag = str(wsQ.getCell(r, qm[`오답 태그 ${c}`])) || null;
    const why = str(wsQ.getCell(r, qm[`오답 해설 ${c}`])) || null;
    if (!isAnswer && !tag) problems.push(`${id}: 오답 보기 ${c}에 태그가 없어요`);
    if (tag && !tagNames.has(tag)) problems.push(`${id}: 모르는 오답 태그 '${tag}' (${c})`);
    return { no, text: str(wsQ.getCell(r, qm[c])), errorTag: isAnswer ? null : tag, whyWrong: isAnswer ? null : why };
  });
  const points_ = points[area]?.[difficulty];
  if (points_ == null) problems.push(`${id}: 배점표에 ${area}/${difficulty}가 없어요`);
  const sheetPoints = num(wsQ.getCell(r, qm['배점']));
  if (sheetPoints !== null && sheetPoints !== points_) problems.push(`${id}: 엑셀 배점(${sheetPoints})과 배점표(${points_})가 달라요`);
  if (!(answer >= 1 && answer <= 4)) problems.push(`${id}: 정답이 1~4가 아니에요`);
  questions.push({
    id,
    passageId: str(wsQ.getCell(r, qm['지문'])),
    area,
    difficulty,
    points: points_,
    kind,
    isKiller: kind.startsWith('킬러'),
    stem: str(wsQ.getCell(r, qm['문제'])),
    options,
    answer,
    evidence: str(wsQ.getCell(r, qm['근거 문장'])),
    explanation: str(wsQ.getCell(r, qm['정답 해설'])),
  });
}

// ---------- 검사 ----------
const areaMax = Object.fromEntries(AREAS.map((a) => [a, questions.filter((q) => q.area === a).reduce((s, q) => s + q.points, 0)]));
const pIds = new Set(passages.map((p) => p.id));
questions.forEach((q) => { if (!pIds.has(q.passageId)) problems.push(`${q.id}: 지문 ${q.passageId}이(가) 없어요`); });
const maxSet = new Set(Object.values(areaMax));
if (maxSet.size !== 1) problems.push(`영역 만점이 서로 달라요: ${JSON.stringify(areaMax)} (영역 %가 20% 단위가 아닐 수 있어요)`);
if (problems.length) { console.error('⚠️ 확인이 필요해요:\n- ' + problems.join('\n- ')); process.exit(1); }

const out = {
  schemaVersion: 1,
  title: '또랑또랑 초기 진단 테스트',
  meta: {
    questionCount: questions.length,
    totalPoints: questions.reduce((s, q) => s + q.points, 0),
    areaMaxPoints: areaMax,
    passageChars: passages.reduce((s, p) => s + p.charCount, 0),
    readingSpeedPerMin: readingSpeed,
  },
  scoring: {
    areas: AREAS,
    difficulties: DIFFS,
    points,
    thresholds,
    gradeMessages,
    overallTypes,
    areaTypes,
    typeTieOrder,
    weakestTieOrder,
    weakestReasons: Object.fromEntries(prio.map((p) => [p.area, p.reason])),
    levels,
  },
  errorTags,
  passages,
  questions,
};
fs.mkdirSync(outFile.includes('/') ? outFile.slice(0, outFile.lastIndexOf('/')) : '.', { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(out, null, 2), 'utf8');
console.log(`✅ ${outFile} 저장: 지문 ${passages.length}개, 문항 ${questions.length}개, 오답 태그 ${errorTags.length}개, 총점 ${out.meta.totalPoints}점 (영역 만점 ${[...maxSet]})`);

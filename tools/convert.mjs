// 엑셀(.xlsx) → JSON 변환 스크립트 (Node.js)
// 사용법: node tools/convert.mjs <엑셀파일> <결과.json> <제목>
// 예)    node tools/convert.mjs tools/source/흥부전.xlsx src/data/heungbu.json 흥부전
import ExcelJS from "exceljs";
import fs from "node:fs";

const [src, dst, title] = process.argv.slice(2);
if (!src || !dst || !title) {
  console.error("사용법: node tools/convert.mjs <엑셀파일> <결과.json> <제목>");
  process.exit(1);
}

// 셀 값을 순수 문자열/숫자로 정리 (서식 있는 텍스트, 수식 결과 등 처리)
function cellValue(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "object") {
    if (v.richText) return v.richText.map((t) => t.text).join("");
    if ("result" in v) return v.result ?? null; // 수식 셀
    if (v.text) return v.text;
  }
  return v;
}

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(src);

// 시트를 [{헤더: 값, ...}, ...] 형태로 읽기 (빈 행은 건너뜀)
function rows(name) {
  const ws = wb.getWorksheet(name);
  if (!ws) throw new Error(`시트를 찾을 수 없습니다: ${name}`);
  const head = [];
  ws.getRow(1).eachCell({ includeEmpty: true }, (c, i) => {
    head[i] = cellValue(c.value);
  });
  const out = [];
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const obj = {};
    let has = false;
    head.forEach((h, i) => {
      if (!h) return;
      const v = cellValue(row.getCell(i).value);
      obj[h] = v;
      if (v !== null) has = true;
    });
    if (has) out.push(obj);
  });
  return out;
}

const passages = rows("지문").map((r) => {
  const [id, ...rest] = String(r["에피소드"]).split("·");
  const p = {
    id: id.trim(),
    order: r["순서"],
    title: rest.join("·").trim(),
    text: r["지문"],
    charCount: [...r["지문"]].length, // 엑셀 수식(=LEN) 대신 직접 계산
  };
  if (r["막"]) p.act = r["막"];
  if (r["원문 위치"]) p.sourceRange = r["원문 위치"];
  return p;
});

const questions = rows("문제").map((r) => ({
  id: r["번호"],
  passageId: r["연결 지문"],
  type: r["유형"],
  question: r["문제"],
  options: [r["①"], r["②"], r["③"], r["④"]],
  answer: "①②③④".indexOf(r["정답"]) + 1, // ① → 1
  explanation: r["해설"],
  difficulty: r["난이도"],
}));

const writing = rows("글쓰기·피드백").map((r) => ({
  passageId: r["에피소드"],
  level: r["길이 단계"],
  prompt: r["글쓰기 문제"],
  criteria: [r["평가 기준 ①"], r["평가 기준 ②"], r["평가 기준 ③"]],
  sampleAnswer: r["예시 답안"],
}));

// 규칙 시트 이름이 파일마다 다름 (피드백 규칙 / 평가 기준)
const ruleSheet = wb.getWorksheet("피드백 규칙") ? "피드백 규칙" : "평가 기준";
const feedbackRules = rows(ruleSheet)
  .map((r) => Object.values(r)[1])
  .filter(Boolean);

const data = { title, passages, questions, writing, feedbackRules };
fs.writeFileSync(dst, JSON.stringify(data, null, 2) + "\n", "utf-8");
console.log(dst, passages.length, questions.length, writing.length, feedbackRules.length);

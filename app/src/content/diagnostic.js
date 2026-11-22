/**
 * 초기 진단 콘텐츠 읽기 — 진단 화면과 채점은 진단 JSON을 직접 import하지 않고 여기를 거친다.
 * JSON은 `node tools/convert-diagnostic.mjs`가 엑셀에서 만든다. (docs/diagnosis.md)
 */
import raw from './diagnostic.json'

/** 진단 데이터 전체 (지문·문항·채점 기준) */
export function getDiagnostic() {
  return raw
}

/** 지문 하나 (없으면 null) */
export function getPassage(passageId) {
  return raw.passages.find((p) => p.id === passageId) ?? null
}

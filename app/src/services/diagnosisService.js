import { serverTimestamp, updateDoc } from 'firebase/firestore'
import { userDoc } from './userService'

/**
 * 초기 진단 완료: 진단 결과 저장 + 레벨 0 → 1
 *
 * record = logic/diagnostic.js의 buildDiagnosisRecord(data, result) 결과
 *   { version, skills, grades, type, weakestSkill, startLevel, answers, errorTags }
 * → users.diagnosis = { ...record, completedAt }
 * 필드 설명: docs/data-structure.md 3절 · docs/diagnosis.md
 */
export function completeDiagnosis(uid, record) {
  return updateDoc(userDoc(uid), {
    diagnosis: { ...record, completedAt: serverTimestamp() },
    level: 1,
    updatedAt: serverTimestamp(),
  })
}

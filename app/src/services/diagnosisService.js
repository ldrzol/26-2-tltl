import { serverTimestamp, updateDoc } from 'firebase/firestore'
import { userDoc } from './userService'

/**
 * 초기 진단 완료: 진단 결과 저장 + 레벨 0 → 1
 * users.diagnosis = { skills: { vocab: { correct, total }, ... }, completedAt }
 * ⚠️ 필드 이름은 진단 담당(전예랑)과 맞출 것 — docs/data-structure.md 11절
 */
export function completeDiagnosis(uid, skills) {
  return updateDoc(userDoc(uid), {
    diagnosis: { skills, completedAt: serverTimestamp() },
    level: 1,
    updatedAt: serverTimestamp(),
  })
}

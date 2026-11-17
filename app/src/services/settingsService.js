import {
  collection,
  deleteField,
  getDocs,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'
import { userDoc } from './userService'

/**
 * 설정 일부만 저장
 * 예) updateSettings(uid, { fontSize: 'large' })
 *     updateSettings(uid, { theme: 'dark', lineHeight: 'wide' })
 */
export function updateSettings(uid, changes) {
  const data = { updatedAt: serverTimestamp() }
  for (const [key, value] of Object.entries(changes)) {
    data[`settings.${key}`] = value
  }
  return updateDoc(userDoc(uid), data)
}

/**
 * 학습 기록 초기화 → 레벨 0 (초기 진단부터 다시)
 * - 지움: progress 전부, 경험치, 레벨, 능력치, 완료 에피소드, 이어하기
 * - 남김: 계정·닉네임·설정, 출석 기록 (지우면 누적 보상을 다시 받을 수 있게 되므로)
 */
export async function resetLearning(uid) {
  const progress = await getDocs(collection(db, 'users', uid, 'progress'))
  const batch = writeBatch(db)
  progress.forEach((d) => batch.delete(d.ref))
  batch.update(userDoc(uid), {
    level: 0,
    exp: 0,
    stats: deleteField(),
    completedEpisodeIds: [],
    current: null,
    updatedAt: serverTimestamp(),
  })
  // 한 번에 최대 500개까지 — 에피소드 수가 그보다 훨씬 적어서 충분
  await batch.commit()
}

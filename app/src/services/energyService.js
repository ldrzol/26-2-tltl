import { runTransaction, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { userDoc } from './userService'
import { spendEnergy } from '../logic/energy'
import { todayKey } from '../utils/date'

export class EnergyError extends Error {
  constructor(remaining) {
    super('에너지가 부족해요. 내일 다시 충전돼요!')
    this.code = 'no-energy'
    this.remaining = remaining
  }
}

/**
 * transaction 안에서 에너지 1개 사용 (부족하면 EnergyError)
 * 진행 저장의 startEpisode transaction에서 그대로 불러 쓰도록 분리해 둠
 * userData는 호출하는 쪽에서 tx.get으로 미리 읽어서 넘긴다 (transaction은 읽기 → 쓰기 순서)
 */
export function applySpendEnergy(tx, uid, userData, today = todayKey()) {
  const result = spendEnergy(userData.energy, today)
  if (!result.ok) throw new EnergyError(result.remaining)
  tx.update(userDoc(uid), { energy: result.next, updatedAt: serverTimestamp() })
  return result.remaining
}

/**
 * 에너지만 단독으로 사용 (진행 저장 기능이 붙기 전 테스트용)
 * transaction이라 버튼을 빠르게 두 번 눌러도 두 번 빠지지 않는다
 */
export function spendEpisodeEnergy(uid, today = todayKey()) {
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(userDoc(uid))
    if (!snap.exists()) throw new Error('사용자 문서가 없습니다.')
    return applySpendEnergy(tx, uid, snap.data(), today)
  })
}

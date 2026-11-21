import { arrayUnion, increment, runTransaction } from 'firebase/firestore'
import { db } from '../firebase'
import { userDoc } from './userService'
import { applyEpisodeRewards } from './rewardService'
import { SKILLS } from '../config/gameRules'

/**
 * transaction 안에서 학습 결과 반영: 누적 능력치(stats) 더하기 + 완료 에피소드 기록
 * 진행 저장의 completeEpisode transaction에서 그대로 불러 쓰도록 분리해 둠
 */
export function applyEpisodeResult(tx, uid, { episodeId, skills }) {
  const update = { completedEpisodeIds: arrayUnion(episodeId) }
  for (const key of SKILLS) {
    const s = skills[key]
    if (!s?.total) continue
    update[`stats.${key}.correct`] = increment(s.correct)
    update[`stats.${key}.total`] = increment(s.total)
  }
  tx.update(userDoc(uid), update)
}

/**
 * 에피소드 완료 처리 한 번에: 결과(능력치) + 보상(출석·경험치·레벨)
 * 진행 저장 기능이 붙기 전 테스트용 — 이후엔 completeEpisode가 같은 일을 progress 저장과 함께 한다
 */
export function finishEpisode(uid, { episodeId, skills, episodeExp, today }) {
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(userDoc(uid))
    if (!snap.exists()) throw new Error('사용자 문서가 없습니다.')
    const reward = applyEpisodeRewards(tx, uid, snap.data(), { episodeId, episodeExp, today })
    applyEpisodeResult(tx, uid, { episodeId, skills })
    return reward
  })
}

import { arrayUnion, doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { userDoc } from './userService'
import { computeAttendance } from '../logic/attendance'
import { applyExp } from '../logic/level'
import { todayKey } from '../utils/date'

const attendanceDoc = (uid, date) => doc(db, 'users', uid, 'attendance', date)

/**
 * 에피소드 완료 보상을 transaction 안에서 적용 (출석 + 출석 보상 + 경험치 + 레벨업)
 * 진행 저장의 completeEpisode transaction에서 그대로 불러 쓰도록 분리해 둠
 *
 * ⚠️ Firestore transaction은 "읽기를 모두 끝낸 뒤 쓰기"여야 한다.
 *    userData는 호출하는 쪽에서 tx.get으로 미리 읽어서 넘긴다.
 */
export function applyEpisodeRewards(tx, uid, userData, { episodeId, episodeExp, today = todayKey() }) {
  const attendance = computeAttendance(userData.attendance, today)
  const attendanceExp = attendance.isNew ? attendance.reward.exp + attendance.reward.bonusExp : 0
  const level = applyExp(userData, episodeExp + attendanceExp)

  const userUpdate = {
    exp: level.exp,
    level: level.level,
    updatedAt: serverTimestamp(),
  }
  if (attendance.isNew) {
    userUpdate.attendance = {
      lastDate: attendance.lastDate,
      streak: attendance.streak,
      totalDays: attendance.totalDays,
    }
  }
  tx.update(userDoc(uid), userUpdate)

  // 오늘 출석 문서: 첫 완료면 생성, 아니면 완료 에피소드만 추가
  const dayData = { completedEpisodeIds: arrayUnion(episodeId) }
  if (attendance.isNew) {
    Object.assign(dayData, {
      reward: attendance.reward,
      streak: attendance.streak,
      totalDays: attendance.totalDays,
      createdAt: serverTimestamp(),
    })
  }
  tx.set(attendanceDoc(uid, today), dayData, { merge: true })

  // 화면(학습 결과 → 출석체크 완료!)에 넘겨줄 결과
  return {
    episodeExp,
    totalExpGained: episodeExp + attendanceExp,
    level,
    attendance: attendance.isNew
      ? {
          streak: attendance.streak,
          totalDays: attendance.totalDays,
          rewardExp: attendance.reward.exp,
          bonusExp: attendance.reward.bonusExp,
        }
      : null,
  }
}

/** 보상만 단독으로 적용 (진행 저장 기능이 붙기 전 테스트용) */
export function grantEpisodeRewards(uid, options) {
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(userDoc(uid))
    if (!snap.exists()) throw new Error('사용자 문서가 없습니다.')
    return applyEpisodeRewards(tx, uid, snap.data(), options)
  })
}

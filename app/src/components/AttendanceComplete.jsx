import { ATTENDANCE_REWARD } from '../config/gameRules'
import { daysUntilBonus } from '../logic/attendance'
import catSheet from '../assets/figma/cat-sheet.png'

/**
 * "출석체크 완료!" 화면 — 오늘 첫 에피소드 완료 후, 학습 결과 화면 다음에 보여준다
 * @param attendance applyEpisodeRewards 결과의 attendance { streak, totalDays, rewardExp, bonusExp }
 */
export default function AttendanceComplete({ attendance, onClose }) {
  const { streak, totalDays, rewardExp, bonusExp } = attendance
  const every = ATTENDANCE_REWARD.BONUS_EVERY_DAYS
  const filled = totalDays % every === 0 ? every : totalDays % every
  const remain = daysUntilBonus(totalDays)

  return (
    <div className="reward-card" role="dialog" aria-labelledby="attendance-title">
      <span className="attendance-art reward-art" aria-hidden="true">
        <img src={catSheet} alt="" />
      </span>
      <h2 id="attendance-title" className="reward-title">출석체크 완료!</h2>

      <p className="reward-exp">+{rewardExp} XP</p>
      {bonusExp > 0 && (
        <p className="reward-bonus">누적 {totalDays}일 보상 +{bonusExp} XP</p>
      )}

      <div className="reward-stats">
        <div>
          <strong>{streak}일</strong>
          <span>연속 출석</span>
        </div>
        <div>
          <strong>{totalDays}일</strong>
          <span>누적 출석</span>
        </div>
      </div>

      {/* 누적 보상까지 진행도 */}
      <div className="reward-dots" aria-label={`누적 보상까지 ${filled}/${every}일`}>
        {Array.from({ length: every }, (_, i) => (
          <span key={i} className={i < filled ? 'dot on' : 'dot'} />
        ))}
      </div>
      <p className="reward-hint">
        {bonusExp > 0 ? '다음 누적 보상까지' : '누적 보상까지'} {remain}일 남았어요
      </p>

      <button type="button" className="btn btn-primary btn-block" onClick={onClose}>
        확인
      </button>
    </div>
  )
}

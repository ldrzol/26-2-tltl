import { levelProgress } from '../logic/level'

/** 레벨 + 경험치 바 (홈 상단, 학습 결과 화면 등에서 사용) */
export default function LevelBadge({ exp, level }) {
  const { current, needed, ratio } = levelProgress({ exp, level })
  return (
    <div className="level-badge">
      <span className="level-badge-lv">Lv. {level}</span>
      <div
        className="level-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={needed}
        aria-valuenow={current}
        aria-label="다음 레벨까지 경험치"
      >
        <div className="level-bar-fill" style={{ width: `${ratio * 100}%` }} />
      </div>
      <span className="level-badge-exp">
        {current} / {needed} XP
      </span>
    </div>
  )
}

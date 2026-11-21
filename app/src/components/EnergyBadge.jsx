import { ENERGY } from '../config/gameRules'
import { currentEnergy } from '../logic/energy'
import { todayKey } from '../utils/date'

/** 에너지 표시 ⚡⚡⚡○ 3/4 (홈 상단 등에서 사용) */
export default function EnergyBadge({ energy, today = todayKey() }) {
  const now = currentEnergy(energy, today)
  const max = Math.max(ENERGY.DAILY_MAX, now)

  return (
    <div className="energy-badge" aria-label={`에너지 ${now}개 중 ${ENERGY.DAILY_MAX}개`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < now ? 'bolt on' : 'bolt'} aria-hidden="true">
          ⚡
        </span>
      ))}
      <span className="energy-count">
        {now}/{ENERGY.DAILY_MAX}
      </span>
    </div>
  )
}

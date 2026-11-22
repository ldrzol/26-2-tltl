import { NavLink, useNavigate } from 'react-router-dom'
import { ENERGY } from '../config/gameRules'
import { currentEnergy } from '../logic/energy'
import { levelProgress } from '../logic/level'
import { todayKey } from '../utils/date'
import iconStamp from '../assets/figma/icon-stamp.svg'
import iconHouse from '../assets/figma/icon-house.svg'
import iconDots from '../assets/figma/icon-dots.svg'
import iconX from '../assets/figma/icon-x.svg'
import caretLeft from '../assets/figma/caret-left-28.svg'
import energyStar from '../assets/figma/energy-full.svg'

/** 하단 바: 출석(도장) · 홈 · 설정(…) — Figma "하단 바" */
export function BottomNav() {
  const items = [
    { to: '/attendance', icon: iconStamp, label: '출석체크' },
    { to: '/home', icon: iconHouse, label: '홈' },
    { to: '/settings', icon: iconDots, label: '설정' },
  ]
  return (
    <nav className="bottom-nav" aria-label="메뉴">
      {items.map((it) => (
        <NavLink key={it.to} viewTransition to={it.to} className="bottom-nav-item" aria-label={it.label}>
          <img src={it.icon} alt="" className="icon" width="32" height="32" />
        </NavLink>
      ))}
    </nav>
  )
}

/**
 * 상단 제목 줄: 왼쪽 버튼(뒤로 ‹ 또는 닫기 ×) + 가운데 제목 (+ 오른쪽 내용)
 * @param close  true면 × 아이콘
 * @param to     누르면 갈 곳 (없으면 뒤로 가기)
 * @param divider 아래 구분선
 */
export function TopBar({ title, close = false, to, onBack, divider = false, right, className = '' }) {
  const navigate = useNavigate()
  const back = onBack ?? (() => (to ? navigate(to, { viewTransition: true }) : navigate(-1)))
  return (
    <header className={`top-bar${divider ? ' divider' : ''} ${className}`}>
      {(to || onBack || close) && (
        <button type="button" className="top-bar-btn" onClick={back} aria-label={close ? '닫기' : '뒤로'}>
          <img src={close ? iconX : caretLeft} alt="" className="icon" width={close ? 32 : 28} height={close ? 32 : 28} />
        </button>
      )}
      <h1 className="top-bar-title">{title}</h1>
      {right && <div className="top-bar-right">{right}</div>}
    </header>
  )
}

/** 보라 진행 바 (ratio 0~1) */
export function ProgressBar({ ratio, label, className = '' }) {
  const pct = Math.round(Math.min(1, Math.max(0, ratio)) * 100)
  return (
    <div
      className={`progress-track ${className}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      {pct > 0 && <div className="progress-fill" style={{ width: `${Math.max(pct, 3)}%` }} />}
    </div>
  )
}

/** 에너지: 남은 개수만큼 보라 별 */
export function EnergyStars({ energy, today = todayKey() }) {
  const now = currentEnergy(energy, today)
  return (
    <div className="energy-stars" aria-label={`에너지 ${now}개 (하루 ${ENERGY.DAILY_MAX}개)`} role="img">
      {Array.from({ length: now }, (_, i) => (
        <img key={i} src={energyStar} alt="" width="26" height="27" />
      ))}
    </div>
  )
}

/** 레벨 칩: Lv.N + 다음 레벨까지 경험치 바 (홈 상단, 에너지 왼쪽) */
export function LevelChip({ exp = 0, level = 1 }) {
  const { current, needed, ratio } = levelProgress({ exp, level })
  return (
    <div className="level-chip" title={`다음 레벨까지 ${needed - current} XP`}>
      <span className="level-chip-lv">Lv.{level}</span>
      <span className="level-chip-body">
        <ProgressBar ratio={ratio} label={`레벨 ${level} 경험치 ${current}/${needed}`} className="level-chip-bar" />
        <span className="level-chip-exp">
          {current}/{needed} XP
        </span>
      </span>
    </div>
  )
}

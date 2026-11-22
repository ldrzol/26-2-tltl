import { useState } from 'react'
import dayjs from 'dayjs'
import { useAuth } from '../contexts/AuthContext'
import { previousDayKey, todayKey } from '../utils/date'
import { BottomNav } from '../components/AppChrome'
import caretLeft from '../assets/figma/caret-left-28.svg'
import catSheet from '../assets/figma/cat-sheet.png'

const WEEK = ['일', '월', '화', '수', '목', '금', '토']

/**
 * 출석체크 화면 (Figma): "N일 연속 학습!" + 캐릭터 + 달력
 * 저장된 출석 정보는 요약(lastDate · streak)뿐이라, 마지막 출석일부터 연속 출석한 날들만 달력에 표시한다.
 */
export default function AttendancePage() {
  const { profile } = useAuth()
  const today = todayKey()
  const { lastDate = null, streak = 0 } = profile.attendance ?? {}
  // 마지막 출석이 오늘·어제면 연속 기록이 살아 있음
  const alive = lastDate === today || lastDate === previousDayKey(today)
  const currentStreak = alive ? streak : 0

  const attended = new Set()
  if (lastDate) {
    let d = dayjs(lastDate)
    for (let i = 0; i < streak; i++) {
      attended.add(d.format('YYYY-MM-DD'))
      d = d.subtract(1, 'day')
    }
  }

  const [month, setMonth] = useState(() => dayjs(today).startOf('month'))
  const first = month.day() // 0=일
  const days = month.daysInMonth()
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => month.date(i + 1))]

  return (
    <div className="screen has-nav attendance-page">
      <div className="attendance-head">
        <h1 className="attendance-title">
          <span className="streak-num">{currentStreak}</span> 일
          <br />
          연속 학습!
        </h1>
        <span className="attendance-art" aria-hidden="true">
          <img src={catSheet} alt="" />
        </span>
      </div>

      <div className="month-nav">
        <button type="button" onClick={() => setMonth(month.subtract(1, 'month'))} aria-label="이전 달">
          <img src={caretLeft} alt="" className="icon" width="28" height="28" />
        </button>
        <h2>{month.format('YYYY년 M월')}</h2>
        <button type="button" onClick={() => setMonth(month.add(1, 'month'))} aria-label="다음 달">
          <img src={caretLeft} alt="" className="icon flip" width="28" height="28" />
        </button>
      </div>

      <div className="calendar" role="grid" aria-label={`${month.format('YYYY년 M월')} 출석 달력`}>
        {WEEK.map((w) => (
          <span key={w} className="calendar-week" role="columnheader">
            {w}
          </span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={`e${i}`} />
          const key = d.format('YYYY-MM-DD')
          const on = attended.has(key)
          return (
            <span
              key={key}
              role="gridcell"
              className={`calendar-day${on ? ' on' : ''}${key === today ? ' today' : ''}`}
              aria-label={`${d.date()}일${on ? ' 출석' : ''}`}
            >
              {d.date()}
            </span>
          )
        })}
      </div>

      <BottomNav />
    </div>
  )
}

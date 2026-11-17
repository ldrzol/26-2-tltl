import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'
import { TIMEZONE } from '../config/gameRules.js'

dayjs.extend(utc)
dayjs.extend(timezone)

const FORMAT = 'YYYY-MM-DD'

/** 한국 시간 기준 날짜 키 "YYYY-MM-DD" (출석·에너지 기준 날짜) */
export function todayKey(now = new Date()) {
  return dayjs(now).tz(TIMEZONE).format(FORMAT)
}

/** "2026-11-16" → "2026-11-15" */
export function previousDayKey(key) {
  return dayjs(key, FORMAT).subtract(1, 'day').format(FORMAT)
}

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decideReminder, kstDateKey, previousDateKey } from './decide.js'

const TODAY = '2026-11-16'
const base = {
  name: '초은',
  level: 2,
  fcmTokens: ['token-a'],
  settings: { notifications: { enabled: true } },
}

test('한국 날짜: UTC 15:30은 한국 다음날 00:30', () => {
  assert.equal(kstDateKey(new Date('2026-11-16T15:30:00Z')), '2026-11-17')
  assert.equal(kstDateKey(new Date('2026-11-16T14:59:00Z')), '2026-11-16')
})

test('어제 날짜: 월 경계', () => {
  assert.equal(previousDateKey('2026-03-01'), '2026-02-28')
})

test('알림 꺼짐·토큰 없음·진단 전이면 안 보냄', () => {
  assert.equal(decideReminder({ ...base, settings: { notifications: { enabled: false } } }, TODAY), null)
  assert.equal(decideReminder({ ...base, fcmTokens: [] }, TODAY), null)
  assert.equal(decideReminder({ ...base, level: 0 }, TODAY), null)
})

test('오늘 이미 출석했으면 안 보냄', () => {
  assert.equal(decideReminder({ ...base, attendance: { lastDate: TODAY, streak: 3 } }, TODAY), null)
})

test('오늘 이미 보냈으면 안 보냄 (하루 1번)', () => {
  assert.equal(decideReminder({ ...base, reminder: { lastSentDate: TODAY } }, TODAY), null)
})

test('어제까지 연속 출석 → 연속 끊김 경고', () => {
  const r = decideReminder({ ...base, attendance: { lastDate: '2026-11-15', streak: 3 } }, TODAY)
  assert.equal(r.kind, 'streak')
  assert.match(r.title, /3일 연속/)
})

test('며칠 안 왔거나 출석 기록 없음 → 복귀 알림', () => {
  assert.equal(decideReminder({ ...base, attendance: { lastDate: '2026-11-10', streak: 5 } }, TODAY).kind, 'comeback')
  assert.equal(decideReminder(base, TODAY).kind, 'comeback')
})

test('어제 출석했어도 연속 1일이면 복귀 알림', () => {
  assert.equal(decideReminder({ ...base, attendance: { lastDate: '2026-11-15', streak: 1 } }, TODAY).kind, 'comeback')
})

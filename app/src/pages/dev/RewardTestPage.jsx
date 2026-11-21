import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { grantEpisodeRewards } from '../../services/rewardService'
import { spendEpisodeEnergy } from '../../services/energyService'
import { episodeExp } from '../../config/gameRules'
import { todayKey } from '../../utils/date'
import AttendanceComplete from '../../components/AttendanceComplete'
import LevelBadge from '../../components/LevelBadge'
import EnergyBadge from '../../components/EnergyBadge'

/**
 * [개발용] 출석·누적 보상·레벨업 테스트 화면 (/dev/rewards, 개발 서버에서만 열림)
 * 실제로는 에피소드 완료 시 진행 저장 기능이 applyEpisodeRewards를 부른다.
 */
export default function RewardTestPage() {
  const { user, profile } = useAuth()
  const [date, setDate] = useState(todayKey())
  const [episodeId, setEpisodeId] = useState('chunhyang-ep1')
  const [correct, setCorrect] = useState(3)
  const [writingMet, setWritingMet] = useState(2)
  const [isReplay, setIsReplay] = useState(false)
  const [result, setResult] = useState(null)
  const [showAttendance, setShowAttendance] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [started, setStarted] = useState(false) // 실제 앱처럼: 시작해야 완료할 수 있음

  const exp = episodeExp({ correctCount: correct, writingMetCount: writingMet, isReplay })

  async function run(action) {
    setError('')
    setBusy(true)
    try {
      await action()
    } catch (e) {
      console.error(e)
      setError(e.code === 'permission-denied' ? '권한 오류: Firestore 규칙을 다시 게시했나요?' : e.message)
    } finally {
      setBusy(false)
    }
  }

  const start = () =>
    run(async () => {
      await spendEpisodeEnergy(user.uid, date)
      setResult(null)
      setStarted(true)
    })

  const complete = () =>
    run(async () => {
      const r = await grantEpisodeRewards(user.uid, { episodeId, episodeExp: exp, today: date })
      setResult(r)
      setShowAttendance(Boolean(r.attendance))
      setStarted(false)
    })

  const att = profile.attendance

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">보상 테스트</h1>
        <p className="auth-muted">[개발용] 에피소드 완료 → 출석·보상·레벨업</p>

        <EnergyBadge energy={profile.energy} today={date} />
        <LevelBadge exp={profile.exp ?? 0} level={profile.level} />
        <p className="auth-muted">
          출석: 마지막 {att?.lastDate ?? '-'} · 연속 {att?.streak ?? 0}일 · 누적 {att?.totalDays ?? 0}일
        </p>

        <div className="auth-form">
          <label>
            완료 날짜 <span className="auth-hint">(바꿔서 연속/누적 테스트)</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            에피소드 ID
            <input value={episodeId} onChange={(e) => setEpisodeId(e.target.value)} />
          </label>
          <label>
            객관식 정답 수 (0~3)
            <input type="number" min={0} max={3} value={correct} onChange={(e) => setCorrect(Number(e.target.value))} />
          </label>
          <label>
            글쓰기 기준 충족 (0~3)
            <input type="number" min={0} max={3} value={writingMet} onChange={(e) => setWritingMet(Number(e.target.value))} />
          </label>
          <label className="row">
            <input type="checkbox" checked={isReplay} onChange={(e) => setIsReplay(e.target.checked)} />
            다시 풀기 (경험치 절반)
          </label>
        </div>

        {error && <p className="auth-error" role="alert">{error}</p>}

        {started ? (
          <button type="button" className="btn btn-primary" onClick={complete} disabled={busy}>
            ② 에피소드 완료 처리 (+{exp} XP)
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={start} disabled={busy}>
            ① 에피소드 시작 (⚡ −1)
          </button>
        )}

        {result && !showAttendance && (
          <div className="auth-info">
            에피소드 +{result.episodeExp} XP
            {result.attendance && ` · 출석 +${result.attendance.rewardExp + result.attendance.bonusExp} XP`}
            {!result.attendance && ' · 오늘은 이미 출석함'}
            {result.level.levelUp && ` · 🎊 레벨 업! Lv.${result.level.prevLevel} → Lv.${result.level.level}`}
          </div>
        )}

        <Link to="/home" className="auth-link">홈으로</Link>
      </div>

      {showAttendance && result?.attendance && (
        <div className="reward-overlay">
          <AttendanceComplete attendance={result.attendance} onClose={() => setShowAttendance(false)} />
        </div>
      )}
    </div>
  )
}

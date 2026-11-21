import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { logout } from '../../services/authService'
import { completeDiagnosis } from '../../services/diagnosisService'
import { SKILLS, SKILL_LABELS } from '../../config/gameRules'
import DiagnosisResult from '../../components/result/DiagnosisResult'

const QUESTIONS_PER_SKILL = 5 // 임시 — 실제 문항 수는 진단 문항(전예랑)에 따름

/**
 * 임시 화면 — 초기 진단 테스트(전예랑 담당)가 들어올 자리
 * 지금은 유형별 맞힌 개수를 직접 정해서 → 진단 결과 화면 → 학습 시작(레벨 1) 흐름을 테스트한다
 */
export default function DiagnosisPlaceholder() {
  const { user, profile } = useAuth()
  const [correct, setCorrect] = useState({ vocab: 4, comprehension: 3, inference: 1, writing: 3 })
  const [skills, setSkills] = useState(null)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')

  function showResult() {
    setSkills(
      Object.fromEntries(SKILLS.map((k) => [k, { correct: correct[k], total: QUESTIONS_PER_SKILL }])),
    )
  }

  async function start() {
    setStarting(true)
    setError('')
    try {
      // 레벨이 1이 되면 가드가 자동으로 홈으로 보낸다
      await completeDiagnosis(user.uid, skills)
    } catch (e) {
      console.error(e)
      setError('저장하지 못했어요. 잠시 후 다시 시도해주세요.')
      setStarting(false)
    }
  }

  if (skills) {
    return (
      <>
        <DiagnosisResult skills={skills} name={profile.name} onStart={start} starting={starting} />
        {error && <p className="auth-error" role="alert">{error}</p>}
      </>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">초기 진단 테스트</h1>
        <p className="auth-muted">
          {profile.name}님, 현재 레벨 {profile.level}
          <br />
          (진단 문제 화면이 들어올 자리예요)
        </p>

        <div className="auth-form">
          <p className="auth-hint">[임시] 유형별로 {QUESTIONS_PER_SKILL}문제 중 맞힌 개수</p>
          {SKILLS.map((k) => (
            <label key={k}>
              {SKILL_LABELS[k]}
              <input
                type="number"
                min={0}
                max={QUESTIONS_PER_SKILL}
                value={correct[k]}
                onChange={(e) =>
                  setCorrect((c) => ({
                    ...c,
                    [k]: Math.min(QUESTIONS_PER_SKILL, Math.max(0, Number(e.target.value) || 0)),
                  }))
                }
              />
            </label>
          ))}
        </div>

        <button type="button" className="btn btn-primary" onClick={showResult}>
          [임시] 진단 완료 → 결과 보기
        </button>
        <button type="button" className="auth-link" onClick={logout}>
          로그아웃
        </button>
      </div>
    </div>
  )
}

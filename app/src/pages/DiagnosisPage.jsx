import { useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { logout } from '../services/authService'
import { completeDiagnosis } from '../services/diagnosisService'
import { getDiagnostic, getPassage } from '../content/diagnostic'
import { buildDiagnosisRecord, scoreDiagnostic, toSkills } from '../logic/diagnostic'
import DiagnosisResult from '../components/result/DiagnosisResult'
import { ProgressBar, TopBar } from '../components/AppChrome'
import cat from '../assets/figma/cat-node.png'

const MARKS = ['①', '②', '③', '④']
const STORAGE_KEY = 'ddorang-diagnosis-answers'

// 새로고침해도 푼 답이 남도록 sessionStorage에 임시 저장 (브라우저에 없거나 막혀 있으면 그냥 건너뜀)
function loadSaved() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) ?? {}
  } catch {
    return {}
  }
}
function save(answers) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(answers))
  } catch {
    /* 저장 못 해도 진단은 계속할 수 있다 */
  }
}
function clearSaved() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* 무시 */
  }
}

/**
 * 초기 진단 테스트 (/diagnosis, 레벨 0만)
 * 흐름: 안내 → 문제 15개(지문 + 문제 한 개씩) → 결과(형·영역별 등급·틀린 문제 해설) → "학습 시작하기" → 레벨 1
 * 채점: logic/diagnostic.js · 문항: content/diagnostic.json (엑셀에서 변환)
 */
export default function DiagnosisPage() {
  const { user, profile } = useAuth()
  const data = getDiagnostic()
  const questions = data.questions

  const [answers, setAnswers] = useState(loadSaved) // { 문항ID: 1~4 }
  const [index, setIndex] = useState(() => {
    const saved = loadSaved()
    const first = questions.findIndex((q) => !saved[q.id])
    return first === -1 ? 0 : first
  })
  const [phase, setPhase] = useState('intro') // intro | quiz | result
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')

  const result = useMemo(() => (phase === 'result' ? scoreDiagnostic(data, answers) : null), [phase, data, answers])

  const answeredCount = questions.filter((q) => answers[q.id]).length

  function choose(qid, no) {
    const next = { ...answers, [qid]: no }
    setAnswers(next)
    save(next)
  }

  async function start() {
    setStarting(true)
    setError('')
    try {
      // 레벨이 1이 되면 가드가 자동으로 홈으로 보낸다
      await completeDiagnosis(user.uid, buildDiagnosisRecord(data, result))
      clearSaved()
    } catch (e) {
      console.error(e)
      setError('저장하지 못했어요. 잠시 후 다시 시도해주세요.')
      setStarting(false)
    }
  }

  if (phase === 'result') {
    return (
      <>
        <DiagnosisResult skills={toSkills(result)} name={profile.name} detail={result} onStart={start} starting={starting} />
        {error && <p className="auth-error" role="alert">{error}</p>}
      </>
    )
  }

  if (phase === 'intro') {
    return (
      <div className="screen diag-intro">
        <TopBar title="초기 학습 진단" />
        <img src={cat} alt="" className="diag-intro-art" />
        <p className="diag-intro-text">
          {profile.name}님의 지금 문해력을 확인해요.
          <br />
          지문 {data.passages.length}개, 문제 {questions.length}개예요.
          <br />
          점수보다 내 실력을 아는 게 목적이니 편하게 풀어 보세요.
        </p>
        <button type="button" className="btn btn-primary btn-lg" onClick={() => setPhase('quiz')}>
          {answeredCount > 0 ? '이어서 풀기' : '시작하기'}
        </button>
        <button type="button" className="auth-link" onClick={logout}>
          로그아웃
        </button>
      </div>
    )
  }

  const q = questions[index]
  const passage = getPassage(q.passageId)
  const chosen = answers[q.id] ?? null
  const isLast = index === questions.length - 1

  return (
    <div className="quiz-page">
      <TopBar title="초기 학습 진단" />
      <span className="quiz-count">
        {index + 1}/{questions.length}
      </span>
      <ProgressBar ratio={(index + 1) / questions.length} label="진행도" />

      <p className="quiz-stem" id={`stem-${q.id}`}>
        {index + 1}번 문제.{'\n'}
        {q.stem}
      </p>

      <section className="quiz-box" aria-label="지문">
        <p className="quiz-box-title">
          {passage.title} · {passage.author}
        </p>
        <p className="quiz-box-text">{passage.text}</p>
      </section>

      <fieldset className="quiz-options" aria-labelledby={`stem-${q.id}`}>
        {q.options.map((o) => (
          <label key={o.no} className={`quiz-option${chosen === o.no ? ' selected' : ''}`}>
            <input type="radio" name={q.id} checked={chosen === o.no} onChange={() => choose(q.id, o.no)} />
            <span className="mark">{MARKS[o.no - 1]}</span>
            <span>{o.text}</span>
          </label>
        ))}
      </fieldset>

      {isLast && answeredCount < questions.length && (
        <p className="quiz-hint">아직 풀지 않은 문제가 {questions.length - answeredCount}개 있어요.</p>
      )}

      <nav className="quiz-nav">
        <button type="button" className="btn btn-gray" onClick={() => setIndex(index - 1)} disabled={index === 0}>
          이전 문제
        </button>
        {isLast ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setPhase('result')}
            disabled={answeredCount < questions.length}
          >
            결과 보기
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => setIndex(index + 1)} disabled={chosen === null}>
            다음 문제
          </button>
        )}
      </nav>
    </div>
  )
}

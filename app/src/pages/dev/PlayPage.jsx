import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getEpisode } from '../../content'
import {
  completeEpisode,
  loadProgress,
  retryEpisode,
  saveAnswer,
  saveStep,
  saveWriting,
} from '../../services/progressService'
import EpisodeResult from '../../components/result/EpisodeResult'

const MARKS = ['①', '②', '③', '④']

/**
 * [개발용] 에피소드 플레이 (/dev/play/:episodeId) — 진짜 스토리·퀴즈 화면(박초이)이 나오기 전 진행 저장 테스트용
 * 단계를 넘길 때마다 저장 → 탭을 닫았다 열어도 그 단계부터 이어진다.
 * 진짜 화면에서도 같은 함수(saveStep / saveAnswer / saveWriting / completeEpisode)만 부르면 된다.
 */
export default function PlayPage() {
  const { episodeId } = useParams()
  const episode = getEpisode(episodeId)
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [progress, setProgress] = useState(null) // 불러온 진행 상태
  const [done, setDone] = useState(null) // completeEpisode 결과 { result, reward, stars, storyCompleted }
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // 복원: 저장된 단계·답 불러오기
  useEffect(() => {
    if (!episode) return
    loadProgress(user.uid, episodeId).then((p) => {
      if (!p || p.status !== 'in_progress') navigate('/dev/episodes', { replace: true })
      else setProgress(p)
    })
  }, [user.uid, episodeId, episode, navigate])

  if (!episode) return <p className="auth-error">없는 에피소드예요: {episodeId}</p>

  if (done) {
    return (
      <EpisodeResult
        episode={episode}
        result={done.result}
        reward={done.reward}
        writing={progress.writing}
        profile={profile}
        storyCompleted={done.storyCompleted}
        onDone={() => navigate('/dev/episodes')}
        onReport={() => navigate(`/report/${episode.storyId}`)}
      />
    )
  }

  if (!progress) return <p className="auth-muted" style={{ padding: 24 }}>불러오는 중…</p>

  const total = episode.steps.length
  const stepIndex = progress.step

  async function run(save, patch) {
    setBusy(true)
    setError('')

    try {
      // Firebase에 학습 진행 상태 저장
      await save()

      // 화면에 표시할 진행 상태 갱신
      const next = { ...progress, ...patch }
      setProgress(next)

      // 마지막 단계라면 에피소드 완료 조건 확인
      if (next.step >= total) {
        const completion = await completeEpisode(user.uid, episode)
        setDone(completion)
      }

    } catch (e) {
      console.error(e)
      setError(e.message)

    } finally {
      setBusy(false)
    }
  }

  async function retry() {
    const confirmed = window.confirm(
      '에너지 소모 없이 에피소드를 처음부터 재도전하시겠습니까? 기존 답안은 초기화됩니다.'
    )

    if (!confirmed) return

    setBusy(true)
    setError('')

    try {
      await retryEpisode(user.uid, episode)

      setProgress(prev => ({
        ...prev,
        step: 0,
        answers: {},
        writing: null,
      }))
    } catch (e) {
      console.error(e)
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

    // 모든 단계를 마쳤는데 완료 처리 전에 꺼졌던 경우
    if (stepIndex >= total) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <p className="auth-muted">
            학습 결과를 확인하거나 무료로 재도전할 수 있습니다.
          </p>

          {error && <p className="auth-error">{error}</p>}

          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => run(async () => {}, {})}
          >
            결과 보기
          </button>

          <button
            type="button"
            className="btn btn-outline"
            disabled={busy}
            onClick={retry}
          >
            재도전
          </button>
        </div>
      </div>
    )
  }

  const step = episode.steps[stepIndex]

  return (
    <div className="result-page play-page">
      <header className="play-header">
        <Link to="/dev/episodes" className="auth-link">‹ 나가기</Link>
        <span className="setting-desc">
          {episode.storyTitle} · {episode.title}
        </span>
        <span className="play-count">
          {stepIndex + 1} / {total}
        </span>
      </header>
      <div className="level-bar" aria-hidden="true">
        <div className="level-bar-fill" style={{ width: `${(stepIndex / total) * 100}%` }} />
      </div>

      {step.type === 'story' && (
        <StoryStep
          key={stepIndex}
          text={step.text}
          busy={busy}
          onNext={() => run(() => saveStep(user.uid, episodeId, stepIndex + 1), { step: stepIndex + 1 })}
        />
      )}

      {step.type === 'question' && (
        <QuestionStep
          key={stepIndex}
          question={step.question}
          saved={progress.answers?.[step.question.id]?.choice}
          busy={busy}
          // [확인]: 답을 저장·확정 (저장된 step은 이미 다음 단계 → 정답을 본 뒤 껐다 켜도 답을 바꿀 수 없음)
          // 화면은 그대로 두고 정답·해설을 보여준다
          onCheck={(choice) =>
            run(() => saveAnswer(user.uid, episodeId, step.question, choice, stepIndex + 1), {
              answers: {
                ...progress.answers,
                [step.question.id]: { choice, correct: choice === step.question.answer },
              },
            })
          }
          // [다음]: 화면만 다음 단계로 (저장은 [확인] 때 이미 함)
          onNext={() => run(async () => {}, { step: stepIndex + 1 })}
        />
      )}

      {step.type === 'writing' && (
        <WritingStep
          key={stepIndex}
          storyId={episode.storyId}
          episodeId={episodeId}
          writing={step.writing}
          saved={progress.writing?.text}
          busy={busy}
          onSubmit={(value) =>
            run(() => saveWriting(user.uid, episodeId, value, stepIndex + 1), {
              step: stepIndex + 1,
              writing: value,
            })
          }
        />
      )}

      {error && <p className="auth-error" role="alert">{error}</p>}
    </div>
  )
}

function StoryStep({ text, busy, onNext }) {
  return (
    <>
      <div className="story-text">
        {text.split('\n').map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
      <button type="button" className="btn btn-primary" onClick={onNext} disabled={busy}>
        다음
      </button>
    </>
  )
}

/** 문제 → [확인] → 바로 정답·해설 → [다음] */
function QuestionStep({ question, saved, busy, onCheck, onNext }) {
  const [choice, setChoice] = useState(saved ?? null)
  const revealed = saved != null // 답이 저장(확정)됐으면 정답 공개
  const isCorrect = revealed && saved === question.answer

  function choiceClass(n) {
    if (!revealed) return choice === n ? ' on' : ''
    if (n === question.answer) return ' answer'
    if (n === saved) return ' chosen'
    return ''
  }

  return (
    <>
      <p className="review-question">{question.question}</p>
      <div className="play-choices" role="radiogroup">
        {question.choices.map((c, i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={choice === i + 1}
            className={`play-choice${choiceClass(i + 1)}`}
            onClick={() => setChoice(i + 1)}
            disabled={revealed}
          >
            <span className="mark">{MARKS[i]}</span> {c}
            {revealed && i + 1 === question.answer && <span className="choice-tag">정답</span>}
            {revealed && i + 1 === saved && !isCorrect && <span className="choice-tag">내 답</span>}
          </button>
        ))}
      </div>

      {revealed && (
        <div className={`answer-feedback ${isCorrect ? 'correct' : 'wrong'}`} role="status">
          <p className="answer-feedback-title">{isCorrect ? '⭕ 정답이에요!' : '❌ 아쉬워요'}</p>
          {!isCorrect && (
            <p className="answer-feedback-text">
              정답은 <strong>{MARKS[question.answer - 1]} {question.choices[question.answer - 1]}</strong>
            </p>
          )}
          <p className="answer-feedback-text">
            <strong>해설</strong> {question.explanation}
          </p>
        </div>
      )}

      {revealed ? (
        <button type="button" className="btn btn-primary" onClick={onNext} disabled={busy}>
          다음
        </button>
      ) : (
        <button type="button" className="btn btn-primary" onClick={() => onCheck(choice)} disabled={busy || !choice}>
          확인
        </button>
      )}
    </>
  )
}

  function WritingStep({ writing, saved, busy, storyId, episodeId, onSubmit }) {
    const [text, setText] = useState(saved ?? '')
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

  async function submit() {
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/writing/grade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storyId,
          episodeId,
          userAnswer: text,
        }),
      })

      if (!response.ok) {
        throw new Error('AI 평가 요청에 실패했습니다.')
      }

      const data = await response.json()

      if (!data || !Array.isArray(data.criteriaMet)) {
        throw new Error('AI 평가 결과가 올바르지 않습니다.')
      }

      setResult(data)

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  return (
    <>
      <p className="review-meta">글쓰기</p>
      <p className="review-question">{writing.prompt}</p>
      <textarea
        className="text-input"
        rows={4}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setResult(null)
        }}
        placeholder="여기에 써보세요"
      />
     {result && (
      <div className="setting-card">
        <p>
          평가 결과: {result.passed ? '통과' : '미통과'}
        </p>

        <p>
          충족한 기준: {result.metCount} / {writing.criteria.length}
        </p>

        {writing.criteria.map((criterion, index) => (
          <p key={index}>
            {result.criteriaMet[index] ? '[충족]' : '[미충족]'} {criterion}
          </p>
        ))}

        <p>AI 피드백: {result.feedback}</p>
      </div>
    )}

    {error && <p role="alert">{error}</p>}
      {!result?.passed && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={submit}
          disabled={busy || loading || !text.trim()}
        >
          {loading ? 'AI 평가 중...' : 'AI 평가받기'}
        </button>
      )}
      {result?.passed && (
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy || loading}
          onClick={() => onSubmit({
            text,
            feedback: {
              criteria: result.criteriaMet,
              good: result.feedback,
              improve: '',
              pending: false,
            },
          })}
        >
          평가 결과 저장하고 다음으로
        </button>
      )}
    </>
  )
}

import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getEpisode } from '../../content'
import {
  completeEpisode,
  loadProgress,
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
      await save()
      const next = { ...progress, ...patch }
      setProgress(next)
      // 마지막 단계까지 끝나면 완료 처리 → 결과 화면
      if (next.step >= total) setDone(await completeEpisode(user.uid, episode))
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
          <p className="auth-muted">모든 단계를 마쳤어요.</p>
          {error && <p className="auth-error">{error}</p>}
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => run(async () => {}, {})}
          >
            결과 보기
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

function WritingStep({ writing, saved, busy, onSubmit }) {
  const [text, setText] = useState(saved ?? '')
  const [criteria, setCriteria] = useState(writing.criteria.map(() => true))

  function submit() {
    // [임시 AI 피드백] 실제로는 AI가 평가 기준으로 채점한다 (조성은 담당)
    const feedback = {
      criteria,
      good: '지문의 내용을 바탕으로 잘 표현했어요.',
      improve: criteria.every(Boolean) ? '' : '빠진 평가 기준을 확인하고 한 번 더 다듬어 봐요.',
      pending: false,
    }
    onSubmit({ text, feedback })
  }

  return (
    <>
      <p className="review-meta">글쓰기</p>
      <p className="review-question">{writing.prompt}</p>
      <textarea
        className="text-input"
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="여기에 써보세요"
      />
      <div className="setting-card">
        <p className="setting-desc" style={{ padding: '10px 14px 0', margin: 0 }}>
          [임시 AI 피드백] 충족한 기준
        </p>
        {writing.criteria.map((c, i) => (
          <label key={c} className="setting-row quiz-choice">
            <input
              type="checkbox"
              checked={criteria[i]}
              onChange={(e) => setCriteria((arr) => arr.map((v, j) => (j === i ? e.target.checked : v)))}
            />
            <span>{c}</span>
          </label>
        ))}
      </div>
      <button type="button" className="btn btn-primary" onClick={submit} disabled={busy || !text.trim()}>
        제출
      </button>
    </>
  )
}
